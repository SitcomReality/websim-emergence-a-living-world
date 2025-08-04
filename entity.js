import { Personality } from './personality.js';
import { generateName } from './utils.js';
import { DecisionMaker } from './behavior/decision_maker.js';
import { Inventory } from './entity/components/inventory.js';
import { Relationships } from './entity/components/relationships.js';
import { Vitals } from './entity/components/vitals.js';
import { Task } from './entity/components/task.js';
import { Movement } from './entity/components/movement.js';
import { Appearance } from './entity/components/appearance.js';
import * as ActionHandler from './entity/action_handlers.js';
import * as Needs from './behavior/decision_making/needs_assessor.js';
import * as Perception from './entity/perception.js';

import { State } from './entity/components/state.js';
import { ResourceManager } from './entity/components/resource_manager.js';
import { RelationshipManager } from './entity/components/relationship_manager.js';
import { Memory } from './entity/components/memory.js';

export class Entity {
    constructor(x, y, world, hasHome = false) {
        this.id = Math.random().toString(36).substring(2, 9);
        this.world = world;
        this.name = generateName();
        
        // Components
        this.state = new State(this);
        this.resourceManager = new ResourceManager(this);
        this.relationshipManager = new RelationshipManager(this);
        this.memory = new Memory(this);

        this.personality = new Personality();
        this.decisionMaker = new DecisionMaker(this);
        this.inventory = new Inventory();
        this.tradeInventory = new Inventory(10); // For holding received trade goods
        this.relationships = new Relationships();
        this.vitals = new Vitals();
        this.task = new Task(this);
        this.movement = new Movement(this, x, y);
        this.appearance = new Appearance(this);

        if (hasHome) {
            this.state.setHome(this.world.buildingManager.createHomeForEntity(this, x, y));
            // Give starting processed food
            this.home.inventory.cooked_food = 5;
        }

        this.resourceManager.initializeResources();
    }

    getAppearance() {
        return this.appearance.get();
    }

    static createFromSave(data, world) {
        // Create a blank entity, then populate it.
        const entity = new Entity(data.movement.x, data.movement.y, world);
        entity.deserialize(data);
        return entity;
    }

    // --- Getters ---
    get x() { return this.movement.x; }
    get y() { return this.movement.y; }
    get homeX() { return this.state.homeX; }
    get homeY() { return this.state.homeY; }
    get currentTask() { return this.task.current; }
    get target() { return this.task.target; }
    set target(node) { this.task.target = node; }
    get targetX() { return this.movement.targetX; }
    set targetX(x) { this.movement.targetX = x; }
    get targetY() { return this.movement.targetY; }
    set targetY(y) { this.movement.targetY = y; }
    
    get home() { return this.state.home; }
    set home(building) { this.state.home = building; }
    get storageShed() { return this.state.storageShed; }
    set storageShed(building) { this.state.storageShed = building; }
    get homeLocation() { return this.state.homeLocation; }
    set homeLocation(location) { this.state.homeLocation = location; }
    get settlementRotation() { return this.state.settlementRotation; }
    set settlementRotation(rotation) { this.state.settlementRotation = rotation; }

    getDepositPoint() {
        // Priority: Home > Storage Shed
        return this.home || this.storageShed;
    }

    update(deltaTime) {
        this.vitals.update(deltaTime);
        this.task.update(deltaTime);
        this.movement.update(deltaTime);
        this.appearance.update(deltaTime);
        this.memory.update(deltaTime);
        
        // Perform actions based on personality and needs (commit until current task finishes)
        if (this.task.shouldPerformAction()) {
            // Only pick a new action when truly idle
            if (this.currentTask === 'idle') {
                this.performAction();
            } else {
                // Delay re-decision to maintain commitment to the ongoing task
                this.task.actionTimer = this.task.actionInterval - 50;
            }
        }

        // --- Action Handlers ---
        // If at target node, try to gather
        if (this.currentTask.startsWith('gathering') || this.currentTask.startsWith('Harvesting')) {
            if (this.target && this.movement.isAtTarget()) {
                ActionHandler.gatherFromTargetNode(this, this.world.lastDeltaTime);
            }
        }

        // If returning to deposit, check if arrived
        if (this.currentTask === 'depositing' && this.target && this.movement.isAtTarget()) {
            ActionHandler.finishDepositing(this);
        }

        // If at home location to build storage
        if (this.currentTask === 'building storage' && this.isAtHome()) {
            ActionHandler.finishBuildingStorageShed(this);
        }

        // If at a construction site, do work
        if (this.currentTask.startsWith('constructing') && this.target && this.movement.isAtTarget()) {
            ActionHandler.workOnConstruction(this);
        }
        
        // If at home/storage to process resources
        if (this.currentTask.startsWith('processing') && this.target && this.movement.isAtTarget()) {
            ActionHandler.processResourcesInBuilding(this, deltaTime);
        }

        // If at deposit point to store traded goods
        if (this.currentTask === 'storing traded goods' && this.target && this.movement.isAtTarget()) {
            this.resourceManager.depositTradeInventory();
        }
        
        // Handle creative and social activities
        const creativeActivities = ['planting', 'building statue', 'building shop', 'dancing', 'meditating', 'storytelling', 'teaching'];
        if (creativeActivities.some(activity => this.currentTask.includes(activity))) {
            ActionHandler.performCreativeActivity(this, deltaTime);
        }
    }
    
    // --- State Checks ---
    isAtHome() { return this.state.isAtHome(); }
    
    isInventoryFull() { return this.inventory.isFull(); }
    hasTradedGoods() { return this.tradeInventory.items.length > 0; }
    
    // --- Actions & Logic ---
    performAction() {
        this.decisionMaker.decideNextAction();
    }
    
    findClosestResourceNode(resourceType) {
        // Use memory to prefer known good locations
        const knownLocations = this.memory.getBestKnownLocations(resourceType, 2);
        
        // Check if any remembered locations still exist and are available
        for (const memory of knownLocations) {
            const node = this.world.getResourceNodes().find(n => 
                n.type === resourceType &&
                n.amount > 0 &&
                Math.abs(n.x - memory.location.x) < 20 && // Allow for some movement
                Math.abs(n.y - memory.location.y) < 20 &&
                !this.isNodeBusy(n)
            );
            
            if (node) {
                return node; // Return the best remembered location that's still valid
            }
        }
        
        // Fall back to regular perception if no good memories
        return Perception.findClosestResourceNode(this, resourceType);
    }

    isNodeBusy(node) {
        const otherEntities = this.world.getEntities().filter(e => e.id !== this.id);
        return otherEntities.some(e => 
            e.task && (e.task.current.startsWith('gathering') || e.task.current.startsWith('Harvesting')) && 
            e.task.target && e.task.target.id === node.id
        );
    }
    
    findNearbyEntity(range = 100) {
        return Perception.findNearbyEntity(this, range);
    }
    
    // --- Resource Management (delegated) ---
    getNeeds() { return this.resourceManager.getNeeds(); }
    getResources() { return this.resourceManager.getResources(); }
    getCarriedResourceAmount(type) { return this.inventory.getAmount(type); }
    useResource(type, amount) { return this.resourceManager.useResource(type, amount); }
    useResourceFromHome(type, amount) { return this.resourceManager.useResourceFromHome(type, amount); }
    giveResource(type, amount) { return this.resourceManager.giveResource(type, amount); }
    receiveResource(type, amount) { return this.resourceManager.receiveResource(type, amount); }
    
    // --- Relationships (delegated) ---
    updateRelationshipValue(entityId, change) { this.relationshipManager.updateRelationshipValue(entityId, change); }
    getRelationships() { return this.relationshipManager.getRelationships(); }
    
    // --- Info & Serialization ---
    getName() { return this.name; }

    getInfo() {
        const bestSkills = this.personality.getBestSkills(2);
        const skillText = bestSkills.map(([name, level]) => 
            `${name.replace('_', ' ')}: ${level.toFixed(1)}x`
        ).join(', ');
        
        return {
            name: this.name,
            personality: this.personality.getDescription(),
            skills: skillText,
            resources: this.getResources(),
            inventory: this.inventory.items,
            task: this.currentTask,
            goal: this.task.goal,
            energy: Math.round(this.vitals.energy),
            happiness: Math.round(this.vitals.happiness),
            age: Math.round(this.vitals.age),
            relationships: this.relationships.getNonNeutralCount()
        };
    }

    serialize() {
        return {
            id: this.id,
            name: this.name,
            // Components
            state: this.state.serialize(),
            resourceManager: this.resourceManager.serialize(),
            appearance: this.appearance.serialize(),
            personality: this.personality.traits,
            skills: this.personality.skills,
            inventory: this.inventory.serialize(),
            tradeInventory: this.tradeInventory.serialize(),
            relationships: this.relationships.serialize(),
            vitals: this.vitals.serialize(),
            task: this.task.serialize(),
            movement: this.movement.serialize(),
            memory: this.memory.serialize()
        };
    }

    deserialize(data) {
        this.id = data.id;
        this.name = data.name;

        // Components
        this.state.deserialize(data.state);
        this.resourceManager.deserialize(data.resourceManager);
        this.appearance.deserialize(data.appearance);
        this.personality.traits = data.personality;
        this.personality.skills = data.skills || this.personality.skills; // For loading older saves
        this.inventory.deserialize(data.inventory);
        this.tradeInventory.deserialize(data.tradeInventory || { items: [], capacity: 10 });
        this.relationships.deserialize(data.relationships);
        this.vitals.deserialize(data.vitals);
        this.task.deserialize(data.task);
        this.movement.deserialize(data.movement);
        this.memory.deserialize(data.memory);
    }

    linkSavedData() {
        this.state.linkSavedData(this.world);
        this.task.linkSavedData(this.world);
    }
}