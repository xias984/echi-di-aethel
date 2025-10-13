<?php
// Action model for skill usage and XP gain

class Action extends BaseModel {
    protected $table = 'user_skills';
    
    protected function getPrimaryKey() {
        return 'user_skill_id';
    }
    
    /**
     * Use a skill and gain XP
     */
    public function useSkill($user_id, $skill_name, $action_time = 5) {
        try {
            $this->beginTransaction();
            
            // Get current skill data
            $skill_data = $this->getUserSkillData($user_id, $skill_name);
            if (!$skill_data) {
                throw new Exception("Skill not found for this user");
            }
            
            // Get user trait modifier
            $trait_modifier = $this->getUserTraitModifier($user_id);
            
            // Calculate XP gain
            $xp_result = $this->calculateXPGain($trait_modifier);
            
            // Update skill XP
            $new_total_xp = $skill_data['current_xp'] + $xp_result['xp_gain'];
            $old_level_data = $this->calculateLevelAndXP($skill_data['current_xp']);
            $new_level_data = $this->calculateLevelAndXP($new_total_xp);
            
            $level_up = $new_level_data['level'] > $old_level_data['level'];
            
            // Update database
            $this->update($skill_data['user_skill_id'], [
                'current_xp' => $new_total_xp,
                'current_level' => $new_level_data['level']
            ]);
            
            $this->commit();
            
            return [
                'message' => $xp_result['message'] . " Hai guadagnato " . $xp_result['xp_gain'] . " XP in " . $skill_name . ".",
                'xp_gain' => $xp_result['xp_gain'],
                'new_level' => $new_level_data['level'],
                'level_up' => $level_up,
                'level_up_message' => $level_up ? " **CONGRATULAZIONI! Sei salito al Livello " . $new_level_data['level'] . "!**" : ""
            ];
            
        } catch (Exception $e) {
            $this->rollback();
            throw $e;
        }
    }
    
    /**
     * Get user skill data
     */
    private function getUserSkillData($user_id, $skill_name) {
        $stmt = $this->pdo->prepare("
            SELECT us.user_skill_id, us.current_xp, s.skill_id
            FROM user_skills us
            JOIN skills s ON us.skill_id = s.skill_id
            WHERE us.user_id = ? AND s.name = ?
        ");
        $stmt->execute([$user_id, $skill_name]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * Get user trait modifier
     */
    private function getUserTraitModifier($user_id) {
        $stmt = $this->pdo->prepare("
            SELECT t.code_modifier FROM user_traits ut
            JOIN traits t ON ut.trait_id = t.trait_id
            WHERE ut.user_id = ?
        ");
        $stmt->execute([$user_id]);
        $trait = $stmt->fetch(PDO::FETCH_ASSOC);
        return $trait['code_modifier'] ?? null;
    }
    
    /**
     * Calculate XP gain based on dice roll and traits
     */
    private function calculateXPGain($trait_modifier) {
        $base_xp = BASE_XP_GAIN;
        $roll = rand(1, 100);
        
        $result_message = "Successo Base. ";
        $xp_multiplier = 1.0;
        
        if ($roll > 90) {
            $result_message = "Successo Critico! Ottieni un bonus per la qualità.";
            $xp_multiplier = 2.5;
        } elseif ($roll < 5) {
            $result_message = "Fallimento Critico! Tempo sprecato, guadagno XP minimo.";
            $xp_multiplier = 0.1;
        }
        
        // Apply trait bonus
        if ($trait_modifier === 'BONUS_CRIT_RISK_AREA' && $roll > 80) {
            $result_message = "Successo Critico (Bonus Tratto Audace)! Massima ricompensa.";
            $xp_multiplier = max($xp_multiplier, 3.0);
        }
        
        $xp_gain = (int)($base_xp * $xp_multiplier);
        
        return [
            'message' => $result_message,
            'xp_gain' => $xp_gain
        ];
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

        // If level is max, XP required is infinite to block progression
        if ($level >= MAX_LEVEL) {
            $xp_for_next_level = -1;
        }

        return [
            'level' => $level,
            'xp_to_next' => $xp_for_next_level,
            'xp_current_level' => $remaining_xp
        ];
    }
}
?>
