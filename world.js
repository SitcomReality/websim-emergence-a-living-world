import { Entity } from './entity.js';
import { ResourceManager } from './resource.js';
import { EventSystem } from './events.js';
import { BuildingManager } from './building/building_manager.js';
import { InteractionManager } from './game_logic/interaction_manager.js';
import { DecorativeStructureManager } from './building/decorative_structure_manager.js';
import { WorldEventHandler } from './game_logic/world_event_handler.js';
import { RAW_TO_PROCESSED, PROCESSED_TO_RAW } from './constants.js';

export class World {
    constructor() {
        this.entities = [];
        this.resourceManager = new ResourceManager(this);
        this.eventSystem = new EventSystem();
        this.buildingManager = new BuildingManager(this);
        this.interactionManager = new InteractionManager(this);
        this.decorativeStructureManager = new DecorativeStructureManager(this);
        this.worldEventHandler = new WorldEventHandler(this);

        this.width = 800;
        this.height = 600;
        this.visualEffects = [];
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
        this._lastDeltaTime = 0;
        this.eventSystem.clear();
        this.resourceManager.reset();
        this.buildingManager.reset();
        this.interactionManager.reset();
        this.decorativeStructureManager.reset();
        this.worldEventHandler.reset();
        this.visualEffects = [];
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
        this.decorativeStructureManager.addStructure(garden);
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
        this.decorativeStructureManager.addStructure(statue);
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
        this.decorativeStructureManager.addStructure(shop);
        return shop;
    }

    update(deltaTime) {
        this._lastDeltaTime = deltaTime;
        
        // Update managers
        this.interactionManager.update(deltaTime);
        this.decorativeStructureManager.update(deltaTime);
        
        // Update visual effects
        this.visualEffects.forEach(effect => effect.life -= deltaTime);
        this.visualEffects = this.visualEffects.filter(effect => effect.life > 0);

        // Update entities
        this.entities.forEach(entity => {
            entity.update(deltaTime);
        });

        // Process interactions
        this.interactionManager.processInteractions();

        // Update resources
        this.resourceManager.update(deltaTime);

        // Check for cycle completion
        this.worldEventHandler.update(deltaTime);
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
        return this.worldEventHandler.cycleCount;
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
        return this.decorativeStructureManager.getStructures();
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
            decorativeStructureManager: this.decorativeStructureManager.serialize(),
            worldEventHandler: this.worldEventHandler.serialize(),
            interactionManager: this.interactionManager.serialize(),
        };
    }

    deserialize(data) {
        this.reset();

        this.worldEventHandler.deserialize(data.worldEventHandler);
        this.interactionManager.deserialize(data.interactionManager);
        this.decorativeStructureManager.deserialize(data.decorativeStructureManager);
        this.decorativeStructureManager.world = this; // Relink

        this.resourceManager.deserialize(data.resourceManager);
        this.resourceManager.world = this; // Relink world reference
        
        this.buildingManager.deserialize(data.buildingManager, this);

        if (data.entities) {
            this.entities = data.entities.map(entityData => {
                return Entity.createFromSave(entityData, this);
            });
        }

        // Post-deserialization linking
        this.entities.forEach(entity => entity.linkSavedData());
    }
}