# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Echi di Aethel** is a browser-based RPG/crafting simulation. Players discover resources, synthesize blueprints using AI validation, and interact via a d20 dice mechanics system. The stack is PHP 8.x (custom MVC backend), Vanilla JS SPA (frontend), PostgreSQL, and Google Gemini AI.

## Development Commands

All services run via Docker Compose:

```bash
docker compose up                        # Start all services
docker compose exec -it php ash          # Shell into PHP container
docker compose exec -it db psql -U user_aethel -d db_aethel  # PostgreSQL shell
```

**Access points:**
- App: `http://localhost:8088`
- pgAdmin: `http://localhost:5050` (admin@admin.com / admin)
- API: `http://localhost:8088/api/*`

**Run a migration:**
```bash
cat migrations/import/migration_name.sql | docker compose exec -T db psql -U user_aethel -d db_aethel
```

**Database backup:**
```bash
docker compose exec -T db pg_dump -U user_aethel -d db_aethel > backup_$(date +%Y%m%d_%H%M%S).sql
```

No test runner is configured — manual testing via browser and direct API calls.

## Architecture

### Backend (PHP MVC)

- **Entry point**: `backend/api/index.php` → `backend/config/router.php` (all route definitions)
- **Controllers** extend `BaseController` (JSON I/O helpers, auth checks)
- **Models** extend `BaseModel` (PDO + prepared statements, Active Record pattern)
- **Services**: `AIService.php` calls Google Gemini for blueprint synthesis
- **Logic**: `DiceEngine.php` handles d20 rolls

Request flow: `Nginx → PHP-FPM → Router → Controller → Model → (AIService) → JSON response`

All new API routes must be registered in `backend/config/router.php`.

### Frontend (Vanilla JS SPA)

- **Bootstrap**: `frontend/index.html` loads scripts in dependency order → `frontend/js/main.js` wires everything
- **StateManager**: stores `user_id` in localStorage
- **Router**: maps URL paths to Page classes
- **ApiManager** (`frontend/js/api.js`): all endpoints wrapped as named methods using jQuery AJAX

Each feature has a **Page** (logic + event listeners) and a **Renderer** (pure DOM manipulation):
- `LabPage.js` + `LabRenderer.js` for synthesis
- `ProfilePage.js` + `ProfileRenderer.js` for user profile
- `ContractsPage.js` + `ContractsRenderer.js` for contracts

When adding a new page: create `pages/XPage.js`, `renderers/XRenderer.js`, add `views/x.html`, register the route in `Router.js`, and add the script tags to `index.html`.

### Key Game Mechanics

**Blueprint Synthesis** (`ActionController.php` + `AIService.php`):
1. Two ingredients + temperature/pressure → compute `MD5(sorted ingredients + params)` hash
2. Roll d20 + INT modifier → determine rank (D/C/B/A/S)
3. If hash exists: check rank escalation (higher rank steals ownership)
4. If new: call Gemini → generate blueprint name + 10 universal modifiers
5. Store in `blueprints` table with royalty rate and owner

**d20 System**: `1d20 + Ability Modifier + Skill Bonus` — Modifier = `(score - 10) / 2`

**Biotic ticks** (every 15 min): hunger -2%, thirst -4%, stamina recovers +25%/hr offline (capped at 100%)

### Database (PostgreSQL)

Key tables: `users`, `blueprints` (hash-unique recipes with JSONB modifiers), `skills`, `user_skills`, `contracts`, `contract_messages`, `items`, `equipment`

Migrations live in `migrations/import/` as `.sql` files. Apply manually via Docker (see commands above).

### Configuration

- **`.env`**: `DB_NAME`, `DB_USER`, `DB_PASS`, `GEMINI_API_KEY`
- **`backend/config/config.php`**: `DB_HOST='db'` (Docker service name), `MAX_LEVEL=1000`, `INITIAL_XP_BONUS=1500`

### Design System

- **Palette**: Aethel browns/golds (`#c9a96e`, `#8B5E3C`, `#2c1810`, etc.)
- **Typography**: Cinzel serif for headings, system sans-serif for body
- **CSS framework**: Tailwind CSS (CDN) — avoid custom CSS when Tailwind utilities suffice
- **Chart library**: Chart.js for stats visualization
