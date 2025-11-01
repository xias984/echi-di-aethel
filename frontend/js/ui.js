/**
 * Gestore dell'interfaccia utente (aggiornamento DOM, messaggi, visualizzazioni).
 */
class UIManager {

    /**
     * Visualizza un messaggio temporaneo in una sezione specifica.
     * @param {string} id - ID dell'elemento messaggio (es. 'login-message').
     * @param {string} msg - Testo del messaggio.
     * @param {string} type - Tipo di messaggio (success, error, default, loading).
     */
    setMessage(id, msg, type) {
        const el = $(`#${id}`);
        el.text(msg).removeClass('success error default loading').addClass(type).show();
        if (type === 'default') el.css('background-color', '#eee').css('color', '#333');
        if (type === 'loading') el.css('background-color', '#d1ecf1').css('color', '#0c5460');
        setTimeout(() => el.fadeOut(3000), 5000); 
    }

    showProfileLoading() {
        $('#profile-loading').show();
        $('#profile-content').hide();
    }

    hideProfileLoading() {
        $('#profile-loading').hide();
        $('#profile-content').show();
    }

    toggleLoginForms(showLogin) {
        if (showLogin) {
            $('#login-form').show();
            $('#creation-form').hide();
        } else {
            $('#login-form').hide();
            $('#creation-form').show();
        }
        $('#profile').hide();
        $('#contract-board').hide();
    }

    showAppSections() {
        $('#login-form').hide();
        $('#creation-form').hide();
        $('#profile').show();
        $('#contract-board').show();
    }

    /**
     * Aggiorna la sezione del profilo e popola il dropdown delle skill.
     * @param {object} profileData - Dati del profilo dall'API.
     * @returns {Array<object>} - Le skill per l'uso nel main.js (per i contratti).
     */
    updateProfile(profileData) {
        $('#profile-name').text(profileData.username);

        if (profileData.trait) {
            $('#profile-trait').text(profileData.trait.name);
            $('#trait-description').text(`Effetto: ${profileData.trait.description}`);
        } else {
            $('#profile-trait').text('Nessun Tratto Assegnato');
            $('#trait-description').text('');
        }

        // 1. Renderizza le Skill
        let html = '';
        profileData.skills.forEach(skill => {
            const level_progress = skill.xp_to_next > 0 ? (skill.xp_on_level / skill.xp_to_next) * 100 : 100;
            const xp_display = skill.xp_to_next > 0 ? `${skill.xp_on_level} / ${skill.xp_to_next}` : 'MAESTRO';

            html += `
                <div>
                    <div class="skill-info">
                        <strong>${skill.name}</strong> [${skill.base_class}] - Livello ${skill.current_level}
                        <br>
                        <span style="font-size: 0.8em; color: #777;">XP: ${xp_display}</span>
                        <div style="height: 5px; background-color: #ddd; border-radius: 2px; margin-top: 5px;">
                            <div style="width: ${level_progress}%; height: 100%; background-color: #3498db; border-radius: 2px;"></div>
                        </div>
                    </div>
                    <button class="use-skill-btn" data-skill-name="${skill.name}">Usa ${skill.name}</button>
                </div>
            `;
        });
        $('#skill-output').html(html);

        // 2. Popola il dropdown di creazione contratto
        const select = $('#required-skill-name');
        select.prop('disabled', false).empty().append('<option value="">Seleziona Mestiere Richiesto</option>');
        const uniqueSkillNames = [...new Set(profileData.skills.map(s => s.name))];
        uniqueSkillNames.forEach(name => {
            select.append(`<option value="${name}">${name}</option>`);
        });

        return profileData.skills;
    }
    
    /**
     * Renderizza la lista dei contratti.
     * @param {Array<object>} contracts - Lista di contratti dall'API.
     * @param {number} currentUserId - ID dell'utente loggato.
     */
    renderContracts(contracts, currentUserId) {
        let html = '';
        if (contracts.length === 0) {
            html = '<p class="text-center text-gray-500">Nessun contratto disponibile al tuo livello di competenza. Continua ad allenarti!</p>';
        } else {
            contracts.forEach(c => {
                const is_proposer = c.proposer_id == currentUserId;
                const status_text = c.status === 'OPEN' ? 'APERTO' : c.status;
                const accept_button = is_proposer 
                    ? `<button style="background-color: #3498db; color: white; padding: 6px 10px; border-radius: 4px; cursor: default;">Pubblicato da te</button>`
                    : `<button class="accept-contract-btn" data-contract-id="${c.contract_id}">Accetta Contratto</button>`;

                html += `
                    <div class="contract-item">
                        <div class="contract-details">
                            <strong>${c.title}</strong> (Stato: ${status_text})
                            <br>
                            <span style="font-size: 0.9em; color: #555;">Richiesto: ${c.required_skill_name} (Liv. ${c.required_level}+)</span>
                            <span style="font-size: 0.8em; color: #777;"> | Proponente: ${c.proposer_name}</span>
                        </div>
                        <div style="text-align: right;">
                            <span style="font-weight: bold; color: #4CAF50;">${c.reward_amount} Oro</span>
                            <div style="margin-top: 5px;">${accept_button}</div>
                        </div>
                    </div>
                `;
            });
        }
        $('#contracts-list-output').html(html);
    }
    
    // Metodo per svuotare i campi di creazione contratto
    clearContractForm() {
        $('#contract-title').val('');
        $('#required-skill-name').val('');
        $('#required-level').val(1);
        $('#reward-amount').val('');
        $('#contract-create').slideUp();
    }

    // Admin UI methods
    showAdminSection(isAdmin) {
        if (isAdmin) {
            $('#admin-section').show();
        } else {
            $('#admin-section').hide();
        }
    }

    renderAdminUsers(users) {
        if (!users || users.length === 0) {
            $('#admin-users-content').html('<p>Nessun utente trovato.</p>');
            return;
        }

        let html = '<table class="admin-table"><thead><tr>';
        html += '<th>ID</th><th>Username</th><th>Admin</th><th>Tratto</th><th>Skills (Top 5)</th><th>Azioni</th>';
        html += '</tr></thead><tbody>';

        users.forEach(user => {
            const traitInfo = user.trait ? `${user.trait.name}` : 'Nessuno';
            const topSkills = user.skills
                .sort((a, b) => b.current_level - a.current_level || b.current_xp - a.current_xp)
                .slice(0, 5)
                .map(s => `<span class="skill-badge">${s.name} Lv.${s.current_level}</span>`)
                .join('');

            html += `<tr data-user-id="${user.user_id}">`;
            html += `<td>${user.user_id}</td>`;
            html += `<td><strong>${user.username}</strong></td>`;
            html += `<td>${user.admin ? '✓' : ''}</td>`;
            html += `<td>${traitInfo}</td>`;
            html += `<td>${topSkills || 'Nessuna'}</td>`;
            html += `<td>
                <button class="admin-btn edit-user-btn" data-user-id="${user.user_id}">Modifica</button>
                <button class="admin-btn admin-btn-danger delete-user-btn" data-user-id="${user.user_id}">Elimina</button>
            </td>`;
            html += '</tr>';

            // Edit form (initially hidden)
            html += `<tr class="edit-user-row" data-user-id="${user.user_id}" style="display: none;">
                <td colspan="6">
                    <div class="admin-edit-form">
                        <input type="text" class="admin-input edit-username" value="${user.username}" placeholder="Username">
                        <label><input type="checkbox" class="edit-admin" ${user.admin ? 'checked' : ''}> Admin</label>
                        <button class="admin-btn save-user-btn" data-user-id="${user.user_id}">Salva</button>
                        <button class="admin-btn cancel-edit-btn" data-user-id="${user.user_id}">Annulla</button>
                    </div>
                </td>
            </tr>`;
        });

        html += '</tbody></table>';
        $('#admin-users-content').html(html);
    }

    renderAdminContracts(contracts) {
        if (!contracts || contracts.length === 0) {
            $('#admin-contracts-content').html('<p>Nessun contratto trovato.</p>');
            return;
        }

        let html = '<table class="admin-table"><thead><tr>';
        html += '<th>ID</th><th>Titolo</th><th>Skill</th><th>Livello</th><th>Ricompensa</th><th>Stato</th><th>Proponente</th><th>Accettato da</th><th>Azioni</th>';
        html += '</tr></thead><tbody>';

        contracts.forEach(contract => {
            html += `<tr data-contract-id="${contract.contract_id}">`;
            html += `<td>${contract.contract_id}</td>`;
            html += `<td><strong>${contract.title || 'N/A'}</strong></td>`;
            html += `<td>${contract.required_skill_name || 'N/A'}</td>`;
            html += `<td>${contract.required_level || 'N/A'}</td>`;
            html += `<td>${contract.reward_amount || 0} Oro</td>`;
            html += `<td>${contract.status || 'N/A'}</td>`;
            html += `<td>${contract.proposer_name || 'N/A'}</td>`;
            html += `<td>${contract.acceptor_name || '-'}</td>`;
            html += `<td>
                <button class="admin-btn edit-contract-btn" data-contract-id="${contract.contract_id}">Modifica</button>
                <button class="admin-btn admin-btn-danger delete-contract-btn" data-contract-id="${contract.contract_id}">Elimina</button>
            </td>`;
            html += '</tr>';

            // Edit form (initially hidden)
            html += `<tr class="edit-contract-row" data-contract-id="${contract.contract_id}" style="display: none;">
                <td colspan="9">
                    <div class="admin-edit-form">
                        <input type="text" class="admin-input edit-contract-title" value="${contract.title || ''}" placeholder="Titolo">
                        <input type="number" class="admin-input edit-contract-level" value="${contract.required_level || 1}" placeholder="Livello" min="1">
                        <input type="number" class="admin-input edit-contract-reward" value="${contract.reward_amount || 0}" placeholder="Ricompensa" min="0">
                        <select class="admin-input edit-contract-status">
                            <option value="OPEN" ${contract.status === 'OPEN' ? 'selected' : ''}>OPEN</option>
                            <option value="ACCEPTED" ${contract.status === 'ACCEPTED' ? 'selected' : ''}>ACCEPTED</option>
                            <option value="COMPLETED" ${contract.status === 'COMPLETED' ? 'selected' : ''}>COMPLETED</option>
                            <option value="CANCELLED" ${contract.status === 'CANCELLED' ? 'selected' : ''}>CANCELLED</option>
                        </select>
                        <button class="admin-btn save-contract-btn" data-contract-id="${contract.contract_id}">Salva</button>
                        <button class="admin-btn cancel-edit-contract-btn" data-contract-id="${contract.contract_id}">Annulla</button>
                    </div>
                </td>
            </tr>`;
        });

        html += '</tbody></table>';
        $('#admin-contracts-content').html(html);
    }

    showAdminUsersLoading() {
        $('#admin-users-loading').show();
        $('#admin-users-content').hide();
    }

    hideAdminUsersLoading() {
        $('#admin-users-loading').hide();
        $('#admin-users-content').show();
    }

    showAdminContractsLoading() {
        $('#admin-contracts-loading').show();
        $('#admin-contracts-content').hide();
    }

    hideAdminContractsLoading() {
        $('#admin-contracts-loading').hide();
        $('#admin-contracts-content').show();
    }
}