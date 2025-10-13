<?php
// Base model class with common database operations

class BaseModel {
    protected $pdo;
    protected $table;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    /**
     * Find a record by ID
     */
    public function findById($id) {
        $stmt = $this->pdo->prepare("SELECT * FROM {$this->table} WHERE {$this->getPrimaryKey()} = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * Find all records
     */
    public function findAll($conditions = [], $params = []) {
        $sql = "SELECT * FROM {$this->table}";
        
        if (!empty($conditions)) {
            $sql .= " WHERE " . implode(" AND ", $conditions);
        }
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Insert a new record
     */
    public function insert($data) {
        $columns = implode(', ', array_keys($data));
        $placeholders = ':' . implode(', :', array_keys($data));
        
        $sql = "INSERT INTO {$this->table} ({$columns}) VALUES ({$placeholders})";
        $stmt = $this->pdo->prepare($sql);
        
        foreach ($data as $key => $value) {
            $stmt->bindValue(":{$key}", $value);
        }
        
        $stmt->execute();
        return $this->pdo->lastInsertId();
    }
    
    /**
     * Update a record
     */
    public function update($id, $data) {
        $setParts = [];
        foreach (array_keys($data) as $key) {
            $setParts[] = "{$key} = :{$key}";
        }
        
        $sql = "UPDATE {$this->table} SET " . implode(', ', $setParts) . " WHERE {$this->getPrimaryKey()} = :id";
        $stmt = $this->pdo->prepare($sql);
        
        foreach ($data as $key => $value) {
            $stmt->bindValue(":{$key}", $value);
        }
        $stmt->bindValue(':id', $id);
        
        return $stmt->execute();
    }
    
    /**
     * Delete a record
     */
    public function delete($id) {
        $stmt = $this->pdo->prepare("DELETE FROM {$this->table} WHERE {$this->getPrimaryKey()} = ?");
        return $stmt->execute([$id]);
    }
    
    /**
     * Get the primary key column name
     * Override in child classes
     */
    protected function getPrimaryKey() {
        return 'id';
    }
    
    /**
     * Begin transaction
     */
    public function beginTransaction() {
        return $this->pdo->beginTransaction();
    }
    
    /**
     * Commit transaction
     */
    public function commit() {
        return $this->pdo->commit();
    }
    
    /**
     * Rollback transaction
     */
    public function rollback() {
        return $this->pdo->rollback();
    }
}
?>
