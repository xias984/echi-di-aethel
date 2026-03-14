-- Migration: add tier, base_value, weight_kg to blueprints
-- Apply with:
-- cat migrations/import/migration_add_blueprint_economy_fields.sql | docker compose exec -T db psql -U user_aethel -d db_aethel

ALTER TABLE public.blueprints
    ADD COLUMN tier       INTEGER        NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 5),
    ADD COLUMN base_value DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN weight_kg  DECIMAL(6, 3)  NOT NULL DEFAULT 0.000;

COMMENT ON COLUMN public.blueprints.tier       IS 'Potency tier 1-5, derived from synthesis rank (D=1 … S=5)';
COMMENT ON COLUMN public.blueprints.base_value IS 'Base market value in Aethel Gold';
COMMENT ON COLUMN public.blueprints.weight_kg  IS 'Physical weight of the synthesised asset in kilograms';
