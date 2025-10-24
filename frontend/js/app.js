/**
 * Main Application Module
 * Initializes and coordinates all application modules
 */
class App {
    constructor() {
        this.gameService = new GameService(apiService, uiService, stateManager);
        this.initializeEventListeners();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            await this.gameService.initialize();
        } catch (error) {
            console.error('Failed to initialize application:', error);
            uiService.showMessage('message', 'Errore durante l\'inizializzazione dell\'applicazione.', 'error');
        }
    }

    /**
     * Set up all event listeners
     */
    initializeEventListeners() {
        // User creation
        this.addEventListener('create-btn', 'click', () => this.handleUserCreation());
        
        // Profile refresh
        this.addEventListener('refresh-btn', 'click', () => this.handleRefresh());
        
        // Contract creation
        this.addEventListener('toggle-create-form-btn', 'click', () => this.handleToggleContractForm());
        this.addEventListener('create-contract-btn', 'click', () => this.handleCreateContract());
        
        // Form validation
        this.addEventListener('contract-title', 'input', () => this.validateContractForm());
        this.addEventListener('required-skill-name', 'change', () => this.validateContractForm());
        this.addEventListener('required-level', 'input', () => this.validateContractForm());
        this.addEventListener('reward-amount', 'input', () => this.validateContractForm());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // State change listeners
        this.setupStateListeners();
    }

    /**
     * Add event listener with error handling
     * @param {string} elementId - Element ID
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     */
    addEventListener(elementId, event, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, handler.bind(this));
        } else {
            console.warn(`Element with ID '${elementId}' not found for event '${event}'`);
        }
    }

    /**
     * Handle user creation
     */
    async handleUserCreation() {
        const usernameInput = document.getElementById('username');
        const username = usernameInput?.value?.trim();
        
        if (!username) {
            uiService.showMessage('message', 'Inserisci un nome utente valido.', 'error');
            return;
        }
        
        await this.gameService.createUser(username);
    }

    /**
     * Handle profile refresh
     */
    async handleRefresh() {
        const currentUserId = stateManager.getState().currentUserId;
        if (currentUserId) {
            await this.gameService.refreshUserData();
        }
    }

    /**
     * Handle contract form toggle
     */
    handleToggleContractForm() {
        uiService.toggleElement('contract-create', null, 'slide');
    }

    /**
     * Handle contract creation
     */
    async handleCreateContract() {
        const formData = this.gameService.getContractFormData();
        const validation = this.gameService.validateContractForm(formData);
        
        if (!validation.isValid) {
            uiService.showMessage('contract-message', validation.errors.join(', '), 'error');
            return;
        }
        
        await this.gameService.createContract(formData);
    }

    /**
     * Validate contract form in real-time
     */
    validateContractForm() {
        const formData = this.gameService.getContractFormData();
        const validation = this.gameService.validateContractForm(formData);
        
        const createButton = document.getElementById('create-contract-btn');
        if (createButton) {
            createButton.disabled = !validation.isValid;
        }
    }

    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + Enter to create user
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const createBtn = document.getElementById('create-btn');
            if (createBtn && createBtn.offsetParent !== null) {
                createBtn.click();
            }
        }
        
        // Escape to close contract form
        if (e.key === 'Escape') {
            const contractForm = document.getElementById('contract-create');
            if (contractForm && contractForm.style.display !== 'none') {
                uiService.toggleElement('contract-create', false);
            }
        }
    }

    /**
     * Set up state change listeners
     */
    setupStateListeners() {
        // Listen for loading state changes
        stateManager.subscribe('isLoading', (isLoading) => {
            const refreshBtn = document.getElementById('refresh-btn');
            if (refreshBtn) {
                uiService.setLoadingState('refresh-btn', isLoading, 'Caricamento...');
            }
        });
        
        // Listen for error state changes
        stateManager.subscribe('error', (error) => {
            if (error) {
                console.error('Application error:', error);
            }
        });
        
        // Listen for user changes
        stateManager.subscribe('currentUserId', (userId) => {
            if (!userId) {
                // User logged out, clear forms
                uiService.clearForm('creation-form');
            }
        });
    }

    /**
     * Handle application errors
     * @param {Error} error - Error object
     */
    handleError(error) {
        console.error('Application error:', error);
        uiService.showMessage('message', 'Si è verificato un errore imprevisto.', 'error');
        stateManager.setError(error.message);
    }

    /**
     * Cleanup resources
     */
    destroy() {
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyboardShortcuts);
        
        // Clear state
        stateManager.clearState();
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Set up global error handling
    window.addEventListener('error', (e) => {
        console.error('Global error:', e.error);
    });
    
    window.addEventListener('unhandledrejection', (e) => {
        console.error('Unhandled promise rejection:', e.reason);
    });
    
    // Create and initialize app
    const app = new App();
    await app.init();
    
    // Make app globally available for debugging
    window.app = app;
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
}
