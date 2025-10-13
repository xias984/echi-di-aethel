// app.js (Incorporato)
const API_BASE_URL = 'http://localhost:8088/api';
let currentUserId = null;
let availableSkills = []; // Per popolare il dropdown

const set_message = (id, msg, type) => {
    const el = $(`#${id}`);
    el.text(msg).removeClass('success error default').addClass(type).show();
    if (type === 'default') el.css('background-color', '#eee').css('color', '#333');
    setTimeout(() => el.fadeOut(3000), 5000); // Nascondi dopo 5 secondi
};

const loadProfile = (userId) => {
    $.ajax({
        url: API_BASE_URL + '/user/' + userId + '/profile',
        type: 'GET',
        success: function(response) {
            $('#profile-name').text(response.username);
            $('#contract-board').show();
            
            if (response.trait) {
                $('#profile-trait').text(response.trait.name);
                $('#trait-description').text(`Effetto: ${response.trait.description}`);
            } else {
                $('#profile-trait').text('Nessun Tratto Assegnato');
                $('#trait-description').text('');
            }

            availableSkills = response.skills.map(s => ({ id: s.skill_id, name: s.name, level: s.current_level }));
            
            // Popola il dropdown di creazione contratto
            const select = $('#required-skill-name');
            select.prop('disabled', false).empty().append('<option value="">Seleziona Mestiere Richiesto</option>');
            const uniqueSkillNames = [...new Set(response.skills.map(s => s.name))];
            uniqueSkillNames.forEach(name => {
                select.append(`<option value="${name}">${name}</option>`);
            });

            let html = '';
            response.skills.forEach(skill => {
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

            $('.use-skill-btn').on('click', function() {
                const skillName = $(this).data('skill-name');
                useSkill(skillName);
            });
            
            // Dopo aver caricato le skill, carichiamo la bacheca
            loadContracts(userId);
        },
        error: function() {
            set_message('message', 'Errore nel caricamento del profilo.', 'error');
        }
    });
};

const useSkill = (skillName) => {
    set_message('action-message', `Esecuzione di ${skillName}...`, 'default');

    $.ajax({
        url: API_BASE_URL + '/action/use',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ 
            user_id: currentUserId, 
            skill_name: skillName,
            action_time: 5
        }),
        success: function(response) {
            const type = response.level_up ? 'success' : 'default';
            set_message('action-message', response.message, type);
            loadProfile(currentUserId);
        },
        error: function(xhr) {
            const response = xhr.responseJSON;
            set_message('action-message', "Errore nell'azione: " + (response ? response.error : "Sconosciuto"), 'error');
        }
    });
};

const loadContracts = (userId) => {
    $('#contracts-list-output').html('Caricamento contratti filtrati...');
    
    $.ajax({
        url: API_BASE_URL + '/contracts/' + userId,
        type: 'GET',
        success: function(contracts) {
            let html = '';
            if (contracts.length === 0) {
                html = '<p class="text-center text-gray-500">Nessun contratto disponibile al tuo livello di competenza. Continua ad allenarti!</p>';
            } else {
                contracts.forEach(c => {
                    const is_proposer = c.proposer_id == userId;
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

            $('.accept-contract-btn').on('click', function() {
                const contractId = $(this).data('contract-id');
                acceptContract(contractId);
            });
        },
        error: function(xhr) {
            console.log(xhr);
            $('#contracts-list-output').html('<p class="text-center text-red-500">Errore nel caricamento della bacheca.</p>');
        }
    });
};

const acceptContract = (contractId) => {
    if (!confirm("Sei sicuro di voler accettare questo contratto?")) return; 
    
    set_message('contract-message', 'Accettazione in corso...', 'default');

    $.ajax({
        url: API_BASE_URL + '/contracts/' + contractId + '/accept',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ acceptor_id: currentUserId }),
        success: function(response) {
            set_message('contract-message', response.message, 'success');
            loadContracts(currentUserId);
        },
        error: function(xhr) {
            const response = xhr.responseJSON;
            set_message('contract-message', "Errore: " + (response ? response.error : "Sconosciuto"), 'error');
        }
    });
};

const createContract = () => {
    const title = $('#contract-title').val().trim();
    const skillName = $('#required-skill-name').val();
    const level = parseInt($('#required-level').val());
    const reward = parseInt($('#reward-amount').val());
    
    if (!title || !skillName || isNaN(level) || isNaN(reward) || reward <= 0) {
        set_message('contract-message', 'Compila tutti i campi correttamente.', 'error');
        return;
    }

    set_message('contract-message', 'Pubblicazione in corso (Escrow)...', 'default');
    
    $.ajax({
        url: API_BASE_URL + '/contracts',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            proposer_id: currentUserId,
            title: title,
            required_skill_name: skillName,
            required_level: level,
            reward_amount: reward
        }),
        success: function(response) {
            set_message('contract-message', response.message, 'success');
            $('#contract-create').slideUp();
            loadContracts(currentUserId);
        },
        error: function(xhr) {
            const response = xhr.responseJSON;
            set_message('contract-message', "Errore di pubblicazione: " + (response ? response.error : "Sconosciuto"), 'error');
        }
    });
};


$(document).ready(function() {
    
    currentUserId = localStorage.getItem('echi_di_aethel_user_id');
    if (currentUserId) {
        $('#creation-form').hide();
        $('#profile').show();
        loadProfile(currentUserId);
    }


    $('#create-btn').on('click', function() {
        const username = $('#username').val().trim();
        if (username === "") { set_message('message', "Inserisci un nome utente valido.", 'error'); return; }

        set_message('message', "Creazione in corso...", 'default');

        $.ajax({
            url: API_BASE_URL + '/user',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ username: username }),
            success: function(response) {
                set_message('message', response.message, 'success');
                currentUserId = response.user_id;
                localStorage.setItem('echi_di_aethel_user_id', currentUserId);
                $('#creation-form').hide();
                $('#profile').show();
                loadProfile(currentUserId);
            },
            error: function(xhr) {
                const response = xhr.responseJSON;
                set_message('message', "Errore: " + (response ? response.error : "Errore sconosciuto"), 'error');
                console.log(response);
            }
        });
    });

    $('#refresh-btn').on('click', function() {
        if (currentUserId) { loadProfile(currentUserId); }
    });
    
    $('#toggle-create-form-btn').on('click', function() {
        $('#contract-create').slideToggle();
    });

    $('#create-contract-btn').on('click', createContract);

});