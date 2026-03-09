<?php
// User model

class User extends BaseModel
{
    protected $table = 'users';

    protected function getPrimaryKey()
    {
        return 'user_id';
    }

    /**
     * Create a new user with initial skills and traits
     */
    public function createUser($username)
    {
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

        }
        catch (Exception $e) {
            $this->rollback();
            throw $e;
        }
    }

    /**
     * Get user profile with skills and traits
     */
    public function getUserProfile($user_id)
    {
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
            'stats' => [
                'd20_for' => (int)$user['d20_for'],
                'd20_des' => (int)$user['d20_des'],
                'd20_cos' => (int)$user['d20_cos'],
                'd20_int' => (int)$user['d20_int'],
                'd20_sag' => (int)$user['d20_sag'],
                'd20_car' => (int)$user['d20_car'],
            ],
            'biotic' => [
                'hunger'  => (float)$user['hunger'],
                'thirst'  => (float)$user['thirst'],
                'stamina' => (float)$user['stamina'],
            ],
            'skills' => $skills,
            'trait' => $trait
        ];
    }

    /**
     * Find user by username (for login)
     */
    public function findByUsername($username)
    {
        $stmt = $this->pdo->prepare("SELECT user_id, username, admin FROM {$this->table} WHERE username = ?");
        $stmt->execute([$username]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Check if user is admin
     */
    public function isAdmin($user_id)
    {
        $user = $this->findById($user_id);
        return $user && isset($user['admin']) && (bool)$user['admin'];
    }

    /**
     * Get all skills from database
     */
    private function getAllSkills()
    {
        $stmt = $this->pdo->query("SELECT skill_id, name FROM skills");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get all traits from database
     */
    private function getAllTraits()
    {
        $stmt = $this->pdo->query("SELECT trait_id FROM traits");
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    /**
     * Assign initial bonus skills randomly
     */
    private function assignInitialBonusSkills($all_skills)
    {
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
    private function createUserSkills($user_id, $all_skills, $bonus_skills)
    {
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
    private function assignRandomTrait($user_id, $all_traits)
    {
        $random_trait_id = $all_traits[array_rand($all_traits)];
        $stmt = $this->pdo->prepare("INSERT INTO user_traits (user_id, trait_id) VALUES (?, ?)");
        $stmt->execute([$user_id, $random_trait_id]);
    }

    /**
     * Get parent skill ID by child skill ID
     */
    public function getParentSkillId($skill_id)
    {
        $stmt = $this->pdo->prepare("SELECT parent_skill_id FROM skills WHERE skill_id = ?");
        $stmt->execute([$skill_id]);
        return $stmt->fetchColumn();
    }

    /**
     * Get user skills as a map (skill_id => level) for quick lookups
     */
    public function getUserSkillsMap($user_id)
    {
        $stmt = $this->pdo->prepare("
            SELECT us.skill_id, us.current_level, us.current_xp
            FROM user_skills us
            WHERE us.user_id = ?
        ");
        $stmt->execute([$user_id]);
        $skills = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $map = [];
        foreach ($skills as $skill) {
            // Calculate the actual level from XP
            $xp_data = $this->calculateLevelAndXP($skill['current_xp']);
            $map[$skill['skill_id']] = $xp_data['level'];
        }

        return $map;
    }

    /**
     * Get user skills with calculated levels
     */
    private function getUserSkills($user_id)
    {
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
    private function getUserTrait($user_id)
    {
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
    private function calculateLevelAndXP($total_xp)
    {
        $level = 1;
        $xp_for_next_level = 100;
        $remaining_xp = $total_xp;

        while ($remaining_xp >= $xp_for_next_level) {
            $remaining_xp -= $xp_for_next_level;
            $level++;

            // XP curve becomes steeper
            if ($level < 50) {
                $xp_for_next_level = 100 + $level * 25;
            }
            elseif ($level < 200) {
                $xp_for_next_level = 2000 + ($level - 50) * 100;
            }
            else {
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
    public function getAllUsers()
    {
        $stmt = $this->pdo->query("SELECT user_id, username FROM {$this->table}");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get all users with full profiles (for admin)
     */
    public function getAllUsersWithProfiles()
    {
        $users = $this->getAllUsers();
        $result = [];

        foreach ($users as $user) {
            $profile = $this->getUserProfile($user['user_id']);
            if ($profile) {
                $userData = $this->findById($user['user_id']);
                $result[] = [
                    'user_id' => $user['user_id'],
                    'username' => $user['username'],
                    'admin' => isset($userData['admin']) ? (bool)$userData['admin'] : false,
                    'skills' => $profile['skills'],
                    'trait' => $profile['trait']
                ];
            }
        }

        return $result;
    }

    /**
     * Update a user
     */
    public function updateUser($user_id, $data)
    {
        $allowed_fields = ['username', 'admin'];
        $update_data = [];

        foreach ($allowed_fields as $field) {
            if (isset($data[$field])) {
                $update_data[$field] = $data[$field];
            }
        }

        if (empty($update_data)) {
            return false;
        }

        return $this->update($user_id, $update_data);
    }

    /**
     * Calculates the d20 modifier for a given statistic
     */
    public function getModifier(int $statValue)
    {
        return (int)floor(($statValue - 10) / 2);
    }

    /**
     * Updates the user's last activity timestamp to track online presence.
     */
    public function updateActivity($user_id)
    {
        $stmt = $this->pdo->prepare("UPDATE {$this->table} SET last_activity = CURRENT_TIMESTAMP WHERE user_id = ?");
        $stmt->execute([$user_id]);
    }

    /**
     * Applies the biological tick to reduce thirst and hunger by a fixed percentage.
     * Thirst -4%, Hunger -2%. Constraints ensure values stay within 0-100.
     */
    public function applyTick($user_id)
    {
        // GREATEST ensures that it does not drop below 0 if somehow constraint does not catch it earlier
        // though DB check constraint should normally handle it. Using GREATEST is safer for SQL update.
        $stmt = $this->pdo->prepare("
            UPDATE {$this->table} 
            SET 
                thirst = GREATEST(0.00, thirst - 4.00),
                hunger = GREATEST(0.00, hunger - 2.00)
            WHERE user_id = ?
        ");
        $stmt->execute([$user_id]);
    }

    /**
     * Calculates offline hours and restores stamina (+25% per hour up to 100%).
     */
    public function processOfflineRecovery($user_id)
    {
        $stmt = $this->pdo->prepare("SELECT last_activity FROM {$this->table} WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $last_activity = $stmt->fetchColumn();

        if ($last_activity) {
            $last_time = strtotime($last_activity);
            $current_time = time();
            $diff_seconds = $current_time - $last_time;

            if ($diff_seconds > 0) {
                $hours_offline = floor($diff_seconds / 3600);

                if ($hours_offline > 0) {
                    $stamina_recovery = $hours_offline * 25.00;

                    $updateStmt = $this->pdo->prepare("
                        UPDATE {$this->table}
                        SET stamina = LEAST(100.00, stamina + ?)
                        WHERE user_id = ?
                    ");
                    $updateStmt->execute([$stamina_recovery, $user_id]);
                }
            }
        }

        // After processing recovery, update activity to current time
        $this->updateActivity($user_id);
    }

    /**
     * Delete a user
     */
    public function deleteUser($user_id)
    {
        $stmt = $this->pdo->prepare("DELETE FROM {$this->table} WHERE user_id = ?");
        $stmt->execute([$user_id]);
    }
}
?>
