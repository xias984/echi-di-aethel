/**
 * Gestisce la navigazione tra le pagine dinamicamente caricando le viste HTML
 */
class Router {
    constructor() {
        this.currentPage = null;
        this.pages = {};
        this.viewCache = {}; // Cache per non riscaricare le viste
        this.containerId = '#view-container';
        this.loadingId = '#profile-loading';
    }

    registerPage(name, pageInstance) {
        this.pages[name] = pageInstance;
    }

    async navigateTo(pageName) {
        if (this.currentPage && this.currentPage.onLeave) {
            this.currentPage.onLeave();
        }

        const page = this.pages[pageName];
        if (page) {
            this.currentPage = page;

            // Mostra loading
            $(this.loadingId).removeClass('hidden');
            $(this.containerId).html('');

            try {
                // Carica la vista (dalla cache o dal server)
                if (!this.viewCache[pageName]) {
                    const response = await fetch(`views/${pageName}.html`);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    this.viewCache[pageName] = await response.text();
                }

                // Inietta l'HTML
                $(this.containerId).html(this.viewCache[pageName]);

            } catch (error) {
                console.error('Errore durante il caricamento della vista:', error);
                $(this.containerId).html(`<div class="p-5 text-center text-red-600 bg-red-100 rounded-lg border border-red-300">Errore caricamento vista ${pageName}</div>`);
            } finally {
                $(this.loadingId).addClass('hidden');
            }

            if (page.onEnter) {
                page.onEnter();
            }
        } else {
            console.error(`Page ${pageName} not found`);
        }
    }

    getCurrentPage() {
        return this.currentPage;
    }
}

