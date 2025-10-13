<?php
// User controller

class UserController extends BaseController {
    private $userModel;
    
    public function __construct($pdo) {
        parent::__construct($pdo);
        $this->userModel = new User($pdo);
    }
    
    /**
     * Create a new user
     */
    public function createUser() {
        $data = $this->getJsonInput();
        $this->validateRequired($data, ['username']);
        
        try {
            $user_id = $this->userModel->createUser($data['username']);
            $this->successResponse(
                "Character {$data['username']} created successfully! Hidden talents are active.",
                ['user_id' => $user_id],
                201
            );
        } catch (PDOException $e) {
            $this->handleDbException($e);
        } catch (Exception $e) {
            error_log("User Creation Error: " . $e->getMessage());
            $this->errorResponse("Error creating character: " . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get user profile
     */
    public function getUserProfile($user_id) {
        if (!$user_id || !is_numeric($user_id)) {
            $this->errorResponse("Invalid user ID.");
        }
        try {
            $profile = $this->userModel->getUserProfile((int)$user_id);
            
            if (!$profile) {
                $this->errorResponse("Character not found.", 404);
            }
            
            $this->jsonResponse($profile);
        } catch (Exception $e) {
            error_log("Profile Error: " . $e->getMessage());
            $this->errorResponse("Internal server error while retrieving profile.", 500);
        }
    }
}
?>
