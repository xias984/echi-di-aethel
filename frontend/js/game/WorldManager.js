class WorldManager {
    constructor() {
        this.chunkData = {
            terrain: [], // 2D array [i][j] containing { h, type }
            resources: {} // mapped by "x,y,z" string key: { type, x, y, z }
        };
        this.chunkSize = 100;
        this.blockSize = 5;
    }

    setTerrain(terrainData) {
        this.chunkData.terrain = terrainData;
    }

    addResource(x, y, z, type, metadata = {}) {
        const key = `${x},${y},${z}`;
        this.chunkData.resources[key] = { type, x, y, z, ...metadata };
    }

    removeResource(x, y, z) {
        const key = `${x},${y},${z}`;
        if (this.chunkData.resources[key]) {
            delete this.chunkData.resources[key];
            return true;
        }
        return false;
    }

    getResource(x, y, z) {
        const key = `${x},${y},${z}`;
        return this.chunkData.resources[key] || null;
    }

    getTerrainHeight(i, j) {
        if (i >= 0 && i < this.chunkSize && j >= 0 && j < this.chunkSize) {
            return this.chunkData.terrain[i][j] ? this.chunkData.terrain[i][j].h : 0;
        }
        return 0; // fallback per collisioni esterne
    }

    getChunkSize() {
        return this.chunkSize;
    }

    getBlockSize() {
        return this.blockSize;
    }
}
