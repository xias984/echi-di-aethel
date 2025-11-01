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
}