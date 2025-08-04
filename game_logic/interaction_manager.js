// New file
export class InteractionManager {
    constructor(world) {
        this.world = world;
        this.tradeCooldowns = new Map();
        this.interactionCooldowns = new Map();
    }

    reset() {
        this.tradeCooldowns.clear();
        this.interactionCooldowns.clear();
    }

    update(deltaTime) {
        // Update trade cooldowns
        for (const [key, value] of this.tradeCooldowns.entries()) {
            const newTime = value - deltaTime;
            if (newTime <= 0) {
                this.tradeCooldowns.delete(key);
            } else {
                this.tradeCooldowns.set(key, newTime);
            }
        }
        
        // Update interaction cooldowns
        for (const [key, value] of this.interactionCooldowns.entries()) {
            const newTime = value - deltaTime;
            if (newTime <= 0) {
                this.interactionCooldowns.delete(key);
            } else {
                this.interactionCooldowns.set(key, newTime);
            }
        }
    }

    processInteractions() {
        const entities = this.world.getEntities();
        for (let i = 0; i < entities.length; i++) {
            for (let j = i + 1; j < entities.length; j++) {
                const entity1 = entities[i];
                const entity2 = entities[j];
                const distance = this.world.getDistance(entity1, entity2);

                if (distance < 50) { // Interaction range
                    this.handleEntityInteraction(entity1, entity2);
                }
            }
        }
    }

    handleEntityInteraction(entity1, entity2) {
        const cooldownKey = [entity1.id, entity2.id].sort().join('-');

        // Check for trade opportunities
        const tradeLogic = () => {
             // Lower the probability of random trades to make them more special
            if (Math.random() < 0.1) {
                 this.executeTrade(entity1, entity2);
            }
        };

        if (!this.tradeCooldowns.has(cooldownKey) && this.canTrade(entity1, entity2)) {
           tradeLogic();
        }

        // Check for relationship interaction cooldown
        if (this.interactionCooldowns.has(cooldownKey)) {
            return; // on cooldown, do nothing more
        }

        // Update relationships
        this.updateRelationship(entity1, entity2);

        // Set a cooldown for the next interaction to prevent spam
        this.interactionCooldowns.set(cooldownKey, 3000 + Math.random() * 2000); // 3-5 second cooldown
    }

    canTrade(entity1, entity2) {
        // Simple trade logic - entities trade if they have complementary needs
        const entity1Needs = entity1.getNeeds();
        const entity2Needs = entity2.getNeeds();
        const entity1Has = entity1.getResources();
        const entity2Has = entity2.getResources();

        const entity1CanGive = Object.keys(entity1Has).filter(r => entity1Has[r] > 2 && entity2Needs.includes(r));
        const entity2CanGive = Object.keys(entity2Has).filter(r => entity2Has[r] > 2 && entity1Needs.includes(r));

        if (entity1CanGive.length === 0 || entity2CanGive.length === 0) {
            return false;
        }

        // Check if there is a non-overlapping trade possible.
        return entity1CanGive.some(give1 => entity2CanGive.some(give2 => give1 !== give2));
    }

    executeTrade(entity1, entity2) {
        const entity1Needs = entity1.getNeeds();
        const entity2Needs = entity2.getNeeds();
        const entity1Has = entity1.getResources();
        const entity2Has = entity2.getResources();

        // Find mutual trade opportunity
        for (const need of entity1Needs) { // What entity1 wants
            if (entity2Has[need] > 2) { // Check for surplus
                for (const give of entity2Needs) { // What entity1 can give (that entity2 wants)
                    if (entity1Has[give] > 2 && need !== give) { // Check for surplus and that it's not the same resource
                        // Execute trade
                        const tradeAmount = 1;
                        entity1.giveResource(give, tradeAmount);
                        entity1.receiveResource(need, tradeAmount);
                        entity2.giveResource(need, tradeAmount);
                        entity2.receiveResource(give, tradeAmount);

                        this.world.eventSystem.addEvent(`${entity1.getName()} traded ${tradeAmount} ${give} for ${tradeAmount} ${need} with ${entity2.getName()}`);
                        
                        // Update happiness after a successful trade
                        entity1.vitals.increaseHappiness(15);
                        entity2.vitals.increaseHappiness(15);
                        
                        // Learn from trade experience
                        entity1.memory.updateStrategy('socialApproaches', 'trading', true);
                        entity2.memory.updateStrategy('socialApproaches', 'trading', true);
                        
                        // Update trade preferences in memory
                        entity1.memory.strategies.tradePreferences.set(need, (entity1.memory.strategies.tradePreferences.get(need) || 0) + 0.1);
                        entity2.memory.strategies.tradePreferences.set(give, (entity2.memory.strategies.tradePreferences.get(give) || 0) + 0.1);
                        
                        // Set a cooldown to prevent immediate back-and-forth trades
                        const cooldownKey = [entity1.id, entity2.id].sort().join('-');
                        this.tradeCooldowns.set(cooldownKey, 5000 + Math.random() * 5000); // 5-10 second cooldown

                        return true;
                    }
                }
            }
        }
        
        // Learn from failed trade attempts
        entity1.memory.updateStrategy('socialApproaches', 'trading', false);
        entity2.memory.updateStrategy('socialApproaches', 'trading', false);
        
        return false;
    }

    updateRelationship(entity1, entity2) {
        // Get the relationship type *before* the update
        const oldRelType = entity1.relationships.getType(entity1.relationships.relations.get(entity2.id) || 0);

        const change = 0.01; // Slower, more meaningful relationship changes
        entity1.updateRelationshipValue(entity2.id, change);
        entity2.updateRelationshipValue(entity1.id, change);

        // Get the type *after* the update
        const newRelType = entity1.relationships.getType(entity1.relationships.relations.get(entity2.id));

        // Check if a new non-neutral relationship has just formed
        if (oldRelType === 'neutral' && newRelType !== 'neutral') {
            this.world.addVisualEffect('relationship', {
                x: (entity1.x + entity2.x) / 2,
                y: (entity1.y + entity2.y) / 2 - 20, // Position it between and above the entities
                type: newRelType,
                duration: 1500, // 1.5 seconds
            });

            this.world.eventSystem.addEvent(`${entity1.name} and ${entity2.name} are now in a ${newRelType}.`);
        }
    }

    serialize() {
        return {
            tradeCooldowns: Array.from(this.tradeCooldowns.entries()),
            interactionCooldowns: Array.from(this.interactionCooldowns.entries()),
        };
    }

    deserialize(data) {
        if (!data) return;
        this.tradeCooldowns = new Map(data.tradeCooldowns || []);
        this.interactionCooldowns = new Map(data.interactionCooldowns || []);
    }
}