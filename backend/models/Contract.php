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
     * Returns both open contracts (filtered by user skills) and accepted contracts (where user is involved)
     */
    public function getAvailableContracts($user_id) {
        $results = [];
        
        // Get user skills and levels
        $user_skills = $this->getUserSkills($user_id);
        
        // Query for OPEN contracts (filtered by user skills)
        $query_open = "
            SELECT 
                c.contract_id, c.title, c.reward_amount, c.required_level, c.proposer_id, c.status,
                c.accepted_by_id, c.created_at,
                s.name AS required_skill_name,
                u_prop.username AS proposer_name,
                u_accept.username AS acceptor_name
            FROM contracts c
            JOIN skills s ON c.required_skill_id = s.skill_id
            JOIN users u_prop ON c.proposer_id = u_prop.user_id
            LEFT JOIN users u_accept ON c.accepted_by_id = u_accept.user_id
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
            $query_open .= " AND (" . implode(" OR ", $where_parts) . ")";
        } else {
            // If no skills, show only level 1 contracts
            $query_open .= " AND c.required_level = 1";
        }
        
        $query_open .= " ORDER BY c.required_level ASC, c.created_at DESC";
        
        // Execute first query for OPEN contracts
        if (!empty($params)) {
            $stmt = $this->pdo->prepare($query_open);
            $stmt->execute($params);
        } else {
            $stmt = $this->pdo->prepare($query_open);
            $stmt->execute();
        }
        $open_contracts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $results = array_merge($results, $open_contracts);
        
        // Query for ACCEPTED/COMPLETED contracts where user is involved
        if ($user_id > 0) {
            $query_accepted = "
                SELECT 
                    c.contract_id, c.title, c.reward_amount, c.required_level, c.proposer_id, c.status,
                    c.accepted_by_id, c.created_at,
                    s.name AS required_skill_name,
                    u_prop.username AS proposer_name,
                    u_accept.username AS acceptor_name
                FROM contracts c
                JOIN skills s ON c.required_skill_id = s.skill_id
                JOIN users u_prop ON c.proposer_id = u_prop.user_id
                LEFT JOIN users u_accept ON c.accepted_by_id = u_accept.user_id
                WHERE (c.status = 'ACCEPTED' OR c.status = 'COMPLETED')
                AND (c.proposer_id = ? OR c.accepted_by_id = ?)
                ORDER BY c.status ASC, c.required_level ASC, c.created_at DESC
            ";
            
            $stmt = $this->pdo->prepare($query_accepted);
            $stmt->execute([$user_id, $user_id]);
            $accepted_contracts = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $results = array_merge($results, $accepted_contracts);
        }
        
        // Sort results: OPEN first, then ACCEPTED/COMPLETED
        usort($results, function($a, $b) {
            // First sort by status (OPEN < ACCEPTED < COMPLETED)
            $status_order = ['OPEN' => 1, 'ACCEPTED' => 2, 'COMPLETED' => 3];
            $a_status = $status_order[$a['status']] ?? 99;
            $b_status = $status_order[$b['status']] ?? 99;
            
            if ($a_status !== $b_status) {
                return $a_status - $b_status;
            }
            
            // Then by required_level
            if ($a['required_level'] !== $b['required_level']) {
                return $a['required_level'] - $b['required_level'];
            }
            
            // Finally by created_at (newest first)
            return strtotime($b['created_at'] ?? 0) - strtotime($a['created_at'] ?? 0);
        });
        
        return $results;
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
    public function getSkillIdByName($skill_name) {
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

    /**
     * Delete a contract
     */
    public function deleteContract($contract_id) {
        $stmt = $this->pdo->prepare("DELETE FROM {$this->table} WHERE contract_id = ?");
        $stmt->execute([$contract_id]);
    }
    
    /**
     * Get all contracts with details (for admin)
     */
    public function getAllContractsWithDetails() {
        $stmt = $this->pdo->query("
            SELECT 
                c.*,
                s.name AS required_skill_name,
                u_prop.username AS proposer_name,
                u_accept.username AS acceptor_name
            FROM contracts c
            LEFT JOIN skills s ON c.required_skill_id = s.skill_id
            LEFT JOIN users u_prop ON c.proposer_id = u_prop.user_id
            LEFT JOIN users u_accept ON c.accepted_by_id = u_accept.user_id
            ORDER BY c.created_at DESC
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Update a contract
     */
    public function updateContract($contract_id, $data) {
        $allowed_fields = ['title', 'required_level', 'reward_amount', 'status'];
        $update_data = [];
        
        foreach ($allowed_fields as $field) {
            if (isset($data[$field])) {
                $update_data[$field] = $data[$field];
            }
        }
        
        // If required_skill_name is provided, get the skill_id
        if (isset($data['required_skill_name'])) {
            $skill_id = $this->getSkillIdByName($data['required_skill_name']);
            if ($skill_id) {
                $update_data['required_skill_id'] = $skill_id;
            }
        }
        
        if (empty($update_data)) {
            return false;
        }
        
        return $this->update($contract_id, $update_data);
    }
}
?>
