// New file

export function canTradeProfitably(entity) {
    // Enhanced trade logic - can trade if we have a surplus of something we're good at producing
    const resources = entity.getResources();
    const bestSkills = entity.personality.getBestSkills(2);
    
    // Check if we have surplus in areas we're skilled at
    const skillfulSurpluses = bestSkills.filter(([skillName, level]) => {
        if (skillName.includes('_harvesting')) {
            const resourceType = skillName.replace('_harvesting', '');
            return level > 1.2 && resources[resourceType] > 8;
        }
        return false;
    });
    
    return skillfulSurpluses.length > 0 && entity.getNeeds().length > 0;
}

export function canTradeForResource(entity, resourceType) {
    // Check if entity has something valuable to trade and low skill in this resource
    const resources = entity.getResources();
    const harvestSkill = entity.personality.getSkill(`${resourceType}_harvesting`);
    
    // Look for surplus in resources we're good at
    const bestSkills = entity.personality.getBestSkills(2);
    const hasTradableSkills = bestSkills.some(([skillName, level]) => {
        if (skillName.includes('_harvesting')) {
            const resourceName = skillName.replace('_harvesting', '');
            return level > 1.2 && resources[resourceName] > 5;
        }
        return false;
    });
    
    return harvestSkill < 1.0 && hasTradableSkills;
}

export function canTradeForProcessedResource(entity, processedType) {
    if (!processedType) return false;
    const rawResourceType = entity.world.getRawResourceFor(processedType);
    if (!rawResourceType) return false;

    const processSkill = entity.personality.getSkill(`${rawResourceType}_processing`);
    const resources = entity.getResources();
    
    // Similar logic to resource trading
    const bestSkills = entity.personality.getBestSkills(2);
    const hasTradableSkills = bestSkills.some(([skillName, level]) => {
        if (skillName.includes('_processing')) {
            const resourceName = skillName.replace('_processing', '');
            const otherProcessedType = entity.world.getProcessedResourceFor(resourceName);
            return level > 1.2 && resources[otherProcessedType] > 3;
        }
        if (skillName.includes('_harvesting')) {
            const resourceName = skillName.replace('_harvesting', '');
            return level > 1.2 && resources[resourceName] > 5;
        }
        return false;
    });
    
    return processSkill < 1.0 && hasTradableSkills;
}