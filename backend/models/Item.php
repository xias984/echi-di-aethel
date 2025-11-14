<?php
// Item model - Placeholder for basic item functionality

class Item extends BaseModel {
    protected $table = 'items';
    
    protected function getPrimaryKey() {
        return 'item_id';
    }
    
    public function getUserInventory($user_id) {
        // Assume l'inventario sono tutti gli oggetti di cui l'utente è proprietario
        $stmt = $this->pdo->prepare("SELECT * FROM {$this->table} WHERE owner_id = ?");
        $stmt->execute([$user_id]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function findByOwnerAndId($owner_id, $item_id) {
        $stmt = $this->pdo->prepare("SELECT * FROM {$this->table} WHERE item_id = ? AND owner_id = ?");
        $stmt->execute([$item_id, $owner_id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}
?>