<?php
// Equipment model - Handles equipping logic

class Equipment extends BaseModel {
    protected $table = 'user_equipment';
    private $itemModel;
    private $userModel;
    
    public function __construct($pdo) {
        parent::__construct($pdo);
        $this->itemModel = new Item($pdo);
        $this->userModel = new User($pdo);
    }
    
    public function getEquippedItems($user_id) {
        $stmt = $this->pdo->prepare("
            SELECT ue.*, i.name, i.item_type, i.equipment_slot, i.bonus_crit_chance, i.required_skill_id 
            FROM user_equipment ue
            JOIN items i ON ue.item_id = i.item_id
            WHERE ue.user_id = ?
        ");
        $stmt->execute([$user_id]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getEquippedToolForSkill($user_id, $skill_id) {
        // Trova lo strumento equipaggiato valido per la skill (o la sua genitrice)
        $stmt = $this->pdo->prepare("
            SELECT i.bonus_crit_chance, i.equipment_slot
            FROM user_equipment ue
            JOIN items i ON ue.item_id = i.item_id
            JOIN skills s ON i.required_skill_id = s.skill_id
            WHERE ue.user_id = ?
            AND i.item_type = 'TOOL'
            AND ue.slot_type = 'TOOL_MAIN' -- Assumiamo solo lo slot principale per i tool
            AND (i.required_skill_id = ? OR s.parent_skill_id = ?)
            LIMIT 1
        ");
        // Verifica se la skill corrente è la required_skill_id O se il parent_skill_id dello strumento corrisponde alla required_skill_id dello strumento
        $stmt->execute([$user_id, $skill_id, $skill_id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public function equipItem($user_id, $item_id) {
        $item = $this->itemModel->findByOwnerAndId($user_id, $item_id);
        if (!$item) {
            throw new Exception("Oggetto non trovato nell'inventario.");
        }
        
        $slot_type = $item['equipment_slot'];
        if (!$slot_type) {
            throw new Exception("Questo oggetto non può essere equipaggiato.");
        }
        
        // Controlla i requisiti di livello (Assumendo che Item.required_level sia sempre 1 per semplicità)
        if ($item['required_skill_id']) {
            $user_skills = $this->userModel->getUserSkillsMap($user_id); 
            $user_level = $user_skills[$item['required_skill_id']] ?? 0;
            
            // Per MVP, assumo che il livello richiesto per il tool sia 1 (o sia definito nell'item).
            // Se l'utente non ha la skill, non può equipaggiare.
            if ($user_level < 1) {
                 throw new Exception("Non soddisfi i requisiti di skill per equipaggiare: {$item['name']}.");
            }
        }

        try {
            $this->beginTransaction();
            
            // 1. Rimuove il vecchio oggetto dallo slot (lo riporta logicamente nell'inventario)
            $stmt = $this->pdo->prepare("DELETE FROM user_equipment WHERE user_id = ? AND slot_type = ?");
            $stmt->execute([$user_id, $slot_type]);
            
            // 2. Inserisce il nuovo oggetto nello slot (o aggiorna se lo slot era vuoto/aggiornato)
            $stmt = $this->pdo->prepare("
                INSERT INTO user_equipment (user_id, item_id, slot_type) VALUES (?, ?, ?)
            ");
            $stmt->execute([$user_id, $item_id, $slot_type]);
            
            $this->commit();
            return $item;
            
        } catch (Exception $e) {
            $this->rollback();
            throw $e;
        }
    }
}
?>