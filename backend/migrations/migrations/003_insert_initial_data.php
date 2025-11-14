<?php
// Migrazione: Inserisce i dati iniziali (skills, traits, resources)

class Migration_003_InsertInitialData {
    private $pdo;
    private $description = "Inserisce i dati iniziali: skills base, traits e resources";
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    public function up() {
        // Inserisce skills base (senza parent_skill_id)
        $this->insertData('skills', [
            [
                'skill_id' => 1,
                'name' => 'Pionierismo',
                'base_class' => 'Pioniere',
                'description' => 'Abilità basilare di sopravvivenza e raccolta di cibo.',
                'max_level' => 1000,
                'parent_skill_id' => null
            ],
            [
                'skill_id' => 2,
                'name' => 'Mischia',
                'base_class' => 'Lottatore',
                'description' => 'Competenza nel combattimento corpo a corpo e scorta.',
                'max_level' => 1000,
                'parent_skill_id' => null
            ],
            [
                'skill_id' => 3,
                'name' => 'Raccolta Risorse',
                'base_class' => 'Raccoglitore',
                'description' => 'Abilità di estrazione di materie prime grezze.',
                'max_level' => 1000,
                'parent_skill_id' => null
            ],
            [
                'skill_id' => 4,
                'name' => 'Fabbricazione Base',
                'base_class' => 'Fabbricatore',
                'description' => 'Costruzione di oggetti semplici e rifugi.',
                'max_level' => 1000,
                'parent_skill_id' => null
            ],
            [
                'skill_id' => 5,
                'name' => 'Commercio',
                'base_class' => 'Viandante',
                'description' => 'Compravendita e gestione di inventario.',
                'max_level' => 1000,
                'parent_skill_id' => null
            ],
            [
                'skill_id' => 6,
                'name' => 'Taglialegna',
                'base_class' => 'Raccoglitore',
                'description' => null,
                'max_level' => 1000,
                'parent_skill_id' => 3  // Figlia di Raccolta Risorse
            ],
            [
                'skill_id' => 7,
                'name' => 'Falegnameria',
                'base_class' => 'Fabbricatore',
                'description' => null,
                'max_level' => 1000,
                'parent_skill_id' => 4  // Figlia di Fabbricazione Base
            ]
        ]);
        
        // Imposta la sequenza skills_skill_id_seq
        $this->pdo->exec("SELECT pg_catalog.setval('public.skills_skill_id_seq', 7, true)");
        
        // Inserisce traits
        $this->insertData('traits', [
            [
                'trait_id' => 1,
                'name' => 'Paziente',
                'description' => 'Gode di meno fallimenti nelle azioni lunghe.',
                'code_modifier' => 'BONUS_TIME_FAIL_REDUCTION'
            ],
            [
                'trait_id' => 2,
                'name' => 'Audace',
                'description' => 'Ottiene più possibilità di tiri critici in zone pericolose.',
                'code_modifier' => 'BONUS_CRIT_RISK_AREA'
            ],
            [
                'trait_id' => 3,
                'name' => 'Pragmatico',
                'description' => 'Consuma meno materiali durante il crafting.',
                'code_modifier' => 'BONUS_RESOURCE_EFFICIENCY'
            ],
            [
                'trait_id' => 4,
                'name' => 'Saggio',
                'description' => 'Guadagna XP bonus dalla prima scoperta di ricette/risorse.',
                'code_modifier' => 'BONUS_DISCOVERY_XP'
            ]
        ]);
        
        // Imposta la sequenza traits_trait_id_seq
        $this->pdo->exec("SELECT pg_catalog.setval('public.traits_trait_id_seq', 4, true)");
        
        // Inserisce resources
        $this->insertData('resources', [
            [
                'resource_id' => 1,
                'name' => 'Legno Grezzo',
                'skill_id' => 6,  // Taglialegna
                'base_resource_type' => 'WOOD'
            ],
            [
                'resource_id' => 2,
                'name' => 'Pietra Grezza',
                'skill_id' => 3,  // Raccolta Risorse
                'base_resource_type' => 'ORE'
            ],
            [
                'resource_id' => 3,
                'name' => 'Erba Medica',
                'skill_id' => 3,  // Raccolta Risorse
                'base_resource_type' => 'HERB'
            ]
        ]);
        
        // Imposta la sequenza resources_resource_id_seq
        $this->pdo->exec("SELECT pg_catalog.setval('public.resources_resource_id_seq', 6, true)");
    }
    
    public function getDescription() {
        return $this->description;
    }
    
    // Helper method per inserire dati con gestione ID espliciti
    private function insertData($table, $data) {
        if (empty($data)) {
            return;
        }
        
        // Verifica se la tabella ha colonne IDENTITY
        $identityColumns = $this->getIdentityColumns($table);
        
        foreach ($data as $row) {
            $columns = array_keys($row);
            $placeholders = ':' . implode(', :', $columns);
            $columnList = implode(', ', $columns);
            
            // Determina la primary key per ON CONFLICT
            $primaryKey = $this->getPrimaryKey($table);
            
            // Se ci sono colonne IDENTITY e stiamo inserendo valori espliciti, usa OVERRIDING SYSTEM VALUE
            $overridingClause = '';
            $hasIdentityValues = false;
            foreach ($identityColumns as $identityCol) {
                if (isset($row[$identityCol])) {
                    $hasIdentityValues = true;
                    break;
                }
            }
            
            if ($hasIdentityValues) {
                $overridingClause = ' OVERRIDING SYSTEM VALUE';
            }
            
            if ($primaryKey && !$hasIdentityValues) {
                // Usa ON CONFLICT se c'è una primary key e non stiamo usando IDENTITY
                $sql = "INSERT INTO public.{$table} ({$columnList}) VALUES ({$placeholders}){$overridingClause}
                        ON CONFLICT ({$primaryKey}) DO NOTHING";
            } else {
                // Altrimenti usa un semplice INSERT con gestione errori
                $sql = "INSERT INTO public.{$table} ({$columnList}) VALUES ({$placeholders}){$overridingClause}";
            }
            
            $stmt = $this->pdo->prepare($sql);
            
            // Bind dei valori
            foreach ($row as $key => $value) {
                $stmt->bindValue(':' . $key, $value);
            }
            
            try {
                $stmt->execute();
            } catch (PDOException $e) {
                // Ignora errori di duplicati o altri errori non critici
                if (strpos($e->getMessage(), 'duplicate') === false && 
                    strpos($e->getMessage(), 'unique') === false &&
                    strpos($e->getMessage(), 'violates unique constraint') === false) {
                    // Rilancia solo se non è un errore di duplicato
                    throw $e;
                }
            }
        }
    }
    
    // Helper per ottenere le colonne IDENTITY di una tabella
    private function getIdentityColumns($table) {
        $sql = "
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = :table
            AND is_identity = 'YES'
        ";
        
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':table' => $table]);
            return $stmt->fetchAll(PDO::FETCH_COLUMN);
        } catch (PDOException $e) {
            return [];
        }
    }
    
    // Helper per ottenere la primary key di una tabella
    private function getPrimaryKey($table) {
        $sql = "
            SELECT a.attname
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = 'public.{$table}'::regclass
            AND i.indisprimary
            LIMIT 1
        ";
        
        try {
            $stmt = $this->pdo->query($sql);
            $result = $stmt->fetch(PDO::FETCH_COLUMN);
            return $result ?: null;
        } catch (PDOException $e) {
            return null;
        }
    }
}
?>

