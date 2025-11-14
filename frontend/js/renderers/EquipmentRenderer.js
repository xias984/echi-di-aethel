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
}

