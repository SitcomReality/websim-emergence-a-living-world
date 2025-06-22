import { Personality } from './personality.js';
import { generateName } from './utils.js';
import { DecisionMaker } from './behavior/decision_maker.js';

export class Entity {
    constructor(x, y, world) {
        this.id = Math.random().toString(36).substring(2, 9);
        this.x = x;
        this.y = y;
        this.world = world;
        this.name = generateName();
        
        this.home = this.world.buildingManager.createHomeForEntity(this, x, y);

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

    get homeX() {
        return this.home.x;
    }

    get homeY() {
        return this.home.y;
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

        // If returning home to deposit, check if arrived
        if (this.currentTask === 'depositing' && this.isAtHome()) {
            this.finishDepositing();
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
        const dx = this.homeX - this.x;
        const dy = this.homeY - this.y;
        return Math.sqrt(dx * dx + dy * dy) < 5;
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

        this.targetX = this.homeX;
        this.targetY = this.homeY;
        this.targetNode = null;
        this.currentTask = 'depositing';
    }

    finishDepositing() {
        if (this.inventory.length === 0) return;

        this.inventory.forEach(item => {
            this.resources[item.type] = (this.resources[item.type] || 0) + item.amount;
            this.resources[item.type] = Math.round(this.resources[item.type] * 10) / 10;
        });
        const storedItems = this.inventory.map(i => `${i.amount.toFixed(1)} ${i.type}`).join(', ');
        this.world.eventSystem.addEvent(`${this.name} stored ${storedItems} at home.`);
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
        if (this.resources.wood < 2) needs.push('wood');
        if (this.resources.stone < 2) needs.push('stone');

        return needs;
    }

    getResources() {
        return { ...this.resources };
    }

    giveResource(type, amount) {
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
            resources: this.resources,
            inventory: this.inventory,
            task: this.currentTask,
            energy: Math.round(this.energy),
            happiness: Math.round(this.happiness),
            age: Math.round(this.age),
            relationships: this.getRelationships().filter(r => r.type !== 'neutral').length
        };
    }
}