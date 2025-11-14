#!/usr/bin/env php
<?php
// Script CLI per eseguire le migrazioni

require_once __DIR__ . '/MigrationManager.php';

$action = $argv[1] ?? 'migrate';
$dryRun = in_array('--dry-run', $argv);
$confirm = in_array('--confirm', $argv);

$manager = new MigrationManager();

try {
    switch ($action) {
        case 'migrate':
            $manager->migrate($dryRun);
            break;
            
        case 'status':
            $manager->status();
            break;
            
        case 'init':
            $manager->initialize();
            break;
            
        case 'reset':
            $manager->reset($confirm);
            break;
            
        default:
            echo "Uso: php migrate.php [migrate|status|init|reset] [opzioni]\n";
            echo "\nComandi:\n";
            echo "  migrate    - Esegue tutte le migrazioni pendenti\n";
            echo "  status     - Mostra lo stato delle migrazioni\n";
            echo "  init       - Inizializza la tabella migrations\n";
            echo "  reset      - Resetta il database (elimina tutto e riesegue migrazioni)\n";
            echo "\nOpzioni:\n";
            echo "  --dry-run  - Simula l'esecuzione senza applicare modifiche\n";
            echo "  --confirm  - Conferma operazioni distruttive (richiesto per reset)\n";
            echo "\nEsempi:\n";
            echo "  php migrate.php reset --confirm  # Resetta il database\n";
            exit(1);
    }
} catch (Exception $e) {
    echo "\n✗ ERRORE: " . $e->getMessage() . "\n";
    exit(1);
}
?>

