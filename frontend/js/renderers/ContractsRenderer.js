/**
 * Gestisce solo il rendering dei contratti
 */
class ContractsRenderer {
    renderContracts(contracts, currentUserId) {
        let html = '';
        if (!contracts || contracts.length === 0) {
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
    
    clearForm() {
        $('#contract-title').val('');
        $('#required-skill-name').val('');
        $('#required-level').val(1);
        $('#reward-amount').val('');
        $('#contract-create').addClass('hidden');
    }
}

