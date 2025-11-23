/**
 * Gestisce solo il rendering dei contratti
 */
class ContractsRenderer {
    renderContracts(contracts, currentUserId) {
        if (!contracts || contracts.length === 0) {
            $('#contracts-list-output').html('<p class="text-center text-[#6F4E37] py-4 italic">Nessun contratto disponibile al tuo livello di competenza. Continua ad allenarti!</p>');
            $('#contracts-accepted-output').html('');
            $('#contracts-accepted-section').addClass('hidden');
            return;
        }

        // Separa i contratti aperti da quelli accettati
        const openContracts = contracts.filter(c => c.status === 'OPEN');
        const acceptedContracts = contracts.filter(c => c.status === 'ACCEPTED' || c.status === 'COMPLETED');

        // Renderizza contratti aperti
        let openHtml = '';
        if (openContracts.length === 0) {
            openHtml = '<p class="text-center text-[#6F4E37] py-4 italic">Nessun contratto aperto disponibile al tuo livello di competenza.</p>';
        } else {
            openHtml = '<div class="space-y-3">';
            openContracts.forEach(c => {
                const is_proposer = c.proposer_id == currentUserId;
                const status_text = 'APERTO';
                const status_color = 'bg-[#EAE0D5] text-[#6F4E37] border-[#A67B5B]';
                
                let action_button = '';
                if (is_proposer) {
                    action_button = `<button class="bg-[#8C6239] text-white px-3 py-1 rounded-md cursor-default font-semibold border border-[#A67B5B]">Pubblicato da te</button>`;
                } else {
                    action_button = `<button class="accept-contract-btn bg-[#A67B5B] hover:bg-[#8C6239] text-white px-4 py-2 rounded-md transition-colors cursor-pointer font-semibold border border-[#6F4E37]" data-contract-id="${c.contract_id}">Accetta Contratto</button>`;
                }
                
                openHtml += `
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
                            <div>${action_button}</div>
                        </div>
                    </div>
                `;
            });
            openHtml += '</div>';
        }
        $('#contracts-list-output').html(openHtml);

        // Renderizza contratti accettati (solo se ce ne sono)
        if (acceptedContracts.length > 0) {
            let acceptedHtml = '<div class="space-y-3">';
            acceptedContracts.forEach(c => {
                const status_text = c.status === 'ACCEPTED' ? 'ACCETTATO' : c.status;
                const status_color = 'bg-[#D3C5B6] text-[#402E32] border-[#8C6239]';
                
                // Mostra il pulsante Chat per i contratti accettati
                const action_button = `<button class="open-chat-btn bg-[#A67B5B] hover:bg-[#8C6239] text-white px-3 py-1 rounded-md transition-colors cursor-pointer font-semibold border border-[#6F4E37]" data-contract-id="${c.contract_id}" data-proposer-id="${c.proposer_id}" data-acceptor-id="${c.accepted_by_id}">Chat</button>`;
                
                // Determina il nome dell'accettatore se disponibile
                const acceptorName = c.acceptor_name || 'Sconosciuto';
                const is_proposer = c.proposer_id == currentUserId;
                const partnerInfo = is_proposer 
                    ? `Accettato da: <span class="text-[#8C6239]">${acceptorName}</span>`
                    : `Proponente: <span class="text-[#8C6239]">${c.proposer_name}</span>`;
                
                acceptedHtml += `
                    <div class="flex justify-between items-center p-4 border-2 border-[#8C6239] rounded-lg bg-[#FDFBF8] hover:shadow-lg transition-shadow shadow-sm">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-2">
                                <strong class="text-[#402E32] text-lg">${c.title}</strong>
                                <span class="px-2 py-1 rounded text-xs font-semibold border ${status_color}">${status_text}</span>
                            </div>
                            <div class="text-sm text-[#6F4E37]">
                                <span>Richiesto: <strong class="text-[#402E32]">${c.required_skill_name}</strong> (Liv. ${c.required_level}+)</span>
                                <span class="mx-2">•</span>
                                ${partnerInfo}
                            </div>
                        </div>
                        <div class="text-right ml-4">
                            <div class="font-bold text-[#6F4E37] text-lg mb-2">${c.reward_amount} Oro</div>
                            <div>${action_button}</div>
                        </div>
                    </div>
                `;
            });
            acceptedHtml += '</div>';
            $('#contracts-accepted-output').html(acceptedHtml);
            $('#contracts-accepted-section').removeClass('hidden');
        } else {
            $('#contracts-accepted-output').html('');
            $('#contracts-accepted-section').addClass('hidden');
        }
    }
    
    clearForm() {
        $('#contract-title').val('');
        $('#required-skill-name').val('');
        $('#required-level').val(1);
        $('#reward-amount').val('');
        $('#contract-create').addClass('hidden');
    }

    /**
     * Renders messages inside the chat modal.
     * @param {Array<object>} messages - List of messages.
     * @param {number} currentUserId - ID of the logged-in user.
     */
    renderChatMessages(messages, currentUserId) {
        const chatBody = $('#chat-messages-body');
        chatBody.empty();

        messages.forEach(m => {
            const isMine = m.sender_id == currentUserId;
            const username = m.sender_username;
            const alignment = isMine ? 'text-right' : 'text-left';
            const bubbleClass = isMine ? 'bg-[#A67B5B] text-white self-end' : 'bg-[#EAE0D5] text-[#402E32] self-start';
            chatBody.append(`<div class="flex flex-col mb-2 ${alignment}"><span class="text-xs text-gray-500">${username}</span><div class="max-w-xs px-3 py-2 rounded-lg ${bubbleClass} shadow-md">${m.message}</div></div>`);
        });
        // Scorri in fondo per visualizzare l'ultimo messaggio
        chatBody.scrollTop(chatBody.prop("scrollHeight"));
    }
}

