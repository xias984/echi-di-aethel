class MapPage {
    constructor(router) {
        this.router = router;
        this.gridSize = 10;
        this.mapData = [];
        this.terrains = [
            { id: 'pianura', color: '#84CC6D', hexColor: 0x84CC6D, name: 'Pianura', heightRange: [1, 2], chance: 0.4 },
            { id: 'foresta', color: '#2D662E', hexColor: 0x2D662E, name: 'Foresta', heightRange: [1, 3], chance: 0.3 },
            { id: 'montagna', color: '#888C8D', hexColor: 0x888C8D, name: 'Montagna', heightRange: [3, 8], chance: 0.15 },
            { id: 'acqua', color: '#4DA6FF', hexColor: 0x4DA6FF, name: 'Acqua', heightRange: [0, 0], chance: 0.15 }
        ];

        // 3D Engine Instance
        this.gameEngine = null;
    }

    onEnter() {
        // Initialize Map
        this.generateMapData();
        this.renderMap();
        this.setupEventListeners();
    }

    onLeave() {
        if (this.gameEngine) {
            this.gameEngine.destroy();
            this.gameEngine = null;
        }
    }

    // --- 2D MAP GENERATION ---

    generateMapData() {
        this.mapData = [];
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                // Procedural generation naive
                let rand = Math.random();
                let selectedTerrain = this.terrains[0];
                let cumulative = 0;

                for (let t of this.terrains) {
                    cumulative += t.chance;
                    if (rand <= cumulative) {
                        selectedTerrain = t;
                        break;
                    }
                }

                this.mapData.push({
                    x, y,
                    terrain: selectedTerrain
                });
            }
        }
    }

    renderMap() {
        const grid = $('#map-grid');
        grid.empty();

        this.mapData.forEach((tile, index) => {
            const tileEl = $(`
                <div class="tile cursor-pointer w-full h-full rounded-sm hover:-translate-y-1 hover:shadow-lg hover:z-10 transition-all duration-200" 
                     style="background-color: ${tile.terrain.color};"
                     title="${tile.terrain.name} (${tile.x}, ${tile.y})"
                     data-index="${index}">
                </div>
            `);
            grid.append(tileEl);
        });
    }

    setupEventListeners() {
        $('#map-grid').on('click', '.tile', (e) => {
            const index = $(e.currentTarget).data('index');
            const tile = this.mapData[index];
            this.startEsploration(tile);
        });

        $('#exit-3d-btn').on('click', (e) => {
            e.stopPropagation(); // Previene il click dal attivare i controls
            this.exitEsploration();
        });

        // PointerLock event listeners setup via blockers
        const blocker = document.getElementById('blocker');
        if (blocker) {
            blocker.addEventListener('click', () => {
                if (this.gameEngine) {
                    const controls = this.gameEngine.getControls();
                    if (controls && !controls.isLocked) {
                        controls.lock();
                    }
                }
            });
        }
    }

    // --- 3D ESPLORATION ---

    startEsploration(tileData) {
        // We do not fadeOut the 2D container to preserve the DOM height of the relative parent wrapper.
        // map-3d-container is absolute inset-0 positioned so it will cover the 2D map perfectly.
        $('#map-3d-container').removeClass('hidden').hide().fadeIn(300, () => {
            if (!this.gameEngine) {
                this.gameEngine = new GameEngine('3d-canvas-container');
            }
            // Bind UI lock events to GameEngine's controls
            const controls = this.gameEngine.getControls();
            const blocker = document.getElementById('blocker');
            controls.addEventListener('lock', function () {
                blocker.style.display = 'none';
            });
            controls.addEventListener('unlock', function () {
                blocker.style.display = 'flex';
            });

            this.gameEngine.start(tileData);
        });
    }

    exitEsploration() {
        if (this.gameEngine) {
            const controls = this.gameEngine.getControls();
            if (controls) controls.unlock();

            this.gameEngine.destroy();
            this.gameEngine = null;
        }
        $('#map-3d-container').fadeOut(300, () => {
            $('#map-3d-container').addClass('hidden');
        });
    }
}
