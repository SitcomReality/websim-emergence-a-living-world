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
            this.decideActionForHomeless();
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
            Actions.gatherResource(entity, urgentNeed);
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
                // Gather resources for the home
                const needed = entity.storageShed.getNeededResourcesFor('home');
                Actions.gatherResource(entity, needed[0]); // Gather the first thing we need
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
        const { resources } = this.entity;
        if (resources.food < 2) return 'food';
        if (resources.water < 3) return 'water'; // Water is slightly more urgent
        return null;
    }

    // Get a list of potential actions based on state and personality
    getPossibleActions() {
        const entity = this.entity;
        const actions = [];
        const { personality, resources } = entity;

        // Basic needs gathering
        if (resources.food < 5) actions.push({ name: 'gather_food', execute: () => Actions.gatherResource(entity, 'food') });
        if (resources.water < 5) actions.push({ name: 'gather_water', execute: () => Actions.gatherResource(entity, 'water') });
        if (resources.wood < 5) actions.push({ name: 'gather_wood', execute: () => Actions.gatherResource(entity, 'wood') });
        if (resources.stone < 5) actions.push({ name: 'gather_stone', execute: () => Actions.gatherResource(entity, 'stone') });

        // Personality-driven actions
        actions.push({ name: 'wander', execute: () => Actions.wander(entity) });
        if (personality.traits.curiosity > 0.5) actions.push({ name: 'explore', execute: () => Actions.explore(entity) });
        if (personality.traits.sociability > 0.5) actions.push({ name: 'socialize', execute: () => Actions.seekSocialInteraction(entity) });
        
        // Opportunistic actions
        if (this.canTradeProfitably()) {
            actions.push({ name: 'trade', execute: () => Actions.pursueTrade(entity) });
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
                    break;
                case 'gather_water':
                    weight *= (5 - resources.water) * (personality.traits.productivity + 0.5);
                    break;
                case 'gather_wood':
                case 'gather_stone':
                    weight *= (5 - resources[action.name.split('_')[1]]) * (personality.traits.productivity + 0.2);
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
            }
            
            return { ...action, weight: Math.max(0.1, weight) };
        });
    }

    canTradeProfitably() {
        const entity = this.entity;
        // Simplified: can trade if we have a surplus of something another entity might need
        const surpluses = Object.keys(entity.resources).filter(r => entity.resources[r] > 8);
        return surpluses.length > 0 && entity.getNeeds().length > 0;
    }
}