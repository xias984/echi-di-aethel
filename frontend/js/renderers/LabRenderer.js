class LabRenderer {
    constructor() {
        this.containerId = '#lab-page-content';
    }

    renderLab(username, inventory) {
        $('#lab-researcher-name').text(username);
        this.populateIngredients(inventory);
        this.resetState();
    }

    populateIngredients(resources) {
        const selectA = $('#ingredient-a');
        const selectB = $('#ingredient-b');

        const defaultOption = '<option value="">-- Seleziona Asset --</option>';
        selectA.html(defaultOption);
        selectB.html(defaultOption);

        if (resources && resources.length > 0) {
            resources.forEach(resource => {
                // Usa base_resource_type come tag di fallback se non ci sono tag dedicati
                const tags = resource.tags && resource.tags.length > 0
                    ? resource.tags
                    : (resource.base_resource_type ? [resource.base_resource_type.toLowerCase()] : []);
                const tagsStr = tags.length > 0 ? ` [${tags.join(', ')}]` : '';
                const optionHtml = `<option value="${resource.name}" data-name="${resource.name}" data-tags='${JSON.stringify(tags)}'>${resource.name}${tagsStr} (x${resource.quantity})</option>`;
                selectA.append(optionHtml);
                selectB.append(optionHtml);
            });
        }
    }

    resetState() {
        $('#lab-idle-state').removeClass('hidden');
        $('#lab-loading-state').addClass('hidden');
        $('#lab-roll-container').addClass('hidden');
        $('#btn-synthesize').prop('disabled', false).removeClass('opacity-50 cursor-not-allowed');
    }

    showSynthesisLoading() {
        $('#lab-idle-state').addClass('hidden');
        $('#lab-roll-container').addClass('hidden');
        $('#lab-loading-state').removeClass('hidden');
        $('#btn-synthesize').prop('disabled', true).addClass('opacity-50 cursor-not-allowed');
    }

    showSynthesisResult(rollResult, blueprint) {
        $('#lab-loading-state').addClass('hidden');
        $('#lab-roll-container').removeClass('hidden');

        // Animazione d20
        const display = $('#d20-roll-display');
        const finalRankText = $('#d20-rank-display');
        display.text('...');
        finalRankText.text('');

        let rolls = 0;
        const rollInterval = setInterval(() => {
            const randomD20 = Math.floor(Math.random() * 20) + 1;
            display.text(randomD20);
            rolls++;

            if (rolls >= 15) {
                clearInterval(rollInterval);
                display.text(rollResult.total); // Final roll

                // Color coding by rank (Aethel palette)
                let rankColor = '#402E32';
                if (blueprint.rank === 'S') rankColor = '#FFD700'; // Gold
                else if (blueprint.rank === 'A') rankColor = '#A67B5B'; // Accent
                else if (blueprint.rank === 'B') rankColor = '#8C6239'; // Darker brown
                else if (blueprint.rank === 'C') rankColor = '#6F4E37'; // Even darker
                else rankColor = '#402E32'; // Base dark

                finalRankText.text(`RANK ${blueprint.rank}`).css('color', rankColor);

                // After roll animation, show modal
                setTimeout(() => {
                    this.showBlueprintModal(blueprint, rankColor);
                    this.resetState();
                }, 1500);
            }
        }, 80);
    }

    showBlueprintModal(blueprint, color) {
        // We reuse the existing message modal but inject our own content
        const modal = $('#message-modal');
        const content = $('#message-modal-content');

        const modifiersHtml = blueprint.modifiers && Object.keys(blueprint.modifiers).length > 0
            ? Object.entries(blueprint.modifiers).map(([key, val]) => `<div class="flex justify-between border-b border-[#A67B5B] py-1"><span class="text-[#6F4E37]">${key}</span><span class="font-bold" style="color:${color}">+${val}</span></div>`).join('')
            : '<p class="text-[#6F4E37] italic text-sm">Nessun modificatore rilevato</p>';

        const html = `
            <div class="text-center mb-4 border-b-2 border-[#A67B5B] pb-3">
                <h3 class="text-3xl font-bold uppercase tracking-widest text-[#402E32]" style="font-family: 'Cinzel', serif;">Nuovo Brevetto</h3>
            </div>
            <div class="bg-[#FDFBF8] p-4 rounded-lg border-2 border-[#A67B5B] mb-6 shadow-md">
                <div class="text-xs text-[#6F4E37] mb-1" style="font-family: 'Inter', sans-serif;">HASH: ${blueprint.hash.substring(0, 16)}...</div>
                <h4 class="text-2xl font-bold text-[#402E32] mb-2" style="font-family: 'Cinzel', serif;">${blueprint.name}</h4>
                <div class="text-3xl font-bold mb-4" style="color: ${color}; font-family: 'Cinzel', serif;">RANK ${blueprint.rank}</div>
                
                <div class="text-left mt-4 border-t-2 border-[#EAE0D5] pt-4">
                    <h5 class="text-sm font-bold text-[#6F4E37] uppercase mb-2">Costanti Parametriche:</h5>
                    <div style="font-family: 'Inter', sans-serif;" class="bg-[#EAE0D5] p-3 rounded-md shadow-inner">
                        ${modifiersHtml}
                    </div>
                </div>
            </div>
            
            <button onclick="$('#message-modal').addClass('hidden')" class="w-full bg-[#A67B5B] hover:bg-[#8C6239] text-white font-bold py-3 rounded-md transition-colors uppercase shadow-md" style="font-family: 'Cinzel', serif;">
                Accetta Brevetto
            </button>
        `;

        content.html(html);

        modal.removeClass('hidden');
        setTimeout(() => {
            content.removeClass('opacity-0 scale-95').addClass('opacity-100 scale-100');
        }, 10);
    }

    updateSliderValues() {
        const temp = $('#slider-temp').val();
        const press = $('#slider-press').val();
        $('#temp-val').text(`${temp} °C`);
        $('#press-val').text(`${press} atm`);
    }
}
