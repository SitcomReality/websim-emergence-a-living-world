// New file

import * as Actions from '../actions.js';

export function handleHomelessBehavior(entity) {
    // Step 1: Find a home location if we haven't
    if (!entity.homeLocation) {
        Actions.findHomeLocation(entity);
        return;
    }

    // Step 2: Build a storage shed if we don't have one
    if (!entity.storageShed) {
        Actions.buildStorageShed(entity);
        return;
    }

    // Step 3: Check if home construction has started
    let homeConstructionSite = entity.world.buildingManager.getBuildingAt(entity.homeLocation.x, entity.homeLocation.y);
    if (!homeConstructionSite || homeConstructionSite.ownerId !== entity.id) {
         // Start construction if we have enough resources in storage
        if (entity.storageShed.hasSufficientResourcesFor('home')) {
            entity.world.buildingManager.startHomeConstruction(entity, entity.homeLocation.x, entity.homeLocation.y);
            // The next decision cycle will pick up construction work
        } else {
            // Check if we need to process raw materials into processed ones
            const needed = entity.storageShed.getNeededResourcesFor('home');
            if (needed.length > 0) {
                const processedType = needed[0];
                const rawType = entity.world.getRawResourceFor(processedType);
                
                if (rawType) {
                    // Check if we have raw materials to process
                    if ((entity.storageShed.inventory[rawType] || 0) >= 1) {
                        Actions.processResource(entity, rawType, entity.storageShed);
                    } else {
                        // Need to gather raw materials first
                        Actions.gatherResource(entity, rawType);
                    }
                } else {
                    // Fallback - shouldn't happen with current resource types
                    Actions.wander(entity);
                }
            }
        }
        return;
    }

    // Step 4: Work on the construction site
    if (homeConstructionSite && homeConstructionSite.type === 'home_construction_site') {
        if (entity.isInventoryFull()) {
            Actions.depositResources(entity);
        } else {
            Actions.constructBuilding(entity, homeConstructionSite);
        }
        return;
    }

    // Fallback, should not be reached often
    Actions.wander(entity);
}