this.homeId = homeId; // ID of the home building
this.inventory = {
    wood: 0,
    food: 0,
    stone: 0,
    water: 0
};
this.inventoryCapacity = 20;
this.gatheringSpeed = 2; // units per tick
this.relationships = new Map(); // entityId -> {type: 'friend'/'enemy', strength: float}
this.target = null; // {x, y, ...}
this.state = 'idle'; // 'idle', 'wandering', 'gathering', 'returning'
this.path = [];
this.idleTimer = 0;

update(world, deltaTime) {
    const deltaSeconds = deltaTime / 1000;
    
    switch (this.state) {
        case 'idle':
            this.handleIdleState(world, deltaSeconds);
            break;
        case 'wandering':
            this.handleWanderingState(world);
            break;
        case 'gathering':
            this.handleGatheringState(world);
            break;
        case 'returning':
            this.handleReturningState(world);
            break;
    }

    if (this.target) {
        this.moveTowardsTarget(deltaSeconds);
    }
}

handleIdleState(world, deltaSeconds) {
    this.idleTimer += deltaSeconds;
    // Wait at home for a bit
    if (this.idleTimer > 2) {
        this.idleTimer = 0;
        if (this.getInventoryTotal() < this.inventoryCapacity) {
            this.state = 'wandering';
        }
    }
}

handleWanderingState(world) {
    const resource = this.findClosestResource(world);
    if (resource) {
        this.target = resource;
        this.state = 'gathering';
    } else {
        // Can't find any resources, just go home for now
        this.state = 'returning';
    }
}

handleGatheringState(world) {
    if (!this.target) {
        this.state = 'wandering';
        return;
    }

    const distance = this.distanceTo(this.target);
    if (distance < 5) {
        if (this.target.amount <= 0) {
            this.target = null;
            this.state = 'wandering';
            return;
        }
        
        const amountToGather = Math.min(this.gatheringSpeed, this.target.amount, this.inventoryCapacity - this.getInventoryTotal());
        
        this.inventory[this.target.type] += amountToGather;
        this.target.amount -= amountToGather;

        if (this.getInventoryTotal() >= this.inventoryCapacity) {
            this.state = 'returning';
        }
    }
}

handleReturningState(world) {
    const home = world.getBuilding(this.homeId);
    if (!home) {
        this.state = 'idle'; // No home? Nowhere to return to.
        this.target = null;
        return;
    }
    
    this.target = home;

    const distance = this.distanceTo(this.target);
    if (distance < 5) {
        // Arrived home, deposit resources
        Object.keys(this.inventory).forEach(type => {
            // For now, resources just vanish. Later, they could go to a central store.
            this.inventory[type] = 0;
        });
        this.state = 'idle';
        this.target = null;
    }
}

moveTowardsTarget(deltaSeconds) {
    if (!this.target) return;

    const speed = 30 * deltaSeconds;
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 1) {
        this.x += (dx / distance) * speed;
        this.y += (dy / distance) * speed;
    }
}

findClosestResource(world) {
    const resources = world.getResourceNodes();
    let closestResource = null;
    let minDistance = Infinity;

    resources.forEach(resource => {
        if (resource.amount > 0) {
            const distance = this.distanceTo(resource);
            if (distance < minDistance) {
                minDistance = distance;
                closestResource = resource;
            }
        }
    });

    return closestResource;
}

getInventoryTotal() {
    return Object.values(this.inventory).reduce((sum, current) => sum + current, 0);
}

distanceTo(target) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
}