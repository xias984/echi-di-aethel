<?php
// Configuration file for the MVC application

// Database configuration
define('DB_HOST', 'db');
define('DB_NAME', 'db_aethel');
define('DB_USER', 'user_aethel');
define('DB_PASS', 'password_sicura');

// Application configuration
define('APP_ROOT', dirname(__DIR__));
define('MODELS_PATH', APP_ROOT . '/models');
define('CONTROLLERS_PATH', APP_ROOT . '/controllers');
define('VIEWS_PATH', APP_ROOT . '/views');

// API configuration
define('API_VERSION', 'v1');
define('CORS_ORIGIN', '*');
define('CORS_METHODS', 'GET, POST, OPTIONS');
define('CORS_HEADERS', 'Content-Type');

// Game configuration
define('INITIAL_XP_BONUS', 1500);
define('BASE_XP_GAIN', 50);
define('MAX_LEVEL', 1000);
define('INITIAL_BONUS_SKILLS', 3);
?>
