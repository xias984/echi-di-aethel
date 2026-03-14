<?php
// Skill controller - Handles skill management

class SkillController extends BaseController {
    private $skillModel;

    public function __construct($pdo) {
        parent::__construct($pdo);
        $this->skillModel = new Skill($pdo);
    }

    /**
     * GET /api/admin/skills
     * Get all skills in hierarchy (accessible to anyone for displaying game info)
     */
    public function getAllSkills() {
        try {
            $skills = $this->skillModel->getAllSkillsHierarchy();
            $this->jsonResponse(['skills' => $skills]);
        } catch (Exception $e) {
            error_log("Skill Get Error: " . $e->getMessage());
            $this->errorResponse("Error retrieving skills: " . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/skills/{id}/xp
     * Awards XP to the authenticated user for the given skill.
     *
     * Body: { "user_id": int, "xp_amount": int }
     *
     * Response includes level-up feedback when the threshold is crossed.
     */
    public function awardXP($skillId) {
        $data = $this->getJsonInput();
        $this->validateRequired($data, ['user_id', 'xp_amount']);

        $userId   = (int) $data['user_id'];
        $xpAmount = (int) $data['xp_amount'];
        $skillId  = (int) $skillId;

        if ($userId <= 0 || $skillId <= 0) {
            $this->errorResponse("Invalid user_id or skill_id.");
        }
        if ($xpAmount <= 0) {
            $this->errorResponse("xp_amount must be a positive integer.");
        }

        try {
            $result  = $this->skillModel->addXP($userId, $skillId, $xpAmount);
            $message = "Guadagnati {$xpAmount} XP.";

            if ($result['leveled_up']) {
                $message .= " **LEVEL UP! Sei salito al livello {$result['new_level']}!**";
            }
            if ($result['parent_leveled_up']) {
                $message .= " La skill genitore ha raggiunto il livello {$result['parent_new_level']}!";
            }

            $this->successResponse($message, [
                'leveled_up'        => $result['leveled_up'],
                'old_level'         => $result['old_level'],
                'new_level'         => $result['new_level'],
                'xp_gained'         => $result['xp_gained'],
                'new_xp'            => $result['new_xp'],
                'parent_leveled_up' => $result['parent_leveled_up'],
                'parent_new_level'  => $result['parent_new_level'],
            ]);
        } catch (InvalidArgumentException $e) {
            $this->errorResponse($e->getMessage());
        } catch (Exception $e) {
            error_log("Award XP Error: " . $e->getMessage());
            $this->errorResponse("Error awarding XP: " . $e->getMessage(), 500);
        }
    }

    // -------------------------------------------------------------------------
    // Admin CRUD
    // -------------------------------------------------------------------------

    /**
     * POST /api/admin/skills
     */
    public function createSkill() {
        $data = $this->getJsonInput();
        $this->validateRequired($data, ['admin_id', 'name', 'base_class', 'description']);

        try {
            $skill_id = $this->skillModel->createSkill(
                $data['name'],
                $data['base_class'],
                $data['description'],
                $data['parent_skill_id'] ?? null
            );
            $this->successResponse("Skill created successfully.", ['skill_id' => $skill_id], 201);
        } catch (PDOException $e) {
            $this->handleDbException($e);
        } catch (Exception $e) {
            error_log("Skill Creation Error: " . $e->getMessage());
            $this->errorResponse("Error creating skill: " . $e->getMessage(), 500);
        }
    }

    /**
     * PUT /api/admin/skills/{id}
     */
    public function updateSkill($skill_id) {
        $data = $this->getJsonInput();
        $this->validateRequired($data, ['admin_id']);

        try {
            unset($data['admin_id']);
            $result = $this->skillModel->updateSkill((int)$skill_id, $data);
            if ($result) {
                $this->successResponse("Skill updated successfully.");
            } else {
                $this->errorResponse("No valid fields to update or skill not found.");
            }
        } catch (PDOException $e) {
            $this->handleDbException($e);
        } catch (Exception $e) {
            error_log("Skill Update Error: " . $e->getMessage());
            $this->errorResponse("Error updating skill: " . $e->getMessage(), 500);
        }
    }

    /**
     * DELETE /api/admin/skills/{id}
     */
    public function deleteSkill($skill_id) {
        $data    = $this->getJsonInput();
        $adminId = isset($data['admin_id']) ? (int)$data['admin_id'] : (int)($_REQUEST['admin_id'] ?? 0);

        if (!$adminId) {
            $this->errorResponse("Admin ID is required.", 403);
        }

        try {
            $this->skillModel->deleteSkill((int)$skill_id);
            $this->successResponse("Skill deleted successfully.");
        } catch (PDOException $e) {
            $this->handleDbException($e);
        } catch (Exception $e) {
            error_log("Skill Delete Error: " . $e->getMessage());
            $this->errorResponse("Error deleting skill: " . $e->getMessage(), 500);
        }
    }
}
?>
