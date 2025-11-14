/**
 * Gestisce solo le funzionalità admin
 */
class AdminPage {
    constructor(api, stateManager, messageRenderer, adminRenderer) {
        this.api = api;
        this.state = stateManager;
        this.messages = messageRenderer;
        this.adminRenderer = adminRenderer;
        this.setupEventListeners();
    }

    setupEventListeners() {
        $('#admin-panel-btn').on('click', () => {
            const isNowVisible = this.adminRenderer.toggleAdminModal();
            // Carica i dati quando si apre il modal (quando diventa visibile)
            if (isNowVisible) {
                this.loadAdminData();
            }
        });
        $('#close-admin-btn').on('click', () => this.adminRenderer.closeAdminModal());
        $('#admin-section').on('click', (e) => {
            if (e.target.id === 'admin-section') {
                this.adminRenderer.closeAdminModal();
            }
        });

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

    async loadAdminData() {
        if (!this.state.getIsAdmin() || !this.state.getUserId()) return;
        
        try {
            await Promise.all([
                this.loadAdminUsers(),
                this.loadAdminContracts()
            ]);
        } catch (error) {
            this.messages.setMessage('admin-message', `Errore nel caricamento dati admin: ${error.message}`, 'error');
        }
    }

    async loadAdminUsers() {
        this.adminRenderer.showAdminUsersLoading();
        try {
            const response = await this.api.getAdminUsers(this.state.getUserId());
            const users = response.users || (Array.isArray(response) ? response : []);
            this.adminRenderer.renderAdminUsers(users);
            this.adminRenderer.hideAdminUsersLoading();
        } catch (error) {
            this.adminRenderer.hideAdminUsersLoading();
            this.messages.setMessage('admin-message', `Errore nel caricamento utenti: ${error.message}`, 'error');
        }
    }

    async loadAdminContracts() {
        this.adminRenderer.showAdminContractsLoading();
        try {
            const response = await this.api.getAdminContracts(this.state.getUserId());
            const contracts = response.contracts || (Array.isArray(response) ? response : []);
            this.adminRenderer.renderAdminContracts(contracts);
            this.adminRenderer.hideAdminContractsLoading();
        } catch (error) {
            this.adminRenderer.hideAdminContractsLoading();
            this.messages.setMessage('admin-message', `Errore nel caricamento contratti: ${error.message}`, 'error');
        }
    }

    async handleUpdateUser(userId) {
        if (!this.state.getIsAdmin() || !this.state.getUserId()) return;
        
        const row = $(`.edit-user-row[data-user-id="${userId}"]`);
        const username = row.find('.edit-username').val().trim();
        const isAdmin = row.find('.edit-admin').is(':checked');
        
        if (!username) {
            this.messages.setMessage('admin-message', 'Il username è obbligatorio.', 'error');
            return;
        }
        
        try {
            await this.api.updateUser(this.state.getUserId(), userId, {
                username: username,
                admin: isAdmin
            });
            this.messages.setMessage('admin-message', 'Utente aggiornato con successo.', 'success');
            row.addClass('hidden');
            this.loadAdminUsers();
        } catch (error) {
            this.messages.setMessage('admin-message', `Errore nell'aggiornamento: ${error.message}`, 'error');
        }
    }

    async handleDeleteUser(userId) {
        if (!this.state.getIsAdmin() || !this.state.getUserId()) return;
        
        if (!confirm(`Sei sicuro di voler eliminare l'utente ${userId}?`)) return;
        
        try {
            await this.api.deleteUser(this.state.getUserId(), userId);
            this.messages.setMessage('admin-message', 'Utente eliminato con successo.', 'success');
            this.loadAdminUsers();
        } catch (error) {
            this.messages.setMessage('admin-message', `Errore nell'eliminazione: ${error.message}`, 'error');
        }
    }

    async handleUpdateContract(contractId) {
        if (!this.state.getIsAdmin() || !this.state.getUserId()) return;
        
        const row = $(`.edit-contract-row[data-contract-id="${contractId}"]`);
        const title = row.find('.edit-contract-title').val().trim();
        const level = parseInt(row.find('.edit-contract-level').val());
        const reward = parseInt(row.find('.edit-contract-reward').val());
        const status = row.find('.edit-contract-status').val();
        
        if (!title || isNaN(level) || isNaN(reward)) {
            this.messages.setMessage('admin-message', 'Compila tutti i campi correttamente.', 'error');
            return;
        }
        
        try {
            await this.api.updateContract(this.state.getUserId(), contractId, {
                title: title,
                required_level: level,
                reward_amount: reward,
                status: status
            });
            this.messages.setMessage('admin-message', 'Contratto aggiornato con successo.', 'success');
            row.addClass('hidden');
            this.loadAdminContracts();
        } catch (error) {
            this.messages.setMessage('admin-message', `Errore nell'aggiornamento: ${error.message}`, 'error');
        }
    }

    async handleDeleteContract(contractId) {
        if (!this.state.getIsAdmin() || !this.state.getUserId()) return;
        
        if (!confirm(`Sei sicuro di voler eliminare il contratto ${contractId}?`)) return;
        
        try {
            await this.api.deleteContract(this.state.getUserId(), contractId);
            this.messages.setMessage('admin-message', 'Contratto eliminato con successo.', 'success');
            this.loadAdminContracts();
        } catch (error) {
            this.messages.setMessage('admin-message', `Errore nell'eliminazione: ${error.message}`, 'error');
        }
    }

    onEnter() {
        if (this.state.getIsAdmin()) {
            this.loadAdminData();
        }
    }
}

