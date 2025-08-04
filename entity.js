import { Personality } from './personality.js';
import { generateName } from './utils.js';
import { DecisionMaker } from './behavior/decision_maker.js';
import { Inventory } from './entity/components/inventory.js';
import { Relationships } from './entity/components/relationships.js';
import { Vitals } from './entity/components/vitals.js';
import { Task } from './entity/components/task.js';
import { Movement } from './entity/components/movement.js';
import * as ActionHandler from './entity/action_handlers.js';

export class Entity {
    constructor(x, y, world, hasHome = false) {
        this.id = Math.random().toString(36).substring(2, 9);
        this.world = world;
        this.name = generateName();
        
        // State Properties
        this.home = null;
        this.storageShed = null;
        this.homeLocation = null; // Planned {x, y} for home
        this.settlementRotation = 0; // The rotation of the settlement this entity belongs to
        this.homeId = null; // for saving
        this.storageShedId = null; // for saving
        
        // Components
        this.personality = new Personality();
        this.decisionMaker = new DecisionMaker(this);
        this.inventory = new Inventory();
        this.tradeInventory = new Inventory(10); // For holding received trade goods
        this.relationships = new Relationships();
        this.vitals = new Vitals();
        this.task = new Task(this);
        this.movement = new Movement(this, x, y);

        if (hasHome) {
            this.home = this.world.buildingManager.createHomeForEntity(this, x, y);
            this.homeLocation = { x: this.home.x, y: this.home.y };
        }

        // Home/personal resource storage (remains here for now as it's tightly coupled with building logic)
        this.resources = {
            food: Math.floor(Math.random() * 5) + 2,
            wood: Math.floor(Math.random() * 3) + 1,
            stone: Math.floor(Math.random() * 3) + 1,
            water: Math.floor(Math.random() * 4) + 2
        };
        for (const resource in this.resources) {
            this.resources[resource] = Math.round(this.resources[resource] * 10) / 10;
        }
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
    get homeX() { return this.home ? this.home.x : (this.homeLocation ? this.homeLocation.x : null); }
    get homeY() { return this.home ? this.home.y : (this.homeLocation ? this.homeLocation.y : null); }
    get currentTask() { return this.task.current; }
    get targetNode() { return this.task.targetNode; }
    set targetNode(node) { this.task.targetNode = node; }
    get targetX() { return this.movement.targetX; }
    set targetX(x) { this.movement.targetX = x; }
    get targetY() { return this.movement.targetY; }
    set targetY(y) { this.movement.targetY = y; }

    getDepositPoint() {
        // Priority: Home > Storage Shed
        return this.home || this.storageShed;
    }

    update(deltaTime) {
        this.vitals.update(deltaTime);
        this.task.update(deltaTime);
        this.movement.update(deltaTime);
        
        // Perform actions based on personality and needs
        if (this.task.shouldPerformAction()) {
            this.performAction();
        }

        // --- Action Handlers ---
        // If at target node, try to gather
        if (this.currentTask.startsWith('gathering') && this.targetNode && this.movement.isAtTarget()) {
            ActionHandler.gatherFromTargetNode(this);
        }

        // If returning to deposit, check if arrived
        if (this.currentTask === 'depositing' && this.targetNode && this.movement.isAtTarget()) {
            ActionHandler.finishDepositing(this);
        }

        // If at home location to build storage
        if (this.currentTask === 'building storage' && this.isAtHome()) {
            ActionHandler.finishBuildingStorageShed(this);
        }

        // If at a construction site, do work
        if (this.currentTask.startsWith('constructing') && this.targetNode && this.movement.isAtTarget()) {
            ActionHandler.workOnConstruction(this);
        }
        
        // If at deposit point to store traded goods
        if (this.currentTask === 'storing traded goods' && this.targetNode && this.movement.isAtTarget()) {
            this.depositTradeInventory();
        }
    }
    
    // --- State Checks ---
    isAtHome() {
        const hx = this.homeX;
        const hy = this.homeY;
        if (hx === null || hy === null) return false;
        const dx = hx - this.x;
        const dy = hy - this.y;
        return Math.sqrt(dx * dx + dy * dy) < 15; // A bit larger radius for home area
    }
    
    isInventoryFull() { return this.inventory.isFull(); }
    hasTradedGoods() { return this.tradeInventory.items.length > 0; }
    
    // --- Actions & Logic ---
    performAction() {
        this.decisionMaker.decideNextAction();
    }
    
    findClosestResourceNode(resourceType) {
        const nodes = this.world.getResourceNodes().filter(n => n.type === resourceType && n.amount > 0);
        if (nodes.length === 0) return null;

        let closestNode = null;
        let minDistance = Infinity;

        for (const node of nodes) {
            const distance = this.world.getDistance(this, node);
            if (distance < minDistance) {
                minDistance = distance;
                closestNode = node;
            }
        }
        return closestNode;
    }
    
    findNearbyEntity(range = 100) {
        const entities = this.world.getEntities().filter(e => e.id !== this.id);
        if (entities.length === 0) return null;
        
        let closest = null;
        let closestDistance = Infinity;
        
        for (const entity of entities) {
            const distance = this.world.getDistance(this, entity);
            if (distance < closestDistance) {
                closest = entity;
                closestDistance = distance;
            }
        }
        
        return closestDistance < range ? closest : null;
    }
    
    // --- Resource Management ---
    getNeeds() {
        const needs = [];
        // Basic resource needs
        if (this.resources.food < 3) needs.push('food');
        if (this.resources.water < 3) needs.push('water');
        
        // Resource needs for potential crafting/building (less urgent)
        if (!this.home) {
            if (!this.storageShed) {
                 if (this.getCarriedResourceAmount('wood') + this.resources.wood < 1) needs.push('wood');
            } else {
                const needed = this.storageShed.getNeededResourcesFor('home');
                if (needed.length > 0) needs.push(...needed);
            }
        } else if (this.resources.wood < 2) needs.push('wood');
        if (this.resources.stone < 2) needs.push('stone');

        return [...new Set(needs)];
    }

    getResources() {
        const total = { ...this.resources };
        const depositPoint = this.getDepositPoint();
        if (depositPoint && depositPoint.inventory) {
            for(const type in depositPoint.inventory) {
                total[type] = (total[type] || 0) + depositPoint.inventory[type];
            }
        }
        return total;
    }

    getCarriedResourceAmount(type) { return this.inventory.getAmount(type); }

    useResource(type, amount) {
        // Use carried resources first, then stored ones.
        const carried = this.getCarriedResourceAmount(type);
        if (carried >= amount) {
            this.inventory.use(type, amount);
            return;
        }

        let remainingNeeded = amount;
        if (carried > 0) {
            remainingNeeded -= carried;
            this.inventory.use(type, carried);
        }

        if (this.resources[type] && this.resources[type] >= remainingNeeded) {
            this.resources[type] = Math.max(0, this.resources[type] - remainingNeeded);
        }
    }

    giveResource(type, amount) {
        // This is for trading, uses home resources
        const depositPoint = this.getDepositPoint();
        let resourceUsed = false;
        if (depositPoint && depositPoint.inventory[type] >= amount) {
            depositPoint.inventory[type] -= amount;
            resourceUsed = true;
        }
        
        if (!resourceUsed && this.resources[type] >= amount) {
             this.resources[type] -= amount;
             resourceUsed = true;
        }
        
        // This function assumes check for resource availability was done before calling.
    }

    receiveResource(type, amount) {
        // Received resources from a trade go into a temporary holding inventory
        this.tradeInventory.add({ type, amount });
    }

    depositTradeInventory() {
        const depositPoint = this.getDepositPoint();
        if (!depositPoint || this.tradeInventory.items.length === 0) {
            this.task.idle();
            return;
        }

        this.tradeInventory.items.forEach(item => {
            depositPoint.inventory[item.type] = (depositPoint.inventory[item.type] || 0) + item.amount;
        });

        this.world.eventSystem.addEvent(`${this.name} stored away goods from a trade.`);
        this.tradeInventory.clear();
        this.task.idle();
    }
    
    // --- Relationships ---
    updateRelationshipValue(entityId, change) { this.relationships.update(entityId, change); }
    getRelationships() { return this.relationships.get(); }
    
    // --- Info & Serialization ---
    getName() { return this.name; }

    getInfo() {
        return {
            name: this.name,
            personality: this.personality.getDescription(),
            resources: this.getResources(),
            inventory: this.inventory.items,
            task: this.currentTask,
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
            homeId: this.home ? this.home.id : null,
            storageShedId: this.storageShed ? this.storageShed.id : null,
            homeLocation: this.homeLocation,
            settlementRotation: this.settlementRotation,
            resources: this.resources,
            // Components
            personality: this.personality.traits,
            inventory: this.inventory.serialize(),
            tradeInventory: this.tradeInventory.serialize(),
            relationships: this.relationships.serialize(),
            vitals: this.vitals.serialize(),
            task: this.task.serialize(),
            movement: this.movement.serialize()
        };
    }

    deserialize(data) {
        this.id = data.id;
        this.name = data.name;
        this.homeLocation = data.homeLocation;
        this.settlementRotation = data.settlementRotation || 0;
        this.resources = data.resources;

        this.personality.traits = data.personality;
        this.inventory.deserialize(data.inventory);
        this.tradeInventory.deserialize(data.tradeInventory || { items: [], capacity: 10 });
        this.relationships.deserialize(data.relationships);
        this.vitals.deserialize(data.vitals);
        this.task.deserialize(data.task);
        this.movement.deserialize(data.movement);

        this.homeId = data.homeId;
        this.storageShedId = data.storageShedId;
    }

    linkSavedData() {
        if (this.homeId) this.home = this.world.buildingManager.getBuildingById(this.homeId);
        if (this.storageShedId) this.storageShed = this.world.buildingManager.getBuildingById(this.storageShedId);
        
        this.task.linkSavedData(this.world);
    }
}