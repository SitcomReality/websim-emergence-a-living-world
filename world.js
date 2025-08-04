import { Entity } from './entity.js';
import { ResourceManager } from './resource.js';
import { EventSystem } from './events.js';
import { BuildingManager } from './building/building_manager.js';

const RAW_TO_PROCESSED = {
    wood: 'planks',
    stone: 'bricks',
    food: 'cooked_food',
};

const PROCESSED_TO_RAW = Object.fromEntries(Object.entries(RAW_TO_PROCESSED).map(([k, v]) => [v, k]));

export class World {
    constructor() {
        this.entities = [];
        this.resourceManager = new ResourceManager(this);
        this.eventSystem = new EventSystem();
        this.buildingManager = new BuildingManager(this);
        this.width = 800;
        this.height = 600;
        this.cycleCount = 0;
        this.cycleTimer = 0;
        this.cycleInterval = 5000; // 5 seconds per cycle
        this.tradeCooldowns = new Map();
        this.interactionCooldowns = new Map();
        this.visualEffects = [];
        this.decorativeStructures = []; // Gardens, statues, shops, etc.
    }

    get lastDeltaTime() {
        return this._lastDeltaTime || 0;
    }

    initialize() {
        this.reset();
        this.resourceManager.generateResources(this.width, this.height);
        this.generateInitialEntities();
    }

    reset() {
        this.entities = [];
        this.cycleCount = 0;
        this.cycleTimer = 0;
        this._lastDeltaTime = 0;
        this.eventSystem.clear();
        this.resourceManager.reset();
        this.buildingManager.reset();
        this.tradeCooldowns.clear();
        this.interactionCooldowns.clear();
        this.visualEffects = [];
        this.decorativeStructures = [];
    }

    generateInitialEntities() {
        const entityCount = 8 + Math.floor(Math.random() * 4);
        
        for (let i = 0; i < entityCount; i++) {
            const entity = new Entity(
                Math.random() * (this.width - 40) + 20,
                Math.random() * (this.height - 40) + 20,
                this,
                false // No entities start with a home anymore
            );
            this.entities.push(entity);
        }
    }

    createGarden(x, y, type, ownerId) {
        const garden = {
            id: Math.random().toString(36).substring(2, 9),
            type: type, // 'food_garden' or 'flower_garden'
            x: x,
            y: y,
            ownerId: ownerId,
            maturity: 0, // 0 to 1, affects appearance and benefits
            lastHarvest: 0
        };
        this.decorativeStructures.push(garden);
        return garden;
    }

    createStatue(x, y, ownerId) {
        const statue = {
            id: Math.random().toString(36).substring(2, 9),
            type: 'statue',
            x: x,
            y: y,
            ownerId: ownerId,
            style: Math.floor(Math.random() * 3) // Different statue styles
        };
        this.decorativeStructures.push(statue);
        return statue;
    }

    createShop(x, y, ownerId) {
        const shop = {
            id: Math.random().toString(36).substring(2, 9),
            type: 'shop',
            x: x,
            y: y,
            ownerId: ownerId,
            inventory: { food: 0, wood: 0, stone: 0, cooked_food: 0, planks: 0, bricks: 0 },
            customerCount: 0
        };
        this.decorativeStructures.push(shop);
        return shop;
    }

    update(deltaTime) {
        this._lastDeltaTime = deltaTime;
        this.cycleTimer += deltaTime;
        
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
        
        // Update visual effects
        this.visualEffects.forEach(effect => effect.life -= deltaTime);
        this.visualEffects = this.visualEffects.filter(effect => effect.life > 0);

        // Update decorative structures
        this.updateDecorativeStructures(deltaTime);

        // Update entities
        this.entities.forEach(entity => {
            entity.update(deltaTime);
        });

        // Process interactions
        this.processInteractions();

        // Update resources
        this.resourceManager.update(deltaTime);

        // Check for cycle completion
        if (this.cycleTimer >= this.cycleInterval) {
            this.completeCycle();
            this.cycleTimer = 0;
        }
    }

    updateDecorativeStructures(deltaTime) {
        this.decorativeStructures.forEach(structure => {
            if (structure.type === 'food_garden' || structure.type === 'flower_garden') {
                // Gardens mature over time
                if (structure.maturity < 1) {
                    structure.maturity = Math.min(1, structure.maturity + deltaTime / 30000); // 30 seconds to mature
                }
                
                // Mature gardens provide periodic benefits
                if (structure.maturity >= 1) {
                    const owner = this.entities.find(e => e.id === structure.ownerId);
                    if (owner && this.getDistance(owner, structure) < 100) {
                        // Passive happiness boost from nearby gardens
                        owner.vitals.increaseHappiness(deltaTime / 10000); // Small continuous boost
                    }
                }
            } else if (structure.type === 'statue') {
                // Statues provide happiness to their owner when nearby
                const owner = this.entities.find(e => e.id === structure.ownerId);
                if (owner && this.getDistance(owner, structure) < 80) {
                    owner.vitals.increaseHappiness(deltaTime / 15000); // Pride boost
                }
            }
        });
    }

    processInteractions() {
        for (let i = 0; i < this.entities.length; i++) {
            for (let j = i + 1; j < this.entities.length; j++) {
                const entity1 = this.entities[i];
                const entity2 = this.entities[j];
                const distance = this.getDistance(entity1, entity2);

                if (distance < 50) { // Interaction range
                    this.handleEntityInteraction(entity1, entity2);
                }
            }
        }
    }

    handleEntityInteraction(entity1, entity2) {
        const cooldownKey = [entity1.id, entity2.id].sort().join('-');

        // Check for trade opportunities
        if (!this.tradeCooldowns.has(cooldownKey) && this.canTrade(entity1, entity2)) {
            // Lower the probability of random trades to make them more special
            if (Math.random() < 0.1) {
                 this.executeTrade(entity1, entity2);
            }
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

                        this.eventSystem.addEvent(`${entity1.getName()} traded ${tradeAmount} ${give} for ${tradeAmount} ${need} with ${entity2.getName()}`);
                        
                        // Update happiness after a successful trade
                        entity1.vitals.increaseHappiness(15);
                        entity2.vitals.increaseHappiness(15);
                        
                        // Set a cooldown to prevent immediate back-and-forth trades
                        const cooldownKey = [entity1.id, entity2.id].sort().join('-');
                        this.tradeCooldowns.set(cooldownKey, 5000 + Math.random() * 5000); // 5-10 second cooldown

                        return true;
                    }
                }
            }
        }
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
            this.addVisualEffect('relationship', {
                x: (entity1.x + entity2.x) / 2,
                y: (entity1.y + entity2.y) / 2 - 20, // Position it between and above the entities
                type: newRelType,
                duration: 1500, // 1.5 seconds
            });

            this.eventSystem.addEvent(`${entity1.name} and ${entity2.name} are now in a ${newRelType}.`);
        }
    }

    completeCycle() {
        this.cycleCount++;
        
        // Check for emergent events
        this.checkEmergentEvents();
    }

    checkEmergentEvents() {
        // Population growth/decline
        if (this.entities.length < 15 && Math.random() < 0.3) {
            this.spawnNewEntity();
        }

        // Resource depletion events
        if (this.resourceManager.getTotalResources() < 10 && Math.random() < 0.2) {
            this.eventSystem.addEvent("Resources are running low! Entities are getting desperate.");
        }
    }

    spawnNewEntity() {
        const newEntity = new Entity(
            Math.random() * (this.width - 40) + 20,
            Math.random() * (this.height - 40) + 20,
            this
        );
        this.entities.push(newEntity);
        this.eventSystem.addEvent(`${newEntity.getName()} has joined the world!`);
    }

    addVisualEffect(type, options) {
        this.visualEffects.push({
            id: Math.random().toString(36).substring(2, 9),
            type: type,
            ...options,
            life: options.duration || 2000 // default 2 seconds
        });
    }

    getDistance(entity1, entity2) {
        const dx = entity1.x - entity2.x;
        const dy = entity1.y - entity2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getEntities() {
        return this.entities;
    }

    getResourceNodes() {
        return this.resourceManager.getNodes();
    }

    getSaplings() {
        return this.resourceManager.getSaplings();
    }

    getCycleCount() {
        return this.cycleCount;
    }

    getBuildings() {
        return this.buildingManager.getBuildings();
    }

    getEvents() {
        return this.eventSystem.getRecentEvents();
    }
    
    getVisualEffects() {
        return this.visualEffects;
    }
    
    getDecorativeStructures() {
        return this.decorativeStructures;
    }
    
    getProcessedResourceFor(rawType) {
        return RAW_TO_PROCESSED[rawType];
    }

    getRawResourceFor(processedType) {
        return PROCESSED_TO_RAW[processedType];
    }

    serialize() {
        return {
            entities: this.entities.map(e => e.serialize()),
            resourceManager: this.resourceManager.serialize(),
            buildingManager: this.buildingManager.serialize(),
            decorativeStructures: this.decorativeStructures,
            cycleCount: this.cycleCount,
            cycleTimer: this.cycleTimer,
        };
    }

    deserialize(data) {
        this.reset();

        this.cycleCount = data.cycleCount || 0;
        this.cycleTimer = data.cycleTimer || 0;
        this.decorativeStructures = data.decorativeStructures || [];

        this.resourceManager.deserialize(data.resourceManager);
        this.resourceManager.world = this; // Relink world reference
        this.buildingManager.deserialize(data.buildingManager, this);

        this.entities = data.entities.map(entityData => {
            return Entity.createFromSave(entityData, this);
        });

        // Post-deserialization linking
        this.entities.forEach(entity => entity.linkSavedData());
    }
}