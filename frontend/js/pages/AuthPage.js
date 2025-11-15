/**
 * Gestisce solo l'autenticazione (login, registrazione, logout)
 */
class AuthPage {
    constructor(api, stateManager, messageRenderer, router, adminRenderer) {
        this.api = api;
        this.state = stateManager;
        this.messages = messageRenderer;
        this.router = router;
        this.adminRenderer = adminRenderer;
        this.setupEventListeners();
    }

    setupEventListeners() {
        $('#login-btn').on('click', () => this.handleLogin());
        $('#login-username').on('keypress', (e) => { if (e.which === 13) this.handleLogin(); });
        $('#create-btn').on('click', () => this.handleCreateUser());
        $('#username').on('keypress', (e) => { if (e.which === 13) this.handleCreateUser(); });
        $('#show-create-link').on('click', () => this.toggleLoginForms(false));
        $('#show-login-link').on('click', () => this.toggleLoginForms(true));
        $('#logout-btn').on('click', () => this.handleLogout());
    }

    toggleLoginForms(showLogin) {
        if (showLogin) {
            $('#login-form').removeClass('hidden');
            $('#creation-form').addClass('hidden');
        } else {
            $('#login-form').addClass('hidden');
            $('#creation-form').removeClass('hidden');
        }
        $('#sidebar').addClass('hidden');
        $('#contract-board').addClass('hidden');
        $('#welcome-message').removeClass('hidden');
        $('#user-menu').addClass('hidden');
    }

    showAppSections() {
        $('#login-form').addClass('hidden');
        $('#creation-form').addClass('hidden');
        $('#user-menu').removeClass('hidden');
        $('#sidebar').removeClass('hidden');
        $('#welcome-message').addClass('hidden');
        
        // Nascondi tutti i board tranne quello che verrà mostrato dalla pagina
        $('#crafting-board').addClass('hidden').css('display', 'none');
        $('#inventory-board').addClass('hidden').css('display', 'none');
        $('#statistics-board').addClass('hidden').css('display', 'none');
        // Il contract-board verrà mostrato da ProfilePage.onEnter()
    }

    async handleLogin() {
        const username = $('#login-username').val().trim();
        if (!username) {
            this.messages.setMessage('login-message', "Inserisci un nome utente valido.", 'error');
            return;
        }

        this.messages.setMessage('login-message', 'Accesso in corso...', 'loading');

        try {
            const response = await this.api.login(username);
            this.messages.setMessage('login-message', response.message, 'success');
            this.state.setUser(response.user_id, response.admin || false);
            this.showAppSections();
            if (this.adminRenderer) {
                this.adminRenderer.showAdminSection(response.admin || false);
            }
            this.router.navigateTo('profile');
        } catch (error) {
            this.messages.setMessage('login-message', `Errore: ${error.message}`, 'error');
        }
    }

    async handleCreateUser() {
        const username = $('#username').val().trim();
        if (!username) {
            this.messages.setMessage('message', "Inserisci un nome utente valido.", 'error');
            return;
        }

        this.messages.setMessage('message', "Creazione in corso...", 'loading');

        try {
            const response = await this.api.createUser(username);
            this.messages.setMessage('message', response.message, 'success');
            this.state.setUser(response.user_id, false);
            this.showAppSections();
            if (this.adminRenderer) {
                this.adminRenderer.showAdminSection(false);
            }
            this.router.navigateTo('profile');
        } catch (error) {
            this.messages.setMessage('message', `Errore: ${error.message}`, 'error');
        }
    }

    handleLogout() {
        if (confirm('Sei sicuro di voler effettuare il logout?')) {
            this.state.clearUser();
            this.toggleLoginForms(true);
            $('#login-username').val('');
            // Nascondi il pulsante admin quando si fa logout
            if (this.adminRenderer) {
                this.adminRenderer.showAdminSection(false);
            }
            this.router.navigateTo('auth');
        }
    }

    onEnter() {
        // Nascondi tutti i board all'inizio
        $('#crafting-board').addClass('hidden');
        $('#contract-board').addClass('hidden');
        $('#inventory-board').addClass('hidden');
        $('#statistics-board').addClass('hidden');
        $('#admin-section').addClass('hidden');
        
        if (this.state.getUserId()) {
            this.showAppSections();
        } else {
            this.toggleLoginForms(true);
        }
    }
}

