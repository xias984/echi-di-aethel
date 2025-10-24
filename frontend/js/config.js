/**
 * Application Configuration
 * Centralized configuration for API endpoints, UI settings, and game constants
 */
const CONFIG = {
    // API Configuration
    API: {
        BASE_URL: 'http://localhost:8088/api',
        ENDPOINTS: {
            USER: '/user',
            USER_PROFILE: (userId) => `/user/${userId}/profile`,
            CONTRACTS: '/contracts',
            CONTRACTS_BY_USER: (userId) => `/contracts/${userId}`,
            CONTRACT_ACCEPT: (contractId) => `/contracts/${contractId}/accept`,
            ACTION_USE: '/action/use'
        },
        TIMEOUT: 10000
    },

    // UI Configuration
    UI: {
        MESSAGE_DISPLAY_DURATION: 5000,
        FADE_DURATION: 300,
        ANIMATION_DURATION: 300
    },

    // Game Configuration
    GAME: {
        SKILL_ACTION_TIME: 5,
        MIN_CONTRACT_REWARD: 1,
        MIN_CONTRACT_LEVEL: 1
    },

    // Storage Keys
    STORAGE: {
        USER_ID: 'echi_di_aethel_user_id'
    },

    // CSS Classes
    CLASSES: {
        SUCCESS: 'success',
        ERROR: 'error',
        DEFAULT: 'default',
        HIDDEN: 'hidden',
        ACTIVE: 'active',
        LOADING: 'loading'
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
