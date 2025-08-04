import * as Actions from '../behavior/actions.js';

export function finishBuildingStorageShed(entity) {
    if (!entity.homeLocation || entity.storageShed) return;

    const woodNeeded = 1;
    // Check carried and home-stored resources
    let woodAvailable = entity.getCarriedResourceAmount('wood') + entity.resources.wood;

    if (woodAvailable >= woodNeeded) {
        entity.useResource('wood', woodNeeded);

        const shed = entity.world.buildingManager.createStorageShed(entity.id, entity.homeLocation.x, entity.homeLocation.y);
        entity.storageShed = shed;
        entity.world.eventSystem.addEvent(`${entity.name} built a storage shed.`);
        entity.currentTask = 'idle';
    } else {
        // This should not happen if logic is correct, but as a fallback:
        Actions.gatherResource(entity, 'wood');
        entity.currentTask = 'gathering for shed';
    }
}

export function workOnConstruction(entity) {
    const site = entity.targetNode;
    if (!site || !site.type.endsWith('_construction_site')) {
        entity.currentTask = 'idle';
        return;
    }

    const workAmount = 1; // Amount of "work" done per visit
    const completed = entity.world.buildingManager.advanceConstruction(site, workAmount);

    if (completed) {
        entity.world.eventSystem.addEvent(`${entity.name} finished building their home!`);
        entity.home = completed;
        entity.currentTask = 'idle';
        // The entity will stay at the new home location, can start a new action next cycle
    }
    // If not completed, the entity will stay here to work more on the next action cycle.
}

export function finishDepositing(entity) {
    if (entity.inventory.items.length === 0) return;

    const depositPoint = entity.task.targetNode;
    if (!depositPoint || !(depositPoint instanceof Object) || !('inventory' in depositPoint)) {
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

export function gatherFromTargetNode(entity) {
    if (!entity.task.targetNode || entity.isInventoryFull()) {
        entity.task.clearTarget();
        if (entity.isInventoryFull()) {
            Actions.depositResources(entity);
        } else {
            entity.task.idle();
        }
        return;
    }

    const gathered = entity.world.resourceManager.gatherFrom(entity.task.targetNode);
    if (gathered) {
        entity.inventory.add(gathered);
        entity.vitals.increaseEnergy(5);
        // Don't log every single gather event to reduce spam.
    }

    // Decide if we should continue gathering or go home
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