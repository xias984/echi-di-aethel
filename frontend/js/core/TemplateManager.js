/**
 * Gestisce il caricamento e l'inserimento di template HTML
 */
class TemplateManager {
    constructor() {
        this.templates = new Map();
        this.templatesPath = 'templates/';
    }

    /**
     * Carica un template da un file HTML
     * @param {string} templateName - Nome del template (senza estensione)
     * @returns {Promise<string>} - HTML del template
     */
    async loadTemplate(templateName) {
        // Se il template è già in cache, restituiscilo
        if (this.templates.has(templateName)) {
            return this.templates.get(templateName);
        }

        try {
            const response = await fetch(`${this.templatesPath}${templateName}.html`);
            if (!response.ok) {
                throw new Error(`Template ${templateName} non trovato`);
            }
            const html = await response.text();
            this.templates.set(templateName, html);
            return html;
        } catch (error) {
            console.error(`Errore nel caricamento del template ${templateName}:`, error);
            return '';
        }
    }

    /**
     * Carica e inserisce un template in un elemento del DOM
     * @param {string} templateName - Nome del template
     * @param {string} targetSelector - Selettore jQuery dell'elemento target
     * @returns {Promise<void>}
     */
    async renderTemplate(templateName, targetSelector) {
        const html = await this.loadTemplate(templateName);
        if (html && targetSelector) {
            $(targetSelector).html(html);
        }
        return html;
    }

    /**
     * Carica e inserisce un template come figlio di un elemento
     * @param {string} templateName - Nome del template
     * @param {string} targetSelector - Selettore jQuery dell'elemento target
     * @returns {Promise<void>}
     */
    async appendTemplate(templateName, targetSelector) {
        const html = await this.loadTemplate(templateName);
        if (html && targetSelector) {
            // Crea un elemento temporaneo per inserire l'HTML
            const $temp = $('<div>').html(html);
            // Assicurati che tutti gli elementi con id che contengono "board" o "section" o "modal" siano nascosti
            $temp.find('[id*="board"], [id*="section"], [id*="modal"]').each(function() {
                $(this).addClass('hidden').css('display', 'none');
            });
            // Inserisci nel DOM
            $(targetSelector).append($temp.html());
            // Forza la classe hidden su tutti gli elementi board/section/modal appena inseriti
            $(targetSelector).find('[id*="board"], [id*="section"], [id*="modal"]').addClass('hidden').css('display', 'none');
        }
        return html;
    }

    /**
     * Carica tutti i template necessari all'avvio
     * @param {Array<string>} templateNames - Array di nomi template
     * @returns {Promise<void>}
     */
    async preloadTemplates(templateNames) {
        const promises = templateNames.map(name => this.loadTemplate(name));
        await Promise.all(promises);
    }
}

