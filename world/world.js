_generateResourceNodes() {
    const numClusters = Math.floor(Math.random() * 3) + 4; // 4 to 6 clusters
    const resourcesPerCluster = 20;

    for (let i = 0; i < numClusters; i++) {
        const clusterX = Math.random() * this.width;
        const clusterY = Math.random() * this.height;
        const clusterRadius = (Math.random() * 0.5 + 0.5) * 75; // 75-150
        const resourceType = RESOURCE_TYPES[Math.floor(Math.random() * RESOURCE_TYPES.length)];

        for (let j = 0; j < resourcesPerCluster; j++) {
            const angle = Math.random() * 2 * Math.PI;
            const radius = Math.random() * clusterRadius;
            const x = clusterX + Math.cos(angle) * radius;
            const y = clusterY + Math.sin(angle) * radius;

            if (x < 0 || x > this.width || y < 0 || y > this.height) continue;

            const id = `resource-${i}-${j}`;
            this.resources.set(id, {
                id: id,
                type: resourceType,
                x: x,
                y: y,
                amount: Math.floor(Math.random() * 50) + 50,
                maxAmount: 100
            });
        }
    }
}

_initializeBuildings() {
    const numHomes = 5;
    // ... existing code ...
    for (let i = 0; i < numHomes; i++) {
        const id = `building-${i}`;
        const building = {
            id: id,
            type: 'home',
            x: Math.random() * this.width,
            y: Math.random() * this.height
        };
        this.buildings.set(id, building);
    }
}

_initializeEntities() {
    const numEntities = 5;
    const homes = this.getBuildings().filter(b => b.type === 'home');

    for (let i = 0; i < numEntities; i++) {
        const id = `entity-${i}`;
        const home = homes.length > 0 ? homes[i % homes.length] : null;
        const homeId = home ? home.id : null;

        const entity = new Entity(
            id,
            Math.random() * this.width,
            Math.random() * this.height,
            homeId
        );
        this.entities.set(id, entity);
    }
}

getBuildings() {
    return Array.from(this.buildings.values());
}

getBuilding(id) {
    return this.buildings.get(id);
}

getResourceNodes() {
    return Array.from(this.resources.values());
}

getResource(id) {
    return this.resources.get(id);
}

getEntities() {
    return Array.from(this.entities.values());
}