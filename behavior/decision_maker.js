import * as Actions from './actions.js';

export class DecisionMaker {
    constructor(entity) {
        this.entity = entity;
    }

    // The main decision-making function
    decideNextAction() {
        const entity = this.entity;

        // 0. HIGHEST PRIORITY: Establish a home if homeless
        if (!entity.home) {
            // Only make new homeless decisions if truly idle
            if (entity.currentTask === 'idle') {
                this.decideActionForHomeless();
            }
            return;
        }

        // 1. Handle critical state: Full inventory
        if (entity.isInventoryFull()) {
            Actions.depositResources(entity);
            return;
        }

        // 2. Address urgent needs
        const urgentNeed = this.getUrgentNeed();
        if (urgentNeed) {
            if (urgentNeed === 'food') {
                this.findAndProcessResource('food');
            } else {
                // Consider skill efficiency when deciding whether to gather or trade
                const harvestSkill = entity.personality.getSkill(`${urgentNeed}_harvesting`);
                if (harvestSkill < 0.8 && this.canTradeForResource(urgentNeed)) {
                    Actions.pursueTrade(entity);
                } else {
                    Actions.gatherResource(entity, urgentNeed);
                }
            }
            return;
        }

        // 2.5 Process resources if needed for goals
        const resourceToProcess = this.getNeededProcessedResource();
        if (resourceToProcess) {
            const processSkill = entity.personality.getSkill(`${resourceToProcess}_processing`);
            if (processSkill < 0.8 && this.canTradeForProcessedResource(resourceToProcess)) {
                Actions.pursueTrade(entity);
            } else {
                this.findAndProcessResource(resourceToProcess);
            }
            return;
        }

        // 3. Consider personality-driven and opportunistic actions
        const possibleActions = this.getPossibleActions();
        const weightedActions = this.weighActions(possibleActions);
        
        // Choose a random action based on weights
        const totalWeight = weightedActions.reduce((sum, action) => sum + action.weight, 0);
        let random = Math.random() * totalWeight;

        for (const action of weightedActions) {
            random -= action.weight;
            if (random <= 0) {
                action.execute();
                return;
            }
        }

        // 4. Default action if nothing else is chosen
        Actions.wander(entity);
    }

    decideActionForHomeless() {
        const entity = this.entity;

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

    // Determine the most pressing need
    getUrgentNeed() {
        const { resources, home } = this.entity;
        if (resources.food < 1 && (home?.inventory?.cooked_food || 0) < 1) return 'food'; // Raw food if desperate
        return null;
    }

    getNeededProcessedResource() {
        const entity = this.entity;
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

    findAndProcessResource(rawType) {
        const entity = this.entity;
        const processLocation = entity.home || entity.storageShed;
        if (!processLocation) {
            Actions.wander(entity); // Cannot process without a location
            return;
        }

        if ((processLocation.inventory[rawType] || 0) >= 1) {
            Actions.processResource(entity, rawType, processLocation);
        } else {
            Actions.gatherResource(entity, rawType);
        }
    }

    // Get a list of potential actions based on state and personality
    getPossibleActions() {
        const entity = this.entity;
        const actions = [];
        const { personality, resources } = entity;

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

        // Personality-driven actions
        actions.push({ name: 'wander', execute: () => Actions.wander(entity), skillLevel: 1.0 });
        if (personality.traits.curiosity > 0.5) actions.push({ name: 'explore', execute: () => Actions.explore(entity), skillLevel: 1.0 });
        if (personality.traits.sociability > 0.5) actions.push({ name: 'socialize', execute: () => Actions.seekSocialInteraction(entity), skillLevel: 1.0 });
        
        // Opportunistic actions
        if (this.canTradeProfitably()) {
            actions.push({ name: 'trade', execute: () => Actions.pursueTrade(entity), skillLevel: 1.0 });
        }
        
        return actions;
    }
    
    // Assign weights to actions based on personality and circumstances
    weighActions(actions) {
        const { personality, resources } = this.entity;

        return actions.map(action => {
            let weight = 1.0; // Base weight

            switch (action.name) {
                case 'gather_food':
                    weight *= (5 - resources.food) * (personality.traits.productivity + 0.5);
                    weight *= action.skillLevel; // Boost weight based on skill
                    break;
                case 'gather_wood':
                case 'gather_stone':
                    weight *= (5 - resources[action.name.split('_')[1]]) * (personality.traits.productivity + 0.2);
                    weight *= action.skillLevel; // Boost weight based on skill
                    break;
                case 'explore':
                    weight *= personality.traits.curiosity * 2;
                    break;
                case 'socialize':
                    // More likely to socialize if happy and not in urgent need
                    weight *= personality.traits.sociability * (this.entity.vitals.happiness / 50) * 2;
                    break;
                case 'trade':
                    // Trading is a high-value action
                    weight *= (personality.traits.sociability + personality.traits.risktaking) * 1.5;
                    break;
                case 'wander':
                    weight *= 0.5; // Lower priority
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

    canTradeProfitably() {
        const entity = this.entity;
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

    canTradeForResource(resourceType) {
        // Check if entity has something valuable to trade and low skill in this resource
        const entity = this.entity;
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

    canTradeForProcessedResource(rawResourceType) {
        const entity = this.entity;
        const processedType = entity.world.getProcessedResourceFor(rawResourceType);
        if (!processedType) return false;
        
        const processSkill = entity.personality.getSkill(`${rawResourceType}_processing`);
        const resources = entity.getResources();
        
        // Similar logic to resource trading
        const bestSkills = entity.personality.getBestSkills(2);
        const hasTradableSkills = bestSkills.some(([skillName, level]) => {
            if (skillName.includes('_processing')) {
                const resourceName = skillName.replace('_processing', '');
                const processedResourceName = entity.world.getProcessedResourceFor(resourceName);
                return level > 1.2 && resources[processedResourceName] > 3;
            }
            return false;
        });
        
        return processSkill < 1.0 && hasTradableSkills;
    }
}