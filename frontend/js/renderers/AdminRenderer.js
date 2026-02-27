/**
 * Gestisce solo il rendering dell'interfaccia admin
 */
class AdminRenderer {
    showAdminSection(isAdmin) {
        if (isAdmin) {
            $('#admin-panel-btn').removeClass('hidden');
        } else {
            $('#admin-panel-btn').addClass('hidden');
            $('#admin-section').addClass('hidden');
        }
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

    renderAdminSkills(skillsHierarchy, availableParents) {
        if (!skillsHierarchy || skillsHierarchy.length === 0) {
            $('#admin-skills-content').html('<p class="text-[#6F4E37] py-4">Nessuna skill trovata.</p>');
            return;
        }

        let html = '<div class="overflow-x-auto"><table class="w-full border-collapse text-sm"><thead><tr class="bg-[#EAE0D5]">';
        html += '<th class="p-2 text-left border-2 border-[#A67B5B] font-semibold text-[#402E32]">ID</th>';
        html += '<th class="p-2 text-left border-2 border-[#A67B5B] font-semibold text-[#402E32]">Nome / Classe Base</th>';
        html += '<th class="p-2 text-left border-2 border-[#A67B5B] font-semibold text-[#402E32]">Descrizione</th>';
        html += '<th class="p-2 text-left border-2 border-[#A67B5B] font-semibold text-[#402E32]">Max Livello</th>';
        html += '<th class="p-2 text-left border-2 border-[#A67B5B] font-semibold text-[#402E32]">Azioni</th>';
        html += '</tr></thead><tbody>';

        skillsHierarchy.forEach(parent => {
            // Riga genitore (classe base)
            const parentId = parent.skill_id;
            html += `<tr class="bg-[#F5ECE2] cursor-pointer toggle-skill-parent font-bold" data-skill-id="${parentId}">`;
            html += `<td class="p-2 border-2 border-[#A67B5B] text-[#402E32]">${parentId}</td>`;
            html += `<td class="p-2 border-2 border-[#A67B5B] text-[#6F4E37]"><span class="caret-icon inline-block mr-2">▶</span>${parent.name} (${parent.base_class})</td>`;
            html += `<td class="p-2 border-2 border-[#A67B5B] text-[#402E32]">${parent.description ? (parent.description.length > 50 ? parent.description.substring(0, 50) + '...' : parent.description) : 'Nessuna descrizione'}</td>`;
            html += `<td class="p-2 border-2 border-[#A67B5B] text-[#402E32]">${parent.max_level}</td>`;
            html += `<td class="p-2 border-2 border-[#A67B5B] text-[#402E32]">
                <button class="bg-[#A67B5B] hover:bg-[#8C6239] text-white px-2 py-1 rounded text-xs mr-1 edit-skill-btn font-semibold" data-skill-id="${parentId}" data-is-parent="true">Modifica</button>
                <button class="bg-[#8C5A3C] hover:bg-[#6F4228] text-white px-2 py-1 rounded text-xs delete-skill-btn font-semibold" data-skill-id="${parentId}">Elimina</button>
                </td>`;
            html += '</tr>';

            // Righe Figlie (inizialmente nascoste)
            html += `<tr class="skill-children-row hidden" data-parent-id="${parentId}"><td colspan="5" class="p-0">`;
            html += `<table class="w-full"><tbody>`;

            parent.children.forEach(child => {
                const childId = child.skill_id;
                // Stimiamo il livello di sblocco in base alla posizione (solo per visualizzazione)
                const unlockLevel = (parentId === 3 || parentId === 4) ? (childId === 6 || childId === 7 ? 10 : 25) : 0;
                const unlockText = unlockLevel > 0 ? ` (Sblocco Liv. ${unlockLevel})` : '';
                
                html += `<tr class="bg-[#FDFBF8] even:bg-gray-50 skill-row" data-skill-id="${childId}">`;
                html += `<td class="p-2 pl-8 border-2 border-[#A67B5B] text-[#402E32] w-12">${childId}</td>`;
                html += `<td class="p-2 border-2 border-[#A67B5B] text-[#6F4E37] flex-1">└─ ${child.name} ${unlockText}</td>`;
                html += `<td class="p-2 border-2 border-[#A67B5B] text-[#402E32] w-64">${child.description ? (child.description.length > 50 ? child.description.substring(0, 50) + '...' : child.description) : 'Nessuna descrizione'}</td>`;
                html += `<td class="p-2 border-2 border-[#A67B5B] text-[#402E32] w-20">${child.max_level}</td>`;
                html += `<td class="p-2 border-2 border-[#A67B5B] text-[#402E32] w-36">
                    <button class="bg-[#A67B5B] hover:bg-[#8C6239] text-white px-2 py-1 rounded text-xs mr-1 edit-skill-btn font-semibold" data-skill-id="${childId}" data-is-parent="false">Modifica</button>
                    <button class="bg-[#8C5A3C] hover:bg-[#6F4228] text-white px-2 py-1 rounded text-xs delete-skill-btn font-semibold" data-skill-id="${childId}">Elimina</button>
                    </td>`;
                html += '</tr>'
            });

            html += `</tbody></table></td></tr>`;

            // Edit form (initially hidden) for Parent and Children
            html += this.renderSkillEditRow(parent, availableParents);
            parent.children.forEach(child => {
                html += this.renderSkillEditRow(child, availableParents);
            });
        });

        html += '</tbody></table></div>';
        $('#admin-skills-content').html(html);
    }

    renderSkillEditRow(skill, availableParents) {
        const isParent = skill.parent_skill_id === null;
        let parentOptions = '<option value"">(Nessun Genitore / Classe Base)</option>';

        // Filtra se stesso per evitare loop e assicurare che solo le classi base possono essere genitore
        availableParents.filter(p => p.skill_id !== skill.skill_id && p.parent_skill_id === null).forEach(p => {
            const selected = p.skill_id === skill.parent_skill_id ? 'selected' : '';
            parentOptions += `<option value="${p.skill_id}" ${selected}>${p.name}</option>`;
        });

        return `<tr class="edit-skill-row hidden" data-skill-id="${skill.skill_id}">
            <td colspan="5" class="p-3 border-2 border-[#A67B5B] bg-[#EAE0D5] text-[#402E32]">
                <div class="flex flex-col gap-2">
                    <input type="text" class="px-3 py-1 border border-[#A67B5B] rounded edit-skill-name bg-[#FDFBF8] text-[#402E32]" value="${skill.name}" placeholder="Nome">
                    <input type="text" class="px-3 py-1 border border-[#A67B5B] rounded edit-skill-desc bg-[#FDFBF8] text-[#402E32]" value="${skill.description}" placeholder="Descrizione">
                    <div class="flex gap-2 items-center">
                        <input type="text" class="px-3 py-1 border border-[#A67B5B] rounded edit-skill-base-class bg-[#FDFBF8] text-[#402E32]" value="${skill.base_class}" placeholder="Classe Base">
                        <input type="number" class="px-3 py-1 border border-[#A67B5B] rounded w-24 edit-skill-max-level bg-[#FDFBF8] text-[#402E32]" value="${skill.max_level}" placeholder="Max Livello">
                        <select class="px-3 py-1 border border-[#A67B5B] rounded edit-skill-parent bg-[#FDFBF8] text-[#402E32]" ${isParent ? 'disabled' : ''}>
                            ${parentOptions}
                        </select>
                        <button class="bg-[#A67B5B] hover:bg-[#8C6239] text-white px-3 py-1 rounded save-skill-btn font-semibold" data-skill-id="${skill.skill_id}">Salva</button>
                        <button class="bg-[#8C6239] hover:bg-[#6F4E37] text-white px-3 py-1 rounded cancel-edit-btn font-semibold" data-skill-id="${skill.skill_id}">Annulla</button>
                    </div>
                </div>
            </td>
        </tr>`;
    }

    showAdminSkillsLoading() {
        $('#admin-skills-loading').removeClass('hidden');
        $('#admin-skills-content').addClass('hidden');
    }

    hideAdminSkillsLoading() {
        $('#admin-skills-loading').addClass('hidden');
        $('#admin-skills-content').removeClass('hidden');
    }

    // Ritorna gli ID dei genitori per l'uso nel controller
    getParents(skillsHierarchy) {
        return skillsHierarchy.filter(s => s.parent_skill_id === null);
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

