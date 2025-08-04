// Defines the specific actions an entity can take.

export function wander(entity) {
    entity.task.set('wandering');
    const range = entity.personality.traits.curiosity > 0.7 ? 200 : 100;
    entity.targetX = entity.x + (Math.random() - 0.5) * range;
    entity.targetY = entity.y + (Math.random() - 0.5) * range;

    // Keep within bounds
    entity.targetX = Math.max(20, Math.min(entity.world.width - 20, entity.targetX));
    entity.targetY = Math.max(20, Math.min(entity.world.height - 20, entity.targetY));
}

export function processResource(entity, rawResourceType, building) {
    const processedType = entity.world.getProcessedResourceFor(rawResourceType);
    if (!processedType) return;

    entity.targetX = building.x;
    entity.targetY = building.y;
    entity.task.setProcessing({
        rawType: rawResourceType,
        processedType: processedType,
        amount: 1
    }, building);
}

export function findHomeLocation(entity) {
    entity.task.set('finding a home location');
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

    const woodNeeded = 5; // Updated to match building_specs requirement
    const availableResources = entity.getResources();
    const woodAvailable = availableResources.wood + entity.inventory.getAmount('wood');

    if (woodAvailable >= woodNeeded) {
        // We have the wood, now go to the location and build
        entity.targetX = entity.homeLocation.x;
        entity.targetY = entity.homeLocation.y;
        entity.task.set('building storage');

    } else {
        // Need to gather wood first
        gatherResource(entity, 'wood');
    }
}

export function constructBuilding(entity, building) {
     entity.targetX = building.x;
     entity.targetY = building.y;
     entity.task.set(`constructing ${building.type.replace('_construction_site', '')}`, building);
}

export function gatherResource(entity, resourceType) {
    const target = entity.findClosestResourceNode(resourceType);
    if (target) {
        entity.targetX = target.x;
        entity.targetY = target.y;
        // Set a generic gathering task initially. It will be specified once harvesting begins.
        entity.task.set(`gathering ${resourceType}`, target);
    } else {
        // If no node of that type is found, maybe explore?
        explore(entity);
    }
}

export function depositResources(entity) {
    if (entity.inventory.items.length === 0) {
        entity.task.idle();
        return;
    };

    const depositPoint = entity.getDepositPoint();
    if (depositPoint) {
        entity.targetX = depositPoint.x;
        entity.targetY = depositPoint.y;
        entity.task.set('depositing', depositPoint);
    } else {
        // This case should ideally not be hit if logic is correct
        entity.task.idle();
    }
}

export function storeTradedGoods(entity) {
    if (entity.tradeInventory.items.length === 0) {
        entity.task.idle();
        return;
    }

    const depositPoint = entity.getDepositPoint();
    if (depositPoint) {
        entity.targetX = depositPoint.x;
        entity.targetY = depositPoint.y;
        entity.task.set('storing traded goods', depositPoint);
    } else {
        entity.task.idle(); // Can't store if no home
    }
}

export function explore(entity) {
    entity.task.set('exploring');
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
        entity.task.set('socializing', nearbyEntity);
        entity.world.eventSystem.addEvent(`${entity.getName()} is seeking social interaction.`);
    } else {
        wander(entity);
    }
}

export function pursueTrade(entity) {
    const nearbyEntity = entity.findNearbyEntity(150); // Larger radius for trading
    if (nearbyEntity && entity.world.interactionManager.canTrade(entity, nearbyEntity)) {
        entity.world.interactionManager.executeTrade(entity, nearbyEntity);
        entity.task.idle();
    } else {
        // Wander to find others
        wander(entity);
        entity.task.set('seeking trade');
    }
}

export function plantGarden(entity) {
    if (!entity.home) {
        wander(entity);
        return;
    }

    // Choose garden type based on personality
    const gardenType = entity.personality.traits.productivity > 0.6 ? 'food_garden' : 'flower_garden';
    const seedCost = gardenType === 'food_garden' ? 2 : 1; // Food gardens need more seeds
    
    if ((entity.getResources().food || 0) < seedCost) {
        gatherResource(entity, 'food'); // Need seeds
        return;
    }

    // Find a spot near home for the garden
    const angle = Math.random() * Math.PI * 2;
    const distance = 30 + Math.random() * 20;
    const gardenX = entity.home.x + Math.cos(angle) * distance;
    const gardenY = entity.home.y + Math.sin(angle) * distance;

    entity.targetX = gardenX;
    entity.targetY = gardenY;
    entity.task.set(`planting ${gardenType.replace('_', ' ')}`, { x: gardenX, y: gardenY, type: gardenType });
}

export function teachSkill(entity) {
    const nearbyEntity = entity.findNearbyEntity(80);
    if (!nearbyEntity) {
        seekSocialInteraction(entity);
        return;
    }

    // Use memory to find the best skill to teach
    let skillToTeach = null;
    
    // First, check if we remember this entity and know what they need
    const socialHistory = entity.memory.socialHistory.get(nearbyEntity.id);
    if (socialHistory && socialHistory.knownSkills) {
        // Look for skills where we're much better than what we remember them being
        const ourSkills = entity.personality.getBestSkills(3);
        skillToTeach = ourSkills.find(([skillName, ourLevel]) => {
            const rememberedLevel = socialHistory.knownSkills[skillName] || 0.5;
            return ourLevel > rememberedLevel + 0.4; // We must be significantly better than we remember them being
        });
    }
    
    // Fallback to the original logic if memory doesn't help
    if (!skillToTeach) {
        const ourSkills = entity.personality.getBestSkills(3);
        skillToTeach = ourSkills.find(([skillName, ourLevel]) => {
            const theirLevel = nearbyEntity.personality.getSkill(skillName);
            return ourLevel > theirLevel + 0.3; // We must be significantly better
        });
    }

    if (skillToTeach) {
        entity.targetX = nearbyEntity.x;
        entity.targetY = nearbyEntity.y;
        entity.task.set('teaching', { 
            student: nearbyEntity, 
            skill: skillToTeach[0],
            teacherLevel: skillToTeach[1]
        });
        entity.world.eventSystem.addEvent(`${entity.getName()} is teaching ${skillToTeach[0].replace('_', ' ')} to ${nearbyEntity.getName()}.`);
    } else {
        seekSocialInteraction(entity);
    }
}

// New action: Seek out the best teacher for a skill we want to improve
export function seekMentor(entity) {
    // Find our worst skills that could be improved
    const skillEntries = Object.entries(entity.personality.skills);
    const weakSkills = skillEntries
        .filter(([_, level]) => level < 1.5) // Skills that aren't already excellent
        .sort((a, b) => a[1] - b[1]); // Sort by lowest first
    
    if (weakSkills.length === 0) {
        wander(entity); // Already excellent at everything!
        return;
    }
    
    const skillToImprove = weakSkills[0][0];
    const teacher = entity.memory.findBestTeacher(entity.world.getEntities(), skillToImprove);
    
    if (teacher) {
        entity.targetX = teacher.x;
        entity.targetY = teacher.y;
        entity.task.set('seeking mentorship', { teacher: teacher, skill: skillToImprove });
        entity.world.eventSystem.addEvent(`${entity.getName()} is seeking to learn ${skillToImprove.replace('_', ' ')} from ${teacher.getName()}.`);
    } else {
        // No good teacher found, maybe explore to meet new people
        explore(entity);
    }
}

export function dance(entity) {
    if (!entity.home) {
        wander(entity);
        return;
    }

    // Dance near home or find others to dance with
    const nearbyEntities = entity.world.getEntities().filter(other => 
        other.id !== entity.id && entity.world.getDistance(entity, other) < 100
    );

    if (nearbyEntities.length > 0 && Math.random() < 0.6) {
        // Group dance
        const partner = nearbyEntities[Math.floor(Math.random() * nearbyEntities.length)];
        entity.targetX = partner.x + (Math.random() - 0.5) * 30;
        entity.targetY = partner.y + (Math.random() - 0.5) * 30;
        entity.task.set('group dancing', { partners: [partner] });
    } else {
        // Solo dance
        const danceX = entity.home.x + (Math.random() - 0.5) * 40;
        const danceY = entity.home.y + (Math.random() - 0.5) * 40;
        entity.targetX = danceX;
        entity.targetY = danceY;
        entity.task.set('solo dancing');
    }
}

export function buildStatue(entity) {
    if (!entity.home) {
        wander(entity);
        return;
    }

    const stoneNeeded = 3;
    const resources = entity.getResources();
    
    if ((resources.stone || 0) < stoneNeeded) {
        gatherResource(entity, 'stone');
        return;
    }

    // Place statue near home
    const angle = Math.random() * Math.PI * 2;
    const distance = 25 + Math.random() * 15;
    const statueX = entity.home.x + Math.cos(angle) * distance;
    const statueY = entity.home.y + Math.sin(angle) * distance;

    entity.targetX = statueX;
    entity.targetY = statueY;
    entity.task.set('building statue', { x: statueX, y: statueY });
}

export function setupShop(entity) {
    if (!entity.home) {
        wander(entity);
        return;
    }

    const woodNeeded = 4;
    const resources = entity.getResources();
    
    if ((resources.planks || 0) < woodNeeded) {
        // Need processed wood for shop
        if ((resources.wood || 0) >= woodNeeded) {
            processResource(entity, 'wood', entity.home);
        } else {
            gatherResource(entity, 'wood');
        }
        return;
    }

    // Place shop near home but accessible to others
    const angle = Math.random() * Math.PI * 2;
    const distance = 35 + Math.random() * 10;
    const shopX = entity.home.x + Math.cos(angle) * distance;
    const shopY = entity.home.y + Math.sin(angle) * distance;

    entity.targetX = shopX;
    entity.targetY = shopY;
    entity.task.set('building shop', { x: shopX, y: shopY });
}

export function meditate(entity) {
    if (!entity.home) {
        wander(entity);
        return;
    }

    // Find a peaceful spot
    const angle = Math.random() * Math.PI * 2;
    const distance = 20 + Math.random() * 20;
    const meditateX = entity.home.x + Math.cos(angle) * distance;
    const meditateY = entity.home.y + Math.sin(angle) * distance;

    entity.targetX = meditateX;
    entity.targetY = meditateY;
    entity.task.set('meditating');
}

export function storytelling(entity) {
    const nearbyEntities = entity.world.getEntities().filter(other => 
        other.id !== entity.id && entity.world.getDistance(entity, other) < 120
    );

    if (nearbyEntities.length === 0) {
        seekSocialInteraction(entity);
        return;
    }

    // Find center point among nearby entities
    const centerX = nearbyEntities.reduce((sum, e) => sum + e.x, entity.x) / (nearbyEntities.length + 1);
    const centerY = nearbyEntities.reduce((sum, e) => sum + e.y, entity.y) / (nearbyEntities.length + 1);

    entity.targetX = centerX;
    entity.targetY = centerY;
    entity.task.set('storytelling', { audience: nearbyEntities });
}