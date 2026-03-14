-- Migration: add process_actions, identification_tags, xp_earnings to blueprints
-- Apply with:
-- cat migrations/import/migration_add_blueprint_jsonb_fields.sql | docker compose exec -T db psql -U user_aethel -d db_aethel

ALTER TABLE public.blueprints
    ADD COLUMN process_actions     JSONB,
    ADD COLUMN identification_tags JSONB,
    ADD COLUMN xp_earnings         JSONB;

COMMENT ON COLUMN public.blueprints.process_actions     IS 'Azioni di processo selezionate dall''IA durante la sintesi (array di stringhe)';
COMMENT ON COLUMN public.blueprints.identification_tags IS 'Tag di identificazione divisi per livello: {base, technical, expert}';
COMMENT ON COLUMN public.blueprints.xp_earnings         IS 'XP guadagnabili usando il blueprint, per skill: {"Fabbricazione Base": 75}';
