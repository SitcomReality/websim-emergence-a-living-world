import * as Actions from '../behavior/actions.js';
import { Building } from '../building/building.js';

export function finishBuildingStorageShed(entity) {
    if (!entity.homeLocation || entity.storageShed) return;

    const woodNeeded = 5; // Updated to match building_specs
    // Check carried and home-stored resources
    let woodAvailable = entity.getCarriedResourceAmount('wood') + entity.resources.wood;

    if (woodAvailable >= woodNeeded) {
        entity.useResource('wood', woodNeeded);

        const shed = entity.world.buildingManager.createStorageShed(entity.id, entity.homeLocation.x, entity.homeLocation.y);
        entity.storageShed = shed;
        entity.world.eventSystem.addEvent(`${entity.name} built a storage shed.`);
        entity.task.idle();
    } else {
        // This should not happen if logic is correct, but as a fallback:
        Actions.gatherResource(entity, 'wood');
        entity.task.set('gathering for shed');
    }
}

export function workOnConstruction(entity) {
    const site = entity.targetNode;
    if (!site || !site.type.endsWith('_construction_site')) {
        entity.task.idle();
        return;
    }

    const workAmount = 1; // Amount of "work" done per visit
    const completed = entity.world.buildingManager.advanceConstruction(site, workAmount);

    if (completed) {
        entity.world.eventSystem.addEvent(`${entity.name} finished building their home!`);
        entity.home = completed;
        entity.task.idle();
        entity.task.clearGoal(); // Goal "Establishing a Home" is complete.
        // The entity will stay at the new home location, can start a new action next cycle
    }
    // If not completed, the entity will stay here to work more on the next action cycle.
}

export function processResourcesInBuilding(entity, deltaTime) {
    const job = entity.task.processingJob;
    const building = entity.task.targetNode;

    if (!job || !building) {
        entity.task.idle();
        return;
    }

    const rawAmount = building.inventory[job.rawType] || 0;
    if (rawAmount < job.amount) {
        // Not enough raw materials, stop processing.
        entity.task.idle();
        return;
    }
    
    // Get skill modifier for processing
    const skillName = `${job.rawType}_processing`;
    const skillLevel = entity.personality.getSkill(skillName);
    const speedMultiplier = skillLevel; // Higher skill = faster processing
    const yieldMultiplier = Math.max(0.8, Math.min(1.5, skillLevel)); // 0.8x to 1.5x yield based on skill
    
    // Base processing time: 3 seconds per unit, modified by skill
    const processingTimePerUnit = 3000 / speedMultiplier;
    const processingRate = deltaTime / processingTimePerUnit;
    
    const amountToProcess = Math.min(rawAmount, processingRate);

    building.inventory[job.rawType] -= amountToProcess;
    const processedAmount = amountToProcess * yieldMultiplier;
    building.inventory[job.processedType] = (building.inventory[job.processedType] || 0) + processedAmount;

    // Check if we're done with this batch
    if (building.inventory[job.rawType] < 1) {
        const totalProcessed = Math.round((building.inventory[job.processedType] || 0) * 10) / 10;
        entity.world.eventSystem.addEvent(`${entity.name} finished processing ${job.rawType} (skill: ${skillLevel.toFixed(1)}x).`);
        entity.task.idle();
    }
    // Otherwise, entity remains at the building to continue processing on next update.
}

export function finishDepositing(entity) {
    if (entity.inventory.items.length === 0) return;

    const depositPoint = entity.task.targetNode;
    if (!depositPoint || !(depositPoint instanceof Building) || !('inventory' in depositPoint)) {
        // Fallback: If no valid building, deposit to personal (home) storage
        entity.inventory.items.forEach(item => {
            entity.resources[item.type] = (entity.resources[item.type] || 0) + item.amount;
        });
        entity.world.eventSystem.addEvent(`${entity.name} stored items in their personal supply.`);
    } else {
        // Deposit into a building (shed or home)
        entity.inventory.items.forEach(item => {
            depositPoint.inventory[item.type] = (depositPoint.inventory[item.type] || 0) + item.amount;
        });
        const storedItems = entity.inventory.items.map(i => `${i.amount.toFixed(1)} ${i.type}`).join(', ');
        entity.world.eventSystem.addEvent(`${entity.name} stored ${storedItems} at their ${depositPoint.type}.`);
    }

    entity.inventory.clear();
    entity.task.idle();
}

export function gatherFromTargetNode(entity, deltaTime) {
    if (!entity.task.targetNode || entity.isInventoryFull()) {
        entity.task.clearTarget();
        if (entity.isInventoryFull()) {
            Actions.depositResources(entity);
        } else {
            entity.task.idle();
        }
        return;
    }

    // Set a more specific task name for UI clarity
    const resourceType = entity.task.targetNode.type;
    const taskName = `Harvesting ${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}`;
    if (entity.task.current !== taskName) {
        entity.task.set(taskName, entity.task.targetNode);
    }
    
    // Get skill modifier for harvesting
    const skillName = `${resourceType}_harvesting`;
    const skillLevel = entity.personality.getSkill(skillName);
    const speedMultiplier = skillLevel; // Higher skill = faster harvesting
    const yieldMultiplier = Math.max(0.7, Math.min(1.8, skillLevel)); // 0.7x to 1.8x yield based on skill
    
    // Base harvesting time: 2 seconds per unit, modified by skill
    const requiredProgress = 2000 / speedMultiplier;

    entity.task.harvestingProgress += deltaTime;

    if (entity.task.harvestingProgress >= requiredProgress) {
        entity.task.harvestingProgress = 0; // Reset for next unit

        const baseGathered = entity.world.resourceManager.gatherFrom(entity.task.targetNode);
        if (baseGathered) {
            // Apply yield multiplier
            const bonusAmount = baseGathered.amount * (yieldMultiplier - 1.0);
            const totalAmount = baseGathered.amount + bonusAmount;
            
            entity.inventory.add({
                type: baseGathered.type,
                amount: Math.round(totalAmount * 10) / 10
            });
            
            entity.vitals.increaseEnergy(2); // Small energy boost for success
            
            // Log exceptional harvests
            if (yieldMultiplier > 1.3) {
                entity.world.eventSystem.addEvent(`${entity.name} made an excellent harvest! (${totalAmount.toFixed(1)} ${baseGathered.type})`);
            }
        }

        // Decide if we should continue gathering or go home after getting one unit
        if (entity.isInventoryFull() || entity.task.targetNode.amount <= 0) {
            entity.task.clearTarget();
            if (entity.isInventoryFull()) {
                Actions.depositResources(entity);
            } else {
                // Node is empty, find something else to do
                entity.task.idle();
            }
        }
    }
    // If progress is not complete, the entity remains here to continue harvesting on the next update.
}