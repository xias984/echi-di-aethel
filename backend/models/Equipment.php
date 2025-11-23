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
        // Trova lo strumento equipaggiato valido per la skill (o la sua genitrice/figlia)
        // Ottiene anche tutte le skill figlie/genitrice per il controllo di compatibilità
        $compatible_skill_ids = $this->itemModel->getCompatibleSkillIds($skill_id);
        if (empty($compatible_skill_ids)) {
            $compatible_skill_ids = [(int)$skill_id]; // Fallback
        }
        $placeholders = rtrim(str_repeat('?,', count($compatible_skill_ids)), ',');

        $stmt = $this->pdo->prepare("
            SELECT i.bonus_crit_chance, i.equipment_slot
            FROM user_equipment ue
            JOIN items i ON ue.item_id = i.item_id
            JOIN skills s ON i.required_skill_id = s.skill_id
            WHERE ue.user_id = ?
            AND i.item_type = 'TOOL'
            AND ue.slot_type = 'TOOL_MAIN' -- Assumiamo solo lo slot principale per i tool
            AND i.required_skill_id IN ($placeholders)
            LIMIT 1
        ");
        
        $params = array_merge([(int)$user_id], $compatible_skill_ids);
        $stmt->execute($params);

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
        
        // Controlla i requisiti di skill (se l'item richiede una skill specifica)
        if ($item['required_skill_id']) {
            $user_skills = $this->userModel->getUserSkillsMap($user_id);
            $skill_id = (int)$item['required_skill_id'];

            // Verifica il livello effettivo della skill richiesta (es. Taglialegna)
            $user_level = $user_skills[$skill_id] ?? 0;
            // Se l'utente non ha la skill richiesta (livello 0), non può equipaggiare
            if ($user_level < 1) {
                throw new Exception("Non soddisfi i requisiti di skill per equipaggiare: {$item['name']}.");
            }
        }
        
        // Equipaggia l'item: se esiste già un item in quello slot, lo sostituisce
        // La PRIMARY KEY è (user_id, slot_type), quindi usiamo INSERT ... ON CONFLICT UPDATE
        $stmt = $this->pdo->prepare("
            INSERT INTO {$this->table} (user_id, item_id, slot_type)
            VALUES (?, ?, ?)
            ON CONFLICT (user_id, slot_type)
            DO UPDATE SET item_id = EXCLUDED.item_id
        ");
        $stmt->execute([(int)$user_id, (int)$item_id, $slot_type]);
        
        return $item;
    }
}
?>