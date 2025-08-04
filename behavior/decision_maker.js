import * as Actions from './actions.js';
import * as NeedsAssessor from './decision_making/needs_assessor.js';
import * as ActionGenerator from './decision_making/action_generator.js';
import * as TradeEvaluator from './decision_making/trade_evaluator.js';
import { handleHomelessBehavior } from './decision_making/homeless_behavior.js';

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
                handleHomelessBehavior(entity);
            }
            return;
        }

        // 1. Handle critical state: Full inventory
        if (entity.isInventoryFull()) {
            Actions.depositResources(entity);
            return;
        }

        // 2. Address urgent needs
        const urgentNeed = NeedsAssessor.getUrgentNeed(entity);
        if (urgentNeed) {
            if (urgentNeed === 'food') {
                this.findAndProcessResource('food');
            } else {
                // Consider skill efficiency when deciding whether to gather or trade
                const harvestSkill = entity.personality.getSkill(`${urgentNeed}_harvesting`);
                if (harvestSkill < 0.8 && TradeEvaluator.canTradeForResource(entity, urgentNeed)) {
                    Actions.pursueTrade(entity);
                } else {
                    Actions.gatherResource(entity, urgentNeed);
                }
            }
            return;
        }

        // 2.5 Process resources if needed for goals
        const resourceToProcess = NeedsAssessor.getNeededProcessedResource(entity);
        if (resourceToProcess) {
            const processSkill = entity.personality.getSkill(`${resourceToProcess}_processing`);
            const processedType = entity.world.getProcessedResourceFor(resourceToProcess);

            if (processSkill < 0.8 && TradeEvaluator.canTradeForProcessedResource(entity, processedType)) {
                Actions.pursueTrade(entity);
            } else {
                this.findAndProcessResource(resourceToProcess);
            }
            return;
        }

        // 3. Consider personality-driven and opportunistic actions
        const possibleActions = ActionGenerator.getPossibleActions(entity, () => TradeEvaluator.canTradeProfitably(entity));
        const weightedActions = ActionGenerator.weighActions(entity, possibleActions);
        
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
}