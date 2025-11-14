-- Migration script per Lotto 6: Gerarchia Skill e Equipaggiamento

-- 1. Aggiungi la colonna di gerarchia alla tabella skills
ALTER TABLE public.skills
ADD COLUMN parent_skill_id INTEGER REFERENCES public.skills(skill_id) DEFAULT NULL;

-- 2. Crea la tabella items (per strumenti e oggetti in inventario/equipaggiamento)
CREATE TABLE public.items (
    item_id INTEGER GENERATED ALWAYS AS IDENTITY,
    name CHARACTER VARYING(100) NOT NULL,
    item_type CHARACTER VARYING(50) NOT NULL, -- es: 'TOOL', 'WEAPON', 'CONSUMABLE'
    required_skill_id INTEGER REFERENCES public.skills(skill_id) DEFAULT NULL,
    equipment_slot CHARACTER VARYING(50) DEFAULT NULL, -- es: 'TOOL_MAIN', 'WEAPON_MAIN'
    bonus_crit_chance NUMERIC(5, 2) DEFAULT 0.00, -- 0.05 per 5%
    owner_id INTEGER REFERENCES public.users(user_id) DEFAULT NULL, -- Per tracciare l'inventario
    PRIMARY KEY (item_id)
);

-- 3. Crea la tabella user_equipment (oggetti attualmente equipaggiati)
CREATE TABLE public.user_equipment (
    user_id INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES public.items(item_id) ON DELETE CASCADE,
    slot_type CHARACTER VARYING(50) NOT NULL, -- es: 'TOOL_MAIN', 'WEAPON_MAIN'
    PRIMARY KEY (user_id, slot_type)
);

-- 4. Aggiorna dati skills (Assumendo Raccolta Risorse = 3 e Fabbricazione Base = 4)
INSERT INTO public.skills (name, base_class, parent_skill_id) VALUES
('Taglialegna', 'Raccoglitore', 3), -- Figlia di Raccolta Risorse
('Falegnameria', 'Fabbricatore', 4); -- Figlia di Fabbricazione Base

-- 5. Popola items (Strumenti di esempio)
-- Piccone (per Raccolta Risorse, ID 3)
INSERT INTO public.items (name, item_type, required_skill_id, equipment_slot, bonus_crit_chance, owner_id) VALUES
('Piccone di Rame Grezzo', 'TOOL', 3, 'TOOL_MAIN', 0.05, 4); -- Assegnato a Dan (ID 4) per i test

-- Ascia (per Taglialegna, ID 6)
INSERT INTO public.items (name, item_type, required_skill_id, equipment_slot, bonus_crit_chance, owner_id) VALUES
('Ascia Affilata', 'TOOL', 6, 'TOOL_MAIN', 0.10, 4); -- Assegnato a Dan (ID 4) per i test