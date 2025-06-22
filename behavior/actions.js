// Defines the specific actions an entity can take.

export function wander(entity) {
    entity.currentTask = 'wandering';
    const range = entity.personality.traits.curiosity > 0.7 ? 200 : 100;
    entity.targetX = entity.x + (Math.random() - 0.5) * range;
    entity.targetY = entity.y + (Math.random() - 0.5) * range;

    // Keep within bounds
    entity.targetX = Math.max(20, Math.min(entity.world.width - 20, entity.targetX));
    entity.targetY = Math.max(20, Math.min(entity.world.height - 20, entity.targetY));
}

export function sleep(entity) {
    if (entity.home) {
        if (entity.isAtHome()) {
            entity.currentTask = 'sleeping';
            entity.isSleeping = true;
            entity.world.eventSystem.addEvent(`${entity.getName()} is going to sleep.`);
        } else {
            entity.targetX = entity.homeX;
            entity.targetY = entity.homeY;
            entity.targetNode = entity.home;
            entity.currentTask = 'going home to sleep';
        }
    } else {
        // Homeless entities find a secluded spot to rest
        entity.currentTask = 'sleeping';
        entity.isSleeping = true; // They sleep where they are, less effective
        entity.world.eventSystem.addEvent(`${entity.getName()} rests under the stars.`);
    }
}

export function findHomeLocation(entity) {
    entity.currentTask = 'finding a home location';
    // Simplified logic: find a good spot near resources, not too close to others.
    // This could be a complex scoring system in the future.
    const bestSpot = entity.world.buildingManager.findBestBuildLocation(entity);

    if (bestSpot) {
        entity.homeLocation = { x: bestSpot.x, y: bestSpot.y };
        entity.world.eventSystem.addEvent(`${entity.getName()} has chosen a location for a new home.`);
        // Immediately transition to building a storage shed
        buildStorageShed(entity);
    } else {
        // Can't find a spot, wander and try again later
        wander(entity);
    }
}

export function buildStorageShed(entity) {
    if (!entity.homeLocation) {
        findHomeLocation(entity);
        return;
    }

    const woodNeeded = 1;
    const woodAvailable = entity.resources.wood + entity.inventory.getAmount('wood');

    if (woodAvailable >= woodNeeded) {
        // We have the wood, now go to the location and build
        entity.targetX = entity.homeLocation.x;
        entity.targetY = entity.homeLocation.y;
        entity.currentTask = 'building storage';

    } else {
        // Need to gather wood first
        entity.currentTask = 'gathering for shed';
        gatherResource(entity, 'wood');
    }
}

export function constructBuilding(entity, building) {
     entity.targetX = building.x;
     entity.targetY = building.y;
     entity.targetNode = building; // Target the construction site
     entity.currentTask = `constructing ${building.type.replace('_construction_site', '')}`;
}

export function gatherResource(entity, resourceType) {
    const targetNode = entity.findClosestResourceNode(resourceType);
    if (targetNode) {
        entity.targetNode = targetNode;
        entity.targetX = targetNode.x;
        entity.targetY = targetNode.y;
        entity.currentTask = `gathering ${resourceType}`;
    } else {
        // If no node of that type is found, maybe explore?
        explore(entity);
    }
}

export function depositResources(entity) {
    if (entity.inventory.items.length === 0) {
        entity.currentTask = 'idle';
        return;
    };

    const depositPoint = entity.getDepositPoint();
    if (depositPoint) {
        entity.targetX = depositPoint.x;
        entity.targetY = depositPoint.y;
        entity.targetNode = depositPoint; // Can be a building
        entity.currentTask = 'depositing';
    } else {
        // This case should ideally not be hit if logic is correct
        entity.currentTask = 'idle';
    }
}

export function explore(entity) {
    entity.currentTask = 'exploring';
    // Aim for a region of the map they haven't been to recently
    entity.targetX = Math.random() * entity.world.width;
    entity.targetY = Math.random() * entity.world.height;
    entity.world.eventSystem.addEvent(`${entity.getName()} went off to explore.`);
}

export function seekSocialInteraction(entity) {
    const nearbyEntity = entity.findNearbyEntity();
    if (nearbyEntity) {
        entity.targetX = nearbyEntity.x;
        entity.targetY = nearbyEntity.y;
        entity.currentTask = 'socializing';
        entity.world.eventSystem.addEvent(`${entity.getName()} is seeking social interaction.`);
    } else {
        wander(entity);
    }
}

export function pursueTrade(entity) {
    const nearbyEntity = entity.findNearbyEntity(150); // Larger radius for trading
    if (nearbyEntity && entity.world.canTrade(entity, nearbyEntity)) {
        entity.world.executeTrade(entity, nearbyEntity);
        entity.currentTask = 'idle';
    } else {
        // Wander to find others
        wander(entity);
        entity.currentTask = 'seeking trade';
    }
}