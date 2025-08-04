// New file

import * as Actions from '../actions.js';

// Get a list of potential actions based on state and personality
export function getPossibleActions(entity, canTradeProfitably) {
    const actions = [];
    const { personality, resources, home } = entity;

    // Skill-influenced resource gathering - prefer gathering resources we're good at
    const bestSkills = personality.getBestSkills(3);
    const skillPreferences = {};
    bestSkills.forEach(([skillName, level]) => {
        if (skillName.includes('_harvesting')) {
            const resourceType = skillName.replace('_harvesting', '');
            skillPreferences[resourceType] = level;
        }
    });

    // Basic needs gathering with skill preferences
    if (resources.food < 5) {
        const skillBonus = skillPreferences['food'] || 1.0;
        actions.push({ 
            name: 'gather_food', 
            execute: () => Actions.gatherResource(entity, 'food'),
            skillLevel: skillBonus
        });
    }
    if (resources.wood < 5) {
        const skillBonus = skillPreferences['wood'] || 1.0;
        actions.push({ 
            name: 'gather_wood', 
            execute: () => Actions.gatherResource(entity, 'wood'),
            skillLevel: skillBonus
        });
    }
    if (resources.stone < 5) {
        const skillBonus = skillPreferences['stone'] || 1.0;
        actions.push({ 
            name: 'gather_stone', 
            execute: () => Actions.gatherResource(entity, 'stone'),
            skillLevel: skillBonus
        });
    }

    // Add opportunistic gathering for resources we're exceptionally good at
    bestSkills.forEach(([skillName, level]) => {
        if (level > 1.5 && skillName.includes('_harvesting')) {
            const resourceType = skillName.replace('_harvesting', '');
            actions.push({
                name: `specialize_${resourceType}`,
                execute: () => Actions.gatherResource(entity, resourceType),
                skillLevel: level
            });
        }
    });

    // POST-HOME ACTIVITIES (only available after establishing a home)
    if (home) {
        // Creative/Artistic activities
        if (personality.traits.curiosity > 0.4) {
            actions.push({ 
                name: 'build_statue', 
                execute: () => Actions.buildStatue(entity),
                skillLevel: 1.0 
            });
        }
        
        if (personality.traits.sociability > 0.3) {
            actions.push({ 
                name: 'dance', 
                execute: () => Actions.dance(entity),
                skillLevel: 1.0 
            });
        }

        // Economic activities
        if (personality.traits.productivity > 0.5 && personality.traits.sociability > 0.4) {
            actions.push({ 
                name: 'setup_shop', 
                execute: () => Actions.setupShop(entity),
                skillLevel: 1.0 
            });
        }

        // Environmental activities
        if (personality.traits.productivity > 0.3 || personality.traits.curiosity > 0.6) {
            actions.push({ 
                name: 'plant_garden', 
                execute: () => Actions.plantGarden(entity),
                skillLevel: 1.0 
            });
        }

        // Social/Educational activities
        const hasTeachableSkills = bestSkills.some(([_, level]) => level > 1.3);
        if (hasTeachableSkills && personality.traits.sociability > 0.5) {
            actions.push({ 
                name: 'teach_skill', 
                execute: () => Actions.teachSkill(entity),
                skillLevel: 1.0 
            });
        }

        if (personality.traits.sociability > 0.7) {
            actions.push({ 
                name: 'storytelling', 
                execute: () => Actions.storytelling(entity),
                skillLevel: 1.0 
            });
        }

        // Spiritual/Reflective activities
        if (personality.traits.curiosity > 0.6 && entity.vitals.happiness < 70) {
            actions.push({ 
                name: 'meditate', 
                execute: () => Actions.meditate(entity),
                skillLevel: 1.0 
            });
        }
    }

    // Personality-driven actions
    actions.push({ name: 'wander', execute: () => Actions.wander(entity), skillLevel: 1.0 });
    if (personality.traits.curiosity > 0.5) actions.push({ name: 'explore', execute: () => Actions.explore(entity), skillLevel: 1.0 });
    if (personality.traits.sociability > 0.5) actions.push({ name: 'socialize', execute: () => Actions.seekSocialInteraction(entity), skillLevel: 1.0 });
    
    // Opportunistic actions
    if (canTradeProfitably()) {
        actions.push({ name: 'trade', execute: () => Actions.pursueTrade(entity), skillLevel: 1.0 });
    }
    
    return actions;
}

// Assign weights to actions based on personality and circumstances
export function weighActions(entity, actions) {
    const { personality, resources, vitals, home } = entity;

    return actions.map(action => {
        let weight = 1.0; // Base weight

        switch (action.name) {
            case 'gather_food':
            case 'gather_wood':
            case 'gather_stone':
                const resourceType = action.name.split('_')[1];
                weight *= (5 - resources[resourceType]) * (personality.traits.productivity + 0.5);
                weight *= action.skillLevel; // Boost weight based on skill
                break;
            case 'explore':
                weight *= personality.traits.curiosity * 2;
                break;
            case 'socialize':
                // More likely to socialize if happy and not in urgent need
                weight *= personality.traits.sociability * (vitals.happiness / 50) * 2;
                break;
            case 'trade':
                // Trading is a high-value action
                weight *= (personality.traits.sociability + personality.traits.risktaking) * 1.5;
                break;
            case 'wander':
                weight *= 0.5; // Lower priority
                break;
            
            // POST-HOME ACTIVITY WEIGHTS
            case 'dance':
                weight *= personality.traits.sociability * 1.5;
                weight *= (vitals.happiness / 100) + 0.5; // More likely when happy
                break;
            case 'build_statue':
                weight *= personality.traits.curiosity * 1.2;
                weight *= (1.2 - vitals.happiness / 100); // More likely when seeking fulfillment
                break;
            case 'plant_garden':
                weight *= (personality.traits.productivity + personality.traits.curiosity) * 0.8;
                break;
            case 'setup_shop':
                weight *= personality.traits.productivity * personality.traits.sociability * 1.3;
                break;
            case 'teach_skill':
                weight *= personality.traits.sociability * 1.4;
                weight *= (vitals.happiness / 100) + 0.3; // Teaching when fulfilled
                break;
            case 'storytelling':
                weight *= personality.traits.sociability * 1.6;
                break;
            case 'meditate':
                weight *= personality.traits.curiosity * (1.2 - vitals.happiness / 100);
                break;
            
            default:
                // Handle specialization actions (e.g., specialize_wood)
                if (action.name.startsWith('specialize_')) {
                    weight *= action.skillLevel * 2; // Strong preference for specialization
                    weight *= personality.traits.productivity + 0.5;
                }
        }
        
        return { ...action, weight: Math.max(0.1, weight) };
    });
}