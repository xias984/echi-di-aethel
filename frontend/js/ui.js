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
        el.text(msg).removeClass('bg-green-100 text-green-800 border-green-300 bg-red-100 text-red-800 border-red-300 bg-gray-100 text-gray-800 border-gray-300 bg-blue-100 text-blue-800 border-blue-300').show().removeClass('hidden');
        
        let classes = '';
        switch(type) {
            case 'success':
                classes = 'bg-green-100 text-green-800 border border-green-300';
                break;
            case 'error':
                classes = 'bg-red-100 text-red-800 border border-red-300';
                break;
            case 'loading':
                classes = 'bg-blue-100 text-blue-800 border border-blue-300';
                break;
            default:
                classes = 'bg-gray-100 text-gray-800 border border-gray-300';
        }
        el.addClass(classes);
        setTimeout(() => el.fadeOut(3000), 5000); 
    }

    showProfileLoading() {
        $('#profile-loading').removeClass('hidden');
        $('#profile-content').addClass('hidden');
    }

    hideProfileLoading() {
        $('#profile-loading').addClass('hidden');
        $('#profile-content').removeClass('hidden');
    }

    toggleLoginForms(showLogin) {
        if (showLogin) {
            $('#login-form').removeClass('hidden');
            $('#creation-form').addClass('hidden');
        } else {
            $('#login-form').addClass('hidden');
            $('#creation-form').removeClass('hidden');
        }
        $('#profile').addClass('hidden');
        $('#contract-board').addClass('hidden');
    }

    showAppSections() {
        $('#login-form').addClass('hidden');
        $('#creation-form').addClass('hidden');
        $('#profile').removeClass('hidden');
        $('#contract-board').removeClass('hidden');
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
                <div class="flex justify-between items-center p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div class="flex-1">
                        <strong class="text-gray-800">${skill.name}</strong> <span class="text-gray-500">[${skill.base_class}]</span> - <span class="text-gray-700">Livello ${skill.current_level}</span>
                        <div class="mt-1">
                            <span class="text-xs text-gray-600">XP: ${xp_display}</span>
                            <div class="h-1 bg-gray-200 rounded-full mt-1">
                                <div class="h-full bg-blue-500 rounded-full" style="width: ${level_progress}%"></div>
                            </div>
                        </div>
                    </div>
                    <button class="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md transition-colors cursor-pointer ml-4" data-skill-name="${skill.name}">
                        Usa ${skill.name}
                    </button>
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
            html = '<p class="text-center text-gray-500 py-4">Nessun contratto disponibile al tuo livello di competenza. Continua ad allenarti!</p>';
        } else {
            html = '<div class="space-y-3">';
            contracts.forEach(c => {
                const is_proposer = c.proposer_id == currentUserId;
                const status_text = c.status === 'OPEN' ? 'APERTO' : c.status;
                const status_color = c.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
                const accept_button = is_proposer 
                    ? `<button class="bg-blue-400 text-white px-3 py-1 rounded-md cursor-default">Pubblicato da te</button>`
                    : `<button class="accept-contract-btn bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors cursor-pointer" data-contract-id="${c.contract_id}">Accetta Contratto</button>`;

                html += `
                    <div class="flex justify-between items-center p-4 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-2">
                                <strong class="text-gray-800">${c.title}</strong>
                                <span class="px-2 py-1 rounded text-xs font-semibold ${status_color}">${status_text}</span>
                            </div>
                            <div class="text-sm text-gray-600">
                                <span>Richiesto: <strong>${c.required_skill_name}</strong> (Liv. ${c.required_level}+)</span>
                                <span class="mx-2">•</span>
                                <span class="text-gray-500">Proponente: ${c.proposer_name}</span>
                            </div>
                        </div>
                        <div class="text-right ml-4">
                            <div class="font-bold text-green-600 text-lg mb-2">${c.reward_amount} Oro</div>
                            <div>${accept_button}</div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
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
            $('#admin-section').removeClass('hidden');
        } else {
            $('#admin-section').addClass('hidden');
        }
    }

    renderAdminUsers(users) {
        if (!users || users.length === 0) {
            $('#admin-users-content').html('<p class="text-gray-500 py-4">Nessun utente trovato.</p>');
            return;
        }

        let html = '<div class="overflow-x-auto"><table class="w-full border-collapse"><thead><tr class="bg-gray-100">';
        html += '<th class="p-3 text-left border border-gray-300 font-semibold">ID</th>';
        html += '<th class="p-3 text-left border border-gray-300 font-semibold">Username</th>';
        html += '<th class="p-3 text-left border border-gray-300 font-semibold">Admin</th>';
        html += '<th class="p-3 text-left border border-gray-300 font-semibold">Tratto</th>';
        html += '<th class="p-3 text-left border border-gray-300 font-semibold">Skills (Top 5)</th>';
        html += '<th class="p-3 text-left border border-gray-300 font-semibold">Azioni</th>';
        html += '</tr></thead><tbody>';

        users.forEach(user => {
            const traitInfo = user.trait ? `${user.trait.name}` : 'Nessuno';
            const topSkills = user.skills
                .sort((a, b) => b.current_level - a.current_level || b.current_xp - a.current_xp)
                .slice(0, 5)
                .map(s => `<span class="inline-block px-2 py-1 mx-1 bg-gray-200 rounded text-xs">${s.name} Lv.${s.current_level}</span>`)
                .join('');

            html += `<tr class="even:bg-gray-50" data-user-id="${user.user_id}">`;
            html += `<td class="p-3 border border-gray-300">${user.user_id}</td>`;
            html += `<td class="p-3 border border-gray-300"><strong>${user.username}</strong></td>`;
            html += `<td class="p-3 border border-gray-300">${user.admin ? '✓' : ''}</td>`;
            html += `<td class="p-3 border border-gray-300">${traitInfo}</td>`;
            html += `<td class="p-3 border border-gray-300">${topSkills || 'Nessuna'}</td>`;
            html += `<td class="p-3 border border-gray-300">
                <button class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded mr-2 edit-user-btn" data-user-id="${user.user_id}">Modifica</button>
                <button class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded delete-user-btn" data-user-id="${user.user_id}">Elimina</button>
            </td>`;
            html += '</tr>';

            // Edit form (initially hidden)
            html += `<tr class="edit-user-row hidden" data-user-id="${user.user_id}">
                <td colspan="6" class="p-3 border border-gray-300 bg-gray-50">
                    <div class="flex flex-wrap gap-2 items-center">
                        <input type="text" class="px-3 py-1 border border-gray-300 rounded edit-username" value="${user.username}" placeholder="Username">
                        <label class="flex items-center gap-2"><input type="checkbox" class="edit-admin" ${user.admin ? 'checked' : ''}> Admin</label>
                        <button class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded save-user-btn" data-user-id="${user.user_id}">Salva</button>
                        <button class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded cancel-edit-btn" data-user-id="${user.user_id}">Annulla</button>
                    </div>
                </td>
            </tr>`;
        });

        html += '</tbody></table></div>';
        $('#admin-users-content').html(html);
    }

    renderAdminContracts(contracts) {
        if (!contracts || contracts.length === 0) {
            $('#admin-contracts-content').html('<p class="text-gray-500 py-4">Nessun contratto trovato.</p>');
            return;
        }

        let html = '<div class="overflow-x-auto"><table class="w-full border-collapse text-sm"><thead><tr class="bg-gray-100">';
        html += '<th class="p-2 text-left border border-gray-300 font-semibold">ID</th>';
        html += '<th class="p-2 text-left border border-gray-300 font-semibold">Titolo</th>';
        html += '<th class="p-2 text-left border border-gray-300 font-semibold">Skill</th>';
        html += '<th class="p-2 text-left border border-gray-300 font-semibold">Livello</th>';
        html += '<th class="p-2 text-left border border-gray-300 font-semibold">Ricompensa</th>';
        html += '<th class="p-2 text-left border border-gray-300 font-semibold">Stato</th>';
        html += '<th class="p-2 text-left border border-gray-300 font-semibold">Proponente</th>';
        html += '<th class="p-2 text-left border border-gray-300 font-semibold">Accettato da</th>';
        html += '<th class="p-2 text-left border border-gray-300 font-semibold">Azioni</th>';
        html += '</tr></thead><tbody>';

        contracts.forEach(contract => {
            html += `<tr class="even:bg-gray-50" data-contract-id="${contract.contract_id}">`;
            html += `<td class="p-2 border border-gray-300">${contract.contract_id}</td>`;
            html += `<td class="p-2 border border-gray-300"><strong>${contract.title || 'N/A'}</strong></td>`;
            html += `<td class="p-2 border border-gray-300">${contract.required_skill_name || 'N/A'}</td>`;
            html += `<td class="p-2 border border-gray-300">${contract.required_level || 'N/A'}</td>`;
            html += `<td class="p-2 border border-gray-300">${contract.reward_amount || 0} Oro</td>`;
            html += `<td class="p-2 border border-gray-300">${contract.status || 'N/A'}</td>`;
            html += `<td class="p-2 border border-gray-300">${contract.proposer_name || 'N/A'}</td>`;
            html += `<td class="p-2 border border-gray-300">${contract.acceptor_name || '-'}</td>`;
            html += `<td class="p-2 border border-gray-300">
                <button class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs mr-1 edit-contract-btn" data-contract-id="${contract.contract_id}">Modifica</button>
                <button class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs delete-contract-btn" data-contract-id="${contract.contract_id}">Elimina</button>
            </td>`;
            html += '</tr>';

            // Edit form (initially hidden)
            html += `<tr class="edit-contract-row hidden" data-contract-id="${contract.contract_id}">
                <td colspan="9" class="p-3 border border-gray-300 bg-gray-50">
                    <div class="flex flex-wrap gap-2 items-center">
                        <input type="text" class="px-3 py-1 border border-gray-300 rounded edit-contract-title" value="${contract.title || ''}" placeholder="Titolo">
                        <input type="number" class="px-3 py-1 border border-gray-300 rounded w-24 edit-contract-level" value="${contract.required_level || 1}" placeholder="Livello" min="1">
                        <input type="number" class="px-3 py-1 border border-gray-300 rounded w-24 edit-contract-reward" value="${contract.reward_amount || 0}" placeholder="Ricompensa" min="0">
                        <select class="px-3 py-1 border border-gray-300 rounded edit-contract-status">
                            <option value="OPEN" ${contract.status === 'OPEN' ? 'selected' : ''}>OPEN</option>
                            <option value="ACCEPTED" ${contract.status === 'ACCEPTED' ? 'selected' : ''}>ACCEPTED</option>
                            <option value="COMPLETED" ${contract.status === 'COMPLETED' ? 'selected' : ''}>COMPLETED</option>
                            <option value="CANCELLED" ${contract.status === 'CANCELLED' ? 'selected' : ''}>CANCELLED</option>
                        </select>
                        <button class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded save-contract-btn" data-contract-id="${contract.contract_id}">Salva</button>
                        <button class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded cancel-edit-contract-btn" data-contract-id="${contract.contract_id}">Annulla</button>
                    </div>
                </td>
            </tr>`;
        });

        html += '</tbody></table></div>';
        $('#admin-contracts-content').html(html);
    }

    showAdminUsersLoading() {
        $('#admin-users-loading').removeClass('hidden');
        $('#admin-users-content').addClass('hidden');
    }

    hideAdminUsersLoading() {
        $('#admin-users-loading').addClass('hidden');
        $('#admin-users-content').removeClass('hidden');
    }

    showAdminContractsLoading() {
        $('#admin-contracts-loading').removeClass('hidden');
        $('#admin-contracts-content').addClass('hidden');
    }

    hideAdminContractsLoading() {
        $('#admin-contracts-loading').addClass('hidden');
        $('#admin-contracts-content').removeClass('hidden');
    }
}