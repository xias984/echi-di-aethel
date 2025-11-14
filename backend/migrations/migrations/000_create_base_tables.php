<?php
// Migrazione: Crea tutte le tabelle base del database

class Migration_000_CreateBaseTables {
    private $pdo;
    private $description = "Crea tutte le tabelle base del database (users, skills, traits, resources, contracts, items, transactions, user_*)";
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    public function up() {
        // 1. Tabella users (base, nessuna dipendenza)
        $this->createTable('users', '
            user_id INTEGER NOT NULL,
            username CHARACTER VARYING(50) NOT NULL,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
            admin BOOLEAN DEFAULT false NOT NULL,
            PRIMARY KEY (user_id)
        ', true);
        
        // Sequence per users
        $this->createSequence('users_user_id_seq');
        $this->pdo->exec("ALTER TABLE public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass)");
        $this->pdo->exec("ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id");
        
        // Commento colonna admin
        $this->pdo->exec("COMMENT ON COLUMN public.users.admin IS 'Flag to indicate if user has admin privileges'");
        
        // Unique constraint su username
        $this->addUniqueConstraint('users', 'users_username_key', 'username');
        
        // 2. Tabella skills (può avere parent_skill_id ma può essere NULL)
        $this->createTable('skills', '
            skill_id INTEGER NOT NULL,
            name CHARACTER VARYING(50) NOT NULL,
            base_class CHARACTER VARYING(50) NOT NULL,
            description TEXT,
            max_level INTEGER DEFAULT 1000,
            parent_skill_id INTEGER,
            PRIMARY KEY (skill_id)
        ', true);
        
        // Sequence per skills
        $this->createSequence('skills_skill_id_seq');
        $this->pdo->exec("ALTER TABLE public.skills ALTER COLUMN skill_id SET DEFAULT nextval('public.skills_skill_id_seq'::regclass)");
        $this->pdo->exec("ALTER SEQUENCE public.skills_skill_id_seq OWNED BY public.skills.skill_id");
        
        // Foreign key per parent_skill_id (self-reference)
        $this->addForeignKey('skills', 'skills_parent_skill_id_fkey', 'parent_skill_id', 'skills', 'skill_id');
        
        // Unique constraint su name
        $this->addUniqueConstraint('skills', 'skills_name_key', 'name');
        
        // 3. Tabella traits (nessuna dipendenza)
        $this->createTable('traits', '
            trait_id INTEGER NOT NULL,
            name CHARACTER VARYING(50) NOT NULL,
            description TEXT,
            code_modifier CHARACTER VARYING(50) NOT NULL,
            PRIMARY KEY (trait_id)
        ', true);
        
        // Sequence per traits
        $this->createSequence('traits_trait_id_seq');
        $this->pdo->exec("ALTER TABLE public.traits ALTER COLUMN trait_id SET DEFAULT nextval('public.traits_trait_id_seq'::regclass)");
        $this->pdo->exec("ALTER SEQUENCE public.traits_trait_id_seq OWNED BY public.traits.trait_id");
        
        // Unique constraint su name
        $this->addUniqueConstraint('traits', 'traits_name_key', 'name');
        
        // 4. Tabella resources (dipende da skills)
        $this->createTable('resources', '
            resource_id INTEGER NOT NULL,
            name CHARACTER VARYING(50) NOT NULL,
            skill_id INTEGER,
            base_resource_type CHARACTER VARYING(50) NOT NULL,
            PRIMARY KEY (resource_id)
        ', true);
        
        // Identity per resources
        $this->pdo->exec("
            ALTER TABLE public.resources 
            ALTER COLUMN resource_id ADD GENERATED ALWAYS AS IDENTITY (
                SEQUENCE NAME public.resources_resource_id_seq
                START WITH 1
                INCREMENT BY 1
                NO MINVALUE
                NO MAXVALUE
                CACHE 1
            )
        ");
        
        // Foreign key per skill_id
        $this->addForeignKey('resources', 'resources_skill_id_fkey', 'skill_id', 'skills', 'skill_id');
        
        // Unique constraint su name
        $this->addUniqueConstraint('resources', 'resources_name_key', 'name');
        
        // 5. Tabella contracts (dipende da users e skills)
        $this->createTable('contracts', '
            contract_id INTEGER NOT NULL,
            proposer_id INTEGER NOT NULL,
            accepted_by_id INTEGER,
            title CHARACTER VARYING(100) NOT NULL,
            description TEXT,
            required_skill_id INTEGER,
            required_level INTEGER DEFAULT 1,
            reward_amount INTEGER NOT NULL,
            status CHARACTER VARYING(20) DEFAULT \'OPEN\' NOT NULL,
            type CHARACTER VARYING(20) DEFAULT \'ONCE\' NOT NULL,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
            accepted_at TIMESTAMP WITHOUT TIME ZONE,
            PRIMARY KEY (contract_id)
        ', true);
        
        // Sequence per contracts
        $this->createSequence('contracts_contract_id_seq');
        $this->pdo->exec("ALTER TABLE public.contracts ALTER COLUMN contract_id SET DEFAULT nextval('public.contracts_contract_id_seq'::regclass)");
        $this->pdo->exec("ALTER SEQUENCE public.contracts_contract_id_seq OWNED BY public.contracts.contract_id");
        
        // Foreign keys per contracts
        $this->addForeignKey('contracts', 'contracts_proposer_id_fkey', 'proposer_id', 'users', 'user_id', 'ON DELETE CASCADE');
        $this->addForeignKey('contracts', 'contracts_accepted_by_id_fkey', 'accepted_by_id', 'users', 'user_id', 'ON DELETE SET NULL');
        $this->addForeignKey('contracts', 'contracts_required_skill_id_fkey', 'required_skill_id', 'skills', 'skill_id');
        
        // 6. Tabella items (dipende da users e skills)
        $this->createTable('items', '
            item_id INTEGER NOT NULL,
            name CHARACTER VARYING(100) NOT NULL,
            item_type CHARACTER VARYING(50) NOT NULL,
            required_skill_id INTEGER,
            equipment_slot CHARACTER VARYING(50) DEFAULT NULL,
            bonus_crit_chance NUMERIC(5,2) DEFAULT 0.00,
            owner_id INTEGER,
            PRIMARY KEY (item_id)
        ', true);
        
        // Identity per items
        $this->pdo->exec("
            ALTER TABLE public.items 
            ALTER COLUMN item_id ADD GENERATED ALWAYS AS IDENTITY (
                SEQUENCE NAME public.items_item_id_seq
                START WITH 1
                INCREMENT BY 1
                NO MINVALUE
                NO MAXVALUE
                CACHE 1
            )
        ");
        
        // Foreign keys per items
        $this->addForeignKey('items', 'items_required_skill_id_fkey', 'required_skill_id', 'skills', 'skill_id');
        $this->addForeignKey('items', 'items_owner_id_fkey', 'owner_id', 'users', 'user_id');
        
        // 7. Tabella transactions (dipende da contracts)
        $this->createTable('transactions', '
            transaction_id INTEGER NOT NULL,
            contract_id INTEGER NOT NULL,
            amount INTEGER NOT NULL,
            status CHARACTER VARYING(20) DEFAULT \'PENDING_ESCROW\' NOT NULL,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
            PRIMARY KEY (transaction_id)
        ', true);
        
        // Sequence per transactions
        $this->createSequence('transactions_transaction_id_seq');
        $this->pdo->exec("ALTER TABLE public.transactions ALTER COLUMN transaction_id SET DEFAULT nextval('public.transactions_transaction_id_seq'::regclass)");
        $this->pdo->exec("ALTER SEQUENCE public.transactions_transaction_id_seq OWNED BY public.transactions.transaction_id");
        
        // Foreign key per contract_id
        $this->addForeignKey('transactions', 'transactions_contract_id_fkey', 'contract_id', 'contracts', 'contract_id', 'ON DELETE CASCADE');
        
        // 8. Tabella user_skills (dipende da users e skills)
        $this->createTable('user_skills', '
            user_skill_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            skill_id INTEGER NOT NULL,
            current_level INTEGER DEFAULT 1,
            current_xp BIGINT DEFAULT 0,
            PRIMARY KEY (user_skill_id)
        ', true);
        
        // Sequence per user_skills
        $this->createSequence('user_skills_user_skill_id_seq');
        $this->pdo->exec("ALTER TABLE public.user_skills ALTER COLUMN user_skill_id SET DEFAULT nextval('public.user_skills_user_skill_id_seq'::regclass)");
        $this->pdo->exec("ALTER SEQUENCE public.user_skills_user_skill_id_seq OWNED BY public.user_skills.user_skill_id");
        
        // Foreign keys per user_skills
        $this->addForeignKey('user_skills', 'user_skills_user_id_fkey', 'user_id', 'users', 'user_id', 'ON DELETE CASCADE');
        $this->addForeignKey('user_skills', 'user_skills_skill_id_fkey', 'skill_id', 'skills', 'skill_id', 'ON DELETE CASCADE');
        
        // Unique constraint su user_id + skill_id
        $this->addUniqueConstraint('user_skills', 'user_skills_user_id_skill_id_key', 'user_id, skill_id');
        
        // 9. Tabella user_traits (dipende da users e traits)
        $this->createTable('user_traits', '
            user_trait_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            trait_id INTEGER NOT NULL,
            PRIMARY KEY (user_trait_id)
        ', true);
        
        // Sequence per user_traits
        $this->createSequence('user_traits_user_trait_id_seq');
        $this->pdo->exec("ALTER TABLE public.user_traits ALTER COLUMN user_trait_id SET DEFAULT nextval('public.user_traits_user_trait_id_seq'::regclass)");
        $this->pdo->exec("ALTER SEQUENCE public.user_traits_user_trait_id_seq OWNED BY public.user_traits.user_trait_id");
        
        // Foreign keys per user_traits
        $this->addForeignKey('user_traits', 'user_traits_user_id_fkey', 'user_id', 'users', 'user_id', 'ON DELETE CASCADE');
        $this->addForeignKey('user_traits', 'user_traits_trait_id_fkey', 'trait_id', 'traits', 'trait_id', 'ON DELETE CASCADE');
        
        // 10. Tabella user_resources (dipende da users e resources)
        $this->createTable('user_resources', '
            user_resource_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            resource_id INTEGER NOT NULL,
            quantity INTEGER DEFAULT 0 NOT NULL,
            PRIMARY KEY (user_resource_id)
        ', true);
        
        // Identity per user_resources
        $this->pdo->exec("
            ALTER TABLE public.user_resources 
            ALTER COLUMN user_resource_id ADD GENERATED ALWAYS AS IDENTITY (
                SEQUENCE NAME public.user_resources_user_resource_id_seq
                START WITH 1
                INCREMENT BY 1
                NO MINVALUE
                NO MAXVALUE
                CACHE 1
            )
        ");
        
        // Foreign keys per user_resources
        $this->addForeignKey('user_resources', 'user_resources_user_id_fkey', 'user_id', 'users', 'user_id', 'ON DELETE CASCADE');
        $this->addForeignKey('user_resources', 'user_resources_resource_id_fkey', 'resource_id', 'resources', 'resource_id', 'ON DELETE CASCADE');
        
        // Unique constraint su user_id + resource_id
        $this->addUniqueConstraint('user_resources', 'user_resources_user_id_resource_id_key', 'user_id, resource_id');
        
        // 11. Tabella user_equipment (dipende da users e items)
        $this->createTable('user_equipment', '
            user_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL,
            slot_type CHARACTER VARYING(50) NOT NULL,
            PRIMARY KEY (user_id, slot_type)
        ', true);
        
        // Foreign keys per user_equipment
        $this->addForeignKey('user_equipment', 'user_equipment_user_id_fkey', 'user_id', 'users', 'user_id', 'ON DELETE CASCADE');
        $this->addForeignKey('user_equipment', 'user_equipment_item_id_fkey', 'item_id', 'items', 'item_id', 'ON DELETE CASCADE');
    }
    
    public function getDescription() {
        return $this->description;
    }
    
    // Helper methods
    // Nota: Non possiamo usare parametri preparati nei blocchi DO $$, quindi usiamo concatenazione diretta
    // I nomi sono hardcoded quindi è sicuro
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
    
    private function createSequence($sequenceName) {
        // Sanitizza il nome della sequenza per sicurezza
        $sequenceName = preg_replace('/[^a-z0-9_]/i', '', $sequenceName);
        
        $sql = "
            DO \$\$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = '{$sequenceName}'
                ) THEN
                    CREATE SEQUENCE public.{$sequenceName}
                        AS integer
                        START WITH 1
                        INCREMENT BY 1
                        NO MINVALUE
                        NO MAXVALUE
                        CACHE 1;
                END IF;
            END \$\$;
        ";
        $this->pdo->exec($sql);
    }
    
    private function addForeignKey($table, $constraintName, $column, $refTable, $refColumn, $onDelete = '') {
        // Sanitizza i nomi per sicurezza
        $table = preg_replace('/[^a-z0-9_]/i', '', $table);
        $constraintName = preg_replace('/[^a-z0-9_]/i', '', $constraintName);
        $column = preg_replace('/[^a-z0-9_]/i', '', $column);
        $refTable = preg_replace('/[^a-z0-9_]/i', '', $refTable);
        $refColumn = preg_replace('/[^a-z0-9_]/i', '', $refColumn);
        
        // Gestisce sia "CASCADE" che "ON DELETE CASCADE"
        if ($onDelete) {
            if (stripos($onDelete, 'ON DELETE') === 0) {
                // Se inizia già con "ON DELETE", usa direttamente
                $onDeleteClause = " {$onDelete}";
            } else {
                // Altrimenti aggiungi "ON DELETE"
                $onDeleteClause = " ON DELETE {$onDelete}";
            }
        } else {
            $onDeleteClause = '';
        }
        
        $sql = "
            DO \$\$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 
                    FROM information_schema.table_constraints 
                    WHERE constraint_schema = 'public' 
                    AND constraint_name = '{$constraintName}'
                ) THEN
                    ALTER TABLE public.{$table} 
                    ADD CONSTRAINT {$constraintName} 
                    FOREIGN KEY ({$column}) 
                    REFERENCES public.{$refTable}({$refColumn}){$onDeleteClause};
                END IF;
            END \$\$;
        ";
        $this->pdo->exec($sql);
    }
    
    private function addUniqueConstraint($table, $constraintName, $columns) {
        // Sanitizza i nomi per sicurezza
        $table = preg_replace('/[^a-z0-9_]/i', '', $table);
        $constraintName = preg_replace('/[^a-z0-9_]/i', '', $constraintName);
        // Le colonne possono essere multiple, quindi solo rimuoviamo caratteri pericolosi
        $columns = preg_replace('/[^a-z0-9_,\s]/i', '', $columns);
        
        $sql = "
            DO \$\$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 
                    FROM information_schema.table_constraints 
                    WHERE constraint_schema = 'public' 
                    AND constraint_name = '{$constraintName}'
                ) THEN
                    ALTER TABLE public.{$table} 
                    ADD CONSTRAINT {$constraintName} 
                    UNIQUE ({$columns});
                END IF;
            END \$\$;
        ";
        $this->pdo->exec($sql);
    }
}
?>

