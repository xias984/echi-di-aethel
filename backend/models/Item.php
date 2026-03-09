<?php
// Item model - Placeholder for basic item functionality

class Item extends BaseModel
{
    protected $table = 'items';

    protected function getPrimaryKey()
    {
        return 'item_id';
    }

    public function getUserInventory($user_id)
    {
        // Assume l'inventario sono tutti gli oggetti di cui l'utente è proprietario
        $stmt = $this->pdo->prepare("SELECT * FROM {$this->table} WHERE owner_id = ?");
        $stmt->execute([$user_id]);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($items as &$item) {
            $this->parseItemTags($item);
        }

        return $items;
    }

    public function findByOwnerAndId($owner_id, $item_id)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM {$this->table} WHERE item_id = ? AND owner_id = ?");
        $stmt->execute([$item_id, $owner_id]);
        $item = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($item) {
            $this->parseItemTags($item);
        }

        return $item;
    }

    public function findById($id)
    {
        $item = parent::findById($id);
        if ($item) {
            $this->parseItemTags($item);
        }
        return $item;
    }

    public function insert($data)
    {
        if (!isset($data['tags'])) {
            $data['tags'] = json_encode([]);
        }
        elseif (is_array($data['tags'])) {
            $data['tags'] = json_encode($data['tags']);
        }
        return parent::insert($data);
    }

    public function update($id, $data)
    {
        if (isset($data['tags']) && is_array($data['tags'])) {
            $data['tags'] = json_encode($data['tags']);
        }
        return parent::update($id, $data);
    }

    private function parseItemTags(&$item)
    {
        if (isset($item['tags']) && is_string($item['tags'])) {
            $item['tags'] = json_decode($item['tags'], true) ?: [];
        }
        else {
            $item['tags'] = [];
        }
    }

    /**
     * Verifica che l'utente possieda un item specifico.
     * Poiché ogni item_id è unico, quantity > 1 non è supportato a livello schema.
     */
    public function checkItemQuantity($user_id, $item_id, $quantity)
    {
        $stmt = $this->pdo->prepare(
            "SELECT COUNT(*) FROM {$this->table} WHERE item_id = ? AND owner_id = ?"
        );
        $stmt->execute([$item_id, $user_id]);
        return (int)$stmt->fetchColumn() >= 1;
    }

    /**
     * Trasferisce la ownership di un item.
     * $delta < 0 → rimuove l'item dall'utente (owner_id = NULL)
     * $delta > 0 → assegna l'item all'utente
     */
    public function updateInventory($user_id, $item_id, $delta)
    {
        if ($delta < 0) {
            $stmt = $this->pdo->prepare(
                "UPDATE {$this->table} SET owner_id = NULL WHERE item_id = ? AND owner_id = ?"
            );
            $stmt->execute([$item_id, $user_id]);
        } else {
            $stmt = $this->pdo->prepare(
                "UPDATE {$this->table} SET owner_id = ? WHERE item_id = ?"
            );
            $stmt->execute([$user_id, $item_id]);
        }
    }

    /**
     * Recupera le ID delle skill genitrici/figlie compatibili con una data skill.
     * Utile per verificare l'equipaggiamento e l'uso delle skill.
     * @param int $skill_id L'ID della skill di riferimento.
     * @return array Array di ID delle skill compatibili (inclusa la skill stessa).
     */
    public function getCompatibleSkillIds($skill_id)
    {
        $skill_id = (int)$skill_id;
        $ids = [$skill_id];

        // Cerca la skill genitrice (se la skill attuale è una figlia)
        $parent_stmt = $this->pdo->prepare("SELECT parent_skill_id FROM skills WHERE skill_id = ?");
        $parent_stmt->execute([$skill_id]);
        $parent_id = $parent_stmt->fetchColumn();
        if ($parent_id) {
            $ids[] = (int)$parent_id;
        }

        // Cerca le skill figlie (se la skill attuale è una genitrice)
        $child_stmt = $this->pdo->prepare("SELECT skill_id FROM skills WHERE parent_skill_id = ?");
        $child_stmt->execute([$skill_id]);
        $ids = array_merge($ids, $child_stmt->fetchAll(PDO::FETCH_COLUMN));

        return array_unique($ids);
    }
}
?>