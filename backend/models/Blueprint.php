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
}
?>
