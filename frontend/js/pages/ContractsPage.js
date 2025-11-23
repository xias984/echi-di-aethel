/**
 * Gestisce solo i contratti (visualizzazione e creazione)
 */
class ContractsPage {
    constructor(api, stateManager, messageRenderer, contractsRenderer) {
        this.api = api;
        this.state = stateManager;
        this.messages = messageRenderer;
        this.contractsRenderer = contractsRenderer;
        this.currentChatContractId = null;
        this.chatInterval = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        $('#toggle-create-form-btn').on('click', () => $('#contract-create').toggleClass('hidden'));
        $('#create-contract-btn').on('click', () => this.handleCreateContract());
        $(document).on('click', '.accept-contract-btn', (e) => this.handleAcceptContract(e));

        // Nuovi listeners per la Chat
        $(document).on('click', '.open-chat-btn', (e) => this.handleOpenChat(e));
        $('#close-chat-modal').on('click', () => this.handleCloseChat());
        $('#send-message-btn').on('click', () => this.handleSendMessage());
        $('#chat-input').on('keypress', (e) => { if (e.which === 13) this.handleSendMessage(); });
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

    /**
     * Apre il modale della chat e avvia l'intervallo di polling
     */
    async handleOpenChat(event) {
        const contractId = $(event.currentTarget).data('contract-id');
        const proposerId = $(event.currentTarget).data('proposer.id');
        const acceptorId = $(event.currentTarget).data('acceptor.id');
        const userId = this.state.getUserId();

        if (!userId || !contractId) return;

        this.currentChatContractId = contractId;

        // Determina il nome utente del partner (semplificazione, potrebbe richiedere un'altra chiamta API per il nome)
        const partnerName = userId == proposerId ? 'Proponente (tu)' : 'Accettatore (tu)'; // Simplificato

        $('#chat-modal').removeClass('hidden');
        $('#chat-contract-id').text(contractId);
        $('#chat-partner-name').text(partnerName);

        await this.loadMessages();

        // Avvia il polling (es. ogni 5 secondi)
        this.chatInterval = setInterval(() => this.loadMessages(), 5000);
    }

    /**
     * Chiude il modale e ferma l'intervallo
     */
    handleCloseChat() {
        $('#chat-modal').addClass('hidden');
        clearInterval(this.chatInterval);
        this.chatInterval = null;
        this.currentChatContractId = null;
        $('#chat-input').val('');
    }

    /**
     * Carica i messaggi del contratto
     */
    async loadMessages() {
        if (!this.currentChatContractId || !this.state.getUserId()) return;

        try {
            const response = await this.api.getContractMessages(this.currentChatContractId, this.state.getUserId());
            this.contractsRenderer.renderChatMessages(response.messages, this.state.getUserId());
        } catch (error) {
            // Non usare il modale generico per errori di polling, usa la console.
            console.error("Errore nel caricamento dei messaggi:", error.message); 
        }
    }

    /**
     * Invia un nuovo messaggio
     */
    async handleSendMessage() {
        const message = $('#chat-input').val().trim();
        if (!message || !this.currentChatContractId) return;

        try {
            await this.api.sendMessage(this.currentChatContractId, this.state.getUserId(), message);
            $('#chat-input').val('');
            await this.loadMessages();
        } catch (error) {
            this.messages.setMessage('contract-message', `Errore nell'invio del messaggio: ${error.message}`, 'error');
        }
    }

    /**
     * Rende i contratti nella pagina
     */
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
        $('#chat-modal').addClass('hidden');

        this.loadContracts();
    }
}

