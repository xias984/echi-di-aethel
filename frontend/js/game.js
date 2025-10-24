/**
 * Game Logic Module
 * Handles all game-specific logic and business rules
 */
class GameService {
    constructor(apiService, uiService, stateManager) {
        this.api = apiService;
        this.ui = uiService;
        this.state = stateManager;
    }

    /**
     * Initialize the game
     */
    async initialize() {
        this.state.initializeFromStorage();
        
        const currentUserId = this.state.getState().currentUserId;
        if (currentUserId) {
            await this.loadUserProfile(currentUserId);
        } else {
            this.ui.toggleUserSections(false);
        }
    }

    /**
     * Create a new user
     * @param {string} username - Username
     */
    async createUser(username) {
        if (!username || username.trim() === '') {
            this.ui.showMessage('message', 'Inserisci un nome utente valido.', 'error');
            return;
        }

        this.ui.showMessage('message', 'Creazione in corso...', 'default');
        this.state.setLoading(true);

        const response = await this.api.createUser(username.trim());
        
        if (response.success) {
            this.ui.showMessage('message', response.data.message, 'success');
            this.state.setCurrentUser(response.data.user_id);
            await this.loadUserProfile(response.data.user_id);
        } else {
            this.ui.showMessage('message', `Errore: ${response.error}`, 'error');
        }
        
        this.state.setLoading(false);
    }

    /**
     * Load user profile and related data
     * @param {string} userId - User ID
     */
    async loadUserProfile(userId) {
        this.state.setLoading(true);
        this.state.setError(null);

        try {
            const response = await this.api.getUserProfile(userId);
            
            if (response.success) {
                this.state.setUserProfile(response.data);
                this.ui.updateProfile(response.data);
                this.ui.renderSkills(response.data.skills, (skillName) => this.useSkill(skillName));
                this.ui.populateSkillDropdown(this.state.getState().availableSkills);
                
                // Show user sections
                this.ui.toggleUserSections(true);
                
                // Load contracts
                await this.loadContracts(userId);
            } else {
                this.ui.showMessage('message', 'Errore nel caricamento del profilo.', 'error');
                this.state.setError(response.error);
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            this.ui.showMessage('message', 'Errore nel caricamento del profilo.', 'error');
            this.state.setError(error.message);
        } finally {
            this.state.setLoading(false);
        }
    }

    /**
     * Use a skill
     * @param {string} skillName - Skill name
     */
    async useSkill(skillName) {
        const currentUserId = this.state.getState().currentUserId;
        if (!currentUserId) return;

        this.ui.showMessage('action-message', `Esecuzione di ${skillName}...`, 'default');

        const response = await this.api.useSkill(currentUserId, skillName);
        
        if (response.success) {
            const messageType = response.data.level_up ? 'success' : 'default';
            this.ui.showMessage('action-message', response.data.message, messageType);
            
            // Reload profile to update skills
            await this.loadUserProfile(currentUserId);
        } else {
            this.ui.showMessage('action-message', `Errore nell'azione: ${response.error}`, 'error');
        }
    }

    /**
     * Load contracts for the current user
     * @param {string} userId - User ID
     */
    async loadContracts(userId) {
        const contractsContainer = document.getElementById('contracts-list-output');
        if (contractsContainer) {
            contractsContainer.innerHTML = 'Caricamento contratti filtrati...';
        }

        const response = await this.api.getContracts(userId);
        
        if (response.success) {
            this.state.setContracts(response.data);
            this.ui.renderContracts(
                response.data, 
                userId, 
                (contractId) => this.acceptContract(contractId)
            );
        } else {
            console.error('Error loading contracts:', response.error);
            if (contractsContainer) {
                contractsContainer.innerHTML = '<p class="text-center text-red-500">Errore nel caricamento della bacheca.</p>';
            }
        }
    }

    /**
     * Accept a contract
     * @param {string} contractId - Contract ID
     */
    async acceptContract(contractId) {
        if (!confirm("Sei sicuro di voler accettare questo contratto?")) {
            return;
        }

        const currentUserId = this.state.getState().currentUserId;
        if (!currentUserId) return;

        this.ui.showMessage('contract-message', 'Accettazione in corso...', 'default');

        const response = await this.api.acceptContract(contractId, currentUserId);
        
        if (response.success) {
            this.ui.showMessage('contract-message', response.data.message, 'success');
            
            // Update contract in state
            this.state.updateContract(contractId, { status: 'ACCEPTED' });
            
            // Reload contracts to reflect changes
            await this.loadContracts(currentUserId);
        } else {
            this.ui.showMessage('contract-message', `Errore: ${response.error}`, 'error');
        }
    }

    /**
     * Create a new contract
     * @param {Object} contractData - Contract form data
     */
    async createContract(contractData) {
        const { title, skillName, level, reward } = contractData;
        
        // Validation
        if (!title || !skillName || !level || !reward || reward <= 0) {
            this.ui.showMessage('contract-message', 'Compila tutti i campi correttamente.', 'error');
            return;
        }

        const currentUserId = this.state.getState().currentUserId;
        if (!currentUserId) return;

        this.ui.showMessage('contract-message', 'Pubblicazione in corso (Escrow)...', 'default');

        const contractPayload = {
            proposer_id: currentUserId,
            title: title.trim(),
            required_skill_name: skillName,
            required_level: parseInt(level),
            reward_amount: parseInt(reward)
        };

        const response = await this.api.createContract(contractPayload);
        
        if (response.success) {
            this.ui.showMessage('contract-message', response.data.message, 'success');
            
            // Hide contract creation form
            this.ui.toggleElement('contract-create', false);
            
            // Add new contract to state
            this.state.addContract(response.data.contract);
            
            // Reload contracts
            await this.loadContracts(currentUserId);
        } else {
            this.ui.showMessage('contract-message', `Errore di pubblicazione: ${response.error}`, 'error');
        }
    }

    /**
     * Refresh user data
     */
    async refreshUserData() {
        const currentUserId = this.state.getState().currentUserId;
        if (currentUserId) {
            await this.loadUserProfile(currentUserId);
        }
    }

    /**
     * Logout user
     */
    logout() {
        this.state.clearState();
        this.ui.toggleUserSections(false);
        this.ui.clearForm('creation-form');
    }

    /**
     * Get form data for contract creation
     * @returns {Object} Form data
     */
    getContractFormData() {
        return {
            title: document.getElementById('contract-title')?.value || '',
            skillName: document.getElementById('required-skill-name')?.value || '',
            level: document.getElementById('required-level')?.value || '',
            reward: document.getElementById('reward-amount')?.value || ''
        };
    }

    /**
     * Validate contract form
     * @param {Object} formData - Form data
     * @returns {Object} Validation result
     */
    validateContractForm(formData) {
        const errors = [];
        
        if (!formData.title.trim()) {
            errors.push('Il titolo è obbligatorio');
        }
        
        if (!formData.skillName) {
            errors.push('Seleziona un mestiere richiesto');
        }
        
        if (!formData.level || isNaN(formData.level) || parseInt(formData.level) < CONFIG.GAME.MIN_CONTRACT_LEVEL) {
            errors.push('Il livello deve essere un numero valido');
        }
        
        if (!formData.reward || isNaN(formData.reward) || parseInt(formData.reward) < CONFIG.GAME.MIN_CONTRACT_REWARD) {
            errors.push('La ricompensa deve essere un numero valido');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameService;
}
