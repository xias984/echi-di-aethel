<?php
// Database connection class

class Database {
    private static $instance = null;
    private $pdo;
    
    private function __construct() {
        $host = DB_HOST;
        $db = DB_NAME;
        $user = DB_USER;
        $password = DB_PASS;
        
        $dsn = "pgsql:host=$host;dbname=$db";
        
        try {
            $this->pdo = new PDO($dsn, $user, $password);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch (PDOException $e) {
            error_log("Database Connection Error: " . $e->getMessage());
            throw new Exception("Database Connection Error: " . $e->getMessage());
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->pdo;
    }
}
?>
