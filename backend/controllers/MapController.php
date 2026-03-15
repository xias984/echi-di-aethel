<?php
// Map controller — gestisce la griglia di esplorazione e observeTile

class MapController extends BaseController
{
    private $mapTileModel;

    // Skill usata come bonus percezione (lookup per nome)
    private const PERCEPTION_SKILL = 'Pionierismo';

    // Abilità d20 usata per i tiri di Percezione
    private const PERCEPTION_ABILITY = 'sag';

    // Bounds della griglia esplorabile (modificabili in futuro)
    private const GRID_X_MIN = -2;
    private const GRID_X_MAX =  2;
    private const GRID_Y_MIN = -2;
    private const GRID_Y_MAX =  2;

    public function __construct($pdo)
    {
        parent::__construct($pdo);
        require_once __DIR__ . '/../models/MapTile.php';
        $this->mapTileModel = new MapTile($pdo);
    }

    // -------------------------------------------------------------------------
    // GET /api/map/tiles?user_id=X
    // Restituisce la griglia completa con lo stato di osservazione dell'utente.
    // Tile non ancora rivelate tornano senza tag.
    // -------------------------------------------------------------------------
    public function getTiles()
    {
        $userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;

        if ($userId <= 0) {
            $this->errorResponse("user_id is required.");
        }

        try {
            $tiles = $this->mapTileModel->getTileGridForUser(
                $userId,
                self::GRID_X_MIN, self::GRID_Y_MIN,
                self::GRID_X_MAX, self::GRID_Y_MAX
            );

            $this->jsonResponse([
                'tiles'  => $tiles,
                'bounds' => [
                    'x_min' => self::GRID_X_MIN, 'x_max' => self::GRID_X_MAX,
                    'y_min' => self::GRID_Y_MIN, 'y_max' => self::GRID_Y_MAX,
                ],
            ]);
        } catch (Exception $e) {
            error_log("Map getTiles Error: " . $e->getMessage());
            $this->errorResponse("Errore nel recupero della mappa.", 500);
        }
    }

    // -------------------------------------------------------------------------
    // POST /api/map/observe
    // Body: { "user_id": int, "x": int, "y": int }
    //
    // Esegue un tiro d20 + SAG + bonus Percezione (Pionierismo) contro la DC
    // del tile. In caso di successo rivela i tag della coordinata.
    // -------------------------------------------------------------------------
    public function observeTile()
    {
        $data = $this->getJsonInput();
        $this->validateRequired($data, ['user_id']);

        // x e y possono essere 0, quindi non si usa validateRequired (usa empty())
        if (!isset($data['x']) || !isset($data['y'])) {
            $this->errorResponse("I campi 'x' e 'y' sono obbligatori.");
        }

        $userId = (int)$data['user_id'];
        $x      = (int)$data['x'];
        $y      = (int)$data['y'];

        if ($userId <= 0) {
            $this->errorResponse("user_id non valido.");
        }

        // Vincola le coordinate ai bounds della griglia
        if ($x < self::GRID_X_MIN || $x > self::GRID_X_MAX ||
            $y < self::GRID_Y_MIN || $y > self::GRID_Y_MAX) {
            $this->errorResponse(
                "Coordinate fuori dalla griglia esplorabile " .
                "(" . self::GRID_X_MIN . "≤x≤" . self::GRID_X_MAX . ", " .
                self::GRID_Y_MIN . "≤y≤" . self::GRID_Y_MAX . ")."
            );
        }

        try {
            // 1. Recupera il tile
            $tile = $this->mapTileModel->findByCoords($x, $y);
            if (!$tile) {
                $this->errorResponse("Tile ({$x}, {$y}) non trovato o non attivo.", 404);
            }

            // 2. Calcola il bonus dalla skill Percezione (Pionierismo)
            $perceptionBonus = $this->getPerceptionBonus($userId);

            // 3. Esegui il tiro d20 + SAG + perceptionBonus contro la DC del tile
            require_once __DIR__ . '/../logic/DiceEngine.php';
            $diceEngine = new DiceEngine($this->pdo);

            $rollData = $diceEngine->roll(
                $userId,
                self::PERCEPTION_ABILITY,
                $perceptionBonus,
                $tile['dc']
            );

            $success = $rollData['success'];

            // 4. Aggiorna il record di osservazione (mai retrocede a false)
            $observation = $this->mapTileModel->upsertObservation(
                $userId,
                $tile['tile_id'],
                $success,
                $rollData['total']
            );

            // 5. Costruisci la risposta
            // I tag vengono restituiti solo se il tile è già stato rivelato
            // (anche in un tentativo precedente)
            $alreadyRevealed = (bool)$observation['revealed'];
            $revealedTags    = $alreadyRevealed ? $tile['tags'] : [];

            $message = $this->buildMessage($rollData, $tile, $alreadyRevealed, $success);

            $this->successResponse($message, [
                'roll_result'  => [
                    'roll'    => $rollData['roll'],
                    'total'   => $rollData['total'],
                    'grade'   => $rollData['grade'],
                    'success' => $success,
                    'dc'      => $tile['dc'],
                    'perception_bonus' => $perceptionBonus,
                ],
                'tile' => [
                    'tile_id' => $tile['tile_id'],
                    'x'       => $tile['x'],
                    'y'       => $tile['y'],
                    'biome'   => $tile['biome'],
                    'dc'      => $tile['dc'],
                    'tags'    => $revealedTags,
                    'revealed'=> $alreadyRevealed,
                ],
                'observation' => [
                    'revealed'   => $alreadyRevealed,
                    'best_roll'  => (int)$observation['best_roll'],
                    'observed_at'=> $observation['observed_at'],
                ],
            ]);

        } catch (InvalidArgumentException $e) {
            $this->errorResponse($e->getMessage());
        } catch (Exception $e) {
            error_log("Map observeTile Error: " . $e->getMessage());
            $this->errorResponse("Errore durante l'osservazione del tile.", 500);
        }
    }

    // -------------------------------------------------------------------------
    // Helpers privati
    // -------------------------------------------------------------------------

    /**
     * Calcola il bonus di Percezione dalla skill Pionierismo dell'utente.
     * Formula: floor(level / 4) — scala +1 ogni 4 livelli, max ~+10 a lv 40+
     */
    private function getPerceptionBonus(int $userId): int
    {
        require_once __DIR__ . '/../models/Skill.php';
        $skillModel = new Skill($this->pdo);
        $skillId    = $skillModel->findIdByName(self::PERCEPTION_SKILL);

        if (!$skillId) {
            return 0;
        }

        $stmt = $this->pdo->prepare("
            SELECT current_xp FROM user_skills
            WHERE user_id = ? AND skill_id = ?
        ");
        $stmt->execute([$userId, $skillId]);
        $xp = (int)($stmt->fetchColumn() ?? 0);

        $levelData = $skillModel->calculateLevelAndXP($xp);
        return (int)floor($levelData['level'] / 4);
    }

    /**
     * Costruisce il messaggio narrativo in base all'esito del tiro.
     */
    private function buildMessage(array $roll, array $tile, bool $alreadyRevealed, bool $justSucceeded): string
    {
        $coords = "({$tile['x']}, {$tile['y']})";
        $biome  = ucfirst($tile['biome']);

        if ($alreadyRevealed && !$justSucceeded) {
            return "Hai già esplorato questa zona {$coords}. I suoi segreti ti sono noti.";
        }

        return match ($roll['grade']) {
            'CRIT_SUCCESS' => "Visione Critica! L'occhio esperto rivela ogni dettaglio di {$biome} {$coords}. I tag sono svelati.",
            'SUCCESS'      => "Percezione riuscita! Esplori con attenzione {$biome} {$coords} e noti risorse nascoste.",
            'FAIL'         => "Il territorio {$biome} {$coords} cela i suoi segreti. Tiro: {$roll['total']} / DC {$tile['dc']}.",
            'CRIT_FAIL'    => "Fallimento critico! Sei distratto e non percepisci nulla in {$biome} {$coords}.",
            default        => "Osservazione completata su {$biome} {$coords}.",
        };
    }
}
?>
