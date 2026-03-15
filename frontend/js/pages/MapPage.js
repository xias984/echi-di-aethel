/**
 * MapPage — Gestisce la logica della Carta di Aethel
 */
class MapPage {

    constructor(api, state, messages, mapRenderer) {
        this.api         = api;
        this.state       = state;
        this.messages    = messages;
        this.renderer    = mapRenderer;

        this._selectedTile = null;
        this._tiles        = [];
        this._initialized  = false;
    }

    // =========================================================================
    // Lifecycle
    // =========================================================================

    async onEnter() {
        const userId = this.state.getUserId();
        if (!userId) return;

        if (!this._initialized) {
            this._bindStaticEvents();
            this._initialized = true;
        }

        await this._loadMap(userId);
    }

    onExit() {
        // Nothing to tear down
    }

    // =========================================================================
    // Load & render
    // =========================================================================

    async _loadMap(userId) {
        try {
            const data = await this.api.getMapTiles(userId);
            this._tiles = data.tiles || [];

            this.renderer.renderWorldMap(this._tiles, (tile) => this._onTileSelected(tile));
            this.renderer.showTileIdle();
            this.renderer.renderLocalMap(null);
        } catch (err) {
            this.renderer.showMapMessage('Errore nel caricamento della mappa: ' + err.message, 'error');
        }
    }

    // =========================================================================
    // Tile selection
    // =========================================================================

    _onTileSelected(tile) {
        this._selectedTile = tile;
        this.renderer.showTileDetail(tile);
        this.renderer.renderLocalMap(tile);
    }

    // =========================================================================
    // Observe action
    // =========================================================================

    async _observeTile() {
        if (!this._selectedTile) return;

        const userId = this.state.getUserId();
        const { x, y } = this._selectedTile;

        this.renderer.setObserveLoading(true);

        try {
            const result = await this.api.observeTile(userId, x, y);

            // Animate roll
            this.renderer.showRollResult(result.roll_result);

            // Merge updated tile data back
            const updatedTile = {
                ...this._selectedTile,
                revealed  : result.tile.revealed,
                tags      : result.tile.tags,
                best_roll : result.observation.best_roll,
            };

            this._selectedTile = updatedTile;

            // Refresh tile in SVG
            this.renderer.updateTile(updatedTile);

            // Refresh tile detail panel
            this.renderer.showTileDetail(updatedTile);

            // Re-render local map if now revealed
            this.renderer.renderLocalMap(updatedTile);

            // Update local tiles cache
            const idx = this._tiles.findIndex(t => t.tile_id === updatedTile.tile_id);
            if (idx !== -1) this._tiles[idx] = updatedTile;

            const type = result.roll_result.success ? 'success' : 'info';
            this.renderer.showMapMessage(result.message, type);

        } catch (err) {
            this.renderer.showMapMessage('Errore osservazione: ' + err.message, 'error');
        } finally {
            this.renderer.setObserveLoading(false);
        }
    }

    // =========================================================================
    // Event binding
    // =========================================================================

    _bindStaticEvents() {
        $(document).on('click', '#btn-observe-tile', () => {
            this._observeTile();
        });
    }
}
