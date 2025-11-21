/**
 * Entry point dell'applicazione - coordina i moduli
 */
class App {
    constructor() {
        try {
            // Inizializza i servizi core
            this.state = new StateManager();
            this.router = new Router();
            this.api = new ApiManager();
            this.messages = new MessageRenderer();

            // Inizializza i renderer
            const profileRenderer = new ProfileRenderer();
            const equipmentRenderer = new EquipmentRenderer();
            const contractsRenderer = new ContractsRenderer();
            const adminRenderer = new AdminRenderer();

            // Inizializza le pagine
            this.authPage = new AuthPage(this.api, this.state, this.messages, this.router, adminRenderer);
            this.profilePage = new ProfilePage(this.api, this.state, this.messages, profileRenderer, equipmentRenderer, this.router);
            this.contractsPage = new ContractsPage(this.api, this.state, this.messages, contractsRenderer);
            this.adminPage = new AdminPage(this.api, this.state, this.messages, adminRenderer);

            // Registra le pagine nel router
            this.router.registerPage('auth', this.authPage);
            this.router.registerPage('profile', this.profilePage);
            this.router.registerPage('contracts', this.contractsPage);
            this.router.registerPage('admin', this.adminPage);

            $('#admin-panel-btn').on('click', () => {
                this.router.navigateTo('admin');
            });

            // Mostra/nascondi sezione admin in base ai permessi
            adminRenderer.showAdminSection(this.state.getIsAdmin());

            // Avvia l'app
            this.init();
        } catch (error) {
            // Mostra un messaggio all'utente se possibile
            if (typeof $ !== 'undefined' && $('#login-message').length) {
                $('#login-message').text('Errore durante il caricamento dell\'applicazione. Ricarica la pagina.').addClass('bg-red-100 text-red-800').removeClass('hidden');
            }
        }
    }

    init() {
        if (this.state.getUserId()) {
            this.router.navigateTo('profile');
        } else {
            this.router.navigateTo('auth');
        }
    }
}

// Avvia l'applicazione all'avvio del documento
$(document).ready(() => {
    // Filtra gli errori delle estensioni del browser (innocui)
    window.addEventListener('error', (event) => {
        if (event.filename && (
            event.filename.includes('chrome-extension://') ||
            event.filename.includes('content_script.js') ||
            event.filename.includes('moz-extension://')
        )) {
            event.preventDefault();
            return false;
        }
    }, true);

    try {
        // Verifica che tutte le dipendenze siano caricate
        if (typeof StateManager === 'undefined' || typeof Router === 'undefined' || 
            typeof ApiManager === 'undefined' || typeof MessageRenderer === 'undefined') {
            alert('Errore: alcune dipendenze non sono state caricate. Verifica l\'ordine degli script in index.html');
            return;
        }
        
        new App();
    } catch (error) {
        alert('Errore durante il caricamento dell\'applicazione. Ricarica la pagina.');
    }
});
