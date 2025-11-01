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

    /**
     * Login user by username
     */
    public function loginUser() {
        $data = $this->getJsonInput();
        $this->validateRequired($data, ['username']);
        
        try {
            $user = $this->userModel->findByUsername($data['username']);
            
            if (!$user) {
                $this->errorResponse("Character not found. Please check the username.", 404);
            }
            
            $is_admin = isset($user['admin']) ? (bool)$user['admin'] : false;
            $this->successResponse(
                "Welcome back, {$user['username']}!",
                [
                    'user_id' => $user['user_id'], 
                    'username' => $user['username'],
                    'admin' => $is_admin
                ],
                200
            );
        } catch (Exception $e) {
            error_log("Login Error: " . $e->getMessage());
            $this->errorResponse("Error during login: " . $e->getMessage(), 500);
        }
    }

    /**
     * List all users
     */
    public function getUsers() {
        try {
            $users = $this->userModel->getAllUsers();
            $this->successResponse("Users retrieved successfully.", $users);
        } catch (Exception $e) {
            error_log("Users Error: " . $e->getMessage());
            $this->errorResponse("Error retrieving users: " . $e->getMessage(), 500);
        }
    }

    /**
     * Delete a user
     */
    public function deleteUser($user_id) {
        try {
            $this->userModel->deleteUser((int)$user_id);
            $this->successResponse("User deleted successfully.");
        } catch (PDOException $e) {
            $this->handleDbException($e);
        } catch (Exception $e) {
            error_log("Delete User Error: " . $e->getMessage());
            $this->errorResponse("Error deleting user: " . $e->getMessage(), 500);
        }
    }
}
?>
