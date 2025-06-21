import { Personality } from './personality.js';
import { Role } from './role.js';
import { generateName } from './utils.js';

export class Entity {
    constructor(x, y, world) {
        this.id = Math.random().toString(36).substring(2, 9);
        this.x = x;
        this.y = y;
        this.world = world;
        this.name = generateName();
        
        this.personality = new Personality();
        this.role = Role.assignRandomRole();
        
        this.resources = {
            food: Math.floor(Math.random() * 5) + 2,
            wood: Math.floor(Math.random() * 3) + 1,
            stone: Math.floor(Math.random() * 3) + 1,
            water: Math.floor(Math.random() * 4) + 2
        };
        
        this.relationships = new Map();
        this.energy = 100;
        this.happiness = 50;
        this.age = 0;
        
        this.targetX = x;
        this.targetY = y;
        this.speed = 20;
        
        this.actionTimer = 0;
        this.actionInterval = 1000 + Math.random() * 2000;
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
            this.actionInterval = 1000 + Math.random() * 2000;
        }
        
        // Decay energy and happiness slightly
        this.energy = Math.max(0, this.energy - deltaTime / 10000);
        this.happiness = Math.max(0, this.happiness - deltaTime / 20000);
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
            // Reached target, pick a new one
            this.pickNewTarget();
        }
    }

    pickNewTarget() {
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
        // Action based on current needs and personality
        const needs = this.getNeeds();
        
        if (needs.length > 0) {
            // Try to gather needed resources
            this.gatherResources();
        } else if (this.personality.traits.sociability > 0.5) {
            // Social interaction
            this.seekSocialInteraction();
        } else if (this.personality.traits.productivity > 0.6) {
            // Work on role-specific tasks
            this.performRoleAction();
        }
    }

    gatherResources() {
        const resourceNodes = this.world.getResourceNodes();
        const nearbyNodes = resourceNodes.filter(node => {
            const distance = Math.sqrt((node.x - this.x) ** 2 + (node.y - this.y) ** 2);
            return distance < 30;
        });
        
        if (nearbyNodes.length > 0) {
            const node = nearbyNodes[Math.floor(Math.random() * nearbyNodes.length)];
            const gathered = this.world.resourceManager.gatherFrom(node);
            if (gathered) {
                this.resources[gathered.type] += gathered.amount;
                this.energy = Math.min(100, this.energy + 5);
                this.world.eventSystem.addEvent(`${this.name} gathered ${gathered.amount} ${gathered.type}`);
            }
        }
    }

    seekSocialInteraction() {
        const nearbyEntity = this.findNearbyEntity();
        if (nearbyEntity) {
            this.targetX = nearbyEntity.x;
            this.targetY = nearbyEntity.y;
        }
    }

    findNearbyEntity() {
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
        
        return closestDistance < 100 ? closest : null;
    }

    performRoleAction() {
        this.role.performAction(this);
    }

    getNeeds() {
        const needs = [];
        
        // Basic resource needs
        if (this.resources.food < 2) needs.push('food');
        if (this.resources.water < 2) needs.push('water');
        
        // Role-specific needs
        const roleNeeds = this.role.getNeeds(this);
        needs.push(...roleNeeds);
        
        return needs;
    }

    getResources() {
        return { ...this.resources };
    }

    giveResource(type, amount) {
        this.resources[type] = Math.max(0, this.resources[type] - amount);
    }

    receiveResource(type, amount) {
        this.resources[type] += amount;
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
            role: this.role.name,
            personality: this.personality.getDescription(),
            resources: this.resources,
            energy: Math.round(this.energy),
            happiness: Math.round(this.happiness),
            age: Math.round(this.age),
            relationships: this.getRelationships().length
        };
    }
}

