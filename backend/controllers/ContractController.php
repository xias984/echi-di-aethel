<?php
// Contract controller

class ContractController extends BaseController {
    private $contractModel;
    private $itemModel;
    private $userModel;
    
    public function __construct($pdo) {
        parent::__construct($pdo);
        $this->contractModel = new Contract($pdo);
        $this->itemModel = new Item($pdo);
        $this->userModel = new User($pdo);
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

    /**
     * Deliver items and mark contract as COMPLETED (for resource delivery contracts)
     */
    public function deliverContract($contract_id) {
        $data = $this->getJsonInput();
        $this->validateRequired($data, ['executor_id', 'items_to_deliver']);

        $executor_id = (int)$data['executor_id'] ?? 0;
        $contract_id = (int)($contract_id ?? 0);
        $items_to_deliver = $data['items_to_deliver'] ?? []; // [{item_id: X, quantity: Y}]

        if (empty($items_to_deliver)) {
            $this->errorResponse("Devi specificare gli oggetti e la quantità da consegnare.");
        }

        try {
            $this->contractModel->beginTransaction();

            // 1. Verifica che il contratto sia ACCEPTED e l'utente sia l'esecutore
            $contract = $this->contractModel->findById($contract_id);
            if (!$contract || $contract['status'] !== 'ACCEPTED' || (int)$contract['accepted_by_id'] !== $executor_id) {
                throw new Exception("Non puoi consegnare questo oggetto. Il contratto non è stato accettato o non sei l'esecutore.");
            }

            // 2. Verifica che gli oggetti siano disponibili nell'inventario dell'esecutore
            foreach ($items_to_deliver as $item_data) {
                if (!$this->itemModel->checkItemQuantity($executor_id, $item_data['item_id'], $item_data['quantity'])) {
                    throw new Exception("Non hai abbastanza oggetti nell'inventario per consegnare.");
                }
            }

            // 3. Sposta gli oggetti dall'esecutore al proponente (transazione di consegna)
            $proposer_id = (int)$contract['proposer_id'];

            foreach ($items_to_deliver as $item) {
                // Sottrae dall'esecutore
                $this->itemModel->updateInventory($executor_id, $item['item_id'], -$item['quantity']);
                // Aggiunge al proponente
                $this->itemModel->updateInventory($proposer_id, $item['item_id'], $item['quantity']);
            }

            // 4. Aggiorna lo stato del contratto a COMPLETED
            $this->contractModel->updateContract($contract_id, [
                'status' => 'COMPLETED',
                'completed_at' => date('Y-m-d H:i:s')
            ]);

            $this->contractModel->commit();
            $this->successResponse("Oggetti consegnati con successo. Contratto completato.");
        } catch (Exception $e) {
            $this->contractModel->rollback();
            error_log("Delivery Error: " . $e->getMessage());
            $this->errorResponse("Errore durante la consegna: " . $e->getMessage(), 500);
        }
    }

    /**
     * Complete a service contract (mark as COMPLETED without item delivery)
     */
    public function completeContract($contract_id) {
        $data = $this->getJsonInput();
        $this->validateRequired($data, ['executor_id']);

        $executor_id = (int)($data['executor_id'] ?? 0);
        $contract_id = (int)($contract_id ?? 0);

        if (!$executor_id || !$contract_id) {
            $this->errorResponse("Executor ID and Contract ID are required.");
        }

        try {
            $this->contractModel->beginTransaction();

            // 1. Verifica che il contratto sia ACCEPTED e l'utente sia l'esecutore
            $contract = $this->contractModel->findById($contract_id);
            if (!$contract || $contract['status'] !== 'ACCEPTED' || (int)$contract['accepted_by_id'] !== $executor_id) {
                throw new Exception("Non puoi completare questo contratto. Il contratto non è stato accettato o non sei l'esecutore.");
            }

            // 2. Aggiorna lo stato del contratto a COMPLETED
            $this->contractModel->updateContract($contract_id, [
                'status' => 'COMPLETED',
                'completed_at' => date('Y-m-d H:i:s')
            ]);

            $this->contractModel->commit();
            $this->successResponse("Servizio completato con successo. Contratto completato.");
        } catch (Exception $e) {
            $this->contractModel->rollback();
            error_log("Complete Contract Error: " . $e->getMessage());
            $this->errorResponse("Errore durante il completamento: " . $e->getMessage(), 500);
        }
    }
}
?>
