import { Entity } from './entity.js';
import { ResourceManager } from './resource.js';
import { EventSystem } from './events.js';
import { BuildingManager } from './building.js';

export class World {
    constructor() {
        this.entities = [];
        this.resourceManager = new ResourceManager();
        this.eventSystem = new EventSystem();
        this.buildingManager = new BuildingManager(this);
        this.width = 800;
        this.height = 600;
        this.cycleCount = 0;
        this.cycleTimer = 0;
        this.cycleInterval = 5000; // 5 seconds per cycle
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
        this.eventSystem.clear();
        this.resourceManager.reset();
        this.buildingManager.reset();
    }

    generateInitialEntities() {
        const entityCount = 8 + Math.floor(Math.random() * 4);
        
        for (let i = 0; i < entityCount; i++) {
            const entity = new Entity(
                Math.random() * (this.width - 40) + 20,
                Math.random() * (this.height - 40) + 20,
                this
            );
            this.entities.push(entity);
        }
    }

    update(deltaTime) {
        this.cycleTimer += deltaTime;
        
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
        // Check for trade opportunities
        if (this.canTrade(entity1, entity2)) {
            // Lower the probability of random trades to make them more special
            if (Math.random() < 0.1) {
                 this.executeTrade(entity1, entity2);
            }
        }

        // Update relationships
        this.updateRelationship(entity1, entity2);
    }

    canTrade(entity1, entity2) {
        // Simple trade logic - entities trade if they have complementary needs
        const entity1Needs = entity1.getNeeds();
        const entity2Needs = entity2.getNeeds();
        const entity1Has = entity1.getResources();
        const entity2Has = entity2.getResources();

        // Trade if one has surplus of what the other needs
        return entity1Needs.some(need => entity2Has[need] > 2) &&
               entity2Needs.some(need => entity1Has[need] > 2);
    }

    executeTrade(entity1, entity2) {
        const entity1Needs = entity1.getNeeds();
        const entity2Needs = entity2.getNeeds();
        const entity1Has = entity1.getResources();
        const entity2Has = entity2.getResources();

        // Find mutual trade opportunity
        for (const need of entity1Needs) {
            if (entity2Has[need] > 0) {
                for (const give of entity2Needs) {
                    if (entity1Has[give] > 0) {
                        // Execute trade
                        const tradeAmount = 1;
                        entity1.giveResource(give, tradeAmount);
                        entity1.receiveResource(need, tradeAmount);
                        entity2.giveResource(need, tradeAmount);
                        entity2.receiveResource(give, tradeAmount);

                        this.eventSystem.addEvent(`${entity1.getName()} traded ${tradeAmount} ${give} for ${tradeAmount} ${need} with ${entity2.getName()}`);
                        
                        // Update happiness after a successful trade
                        entity1.happiness = Math.min(100, entity1.happiness + 15);
                        entity2.happiness = Math.min(100, entity2.happiness + 15);

                        return true;
                    }
                }
            }
        }
        return false;
    }

    updateRelationship(entity1, entity2) {
        entity1.updateRelationship(entity2.id, 0.1);
        entity2.updateRelationship(entity1.id, 0.1);
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

    getCycleCount() {
        return this.cycleCount;
    }

    getBuildings() {
        return this.buildingManager.getBuildings();
    }

    getEvents() {
        return this.eventSystem.getRecentEvents();
    }
}