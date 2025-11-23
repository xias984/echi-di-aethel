<?php
// Chat controller - Handles contract-specific private messages

class ChatController extends BaseController {
    private $chatModel;
    private $contractModel;
    
    public function __construct($pdo) {
        parent::__construct($pdo);
        // Assicurati che il modello Contract sia disponibile
        $this->chatModel = new ContractMessage($pdo);
        $this->contractModel = new Contract($pdo);
    }
    
    /**
     * Helper to validate contract access
     */
    private function checkAccess($contract_id, $user_id) {
        $contract = $this->contractModel->findById((int)$contract_id);
        
        if (!$contract) {
            $this->errorResponse("Contract not found.", 404);
        }
        
        // Solo il proponente (proposer_id) o l'accettatore (accepted_by_id) possono accedere alla chat
        $is_participant = (int)$contract['proposer_id'] === (int)$user_id || 
                          (int)$contract['accepted_by_id'] === (int)$user_id;
                          
        // La chat è disponibile solo per contratti ACCEPTED o COMPLETED
        $is_active = in_array($contract['status'], ['ACCEPTED', 'COMPLETED']);
        
        if (!$is_participant || !$is_active) {
            $this->errorResponse("Access denied or contract not active for chat.", 403);
        }
    }
    
    /**
     * Get all messages for a contract
     * Route: POST /api/chat/{id}/messages
     */
    public function getMessages($contract_id) {
        $data = $this->getJsonInput();
        $this->validateRequired($data, ['user_id']);
        
        $user_id = (int)($data['user_id'] ?? 0);
        $contract_id = (int)$contract_id;
        
        $this->checkAccess($contract_id, $user_id);
        
        try {
            $messages = $this->chatModel->getMessagesByContractId($contract_id);
            $this->jsonResponse(['messages' => $messages]);
        } catch (Exception $e) {
            error_log("Chat Get Error: " . $e->getMessage());
            $this->errorResponse("Error retrieving messages.", 500);
        }
    }
    
    /**
     * Send a message to a contract chat
     * Route: POST /api/chat/{id}
     */
    public function sendMessage($contract_id) {
        $data = $this->getJsonInput();
        $this->validateRequired($data, ['user_id', 'message']);
        
        $user_id = (int)($data['user_id'] ?? 0);
        $message_text = $data['message'] ?? '';
        $contract_id = (int)$contract_id;
        
        if (empty(trim($message_text))) {
            $this->errorResponse("Message cannot be empty.");
        }
        
        $this->checkAccess($contract_id, $user_id);
        
        try {
            $this->chatModel->createMessage($contract_id, $user_id, $message_text);
            $this->successResponse("Message sent successfully.");
        } catch (Exception $e) {
            error_log("Chat Send Error: " . $e->getMessage());
            $this->errorResponse("Error sending message: " . $e->getMessage(), 500);
        }
    }
}