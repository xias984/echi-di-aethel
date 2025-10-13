<?php
// Base controller class

class BaseController {
    protected $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    /**
     * Send JSON response
     */
    protected function jsonResponse($data, $status_code = 200) {
        http_response_code($status_code);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }
    
    /**
     * Send error response
     */
    protected function errorResponse($message, $status_code = 400) {
        $this->jsonResponse(['error' => $message], $status_code);
    }
    
    /**
     * Send success response
     */
    protected function successResponse($message, $data = null, $status_code = 200) {
        $response = ['message' => $message];
        if ($data !== null) {
            $response = array_merge($response, $data);
        }
        $this->jsonResponse($response, $status_code);
    }
    
    /**
     * Get JSON input data
     */
    protected function getJsonInput() {
        $input = file_get_contents("php://input");
        return json_decode($input, true);
    }
    
    /**
     * Validate required fields
     */
    protected function validateRequired($data, $required_fields) {
        foreach ($required_fields as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                $this->errorResponse("Field '{$field}' is required.");
            }
        }
    }
    
    /**
     * Handle database exceptions
     */
    protected function handleDbException($e) {
        error_log("Database Error: " . $e->getMessage());
        
        if ($e->getCode() == '23505') {
            $this->errorResponse("Username already in use.", 409);
        } else {
            $this->errorResponse("Database error: " . $e->getMessage(), 500);
        }
    }
}
?>
