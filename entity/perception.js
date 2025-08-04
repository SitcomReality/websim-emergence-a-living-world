// New file
export function findClosestResourceNode(entity, resourceType) {
    const otherEntities = entity.world.getEntities().filter(e => e.id !== entity.id);
    const busyNodeIds = new Set();
    otherEntities.forEach(e => {
        if (e.task && (e.task.current.startsWith('gathering') || e.task.current.startsWith('Harvesting')) && e.task.target) {
            busyNodeIds.add(e.task.target.id);
        }
    });

    const nodes = entity.world.getResourceNodes().filter(n =>
        n.type === resourceType &&
        n.amount > 0 &&
        !busyNodeIds.has(n.id)
    );
    if (nodes.length === 0) return null;

    let closestNode = null;
    let minDistance = Infinity;

    for (const node of nodes) {
        const distance = entity.world.getDistance(entity, node);
        if (distance < minDistance) {
            minDistance = distance;
            closestNode = node;
        }
    }
    return closestNode;
}

export function findNearbyEntity(entity, range = 100) {
    const entities = entity.world.getEntities().filter(e => e.id !== entity.id);
    if (entities.length === 0) return null;
    
    let closest = null;
    let closestDistance = Infinity;
    
    for (const otherEntity of entities) {
        const distance = entity.world.getDistance(entity, otherEntity);
        if (distance < closestDistance) {
            closest = otherEntity;
            closestDistance = distance;
        }
    }
    
    return closestDistance < range ? closest : null;
}

