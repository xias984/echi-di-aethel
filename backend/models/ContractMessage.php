<?php
// ContractMessage model - Handles chat messages for contracts

class ContractMessage extends BaseModel {
    protected $table = 'contract_messages';
    
    protected function getPrimaryKey() {
        return 'message_id';
    }
    
    /**
     * Create a new message
     */
    public function createMessage($contract_id, $sender_id, $message_text) {
        return $this->insert([
            'contract_id' => $contract_id,
            'sender_id' => $sender_id,
            'message' => $message_text
        ]);
    }
    
    /**
     * Get messages for a contract, joining with user info
     */
    public function getMessagesByContractId($contract_id) {
        $stmt = $this->pdo->prepare("
            SELECT cm.message, cm.created_at, u.username AS sender_username, cm.sender_id
            FROM contract_messages cm
            JOIN users u ON cm.sender_id = u.user_id
            WHERE cm.contract_id = ?
            ORDER BY cm.created_at ASC
        ");
        $stmt->execute([$contract_id]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
?>