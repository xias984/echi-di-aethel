/**
 * Gestisce la navigazione tra le pagine
 */
class Router {
    constructor() {
        this.currentPage = null;
        this.pages = {};
    }

    registerPage(name, pageInstance) {
        this.pages[name] = pageInstance;
    }

    navigateTo(pageName) {
        if (this.currentPage && this.currentPage.onLeave) {
            this.currentPage.onLeave();
        }

        const page = this.pages[pageName];
        if (page) {
            this.currentPage = page;
            if (page.onEnter) {
                page.onEnter();
            }
        }
    }

    getCurrentPage() {
        return this.currentPage;
    }
}

