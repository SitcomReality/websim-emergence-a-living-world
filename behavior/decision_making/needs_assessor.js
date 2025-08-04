// New file

// Determine the most pressing need
export function getUrgentNeed(entity) {
    const { resources, home } = entity;
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