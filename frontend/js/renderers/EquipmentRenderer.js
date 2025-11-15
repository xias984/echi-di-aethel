/**
 * Gestisce solo il rendering di equipment e inventory
 */
class EquipmentRenderer {
    renderEquipment(equipmentData) {
        const output = $('#equipment-output');
        let html = '';

        if (!equipmentData || equipmentData.length === 0) {
            html = '<p class="text-sm text-[#6F4E37] italic">Nessun oggetto equipaggiato.</p>';
        } else {
            equipmentData.forEach(item => {
                let bonusText = '';
                if (item.bonus_crit_chance > 0) {
                    const percentage = (item.bonus_crit_chance * 100).toFixed(0);
                    bonusText = `<span class="text-sm text-[#8C6239] font-bold">+${percentage}% Critico</span>`;
                }

                html += `
                    <div class="flex justify-between items-center p-3 border-2 border-[#8C6239] rounded-lg bg-[#F5ECE2] shadow-sm">
                        <div class="flex-1">
                            <strong class="text-[#402E21]">${item.name}</strong>
                        </div>
                        <div class="text-right">
                            ${bonusText}
                        </div>
                    </div>
                `;
            });
        }
        output.html(html);
    }

    renderInventory(inventoryData) {
        const output = $('#inventory-output');
        let html = '';

        const equippableItems = inventoryData ? inventoryData.filter(item => item.equipment_slot) : [];

        if (equippableItems.length === 0) {
            html = '<p class="text-sm text-[#6F4E37] italic">Il tuo inventario è vuoto o non contiene strumenti equipaggiabili.</p>';
        } else {
            equippableItems.forEach(item => {
                html += `
                    <div class="flex justify-between items-center p-3 border-2 border-[#8C6239] rounded-lg bg-[#F5ECE2] shadow-sm cursor-pointer inventory-item" data-item-id="${item.item_id}">
                        <div class="flex-1">
                            <strong class="text-[#402E21]">${item.name}</strong>
                        </div>
                        <span class="text-sm text-[#6F4E37] font-semibold">Click per Equipaggiare</span>
                    </div>
                `;
            });
        }
        output.html(html);
    }

    /**
     * Renders the user's non-tradeable resources.
     * @param {Array<object>} resources - Lista di risorse dall'API.
     */
    renderResources(resourcesData) {
        const output = $('#resources-output');
        let html = '';

        if (!resourcesData || resourcesData.length === 0) {
            html = '<p class="text-sm text-[#6F4E37] italic">Nessuna risorsa non tradeabile.</p>';
        } else {
            resourcesData.forEach(resource => {
                html += `
                    <div class="p-3 border-2 border-[#A67B5B] rounded-lg bg-[#FDFBF8] shadow-sm">
                        <strong class="text-[#402E32]">${resource.name}</strong>
                        <span class="text-xs text-[#6F4E37]">${resource.quantity} ${resource.base_resource_type}</span>
                    </div>
                `;
            });
        }
        output.html(html);
    }
}

