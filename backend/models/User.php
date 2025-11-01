<?php
// User model

class User extends BaseModel {
    protected $table = 'users';
    
    protected function getPrimaryKey() {
        return 'user_id';
    }
    
    /**
     * Create a new user with initial skills and traits
     */
    public function createUser($username) {
        try {
            $this->beginTransaction();
            
            // Insert user
            $user_id = $this->insert(['username' => $username]);
            
            // Get all skills and traits
            $skills = $this->getAllSkills();
            $traits = $this->getAllTraits();
            
            // Assign initial bonus skills
            $bonus_skills = $this->assignInitialBonusSkills($skills);
            
            // Create user skills
            $this->createUserSkills($user_id, $skills, $bonus_skills);
            
            // Assign random trait
            $this->assignRandomTrait($user_id, $traits);
            
            $this->commit();
            return $user_id;
            
        } catch (Exception $e) {
            $this->rollback();
            throw $e;
        }
    }
    
    /**
     * Get user profile with skills and traits
     */
    public function getUserProfile($user_id) {
        // Get user info
        $user = $this->findById($user_id);
        if (!$user) {
            return null;
        }
        
        // Get user skills with calculated levels
        $skills = $this->getUserSkills($user_id);
        
        // Get user trait
        $trait = $this->getUserTrait($user_id);
        
        return [
            'username' => $user['username'],
            'skills' => $skills,
            'trait' => $trait
        ];
    }
    
    /**
     * Find user by username (for login)
     */
    public function findByUsername($username) {
        $stmt = $this->pdo->prepare("SELECT user_id, username FROM {$this->table} WHERE username = ?");
        $stmt->execute([$username]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * Get all skills from database
     */
    private function getAllSkills() {
        $stmt = $this->pdo->query("SELECT skill_id, name FROM skills");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Get all traits from database
     */
    private function getAllTraits() {
        $stmt = $this->pdo->query("SELECT trait_id FROM traits");
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }
    
    /**
     * Assign initial bonus skills randomly
     */
    private function assignInitialBonusSkills($all_skills) {
        $bonus_skills = [];
        
        while (count($bonus_skills) < INITIAL_BONUS_SKILLS) {
            $rand_skill = $all_skills[array_rand($all_skills)];
            if (!in_array($rand_skill['skill_id'], array_column($bonus_skills, 'skill_id'))) {
                $bonus_skills[] = [
                    'skill_id' => $rand_skill['skill_id'], 
                    'xp' => INITIAL_XP_BONUS
                ];
            }
        }
        
        return $bonus_skills;
    }
    
    /**
     * Create user skills entries
     */
    private function createUserSkills($user_id, $all_skills, $bonus_skills) {
        $stmt = $this->pdo->prepare("
            INSERT INTO user_skills (user_id, skill_id, current_level, current_xp) 
            VALUES (?, ?, ?, ?)
        ");
        
        foreach ($all_skills as $skill) {
            $bonus = 0;
            foreach ($bonus_skills as $b) {
                if ($b['skill_id'] == $skill['skill_id']) {
                    $bonus = $b['xp'];
                    break;
                }
            }
            $initial_level = ($bonus > 0) ? 2 : 1;
            $stmt->execute([$user_id, $skill['skill_id'], $initial_level, $bonus]);
        }
    }
    
    /**
     * Assign random trait to user
     */
    private function assignRandomTrait($user_id, $all_traits) {
        $random_trait_id = $all_traits[array_rand($all_traits)];
        $stmt = $this->pdo->prepare("INSERT INTO user_traits (user_id, trait_id) VALUES (?, ?)");
        $stmt->execute([$user_id, $random_trait_id]);
    }
    
    /**
     * Get user skills with calculated levels
     */
    private function getUserSkills($user_id) {
        $stmt = $this->pdo->prepare("
            SELECT s.name, us.current_level, us.current_xp, s.base_class, s.skill_id
            FROM user_skills us
            JOIN skills s ON us.skill_id = s.skill_id
            WHERE us.user_id = ?
            ORDER BY s.base_class
        ");
        $stmt->execute([$user_id]);
        $skills = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Calculate levels and XP
        foreach ($skills as &$skill) {
            $xp_data = $this->calculateLevelAndXP($skill['current_xp']);
            $skill['current_level'] = $xp_data['level'];
            $skill['xp_to_next'] = $xp_data['xp_to_next'];
            $skill['xp_on_level'] = $xp_data['xp_current_level'];
        }
        
        return $skills;
    }
    
    /**
     * Get user trait
     */
    private function getUserTrait($user_id) {
        $stmt = $this->pdo->prepare("
            SELECT t.name, t.description, t.code_modifier 
            FROM user_traits ut
            JOIN traits t ON ut.trait_id = t.trait_id
            WHERE ut.user_id = ?
        ");
        $stmt->execute([$user_id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }
    
    /**
     * Calculate level and XP data
     */
    private function calculateLevelAndXP($total_xp) {
        $level = 1;
        $xp_for_next_level = 100;
        $remaining_xp = $total_xp;

        while ($remaining_xp >= $xp_for_next_level) {
            $remaining_xp -= $xp_for_next_level;
            $level++;

            // XP curve becomes steeper
            if ($level < 50) {
                $xp_for_next_level = 100 + $level * 25;
            } elseif ($level < 200) {
                $xp_for_next_level = 2000 + ($level - 50) * 100;
            } else {
                // Exponential curve for mastery
                $xp_for_next_level = 10000 + ($level - 200) * 500;
            }
        }

        // If level is max (e.g. 1000), XP required is infinite to block progression
        if ($level >= MAX_LEVEL) {
            $xp_for_next_level = -1;
        }

        return [
            'level' => $level,
            'xp_to_next' => $xp_for_next_level,
            'xp_current_level' => $remaining_xp
        ];
    }

    /**
     * Get all users
     */
    public function getAllUsers() {
        $stmt = $this->pdo->query("SELECT user_id, username FROM {$this->table}");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Delete a user
     */
    public function deleteUser($user_id) {
        $stmt = $this->pdo->prepare("DELETE FROM {$this->table} WHERE user_id = ?");
        $stmt->execute([$user_id]);
    }
}
?>
