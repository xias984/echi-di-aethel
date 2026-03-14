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
        $stmt = $this->pdo->query("
            SELECT s.*, s_parent.name AS parent_name
            FROM skills s
            LEFT JOIN skills s_parent ON s.parent_skill_id = s_parent.skill_id
            ORDER BY s.base_class, s.parent_skill_id NULLS FIRST, s.name
        ");
        $skills = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $hierarchy = [];
        $specializations = [];

        foreach ($skills as $skill) {
            if ($skill['parent_skill_id'] === null) {
                $hierarchy[$skill['skill_id']] = array_merge($skill, ['children' => []]);
            } else {
                $specializations[] = $skill;
            }
        }

        foreach ($specializations as $child) {
            if (isset($hierarchy[$child['parent_skill_id']])) {
                $hierarchy[$child['parent_skill_id']]['children'][] = $child;
            }
        }

        return array_values($hierarchy);
    }

    /**
     * Returns the skill_id for a skill looked up by name, or null if not found.
     */
    public function findIdByName(string $name): ?int
    {
        $stmt = $this->pdo->prepare("SELECT skill_id FROM skills WHERE name = ?");
        $stmt->execute([$name]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? (int) $row['skill_id'] : null;
    }

    /**
     * Adds XP to a user's skill, handling level-up and parent-skill propagation.
     *
     * Ensures the user_skills row exists (upsert), then applies xpAmount.
     * Uses the same XP curve as Action::calculateLevelAndXP.
     *
     * @param int $userId
     * @param int $skillId
     * @param int $xpAmount  Must be > 0
     * @return array {
     *   leveled_up: bool,
     *   old_level:  int,
     *   new_level:  int,
     *   xp_gained:  int,
     *   new_xp:     int,
     *   parent_leveled_up: bool,
     *   parent_new_level:  int|null
     * }
     */
    public function addXP(int $userId, int $skillId, int $xpAmount): array
    {
        if ($xpAmount <= 0) {
            throw new InvalidArgumentException("xpAmount must be positive.");
        }

        // Ensure a user_skills row exists for this skill (first-time synthesis)
        $this->pdo->prepare("
            INSERT INTO user_skills (user_id, skill_id, current_level, current_xp)
            VALUES (?, ?, 1, 0)
            ON CONFLICT (user_id, skill_id) DO NOTHING
        ")->execute([$userId, $skillId]);

        // Fetch current state
        $stmt = $this->pdo->prepare("
            SELECT us.user_skill_id, us.current_xp, us.current_level,
                   s.parent_skill_id, s.max_level
            FROM user_skills us
            JOIN skills s ON us.skill_id = s.skill_id
            WHERE us.user_id = ? AND us.skill_id = ?
        ");
        $stmt->execute([$userId, $skillId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        $oldXp    = (int) $row['current_xp'];
        $maxLevel = (int) ($row['max_level'] ?? MAX_LEVEL);
        $newXp    = $oldXp + $xpAmount;

        $oldLevelData = $this->calculateLevelAndXP($oldXp, $maxLevel);
        $newLevelData = $this->calculateLevelAndXP($newXp, $maxLevel);

        $leveledUp = $newLevelData['level'] > $oldLevelData['level'];

        $this->pdo->prepare("
            UPDATE user_skills
               SET current_xp    = ?,
                   current_level = ?
             WHERE user_skill_id = ?
        ")->execute([$newXp, $newLevelData['level'], $row['user_skill_id']]);

        // Propagate 10 % XP to parent skill (mirrors Action::processAction logic)
        $parentLeveledUp = false;
        $parentNewLevel  = null;
        $parentSkillId   = $row['parent_skill_id'] ? (int) $row['parent_skill_id'] : null;

        if ($parentSkillId !== null) {
            $parentXp = (int) max(1, round($xpAmount * 0.1));
            $parentResult = $this->addXP($userId, $parentSkillId, $parentXp);
            $parentLeveledUp = $parentResult['leveled_up'];
            $parentNewLevel  = $parentResult['new_level'];
        }

        return [
            'leveled_up'        => $leveledUp,
            'old_level'         => $oldLevelData['level'],
            'new_level'         => $newLevelData['level'],
            'xp_gained'         => $xpAmount,
            'new_xp'            => $newXp,
            'parent_leveled_up' => $parentLeveledUp,
            'parent_new_level'  => $parentNewLevel,
        ];
    }

    /**
     * XP-to-level curve (mirrors Action::calculateLevelAndXP exactly).
     * Segmented linear progression:
     *   Lv 1-49  : +25 XP per level above base 100
     *   Lv 50-199: +100 XP per level above 2000
     *   Lv 200+  : +500 XP per level above 10000
     */
    public function calculateLevelAndXP(int $totalXp, int $maxLevel = MAX_LEVEL): array
    {
        $level           = 1;
        $xpForNextLevel  = 100;
        $remainingXp     = $totalXp;

        while ($remainingXp >= $xpForNextLevel) {
            $remainingXp -= $xpForNextLevel;
            $level++;

            if ($level < 50) {
                $xpForNextLevel = 100 + $level * 25;
            } elseif ($level < 200) {
                $xpForNextLevel = 2000 + ($level - 50) * 100;
            } else {
                $xpForNextLevel = 10000 + ($level - 200) * 500;
            }

            if ($level >= $maxLevel) {
                $xpForNextLevel = -1; // cap reached
                break;
            }
        }

        return [
            'level'             => $level,
            'xp_to_next'        => $xpForNextLevel,
            'xp_current_level'  => $remainingXp,
        ];
    }

    // -------------------------------------------------------------------------
    // Admin CRUD
    // -------------------------------------------------------------------------

    public function createSkill($name, $base_class, $description, $parent_skill_id = null) {
        return $this->insert([
            'name'           => $name,
            'base_class'     => $base_class,
            'description'    => $description,
            'parent_skill_id'=> $parent_skill_id
        ]);
    }

    public function updateSkill($skill_id, $data) {
        $allowed_fields = ['name', 'base_class', 'description', 'parent_skill_id', 'max_level'];
        $update_data = [];
        foreach ($allowed_fields as $field) {
            if (isset($data[$field])) {
                $update_data[$field] = $data[$field];
            }
        }
        if (empty($update_data)) return false;
        return $this->update($skill_id, $update_data);
    }

    public function deleteSkill($skill_id) {
        $this->pdo->prepare(
            "UPDATE skills SET parent_skill_id = NULL WHERE parent_skill_id = ?"
        )->execute([$skill_id]);
        return $this->delete($skill_id);
    }
}
?>
