<?php
// Skill model - Handles skill data and hierarchy

class Skill extends BaseModel {
    protected $table = 'skills';
    
    protected function getPrimaryKey() {
        return 'skill_id';
    }
    
    /**
     * Get all skills organized by hierarchy (Base Class -> Specializations)
     */
    public function getAllSkillsHierarchy() {
        // Query che recupera tutte le skill con l'informazione sul parent
        $stmt = $this->pdo->query("
            SELECT s.*, s_parent.name AS parent_name
            FROM skills s
            LEFT JOIN skills s_parent ON s.parent_skill_id = s_parent.skill_id
            ORDER BY s.base_class, s.parent_skill_id NULLS FIRST, s.name
        ");
        $skills = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $hierarchy = [];
        $specializations = [];

        // Separa le classi base dalle specializzazioni
        foreach ($skills as $skill) {
            if ($skill['parent_skill_id'] === null) {
                // Classe base (Parent)
                $hierarchy[$skill['skill_id']] = array_merge($skill, ['children' => []]);
            } else {
                // Specializzazione (Child)
                $specializations[] = $skill;
            }
        }
        
        // Assegna le specializzazioni ai rispettivi genitori
        foreach ($specializations as $child) {
            if (isset($hierarchy[$child['parent_skill_id']])) {
                $hierarchy[$child['parent_skill_id']]['children'][] = $child;
            }
        }

        // Ritorna la struttura come lista ordinata di classi base
        return array_values($hierarchy);
    }
    
    /**
     * Create a new skill (base or child)
     */
    public function createSkill($name, $base_class, $description, $parent_skill_id = null) {
        return $this->insert([
            'name' => $name,
            'base_class' => $base_class,
            'description' => $description,
            'parent_skill_id' => $parent_skill_id
        ]);
    }

    /**
     * Update a skill
     */
    public function updateSkill($skill_id, $data) {
        $allowed_fields = ['name', 'base_class', 'description', 'parent_skill_id', 'max_level'];
        $update_data = [];
        
        foreach ($allowed_fields as $field) {
            if (isset($data[$field])) {
                $update_data[$field] = $data[$field];
            }
        }
        
        if (empty($update_data)) {
            return false;
        }
        
        return $this->update($skill_id, $update_data);
    }
    
    /**
     * Delete a skill
     */
    public function deleteSkill($skill_id) {
        // Prima rimuovi i riferimenti (ad esempio da user_skills, o in un ambiente reale, gestire il re-parenting)
        // Per semplicità, la FK in user_skills dovrebbe gestire l'ON DELETE CASCADE.
        // Se è un parent, imposta a NULL il parent_skill_id di tutti i figli
        $this->pdo->prepare("UPDATE skills SET parent_skill_id = NULL WHERE parent_skill_id = ?")->execute([$skill_id]);
        
        return $this->delete($skill_id);
    }
}
?>