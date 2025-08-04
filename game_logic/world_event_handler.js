// New file
export class WorldEventHandler {
    constructor(world) {
        this.world = world;
        this.cycleCount = 0;
        this.cycleTimer = 0;
        this.cycleInterval = 5000; // 5 seconds per cycle
    }

    reset() {
        this.cycleCount = 0;
        this.cycleTimer = 0;
    }

    update(deltaTime) {
        this.cycleTimer += deltaTime;
        if (this.cycleTimer >= this.cycleInterval) {
            this.completeCycle();
            this.cycleTimer = 0;
        }
    }
    
    completeCycle() {
        this.cycleCount++;
        this.checkEmergentEvents();
    }

    checkEmergentEvents() {
        // Population growth/decline
        if (this.world.entities.length < 15 && Math.random() < 0.3) {
            this.world.spawnNewEntity();
        }

        // Resource depletion events
        const resourceTotals = this.world.resourceManager.getTotalResources();
        const totalResources = Object.values(resourceTotals).reduce((sum, val) => sum + val, 0);
        if (totalResources < 10 && Math.random() < 0.2) {
            this.world.eventSystem.addEvent("Resources are running low! Entities are getting desperate.");
        }
    }

    serialize() {
        return {
            cycleCount: this.cycleCount,
            cycleTimer: this.cycleTimer,
        };
    }

    deserialize(data) {
        if (!data) return;
        this.cycleCount = data.cycleCount || 0;
        this.cycleTimer = data.cycleTimer || 0;
    }
}