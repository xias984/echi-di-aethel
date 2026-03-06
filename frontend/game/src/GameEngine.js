class GameEngine {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) throw new Error("Game container not found");

        if (typeof THREE === 'undefined') {
            throw new Error("Three.js not loaded");
        }

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 1, 1000);
        this.camera.position.y = 10;

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);

        // Modules
        this.terrain = new TerrainGenerator(this.scene);
        this.physics = new PhysicsEngine(this.camera, this.container);

        this.animationFrameId = null;
        this.prevTime = performance.now();

        this.handleResize = this.onWindowResize.bind(this);
        this.animate = this.animate.bind(this);
    }

    start(tileData) {
        // Clear previous canvas if any
        this.container.innerHTML = '';
        $(`<div id="crosshair" class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none z-40 flex items-center justify-center opacity-70">
            <div class="w-full h-[2px] bg-white absolute"></div>
            <div class="h-full w-[2px] bg-white absolute"></div>
        </div>`).appendTo(this.container);
        this.container.appendChild(this.renderer.domElement);

        // Env Setup
        const skyColor = tileData.terrain.id === 'foresta' ? 0x87CEEB : 0x87CEEB;
        this.scene.background = new THREE.Color(skyColor);
        this.scene.fog = new THREE.Fog(skyColor, 0, 500);

        const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.75);
        light.position.set(0.5, 1, 0.75);
        this.scene.add(light);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight.position.set(100, 200, 50);
        this.scene.add(dirLight);

        // Generate Terrain and Pass Data to Physics
        this.terrain.generateChunk(tileData.terrain);
        this.physics.setTerrainData(this.terrain.getHeightMap(), this.terrain.getWorldBounds());

        this.scene.add(this.physics.getControls().getObject());

        window.addEventListener('resize', this.handleResize);

        this.prevTime = performance.now();
        this.animate();
    }

    getControls() {
        return this.physics.getControls();
    }

    onWindowResize() {
        if (this.camera && this.renderer && this.container) {
            this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        }
    }

    animate() {
        this.animationFrameId = requestAnimationFrame(this.animate);

        const time = performance.now();
        let delta = (time - this.prevTime) / 1000;
        if (delta > 0.1) delta = 0.1; // Cap delta against huge drops

        this.physics.update(delta);

        this.prevTime = time;
        this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        window.removeEventListener('resize', this.handleResize);

        this.physics.dispose();
        this.terrain.dispose();

        if (this.renderer) {
            this.container.innerHTML = ''; // Rimuove il canvas
            $(`<div id="crosshair" class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none z-40 flex items-center justify-center opacity-70">
                <div class="w-full h-[2px] bg-white absolute"></div>
                <div class="h-full w-[2px] bg-white absolute"></div>
            </div>`).appendTo(this.container);
            this.renderer.dispose();
        }

        // Clear scene manually remaining elements (lights, etc)
        while (this.scene.children.length > 0) {
            let go = this.scene.children[0];
            this.scene.remove(go);
            if (go.type === 'HemisphereLight' || go.type === 'DirectionalLight') {
                go.dispose && go.dispose();
            }
        }
    }
}
