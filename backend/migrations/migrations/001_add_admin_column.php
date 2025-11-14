<?php
// Migrazione: Aggiunge la colonna admin alla tabella users

class Migration_001_AddAdminColumn {
    private $pdo;
    private $description = "Aggiunge la colonna admin alla tabella users per i privilegi amministrativi";
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    public function up() {
        // Aggiunge la colonna admin se non esiste
        // Nota: Se la migrazione 000 è già stata eseguita, questa colonna esiste già
        $sql = "
            DO \$\$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'users' 
                    AND column_name = 'admin'
                ) THEN
                    ALTER TABLE public.users 
                    ADD COLUMN admin BOOLEAN NOT NULL DEFAULT false;
                    
                    RAISE NOTICE 'Column admin added successfully to users table';
                ELSE
                    RAISE NOTICE 'Column admin already exists in users table';
                END IF;
            END \$\$;
        ";
        
        $this->pdo->exec($sql);
        
        // Aggiunge il commento alla colonna (sovrascrive se esiste già)
        $this->pdo->exec("
            COMMENT ON COLUMN public.users.admin IS 'Flag to indicate if user has admin privileges'
        ");
    }
    
    public function getDescription() {
        return $this->description;
    }
}
?>

