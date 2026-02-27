/**
 * Gestisce solo le funzionalità admin
 */
class AdminPage {
    constructor(api, stateManager, messageRenderer, adminRenderer, router) {
        this.api = api;
        this.state = stateManager;
        this.messages = messageRenderer;
        this.adminRenderer = adminRenderer;
        this.router = this.router;
        this.setupEventListeners();
    }

    setupEventListeners() {
        $(document).on('click', '#admin-refresh-btn', () => this.loadAdminData());
        $(document).on('click', '#admin-toggle-users-btn', () => $('#admin-users-section').toggleClass('hidden'));
        $(document).on('click', '#admin-toggle-contracts-btn', () => $('#admin-contracts-section').toggleClass('hidden'));
        $(document).on('click', '#admin-toggle-skills-btn', () => $('#admin-skills-section').toggleClass('hidden'));

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

        $(document).on('click', '.toggle-skill-parent', (e) => {
            const parentId = $(e.currentTarget).data('skill-id');
            $(`.skill-children-row[data-parent-id="${parentId}"]`).toggleClass('hidden');
            $(e.currentTarget).find('.caret-icon').text($(e.currentTarget).find('.caret-icon').text() === '▶' ? '▼' : '▶');
        });

        $(document).on('click', '.edit-skill-btn', (e) => {
            const skillId = $(e.currentTarget).data('skill-id');
            $(`.edit-skill-row[data-skill-id="${skillId}"]`).toggleClass('hidden');
        });
        $(document).on('click', '.save-skill-btn', (e) => this.handleUpdateSkill($(e.currentTarget).data('skill-id')));
        $(document).on('click', '.delete-skill-btn', (e) => this.handleDeleteSkill($(e.currentTarget).data('skill-id')));

        $(document).on('click', '.cancel-edit-btn', (e) => $(`.edit-skill-row[data-skill-id="${$(e.currentTarget).data('skill-id')}"]`).addClass('hidden'));
    }

    async loadAdminData() {
        if (!this.state.getIsAdmin() || !this.state.getUserId()) return;

        try {
            await Promise.all([
                this.loadAdminUsers(),
                this.loadAdminContracts(),
                this.loadAdminSkills()
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

    async loadAdminSkills() {
        this.adminRenderer.showAdminSkillsLoading();
        try {
            const response = await this.api.getAdminSkills(this.state.getUserId());
            const skillsHierarchy = response.skills || (Array.isArray(response) ? response : []);
            const availableParents = response.availableParents || [];
            this.adminRenderer.renderAdminSkills(skillsHierarchy, availableParents);
            this.adminRenderer.hideAdminSkillsLoading();
        } catch (error) {
            this.adminRenderer.hideAdminSkillsLoading();
            this.messages.setMessage('admin-message', `Errore nel caricamento skill: ${error.message}`, 'error');
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

    async handleUpdateSkill(skillId) {
        if (!this.state.getIsAdmin() || !this.state.getUserId()) return;

        const row = $(`.edit-skill-row[data-skill-id="${skillId}"]`);
        const name = row.find('.edit-skill-name').val().trim();
        const description = row.find('.edit-skill-desc').val().trim();
        const baseClass = row.find('.edit-skill-base-class').val().trim();
        const maxLevel = parseInt(row.find('.edit-skill-max-level').val());
        const parentId = row.find('.edit-skill-parent').val() || null;

        if (!name || !description || !baseClass || isNaN(maxLevel)) {
            this.messages.setMessage('admin-message', 'Compila tutti i campi correttamente.', 'error');
            return;
        }

        try {
            await this.api.updateSkill(this.state.getUserId(), skillId, {
                name: name,
                description: description,
                base_class: baseClass,
                max_level: maxLevel,
                parent_skill_id: parentId === "" ? null : parseInt(parentId)
            });
            this.messages.setMessage('admin-message', 'Abilità aggiornata con successo.', 'success');
            row.addClass('hidden');
            this.loadAdminSkills();
        } catch (error) {
            this.messages.setMessage('admin-message', `Errore nell'aggiornamento: ${error.message}`, 'error');
        }
    }

    async handleDeleteSkill(skillId) {
        if (!this.state.getIsAdmin() || !this.state.getUserId()) return;

        if (!confirm(`Sei sicuro di voler eliminare l'abilità ${skillId}?`)) return;

        try {
            await this.api.deleteSkill(this.state.getUserId(), skillId);
            this.messages.setMessage('admin-message', 'Abilità eliminata con successo.', 'success');
            this.loadAdminSkills();
        } catch (error) {
            this.messages.setMessage('admin-message', `Errore nell'eliminazione: ${error.message}`, 'error');
        }
    }

    onEnter() {
        if (this.state.getIsAdmin()) {
            this.loadAdminData();
        } else {
            this.messages.setMessage('action-message', 'Accesso negato. Privilegi di Admin richiesti.', 'error');
            this.router.navigateTo('profile');
        }
    }
}

