<?php
// Migrazione: Aggiunge gerarchia skill e sistema di equipaggiamento

class Migration_002_AddSkillsHierarchyAndEquipment {
    private $pdo;
    private $description = "Aggiunge gerarchia skill (parent_skill_id) e sistema di equipaggiamento (items, user_equipment)";
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    public function up() {
        // 1. Aggiungi la colonna di gerarchia alla tabella skills
        // Nota: Se la migrazione 000 è già stata eseguita, questa colonna esiste già
        $this->addColumn('skills', 'parent_skill_id', 'INTEGER REFERENCES public.skills(skill_id) DEFAULT NULL', true);
        
        // 2. Crea la tabella items
        // Nota: Se la migrazione 000 è già stata eseguita, questa tabella esiste già
        $this->createTable('items', '
            item_id INTEGER GENERATED ALWAYS AS IDENTITY,
            name CHARACTER VARYING(100) NOT NULL,
            item_type CHARACTER VARYING(50) NOT NULL,
            required_skill_id INTEGER REFERENCES public.skills(skill_id) DEFAULT NULL,
            equipment_slot CHARACTER VARYING(50) DEFAULT NULL,
            bonus_crit_chance NUMERIC(5, 2) DEFAULT 0.00,
            owner_id INTEGER REFERENCES public.users(user_id) DEFAULT NULL,
            PRIMARY KEY (item_id)
        ', true);
        
        // 3. Crea la tabella user_equipment
        // Nota: Se la migrazione 000 è già stata eseguita, questa tabella esiste già
        $this->createTable('user_equipment', '
            user_id INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
            item_id INTEGER NOT NULL REFERENCES public.items(item_id) ON DELETE CASCADE,
            slot_type CHARACTER VARYING(50) NOT NULL,
            PRIMARY KEY (user_id, slot_type)
        ', true);
        
        // 4. Inserisce nuove skills (Taglialegna e Falegnameria)
        // Nota: Queste skills verranno inserite dalla migrazione 003_insert_initial_data
        // che gestisce tutti i dati iniziali in modo coordinato
        // Non inseriamo qui per evitare duplicati e dipendenze da dati esistenti
    }
    
    public function getDescription() {
        return $this->description;
    }
    
    // Helper methods
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
        
        // Verifica se i dati esistono già per evitare duplicati
        // Per semplicità, inseriamo direttamente (potresti voler aggiungere controlli)
        $columns = array_keys($data[0]);
        $placeholders = '(' . implode(', ', array_fill(0, count($columns), '?')) . ')';
        $allPlaceholders = implode(', ', array_fill(0, count($data), $placeholders));
        
        $sql = "INSERT INTO public.{$table} (" . implode(', ', $columns) . ") VALUES {$allPlaceholders}";
        
        $stmt = $this->pdo->prepare($sql);
        $values = [];
        foreach ($data as $row) {
            $values = array_merge($values, array_values($row));
        }
        
        try {
            $stmt->execute($values);
        } catch (PDOException $e) {
            // Se ci sono duplicati, ignora silenziosamente
            if (strpos($e->getMessage(), 'duplicate') === false && 
                strpos($e->getMessage(), 'unique') === false) {
                throw $e;
            }
        }
    }
}
?>

