/**
 * Gestisce solo i contratti (visualizzazione e creazione)
 */
class ContractsPage {
    constructor(api, stateManager, messageRenderer, contractsRenderer) {
        this.api = api;
        this.state = stateManager;
        this.messages = messageRenderer;
        this.contractsRenderer = contractsRenderer;
        this.setupEventListeners();
    }

    setupEventListeners() {
        $('#toggle-create-form-btn').on('click', () => $('#contract-create').toggleClass('hidden'));
        $('#create-contract-btn').on('click', () => this.handleCreateContract());
        $(document).on('click', '.accept-contract-btn', (e) => this.handleAcceptContract(e));
    }

    async loadContracts() {
        const userId = this.state.getUserId();
        if (!userId) return;

        try {
            const contracts = await this.api.getContracts(userId);
            this.renderContracts(contracts, userId);
        } catch (error) {
            this.messages.setMessage('contract-message', `Errore nel caricamento contratti: ${error.message}`, 'error');
        }
    }

    renderContracts(contracts, userId) {
        this.contractsRenderer.renderContracts(contracts, userId || this.state.getUserId());
    }

    async handleCreateContract() {
        const userId = this.state.getUserId();
        if (!userId) return;

        const title = $('#contract-title').val().trim();
        const skillName = $('#required-skill-name').val();
        const level = parseInt($('#required-level').val());
        const reward = parseInt($('#reward-amount').val());

        if (!title || !skillName || isNaN(level) || isNaN(reward) || reward <= 0) {
            this.messages.setMessage('contract-message', 'Compila tutti i campi correttamente.', 'error');
            return;
        }

        this.messages.setMessage('contract-message', 'Pubblicazione in corso (Escrow)...', 'loading');

        try {
            const response = await this.api.createContract(userId, title, skillName, level, reward);
            this.messages.setMessage('contract-message', response.message, 'success');
            this.contractsRenderer.clearForm();
            this.loadContracts();
        } catch (error) {
            this.messages.setMessage('contract-message', `Errore di pubblicazione: ${error.message}`, 'error');
        }
    }

    async handleAcceptContract(event) {
        const userId = this.state.getUserId();
        if (!userId) return;

        const contractId = $(event.currentTarget).data('contract-id');
        if (!confirm("Sei sicuro di voler accettare questo contratto?")) return;

        this.messages.setMessage('contract-message', 'Accettazione in corso...', 'loading');

        try {
            const response = await this.api.acceptContract(contractId, userId);
            this.messages.setMessage('contract-message', response.message, 'success');
            this.loadContracts();
        } catch (error) {
            this.messages.setMessage('contract-message', `Errore: ${error.message}`, 'error');
        }
    }

    onEnter() {
        const userId = this.state.getUserId();
        if (!userId) return;

        $('#admin-page-content').addClass('hidden');
        $('#character-page-content').addClass('hidden');
        $('#contract-board').removeClass('hidden');
        this.loadContracts();
    }
}

