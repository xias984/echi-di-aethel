/**
 * Gestisce solo il crafting (visualizzazione ricette e creazione oggetti)
 */
class CraftingPage {
    constructor(api, stateManager, messageRenderer, craftingRenderer, router) {
        this.api = api;
        this.state = stateManager;
        this.messages = messageRenderer;
        this.craftingRenderer = craftingRenderer;
        this.router = router;
        this.setupEventListeners();
    }

    setupEventListeners() {
        $(document).on('click', '.craft-recipe-btn', (e) => this.handleCraftItem(e));
    }

    async loadRecipes() {
        const userId = this.state.getUserId();
        if (!userId) return;

        this.craftingRenderer.showLoading();

        try {
            const response = await this.api.getAvailableRecipes(userId);
            const recipes = response.recipes || (Array.isArray(response) ? response : []);
            this.craftingRenderer.renderRecipes(recipes);
        } catch (error) {
            $('#recipes_list_output').html(
                `<p class="text-center text-red-600 py-4">Errore nel caricamento ricette: ${error.message}</p>`
            );
        }
    }

    async handleCraftItem(event) {
        const userId = this.state.getUserId();
        if (!userId) {
            this.messages.setMessage('message', 'Utente non autenticato.', 'error');
            return;
        }

        const recipeId = parseInt($(event.currentTarget).data('recipe-id'), 10);
        if (!recipeId || isNaN(recipeId)) {
            this.messages.setMessage('message', 'ID ricetta non valido.', 'error');
            console.error('Recipe ID non valido:', $(event.currentTarget).data('recipe-id'));
            return;
        }

        if (!confirm("Sei sicuro di voler creare questo oggetto? Le risorse verranno consumate.")) {
            return;
        }

        // Disabilita il bottone durante il crafting
        const button = $(event.currentTarget);
        const originalText = button.text();
        button.prop('disabled', true).text('Creazione in corso...');

        try {
            const response = await this.api.craftItem(userId, recipeId);
            this.messages.setMessage('message', response.message || 'Crafting riuscito!', 'success');
            
            // Ricarica le ricette e il profilo per aggiornare risorse/inventario
            await this.loadRecipes();
            if (this.router.pages['profile']) {
                this.router.pages['profile'].loadProfile();
            }
        } catch (error) {
            this.messages.setMessage('message', `Errore durante il crafting: ${error.message}`, 'error');
        } finally {
            button.prop('disabled', false).text(originalText);
        }
    }

    onEnter() {
        // Nascondi tutti gli altri board
        $('#contract-board').addClass('hidden').css('display', 'none');
        $('#inventory-board').addClass('hidden').css('display', 'none');
        $('#statistics-board').addClass('hidden').css('display', 'none');
        $('#welcome-message').addClass('hidden');
        
        // Mostra il crafting board (rimuovi sia classe che stile inline)
        $('#crafting-board').removeClass('hidden').css('display', '');
        this.loadRecipes();
    }

    onLeave() {
        // Nascondi il crafting board quando si lascia la pagina
        $('#crafting-board').addClass('hidden').css('display', 'none');
    }
}

