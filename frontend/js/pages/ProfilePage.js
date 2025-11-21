/**
 * Gestisce solo il profilo, skills, equipment e inventory
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
        $(document).on('click', '[data-skill-name]', (e) => {
            if ($(e.currentTarget).data('skill-name')) {
                this.handleUseSkill(e);
            }
        });
        $(document).on('click', '.inventory-item', (e) => {
            this.handleEquipItem(e);
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

            const equipmentResponse = await this.api.getUserEquipment(userId);
            this.equipmentRenderer.renderEquipment(equipmentResponse.equipment || []);

            const resourcesResponse = await this.api.getUserResources(userId);
            this.equipmentRenderer.renderResources(resourcesResponse.resources || []);

            const inventoryResponse = await this.api.getUserInventory(userId);
            this.equipmentRenderer.renderInventory(inventoryResponse.inventory || []);

            this.profileRenderer.hideLoading();
        } catch (error) {
            this.profileRenderer.hideLoading();
            this.messages.setMessage('login-message', `Errore nel caricamento: ${error.message}`, 'error');
        }
    }

    async handleUseSkill(event) {
        const userId = this.state.getUserId();
        if (!userId) return;
        
        const skillName = $(event.currentTarget).data('skill-name');
        this.messages.setMessage('action-message', `Esecuzione di ${skillName}...`, 'loading');

        try {
            const response = await this.api.useSkill(userId, skillName, 5);
            const type = response.level_up ? 'success' : 'default';
            this.messages.setMessage('action-message', response.message, type);
            this.loadProfile();
        } catch (error) {
            this.messages.setMessage('action-message', `Errore nell'azione: ${error.message}`, 'error');
        }
    }

    async handleEquipItem(event) {
        const userId = this.state.getUserId();
        if (!userId) return;
        
        const itemId = $(event.currentTarget).data('item-id');
        this.messages.setMessage('action-message', 'Equipaggiamento in corso...', 'loading');

        try {
            const response = await this.api.equipItem(userId, itemId);
            this.messages.setMessage('action-message', response.message, 'success');
            this.loadProfile();
        } catch (error) {
            this.messages.setMessage('action-message', `Errore nell'equipaggiamento: ${error.message}`, 'error');
        }
    }

    onEnter() {
        const userId = this.state.getUserId();
        if (!userId) {
            this.router.navigateTo('auth');
            return;
        }
        
        $('#admin-page-content').addClass('hidden');
        $('#contract-board').removeClass('hidden');
        
        this.loadProfile();
    }
}

