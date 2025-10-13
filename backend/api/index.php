<?php
// Refactored API entry point using MVC pattern

// Load autoloader and configuration first
require_once '../config/autoloader.php';

// Set headers
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: " . CORS_ORIGIN);
header("Access-Control-Allow-Methods: " . CORS_METHODS);
header("Access-Control-Allow-Headers: " . CORS_HEADERS);

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    // Get database connection
    $db = Database::getInstance();
    $pdo = $db->getConnection();
    
    // Get request method and path
    $method = $_SERVER['REQUEST_METHOD'];
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    
    // Create router and route the request
    $router = new Router($pdo);
    $router->route($method, $path);
    
    } catch (Exception $e) {
    error_log("Application Error: " . $e->getMessage());
        http_response_code(500);
    echo json_encode(['error' => 'Internal server error.']);
}
?>