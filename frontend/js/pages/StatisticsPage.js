/**
 * Gestisce solo le statistiche (skills/azioni)
 */
class StatisticsPage {
    constructor(api, stateManager, messageRenderer, profileRenderer, router) {
        this.api = api;
        this.state = stateManager;
        this.messages = messageRenderer;
        this.profileRenderer = profileRenderer;
        this.router = router;
        this.setupEventListeners();
    }

    setupEventListeners() {
        $(document).on('click', '[data-skill-name]', (e) => {
            if ($(e.currentTarget).data('skill-name')) {
                this.handleUseSkill(e);
            }
        });
    }

    async loadStatistics() {
        const userId = this.state.getUserId();
        if (!userId) return;

        try {
            const profile = await this.api.getProfile(userId);
            const skills = profile.skills || [];
            this.renderSkills(skills);
            this.state.setSkills(skills);
        } catch (error) {
            this.messages.setMessage('statistics-message', `Errore nel caricamento statistiche: ${error.message}`, 'error');
        }
    }

    renderSkills(skills) {
        const output = $('#statistics-skills-output');
        let html = '';
        
        if (!skills || skills.length === 0) {
            html = '<p class="text-sm text-[#6F4E37] italic">Nessuna skill disponibile.</p>';
        } else {
            skills.forEach(skill => {
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
        }
        output.html(html);
    }

    async handleUseSkill(event) {
        const userId = this.state.getUserId();
        if (!userId) return;
        
        const skillName = $(event.currentTarget).data('skill-name');
        this.messages.setMessage('statistics-message', `Esecuzione di ${skillName}...`, 'loading');

        try {
            const response = await this.api.useSkill(userId, skillName, 5);
            const type = response.level_up ? 'success' : 'default';
            this.messages.setMessage('statistics-message', response.message, type);
            // Ricarica le statistiche dopo l'uso della skill
            await this.loadStatistics();
        } catch (error) {
            this.messages.setMessage('statistics-message', `Errore nell'azione: ${error.message}`, 'error');
        }
    }

    onEnter() {
        // Nascondi tutti gli altri board
        $('#crafting-board').addClass('hidden').css('display', 'none');
        $('#contract-board').addClass('hidden').css('display', 'none');
        $('#inventory-board').addClass('hidden').css('display', 'none');
        $('#welcome-message').addClass('hidden');
        
        // Mostra il statistics board (rimuovi sia classe che stile inline)
        $('#statistics-board').removeClass('hidden').css('display', '');
        this.loadStatistics();
    }

    onLeave() {
        // Nascondi il board statistiche quando si lascia la pagina
        $('#statistics-board').addClass('hidden').css('display', 'none');
    }
}

