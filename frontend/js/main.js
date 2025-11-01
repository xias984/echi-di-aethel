class AppController {
    constructor() {
        // Inizializza i gestori
        this.api = new ApiManager();
        this.ui = new UIManager();
        
        // Stato dell'applicazione
        this.currentUserId = null;
        this.isAdmin = false;
        this.availableSkills = []; // Le skill dell'utente per il controllo in locale

        this.init();
    }

    /**
     * Inizializza l'applicazione: controlla la sessione, imposta i listener.
     */
    init() {
        // 1. Controlla l'accesso precedente
        this.currentUserId = localStorage.getItem('echi_di_aethel_user_id');
        this.isAdmin = localStorage.getItem('echi_di_aethel_is_admin') === 'true';
        
        if (this.currentUserId) {
            this.ui.showAppSections();
            this.ui.showAdminSection(this.isAdmin);
            this.loadProfileAndContracts(this.currentUserId);
            if (this.isAdmin) {
                this.loadAdminData();
            }
        } else {
            this.ui.toggleLoginForms(true); // Mostra il form di login
        }

        // 2. Imposta tutti i listener degli eventi
        this.setupEventListeners();
    }

    // --- Logica di Caricamento Dati ---

    async loadProfileAndContracts(userId) {
        if (!userId) return;
        this.ui.showProfileLoading();

        try {
            // Carica Profilo
            const profile = await this.api.getProfile(userId);
            this.availableSkills = this.ui.updateProfile(profile);
            
            // Carica Contratti
            const contracts = await this.api.getContracts(userId);
            this.ui.renderContracts(contracts, userId);

            this.ui.hideProfileLoading();
        } catch (error) {
            this.ui.hideProfileLoading();
            this.ui.setMessage('login-message', `Errore nel caricamento: ${error.message}`, 'error');
            console.error('Errore nel caricamento del profilo/contratti:', error);
        }
    }

    // --- Logica Form e Azioni ---

    async handleLogin() {
        const username = $('#login-username').val().trim();
        if (!username) {
            this.ui.setMessage('login-message', "Inserisci un nome utente valido.", 'error'); 
            return;
        }

        this.ui.setMessage('login-message', 'Accesso in corso...', 'loading');

        try {
            const response = await this.api.login(username);
            this.ui.setMessage('login-message', response.message, 'success');
            this.currentUserId = response.user_id;
            this.isAdmin = response.admin || false;
            localStorage.setItem('echi_di_aethel_user_id', this.currentUserId);
            localStorage.setItem('echi_di_aethel_is_admin', this.isAdmin ? 'true' : 'false');
            this.ui.showAppSections();
            this.ui.showAdminSection(this.isAdmin);
            this.loadProfileAndContracts(this.currentUserId);
            if (this.isAdmin) {
                this.loadAdminData();
            }
        } catch (error) {
            this.ui.setMessage('login-message', `Errore: ${error.message}`, 'error');
        }
    }
    
    async handleCreateUser() {
        const username = $('#username').val().trim();
        if (!username) { 
            this.ui.setMessage('message', "Inserisci un nome utente valido.", 'error'); 
            return; 
        }

        this.ui.setMessage('message', "Creazione in corso...", 'loading');

        try {
            const response = await this.api.createUser(username);
            this.ui.setMessage('message', response.message, 'success');
            this.currentUserId = response.user_id;
            localStorage.setItem('echi_di_aethel_user_id', this.currentUserId);
            this.ui.showAppSections();
            this.loadProfileAndContracts(this.currentUserId);
        } catch (error) {
            this.ui.setMessage('message', `Errore: ${error.message}`, 'error');
        }
    }

    handleLogout() {
        if (confirm('Sei sicuro di voler effettuare il logout?')) {
            this.currentUserId = null;
            this.isAdmin = false;
            localStorage.removeItem('echi_di_aethel_user_id');
            localStorage.removeItem('echi_di_aethel_is_admin');
            this.ui.toggleLoginForms(true); // Torna al form di login
            this.ui.showAdminSection(false);
            $('#login-username').val('');
        }
    }
    
    async handleUseSkill(event) {
        if (!this.currentUserId) return;
        const skillName = $(event.currentTarget).data('skill-name');
        
        this.ui.setMessage('action-message', `Esecuzione di ${skillName}...`, 'loading');

        try {
            const response = await this.api.useSkill(this.currentUserId, skillName, 5);
            const type = response.level_up ? 'success' : 'default';
            this.ui.setMessage('action-message', response.message, type);
            // Ricarica per vedere i progressi aggiornati
            this.loadProfileAndContracts(this.currentUserId);
        } catch (error) {
            this.ui.setMessage('action-message', `Errore nell'azione: ${error.message}`, 'error');
        }
    }

    async handleCreateContract() {
        if (!this.currentUserId) return;
        const title = $('#contract-title').val().trim();
        const skillName = $('#required-skill-name').val();
        const level = parseInt($('#required-level').val());
        const reward = parseInt($('#reward-amount').val());
        
        if (!title || !skillName || isNaN(level) || isNaN(reward) || reward <= 0) {
            this.ui.setMessage('contract-message', 'Compila tutti i campi correttamente.', 'error');
            return;
        }

        this.ui.setMessage('contract-message', 'Pubblicazione in corso (Escrow)...', 'loading');
        
        try {
            const response = await this.api.createContract(
                this.currentUserId, title, skillName, level, reward
            );
            this.ui.setMessage('contract-message', response.message, 'success');
            this.ui.clearContractForm();
            this.loadProfileAndContracts(this.currentUserId);
        } catch (error) {
            this.ui.setMessage('contract-message', `Errore di pubblicazione: ${error.message}`, 'error');
        }
    }

    async handleAcceptContract(event) {
        if (!this.currentUserId) return;
        const contractId = $(event.currentTarget).data('contract-id');
        
        if (!confirm("Sei sicuro di voler accettare questo contratto?")) return; 
        
        this.ui.setMessage('contract-message', 'Accettazione in corso...', 'loading');

        try {
            const response = await this.api.acceptContract(contractId, this.currentUserId);
            this.ui.setMessage('contract-message', response.message, 'success');
            this.loadProfileAndContracts(this.currentUserId);
        } catch (error) {
            this.ui.setMessage('contract-message', `Errore: ${error.message}`, 'error');
        }
    }

    // --- Gestione Eventi ---

    setupEventListeners() {
        // Login/Create
        $('#login-btn').on('click', () => this.handleLogin());
        $('#login-username').on('keypress', (e) => { if (e.which === 13) this.handleLogin(); });
        $('#create-btn').on('click', () => this.handleCreateUser());
        $('#username').on('keypress', (e) => { if (e.which === 13) this.handleCreateUser(); });
        $('#show-create-link').on('click', () => this.ui.toggleLoginForms(false));
        $('#show-login-link').on('click', () => this.ui.toggleLoginForms(true));
        
        // Logout/Refresh
        $('#logout-btn').on('click', () => this.handleLogout());
        $('#refresh-btn').on('click', () => this.loadProfileAndContracts(this.currentUserId));
        
        // Contratti
        $('#toggle-create-form-btn').on('click', () => $('#contract-create').toggleClass('hidden'));
        $('#create-contract-btn').on('click', () => this.handleCreateContract());
        
        // Admin Panel Modal
        $('#admin-panel-btn').on('click', () => this.ui.toggleAdminModal());
        $('#close-admin-btn').on('click', () => this.ui.closeAdminModal());
        // Close modal when clicking outside
        $('#admin-section').on('click', (e) => {
            if (e.target.id === 'admin-section') {
                this.ui.closeAdminModal();
            }
        });
        
        // Delegazione Eventi Dinamici (IMPORTANTE per elementi creati dinamicamente)
        // Usa la delegazione su un genitore statico (es. document) per i bottoni "Usa Skill" e "Accetta Contratto"
        $(document).on('click', '[data-skill-name]', (e) => {
            if ($(e.currentTarget).data('skill-name')) {
                this.handleUseSkill(e);
            }
        });
        $(document).on('click', '.accept-contract-btn', (e) => this.handleAcceptContract(e));
        
        // Admin event listeners
        $('#admin-refresh-btn').on('click', () => this.loadAdminData());
        $('#admin-toggle-users-btn').on('click', () => $('#admin-users-section').toggleClass('hidden'));
        $('#admin-toggle-contracts-btn').on('click', () => $('#admin-contracts-section').toggleClass('hidden'));
        
        // Admin user actions
        $(document).on('click', '.edit-user-btn', (e) => {
            const userId = $(e.currentTarget).data('user-id');
            $(`.edit-user-row[data-user-id="${userId}"]`).toggleClass('hidden');
        });
        
        $(document).on('click', '.cancel-edit-btn', (e) => {
            const userId = $(e.currentTarget).data('user-id');
            $(`.edit-user-row[data-user-id="${userId}"]`).addClass('hidden');
        });
        
        $(document).on('click', '.save-user-btn', (e) => {
            const userId = $(e.currentTarget).data('user-id');
            this.handleUpdateUser(userId);
        });
        
        $(document).on('click', '.delete-user-btn', (e) => {
            const userId = $(e.currentTarget).data('user-id');
            this.handleDeleteUser(userId);
        });
        
        // Admin contract actions
        $(document).on('click', '.edit-contract-btn', (e) => {
            const contractId = $(e.currentTarget).data('contract-id');
            $(`.edit-contract-row[data-contract-id="${contractId}"]`).toggleClass('hidden');
        });
        
        $(document).on('click', '.cancel-edit-contract-btn', (e) => {
            const contractId = $(e.currentTarget).data('contract-id');
            $(`.edit-contract-row[data-contract-id="${contractId}"]`).addClass('hidden');
        });
        
        $(document).on('click', '.save-contract-btn', (e) => {
            const contractId = $(e.currentTarget).data('contract-id');
            this.handleUpdateContract(contractId);
        });
        
        $(document).on('click', '.delete-contract-btn', (e) => {
            const contractId = $(e.currentTarget).data('contract-id');
            this.handleDeleteContract(contractId);
        });
    }
    
    // Admin methods
    async loadAdminData() {
        if (!this.isAdmin || !this.currentUserId) return;
        
        try {
            await Promise.all([
                this.loadAdminUsers(),
                this.loadAdminContracts()
            ]);
        } catch (error) {
            this.ui.setMessage('admin-message', `Errore nel caricamento dati admin: ${error.message}`, 'error');
        }
    }
    
    async loadAdminUsers() {
        this.ui.showAdminUsersLoading();
        try {
            const response = await this.api.getAdminUsers(this.currentUserId);
            // Response can be {users: [...]} or just [...]
            const users = response.users || (Array.isArray(response) ? response : []);
            this.ui.renderAdminUsers(users);
            this.ui.hideAdminUsersLoading();
        } catch (error) {
            this.ui.hideAdminUsersLoading();
            this.ui.setMessage('admin-message', `Errore nel caricamento utenti: ${error.message}`, 'error');
        }
    }
    
    async loadAdminContracts() {
        this.ui.showAdminContractsLoading();
        try {
            const response = await this.api.getAdminContracts(this.currentUserId);
            // Response can be {contracts: [...]} or just [...]
            const contracts = response.contracts || (Array.isArray(response) ? response : []);
            this.ui.renderAdminContracts(contracts);
            this.ui.hideAdminContractsLoading();
        } catch (error) {
            this.ui.hideAdminContractsLoading();
            this.ui.setMessage('admin-message', `Errore nel caricamento contratti: ${error.message}`, 'error');
        }
    }
    
    async handleUpdateUser(userId) {
        if (!this.isAdmin || !this.currentUserId) return;
        
        const row = $(`.edit-user-row[data-user-id="${userId}"]`);
        const username = row.find('.edit-username').val().trim();
        const isAdmin = row.find('.edit-admin').is(':checked');
        
        if (!username) {
            this.ui.setMessage('admin-message', 'Il username è obbligatorio.', 'error');
            return;
        }
        
        try {
            await this.api.updateUser(this.currentUserId, userId, {
                username: username,
                admin: isAdmin
            });
            this.ui.setMessage('admin-message', 'Utente aggiornato con successo.', 'success');
            row.addClass('hidden');
            this.loadAdminUsers();
        } catch (error) {
            this.ui.setMessage('admin-message', `Errore nell'aggiornamento: ${error.message}`, 'error');
        }
    }
    
    async handleDeleteUser(userId) {
        if (!this.isAdmin || !this.currentUserId) return;
        
        if (!confirm(`Sei sicuro di voler eliminare l'utente ${userId}?`)) return;
        
        try {
            await this.api.deleteUser(this.currentUserId, userId);
            this.ui.setMessage('admin-message', 'Utente eliminato con successo.', 'success');
            this.loadAdminUsers();
        } catch (error) {
            this.ui.setMessage('admin-message', `Errore nell'eliminazione: ${error.message}`, 'error');
        }
    }
    
    async handleUpdateContract(contractId) {
        if (!this.isAdmin || !this.currentUserId) return;
        
        const row = $(`.edit-contract-row[data-contract-id="${contractId}"]`);
        const title = row.find('.edit-contract-title').val().trim();
        const level = parseInt(row.find('.edit-contract-level').val());
        const reward = parseInt(row.find('.edit-contract-reward').val());
        const status = row.find('.edit-contract-status').val();
        
        if (!title || isNaN(level) || isNaN(reward)) {
            this.ui.setMessage('admin-message', 'Compila tutti i campi correttamente.', 'error');
            return;
        }
        
        try {
            await this.api.updateContract(this.currentUserId, contractId, {
                title: title,
                required_level: level,
                reward_amount: reward,
                status: status
            });
            this.ui.setMessage('admin-message', 'Contratto aggiornato con successo.', 'success');
            row.addClass('hidden');
            this.loadAdminContracts();
        } catch (error) {
            this.ui.setMessage('admin-message', `Errore nell'aggiornamento: ${error.message}`, 'error');
        }
    }
    
    async handleDeleteContract(contractId) {
        if (!this.isAdmin || !this.currentUserId) return;
        
        if (!confirm(`Sei sicuro di voler eliminare il contratto ${contractId}?`)) return;
        
        try {
            await this.api.deleteContract(this.currentUserId, contractId);
            this.ui.setMessage('admin-message', 'Contratto eliminato con successo.', 'success');
            this.loadAdminContracts();
        } catch (error) {
            this.ui.setMessage('admin-message', `Errore nell'eliminazione: ${error.message}`, 'error');
        }
    }
}

// Avvia l'applicazione all'avvio del documento
$(document).ready(() => {
    new AppController();
});