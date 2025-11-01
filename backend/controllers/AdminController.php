<?php
// Admin controller - Only accessible to admin users

class AdminController extends BaseController {
    private $userModel;
    private $contractModel;
    
    public function __construct($pdo) {
        parent::__construct($pdo);
        $this->userModel = new User($pdo);
        $this->contractModel = new Contract($pdo);
    }
    
    /**
     * Check if current user is admin
     */
    private function checkAdmin($user_id) {
        if (!$user_id || !$this->userModel->isAdmin($user_id)) {
            $this->errorResponse("Access denied. Admin privileges required.", 403);
        }
    }
    
    /**
     * Get all users with full profiles (admin only)
     */
    public function getAllUsers() {
        $data = $this->getJsonInput();
        $admin_id = isset($data['admin_id']) ? (int)$data['admin_id'] : 0;
        
        $this->checkAdmin($admin_id);
        
        try {
            $users = $this->userModel->getAllUsersWithProfiles();
            $this->jsonResponse(['users' => $users]);
        } catch (Exception $e) {
            error_log("Admin Get Users Error: " . $e->getMessage());
            $this->errorResponse("Error retrieving users: " . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get all contracts with details (admin only)
     */
    public function getAllContracts() {
        $data = $this->getJsonInput();
        $admin_id = isset($data['admin_id']) ? (int)$data['admin_id'] : 0;
        
        $this->checkAdmin($admin_id);
        
        try {
            $contracts = $this->contractModel->getAllContractsWithDetails();
            $this->jsonResponse(['contracts' => $contracts]);
        } catch (Exception $e) {
            error_log("Admin Get Contracts Error: " . $e->getMessage());
            $this->errorResponse("Error retrieving contracts: " . $e->getMessage(), 500);
        }
    }
    
    /**
     * Update a user (admin only)
     */
    public function updateUser($user_id) {
        $data = $this->getJsonInput();
        $admin_id = isset($data['admin_id']) ? (int)$data['admin_id'] : 0;
        
        $this->checkAdmin($admin_id);
        
        $user_id = (int)$user_id;
        if (!$user_id) {
            $this->errorResponse("Invalid user ID.");
        }
        
        try {
            // Remove admin_id from update data
            unset($data['admin_id']);
            
            $result = $this->userModel->updateUser($user_id, $data);
            if ($result) {
                $this->successResponse("User updated successfully.");
            } else {
                $this->errorResponse("No valid fields to update.");
            }
        } catch (PDOException $e) {
            $this->handleDbException($e);
        } catch (Exception $e) {
            error_log("Admin Update User Error: " . $e->getMessage());
            $this->errorResponse("Error updating user: " . $e->getMessage(), 500);
        }
    }
    
    /**
     * Delete a user (admin only)
     */
    public function deleteUser($user_id) {
        // For DELETE requests, try to get JSON input, but it might be empty
        $input = file_get_contents("php://input");
        $data = $input ? json_decode($input, true) : [];
        
        // Also check if admin_id is passed as query parameter
        if (empty($data) || !isset($data['admin_id'])) {
            $data = $_REQUEST;
        }
        
        $admin_id = isset($data['admin_id']) ? (int)$data['admin_id'] : 0;
        
        $this->checkAdmin($admin_id);
        
        $user_id = (int)$user_id;
        if (!$user_id) {
            $this->errorResponse("Invalid user ID.");
        }
        
        // Prevent self-deletion
        if ($user_id == $admin_id) {
            $this->errorResponse("You cannot delete your own account.");
        }
        
        try {
            $this->userModel->deleteUser($user_id);
            $this->successResponse("User deleted successfully.");
        } catch (PDOException $e) {
            $this->handleDbException($e);
        } catch (Exception $e) {
            error_log("Admin Delete User Error: " . $e->getMessage());
            $this->errorResponse("Error deleting user: " . $e->getMessage(), 500);
        }
    }
    
    /**
     * Update a contract (admin only)
     */
    public function updateContract($contract_id) {
        $data = $this->getJsonInput();
        $admin_id = isset($data['admin_id']) ? (int)$data['admin_id'] : 0;
        
        $this->checkAdmin($admin_id);
        
        $contract_id = (int)$contract_id;
        if (!$contract_id) {
            $this->errorResponse("Invalid contract ID.");
        }
        
        try {
            // Remove admin_id from update data
            unset($data['admin_id']);
            
            $result = $this->contractModel->updateContract($contract_id, $data);
            if ($result) {
                $this->successResponse("Contract updated successfully.");
            } else {
                $this->errorResponse("No valid fields to update.");
            }
        } catch (PDOException $e) {
            $this->handleDbException($e);
        } catch (Exception $e) {
            error_log("Admin Update Contract Error: " . $e->getMessage());
            $this->errorResponse("Error updating contract: " . $e->getMessage(), 500);
        }
    }
    
    /**
     * Delete a contract (admin only)
     */
    public function deleteContract($contract_id) {
        // For DELETE requests, try to get JSON input, but it might be empty
        $input = file_get_contents("php://input");
        $data = $input ? json_decode($input, true) : [];
        
        // Also check if admin_id is passed as query parameter
        if (empty($data) || !isset($data['admin_id'])) {
            $data = $_REQUEST;
        }
        
        $admin_id = isset($data['admin_id']) ? (int)$data['admin_id'] : 0;
        
        $this->checkAdmin($admin_id);
        
        $contract_id = (int)$contract_id;
        if (!$contract_id) {
            $this->errorResponse("Invalid contract ID.");
        }
        
        try {
            $this->contractModel->deleteContract($contract_id);
            $this->successResponse("Contract deleted successfully.");
        } catch (PDOException $e) {
            $this->handleDbException($e);
        } catch (Exception $e) {
            error_log("Admin Delete Contract Error: " . $e->getMessage());
            $this->errorResponse("Error deleting contract: " . $e->getMessage(), 500);
        }
    }
}

