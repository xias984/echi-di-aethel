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

    /**
     * Recupera le ID delle skill genitrici/figlie compatibili con una data skill.
     * Utile per verificare l'equipaggiamento e l'uso delle skill.
     * @param int $skill_id L'ID della skill di riferimento.
     * @return array Array di ID delle skill compatibili (inclusa la skill stessa).
     */
    public function getCompatibleSkillIds($skill_id) {
        $skill_id = (int)$skill_id;
        $ids = [$skill_id];

        // Cerca la skill genitrice (se la skill attuale è una figlia)
        $parent_stmt = $this->pdo->prepare("SELECT parent_skill_id FROM skills WHERE skill_id = ?");
        $parent_stmt->execute([$skill_id]);
        $parent_id = $parent_stmt->fetchColumn();
        if ($parent_id)  { $ids[] = (int)$parent_id; }

        // Cerca le skill figlie (se la skill attuale è una genitrice)
        $child_stmt = $this->pdo->prepare("SELECT skill_id FROM skills WHERE parent_skill_id = ?");
        $child_stmt->execute([$skill_id]);
        $ids = array_merge($ids, $child_stmt->fetchAll(PDO::FETCH_COLUMN));

        return array_unique($ids);
    }
}
?>