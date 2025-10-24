/**
 * API Service Module
 * Handles all API communication with the backend
 */
class ApiService {
    constructor(config) {
        this.config = config;
        this.baseURL = config.API.BASE_URL;
    }

    /**
     * Generic API request method
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise} - API response
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const defaultOptions = {
            timeout: this.config.API.TIMEOUT,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const requestOptions = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, requestOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            console.error('API Request failed:', error);
            return { 
                success: false, 
                error: error.message || 'Unknown error occurred' 
            };
        }
    }

    /**
     * Create a new user
     * @param {string} username - Username for the new user
     * @returns {Promise} - User creation response
     */
    async createUser(username) {
        return this.request(this.config.API.ENDPOINTS.USER, {
            method: 'POST',
            body: JSON.stringify({ username })
        });
    }

    /**
     * Get user profile data
     * @param {string} userId - User ID
     * @returns {Promise} - User profile data
     */
    async getUserProfile(userId) {
        return this.request(this.config.API.ENDPOINTS.USER_PROFILE(userId), {
            method: 'GET'
        });
    }

    /**
     * Get contracts for a specific user
     * @param {string} userId - User ID
     * @returns {Promise} - Contracts data
     */
    async getContracts(userId) {
        return this.request(this.config.API.ENDPOINTS.CONTRACTS_BY_USER(userId), {
            method: 'GET'
        });
    }

    /**
     * Accept a contract
     * @param {string} contractId - Contract ID
     * @param {string} acceptorId - Acceptor user ID
     * @returns {Promise} - Contract acceptance response
     */
    async acceptContract(contractId, acceptorId) {
        return this.request(this.config.API.ENDPOINTS.CONTRACT_ACCEPT(contractId), {
            method: 'POST',
            body: JSON.stringify({ acceptor_id: acceptorId })
        });
    }

    /**
     * Create a new contract
     * @param {Object} contractData - Contract data
     * @returns {Promise} - Contract creation response
     */
    async createContract(contractData) {
        return this.request(this.config.API.ENDPOINTS.CONTRACTS, {
            method: 'POST',
            body: JSON.stringify(contractData)
        });
    }

    /**
     * Use a skill
     * @param {string} userId - User ID
     * @param {string} skillName - Skill name
     * @param {number} actionTime - Action duration
     * @returns {Promise} - Skill usage response
     */
    async useSkill(userId, skillName, actionTime = this.config.GAME.SKILL_ACTION_TIME) {
        return this.request(this.config.API.ENDPOINTS.ACTION_USE, {
            method: 'POST',
            body: JSON.stringify({
                user_id: userId,
                skill_name: skillName,
                action_time: actionTime
            })
        });
    }
}

// Create singleton instance
const apiService = new ApiService(CONFIG);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiService;
}
