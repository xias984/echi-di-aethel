class TerrainGenerator {
    constructor(scene) {
        this.scene = scene;
        this.simplex = typeof SimplexNoise !== 'undefined' ? new SimplexNoise() : null;
        this.instancedMeshes = [];
        this.objects = []; // Elementi aggiuntivi di scena
        this.heightMapData = [];
        this.worldBounds = 0;
    }

    generateChunk(terrainInfo) {
        const chunkSize = 100; // 100x100 blocks
        const blockSize = 5;

        const isWater = terrainInfo.id === 'acqua';

        // Determiniamo altezze e frequenza in base al bioma
        let scale = 0.05; // frequenza del noise
        let heightMultiplier = 20;
        let baseHeight = 5;

        if (terrainInfo.id === 'pianura') {
            scale = 0.03;
            heightMultiplier = 10;
        } else if (terrainInfo.id === 'montagna') {
            scale = 0.08;
            heightMultiplier = 50;
        } else if (terrainInfo.id === 'acqua') {
            scale = 0.02;
            heightMultiplier = 5;
            baseHeight = 0;
        } else if (terrainInfo.id === 'foresta') {
            scale = 0.04;
            heightMultiplier = 25;
        }

        const boxGeometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
        const blockMaterial = new THREE.MeshLambertMaterial({ color: terrainInfo.hexColor });
        if (isWater) {
            blockMaterial.transparent = true;
            blockMaterial.opacity = 0.8;
            blockMaterial.side = THREE.DoubleSide;
        }

        const heightMapList = [];
        this.heightMapData = Array(chunkSize).fill().map(() => Array(chunkSize).fill(0));
        let totalBlocks = 0;

        for (let i = 0; i < chunkSize; i++) {
            for (let j = 0; j < chunkSize; j++) {

                // Generazione Noise
                let h = baseHeight;
                if (!isWater && this.simplex) {
                    let noiseVal = (this.simplex.noise2D(i * scale, j * scale) + 1) / 2;
                    h = Math.floor((noiseVal * heightMultiplier) / blockSize) * blockSize + baseHeight;
                    h = Math.max(h, blockSize);
                } else if (!this.simplex && !isWater) {
                    h = Math.floor(Math.random() * 3) * blockSize + baseHeight;
                }

                // Quanti cubi in verticale servono? 
                const cubesInStack = Math.ceil(h / blockSize);
                totalBlocks += cubesInStack;

                const topY = cubesInStack * blockSize;
                this.heightMapData[i][j] = topY; // Salviamo l'altezza massima per la fisica
                heightMapList.push({ i, j, h, cubesInStack });
            }
        }

        // Creazione Instanced Mesh principale
        const instancedMesh = new THREE.InstancedMesh(boxGeometry, blockMaterial, totalBlocks);
        this.scene.add(instancedMesh);
        this.instancedMeshes.push(instancedMesh);

        const dummy = new THREE.Object3D();
        let matrixIndex = 0;

        heightMapList.forEach(data => {
            const { i, j, h, cubesInStack } = data;
            const x = (i - chunkSize / 2) * blockSize;
            const z = (j - chunkSize / 2) * blockSize;

            // Creiamo la colonna
            for (let k = 0; k < cubesInStack; k++) {
                const y = (k * blockSize) + (blockSize / 2);
                dummy.position.set(x, y, z);
                dummy.updateMatrix();
                instancedMesh.setMatrixAt(matrixIndex++, dummy.matrix);
            }

            // Generazione Alberi (se foresta) sulla superficie
            if (terrainInfo.id === 'foresta' && h > 0 && Math.random() > 0.95 && this.simplex) {
                this.createTree(x, h + (blockSize / 2), z);
            }
        });

        instancedMesh.instanceMatrix.needsUpdate = true;

        // Piano di base (acqua/suolo profondo)
        const planeGeo = new THREE.PlaneGeometry(chunkSize * blockSize, chunkSize * blockSize);
        planeGeo.rotateX(- Math.PI / 2);
        const planeMat = new THREE.MeshBasicMaterial({ visible: false });
        const collisionPlane = new THREE.Mesh(planeGeo, planeMat);
        collisionPlane.position.y = baseHeight;
        this.scene.add(collisionPlane);
        this.objects.push(collisionPlane);

        // Limitiamo i movimenti ai bordi
        this.worldBounds = chunkSize * blockSize / 2;
    }

    createTree(x, y, z) {
        // Scala casuale tra 3x e 6x
        const scale = 3 + Math.random() * 3;

        // Tronco potenziato in base alla scala
        const trunkWidth = 1.0 * (scale * 0.5);
        const trunkHeight = 3.0 * scale;

        const trunkGeo = new THREE.BoxGeometry(trunkWidth, trunkHeight, trunkWidth);
        const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4D2E11 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);

        // y è l'altezza del terreno, quindi il centro del tronco va spostato in su della metà della sua altezza
        const trunkCenterY = y + (trunkHeight / 2);
        trunk.position.set(x, trunkCenterY, z);

        this.scene.add(trunk);
        this.objects.push(trunk);

        // Generazione Foglie (Chioma sfalsata)
        const foliageLevels = 2 + Math.floor(Math.random() * 2); // 2 o 3 livelli di chioma
        const leavesMat = new THREE.MeshLambertMaterial({ color: 0x245C1E });

        for (let i = 0; i < foliageLevels; i++) {
            // Più andiamo in alto, leggermente più piccola è la chioma
            const foliageSpread = (2.5 * scale) - (i * scale * 0.4);
            const foliageHeightOffset = trunkHeight - (scale * 0.5) + (i * scale * 1.5);

            const leavesGeo = new THREE.BoxGeometry(foliageSpread, foliageSpread * 0.8, foliageSpread);
            const leaves = new THREE.Mesh(leavesGeo, leavesMat);

            // Applichiamo un offset casuale per rendere l'albero asimmetrico e naturale
            const offsetX = (Math.random() - 0.5) * scale * 0.5;
            const offsetZ = (Math.random() - 0.5) * scale * 0.5;

            leaves.position.set(x + offsetX, y + foliageHeightOffset, z + offsetZ);

            this.scene.add(leaves);
            this.objects.push(leaves);
        }
    }

    getHeightMap() {
        return this.heightMapData;
    }

    getWorldBounds() {
        return this.worldBounds;
    }

    dispose() {
        this.instancedMeshes.forEach(i => {
            if (i.geometry) i.geometry.dispose();
            if (i.material) {
                if (Array.isArray(i.material)) i.material.forEach(m => m.dispose());
                else i.material.dispose();
            }
            this.scene.remove(i);
        });
        this.instancedMeshes = [];

        this.objects.forEach(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
            this.scene.remove(obj);
        });
        this.objects = [];
        this.heightMapData = [];
    }
}
