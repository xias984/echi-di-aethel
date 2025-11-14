<?php
// Migration Manager - Sistema di gestione migrazioni database

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

class MigrationManager {
    private $pdo;
    private $migrationsPath;
    
    public function __construct() {
        $db = Database::getInstance();
        $this->pdo = $db->getConnection();
        $this->migrationsPath = __DIR__;
    }
    
    /**
     * Inizializza la tabella migrations se non esiste
     */
    public function initialize() {
        $sql = "
            CREATE TABLE IF NOT EXISTS public.migrations (
                migration_id SERIAL PRIMARY KEY,
                version VARCHAR(50) NOT NULL UNIQUE,
                description TEXT,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                execution_time_ms INTEGER
            );
        ";
        
        $this->pdo->exec($sql);
        echo "✓ Tabella migrations inizializzata\n";
    }
    
    /**
     * Ottiene tutte le migrazioni già eseguite
     */
    private function getExecutedMigrations() {
        $stmt = $this->pdo->query("SELECT version FROM public.migrations ORDER BY version");
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }
    
    /**
     * Trova tutti i file di migrazione disponibili
     */
    private function getAvailableMigrations() {
        $files = glob($this->migrationsPath . '/migrations/*.php');
        $migrations = [];
        
        foreach ($files as $file) {
            $basename = basename($file, '.php');
            // Estrae la versione dal nome file (es: 001_add_admin_column.php -> 001_add_admin_column)
            if (preg_match('/^(\d+_[a-z0-9_]+)$/i', $basename, $matches)) {
                $migrations[] = [
                    'version' => $matches[1],
                    'file' => $file
                ];
            }
        }
        
        // Ordina per versione
        usort($migrations, function($a, $b) {
            return strcmp($a['version'], $b['version']);
        });
        
        return $migrations;
    }
    
    /**
     * Esegue tutte le migrazioni pendenti
     */
    public function migrate($dryRun = false) {
        $this->initialize();
        
        $executed = $this->getExecutedMigrations();
        $available = $this->getAvailableMigrations();
        
        $pending = array_filter($available, function($migration) use ($executed) {
            return !in_array($migration['version'], $executed);
        });
        
        if (empty($pending)) {
            echo "✓ Nessuna migrazione pendente\n";
            return;
        }
        
        echo "Trovate " . count($pending) . " migrazione/i pendente/i:\n\n";
        
        foreach ($pending as $migration) {
            echo "→ Eseguendo: {$migration['version']}\n";
            
            if ($dryRun) {
                echo "  [DRY RUN] Migrazione non eseguita\n\n";
                continue;
            }
            
            $startTime = microtime(true);
            
            try {
                $this->pdo->beginTransaction();
                
                // Carica ed esegue la migrazione
                require_once $migration['file'];
                
                // La migrazione deve definire una classe con il nome della versione
                $className = $this->getClassNameFromVersion($migration['version']);
                
                if (!class_exists($className)) {
                    throw new Exception("Classe {$className} non trovata nel file di migrazione");
                }
                
                $migrationInstance = new $className($this->pdo);
                
                if (!method_exists($migrationInstance, 'up')) {
                    throw new Exception("Metodo 'up' non trovato nella classe {$className}");
                }
                
                // Esegue la migrazione
                $migrationInstance->up();
                
                // Registra la migrazione
                $executionTime = round((microtime(true) - $startTime) * 1000);
                $description = $migrationInstance->getDescription() ?? '';
                
                $stmt = $this->pdo->prepare("
                    INSERT INTO public.migrations (version, description, execution_time_ms)
                    VALUES (:version, :description, :execution_time)
                ");
                $stmt->execute([
                    ':version' => $migration['version'],
                    ':description' => $description,
                    ':execution_time' => $executionTime
                ]);
                
                $this->pdo->commit();
                
                echo "  ✓ Completata in {$executionTime}ms\n\n";
                
            } catch (Exception $e) {
                $this->pdo->rollBack();
                echo "  ✗ ERRORE: " . $e->getMessage() . "\n\n";
                throw $e;
            }
        }
        
        echo "✓ Tutte le migrazioni completate\n";
    }
    
    /**
     * Converte il nome versione in nome classe
     */
    private function getClassNameFromVersion($version) {
        // Es: 001_add_admin_column -> Migration_001_AddAdminColumn
        $parts = explode('_', $version);
        $number = array_shift($parts);
        $name = implode('', array_map('ucfirst', $parts));
        return "Migration_{$number}_{$name}";
    }
    
    /**
     * Mostra lo stato delle migrazioni
     */
    public function status() {
        $this->initialize();
        
        $executed = $this->getExecutedMigrations();
        $available = $this->getAvailableMigrations();
        
        echo "Stato Migrazioni:\n";
        echo str_repeat("=", 60) . "\n\n";
        
        foreach ($available as $migration) {
            $status = in_array($migration['version'], $executed) ? "✓ Eseguita" : "○ Pendente";
            echo sprintf("%-40s %s\n", $migration['version'], $status);
        }
        
        echo "\n" . str_repeat("=", 60) . "\n";
        echo "Totale: " . count($available) . " migrazioni\n";
        echo "Eseguite: " . count($executed) . "\n";
        echo "Pendenti: " . (count($available) - count($executed)) . "\n";
    }
    
    /**
     * Helper: Aggiunge una colonna a una tabella (safe)
     * Nota: Non possiamo usare parametri preparati nei blocchi DO $$, quindi usiamo concatenazione diretta
     */
    public function addColumn($table, $column, $definition, $checkExists = true) {
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
    
    /**
     * Helper: Crea una tabella (safe)
     * Nota: Non possiamo usare parametri preparati nei blocchi DO $$, quindi usiamo concatenazione diretta
     */
    public function createTable($table, $definition, $checkExists = true) {
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
    
    /**
     * Helper: Inserisce dati in una tabella
     */
    public function insertData($table, $data) {
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
    
    /**
     * Helper: Esegue SQL raw
     */
    public function executeSql($sql) {
        $this->pdo->exec($sql);
    }
    
    /**
     * Resetta il database eliminando tutte le tabelle e rieseguendo le migrazioni
     * ATTENZIONE: Questa operazione è distruttiva e cancella tutti i dati!
     */
    public function reset($confirm = false) {
        if (!$confirm) {
            throw new Exception("Reset richiede conferma. Usa --confirm per procedere.");
        }
        
        echo "⚠️  ATTENZIONE: Stai per resettare completamente il database!\n";
        echo "Tutte le tabelle e i dati verranno eliminati.\n\n";
        
        try {
            $this->pdo->beginTransaction();
            
            // Disabilita temporaneamente i check delle foreign key
            $this->pdo->exec("SET session_replication_role = 'replica'");
            
            // Elenco delle tabelle in ordine inverso (per rispettare le foreign key)
            $tables = [
                'user_equipment',
                'user_resources',
                'user_traits',
                'user_skills',
                'transactions',
                'items',
                'contracts',
                'resources',
                'traits',
                'skills',
                'users',
                'migrations'  // Elimina anche la tabella migrations
            ];
            
            echo "Eliminazione tabelle...\n";
            foreach ($tables as $table) {
                $sql = "DROP TABLE IF EXISTS public.{$table} CASCADE";
                $this->pdo->exec($sql);
                echo "  ✓ Eliminata tabella: {$table}\n";
            }
            
            // Elimina anche le sequenze rimanenti
            echo "\nEliminazione sequenze...\n";
            $stmt = $this->pdo->query("
                SELECT sequence_name 
                FROM information_schema.sequences 
                WHERE sequence_schema = 'public'
            ");
            $sequences = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            foreach ($sequences as $sequence) {
                $this->pdo->exec("DROP SEQUENCE IF EXISTS public.{$sequence} CASCADE");
                echo "  ✓ Eliminata sequenza: {$sequence}\n";
            }
            
            // Riabilita i check delle foreign key
            $this->pdo->exec("SET session_replication_role = 'origin'");
            
            $this->pdo->commit();
            
            echo "\n✓ Database resettato con successo\n";
            echo "\nEsecuzione migrazioni...\n\n";
            
            // Riesegue tutte le migrazioni
            $this->migrate(false);
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}
?>

