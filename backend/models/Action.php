<?php
// Action model for skill usage and XP gain

class Action extends BaseModel {
    protected $table = 'user_skills';
    
    protected function getPrimaryKey() {
        return 'user_skill_id';
    }
    private $userModel;
    private $equipmentModel;
    private $resourceModel;
    
    /**
     * Use a skill and gain XP
     */
    public function useSkill($user_id, $skill_name, $action_time = 5) {
        try {
            $this->beginTransaction();
            if (!$this->userModel) $this->userModel = new User($this->pdo);
            if (!$this->equipmentModel) $this->equipmentModel = new Equipment($this->pdo);
            if (!$this->resourceModel) $this->resourceModel = new Resource($this->pdo);

            // Get current skill data
            $skill_data = $this->getUserSkillData($user_id, $skill_name);
            if (!$skill_data) {
                throw new Exception("Skill not found for this user");
            }
            
            // Get user trait modifier
            $trait_modifier = $this->getUserTraitModifier($user_id);

            // Get equipped tool for bonus
            $tool_bonus = $this->getEquippedToolBonus($user_id, $skill_data['skill_id']);
            
            /*
            // Calculate XP gain
            $xp_result = $this->calculateXPGain($trait_modifier, $tool_bonus);
            
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
            */
            // Core action processing: XP gain and Resource drop
            $xp_result = $this->processAction($user_id, $skill_data, $trait_modifier, $tool_bonus);
            $this->commit();
            
            return [
                'message' => $xp_result['message'] . $xp_result['level_up_message'],
                'xp_gain' => $xp_result['xp_gain'],
                'resource_message' => $xp_result['resource_message'],
                'new_level' => $xp_result['new_level'],
                'level_up' => $xp_result['level_up'],
                'level_up_message' => $xp_result['level_up_message']
            ];
            
        } catch (Exception $e) {
            $this->rollback();
            throw $e;
        }
    }

    /**
     * Main logic: Calculate XP, apply to parent, handle resource drops
     */
    private function processAction($user_id, $skill_data, $trait_modifier, $tool_bonus) {
        $xp_result = $this->calculateXPGain($trait_modifier, $tool_bonus);
        $resource_message = "";
        $final_message = $xp_result['message'] . " Hai guadagnato " . $xp_result['xp_gain'] . " XP in " . $skill_data['skill_name'] . "." . $xp_result['tool_message'];

        // --- 1. Gestione XP per skill principale ---
        $new_total_xp = $skill_data['current_xp'] + $xp_result['xp_gain'];
        $old_level_data = $this->calculateLevelAndXP($skill_data['current_xp']);
        $new_level_data = $this->calculateLevelAndXP($new_total_xp);
        $level_up = $new_level_data['level'] > $old_level_data['level'];

        $this->update($skill_data['user_skill_id'], [
            'current_xp' => $new_total_xp,
            'current_level' => $new_level_data['level']
        ]);

        // --- 2. Gestione XP per skill genitore ---
        $parent_skill_id = $this->userModel->getParentSkillId($skill_data['skill_id']);

        if ($parent_skill_id) {
            $parent_user_skill_data = $this->getUserSkillDataById($user_id, $parent_skill_id);

            if ($parent_user_skill_data) {
                // Calculate parent XP gain (typically 10% of child skill XP)
                $parent_xp_gain = (int)($xp_result['xp_gain'] * 0.1);
                
                $parent_old_level_data = $this->calculateLevelAndXP($parent_user_skill_data['current_xp']);
                $parent_new_total_xp = $parent_user_skill_data['current_xp'] + $parent_xp_gain;
                $parent_new_level_data = $this->calculateLevelAndXP($parent_new_total_xp);
                $parent_level_up = $parent_new_level_data['level'] > $parent_old_level_data['level'];

                $this->update($parent_user_skill_data['user_skill_id'], [
                    'current_xp' => $parent_new_total_xp,
                    'current_level' => $parent_new_level_data['level']
                ]);

                $final_message .= " (Bonus XP +{$parent_xp_gain} al genitore).";
                if ($parent_level_up) {
                    $final_message .= " **Il genitore è salito al livello " . $parent_new_level_data['level'] . "!**";
                }
            }
        }

        // --- 3. Gestione generazione risorse (Solo se non è un fallimento critico) ---
        if ($xp_result['xp_multiplier'] > 0.1) {
            $resource = $this->resourceModel->getResourceBySkillId($skill_data['skill_id']);

            if ($resource) {
                $base_quantity = 1;
                $multiplier = ($xp_result['xp_multiplier'] >= 2.5) ? 2 : 1; // Drop doppio sul critico
                $quantity = $base_quantity * $multiplier;

                $this->resourceModel->addResources($user_id, $resource['resource_id'], $quantity);
                $resource_message = "Hai ottenuto {$quantity}x {$resource['name']}!";
                $final_message .= " " . $resource_message;
            }
        }

        return [
            'message' => $final_message,
            'xp_gain' => $xp_result['xp_gain'],
            'resource_message' => $resource_message,
            'new_level' => $new_level_data['level'],
            'level_up' => $level_up,
            'level_up_message' => $level_up ? " **CONGRATULAZIONI! Sei salito al Livello " . $new_level_data['level'] . "!**" : ""
        ];
    }

    private function getUserSkillDataById($user_id, $skill_id) {
        $stmt = $this->pdo->prepare("
            SELECT us.user_skill_id, us.current_xp, us.current_level
            FROM user_skills us
            WHERE us.user_id = ? AND us.skill_id = ?
        ");
        $stmt->execute([$user_id, $skill_id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    private function getEquippedToolBonus($user_id, $skill_id) {
        $tool = $this->equipmentModel->getEquippedToolForSkill($user_id, $skill_id);
        return $tool['bonus_crit_chance'] ?? 0.00;
    }
    
    /**
     * Get user skill data
     */
    private function getUserSkillData($user_id, $skill_name) {
        $stmt = $this->pdo->prepare("
            SELECT us.user_skill_id, us.current_xp, s.skill_id, s.name as skill_name
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
    private function calculateXPGain($trait_modifier, $tool_crit_bonus = 0.00) {
        $base_xp = BASE_XP_GAIN;
        $roll = rand(1, 100);
        
        $result_message = "Successo Base. ";
        $tool_message = "";
        $xp_multiplier = 1.0;
        
        $crit_threshold = 90.0 - ($tool_crit_bonus * 100);

        // Reset tool message if no crit bonus
        $tool_message = "";

        if ($roll > $crit_threshold) {
            // Caso 1: Successo Critico (con o senza bonus strumento)
            $result_message = "Successo Critico! Ottieni un bonus per la qualità.";
            $xp_multiplier = 2.5;
            if ($tool_crit_bonus > 0) {
                $tool_message = " (Aumento critico grazie allo strumento equipaggiato)";
            }
        } elseif ($roll < 5) {
            // Caso 2: Fallimento Critico (roll bassissimo)
            $result_message = "Fallimento Critico! Tempo sprecato, guadagno XP minimo.";
            $xp_multiplier = 0.1;
        } else {
            // Caso 3: Successo Base (tutto il resto)
            $result_message = "Successo Base. ";
            $xp_multiplier = 1.0;
        }
        
        // Apply trait bonus
        if ($trait_modifier === 'BONUS_CRIT_RISK_AREA' && $roll > 80) {
            $result_message = "Successo Critico (Bonus Tratto Audace)! Massima ricompensa.";
            $xp_multiplier = max($xp_multiplier, 3.0);
        }
        
        $xp_gain = (int)($base_xp * $xp_multiplier);
        
        return [
            'message' => $result_message,
            'tool_message' => $tool_message,
            'xp_gain' => $xp_gain,
            'xp_multiplier' => $xp_multiplier
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
