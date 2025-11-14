/**
 * Gestisce lo stato globale dell'applicazione
 */
class StateManager {
    constructor() {
        this.currentUserId = null;
        this.isAdmin = false;
        this.availableSkills = [];
        this.loadFromStorage();
    }

    loadFromStorage() {
        this.currentUserId = localStorage.getItem('echi_di_aethel_user_id');
        this.isAdmin = localStorage.getItem('echi_di_aethel_is_admin') === 'true';
    }

    setUser(userId, isAdmin = false) {
        this.currentUserId = userId;
        this.isAdmin = isAdmin;
        localStorage.setItem('echi_di_aethel_user_id', userId);
        localStorage.setItem('echi_di_aethel_is_admin', isAdmin ? 'true' : 'false');
    }

    clearUser() {
        this.currentUserId = null;
        this.isAdmin = false;
        localStorage.removeItem('echi_di_aethel_user_id');
        localStorage.removeItem('echi_di_aethel_is_admin');
    }

    setSkills(skills) {
        this.availableSkills = skills;
    }

    getUserId() {
        return this.currentUserId;
    }

    getIsAdmin() {
        return this.isAdmin;
    }

    getSkills() {
        return this.availableSkills;
    }
}

