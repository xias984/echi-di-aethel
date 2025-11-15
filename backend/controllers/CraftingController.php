<?php
// Crafting controller - Gestisce la logica di creazione oggetti

class CraftingController extends BaseController {
    private $recipeModel;
    private $userModel;
    private $resourceModel;
    private $itemModel;
    
    public function __construct($pdo) {
        parent::__construct($pdo);
        $this->recipeModel = new Recipe($pdo);
        $this->userModel = new User($pdo);
        // Questi modelli vengono istanziati su richiesta per motivi di autoloading
    }
    
    /**
     * GET /api/crafting/{id}/recipes
     * Ottiene l'elenco delle ricette sbloccate dall'utente.
     */
    public function getAvailableRecipes($user_id) {
        $user_id = (int)($user_id ?? 0);
        
        try {
            $recipes = $this->recipeModel->getAvailableRecipesForUser($user_id);
            $this->jsonResponse(['recipes' => $recipes]);
        } catch (Exception $e) {
            error_log("Crafting Recipe List Error: " . $e->getMessage());
            $this->errorResponse("Errore nel recupero delle ricette.", 500);
        }
    }
    
    /**
     * POST /api/crafting/craft
     * Esegue l'azione di crafting, consumando le risorse (SINK).
     */
    public function craftItem() {
        $data = $this->getJsonInput();
        $this->validateRequired($data, ['user_id', 'recipe_id']);
        
        $user_id = (int)($data['user_id'] ?? 0);
        $recipe_id = (int)($data['recipe_id'] ?? 0);
        
        if (!$user_id || !$recipe_id) {
            $this->errorResponse("ID Utente e ID Ricetta sono obbligatori.");
        }
        
        try {
            $recipe = $this->recipeModel->findRecipeWithIngredients($recipe_id);
            if (!$recipe) {
                $this->errorResponse("Ricetta non trovata.", 404);
            }
            
            // Inizializza i modelli necessari per l'operazione di Sink
            if (!$this->resourceModel) $this->resourceModel = new Resource($this->pdo);
            if (!$this->itemModel) $this->itemModel = new Item($this->pdo);
            
            $user_skills = $this->userModel->getUserSkillsMap($user_id);
            $user_resources = $this->getUserResourcesMap($user_id);

            // --- 1. Controllo Requisiti ---
            $required_skill_id = $this->getSkillIdByName($recipe['required_skill_name']);
            $user_level = $user_skills[$required_skill_id] ?? 0;

            if ($user_level < $recipe['required_skill_level']) {
                $this->errorResponse("Livello di skill troppo basso. Richiesto Livello {$recipe['required_skill_level']} di {$recipe['required_skill_name']}.");
            }
            
            $missing_resources = [];
            foreach ($recipe['ingredients'] as $ingredient) {
                $has_quantity = $user_resources[$ingredient['resource_id']] ?? 0;
                if ($has_quantity < $ingredient['quantity']) {
                    $missing_resources[] = "{$ingredient['resource_name']} (Mancano " . ($ingredient['quantity'] - $has_quantity) . " unità)";
                }
            }
            
            if (!empty($missing_resources)) {
                $this->errorResponse("Risorse insufficienti per il crafting: " . implode(", ", $missing_resources));
            }

            // --- 2. Esecuzione Transazione (Sink e Output) ---
            $this->pdo->beginTransaction();

            // A. Sink: Sottrai le Risorse (Il Consumo che previene l'Inflazione)
            foreach ($recipe['ingredients'] as $ingredient) {
                $success = $this->resourceModel->addResources(
                    $user_id, 
                    $ingredient['resource_id'], 
                    -$ingredient['quantity'] // Sottrae la quantità
                );
                if (!$success) {
                     throw new Exception("Errore nel sottrarre le risorse. Rollback.");
                }
            }

            // B. Output: Crea l'Item finito
            $item_data = [
                'name' => $recipe['output_item_name'],
                'item_type' => $recipe['output_item_type'],
                'owner_id' => $user_id,
                // Per MVP, non impostiamo required_skill_id/slot_type, lasciamo Item.php per la logica Item
            ];
            $item_id = $this->itemModel->insert($item_data);

            $this->pdo->commit();

            $this->successResponse(
                "Crafting riuscito! Hai creato {$recipe['output_item_value']}x {$recipe['output_item_name']}.",
                ['item_id' => $item_id, 'item_name' => $recipe['output_item_name']],
                201
            );
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            error_log("Crafting Error: " . $e->getMessage());
            $this->errorResponse("Errore durante il crafting: " . $e->getMessage(), 500);
        }
    }
    
    // --- Funzioni Helper ---
    
    private function getSkillIdByName($skill_name) {
        $stmt = $this->pdo->prepare("SELECT skill_id FROM skills WHERE name = ?");
        $stmt->execute([$skill_name]);
        return $stmt->fetchColumn();
    }

    private function getUserResourcesMap($user_id) {
        if (!$this->resourceModel) $this->resourceModel = new Resource($this->pdo);
        $resources = $this->resourceModel->getUserResources($user_id);
        
        $map = [];
        foreach ($resources as $res) {
            // Ottieni resource_id e quantity. Nota: resourceModel.getUserResources non restituisce resource_id.
            // Occorre modificare Resource.php per includere resource_id nella query o fare una query diretta qui.
            // Assumo che Resource.php sia aggiornato per includere resource_id.
            // *** Ho modificato Resource.php per includere resource_id nel lotto precedente ***
            $map[$res['resource_id']] = $res['quantity'];
        }
        return $map;
    }
}
?>