class InteractionEngine {
    constructor(camera, scene, worldManager) {
        this.camera = camera;
        this.scene = scene;
        this.worldManager = worldManager;

        this.raycaster = new THREE.Raycaster();
        this.centerVector = new THREE.Vector2(0, 0); // Centro dello schermo normalizzato
        this.interactDistance = 25; // ca. 5 blocchi di distanza massima per estrarre

        this.resourceMeshes = [];

        this.handleMouseClick = this.onMouseClick.bind(this);
        document.addEventListener('mousedown', this.handleMouseClick);
    }

    setResourceMeshes(meshes) {
        this.resourceMeshes = meshes;
    }

    onMouseClick(event) {
        // Interagiamo solo col click sinistro (0) e se il mouse è bloccato (in gioco)
        if (event.button !== 0 || document.pointerLockElement === null) return;

        this.raycaster.setFromCamera(this.centerVector, this.camera);

        if (!this.resourceMeshes || this.resourceMeshes.length === 0) return;

        // Troviamo intersezioni con oggetti estraibili
        const intersects = this.raycaster.intersectObjects(this.resourceMeshes, false);

        if (intersects.length > 0) {
            const hit = intersects[0];
            if (hit.distance <= this.interactDistance) {
                const object = hit.object;
                if (object.userData && object.userData.isResource) {
                    this.extractResource(object);
                }
            }
        }
    }

    extractResource(meshObject) {
        const { blockX, blockY, blockZ, resourceType } = meshObject.userData;

        // Rimuoviamo dallo stato logico JSON
        const success = this.worldManager.removeResource(blockX, blockY, blockZ);

        if (success) {
            // Rimuoviamo dalla vista 3D
            this.scene.remove(meshObject);

            // Rimuoviamo dalla lista di controllo raycaster
            const index = this.resourceMeshes.indexOf(meshObject);
            if (index > -1) {
                this.resourceMeshes.splice(index, 1);
            }

            // Liberiamo memoria
            if (meshObject.geometry) meshObject.geometry.dispose();
            if (meshObject.material) meshObject.material.dispose();

            // Logica e UI (Feedback di raccolta)
            const resNameMap = {
                'wood': 'Legna',
                'stone': 'Pietra'
            };
            const labelName = resNameMap[resourceType] || 'Risorsa';
            this.showPopup(`+1 ${labelName}`);

            // TODO: Inviare eventuale chiamata API al backend per salvare l'inventario persistente al server se serve
        }
    }

    showPopup(text) {
        const $container = $('#3d-canvas-container'); // Il container deve esistere
        if ($container.length === 0) return;

        // Crea un micro div animato a centro schermo (leggermente in basso)
        const popup = $(`<div class="absolute top-[60%] left-1/2 transform -translate-x-1/2 text-white font-bold text-2xl drop-shadow-md z-50 transition-all duration-1000" style="text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">${text}</div>`);

        $container.append(popup);

        // Stile galleggiante verso l'alto e svanisce
        popup.animate({ top: '30%', opacity: 0 }, 1500, function () {
            $(this).remove();
        });
    }

    dispose() {
        document.removeEventListener('mousedown', this.handleMouseClick);
        this.resourceMeshes = [];
    }
}
