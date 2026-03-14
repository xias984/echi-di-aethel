<?php
require_once __DIR__ . '/BaseModel.php';

class Blueprint extends BaseModel
{
    protected $table = 'blueprints';

    /**
     * Finds a blueprint by its unique recipe hash
     *
     * @param string $hash
     * @return array|false
     */
    public function findByHash($hash)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM {$this->table} WHERE hash = ?");
        $stmt->execute([$hash]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Creates a new blueprint with all required and economy fields.
     * Wraps BaseModel::insert() with explicit defaults for tier, base_value, weight_kg.
     *
     * @param array $data  Must contain: hash, name, rank, owner_id, modifiers.
     *                     Optional: royalty_rate, tier, base_value, weight_kg.
     * @return int  The new blueprint's ID
     */
    public function create(array $data): int
    {
        $rankToTier = ['D' => 1, 'C' => 2, 'B' => 3, 'A' => 4, 'S' => 5];
        $rank = strtoupper(trim($data['rank'] ?? 'D'));

        $row = [
            'hash'         => $data['hash'],
            'name'         => $data['name'],
            'rank'         => $rank,
            'owner_id'     => (int) $data['owner_id'],
            'modifiers'    => is_string($data['modifiers'])
                                  ? $data['modifiers']
                                  : json_encode($data['modifiers']),
            'royalty_rate' => $data['royalty_rate'] ?? 5.00,
            'tier'         => $data['tier'] ?? ($rankToTier[$rank] ?? 1),
            'base_value'   => $data['base_value'] ?? 0.00,
            'weight_kg'    => $data['weight_kg']  ?? 0.000,
        ];

        return (int) $this->insert($row);
    }
}
?>
