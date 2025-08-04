import * as Actions from './actions.js';
import * as Needs from './decision_making/needs_assessor.js';
import * as ActionGenerator from './decision_making/action_generator.js';
import * as TradeEvaluator from './decision_making/trade_evaluator.js';
import { handleHomelessBehavior } from './decision_making/homeless_behavior.js';

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
            this.findAndProcessResource('food');
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

        if ((processLocation.inventory[rawType] || 0) >= 1) {
            Actions.processResource(entity, rawType, processLocation);
        } else {
            Actions.gatherResource(entity, rawType);
        }
    }
}

