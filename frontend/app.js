const API_BASE_URL = 'http://localhost:8088/api';
let currentUserId = null;

const set_message = (id, msg, type) => {
    const el = $(`#${id}`);
    el.text(msg).removeClass('success error').addClass(type).show();
};

const loadProfile = (userId) => {
    $.ajax({
        url: API_BASE_URL + '/user/' + userId + '/profile',
        type: 'GET',
        success: function(response) {
            $('#profile-name').text(response.username);
            
            // Visualizza Tratto Caratteriale
            if (response.trait) {
                $('#profile-trait').text(response.trait.name);
                $('#trait-description').text(`Effetto: ${response.trait.description}`);
            } else {
                $('#profile-trait').text('Nessun Tratto Assegnato');
                $('#trait-description').text('');
            }

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

            // Aggiungi listener per i nuovi pulsanti "Usa Skill"
            $('.use-skill-btn').on('click', function() {
                const skillName = $(this).data('skill-name');
                useSkill(skillName);
            });
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
            action_time: 5 // Tempo simulato
        }),
        success: function(response) {
            const type = response.level_up ? 'success' : 'default';
            set_message('action-message', response.message, type);
            loadProfile(currentUserId); // Ricarica il profilo per vedere i nuovi XP/Livello
        },
        error: function(xhr) {
            const response = xhr.responseJSON;
            set_message('action-message', "Errore nell'azione: " + (response ? response.error : "Sconosciuto"), 'error');
        }
    });
};


$(document).ready(function() {
    
    // Prova a recuperare l'ID utente dalla sessione (simulata)
    currentUserId = localStorage.getItem('echi_di_aethel_user_id');
    if (currentUserId) {
        $('#creation-form').hide();
        $('#profile').show();
        loadProfile(currentUserId);
    }


    // Funzione per la creazione del personaggio
    $('#create-btn').on('click', function() {
        const username = $('#username').val().trim();
        if (username === "") {
            set_message('message', "Inserisci un nome utente valido.", 'error');
            return;
        }

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
            }
        });
    });

    // Funzione per il caricamento delle skill
    $('#refresh-btn').on('click', function() {
        if (currentUserId) {
            loadProfile(currentUserId);
        }
    });

});