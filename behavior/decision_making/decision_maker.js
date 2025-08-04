import * as Actions from './actions.js';
import * as Needs from './needs_assessor.js';
import * as ActionGenerator from './action_generator.js';
import * as TradeEvaluator from './trade_evaluator.js';
import { handleHomelessBehavior } from './homeless_behavior.js';

export class DecisionMaker {
    constructor(entity) {
        this.entity = entity;
    }

    decideNextAction() {
        const entity = this.entity;

        if (!entity.home) {
            if (entity.currentTask === 'idle') handleHomelessBehavior(entity);
            return;
        }

        if (entity.isInventoryFull()) {
            entity.task.setGoal('Storing Resources');
            Actions.depositResources(entity);
            return;
        }
        if (entity.hasTradedGoods()) {
            entity.task.setGoal('Storing Trade Goods');
            Actions.storeTradedGoods(entity);
            return;
        }

        const urgentNeed = Needs.getUrgentNeed(entity);
        if (urgentNeed) {
            this.addressUrgentNeed(urgentNeed);
            return;
        }

        const resourceToProcess = Needs.getNeededProcessedResource(entity);
        if (resourceToProcess) {
            this.addressProcessingNeed(resourceToProcess);
            return;
        }

        this.chooseOpportunisticAction();
    }
    
    addressUrgentNeed(need) {
        const entity = this.entity;
        entity.task.setGoal('Fulfilling Basic Need');
        if (need === 'food') {
            const resources = entity.getResources();
            // 1) Eat cooked if we have it
            if ((resources.cooked_food || 0) >= 1) {
                Actions.eatCookedFood(entity);
            }
            // 2) Deposit any carried raw food so it can be cooked
            else if (entity.inventory.getAmount('food') > 0) {
                Actions.depositResources(entity);
            }
            // 3) Cook raw food stored at home or shed
            else if ((resources.food || 0) >= 1 && (entity.home || entity.storageShed)) {
                this.findAndProcessResource('food');
            }
            // 4) Trade for cooked food
            else if (TradeEvaluator.canTradeForProcessedResource(entity, 'cooked_food')) {
                Actions.pursueTrade(entity);
            }
            // 5) Trade for raw food
            else if (TradeEvaluator.canTradeForResource(entity, 'food')) {
                Actions.pursueTrade(entity);
            }
            // 6) Gather raw food as a last resort
            else {
                Actions.gatherResource(entity, 'food');
            }
            return;
        } else {
            if (entity.personality.getSkill(`${need}_harvesting`) < 0.8 && TradeEvaluator.canTradeForResource(entity, need)) {
                Actions.pursueTrade(entity);
            } else {
                Actions.gatherResource(entity, need);
            }
        }

    }

    addressProcessingNeed(rawType) {
        const entity = this.entity;
        entity.task.setGoal('Improving Resources');
        const processedType = entity.world.getProcessedResourceFor(rawType);

        if (entity.personality.getSkill(`${rawType}_processing`) < 0.8 && TradeEvaluator.canTradeForProcessedResource(entity, processedType)) {
            Actions.pursueTrade(entity);
        } else {
            this.findAndProcessResource(rawType);
        }
    }

    chooseOpportunisticAction() {
        const entity = this.entity;
        const possibleActions = ActionGenerator.getPossibleActions(entity, () => TradeEvaluator.canTradeProfitably(entity));
        const weightedActions = ActionGenerator.weighActions(entity, possibleActions);
        
        const totalWeight = weightedActions.reduce((sum, action) => sum + action.weight, 0);
        let random = Math.random() * totalWeight;

        for (const action of weightedActions) {
            random -= action.weight;
            if (random <= 0) {
                this.setGoalForAction(action.name);
                action.execute();
                return;
            }
        }
        
        entity.task.setGoal('Wandering');
        Actions.wander(entity);
    }
    
    setGoalForAction(actionName) {
        const entity = this.entity;
        if (actionName.startsWith('gather') || actionName.startsWith('specialize')) {
            entity.task.setGoal('Stockpiling Resources');
        } else if (actionName === 'explore') {
            entity.task.setGoal('Exploring the World');
        } else if (actionName === 'socialize') {
            entity.task.setGoal('Building Relationships');
        } else if (actionName === 'trade') {
            entity.task.setGoal('Seeking Profitable Trade');
        } else {
            entity.task.setGoal('Wandering');
        }
    }

    findAndProcessResource(rawType) {
        const entity = this.entity;
        const processLocation = entity.home || entity.storageShed;
        if (!processLocation) {
            Actions.wander(entity);
            return;
        }
        // If we're carrying raw material, deposit it first
        if (entity.inventory.getAmount(rawType) > 0) {
            Actions.depositResources(entity);
            return;
        }
        // If raw is already in storage, process (cook) it
        if ((processLocation.inventory[rawType] || 0) >= 1) {
            Actions.processResource(entity, rawType, processLocation);
        } else {
            // Otherwise gather more raw
            Actions.gatherResource(entity, rawType);
        }
    }
}