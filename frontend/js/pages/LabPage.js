class LabPage {
    constructor(api, stateManager, messageRenderer, labRenderer) {
        this.api = api;
        this.state = stateManager;
        this.messages = messageRenderer;
        this.renderer = labRenderer;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Event delegator per gli slider
        $(document).on('input', '#slider-temp, #slider-press', () => {
            if ($('#lab-page-content').length) {
                this.renderer.updateSliderValues();
            }
        });

        // Pulsante di sintesi
        $(document).on('click', '#btn-synthesize', () => {
            this.handleSynthesis();
        });
    }

    async onEnter() {
        const userId = this.state.getUserId();
        if (!userId) return;

        try {
            const [resourcesResponse, profileResponse] = await Promise.all([
                this.api.getUserResources(userId),
                this.api.getProfile(userId).catch(() => null)
            ]);
            const username = profileResponse?.username || 'Utente';
            const resources = resourcesResponse?.resources || [];
            this.renderer.renderLab(username, resources);
        } catch (error) {
            this.messages.setMessage('lab-message', `Errore caricamento lab: ${error.message}`, 'error');
        }
    }

    async handleSynthesis() {
        const selectA = $('#ingredient-a').find(':selected');
        const selectB = $('#ingredient-b').find(':selected');

        if (!selectA.val() || !selectB.val()) {
            this.messages.setMessage('lab-message', 'Devi selezionare entrambi gli asset per avviare la sintesi.', 'error');
            return;
        }

        let tagsA = [], tagsB = [];
        try {
            tagsA = JSON.parse(selectA.attr('data-tags') || '[]');
            tagsB = JSON.parse(selectB.attr('data-tags') || '[]');
        } catch (e) {
            console.error('Error parsing tags', e);
        }

        // Formato array atteso dal backend: [{name, tags}, {name, tags}]
        const ingredients = [
            { name: selectA.attr('data-name'), tags: tagsA },
            { name: selectB.attr('data-name'), tags: tagsB }
        ];

        const params = {
            temperature: parseInt($('#slider-temp').val()),
            pressure: parseFloat($('#slider-press').val())
        };

        const userId = this.state.getUserId();
        this.renderer.showSynthesisLoading();

        try {
            const response = await this.api.call('/action/synthesize', 'POST', {
                user_id: userId,
                ingredients,
                params
            });

            if (response.synthesisResult) {
                const rollResult = response.rollResult || { total: '?', rank: response.synthesisResult.blueprint.rank };
                this.renderer.showSynthesisResult(rollResult, response.synthesisResult.blueprint);
            } else {
                this.renderer.resetState();
                this.messages.setMessage('lab-message', `Sintesi fallita: ${response.message || 'Errore sconosciuto'}`, 'error');
            }

        } catch (error) {
            this.renderer.resetState();
            console.error('Errore Sintesi:', error);
            this.messages.setMessage('lab-message', `Errore: ${error.message}`, 'error');
        }
    }

    onLeave() {
        // Cleanup resources when leaving Lab logic
    }
}
