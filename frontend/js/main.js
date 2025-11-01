class AppController {
    constructor() {
        // Inizializza i gestori
        this.api = new ApiManager();
        this.ui = new UIManager();
        
        // Stato dell'applicazione
        this.currentUserId = null;
        this.availableSkills = []; // Le skill dell'utente per il controllo in locale

        this.init();
    }

    /**
     * Inizializza l'applicazione: controlla la sessione, imposta i listener.
     */
    init() {
        // 1. Controlla l'accesso precedente
        this.currentUserId = localStorage.getItem('echi_di_aethel_user_id');
        if (this.currentUserId) {
            this.ui.showAppSections();
            this.loadProfileAndContracts(this.currentUserId);
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
            localStorage.setItem('echi_di_aethel_user_id', this.currentUserId);
            this.ui.showAppSections();
            this.loadProfileAndContracts(this.currentUserId);
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
            localStorage.removeItem('echi_di_aethel_user_id');
            this.ui.toggleLoginForms(true); // Torna al form di login
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
        $('#toggle-create-form-btn').on('click', () => $('#contract-create').slideToggle());
        $('#create-contract-btn').on('click', () => this.handleCreateContract());
        
        // Delegazione Eventi Dinamici (IMPORTANTE per elementi creati dinamicamente)
        // Usa la delegazione su un genitore statico (es. document) per i bottoni "Usa Skill" e "Accetta Contratto"
        $(document).on('click', '.use-skill-btn', (e) => this.handleUseSkill(e));
        $(document).on('click', '.accept-contract-btn', (e) => this.handleAcceptContract(e));
    }
}

// Avvia l'applicazione all'avvio del documento
$(document).ready(() => {
    new AppController();
});