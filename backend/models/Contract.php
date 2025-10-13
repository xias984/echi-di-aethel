<?php
// Contract model

class Contract extends BaseModel {
    protected $table = 'contracts';
    
    protected function getPrimaryKey() {
        return 'contract_id';
    }
    
    /**
     * Create a new contract with escrow
     */
    public function createContract($proposer_id, $title, $required_skill_name, $required_level, $reward_amount) {
        try {
            $this->beginTransaction();
            
            // Get skill ID
            $skill_id = $this->getSkillIdByName($required_skill_name);
            if (!$skill_id) {
                throw new Exception("Invalid skill name");
            }
            
            // Insert contract
            $contract_id = $this->insert([
                'proposer_id' => $proposer_id,
                'title' => $title,
                'required_skill_id' => $skill_id,
                'required_level' => $required_level,
                'reward_amount' => $reward_amount,
                'status' => 'OPEN'
            ]);
            
            // Create escrow transaction
            $this->createEscrowTransaction($contract_id, $reward_amount);
            
            $this->commit();
            return $contract_id;
            
        } catch (Exception $e) {
            $this->rollback();
            throw $e;
        }
    }
    
    /**
     * Get contracts available for a user
     */
    public function getAvailableContracts($user_id) {
        // Get user skills and levels
        $user_skills = $this->getUserSkills($user_id);
        
        $query = "
            SELECT 
                c.contract_id, c.title, c.reward_amount, c.required_level, c.proposer_id, c.status,
                s.name AS required_skill_name,
                u_prop.username AS proposer_name
            FROM contracts c
            JOIN skills s ON c.required_skill_id = s.skill_id
            JOIN users u_prop ON c.proposer_id = u_prop.user_id
            WHERE c.status = 'OPEN' 
        ";
        
        $where_parts = [];
        $params = [];
        
        // Filter by user's skill levels
        if ($user_id > 0 && !empty($user_skills)) {
            foreach ($user_skills as $skill_id => $level) {
                $where_parts[] = "(c.required_skill_id = ? AND c.required_level <= ?)";
                $params[] = $skill_id;
                $params[] = $level;
            }
        }
        
        if (!empty($where_parts)) {
            $query .= " AND (" . implode(" OR ", $where_parts) . ")";
        } else {
            // If no skills, show only level 1 contracts
            $query .= " AND c.required_level = 1";
        }
        
        $query .= " ORDER BY c.required_level ASC, c.created_at DESC";
        
        $stmt = $this->pdo->prepare($query);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Accept a contract
     */
    public function acceptContract($contract_id, $acceptor_id) {
        try {
            $this->beginTransaction();
            
            // Check if contract is available
            $contract = $this->findById($contract_id);
            if (!$contract || $contract['status'] !== 'OPEN') {
                throw new Exception("Contract not available");
            }
            
            // Update contract status
            $this->update($contract_id, [
                'status' => 'ACCEPTED',
                'accepted_by_id' => $acceptor_id,
                'accepted_at' => date('Y-m-d H:i:s')
            ]);
            
            $this->commit();
            return true;
            
        } catch (Exception $e) {
            $this->rollback();
            throw $e;
        }
    }
    
    /**
     * Get skill ID by name
     */
    private function getSkillIdByName($skill_name) {
        $stmt = $this->pdo->prepare("SELECT skill_id FROM skills WHERE name = ?");
        $stmt->execute([$skill_name]);
        return $stmt->fetchColumn();
    }
    
    /**
     * Create escrow transaction
     */
    private function createEscrowTransaction($contract_id, $amount) {
        $stmt = $this->pdo->prepare("
            INSERT INTO transactions (contract_id, amount, status)
            VALUES (?, ?, 'PENDING_ESCROW')
        ");
        $stmt->execute([$contract_id, $amount]);
    }
    
    /**
     * Get user skills and levels
     */
    private function getUserSkills($user_id) {
        $stmt = $this->pdo->prepare("
            SELECT skill_id, current_level 
            FROM user_skills 
            WHERE user_id = ?
        ");
        $stmt->execute([$user_id]);
        return $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    }
}
?>
