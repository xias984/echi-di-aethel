/**
 * Gestisce solo l'inventario (risorse, equipaggiamento, inventario)
 */
class InventoryPage {
    constructor(api, stateManager, messageRenderer, equipmentRenderer, router) {
        this.api = api;
        this.state = stateManager;
        this.messages = messageRenderer;
        this.equipmentRenderer = equipmentRenderer;
        this.router = router;
        this.setupEventListeners();
    }

    setupEventListeners() {
        $(document).on('click', '.inventory-item', (e) => this.handleEquipItem(e));
    }

    async loadInventory() {
        const userId = this.state.getUserId();
        if (!userId) return;

        try {
            // Carica risorse
            const resourcesResponse = await this.api.getUserResources(userId);
            this.renderResources(resourcesResponse.resources || []);

            // Carica equipaggiamento
            const equipmentResponse = await this.api.getUserEquipment(userId);
            this.renderEquipment(equipmentResponse.equipment || []);

            // Carica inventario
            const inventoryResponse = await this.api.getUserInventory(userId);
            this.renderInventory(inventoryResponse.inventory || []);
        } catch (error) {
            this.messages.setMessage('message', `Errore nel caricamento inventario: ${error.message}`, 'error');
        }
    }

    renderResources(resources) {
        const output = $('#inventory-resources-output');
        let html = '';
        
        if (!resources || resources.length === 0) {
            html = '<p class="text-sm text-[#6F4E37] italic">Nessuna risorsa disponibile.</p>';
        } else {
            resources.forEach(resource => {
                html += `
                    <div class="flex justify-between items-center p-3 border-2 border-[#A67B5B] rounded-lg bg-[#FDFBF8] shadow-sm">
                        <div class="flex-1">
                            <strong class="text-[#402E32]">${resource.name}</strong>
                            <span class="text-sm text-[#6F4E37] ml-2">(${resource.base_resource_type})</span>
                        </div>
                        <span class="text-[#6F4E37] font-semibold">x${resource.quantity}</span>
                    </div>
                `;
            });
        }
        output.html(html);
    }

    renderEquipment(equipment) {
        const output = $('#inventory-equipment-output');
        let html = '';
        
        if (!equipment || equipment.length === 0) {
            html = '<p class="text-sm text-[#6F4E37] italic">Nessun equipaggiamento attualmente indossato.</p>';
        } else {
            equipment.forEach(item => {
                html += `
                    <div class="flex justify-between items-center p-3 border-2 border-[#8C6239] rounded-lg bg-[#F5ECE2] shadow-sm">
                        <div class="flex-1">
                            <strong class="text-[#402E21]">${item.name}</strong>
                            <span class="text-sm text-[#6F4E37] ml-2">(${item.equipment_slot})</span>
                        </div>
                    </div>
                `;
            });
        }
        output.html(html);
    }

    renderInventory(inventory) {
        const output = $('#inventory-items-output');
        let html = '';
        
        const equippableItems = inventory ? inventory.filter(item => item.equipment_slot) : [];
        
        if (equippableItems.length === 0) {
            html = '<p class="text-sm text-[#6F4E37] italic">Il tuo inventario è vuoto o non contiene strumenti equipaggiabili.</p>';
        } else {
            equippableItems.forEach(item => {
                html += `
                    <div class="flex justify-between items-center p-3 border-2 border-[#8C6239] rounded-lg bg-[#F5ECE2] shadow-sm cursor-pointer inventory-item hover:bg-[#EAE0D5] transition-colors" data-item-id="${item.item_id}">
                        <div class="flex-1">
                            <strong class="text-[#402E21]">${item.name}</strong>
                            <span class="text-sm text-[#6F4E37] ml-2">(${item.equipment_slot})</span>
                        </div>
                        <span class="text-sm text-[#6F4E37] font-semibold">Click per Equipaggiare</span>
                    </div>
                `;
            });
        }
        output.html(html);
    }

    async handleEquipItem(event) {
        const userId = this.state.getUserId();
        if (!userId) return;
        
        const itemId = $(event.currentTarget).data('item-id');
        this.messages.setMessage('message', 'Equipaggiamento in corso...', 'loading');

        try {
            const response = await this.api.equipItem(userId, itemId);
            this.messages.setMessage('message', response.message, 'success');
            // Ricarica l'inventario dopo l'equipaggiamento
            await this.loadInventory();
            // Aggiorna anche il profilo se necessario
            if (this.router.pages['profile']) {
                this.router.pages['profile'].loadProfile();
            }
        } catch (error) {
            this.messages.setMessage('message', `Errore nell'equipaggiamento: ${error.message}`, 'error');
        }
    }

    onEnter() {
        // Nascondi tutti gli altri board
        $('#crafting-board').addClass('hidden').css('display', 'none');
        $('#contract-board').addClass('hidden').css('display', 'none');
        $('#statistics-board').addClass('hidden').css('display', 'none');
        $('#welcome-message').addClass('hidden');
        
        // Mostra il inventory board (rimuovi sia classe che stile inline)
        $('#inventory-board').removeClass('hidden').css('display', '');
        this.loadInventory();
    }

    onLeave() {
        // Nascondi il board inventario quando si lascia la pagina
        $('#inventory-board').addClass('hidden').css('display', 'none');
    }
}

