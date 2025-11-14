/**
 * Gestisce solo il rendering del profilo e delle skills
 */
class ProfileRenderer {
    renderProfile(profileData) {
        $('#profile-name').text(profileData.username);
        $('#navbar-username').text(profileData.username);

        if (profileData.trait) {
            $('#profile-trait').text(profileData.trait.name);
            $('#trait-description').text(`Effetto: ${profileData.trait.description}`);
        } else {
            $('#profile-trait').text('Nessun Tratto Assegnato');
            $('#trait-description').text('');
        }

        this.renderSkills(profileData.skills);
        this.populateSkillDropdown(profileData.skills);
        
        return profileData.skills;
    }

    renderSkills(skills) {
        let html = '';
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
        $('#skill-output').html(html);
    }

    populateSkillDropdown(skills) {
        const select = $('#required-skill-name');
        select.prop('disabled', false).empty().append('<option value="">Seleziona Mestiere Richiesto</option>');
        const uniqueSkillNames = [...new Set(skills.map(s => s.name))];
        uniqueSkillNames.forEach(name => {
            select.append(`<option value="${name}">${name}</option>`);
        });
    }

    showLoading() {
        $('#profile-loading').removeClass('hidden');
        $('#profile-content').addClass('hidden');
    }

    hideLoading() {
        $('#profile-loading').addClass('hidden');
        $('#profile-content').removeClass('hidden');
    }
}

