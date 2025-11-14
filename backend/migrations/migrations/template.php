<?php
// Template per nuove migrazioni
// Copia questo file e rinominalo seguendo il formato: NNN_description.php
// Esempio: 001_add_admin_column.php

/**
 * Classe di migrazione
 * Nome della classe deve seguire il formato: Migration_NNN_Description
 */
class Migration_NNN_Description {
    private $pdo;
    private $description = "Descrizione della migrazione";
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    /**
     * Esegue la migrazione
     */
    public function up() {
        // Esempio: Aggiungere una colonna
        // $this->addColumn('users', 'email', 'VARCHAR(255)');
        
        // Esempio: Creare una tabella
        // $this->createTable('products', '
        //     product_id SERIAL PRIMARY KEY,
        //     name VARCHAR(100) NOT NULL,
        //     price DECIMAL(10,2)
        // ');
        
        // Esempio: Inserire dati
        // $this->insertData('skills', [
        //     ['name' => 'Nuova Skill', 'base_class' => 'Classe']
        // ]);
        
        // Esempio: SQL raw
        // $this->pdo->exec("UPDATE users SET active = true");
    }
    
    /**
     * Metodo opzionale per rollback (non implementato di default)
     */
    public function down() {
        // Implementa il rollback se necessario
    }
    
    /**
     * Restituisce la descrizione della migrazione
     */
    public function getDescription() {
        return $this->description;
    }
    
    // Helper methods (copiati da MigrationManager per comodità)
    // Nota: Non possiamo usare parametri preparati nei blocchi DO $$, quindi usiamo concatenazione diretta
    
    private function addColumn($table, $column, $definition, $checkExists = true) {
        // Sanitizza i nomi per sicurezza
        $table = preg_replace('/[^a-z0-9_]/i', '', $table);
        $column = preg_replace('/[^a-z0-9_]/i', '', $column);
        
        if ($checkExists) {
            $sql = "
                DO \$\$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 
                        FROM information_schema.columns 
                        WHERE table_schema = 'public' 
                        AND table_name = '{$table}' 
                        AND column_name = '{$column}'
                    ) THEN
                        ALTER TABLE public.{$table} ADD COLUMN {$column} {$definition};
                    END IF;
                END \$\$;
            ";
            $this->pdo->exec($sql);
        } else {
            $this->pdo->exec("ALTER TABLE public.{$table} ADD COLUMN {$column} {$definition}");
        }
    }
    
    private function createTable($table, $definition, $checkExists = true) {
        // Sanitizza il nome della tabella per sicurezza
        $table = preg_replace('/[^a-z0-9_]/i', '', $table);
        
        if ($checkExists) {
            $sql = "
                DO \$\$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 
                        FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = '{$table}'
                    ) THEN
                        CREATE TABLE public.{$table} ({$definition});
                    END IF;
                END \$\$;
            ";
            $this->pdo->exec($sql);
        } else {
            $this->pdo->exec("CREATE TABLE public.{$table} ({$definition})");
        }
    }
    
    private function insertData($table, $data) {
        if (empty($data)) {
            return;
        }
        
        $columns = array_keys($data[0]);
        $placeholders = '(' . implode(', ', array_fill(0, count($columns), '?')) . ')';
        $allPlaceholders = implode(', ', array_fill(0, count($data), $placeholders));
        
        $sql = "INSERT INTO public.{$table} (" . implode(', ', $columns) . ") VALUES {$allPlaceholders}";
        
        $stmt = $this->pdo->prepare($sql);
        $values = [];
        foreach ($data as $row) {
            $values = array_merge($values, array_values($row));
        }
        
        $stmt->execute($values);
    }
}
?>

