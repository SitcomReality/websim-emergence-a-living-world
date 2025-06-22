export class Building {
    constructor(ownerId, x, y, type = 'home') {
        this.id = `building_${Math.random().toString(36).substring(2, 9)}`;
        this.ownerId = ownerId;
        this.x = x;
        this.y = y;
        this.type = type;
        this.level = 1;
        this.width = 24;
        this.height = 24;
    }
}

export class BuildingManager {
    constructor(world) {
        this.world = world;
        this.buildings = [];
    }

    createHomeForEntity(entity, x, y) {
        const home = new Building(entity.id, x, y);
        this.buildings.push(home);
        return home;
    }

    getBuildings() {
        return this.buildings;
    }

    getBuildingForEntity(entityId) {
        return this.buildings.find(b => b.ownerId === entityId);
    }

    reset() {
        this.buildings = [];
    }
}