/**
 * MapRenderer — Isometric SVG world map + HTML5 Canvas local map
 */
class MapRenderer {

    // ── Isometric projection constants ───────────────────────────────────────
    static TILE_W  = 100;
    static TILE_H  = 50;
    static SVG_CX  = 330;
    static SVG_CY  = 210;

    // ── Biome palette ─────────────────────────────────────────────────────────
    static BIOME_COLORS = {
        pianura  : { top: '#8fbc4a', left: '#6a8f35', right: '#7da044' },
        foresta  : { top: '#3a7a2e', left: '#255220', right: '#2d6024' },
        montagna : { top: '#8a7565', left: '#6a5a4c', right: '#7a6858' },
        palude   : { top: '#4a6e3a', left: '#324d27', right: '#3e5f30' },
        grotta   : { top: '#3a3a3a', left: '#222222', right: '#2e2e2e' },
        deserto  : { top: '#d4b46a', left: '#a8883e', right: '#bea054' },
        rovine   : { top: '#6a5e4a', left: '#4d4535', right: '#5c5040' },
    };

    static BIOME_BADGE_COLORS = {
        pianura  : '#6a8f35',
        foresta  : '#255220',
        montagna : '#6a5a4c',
        palude   : '#324d27',
        grotta   : '#222222',
        deserto  : '#a8883e',
        rovine   : '#4d4535',
    };

    // Unicode glyphs shown on local canvas tiles
    static TAG_GLYPHS = {
        'Legno'                   : '🌲',
        'Pietra'                  : '🪨',
        'Erba'                    : '🌿',
        'Resina'                  : '🫙',
        'Radici'                  : '🌱',
        'Sabbia'                  : '🏜',
        'Argilla'                 : '🟫',
        'Minerale Ferroso'        : '⛏',
        'Cristallo Grezzo'        : '💎',
        'Fungo Bioluminescente'   : '🍄',
        'Pietra Oscura'           : '🖤',
        'Pietra Incisa'           : '📜',
        'Fibra Arcana'            : '✨',
        'Polvere Antica'          : '💨',
    };

    constructor() {
        this._selectedKey = null;  // 'gx,gy' string
        this._tiles       = [];    // flat array of tile rows from API
        this._svgEl       = null;
    }

    // =========================================================================
    // WORLD MAP (SVG isometric)
    // =========================================================================

    /**
     * Renders the full world map SVG from a tiles array.
     * @param {Array}    tiles     — from API getTiles
     * @param {Function} onSelect  — callback(tile) when user clicks a tile
     */
    renderWorldMap(tiles, onSelect) {
        this._tiles  = tiles;
        this._svgEl  = document.getElementById('world-map-svg');
        if (!this._svgEl) return;

        // Clear
        while (this._svgEl.firstChild) this._svgEl.removeChild(this._svgEl.firstChild);

        // Painter's algorithm: sort so farther tiles (lower gx+gy) render first
        const sorted = [...tiles].sort((a, b) => (a.x + a.y) - (b.x + b.y));

        sorted.forEach(tile => {
            const g = this._buildTileGroup(tile, onSelect);
            this._svgEl.appendChild(g);
        });

        this._renderLegend(tiles);
    }

    /**
     * Refreshes a single tile in the SVG after observe.
     */
    updateTile(updatedTile) {
        const idx = this._tiles.findIndex(t => t.tile_id === updatedTile.tile_id);
        if (idx !== -1) this._tiles[idx] = updatedTile;

        const existing = this._svgEl.querySelector(`[data-tile-id="${updatedTile.tile_id}"]`);
        if (!existing) return;

        const onSelect = existing._onSelectCb;
        const newG     = this._buildTileGroup(updatedTile, onSelect);

        // Preserve selected state
        if (this._selectedKey === `${updatedTile.x},${updatedTile.y}`) {
            newG.classList.add('selected');
            const ring = newG.querySelector('.tile-select-ring');
            if (ring) ring.setAttribute('stroke-opacity', '1');
        }

        this._svgEl.replaceChild(newG, existing);
    }

    // ── Private SVG helpers ───────────────────────────────────────────────────

    _isoProject(gx, gy) {
        const hw = MapRenderer.TILE_W / 2;
        const hh = MapRenderer.TILE_H / 2;
        return {
            sx: MapRenderer.SVG_CX + (gx - gy) * hw,
            sy: MapRenderer.SVG_CY - (gx + gy) * hh,
        };
    }

    _buildTileGroup(tile, onSelect) {
        const { sx, sy } = this._isoProject(tile.x, tile.y);
        const hw = MapRenderer.TILE_W / 2;
        const hh = MapRenderer.TILE_H / 2;
        const depth = 10; // side wall height

        const biome  = (tile.biome || 'pianura').toLowerCase();
        const colors = MapRenderer.BIOME_COLORS[biome] || MapRenderer.BIOME_COLORS['pianura'];

        const revealed = !!tile.revealed;
        const visited  = !revealed && (tile.best_roll > 0);

        const ns = 'http://www.w3.org/2000/svg';

        const g = document.createElementNS(ns, 'g');
        g.setAttribute('class', 'iso-tile');
        g.setAttribute('data-tile-id', tile.tile_id);
        g.setAttribute('data-x', tile.x);
        g.setAttribute('data-y', tile.y);
        g._onSelectCb = onSelect;

        // ── Top face (diamond) ───────────────────────────────────────────────
        const topPath = `M ${sx},${sy - hh}
                         L ${sx + hw},${sy}
                         L ${sx},${sy + hh}
                         L ${sx - hw},${sy}
                         Z`;
        const top = document.createElementNS(ns, 'path');
        top.setAttribute('class', 'tile-base');
        top.setAttribute('d', topPath);
        top.setAttribute('fill', colors.top);
        top.setAttribute('stroke', '#1a0f00');
        top.setAttribute('stroke-width', '0.8');
        g.appendChild(top);

        // ── Left face ────────────────────────────────────────────────────────
        const leftPath = `M ${sx - hw},${sy}
                          L ${sx},${sy + hh}
                          L ${sx},${sy + hh + depth}
                          L ${sx - hw},${sy + depth}
                          Z`;
        const left = document.createElementNS(ns, 'path');
        left.setAttribute('d', leftPath);
        left.setAttribute('fill', colors.left);
        left.setAttribute('stroke', '#1a0f00');
        left.setAttribute('stroke-width', '0.8');
        g.appendChild(left);

        // ── Right face ───────────────────────────────────────────────────────
        const rightPath = `M ${sx},${sy + hh}
                           L ${sx + hw},${sy}
                           L ${sx + hw},${sy + depth}
                           L ${sx},${sy + hh + depth}
                           Z`;
        const right = document.createElementNS(ns, 'path');
        right.setAttribute('d', rightPath);
        right.setAttribute('fill', colors.right);
        right.setAttribute('stroke', '#1a0f00');
        right.setAttribute('stroke-width', '0.8');
        g.appendChild(right);

        // ── Fog overlay ──────────────────────────────────────────────────────
        if (!revealed) {
            const fogOpacity = visited ? 0.45 : 0.80;
            const fog = document.createElementNS(ns, 'path');
            fog.setAttribute('d', topPath);
            fog.setAttribute('fill', `rgba(0,0,0,${fogOpacity})`);
            fog.setAttribute('stroke', 'none');
            fog.setAttribute('pointer-events', 'none');
            g.appendChild(fog);
        }

        // ── Selection ring ───────────────────────────────────────────────────
        const ring = document.createElementNS(ns, 'path');
        ring.setAttribute('class', 'tile-select-ring');
        ring.setAttribute('d', topPath);
        ring.setAttribute('fill', 'none');
        ring.setAttribute('stroke', '#f0d060');
        ring.setAttribute('stroke-width', '2');
        ring.setAttribute('stroke-opacity', '0');
        ring.setAttribute('pointer-events', 'none');
        g.appendChild(ring);

        // ── Biome label (only revealed) ──────────────────────────────────────
        if (revealed) {
            const lbl = document.createElementNS(ns, 'text');
            lbl.setAttribute('x', sx);
            lbl.setAttribute('y', sy + 4);
            lbl.setAttribute('text-anchor', 'middle');
            lbl.setAttribute('font-size', '8');
            lbl.setAttribute('fill', '#fff');
            lbl.setAttribute('pointer-events', 'none');
            lbl.setAttribute('opacity', '0.75');
            lbl.textContent = biome.charAt(0).toUpperCase() + biome.slice(1, 3);
            g.appendChild(lbl);
        }

        // ── Click handler ────────────────────────────────────────────────────
        g.addEventListener('click', () => {
            // Deselect previous
            if (this._selectedKey) {
                const prev = this._svgEl.querySelector('.iso-tile.selected');
                if (prev) {
                    prev.classList.remove('selected');
                    const pr = prev.querySelector('.tile-select-ring');
                    if (pr) pr.setAttribute('stroke-opacity', '0');
                }
            }
            g.classList.add('selected');
            ring.setAttribute('stroke-opacity', '1');
            this._selectedKey = `${tile.x},${tile.y}`;
            if (onSelect) onSelect(tile);
        });

        return g;
    }

    _renderLegend(tiles) {
        const legendEl = document.getElementById('map-legend');
        if (!legendEl) return;
        legendEl.innerHTML = '';

        const biomes = [...new Set(tiles.map(t => t.biome.toLowerCase()))].sort();
        biomes.forEach(biome => {
            const color = MapRenderer.BIOME_COLORS[biome]?.top || '#888';
            const item = document.createElement('div');
            item.className = 'flex items-center gap-1 text-xs text-[#8C6239]';
            item.innerHTML = `
                <span style="display:inline-block;width:12px;height:12px;background:${color};border:1px solid #3d2410;border-radius:2px;"></span>
                <span class="capitalize">${biome}</span>
            `;
            legendEl.appendChild(item);
        });
    }

    // =========================================================================
    // TILE INFO PANEL
    // =========================================================================

    showTileIdle() {
        document.getElementById('tile-idle-msg')?.classList.remove('hidden');
        document.getElementById('tile-detail')?.classList.add('hidden');
    }

    showTileDetail(tile) {
        document.getElementById('tile-idle-msg')?.classList.add('hidden');
        document.getElementById('tile-detail')?.classList.remove('hidden');

        const biome = (tile.biome || 'wilderness').toLowerCase();
        const badgeEl = document.getElementById('tile-biome-badge');
        if (badgeEl) {
            badgeEl.textContent = biome;
            badgeEl.style.backgroundColor = MapRenderer.BIOME_BADGE_COLORS[biome] || '#6a5a4c';
        }

        const revealedBadge = document.getElementById('tile-revealed-badge');
        if (revealedBadge) {
            tile.revealed ? revealedBadge.classList.remove('hidden') : revealedBadge.classList.add('hidden');
        }

        const nameEl = document.getElementById('tile-biome-name');
        if (nameEl) nameEl.textContent = biome.charAt(0).toUpperCase() + biome.slice(1);

        const coordsEl = document.getElementById('tile-coords');
        if (coordsEl) coordsEl.textContent = `(${tile.x}, ${tile.y})`;

        const dcEl = document.getElementById('tile-dc');
        if (dcEl) dcEl.textContent = tile.dc;

        this._renderTags(tile);
        this._renderBestRoll(tile);
        this._hideRollPanel();
    }

    _renderTags(tile) {
        const list = document.getElementById('tile-tags-list');
        if (!list) return;
        list.innerHTML = '';

        const tags = tile.tags || [];
        if (!tile.revealed || tags.length === 0) {
            list.innerHTML = '<span class="text-xs text-[#8C6239] italic">Inesplorato</span>';
            return;
        }

        tags.forEach(tag => {
            const span = document.createElement('span');
            span.className = 'text-xs bg-[#A67B5B] text-white px-2 py-0.5 rounded-full';
            span.textContent = tag;
            list.appendChild(span);
        });
    }

    _renderBestRoll(tile) {
        const row = document.getElementById('tile-best-roll-row');
        const val = document.getElementById('tile-best-roll');
        if (!row || !val) return;

        if (tile.best_roll > 0) {
            row.classList.remove('hidden');
            val.textContent = tile.best_roll;
        } else {
            row.classList.add('hidden');
        }
    }

    // ── Roll animation ────────────────────────────────────────────────────────

    _hideRollPanel() {
        document.getElementById('roll-result-panel')?.classList.add('hidden');
    }

    showRollResult(rollResult) {
        const panel = document.getElementById('roll-result-panel');
        const num   = document.getElementById('roll-anim-number');
        const vs    = document.getElementById('roll-anim-vs');
        const grade = document.getElementById('roll-anim-grade');
        if (!panel || !num || !grade) return;

        panel.classList.remove('hidden');
        num.textContent   = rollResult.total;
        vs.textContent    = `vs DC ${rollResult.dc}  (d20: ${rollResult.roll}  +bonus: ${rollResult.perception_bonus})`;

        // Remove old grade classes
        grade.className = 'text-sm font-bold mt-2 py-1 px-3 rounded-full inline-block';

        const gradeMap = {
            CRIT_SUCCESS : { label: '★ Successo Critico!', cls: 'bg-green-200 text-green-800' },
            SUCCESS      : { label: '✓ Successo',          cls: 'bg-blue-100 text-blue-800'  },
            FAIL         : { label: '✗ Fallito',           cls: 'bg-red-100 text-red-700'   },
            CRIT_FAIL    : { label: '☠ Fallimento Critico', cls: 'bg-red-200 text-red-900'  },
        };

        const info = gradeMap[rollResult.grade] || { label: rollResult.grade, cls: 'bg-gray-100 text-gray-700' };
        grade.textContent = info.label;
        grade.classList.add(...info.cls.split(' '));

        // Pulse animation
        num.classList.remove('roll-pulse');
        void num.offsetWidth; // reflow
        num.classList.add('roll-pulse');
    }

    setObserveLoading(loading) {
        document.getElementById('observe-loading')?.classList.toggle('hidden', !loading);
        const btn = document.getElementById('btn-observe-tile');
        if (btn) btn.disabled = loading;
    }

    showMapMessage(msg, type = 'info') {
        const el = document.getElementById('map-message');
        if (!el) return;
        el.textContent = msg;
        el.className = `mb-4 p-3 rounded-lg text-sm ${
            type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' :
            type === 'error'   ? 'bg-red-100 text-red-800 border border-red-300' :
                                 'bg-[#EAE0D5] text-[#6F4E37] border border-[#A67B5B]'
        }`;
        el.classList.remove('hidden');
        setTimeout(() => el.classList.add('hidden'), 6000);
    }

    // =========================================================================
    // LOCAL MAP (Canvas 10×10)
    // =========================================================================

    /**
     * Renders a 10x10 local terrain detail for the selected tile.
     * Uses a seeded LCG so the same tile always looks the same.
     */
    renderLocalMap(tile) {
        const canvas = document.getElementById('local-map-canvas');
        const label  = document.getElementById('local-map-label');
        if (!canvas) return;

        if (label) label.textContent = tile ? `${tile.biome} (${tile.x}, ${tile.y})` : '—';
        if (!tile) return;

        const ctx  = canvas.getContext('2d');
        const W    = canvas.width;
        const H    = canvas.height;
        const COLS = 10;
        const ROWS = 10;
        const CW   = W / COLS;
        const CH   = H / ROWS;

        const biome    = (tile.biome || 'pianura').toLowerCase();
        const colors   = MapRenderer.BIOME_COLORS[biome] || MapRenderer.BIOME_COLORS['pianura'];
        const revealed = !!tile.revealed;

        // Seeded random: LCG with seed = tile_id
        let seed = tile.tile_id * 1000003;
        const rng = () => {
            seed = (seed * 1664525 + 1013904223) & 0xffffffff;
            return (seed >>> 0) / 0xffffffff;
        };

        ctx.clearRect(0, 0, W, H);

        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const rx = col * CW;
                const ry = row * CH;

                // Base color with slight variation
                const vary   = (rng() - 0.5) * 0.15;
                const base   = this._hexAdjust(colors.top, vary);
                ctx.fillStyle = base;
                ctx.fillRect(rx, ry, CW, CH);

                // Subtle grid line
                ctx.strokeStyle = 'rgba(0,0,0,0.12)';
                ctx.lineWidth   = 0.5;
                ctx.strokeRect(rx, ry, CW, CH);

                if (!revealed) continue;

                // Random terrain features
                const roll = rng();
                if (roll < 0.18) {
                    this._drawFeature(ctx, rx, ry, CW, CH, biome, rng);
                }
            }
        }

        // Fog overlay if not revealed
        if (!revealed) {
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = 'rgba(200,180,140,0.5)';
            ctx.font = 'bold 22px Cinzel, serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⬡  Non Esplorato', W / 2, H / 2);
        }
    }

    _drawFeature(ctx, rx, ry, cw, ch, biome, rng) {
        const cx = rx + cw / 2;
        const cy = ry + ch / 2;
        const sz = Math.min(cw, ch) * 0.35;

        ctx.save();
        ctx.font = `${sz * 1.8}px serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';

        const featureMap = {
            pianura  : ['🌿', '🌼', '🌱', '🪨'],
            foresta  : ['🌲', '🌳', '🍄', '🌿'],
            montagna : ['🪨', '⛰', '❄', '🌑'],
            palude   : ['🌿', '🍄', '💧', '🌱'],
            grotta   : ['🪨', '💎', '🕸', '🌑'],
            deserto  : ['🌵', '🏜', '🪨', '💀'],
            rovine   : ['🏚', '🪨', '📜', '⚰'],
        };

        const opts  = featureMap[biome] || featureMap['pianura'];
        const glyph = opts[Math.floor(rng() * opts.length)];
        ctx.fillText(glyph, cx, cy);
        ctx.restore();
    }

    /**
     * Lighten/darken a hex color by a factor in [-1, 1].
     */
    _hexAdjust(hex, factor) {
        let r = parseInt(hex.slice(1, 3), 16);
        let g = parseInt(hex.slice(3, 5), 16);
        let b = parseInt(hex.slice(5, 7), 16);

        r = Math.min(255, Math.max(0, Math.round(r + 255 * factor)));
        g = Math.min(255, Math.max(0, Math.round(g + 255 * factor)));
        b = Math.min(255, Math.max(0, Math.round(b + 255 * factor)));

        return `rgb(${r},${g},${b})`;
    }
}
