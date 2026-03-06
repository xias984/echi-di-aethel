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

        // Base World State JSON Manager
        this.worldManager = new WorldManager();

        // Game Modules
        this.terrain = new TerrainGenerator(this.scene, this.worldManager);
        this.physics = new PhysicsEngine(this.camera, this.container, this.worldManager);
        this.interaction = new InteractionEngine(this.camera, this.scene, this.worldManager);

        this.animationFrameId = null;
        this.prevTime = performance.now();

        this.handleResize = this.onWindowResize.bind(this);
        this.animate = this.animate.bind(this);
    }

    start(tileData) {
        // Clear previous canvas
        this.container.innerHTML = '';
        // Costruzione crosshair (mirino centrale per interact)
        $(`<div id="crosshair" class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none z-40 flex items-center justify-center opacity-70">
            <div class="w-full h-[2px] bg-white absolute"></div>
            <div class="h-full w-[2px] bg-white absolute"></div>
        </div>`).appendTo(this.container);
        this.container.appendChild(this.renderer.domElement);

        // Env
        const skyColor = tileData.terrain.id === 'foresta' ? 0x87CEEB : 0x87CEEB; // Customizzabile x tempesta/notte se serve
        this.scene.background = new THREE.Color(skyColor);
        this.scene.fog = new THREE.Fog(skyColor, 0, 500);

        const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.75);
        light.position.set(0.5, 1, 0.75);
        this.scene.add(light);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight.position.set(100, 200, 50);
        this.scene.add(dirLight);

        // Map Gen ed Estrazione Metadata
        this.terrain.generateChunk(tileData.terrain);

        // Passiamo vincoli fisici e risorse estratte agli appositi engine
        this.physics.setWorldBounds(this.terrain.getWorldBounds());
        this.interaction.setResourceMeshes(this.terrain.getResourceMeshes());

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
        if (delta > 0.1) delta = 0.1;

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
        this.interaction.dispose();

        if (this.renderer) {
            this.container.innerHTML = '';
            this.renderer.dispose();
        }

        while (this.scene.children.length > 0) {
            let go = this.scene.children[0];
            this.scene.remove(go);
            if (go.type === 'HemisphereLight' || go.type === 'DirectionalLight') {
                go.dispose && go.dispose();
            }
        }
    }
}
