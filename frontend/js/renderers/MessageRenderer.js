/**
 * Gestisce solo la visualizzazione di messaggi e modali
 */
class MessageRenderer {
    setMessage(id, msg, type) {
        if (id === 'action-message' || id === 'message') {
            this.showModal(msg, type);
        } else {
            this.showInlineMessage(id, msg, type);
        }
    }

    showModal(msg, type) {
        const modal = $('#message-modal');
        const modalContent = $('#message-modal-content');
        const modalText = $('#message-modal-text');
        
        // Rimuovi lo stile inline che nasconde il modale (rimuovi l'attributo style completamente)
        modal.removeClass('hidden').removeAttr('style');
        
        // Reset del contenuto per l'animazione
        modalContent.removeClass('opacity-0 opacity-100 scale-95 scale-100');
        modalContent.removeClass('border-[#A67B5B] border-[#D32F2F]');
        modalText.removeClass('text-[#6F4E37] text-[#8C5A3C] text-[#402E32]');
        
        let borderClass = 'border-[#A67B5B]';
        let textClass = type === 'error' ? 'text-[#8C5A3C]' : 'text-[#6F4E37]';
        
        modalContent.addClass(borderClass);
        modalText.addClass(textClass).text(msg);
        
        // Forza il reflow per assicurare che l'animazione funzioni
        modal[0].offsetHeight;
        
        // Mostra il contenuto con animazione
        modalContent.addClass('opacity-100 scale-100');
        
        setTimeout(() => {
            modalContent.removeClass('opacity-100 scale-100').addClass('opacity-0 scale-95');
            setTimeout(() => {
                modal.addClass('hidden').attr('style', 'display: none !important;');
            }, 300);
        }, 3000);
    }

    showInlineMessage(id, msg, type) {
        const el = $(`#${id}`);
        el.text(msg).removeClass('bg-green-100 text-green-800 border-green-300 bg-red-100 text-red-800 border-red-300 bg-gray-100 text-gray-800 border-gray-300 bg-blue-100 text-blue-800 border-blue-300').show().removeClass('hidden');
        
        const classes = {
            'success': 'bg-[#EAE0D5] text-[#6F4E37] border-2 border-[#A67B5B]',
            'error': 'bg-[#F5D7CC] text-[#8C5A3C] border-2 border-[#D32F2F]',
            'loading': 'bg-[#D3C5B6] text-[#6F4E37] border-2 border-[#A67B5B]',
            'default': 'bg-[#EAE0D5] text-[#402E32] border-2 border-[#A67B5B]'
        };
        
        el.addClass(classes[type] || classes.default);
        setTimeout(() => el.fadeOut(3000), 5000);
    }
}

