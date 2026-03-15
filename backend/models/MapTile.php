<?php
require_once __DIR__ . '/BaseModel.php';

class MapTile extends BaseModel
{
    protected $table = 'map_tiles';

    protected function getPrimaryKey()
    {
        return 'tile_id';
    }

    // -------------------------------------------------------------------------
    // Tile retrieval
    // -------------------------------------------------------------------------

    /**
     * Finds a tile by its (x, y) coordinates.
     *
     * @return array|false  Row with tile_id, x, y, biome, dc, tags (decoded), is_active
     */
    public function findByCoords(int $x, int $y)
    {
        $stmt = $this->pdo->prepare(
            "SELECT * FROM {$this->table} WHERE x = ? AND y = ? AND is_active = true"
        );
        $stmt->execute([$x, $y]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $row['tags'] = json_decode($row['tags'], true) ?? [];
        }

        return $row;
    }

    /**
     * Returns all active tiles within a rectangular bounding box.
     * Tags are decoded to PHP arrays.
     */
    public function getTileGrid(int $xMin, int $yMin, int $xMax, int $yMax): array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM {$this->table}
            WHERE x BETWEEN ? AND ?
              AND y BETWEEN ? AND ?
              AND is_active = true
            ORDER BY y DESC, x ASC
        ");
        $stmt->execute([$xMin, $xMax, $yMin, $yMax]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$row) {
            $row['tags'] = json_decode($row['tags'], true) ?? [];
        }

        return $rows;
    }

    // -------------------------------------------------------------------------
    // User observations
    // -------------------------------------------------------------------------

    /**
     * Returns the observation record for a user on a specific tile, or false.
     */
    public function getUserObservation(int $userId, int $tileId)
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM user_tile_observations
            WHERE user_id = ? AND tile_id = ?
        ");
        $stmt->execute([$userId, $tileId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Creates or updates the observation record for a user on a tile.
     * - revealed: set to true once the DC is beaten (never reverts to false)
     * - best_roll: stores the highest total roll achieved so far
     *
     * @return array  The current observation row after upsert
     */
    public function upsertObservation(int $userId, int $tileId, bool $revealed, int $rollTotal): array
    {
        $this->pdo->prepare("
            INSERT INTO user_tile_observations (user_id, tile_id, revealed, best_roll, observed_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, tile_id) DO UPDATE
                SET revealed    = user_tile_observations.revealed OR EXCLUDED.revealed,
                    best_roll   = GREATEST(user_tile_observations.best_roll, EXCLUDED.best_roll),
                    observed_at = EXCLUDED.observed_at
        ")->execute([$userId, $tileId, $revealed ? 'true' : 'false', $rollTotal]);

        return $this->getUserObservation($userId, $tileId);
    }

    /**
     * Returns all tiles a user has already revealed, with tile details.
     */
    public function getRevealedTiles(int $userId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT mt.*, uto.best_roll, uto.observed_at
            FROM user_tile_observations uto
            JOIN {$this->table} mt ON uto.tile_id = mt.tile_id
            WHERE uto.user_id = ? AND uto.revealed = true
            ORDER BY mt.y DESC, mt.x ASC
        ");
        $stmt->execute([$userId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$row) {
            $row['tags'] = json_decode($row['tags'], true) ?? [];
        }

        return $rows;
    }

    /**
     * Returns all tiles in a grid with the user's observation status merged in.
     * Tiles the user hasn't observed won't expose tags.
     */
    public function getTileGridForUser(int $userId, int $xMin, int $yMin, int $xMax, int $yMax): array
    {
        $stmt = $this->pdo->prepare("
            SELECT mt.*,
                   uto.revealed,
                   uto.best_roll,
                   uto.observed_at
            FROM {$this->table} mt
            LEFT JOIN user_tile_observations uto
                   ON uto.tile_id = mt.tile_id AND uto.user_id = ?
            WHERE mt.x BETWEEN ? AND ?
              AND mt.y BETWEEN ? AND ?
              AND mt.is_active = true
            ORDER BY mt.y DESC, mt.x ASC
        ");
        $stmt->execute([$userId, $xMin, $xMax, $yMin, $yMax]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$row) {
            $revealed = (bool)($row['revealed'] ?? false);
            // Expose tags only when the user has successfully revealed the tile
            $row['tags']     = $revealed ? (json_decode($row['tags'], true) ?? []) : [];
            $row['revealed'] = $revealed;
            $row['best_roll']= (int)($row['best_roll'] ?? 0);
        }

        return $rows;
    }
}
?>
