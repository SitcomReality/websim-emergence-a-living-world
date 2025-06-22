import { Personality } from './personality.js';
import { generateName } from './utils.js';
import { DecisionMaker } from './behavior/decision_maker.js';

export class Entity {
    constructor(x, y, world, hasHome = false) {
        this.id = Math.random().toString(36).substring(2, 9);
        this.x = x;
        this.y = y;
        this.world = world;
        this.name = generateName();
        
        this.home = null;
        this.storageShed = null;
        this.homeLocation = null; // Planned {x, y} for home
        this.homeId = null; // for saving
        this.storageShedId = null; // for saving
        this.targetNodeId = null; // for saving

        if (hasHome) {
            this.home = this.world.buildingManager.createHomeForEntity(this, x, y);
            this.homeLocation = { x: this.home.x, y: this.home.y };
        }

        this.personality = new Personality();
        this.decisionMaker = new DecisionMaker(this);
        
        this.resources = {
            food: Math.floor(Math.random() * 5) + 2,
            wood: Math.floor(Math.random() * 3) + 1,
            stone: Math.floor(Math.random() * 3) + 1,
            water: Math.floor(Math.random() * 4) + 2
        };
        for (const resource in this.resources) {
            this.resources[resource] = Math.round(this.resources[resource] * 10) / 10;
        }

        this.inventory = [];
        this.inventoryCapacity = 2;
        
        this.relationships = new Map();
        this.energy = 100;
        this.happiness = 50;
        this.age = 0;
        
        this.targetX = x;
        this.targetY = y;
        this.speed = 20;
        this.targetNode = null;
        this.currentTask = 'idle';
        
        this.actionTimer = Math.random() * 2000; // Stagger initial actions
        this.actionInterval = 3000 + Math.random() * 4000;
    }

    static createFromSave(data, world) {
        // Create a blank entity, then populate it.
        const entity = new Entity(data.x, data.y, world);
        entity.deserialize(data);
        return entity;
    }

    get homeX() {
        return this.home ? this.home.x : (this.homeLocation ? this.homeLocation.x : null);
    }

    get homeY() {
        return this.home ? this.home.y : (this.homeLocation ? this.homeLocation.y : null);
    }

    getDepositPoint() {
        // Priority: Home > Storage Shed
        return this.home || this.storageShed;
    }

    update(deltaTime) {
        this.age += deltaTime / 1000;
        this.actionTimer += deltaTime;
        
        // Move towards target
        this.moveTowardsTarget(deltaTime);
        
        // Perform actions based on personality and needs
        if (this.actionTimer >= this.actionInterval) {
            this.performAction();
            this.actionTimer = 0;
            this.actionInterval = 3000 + Math.random() * 4000; // Longer interval
        }

        // If at target node, try to gather
        if (this.currentTask.startsWith('gathering') && this.targetNode && this.isAtTarget()) {
            this.gatherFromTargetNode();
        }

        // If returning to deposit, check if arrived
        if (this.currentTask === 'depositing' && this.targetNode && this.isAtTarget()) {
            this.finishDepositing();
        }

        // If at home location to build storage
        if (this.currentTask === 'building storage' && this.isAtHome()) {
            this.finishBuildingStorageShed();
        }

        // If at a construction site, do work
        if (this.currentTask.startsWith('constructing') && this.targetNode && this.isAtTarget()) {
            this.workOnConstruction();
        }
        
        // Decay energy and happiness slightly
        this.energy = Math.max(0, this.energy - (deltaTime / 1000) * 0.1);
        this.happiness = Math.max(0, this.happiness - (deltaTime / 1000) * 0.05);
    }

    isAtTarget() {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        return Math.sqrt(dx * dx + dy * dy) < 5;
    }

    isAtHome() {
        const hx = this.homeX;
        const hy = this.homeY;
        if (hx === null || hy === null) return false;
        const dx = hx - this.x;
        const dy = hy - this.y;
        return Math.sqrt(dx * dx + dy * dy) < 15; // A bit larger radius for home area
    }

    moveTowardsTarget(deltaTime) {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 2) {
            const moveDistance = this.speed * (deltaTime / 1000);
            this.x += (dx / distance) * moveDistance;
            this.y += (dy / distance) * moveDistance;
        } else {
            // Reached target
            if (this.currentTask === 'wandering' || this.currentTask === 'exploring') {
                 this.currentTask = 'idle';
            }
            if (this.targetNode) {
                this.x = this.targetX;
                this.y = this.targetY;
            }
        }
    }

    pickNewTarget() {
        this.targetNode = null;
        this.currentTask = 'wandering';
        // Personality influences movement patterns
        if (this.personality.traits.curiosity > 0.7) {
            // Curious entities explore more
            this.targetX = Math.random() * this.world.width;
            this.targetY = Math.random() * this.world.height;
        } else if (this.personality.traits.sociability > 0.6) {
            // Social entities move towards others
            const nearbyEntity = this.findNearbyEntity();
            if (nearbyEntity) {
                this.targetX = nearbyEntity.x + (Math.random() - 0.5) * 60;
                this.targetY = nearbyEntity.y + (Math.random() - 0.5) * 60;
            } else {
                this.targetX = this.x + (Math.random() - 0.5) * 100;
                this.targetY = this.y + (Math.random() - 0.5) * 100;
            }
        } else {
            // Conservative movement
            this.targetX = this.x + (Math.random() - 0.5) * 80;
            this.targetY = this.y + (Math.random() - 0.5) * 80;
        }
        
        // Keep within bounds
        this.targetX = Math.max(20, Math.min(this.world.width - 20, this.targetX));
        this.targetY = Math.max(20, Math.min(this.world.height - 20, this.targetY));
    }

    performAction() {
        this.decisionMaker.decideNextAction();
    }

    finishBuildingStorageShed() {
        if (!this.homeLocation || this.storageShed) return;

        const woodNeeded = 1;
        let woodAvailable = this.getCarriedResourceAmount('wood');
        
        if (woodAvailable < woodNeeded) {
             woodAvailable += this.resources.wood;
        }

        if (woodAvailable >= woodNeeded) {
            this.useResource('wood', woodNeeded);

            const shed = this.world.buildingManager.createStorageShed(this.id, this.homeLocation.x, this.homeLocation.y);
            this.storageShed = shed;
            this.world.eventSystem.addEvent(`${this.name} built a storage shed.`);
            this.currentTask = 'idle';
        } else {
            // This should not happen if logic is correct, but as a fallback:
            this.currentTask = 'gathering for shed';
        }
    }

    workOnConstruction() {
        const site = this.targetNode;
        if (!site || !site.type.endsWith('_construction_site')) {
            this.currentTask = 'idle';
            return;
        }

        const workAmount = 1; // Amount of "work" done per visit
        const completed = this.world.buildingManager.advanceConstruction(site, workAmount);

        if (completed) {
            this.world.eventSystem.addEvent(`${this.name} finished building their home!`);
            this.home = completed;
            this.currentTask = 'idle';
        }
        // stay here to work more on next cycle
    }

    isInventoryFull() {
        let carriedAmount = 0;
        this.inventory.forEach(item => carriedAmount += item.amount);
        return carriedAmount >= this.inventoryCapacity;
    }

    startDepositing() {
        if (this.inventory.length === 0) {
            this.currentTask = 'idle';
            return;
        };

        const depositPoint = this.getDepositPoint();
        if (depositPoint) {
            this.targetX = depositPoint.x;
            this.targetY = depositPoint.y;
            this.targetNode = depositPoint;
            this.currentTask = 'depositing';
        } else {
            // Cannot deposit, so maybe drop items or just wander?
            this.currentTask = 'idle';
        }
    }

    finishDepositing() {
        if (this.inventory.length === 0) return;

        const depositPoint = this.targetNode;
        if (!depositPoint || !(depositPoint instanceof Object) || !('inventory' in depositPoint)) {
             // Depositing to self if no valid building target
             this.inventory.forEach(item => {
                this.resources[item.type] = (this.resources[item.type] || 0) + item.amount;
             });
             this.world.eventSystem.addEvent(`${this.name} stored items in their personal supply.`);
        } else {
            // Deposit into a building (shed or home)
            this.inventory.forEach(item => {
                depositPoint.inventory[item.type] = (depositPoint.inventory[item.type] || 0) + item.amount;
            });
            const storedItems = this.inventory.map(i => `${i.amount.toFixed(1)} ${i.type}`).join(', ');
            this.world.eventSystem.addEvent(`${this.name} stored ${storedItems} at their ${depositPoint.type}.`);
        }
        
        this.inventory = [];
        this.currentTask = 'idle';
    }

    findClosestResourceNode(resourceType) {
        const nodes = this.world.getResourceNodes().filter(n => n.type === resourceType && n.amount > 0);
        if (nodes.length === 0) return null;

        let closestNode = nodes[0];
        let minDistance = this.world.getDistance(this, closestNode);

        for (let i = 1; i < nodes.length; i++) {
            const distance = this.world.getDistance(this, nodes[i]);
            if (distance < minDistance) {
                minDistance = distance;
                closestNode = nodes[i];
            }
        }
        return closestNode;
    }

    gatherFromTargetNode() {
        if (!this.targetNode || this.isInventoryFull()) {
            this.targetNode = null;
            if (this.isInventoryFull()) {
                this.startDepositing();
            } else {
                this.currentTask = 'idle';
            }
            return;
        }

        const gathered = this.world.resourceManager.gatherFrom(this.targetNode);
        if (gathered) {
            const existingItem = this.inventory.find(i => i.type === gathered.type);
            if (existingItem) {
                existingItem.amount += gathered.amount;
                existingItem.amount = Math.round(existingItem.amount * 10) / 10;
            } else {
                 this.inventory.push(gathered);
            }
           
            this.energy = Math.min(100, this.energy + 5);
            // Don't log every single gather event to reduce spam.
            // A "stored" event will be logged later.
        }

        if (this.isInventoryFull() || this.targetNode.amount <= 0) {
            this.targetNode = null;
            if (this.isInventoryFull()) {
                this.startDepositing();
            } else {
                this.currentTask = 'idle';
            }
        }
    }

    gatherResources() {
        const resourceNodes = this.world.getResourceNodes();
        const nearbyNodes = resourceNodes.filter(node => {
            const distance = Math.sqrt((node.x - this.x) ** 2 + (node.y - this.y) ** 2);
            return distance < 30;
        });
        
        if (nearbyNodes.length > 0) {
            if (this.isInventoryFull()) {
                this.startDepositing();
                return;
            }
            const node = nearbyNodes[Math.floor(Math.random() * nearbyNodes.length)];
            const gathered = this.world.resourceManager.gatherFrom(node);
            if (gathered) {
                 const existingItem = this.inventory.find(i => i.type === gathered.type);
                if (existingItem) {
                    existingItem.amount += gathered.amount;
                    existingItem.amount = Math.round(existingItem.amount * 10) / 10;
                } else {
                    this.inventory.push(gathered);
                }
                this.energy = Math.min(100, this.energy + 5);
            }
        }
    }

    seekSocialInteraction() {
        const nearbyEntity = this.findNearbyEntity();
        if (nearbyEntity) {
            this.targetX = nearbyEntity.x;
            this.targetY = nearbyEntity.y;
            this.currentTask = 'socializing';
        }
    }

    findNearbyEntity(range = 100) {
        const entities = this.world.getEntities().filter(e => e.id !== this.id);
        if (entities.length === 0) return null;
        
        // Find closest entity
        let closest = entities[0];
        let closestDistance = this.world.getDistance(this, closest);
        
        for (const entity of entities) {
            const distance = this.world.getDistance(this, entity);
            if (distance < closestDistance) {
                closest = entity;
                closestDistance = distance;
            }
        }
        
        return closestDistance < range ? closest : null;
    }

    performRoleAction() {
        this.role.performAction(this);
    }

    getNeeds() {
        const needs = [];
        
        // Basic resource needs
        if (this.resources.food < 3) needs.push('food');
        if (this.resources.water < 3) needs.push('water');
        
        // Resource needs for potential crafting/building (less urgent)
        if (!this.home) {
            if (!this.storageShed) {
                 if (this.getCarriedResourceAmount('wood') < 1) needs.push('wood');
            } else {
                const needed = this.storageShed.getNeededResourcesFor('home');
                if (needed.length > 0) needs.push(...needed);
            }
        } else if (this.resources.wood < 2) needs.push('wood');
        if (this.resources.stone < 2) needs.push('stone');

        // Return unique needs
        return [...new Set(needs)];
    }

    getResources() {
        // Combines personal and storage resources if available
        const total = { ...this.resources };
        const depositPoint = this.getDepositPoint();
        if (depositPoint && depositPoint.inventory) {
            for(const type in depositPoint.inventory) {
                total[type] = (total[type] || 0) + depositPoint.inventory[type];
            }
        }
        return total;
    }

    getCarriedResourceAmount(type) {
        const item = this.inventory.find(i => i.type === type);
        return item ? item.amount : 0;
    }

    useResource(type, amount) {
        // Use carried resources first, then stored ones.
        const carried = this.getCarriedResourceAmount(type);
        if (carried >= amount) {
            const item = this.inventory.find(i => i.type === type);
            item.amount -= amount;
            if (item.amount <= 0) this.inventory = this.inventory.filter(i => i.type !== type);
            return;
        }

        let remainingNeeded = amount - carried;
        if(carried > 0) {
             this.inventory = this.inventory.filter(i => i.type !== type);
        }

        // Now use stored resources
        this.resources[type] = Math.max(0, this.resources[type] - remainingNeeded);
    }

    giveResource(type, amount) {
        // This is for trading, uses home resources
        this.resources[type] = Math.max(0, this.resources[type] - amount);
        this.resources[type] = Math.round(this.resources[type] * 10) / 10;
    }

    receiveResource(type, amount) {
        this.resources[type] += amount;
        this.resources[type] = Math.round(this.resources[type] * 10) / 10;
    }

    updateRelationship(entityId, change) {
        const current = this.relationships.get(entityId) || 0;
        const newValue = Math.max(-1, Math.min(1, current + change));
        this.relationships.set(entityId, newValue);
    }

    getRelationships() {
        return Array.from(this.relationships.entries()).map(([id, value]) => ({
            targetId: id,
            value: value,
            type: value > 0.3 ? 'friendship' : value < -0.3 ? 'rivalry' : 'neutral'
        }));
    }

    getName() {
        return this.name;
    }

    getInfo() {
        return {
            name: this.name,
            personality: this.personality.getDescription(),
            resources: this.getResources(),
            inventory: this.inventory,
            task: this.currentTask,
            energy: Math.round(this.energy),
            happiness: Math.round(this.happiness),
            age: Math.round(this.age),
            relationships: this.getRelationships().filter(r => r.type !== 'neutral').length
        };
    }

    serialize() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            name: this.name,
            homeId: this.home ? this.home.id : null,
            storageShedId: this.storageShed ? this.storageShed.id : null,
            homeLocation: this.homeLocation,
            personality: this.personality.traits,
            resources: this.resources,
            inventory: this.inventory,
            relationships: Array.from(this.relationships.entries()),
            energy: this.energy,
            happiness: this.happiness,
            age: this.age,
            targetX: this.targetX,
            targetY: this.targetY,
            targetNodeId: this.targetNode ? this.targetNode.id : null,
            currentTask: this.currentTask,
            actionTimer: this.actionTimer,
            actionInterval: this.actionInterval
        };
    }

    deserialize(data) {
        // Simple properties
        Object.assign(this, {
            id: data.id,
            x: data.x,
            y: data.y,
            name: data.name,
            homeLocation: data.homeLocation,
            resources: data.resources,
            inventory: data.inventory,
            energy: data.energy,
            happiness: data.happiness,
            age: data.age,
            targetX: data.targetX,
            targetY: data.targetY,
            currentTask: data.currentTask,
            actionTimer: data.actionTimer,
            actionInterval: data.actionInterval
        });

        // Complex properties that need reconstruction/linking
        this.personality.traits = data.personality;
        this.relationships = new Map(data.relationships);

        // Store IDs for linking after all objects are created
        this.homeId = data.homeId;
        this.storageShedId = data.storageShedId;
        this.targetNodeId = data.targetNodeId;
    }

    linkSavedData() {
        // Link object references from saved IDs
        if (this.homeId) {
            this.home = this.world.buildingManager.getBuildingById(this.homeId);
        }
        if (this.storageShedId) {
            this.storageShed = this.world.buildingManager.getBuildingById(this.storageShedId);
        }
        if (this.targetNodeId) {
            // Target could be a resource node or a building
            this.targetNode = this.world.resourceManager.getNodes().find(n => n.id === this.targetNodeId) ||
                              this.world.buildingManager.getBuildingById(this.targetNodeId);
        }
    }
}