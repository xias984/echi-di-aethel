const API_BASE_URL = 'http://localhost:8088/api';

/**
 * Gestore delle chiamate API per il frontend.
 */
class ApiManager {
    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    /**
     * Esegue una chiamata AJAX generica.
     * @param {string} url - Endpoint dell'API.
     * @param {string} method - Metodo HTTP (GET, POST).
     * @param {object} [data=null] - Dati da inviare (per POST).
     * @returns {Promise<object>} - Promessa con i dati della risposta o errore.
     */
    async call(url, method, data = null) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: this.baseUrl + url,
                type: method,
                contentType: 'application/json',
                data: data ? JSON.stringify(data) : null,
                success: resolve,
                error: (xhr) => {
                    // Estrai il messaggio di errore per una gestione più semplice
                    const response = xhr.responseJSON;
                    reject(new Error(response ? response.error : "Errore sconosciuto"));
                }
            });
        });
    }

    login(username) {
        return this.call('/user/login', 'POST', { username });
    }

    getUserEquipment(userId) {
        return this.call(`/user/${userId}/equipment`, 'GET');
    }

    getUserInventory(userId) {
        return this.call(`/user/${userId}/inventory`, 'GET');
    }

    equipItem(userId, itemId) {
        return this.call('/user/equip', 'POST', { user_id: userId, item_id: itemId });
    }

    createUser(username) {
        return this.call('/user', 'POST', { username });
    }

    getProfile(userId) {
        return this.call(`/user/${userId}/profile`, 'GET');
    }

    useSkill(userId, skillName, actionTime) {
        return this.call('/action/use', 'POST', { 
            user_id: userId, 
            skill_name: skillName, 
            action_time: actionTime 
        });
    }

    getContracts(userId) {
        return this.call(`/contracts/${userId}`, 'GET');
    }

    acceptContract(contractId, acceptorId) {
        return this.call(`/contracts/${contractId}/accept`, 'POST', { acceptor_id: acceptorId });
    }

    createContract(proposerId, title, requiredSkillName, requiredLevel, rewardAmount) {
        return this.call('/contracts', 'POST', {
            proposer_id: proposerId,
            title: title,
            required_skill_name: requiredSkillName,
            required_level: requiredLevel,
            reward_amount: rewardAmount
        });
    }

    // Admin methods
    getAdminUsers(adminId) {
        return this.call('/admin/users', 'POST', { admin_id: adminId });
    }

    getAdminContracts(adminId) {
        return this.call('/admin/contracts', 'POST', { admin_id: adminId });
    }

    updateUser(adminId, userId, data) {
        const payload = { admin_id: adminId, ...data };
        return this.call(`/admin/users/${userId}`, 'PUT', payload);
    }

    deleteUser(adminId, userId) {
        return this.call(`/admin/users/${userId}`, 'DELETE', { admin_id: adminId });
    }

    updateContract(adminId, contractId, data) {
        const payload = { admin_id: adminId, ...data };
        return this.call(`/admin/contracts/${contractId}`, 'PUT', payload);
    }

    deleteContract(adminId, contractId) {
        return this.call(`/admin/contracts/${contractId}`, 'DELETE', { admin_id: adminId });
    }
}