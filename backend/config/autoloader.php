<?php
// Simple autoloader for the MVC application

// Load configuration first
require_once __DIR__ . '/config.php';

spl_autoload_register(function ($class) {
    $class = str_replace('\\', '/', $class);
    
    // Try models first
    $modelPath = MODELS_PATH . '/' . $class . '.php';
    if (file_exists($modelPath)) {
        require_once $modelPath;
        return;
    }
    
    // Try controllers
    $controllerPath = CONTROLLERS_PATH . '/' . $class . '.php';
    if (file_exists($controllerPath)) {
        require_once $controllerPath;
        return;
    }
    
    // Try config
    $configPath = APP_ROOT . '/config/' . $class . '.php';
    if (file_exists($configPath)) {
        require_once $configPath;
        return;
    }
});
?>
