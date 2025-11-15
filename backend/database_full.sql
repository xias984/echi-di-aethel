-- file: backend/database_full.sql

-- Migration script per Lotto 7: Risorse e Gerarchia Skill XP

-- 1. Aggiungi la colonna di gerarchia alla tabella skills (Lotto 6)
ALTER TABLE public.skills
ADD COLUMN parent_skill_id INTEGER REFERENCES public.skills(skill_id) DEFAULT NULL;

-- 2. Crea la tabella items (per strumenti e oggetti in inventario/equipaggiamento - Lotto 6)
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

-- 3. Crea la tabella user_equipment (oggetti attualmente equipaggiati - Lotto 6)
CREATE TABLE public.user_equipment (
    user_id INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES public.items(item_id) ON DELETE CASCADE,
    slot_type CHARACTER VARYING(50) NOT NULL, -- es: 'TOOL_MAIN', 'WEAPON_MAIN'
    PRIMARY KEY (user_id, slot_type)
);

-- 4. Tabella resources (Lotto 7): definisce le risorse e le associa alle skill
CREATE TABLE public.resources (
    resource_id INTEGER GENERATED ALWAYS AS IDENTITY,
    name CHARACTER VARYING(50) NOT NULL UNIQUE,
    skill_id INTEGER REFERENCES public.skills(skill_id) DEFAULT NULL, -- Skill primaria per ottenerla
    base_resource_type CHARACTER VARYING(50) NOT NULL, -- es: 'WOOD', 'ORE', 'HERB'
    PRIMARY KEY (resource_id)
);

-- 5. Tabella user_resources (Lotto 7): inventario delle risorse grezze
CREATE TABLE public.user_resources (
    user_resource_id INTEGER GENERATED ALWAYS AS IDENTITY,
    user_id INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    resource_id INTEGER NOT NULL REFERENCES public.resources(resource_id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0 NOT NULL,
    PRIMARY KEY (user_resource_id),
    UNIQUE (user_id, resource_id)
);

-- 6. Popola skills con gerarchia (Lotto 6) e aggiungi nuove skills
INSERT INTO public.skills (skill_id, name, base_class, description, max_level, parent_skill_id) VALUES
(6, 'Taglialegna', 'Raccoglitore', 'Competenza nel taglio della legna.', 1000, 3), -- Parent: Raccolta Risorse (ID 3)
(7, 'Falegnameria', 'Fabbricatore', 'Lavorazione base del legno grezzo.', 1000, 4); -- Parent: Fabbricazione Base (ID 4)

-- Aggiorna i valori di skill_id_seq
SELECT setval('public.skills_skill_id_seq', 7, true);

-- 7. Popola resources (Lotto 7)
INSERT INTO public.resources (name, skill_id, base_resource_type) VALUES
('Legno Grezzo', 6, 'WOOD'), -- Ottenuto con Taglialegna (ID 6)
('Pietra Grezza', 3, 'ORE'), -- Ottenuto con Raccolta Risorse (ID 3)
('Erba Medica', 3, 'HERB'); -- Ottenuto con Raccolta Risorse (ID 3)

-- 8. Popola items (Strumenti di esempio - Lotto 6)
-- Piccone (per Raccolta Risorse, ID 3)
INSERT INTO public.items (name, item_type, required_skill_id, equipment_slot, bonus_crit_chance, owner_id) VALUES
('Piccone di Rame Grezzo', 'TOOL', 3, 'TOOL_MAIN', 0.05, 4); -- Assegnato a Dan (ID 4) per i test

-- Ascia (per Taglialegna, ID 6)
INSERT INTO public.items (name, item_type, required_skill_id, equipment_slot, bonus_crit_chance, owner_id) VALUES
('Ascia Affilata', 'TOOL', 6, 'TOOL_MAIN', 0.10, 4); -- Assegnato a Dan (ID 4) per i test