/**
 * Gestisce solo il profilo e il caricamento iniziale dei dati
 */
class ProfilePage {
    constructor(api, stateManager, messageRenderer, profileRenderer, equipmentRenderer, router) {
        this.api = api;
        this.state = stateManager;
        this.messages = messageRenderer;
        this.profileRenderer = profileRenderer;
        this.equipmentRenderer = equipmentRenderer;
        this.router = router;
        this.setupEventListeners();
    }

    setupEventListeners() {
        $('#refresh-btn').on('click', () => this.loadProfile());
        $('#nav-contracts-btn').on('click', () => {
            if (this.router.pages['contracts']) {
                this.router.navigateTo('contracts');
            }
        });
        $('#nav-crafting-btn').on('click', () => {
            if (this.router.pages['crafting']) {
                this.router.navigateTo('crafting');
            }
        });
        $('#nav-inventory-btn').on('click', () => {
            if (this.router.pages['inventory']) {
                this.router.navigateTo('inventory');
            }
        });
        $('#nav-statistics-btn').on('click', () => {
            if (this.router.pages['statistics']) {
                this.router.navigateTo('statistics');
            }
        });
    }

    async loadProfile() {
        const userId = this.state.getUserId();
        if (!userId) return;

        this.profileRenderer.showLoading();

        try {
            const profile = await this.api.getProfile(userId);
            const skills = this.profileRenderer.renderProfile(profile);
            this.state.setSkills(skills);

            // Carica anche i contratti quando si carica il profilo
            const contracts = await this.api.getContracts(userId);
            if (this.router.pages['contracts']) {
                this.router.pages['contracts'].renderContracts(contracts, userId);
            }

            // Aggiorna anche le altre pagine se sono già state caricate
            if (this.router.pages['inventory']) {
                this.router.pages['inventory'].loadInventory();
            }
            if (this.router.pages['statistics']) {
                this.router.pages['statistics'].loadStatistics();
            }

            this.profileRenderer.hideLoading();
        } catch (error) {
            this.profileRenderer.hideLoading();
            this.messages.setMessage('login-message', `Errore nel caricamento: ${error.message}`, 'error');
        }
    }

    onEnter() {
        // Nascondi tutti gli altri board
        $('#crafting-board').addClass('hidden').css('display', 'none');
        $('#inventory-board').addClass('hidden').css('display', 'none');
        $('#statistics-board').addClass('hidden').css('display', 'none');
        $('#welcome-message').addClass('hidden');
        
        // Mostra il contract board (rimuovi sia classe che stile inline)
        $('#contract-board').removeClass('hidden').css('display', '');
        this.loadProfile();
    }
}

