# Esempi Pratici di Migrazioni

Questo file contiene esempi pratici di come creare e usare le migrazioni.

## Esempio 1: Aggiungere una colonna semplice

**Crea la migrazione:**
```bash
docker compose exec -it php php backend/migrations/create_migration.php add_user_email
```

**Modifica il file generato:**
```php
public function up() {
    $this->addColumn('users', 'email', 'VARCHAR(255)');
    $this->addColumn('users', 'email_verified', 'BOOLEAN DEFAULT false');
}
```

## Esempio 2: Creare una nuova tabella

**Crea la migrazione:**
```bash
docker compose exec -it php php backend/migrations/create_migration.php create_products_table
```

**Modifica il file generato:**
```php
public function up() {
    $this->createTable('products', '
        product_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        stock INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ');
}
```

## Esempio 3: Creare una tabella con foreign key

**Crea la migrazione:**
```bash
docker compose exec -it php php backend/migrations/create_migration.php create_orders_table
```

**Modifica il file generato:**
```php
public function up() {
    $this->createTable('orders', '
        order_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
        total DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT \'pending\',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ');
}
```

## Esempio 4: Inserire dati iniziali

**Crea la migrazione:**
```bash
docker compose exec -it php php backend/migrations/create_migration.php insert_initial_skills
```

**Modifica il file generato:**
```php
public function up() {
    $this->insertData('skills', [
        [
            'name' => 'Nuova Skill 1',
            'base_class' => 'Classe1'
        ],
        [
            'name' => 'Nuova Skill 2',
            'base_class' => 'Classe2'
        ]
    ]);
}
```

## Esempio 5: Modifica complessa (colonna + tabella + dati)

**Crea la migrazione:**
```bash
docker compose exec -it php php backend/migrations/create_migration.php add_user_preferences
```

**Modifica il file generato:**
```php
public function up() {
    // Aggiungi colonna alla tabella users
    $this->addColumn('users', 'preferences_json', 'TEXT');
    
    // Crea tabella per preferenze strutturate
    $this->createTable('user_preferences', '
        preference_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
        theme VARCHAR(50) DEFAULT \'light\',
        language VARCHAR(10) DEFAULT \'it\',
        notifications_enabled BOOLEAN DEFAULT true,
        UNIQUE(user_id)
    ');
    
    // Inserisci preferenze di default per utenti esistenti
    // Nota: questo esempio assume che ci siano utenti con ID 1, 2, 3
    $this->insertData('user_preferences', [
        ['user_id' => 1, 'theme' => 'dark', 'language' => 'it'],
        ['user_id' => 2, 'theme' => 'light', 'language' => 'en'],
        ['user_id' => 3, 'theme' => 'dark', 'language' => 'it']
    ]);
}
```

## Esempio 6: Usare SQL raw per operazioni complesse

**Crea la migrazione:**
```bash
docker compose exec -it php php backend/migrations/create_migration.php update_existing_data
```

**Modifica il file generato:**
```php
public function up() {
    // Aggiorna dati esistenti
    $this->pdo->exec("
        UPDATE public.users 
        SET admin = true 
        WHERE username = 'admin'
    ");
    
    // Crea un indice
    $this->pdo->exec("
        CREATE INDEX IF NOT EXISTS idx_users_email 
        ON public.users(email)
    ");
    
    // Aggiungi un constraint
    $this->pdo->exec("
        ALTER TABLE public.users 
        ADD CONSTRAINT check_email_format 
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$')
    ");
}
```

## Workflow Completo

1. **Crea la migrazione:**
   ```bash
   docker compose exec -it php php backend/migrations/create_migration.php add_feature_x
   ```

2. **Modifica il file generato** in `backend/migrations/migrations/XXX_add_feature_x.php`

3. **Verifica lo stato:**
   ```bash
   docker compose exec -it php php backend/migrations/migrate.php status
   ```

4. **Testa in dry-run (se implementato):**
   ```bash
   docker compose exec -it php php backend/migrations/migrate.php migrate --dry-run
   ```

5. **Esegui la migrazione:**
   ```bash
   docker compose exec -it php php backend/migrations/migrate.php migrate
   ```

6. **Verifica di nuovo lo stato:**
   ```bash
   docker compose exec -it php php backend/migrations/migrate.php status
   ```

## Note Importanti

- Le migrazioni vengono eseguite in ordine numerico (001, 002, 003, ...)
- Una volta eseguita, una migrazione non verrà rieseguita automaticamente
- Usa sempre i controlli di esistenza per evitare errori
- Fai sempre un backup prima di migrazioni importanti
- Testa le migrazioni in un ambiente di sviluppo prima della produzione

