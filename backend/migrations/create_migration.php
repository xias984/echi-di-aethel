#!/usr/bin/env php
<?php
// Script helper per creare nuove migrazioni

if ($argc < 2) {
    echo "Uso: php create_migration.php <descrizione>\n";
    echo "\nEsempio:\n";
    echo "  php create_migration.php add_email_column\n";
    echo "  php create_migration.php create_products_table\n";
    echo "  php create_migration.php insert_initial_data\n";
    exit(1);
}

$description = $argv[1];
$migrationsDir = __DIR__ . '/migrations';

// Trova il prossimo numero di migrazione
$files = glob($migrationsDir . '/*.php');
$maxNumber = 0;

foreach ($files as $file) {
    $basename = basename($file, '.php');
    if (preg_match('/^(\d+)_/', $basename, $matches)) {
        $number = (int)$matches[1];
        if ($number > $maxNumber) {
            $maxNumber = $number;
        }
    }
}

$nextNumber = str_pad($maxNumber + 1, 3, '0', STR_PAD_LEFT);
$filename = "{$nextNumber}_{$description}.php";

// Genera il nome della classe
$classNameParts = explode('_', $description);
$classNameParts = array_map('ucfirst', $classNameParts);
$className = "Migration_{$nextNumber}_" . implode('', $classNameParts);

// Crea il contenuto del file
$template = <<<PHP
<?php
// Migrazione: {$description}

class {$className} {
    private \$pdo;
    private \$description = "Descrizione della migrazione: {$description}";
    
    public function __construct(\$pdo) {
        \$this->pdo = \$pdo;
    }
    
    public function up() {
        // TODO: Implementa la migrazione qui
        
        // Esempi:
        // \$this->addColumn('users', 'email', 'VARCHAR(255)');
        // \$this->createTable('products', 'product_id SERIAL PRIMARY KEY, name VARCHAR(100)');
        // \$this->insertData('skills', [['name' => 'Nuova Skill', 'base_class' => 'Classe']]);
        // \$this->pdo->exec("UPDATE users SET active = true");
    }
    
    public function getDescription() {
        return \$this->description;
    }
    
    // Helper methods
    // Nota: Non possiamo usare parametri preparati nei blocchi DO $$, quindi usiamo concatenazione diretta
    private function addColumn(\$table, \$column, \$definition, \$checkExists = true) {
        // Sanitizza i nomi per sicurezza
        \$table = preg_replace('/[^a-z0-9_]/i', '', \$table);
        \$column = preg_replace('/[^a-z0-9_]/i', '', \$column);
        
        if (\$checkExists) {
            \$sql = "
                DO \\\$\\\$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 
                        FROM information_schema.columns 
                        WHERE table_schema = 'public' 
                        AND table_name = '{\$table}' 
                        AND column_name = '{\$column}'
                    ) THEN
                        ALTER TABLE public.{\$table} ADD COLUMN {\$column} {\$definition};
                    END IF;
                END \\\$\\\$;
            ";
            \$this->pdo->exec(\$sql);
        } else {
            \$this->pdo->exec("ALTER TABLE public.{\$table} ADD COLUMN {\$column} {\$definition}");
        }
    }
    
    private function createTable(\$table, \$definition, \$checkExists = true) {
        // Sanitizza il nome della tabella per sicurezza
        \$table = preg_replace('/[^a-z0-9_]/i', '', \$table);
        
        if (\$checkExists) {
            \$sql = "
                DO \\\$\\\$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 
                        FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = '{\$table}'
                    ) THEN
                        CREATE TABLE public.{\$table} ({\$definition});
                    END IF;
                END \\\$\\\$;
            ";
            \$this->pdo->exec(\$sql);
        } else {
            \$this->pdo->exec("CREATE TABLE public.{\$table} ({\$definition})");
        }
    }
    
    private function insertData(\$table, \$data) {
        if (empty(\$data)) {
            return;
        }
        
        \$columns = array_keys(\$data[0]);
        \$placeholders = '(' . implode(', ', array_fill(0, count(\$columns), '?')) . ')';
        \$allPlaceholders = implode(', ', array_fill(0, count(\$data), \$placeholders));
        
        \$sql = "INSERT INTO public.{\$table} (" . implode(', ', \$columns) . ") VALUES {\$allPlaceholders}";
        
        \$stmt = \$this->pdo->prepare(\$sql);
        \$values = [];
        foreach (\$data as \$row) {
            \$values = array_merge(\$values, array_values(\$row));
        }
        
        try {
            \$stmt->execute(\$values);
        } catch (PDOException \$e) {
            // Se ci sono duplicati, ignora silenziosamente
            if (strpos(\$e->getMessage(), 'duplicate') === false && 
                strpos(\$e->getMessage(), 'unique') === false) {
                throw \$e;
            }
        }
    }
}
?>

PHP;

$filepath = $migrationsDir . '/' . $filename;
file_put_contents($filepath, $template);

echo "✓ Migrazione creata: {$filename}\n";
echo "  Percorso: {$filepath}\n";
echo "\nProssimi passi:\n";
echo "  1. Modifica il file e implementa il metodo up()\n";
echo "  2. Aggiorna la descrizione se necessario\n";
echo "  3. Esegui: php migrate.php migrate\n";
?>

