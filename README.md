# ECHI DI AETHEL

## Comandi Utili

### Database

- **Accedi a pgAdmin (Interfaccia Web per PostgreSQL)**  
  Dopo aver avviato i container con `docker compose up`, apri il browser e vai a:
  ```
  http://localhost:5050
  ```
  **Credenziali di default:**
  - Email: `admin@admin.com`
  - Password: `admin`
  
  **Per connetterti al database:**
  1. Clicca destro su "Servers" → "Register" → "Server"
  2. Nella tab "General":
     - Name: `Aethel Database` (o qualsiasi nome)
  3. Nella tab "Connection":
     - Host name/address: `db` (nome del servizio Docker)
     - Port: `5432`
     - Maintenance database: `db_aethel` (o il nome del tuo database)
     - Username: `user_aethel` (o il tuo DB_USER)
     - Password: `password_aethel` (o il tuo DB_PASS)
  4. Clicca "Save"

- **Accedi al database PostgreSQL nel container**  
  ```sh
  docker compose exec -it db psql -U user_aethel -d db_aethel
  ```
  Questo comando ti permette di aprire una shell interattiva di `psql` direttamente nel container del database.

- **Effettua un backup del database**  
  **Per Linux/macOS:**  
  ```sh
  docker compose exec -T db pg_dump -U user_aethel -d db_aethel > "backup_aethel_$(date +%Y%m%d_%H%M%S).sql"
  ```
  **Per Windows (PowerShell):**  
  ```powershell
  docker compose exec -T db pg_dump -U user_aethel -d db_aethel > "backup_aethel_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
  ```
  
- **Esegui una migrazione SQL (aggiunge colonna admin)**  
  **Per Linux/macOS:**  
  ```sh
  cat migration_add_admin_column.sql | docker compose exec -T db psql -U user_aethel -d db_aethel
  ```  
  **Per Windows (PowerShell):**  
  ```powershell
  Get-Content migration_add_admin_column.sql | docker compose exec -T db psql -U user_aethel -d db_aethel
  ```
  Usa il comando appropriato a seconda del tuo sistema operativo per esportare il database in un file di backup sul tuo sistema locale. Il nome del file includerà data e ora.  
  _Nota: su Linux o macOS usa `date`, su Windows (PowerShell) usa `Get-Date`._
  
  Per eseguire una migrazione SQL (come aggiungere la colonna admin), usa i comandi sopra riportati nella sezione "Esegui una migrazione SQL".

- **Carica un file di backup nel container**  
  ```sh
  docker compose cp backup_aethel_20251009_XXXXXX.sql db:/tmp/restore.sql
  ```
  Questo comando copia un file di backup dal tuo computer nella cartella `/tmp` del container database preparandolo per il ripristino.

- **Ripristina un backup**  
  ```sh
  docker compose exec -T db psql -U user_aethel -d db_aethel < /tmp/restore.sql
  ```
  Esegui questa istruzione per ripristinare il database dal file precedentemente copiato.

### Container PHP

- **Accedi alla shell del container PHP**  
  ```sh
  docker compose exec -it php ash
  ```
  Apri una shell `ash` all'interno del container PHP, utile per debug o operazioni manuali.