<?php
// User controller

class UserController extends BaseController {
    private $userModel;
    private $itemModel;
    private $resourceModel;
    private $equipmentModel;
    
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
     * Get user equipment
     */
    public function getUserEquipment($user_id) {
        if (!$user_id || !is_numeric($user_id)) {
            $this->errorResponse("Invalid user ID.");
        }
        try {
            if (!$this->equipmentModel) $this->equipmentModel = new Equipment($this->pdo);

            $equipment = $this->equipmentModel->getEquippedItems((int)$user_id);

            $this->jsonResponse(['equipment' => $equipment]);  // Cambiato da 'equipmentModel' a 'equipment'
        } catch (Exception $e) {
            error_log("Equipment Error: " . $e->getMessage());
            $this->errorResponse("Internal server error while retrieving equipment.", 500);
        }
    }

    /**
     * Get user inventory
     */
    public function getUserInventory($user_id) {
        if (!$user_id || !is_numeric($user_id)) {
            $this->errorResponse("Invalid user ID.");
        }
        try {
            if (!$this->itemModel) $this->itemModel = new Item($this->pdo);

            $inventory = $this->itemModel->getUserInventory((int)$user_id);

            $this->jsonResponse(['inventory' => $inventory]);
        } catch (Exception $e) {
            error_log("Inventory Error: " . $e->getMessage());
            $this->errorResponse("Internal server error while retrieving inventory.", 500);
        }
    }

    /**
     * Get user resources
     */
    public function getUserResources($user_id) {
        if (!$user_id || !is_numeric($user_id)) {
            $this->errorResponse("Invalid user ID.");
        }
        try {
            if (!$this->resourceModel) $this->resourceModel = new Resource($this->pdo);

            $resources = $this->resourceModel->getUserResources((int)$user_id);

            $this->jsonResponse(['resources' => $resources]);
        } catch (Exception $e) {
            error_log("Resources Error: " . $e->getMessage());
            $this->errorResponse("Internal server error while retrieving resources.", 500);
        }
    }

    /**
     * Equip an item
     */
    public function equipItem() {
        $data = $this->getJsonInput();
        $this->validateRequired($data, ['user_id', 'item_id']);

        try {
            if (!$this->equipmentModel) $this->equipmentModel = new Equipment($this->pdo);
            $item = $this->equipmentModel->equipItem((int)$data['user_id'], (int)$data['item_id']);
            $this->successResponse("Oggetto '{$item['name']}' equipaggiato con successo.");
        } catch (Exception $e) {
            error_log("Equipment Error: " . $e->getMessage());
            $this->errorResponse("Errore nell'equipaggiamento: " . $e->getMessage(), 500);
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
}
?>
