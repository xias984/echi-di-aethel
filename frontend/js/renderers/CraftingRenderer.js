/**
 * Gestisce solo il rendering delle ricette di crafting
 */
class CraftingRenderer {
    renderRecipes(recipes) {
        const container = $('#recipes_list_output');
        
        if (!recipes || recipes.length === 0) {
            container.html('<p class="text-center text-[#6F4E37] py-4 italic">Nessuna ricetta disponibile. Continua ad allenarti per sbloccare nuove ricette!</p>');
            return;
        }

        let html = '<div class="space-y-4">';
        
        recipes.forEach(recipe => {
            // Formatta gli ingredienti
            const ingredientsList = recipe.ingredients && recipe.ingredients.length > 0
                ? recipe.ingredients.map(ing => 
                    `<span class="inline-block bg-[#EAE0D5] text-[#6F4E37] px-2 py-1 rounded-md text-sm mr-2 mb-2 border border-[#A67B5B]">
                        ${ing.resource_name} x${ing.quantity}
                    </span>`
                ).join('')
                : '<span class="text-[#6F4E37] italic">Nessun ingrediente richiesto</span>';

            // Informazioni sulla skill richiesta
            const skillRequirement = recipe.required_skill_name 
                ? `<span class="text-[#6F4E37]">Richiede: <strong>${recipe.required_skill_name}</strong> Livello ${recipe.required_skill_level || 'N/A'}</span>`
                : '';

            // Output dell'item
            const outputInfo = recipe.output_item_name 
                ? `<div class="mt-2">
                    <span class="text-[#402E32] font-semibold">Crea: </span>
                    <span class="text-[#6F4E37]">${recipe.output_item_name}</span>
                    ${recipe.output_item_value ? ` <span class="text-[#A67B5B]">(x${recipe.output_item_value})</span>` : ''}
                </div>`
                : '';

            html += `
                <div class="p-4 border-2 border-[#A67B5B] rounded-lg bg-[#FDFBF8] hover:shadow-lg transition-shadow shadow-sm">
                    <div class="flex justify-between items-start mb-3">
                        <div class="flex-1">
                            <h4 class="text-xl font-semibold text-[#402E32] mb-2" style="font-family: 'Cinzel', serif;">
                                ${recipe.name || 'Ricetta senza nome'}
                            </h4>
                            ${recipe.description ? `<p class="text-[#6F4E37] text-sm mb-2 italic">${recipe.description}</p>` : ''}
                        </div>
                        <button 
                            class="craft-recipe-btn bg-[#A67B5B] hover:bg-[#8C6239] text-white px-4 py-2 rounded-md transition-colors cursor-pointer font-semibold border border-[#6F4E37] ml-4"
                            data-recipe-id="${recipe.recipe_id}"
                        >
                            Crea
                        </button>
                    </div>
                    
                    <div class="mb-2">
                        <p class="text-sm text-[#6F4E37] mb-1"><strong>Ingredienti:</strong></p>
                        <div class="flex flex-wrap">
                            ${ingredientsList}
                        </div>
                    </div>
                    
                    ${skillRequirement ? `<div class="mb-2 text-sm">${skillRequirement}</div>` : ''}
                    ${outputInfo}
                </div>
            `;
        });
        
        html += '</div>';
        container.html(html);
    }

    showLoading() {
        $('#recipes_list_output').html('<p class="text-center text-[#6F4E37] py-4">Caricamento ricette...</p>');
    }
}

