# Sistema di Migrazione Database

Questo sistema semplifica la gestione delle modifiche al database, permettendo di:
- Tracciare automaticamente le migrazioni eseguite
- Eseguire migrazioni in modo sicuro (non riesegue quelle già applicate)
- Creare facilmente nuove migrazioni con template precompilati
- Usare metodi helper per operazioni comuni

## Struttura

```
backend/migrations/
├── MigrationManager.php      # Classe principale per gestire le migrazioni
├── migrate.php               # Script CLI per eseguire migrazioni
├── create_migration.php       # Script helper per creare nuove migrazioni
├── migrations/               # Cartella contenente i file di migrazione
│   ├── template.php          # Template per nuove migrazioni
│   ├── 001_add_admin_column.php
│   └── 002_add_skills_hierarchy_and_equipment.php
└── README.md                 # Questo file
```

## Uso Base

### 1. Verificare lo stato delle migrazioni

```bash
docker compose exec -it php php backend/migrations/migrate.php status
```

Mostra tutte le migrazioni disponibili e il loro stato (eseguite/pendenti).

### 2. Eseguire le migrazioni pendenti

```bash
docker compose exec -it php php backend/migrations/migrate.php migrate
```

Esegue automaticamente tutte le migrazioni non ancora applicate.

### 3. Creare una nuova migrazione

```bash
docker compose exec -it php php backend/migrations/create_migration.php add_email_column
```

Crea un nuovo file `003_add_email_column.php` nella cartella `migrations/` con un template precompilato.

## Formato delle Migrazioni

Ogni file di migrazione deve seguire questo formato:

```php
<?php
class Migration_NNN_Description {
    private $pdo;
    private $description = "Descrizione della migrazione";
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    public function up() {
        // Implementa qui la migrazione
    }
    
    public function getDescription() {
        return $this->description;
    }
}
```

**Regole importanti:**
- Il nome del file deve essere: `NNN_description.php` (es: `001_add_admin_column.php`)
- Il nome della classe deve essere: `Migration_NNN_Description` (es: `Migration_001_AddAdminColumn`)
- Il metodo `up()` viene eseguito quando la migrazione viene applicata
- Il metodo `getDescription()` restituisce una descrizione leggibile

## Metodi Helper Disponibili

All'interno del metodo `up()`, puoi usare questi metodi helper (già inclusi nel template):

### Aggiungere una colonna

```php
$this->addColumn('users', 'email', 'VARCHAR(255)');
// Con controllo esistenza (default: true)
$this->addColumn('users', 'email', 'VARCHAR(255)', true);
```

### Creare una tabella

```php
$this->createTable('products', '
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2)
');
// Con controllo esistenza (default: true)
$this->createTable('products', '...', true);
```

### Inserire dati

```php
$this->insertData('skills', [
    ['name' => 'Nuova Skill', 'base_class' => 'Classe'],
    ['name' => 'Altra Skill', 'base_class' => 'Classe']
]);
```

### Eseguire SQL raw

```php
$this->pdo->exec("UPDATE users SET active = true");
```

## Esempi Pratici

### Esempio 1: Aggiungere una colonna

```php
public function up() {
    $this->addColumn('users', 'email', 'VARCHAR(255)');
    $this->addColumn('users', 'phone', 'VARCHAR(20)', true); // Con controllo
}
```

### Esempio 2: Creare una tabella con relazioni

```php
public function up() {
    $this->createTable('orders', '
        order_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES public.users(user_id),
        total DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ');
}
```

### Esempio 3: Inserire dati iniziali

```php
public function up() {
    $this->insertData('skills', [
        ['name' => 'Nuova Skill', 'base_class' => 'Classe'],
        ['name' => 'Altra Skill', 'base_class' => 'Classe']
    ]);
}
```

### Esempio 4: Combinazione di operazioni

```php
public function up() {
    // Aggiungi colonna
    $this->addColumn('users', 'email', 'VARCHAR(255)');
    
    // Crea tabella
    $this->createTable('user_preferences', '
        preference_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES public.users(user_id),
        theme VARCHAR(50) DEFAULT \'light\'
    ');
    
    // Inserisci dati
    $this->insertData('user_preferences', [
        ['user_id' => 1, 'theme' => 'dark'],
        ['user_id' => 2, 'theme' => 'light']
    ]);
}
```

## Best Practices

1. **Usa sempre i controlli di esistenza**: I metodi helper hanno un parametro `$checkExists` che di default è `true`. Questo previene errori se la migrazione viene rieseguita.

2. **Nomi descrittivi**: Usa nomi chiari per le migrazioni (es: `add_email_column` invece di `migration1`).

3. **Una migrazione, una modifica logica**: Cerca di raggruppare modifiche correlate nella stessa migrazione, ma separa modifiche non correlate.

4. **Testa le migrazioni**: Prima di applicarle in produzione, testale in un ambiente di sviluppo.

5. **Backup prima di migrazioni importanti**: Anche se il sistema è sicuro, fai sempre un backup prima di migrazioni che modificano dati esistenti.

## Troubleshooting

### Errore: "Classe non trovata"
- Verifica che il nome della classe corrisponda al formato: `Migration_NNN_Description`
- Verifica che il nome del file corrisponda al formato: `NNN_description.php`

### Errore: "Metodo 'up' non trovato"
- Assicurati che la classe abbia un metodo pubblico `up()`

### Migrazione già eseguita
- Il sistema traccia automaticamente le migrazioni eseguite nella tabella `migrations`
- Se una migrazione risulta già eseguita, non verrà rieseguita automaticamente

### Rollback
- Il sistema attualmente non supporta il rollback automatico
- Per annullare una migrazione, crea una nuova migrazione che inverte le modifiche
