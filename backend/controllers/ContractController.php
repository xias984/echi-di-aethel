<?php
// Contract controller

class ContractController extends BaseController {
    private $contractModel;
    
    public function __construct($pdo) {
        parent::__construct($pdo);
        $this->contractModel = new Contract($pdo);
    }
    
    /**
     * Create a new contract
     */
    public function createContract() {
        $data = $this->getJsonInput();
        $this->validateRequired($data, ['proposer_id', 'title', 'required_skill_name', 'reward_amount']);
        
        $proposer_id = (int)($data['proposer_id'] ?? 0);
        $title = $data['title'] ?? null;
        $required_skill_name = $data['required_skill_name'] ?? null;
        $required_level = (int)($data['required_level'] ?? 1);
        $reward_amount = (int)($data['reward_amount'] ?? 0);
        
        if (!$proposer_id || !$title || !$required_skill_name || $reward_amount <= 0) {
            $this->errorResponse("Incomplete contract data or invalid reward amount.");
        }
        
        try {
            $contract_id = $this->contractModel->createContract(
                $proposer_id, 
                $title, 
                $required_skill_name, 
                $required_level, 
                $reward_amount
            );
            
            $this->successResponse(
                "Contract published and reward locked (Escrow).",
                ['contract_id' => $contract_id],
                201
            );
        } catch (Exception $e) {
            error_log("Contract Creation Error: " . $e->getMessage());
            $this->errorResponse("Database error during contract creation: " . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get available contracts for a user
     */
    public function getAvailableContracts($user_id) {
        $user_id = (int)($user_id ?? 0);
        
        try {
            $contracts = $this->contractModel->getAvailableContracts($user_id);
            $this->jsonResponse($contracts);
        } catch (Exception $e) {
            error_log("Contract List Error: " . $e->getMessage());
            $this->errorResponse("Error retrieving contract board.", 500);
        }
    }
    
    /**
     * Accept a contract
     */
    public function acceptContract($contract_id) {
        $data = $this->getJsonInput();
        $this->validateRequired($data, ['acceptor_id']);
        
        $acceptor_id = (int)($data['acceptor_id'] ?? 0);
        $contract_id = (int)($contract_id ?? 0);
        
        if (!$acceptor_id || !$contract_id) {
            $this->errorResponse("Acceptor ID and Contract ID are required.");
        }
        
        try {
            $this->contractModel->acceptContract($contract_id, $acceptor_id);
            $this->successResponse("Contract accepted successfully! Start your work.");
        } catch (Exception $e) {
            error_log("Accept Contract Error: " . $e->getMessage());
            
            if (strpos($e->getMessage(), 'not available') !== false) {
                $this->errorResponse("Contract not available.", 409);
            } else {
                $this->errorResponse("Error accepting contract: " . $e->getMessage(), 500);
            }
        }
    }

    public function getContracts() {
        try {
            $contracts = $this->contractModel->getContracts();
            $this->successResponse("Contracts retrieved successfully.", $contracts);
        } catch (Exception $e) {
            error_log("Get Contracts Error: " . $e->getMessage());
            $this->errorResponse("Error retrieving contracts: " . $e->getMessage(), 500);
        }
    }

    public function deleteContract($contract_id) {
        try {
            $this->contractModel->deleteContract($contract_id);
            $this->successResponse("Contract deleted successfully.");
        } catch (Exception $e) {
            error_log("Delete Contract Error: " . $e->getMessage());
            $this->errorResponse("Error deleting contract: " . $e->getMessage(), 500);
        }
    }
}
?>
