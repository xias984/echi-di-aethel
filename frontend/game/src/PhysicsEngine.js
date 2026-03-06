class PhysicsEngine {
    constructor(camera, domElement) {
        this.camera = camera;
        this.controls = new THREE.PointerLockControls(camera, domElement);

        this.heightMapData = [];
        this.worldBounds = 0;

        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.canJump = false;

        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();

        this.handleKeyDown = this.onKeyDown.bind(this);
        this.handleKeyUp = this.onKeyUp.bind(this);

        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
    }

    setTerrainData(heightMapData, worldBounds) {
        this.heightMapData = heightMapData;
        this.worldBounds = worldBounds;
    }

    getControls() {
        return this.controls;
    }

    onKeyDown(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = true;
                break;
            case 'Space':
                if (this.canJump === true) this.velocity.y += 150;
                this.canJump = false;
                break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = false;
                break;
        }
    }

    update(delta) {
        if (!this.controls.isLocked) return;

        // Damping velocity
        this.velocity.x -= this.velocity.x * 10.0 * delta;
        this.velocity.z -= this.velocity.z * 10.0 * delta;
        this.velocity.y -= 9.8 * 50.0 * delta; // 50.0 = mass

        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize(); // consistent in all directions

        if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * 200.0 * delta;
        if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * 200.0 * delta;

        const playerPos = this.controls.getObject().position;
        const chunkSize = 100;
        const blockSize = 5;
        const playerHeight = 5;
        const colliderRadius = 2.0;

        let nextX = playerPos.x - (this.velocity.x * delta);
        let nextZ = playerPos.z - (this.velocity.z * delta);

        const getTerrainHeight = (xPos, zPos) => {
            let i = Math.round((xPos / blockSize) + (chunkSize / 2));
            let j = Math.round((zPos / blockSize) + (chunkSize / 2));
            if (this.heightMapData && i >= 0 && i < chunkSize && j >= 0 && j < chunkSize) {
                return this.heightMapData[i][j];
            }
            return 0;
        };

        // COLLISIONI LATERALI (Muri)
        let targetGroundHeightX = getTerrainHeight(nextX + (Math.sign(-this.velocity.x) * colliderRadius), playerPos.z);
        let targetGroundHeightZ = getTerrainHeight(playerPos.x, nextZ + (Math.sign(-this.velocity.z) * colliderRadius));

        let currentFeetHeight = playerPos.y - playerHeight;
        const stepMaxHeight = 3;

        if (targetGroundHeightX > currentFeetHeight + stepMaxHeight) {
            this.velocity.x = 0;
        } else {
            this.controls.moveRight(-this.velocity.x * delta);
        }

        if (targetGroundHeightZ > currentFeetHeight + stepMaxHeight) {
            this.velocity.z = 0;
        } else {
            this.controls.moveForward(-this.velocity.z * delta);
        }

        // COLLISIONE COL PAVIMENTO (Gravità)
        let currentI = Math.round((this.controls.getObject().position.x / blockSize) + (chunkSize / 2));
        let currentJ = Math.round((this.controls.getObject().position.z / blockSize) + (chunkSize / 2));

        let floorHeight = 5;
        if (this.heightMapData && currentI >= 0 && currentI < chunkSize && currentJ >= 0 && currentJ < chunkSize) {
            floorHeight = this.heightMapData[currentI][currentJ];
        }

        this.controls.getObject().position.y += (this.velocity.y * delta);

        let headHeightPos = floorHeight + playerHeight;
        if (this.controls.getObject().position.y <= headHeightPos) {
            this.velocity.y = 0;
            this.controls.getObject().position.y = headHeightPos;
            this.canJump = true;
        }

        // Assicuriamoci che non esca dai confini della mappa
        if (this.worldBounds > 0) {
            const border = this.worldBounds - 5;
            if (this.controls.getObject().position.x > border) this.controls.getObject().position.x = border;
            if (this.controls.getObject().position.x < -border) this.controls.getObject().position.x = -border;
            if (this.controls.getObject().position.z > border) this.controls.getObject().position.z = border;
            if (this.controls.getObject().position.z < -border) this.controls.getObject().position.z = -border;
        }
    }

    dispose() {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        this.controls.disconnect();
    }
}
