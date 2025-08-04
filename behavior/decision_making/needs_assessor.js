// New file

export function getNeeds(entity) {
    const needs = [];
    const resources = entity.getResources();

    if (resources.food < 3) needs.push('food');

    if (!entity.home) {
        if (!entity.storageShed) {
             if (entity.getCarriedResourceAmount('wood') + resources.wood < 1) needs.push('wood');
        } else {
            const neededForHome = entity.storageShed.getNeededResourcesFor('home');
            if (neededForHome.length > 0) needs.push(...neededForHome);
        }
    } else if (resources.wood < 2) {
        needs.push('wood');
    }

    if (resources.stone < 2) needs.push('stone');

    return [...new Set(needs)];
}

// Determine the most pressing need
export function getUrgentNeed(entity) {
    const resources = entity.getResources(); // Use the getter method
    const { home } = entity;
    if (resources.food < 1 && (home?.inventory?.cooked_food || 0) < 1) return 'food'; // Raw food if desperate
    return null;
}

export function getNeededProcessedResource(entity) {
    if (entity.home) return null; // Logic is currently for pre-home state

    if (entity.storageShed) {
         const needed = entity.storageShed.getNeededResourcesFor('home');
         if (needed.length > 0) {
             const processedType = needed[0];
             const rawType = entity.world.getRawResourceFor(processedType);
             if (rawType && (entity.storageShed.inventory[rawType] || 0) >= 1) {
                 return rawType;
             }
         }
    }
    return null;
}