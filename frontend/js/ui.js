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
        // Se è action-message o message, mostra come modale
        if (id === 'action-message' || id === 'message') {
            const modal = $('#message-modal');
            const modalContent = $('#message-modal-content');
            const modalText = $('#message-modal-text');
            
            // Rimuovi classi precedenti
            modalContent.removeClass('border-[#A67B5B] border-[#D32F2F]');
            modalText.removeClass('text-[#6F4E37] text-[#8C5A3C] text-[#402E32]');
            
            // Applica classi in base al tipo
            let borderClass = '';
            let textClass = '';
            switch(type) {
                case 'success':
                    borderClass = 'border-[#A67B5B]';
                    textClass = 'text-[#6F4E37]';
                    break;
                case 'error':
                    borderClass = 'border-[#D32F2F]';
                    textClass = 'text-[#8C5A3C]';
                    break;
                case 'loading':
                    borderClass = 'border-[#A67B5B]';
                    textClass = 'text-[#6F4E37]';
                    break;
                default:
                    borderClass = 'border-[#A67B5B]';
                    textClass = 'text-[#402E32]';
            }
            modalContent.addClass(borderClass);
            modalText.addClass(textClass);
            
            // Imposta il testo
            modalText.text(msg);
            
            // Mostra il modale con animazione
            modal.removeClass('hidden');
            modalContent.removeClass('opacity-0 scale-95').addClass('opacity-100 scale-100');
            
            // Nascondi dopo 3 secondi con dissolvenza
            setTimeout(() => {
                modalContent.removeClass('opacity-100 scale-100').addClass('opacity-0 scale-95');
                setTimeout(() => {
                    modal.addClass('hidden');
                }, 300); // Tempo per la transizione
            }, 3000);
        } else {
            // Per gli altri messaggi, comportamento normale
            const el = $(`#${id}`);
            el.text(msg).removeClass('bg-green-100 text-green-800 border-green-300 bg-red-100 text-red-800 border-red-300 bg-gray-100 text-gray-800 border-gray-300 bg-blue-100 text-blue-800 border-blue-300').show().removeClass('hidden');
            
            let classes = '';
            switch(type) {
                case 'success':
                    classes = 'bg-[#EAE0D5] text-[#6F4E37] border-2 border-[#A67B5B]';
                    break;
                case 'error':
                    classes = 'bg-[#F5D7CC] text-[#8C5A3C] border-2 border-[#D32F2F]';
                    break;
                case 'loading':
                    classes = 'bg-[#D3C5B6] text-[#6F4E37] border-2 border-[#A67B5B]';
                    break;
                default:
                    classes = 'bg-[#EAE0D5] text-[#402E32] border-2 border-[#A67B5B]';
            }
            el.addClass(classes);
            setTimeout(() => el.fadeOut(3000), 5000); 
        }
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
        // Hide sidebar and main content when not logged in
        $('#sidebar').addClass('hidden');
        $('#contract-board').addClass('hidden');
        $('#welcome-message').removeClass('hidden');
        $('#user-menu').addClass('hidden');
    }

    showAppSections() {
        $('#login-form').addClass('hidden');
        $('#creation-form').addClass('hidden');
        $('#user-menu').removeClass('hidden');
        $('#sidebar').removeClass('hidden');
        $('#contract-board').removeClass('hidden');
        $('#welcome-message').addClass('hidden');
    }

    /**
     * Aggiorna la sezione del profilo e popola il dropdown delle skill.
     * @param {object} profileData - Dati del profilo dall'API.
     * @returns {Array<object>} - Le skill per l'uso nel main.js (per i contratti).
     */
    updateProfile(profileData) {
        $('#profile-name').text(profileData.username);
        $('#navbar-username').text(profileData.username);

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
                <div class="flex justify-between items-center p-3 border-2 border-[#A67B5B] rounded-lg bg-[#FDFBF8] shadow-sm hover:shadow-lg hover:border-[#8C6239] hover:bg-[#F5ECE2] transition-all cursor-pointer" data-skill-name="${skill.name}">
                    <div class="flex-1">
                        <strong class="text-[#402E32]">${skill.name}</strong> <span class="text-[#6F4E37]">[${skill.base_class}]</span> - <span class="text-[#402E32]">Livello ${skill.current_level}</span>
                        <div class="mt-1">
                            <span class="text-xs text-[#6F4E37]">XP: ${xp_display}</span>
                            <div class="h-1.5 bg-[#EAE0D5] rounded-full mt-1">
                                <div class="h-full bg-[#A67B5B] rounded-full" style="width: ${level_progress}%"></div>
                            </div>
                        </div>
                    </div>
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
     * Renderizza gli oggetti equipaggiati.
     * @param {Array<object>} equipment - Lista di oggetti equipaggiati dall'API.
     */
    renderEquipment(equipmentData) {
        const output = $('#equipment-output');
        let html = '';

        if (equipmentData.length === 0) {
            html = '<p class="text-sm text-[#6F4E37] italic">Nessun oggetto equipaggiato.</p>';
        } else {
            equipmentData.forEach(item => {
                let bonusText = '';
                if (item.bonus_crit_chance > 0) {
                    const percentage = (item.bonus_crit_chance * 100).toFixed(0);
                    bonusText = `<span class="text-sm text-[#8C6239] font-bold"+${percentage}% Critico</span>`;
                }

                html += `
                    <div class="flex justify-between items-center p-3 border-2 border-[#8C6239] rounded-lg bg-[#F5ECE2] shadow-sm">
                        <div class="flex-1">
                            <strong class="text-[#402E21]">${item.name}</strong>
                        </div>
                        <div class="text-right">
                            ${bonusText}
                        </div>
                    </div>
                `;
            });
        }
        output.html(html);
    }

    /**
     * Renderizza l'inventario degli oggetti.
     * @param {Array<object>} inventory - Lista di oggetti nell'inventario dall'API.
     */
    renderInventory(inventoryData) {
        const output = $('#inventory-output');
        let html = '';

        const equippableItems = inventoryData.filter(item => item.equipment_slot);

        if (equippableItems.length === 0) {
            html = '<p class="text-sm text-[#6F4E37] italic">Il tuo inventario è vuoto o non contiene strumenti equipaggiabili.</p>';
        } else {
            equippableItems.forEach(item => {
                html += `
                    <div class="flex justify-between items-center p-3 border-2 border-[#8C6239] rounded-lg bg-[#F5ECE2] shadow-sm cursor-pointer inventory-item" data-item-id="${item.item_id}">
                        <div class="flex-1">
                            <strong class="text-[#402E21]">${item.name}</strong>
                        </div>
                        <span class="text-sm text-[#6F4E37] font-semibold">Click per Equipaggiare</span>
                    </div>
                `;
            });
        }
        output.html(html);
    }

    /**
     * Renderizza la lista dei contratti.
     * @param {Array<object>} contracts - Lista di contratti dall'API.
     * @param {number} currentUserId - ID dell'utente loggato.
     */
    renderContracts(contracts, currentUserId) {
        let html = '';
        if (contracts.length === 0) {
            html = '<p class="text-center text-[#6F4E37] py-4 italic">Nessun contratto disponibile al tuo livello di competenza. Continua ad allenarti!</p>';
        } else {
            html = '<div class="space-y-3">';
            contracts.forEach(c => {
                const is_proposer = c.proposer_id == currentUserId;
                const status_text = c.status === 'OPEN' ? 'APERTO' : c.status;
                const status_color = c.status === 'OPEN' ? 'bg-[#EAE0D5] text-[#6F4E37] border-[#A67B5B]' : 'bg-[#D3C5B6] text-[#402E32] border-[#8C6239]';
                const accept_button = is_proposer 
                    ? `<button class="bg-[#8C6239] text-white px-3 py-1 rounded-md cursor-default font-semibold border border-[#A67B5B]">Pubblicato da te</button>`
                    : `<button class="accept-contract-btn bg-[#A67B5B] hover:bg-[#8C6239] text-white px-4 py-2 rounded-md transition-colors cursor-pointer font-semibold border border-[#6F4E37]" data-contract-id="${c.contract_id}">Accetta Contratto</button>`;

                html += `
                    <div class="flex justify-between items-center p-4 border-2 border-[#A67B5B] rounded-lg bg-[#FDFBF8] hover:shadow-lg transition-shadow shadow-sm">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-2">
                                <strong class="text-[#402E32] text-lg">${c.title}</strong>
                                <span class="px-2 py-1 rounded text-xs font-semibold border ${status_color}">${status_text}</span>
                            </div>
                            <div class="text-sm text-[#6F4E37]">
                                <span>Richiesto: <strong class="text-[#402E32]">${c.required_skill_name}</strong> (Liv. ${c.required_level}+)</span>
                                <span class="mx-2">•</span>
                                <span class="text-[#8C6239]">Proponente: ${c.proposer_name}</span>
                            </div>
                        </div>
                        <div class="text-right ml-4">
                            <div class="font-bold text-[#6F4E37] text-lg mb-2">${c.reward_amount} Oro</div>
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
        $('#contract-create').addClass('hidden');
    }

    // Admin UI methods
    showAdminSection(isAdmin) {
        if (isAdmin) {
            $('#admin-panel-btn').removeClass('hidden');
        } else {
            $('#admin-panel-btn').addClass('hidden');
            $('#admin-section').addClass('hidden');
        }
    }

    toggleAdminModal() {
        $('#admin-section').toggleClass('hidden');
    }

    closeAdminModal() {
        $('#admin-section').addClass('hidden');
    }

    renderAdminUsers(users) {
        if (!users || users.length === 0) {
            $('#admin-users-content').html('<p class="text-[#6F4E37] py-4">Nessun utente trovato.</p>');
            return;
        }

        let html = '<div class="overflow-x-auto"><table class="w-full border-collapse"><thead><tr class="bg-[#EAE0D5]">';
        html += '<th class="p-3 text-left border-2 border-[#A67B5B] font-semibold text-[#402E32]">ID</th>';
        html += '<th class="p-3 text-left border-2 border-[#A67B5B] font-semibold text-[#402E32]">Username</th>';
        html += '<th class="p-3 text-left border-2 border-[#A67B5B] font-semibold text-[#402E32]">Admin</th>';
        html += '<th class="p-3 text-left border-2 border-[#A67B5B] font-semibold text-[#402E32]">Tratto</th>';
        html += '<th class="p-3 text-left border-2 border-[#A67B5B] font-semibold text-[#402E32]">Skills (Top 5)</th>';
        html += '<th class="p-3 text-left border-2 border-[#A67B5B] font-semibold text-[#402E32]">Azioni</th>';
        html += '</tr></thead><tbody>';

        users.forEach(user => {
            const traitInfo = user.trait ? `${user.trait.name}` : 'Nessuno';
            const topSkills = user.skills
                .sort((a, b) => b.current_level - a.current_level || b.current_xp - a.current_xp)
                .slice(0, 5)
                .map(s => `<span class="inline-block px-2 py-1 mx-1 bg-[#EAE0D5] rounded text-xs text-[#402E32] border border-[#A67B5B]">${s.name} Lv.${s.current_level}</span>`)
                .join('');

            html += `<tr class="even:bg-[#FDFBF8]" data-user-id="${user.user_id}">`;
            html += `<td class="p-3 border-2 border-[#A67B5B] text-[#402E32]">${user.user_id}</td>`;
            html += `<td class="p-3 border-2 border-[#A67B5B] text-[#402E32]"><strong>${user.username}</strong></td>`;
            html += `<td class="p-3 border-2 border-[#A67B5B] text-[#402E32]">${user.admin ? '✓' : ''}</td>`;
            html += `<td class="p-3 border-2 border-[#A67B5B] text-[#402E32]">${traitInfo}</td>`;
            html += `<td class="p-3 border-2 border-[#A67B5B] text-[#402E32]">${topSkills || 'Nessuna'}</td>`;
            html += `<td class="p-3 border-2 border-[#A67B5B] text-[#402E32]">
                <button class="bg-[#A67B5B] hover:bg-[#8C6239] text-white px-3 py-1 rounded mr-2 edit-user-btn font-semibold" data-user-id="${user.user_id}">Modifica</button>
                <button class="bg-[#8C5A3C] hover:bg-[#6F4228] text-white px-3 py-1 rounded delete-user-btn font-semibold" data-user-id="${user.user_id}">Elimina</button>
            </td>`;
            html += '</tr>';

            // Edit form (initially hidden)
            html += `<tr class="edit-user-row hidden" data-user-id="${user.user_id}">
                <td colspan="6" class="p-3 border-2 border-[#A67B5B] bg-[#EAE0D5]">
                    <div class="flex flex-wrap gap-2 items-center">
                        <input type="text" class="px-3 py-1 border border-[#A67B5B] rounded edit-username bg-[#FDFBF8] text-[#402E32]" value="${user.username}" placeholder="Username">
                        <label class="flex items-center gap-2 text-[#402E32]"><input type="checkbox" class="edit-admin" ${user.admin ? 'checked' : ''}> Admin</label>
                        <button class="bg-[#A67B5B] hover:bg-[#8C6239] text-white px-3 py-1 rounded save-user-btn font-semibold" data-user-id="${user.user_id}">Salva</button>
                        <button class="bg-[#8C6239] hover:bg-[#6F4E37] text-white px-3 py-1 rounded cancel-edit-btn font-semibold" data-user-id="${user.user_id}">Annulla</button>
                    </div>
                </td>
            </tr>`;
        });

        html += '</tbody></table></div>';
        $('#admin-users-content').html(html);
    }

    renderAdminContracts(contracts) {
        if (!contracts || contracts.length === 0) {
            $('#admin-contracts-content').html('<p class="text-[#6F4E37] py-4">Nessun contratto trovato.</p>');
            return;
        }

        let html = '<div class="overflow-x-auto"><table class="w-full border-collapse text-sm"><thead><tr class="bg-[#EAE0D5]">';
        html += '<th class="p-2 text-left border-2 border-[#A67B5B] font-semibold text-[#402E32]">ID</th>';
        html += '<th class="p-2 text-left border-2 border-[#A67B5B] font-semibold text-[#402E32]">Titolo</th>';
        html += '<th class="p-2 text-left border-2 border-[#A67B5B] font-semibold text-[#402E32]">Skill</th>';
        html += '<th class="p-2 text-left border-2 border-[#A67B5B] font-semibold text-[#402E32]">Livello</th>';
        html += '<th class="p-2 text-left border-2 border-[#A67B5B] font-semibold text-[#402E32]">Ricompensa</th>';
        html += '<th class="p-2 text-left border-2 border-[#A67B5B] font-semibold text-[#402E32]">Stato</th>';
        html += '<th class="p-2 text-left border-2 border-[#A67B5B] font-semibold text-[#402E32]">Proponente</th>';
        html += '<th class="p-2 text-left border-2 border-[#A67B5B] font-semibold text-[#402E32]">Accettato da</th>';
        html += '<th class="p-2 text-left border-2 border-[#A67B5B] font-semibold text-[#402E32]">Azioni</th>';
        html += '</tr></thead><tbody>';

        contracts.forEach(contract => {
            html += `<tr class="even:bg-[#FDFBF8]" data-contract-id="${contract.contract_id}">`;
            html += `<td class="p-2 border-2 border-[#A67B5B] text-[#402E32]">${contract.contract_id}</td>`;
            html += `<td class="p-2 border-2 border-[#A67B5B] text-[#402E32]"><strong>${contract.title || 'N/A'}</strong></td>`;
            html += `<td class="p-2 border-2 border-[#A67B5B] text-[#402E32]">${contract.required_skill_name || 'N/A'}</td>`;
            html += `<td class="p-2 border-2 border-[#A67B5B] text-[#402E32]">${contract.required_level || 'N/A'}</td>`;
            html += `<td class="p-2 border-2 border-[#A67B5B] text-[#402E32]">${contract.reward_amount || 0} Oro</td>`;
            html += `<td class="p-2 border-2 border-[#A67B5B] text-[#402E32]">${contract.status || 'N/A'}</td>`;
            html += `<td class="p-2 border-2 border-[#A67B5B] text-[#402E32]">${contract.proposer_name || 'N/A'}</td>`;
            html += `<td class="p-2 border-2 border-[#A67B5B] text-[#402E32]">${contract.acceptor_name || '-'}</td>`;
            html += `<td class="p-2 border-2 border-[#A67B5B] text-[#402E32]">
                <button class="bg-[#A67B5B] hover:bg-[#8C6239] text-white px-2 py-1 rounded text-xs mr-1 edit-contract-btn font-semibold" data-contract-id="${contract.contract_id}">Modifica</button>
                <button class="bg-[#8C5A3C] hover:bg-[#6F4228] text-white px-2 py-1 rounded text-xs delete-contract-btn font-semibold" data-contract-id="${contract.contract_id}">Elimina</button>
            </td>`;
            html += '</tr>';

            // Edit form (initially hidden)
            html += `<tr class="edit-contract-row hidden" data-contract-id="${contract.contract_id}">
                <td colspan="9" class="p-3 border-2 border-[#A67B5B] bg-[#EAE0D5]">
                    <div class="flex flex-wrap gap-2 items-center">
                        <input type="text" class="px-3 py-1 border border-[#A67B5B] rounded edit-contract-title bg-[#FDFBF8] text-[#402E32]" value="${contract.title || ''}" placeholder="Titolo">
                        <input type="number" class="px-3 py-1 border border-[#A67B5B] rounded w-24 edit-contract-level bg-[#FDFBF8] text-[#402E32]" value="${contract.required_level || 1}" placeholder="Livello" min="1">
                        <input type="number" class="px-3 py-1 border border-[#A67B5B] rounded w-24 edit-contract-reward bg-[#FDFBF8] text-[#402E32]" value="${contract.reward_amount || 0}" placeholder="Ricompensa" min="0">
                        <select class="px-3 py-1 border border-[#A67B5B] rounded edit-contract-status bg-[#FDFBF8] text-[#402E32]">
                            <option value="OPEN" ${contract.status === 'OPEN' ? 'selected' : ''}>OPEN</option>
                            <option value="ACCEPTED" ${contract.status === 'ACCEPTED' ? 'selected' : ''}>ACCEPTED</option>
                            <option value="COMPLETED" ${contract.status === 'COMPLETED' ? 'selected' : ''}>COMPLETED</option>
                            <option value="CANCELLED" ${contract.status === 'CANCELLED' ? 'selected' : ''}>CANCELLED</option>
                        </select>
                        <button class="bg-[#A67B5B] hover:bg-[#8C6239] text-white px-3 py-1 rounded save-contract-btn font-semibold" data-contract-id="${contract.contract_id}">Salva</button>
                        <button class="bg-[#8C6239] hover:bg-[#6F4E37] text-white px-3 py-1 rounded cancel-edit-contract-btn font-semibold" data-contract-id="${contract.contract_id}">Annulla</button>
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