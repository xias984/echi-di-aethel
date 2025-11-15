<?php
// Recipe model - Gestisce le ricette di crafting e i loro ingredienti

class Recipe extends BaseModel {
    protected $table = 'recipes';
    
    protected function getPrimaryKey() {
        return 'recipe_id';
    }
    
    /**
     * Ottiene tutte le ricette sbloccate da un utente con i dettagli della skill.
     */
    public function getAvailableRecipesForUser($user_id) {
        $stmt = $this->pdo->prepare("
            SELECT 
                r.*,
                s.name AS required_skill_name
            FROM user_recipes ur
            JOIN recipes r ON ur.recipe_id = r.recipe_id
            JOIN skills s ON r.required_skill_id = s.skill_id
            WHERE ur.user_id = ?
        ");
        $stmt->execute([$user_id]);
        $recipes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Aggiungi gli ingredienti a ogni ricetta
        foreach ($recipes as &$recipe) {
            $recipe['ingredients'] = $this->getRecipeIngredients($recipe['recipe_id']);
        }
        
        return $recipes;
    }
    
    /**
     * Ottiene i dettagli degli ingredienti per una specifica ricetta.
     */
    public function getRecipeIngredients($recipe_id) {
        $stmt = $this->pdo->prepare("
            SELECT 
                ri.quantity,
                r.resource_id,
                r.name AS resource_name
            FROM recipe_ingredients ri
            JOIN resources r ON ri.resource_id = r.resource_id
            WHERE ri.recipe_id = ?
        ");
        $stmt->execute([$recipe_id]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Trova una ricetta per ID e ne recupera tutti i dettagli (inclusi gli ingredienti).
     */
    public function findRecipeWithIngredients($recipe_id) {
        $stmt = $this->pdo->prepare("
            SELECT 
                r.*,
                s.name AS required_skill_name,
                s.base_class AS required_skill_class
            FROM recipes r
            JOIN skills s ON r.required_skill_id = s.skill_id
            WHERE r.recipe_id = ?
        ");
        $stmt->execute([$recipe_id]);
        $recipe = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($recipe) {
            $recipe['ingredients'] = $this->getRecipeIngredients($recipe_id);
        }
        
        return $recipe;
    }
}
?>