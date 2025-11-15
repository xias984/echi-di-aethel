<?php
// Resource model - Handles resource inventory and generation

class Resource extends BaseModel {
    protected $table = 'user_resources';
    
    protected function getPrimaryKey() {
        return 'user_resource_id';
    }
    
    /**
     * Get resource metadata by skill ID (to know what to drop)
     */
    public function getResourceBySkillId($skill_id) {
        $stmt = $this->pdo->prepare("
            SELECT resource_id, name, base_resource_type
            FROM resources
            WHERE skill_id = ?
            LIMIT 1
        ");
        $stmt->execute([$skill_id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Get user resources
     */
    public function getUserResources($user_id) {
        $stmt = $this->pdo->prepare("
            SELECT ur.resource_id, ur.quantity, r.name, r.base_resource_type
            FROM user_resources ur
            JOIN resources r ON ur.resource_id = r.resource_id
            WHERE ur.user_id = ?
            AND ur.quantity > 0
            ORDER BY r.name
        ");
        $stmt->execute([$user_id]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Add resources to user inventory (creates entry if non-existent)
     * Can also subtract resources if quantity is negative
     */
    public function addResources($user_id, $resource_id, $quantity) {
        if ($quantity == 0) return true; // No change needed
        
        // If subtracting, check if user has enough resources first
        if ($quantity < 0) {
            $stmt = $this->pdo->prepare("
                SELECT quantity FROM user_resources 
                WHERE user_id = ? AND resource_id = ?
            ");
            $stmt->execute([$user_id, $resource_id]);
            $current = $stmt->fetchColumn();
            
            // If no entry exists or not enough resources, return false
            if ($current === false || $current < abs($quantity)) {
                return false; // Not enough resources
            }
        }
        
        // For positive quantities, insert or update
        // For negative quantities, we know the entry exists and has enough
        $sql = "
            INSERT INTO user_resources (user_id, resource_id, quantity)
            VALUES (?, ?, ?)
            ON CONFLICT (user_id, resource_id)
            DO UPDATE SET quantity = user_resources.quantity + EXCLUDED.quantity
        ";
        $stmt = $this->pdo->prepare($sql);
        $result = $stmt->execute([$user_id, $resource_id, $quantity]);
        
        // Safety check: ensure quantity doesn't go negative (shouldn't happen if checks are correct)
        if ($result && $quantity < 0) {
            $stmt = $this->pdo->prepare("
                UPDATE user_resources 
                SET quantity = 0 
                WHERE user_id = ? AND resource_id = ? AND quantity < 0
            ");
            $stmt->execute([$user_id, $resource_id]);
        }
        
        return $result;
    }
}
?>