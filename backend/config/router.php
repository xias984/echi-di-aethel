<?php
// Simple router for API endpoints

class Router {
    private $routes = [];
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->setupRoutes();
    }
    
    /**
     * Setup all routes
     */
    private function setupRoutes() {
        // User routes
        $this->routes['POST']['/api/user'] = ['UserController', 'createUser'];
        $this->routes['POST']['/api/user/login'] = ['UserController', 'loginUser'];
        $this->routes['GET']['/api/user/{id}/profile'] = ['UserController', 'getUserProfile'];
        $this->routes['GET']['/api/users'] = ['UserController', 'getUsers'];
        $this->routes['DELETE']['/api/user/{id}'] = ['UserController', 'deleteUser'];
        
        // Action routes
        $this->routes['POST']['/api/action/use'] = ['ActionController', 'useSkill'];
        
        // Contract routes
        $this->routes['POST']['/api/contracts'] = ['ContractController', 'createContract'];
        $this->routes['GET']['/api/contracts/{id}'] = ['ContractController', 'getAvailableContracts'];
        $this->routes['POST']['/api/contracts/{id}/accept'] = ['ContractController', 'acceptContract'];
    }
    
    /**
     * Route the request
     */
    public function route($method, $path) {
        // Remove query string
        $path = strtok($path, '?');
        
        // Try exact match first
        if (isset($this->routes[$method][$path])) {
            return $this->executeRoute($this->routes[$method][$path], []);
        }
        
        // Try pattern matching
        foreach ($this->routes[$method] as $pattern => $handler) {
            $params = $this->matchPattern($pattern, $path);
            if ($params !== false) {
                return $this->executeRoute($handler, $params);
            }
        }
        
        // No route found
        $this->send404();
    }
    
    /**
     * Match URL pattern with parameters
     */
    private function matchPattern($pattern, $path) {
        // Convert pattern to regex
        $regex = preg_replace('/\{([^}]+)\}/', '([^/]+)', $pattern);
        $regex = '#^' . $regex . '$#';
        
        if (preg_match($regex, $path, $matches)) {
            // Extract parameter names from pattern
            preg_match_all('/\{([^}]+)\}/', $pattern, $paramNames);
            $params = [];
            for ($i = 1; $i < count($matches); $i++) {
                $paramName = $paramNames[1][$i - 1];
                $params[$paramName] = $matches[$i];
            }
            
            return $params;
        }
        
        return false;
    }
    
    /**
     * Execute the route handler
     */
    private function executeRoute($handler, $params) {
        list($controllerName, $methodName) = $handler;
        
        // Create controller instance
        $controller = new $controllerName($this->pdo);
        
        // Call the method
        if (method_exists($controller, $methodName)) {
            // Convert associative array to indexed array for call_user_func_array
            $indexedParams = array_values($params);
            call_user_func_array([$controller, $methodName], $indexedParams);
        } else {
            $this->send404();
        }
    }
    
    /**
     * Send 404 response
     */
    private function send404() {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Endpoint not found.']);
        exit;
    }
}
?>
