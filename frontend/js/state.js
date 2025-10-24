/**
 * State Management Module
 * Centralized state management for the application
 */
class StateManager {
    constructor() {
        this.state = {
            currentUserId: null,
            userProfile: null,
            availableSkills: [],
            contracts: [],
            isLoading: false,
            error: null
        };
        this.listeners = new Map();
    }

    /**
     * Get current state
     * @returns {Object} Current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Update state and notify listeners
     * @param {Object} updates - State updates
     */
    setState(updates) {
        const prevState = { ...this.state };
        this.state = { ...this.state, ...updates };
        
        // Notify listeners of state changes
        this.notifyListeners(prevState, this.state);
    }

    /**
     * Subscribe to state changes
     * @param {string} key - State key to watch
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        
        this.listeners.get(key).add(callback);
        
        // Return unsubscribe function
        return () => {
            const listeners = this.listeners.get(key);
            if (listeners) {
                listeners.delete(callback);
            }
        };
    }

    /**
     * Notify listeners of state changes
     * @param {Object} prevState - Previous state
     * @param {Object} newState - New state
     */
    notifyListeners(prevState, newState) {
        this.listeners.forEach((callbacks, key) => {
            if (prevState[key] !== newState[key]) {
                callbacks.forEach(callback => {
                    try {
                        callback(newState[key], prevState[key]);
                    } catch (error) {
                        console.error(`Error in state listener for key '${key}':`, error);
                    }
                });
            }
        });
    }

    /**
     * Set loading state
     * @param {boolean} loading - Loading state
     */
    setLoading(loading) {
        this.setState({ isLoading: loading });
    }

    /**
     * Set error state
     * @param {string|null} error - Error message
     */
    setError(error) {
        this.setState({ error });
    }

    /**
     * Set current user
     * @param {string|null} userId - User ID
     */
    setCurrentUser(userId) {
        this.setState({ currentUserId: userId });
        
        // Save to localStorage
        if (userId) {
            localStorage.setItem(CONFIG.STORAGE.USER_ID, userId);
        } else {
            localStorage.removeItem(CONFIG.STORAGE.USER_ID);
        }
    }

    /**
     * Set user profile data
     * @param {Object|null} profile - User profile data
     */
    setUserProfile(profile) {
        this.setState({ userProfile: profile });
        
        if (profile && profile.skills) {
            // Extract unique skill names for contract creation
            const uniqueSkillNames = [...new Set(profile.skills.map(s => s.name))];
            this.setState({ availableSkills: uniqueSkillNames });
        }
    }

    /**
     * Set contracts data
     * @param {Array} contracts - Contracts array
     */
    setContracts(contracts) {
        this.setState({ contracts });
    }

    /**
     * Add a new contract to the list
     * @param {Object} contract - New contract
     */
    addContract(contract) {
        const currentContracts = [...this.state.contracts];
        currentContracts.unshift(contract); // Add to beginning
        this.setState({ contracts: currentContracts });
    }

    /**
     * Update a contract in the list
     * @param {string} contractId - Contract ID
     * @param {Object} updates - Contract updates
     */
    updateContract(contractId, updates) {
        const currentContracts = [...this.state.contracts];
        const index = currentContracts.findIndex(c => c.contract_id === contractId);
        
        if (index !== -1) {
            currentContracts[index] = { ...currentContracts[index], ...updates };
            this.setState({ contracts: currentContracts });
        }
    }

    /**
     * Remove a contract from the list
     * @param {string} contractId - Contract ID
     */
    removeContract(contractId) {
        const currentContracts = this.state.contracts.filter(c => c.contract_id !== contractId);
        this.setState({ contracts: currentContracts });
    }

    /**
     * Clear all state
     */
    clearState() {
        this.setState({
            currentUserId: null,
            userProfile: null,
            availableSkills: [],
            contracts: [],
            isLoading: false,
            error: null
        });
    }

    /**
     * Initialize state from localStorage
     */
    initializeFromStorage() {
        const savedUserId = localStorage.getItem(CONFIG.STORAGE.USER_ID);
        if (savedUserId) {
            this.setCurrentUser(savedUserId);
        }
    }
}

// Create singleton instance
const stateManager = new StateManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateManager;
}
