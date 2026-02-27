<?php
// Skill controller - Handles skill management

class SkillController extends BaseController {
    private $skillModel;
    
    public function __construct($pdo) {
        parent::__construct($pdo);
        $this->skillModel = new Skill($pdo);
    }
    
    /**
     * Get all skills in hierarchy (Accessible to anyone for displaying game info)
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
     * Create a new skill (Admin only - must be implemented outside this block by calling checkAdmin)
     */
    public function createSkill() {
        $data = $this->getJsonInput();
        $this->validateRequired($data, ['admin_id', 'name', 'base_class', 'description']);
        
        // Simulate Admin check (to be implemented)
        // if (!$this->checkAdmin($data['admin_id'])) { ... }
        
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
     * Update a skill (Admin only)
     */
    public function updateSkill($skill_id) {
        $data = $this->getJsonInput();
        $this->validateRequired($data, ['admin_id']);
        
        // Simulate Admin check
        
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
     * Delete a skill (Admin only)
     */
    public function deleteSkill($skill_id) {
        $data = $this->getJsonInput();
        
        // Per richieste DELETE che potrebbero non avere body JSON, controlliamo il parametro admin_id
        $admin_id = isset($data['admin_id']) ? (int)$data['admin_id'] : (int)($_REQUEST['admin_id'] ?? 0);
        
        if (!$admin_id) {
            $this->errorResponse("Admin ID is required.", 403);
        }
        
        // Simulate Admin check
        
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