// New file
export class State {
    constructor(entity) {
        this.entity = entity;

        // Managed state properties
        this.home = null;
        this.storageShed = null;
        this.homeLocation = null; // Planned {x, y} for home
        this.settlementRotation = 0;

        // IDs for serialization
        this.homeId = null;
        this.storageShedId = null;
    }

    get homeX() {
        return this.home ? this.home.x : (this.homeLocation ? this.homeLocation.x : null);
    }

    get homeY() {
        return this.home ? this.home.y : (this.homeLocation ? this.homeLocation.y : null);
    }

    setHome(building) {
        this.home = building;
        if (building) {
            this.homeLocation = { x: building.x, y: building.y };
        }
    }

    isAtHome() {
        const hx = this.homeX;
        const hy = this.homeY;
        if (hx === null || hy === null) return false;
        const dx = hx - this.entity.x;
        const dy = hy - this.entity.y;
        return Math.sqrt(dx * dx + dy * dy) < 15; // A bit larger radius for home area
    }

    serialize() {
        return {
            homeId: this.home ? this.home.id : null,
            storageShedId: this.storageShed ? this.storageShed.id : null,
            homeLocation: this.homeLocation,
            settlementRotation: this.settlementRotation,
        };
    }

    deserialize(data) {
        if (!data) return;
        this.homeId = data.homeId;
        this.storageShedId = data.storageShedId;
        this.homeLocation = data.homeLocation;
        this.settlementRotation = data.settlementRotation || 0;
    }

    linkSavedData(world) {
        if (this.homeId) {
            this.home = world.buildingManager.getBuildingById(this.homeId);
        }
        if (this.storageShedId) {
            this.storageShed = world.buildingManager.getBuildingById(this.storageShedId);
        }
    }
}

