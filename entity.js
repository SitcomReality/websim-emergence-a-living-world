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
        
        // Appearance properties
        this.skinColor = this.generateSkinColor();
        this.eyeOpenness = 1.0; // 0 = closed, 1 = fully open
        this.pupilOffsetX = 0; // For eye direction/expression
        this.pupilOffsetY = 0;
        this.mouthCurve = 0; // -1 = frown, 0 = neutral, 1 = smile
        this.gazeTarget = { x: x, y: y };
        this.gazeTimer = 0;
        this.gazeDuration = 3000 + Math.random() * 2000; // Change gaze every 3-5 seconds when idle
        
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
            // Give starting processed food
            this.home.inventory.cooked_food = 5;
        }

        // Home/personal resource storage (remains here for now as it's tightly coupled with building logic)
        this.resources = {
            food: Math.floor(Math.random() * 5) + 2,
            wood: Math.floor(Math.random() * 3) + 1,
            stone: Math.floor(Math.random() * 3) + 1,
            cooked_food: 0,
            planks: 0,
            bricks: 0,
        };
        for (const resource in this.resources) {
            this.resources[resource] = Math.round(this.resources[resource] * 10) / 10;
        }
    }

    generateSkinColor() {
        // Generate varied skin hues with consistent saturation and lightness
        const hue = Math.random() * 360; // Full hue range
        const saturation = 45; // Consistent saturation
        const lightness = 70; // Consistent lightness
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    getAppearance() {
        // Base appearance that can be modified by mood, actions, etc.
        let eyeOpenness = this.eyeOpenness;
        let mouthCurve = this.mouthCurve;
        
        // Modify appearance based on current state
        if (this.vitals.happiness > 80) {
            mouthCurve = Math.max(mouthCurve, 0.8); // Happy smile
        } else if (this.vitals.happiness < 30) {
            mouthCurve = Math.min(mouthCurve, -0.6); // Sad frown
        }
        
        if (this.vitals.energy < 20) {
            eyeOpenness *= 0.6; // Tired, droopy eyes
        }
        
        // Add some subtle random variation to make them feel alive
        const timeVariation = Math.sin(Date.now() / 3000 + this.id.charCodeAt(0)) * 0.1;
        eyeOpenness = Math.max(0.2, Math.min(1.0, eyeOpenness + timeVariation));
        
        return {
            skinColor: this.skinColor,
            eyeOpenness: eyeOpenness,
            pupilOffsetX: this.pupilOffsetX,
            pupilOffsetY: this.pupilOffsetY,
            mouthCurve: mouthCurve
        };
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
        this.updateGaze(deltaTime);
        
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
            if (this.targetNode && this.movement.isAtTarget()) {
                ActionHandler.gatherFromTargetNode(this, this.world.lastDeltaTime);
            }
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
        
        // If at home/storage to process resources
        if (this.currentTask.startsWith('processing') && this.targetNode && this.movement.isAtTarget()) {
            ActionHandler.processResourcesInBuilding(this, deltaTime);
        }

        // If at deposit point to store traded goods
        if (this.currentTask === 'storing traded goods' && this.targetNode && this.movement.isAtTarget()) {
            this.depositTradeInventory();
        }
        
        // Handle creative and social activities
        const creativeActivities = ['planting', 'building statue', 'building shop', 'dancing', 'meditating', 'storytelling', 'teaching'];
        if (creativeActivities.some(activity => this.currentTask.includes(activity))) {
            ActionHandler.performCreativeActivity(this, deltaTime);
        }
    }
    
    updateGaze(deltaTime) {
        this.gazeTimer += deltaTime;

        let target = null;

        // Priority 1: Task-specific targets
        if (this.task.targetNode) {
            // Handle tasks where targetNode is a building or resource node
            if (this.task.targetNode.x !== undefined) {
                 target = this.task.targetNode;
            }
            // Handle tasks where targetNode is an object with another entity (e.g., teaching)
            else if (this.task.targetNode.student) target = this.task.targetNode.student;
            else if (this.task.targetNode.partners) target = this.task.targetNode.partners[0];
            else if (this.task.targetNode.audience) target = this.task.targetNode.audience[0];
        } else if (this.currentTask === 'socializing') {
            const nearbyEntity = this.findNearbyEntity(150);
            if (nearbyEntity) target = nearbyEntity;
        }

        // Priority 2: Movement target
        if (!target && (this.targetX !== this.x || this.targetY !== this.y)) {
            target = { x: this.targetX, y: this.targetY };
        }

        // Priority 3: Idle gazing
        if (!target) {
            if (this.gazeTimer >= this.gazeDuration) {
                this.gazeTimer = 0;
                this.gazeDuration = 2000 + Math.random() * 4000; // 2-6 seconds
                const lookRange = 80;
                this.gazeTarget = {
                    x: this.x + (Math.random() - 0.5) * lookRange,
                    y: this.y + (Math.random() - 0.5) * lookRange
                };
            }
            target = this.gazeTarget;
        } else {
            // We have a primary target, so reset idle gaze timer.
            this.gazeTimer = 0;
            this.gazeTarget = target;
        }

        // Fallback to prevent errors
        if (!target) {
            target = { x: this.x, y: this.y + 1 }; // Look forward
        }

        // Calculate pupil offset based on direction to target
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const maxPupilOffset = 2.0; // Max distance pupil can move from eye center

        if (distance > 1) {
            const targetPupilX = (dx / distance) * maxPupilOffset;
            const targetPupilY = (dy / distance) * maxPupilOffset;

            // Smoothly move pupils towards the target direction
            const lerpFactor = 0.08;
            this.pupilOffsetX = this.pupilOffsetX * (1 - lerpFactor) + targetPupilX * lerpFactor;
            this.pupilOffsetY = this.pupilOffsetY * (1 - lerpFactor) + targetPupilY * lerpFactor;
        } else {
            // If at target, slowly return pupils to center
            const lerpFactor = 0.05;
            this.pupilOffsetX *= (1 - lerpFactor);
            this.pupilOffsetY *= (1 - lerpFactor);
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
        // Get all other entities that are currently gathering from a node.
        const otherEntities = this.world.getEntities().filter(e => e.id !== this.id);
        const busyNodeIds = new Set();
        otherEntities.forEach(e => {
            if (e.task && (e.task.current.startsWith('gathering') || e.task.current.startsWith('Harvesting')) && e.task.targetNode) {
                busyNodeIds.add(e.task.targetNode.id);
            }
        });

        const nodes = this.world.getResourceNodes().filter(n =>
            n.type === resourceType &&
            n.amount > 0 &&
            !busyNodeIds.has(n.id) // Exclude nodes that are currently being worked on
        );
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
        // Ensure all types are present for the UI
        const allTypes = ['food', 'wood', 'stone', 'cooked_food', 'planks', 'bricks'];
        allTypes.forEach(type => {
            if (!total.hasOwnProperty(type)) {
                total[type] = 0;
            }
        });
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
    
    useResourceFromHome(type, amount) {
        const resources = this.getResources();
        if (resources[type] >= amount) {
            // Deduct from home/storage first, then personal
            const depositPoint = this.getDepositPoint();
            if (depositPoint && depositPoint.inventory[type] >= amount) {
                depositPoint.inventory[type] -= amount;
                return true;
            } else if (this.resources[type] >= amount) {
                this.resources[type] -= amount;
                return true;
            }
        }
        return false;
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
            homeId: this.home ? this.home.id : null,
            storageShedId: this.storageShed ? this.storageShed.id : null,
            homeLocation: this.homeLocation,
            settlementRotation: this.settlementRotation,
            resources: this.resources,
            // Appearance
            skinColor: this.skinColor,
            eyeOpenness: this.eyeOpenness,
            pupilOffsetX: this.pupilOffsetX,
            pupilOffsetY: this.pupilOffsetY,
            mouthCurve: this.mouthCurve,
            gazeTarget: this.gazeTarget,
            gazeTimer: this.gazeTimer,
            gazeDuration: this.gazeDuration,
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

        // Appearance
        this.skinColor = data.skinColor || this.generateSkinColor();
        this.eyeOpenness = data.eyeOpenness || 1.0;
        this.pupilOffsetX = data.pupilOffsetX || 0;
        this.pupilOffsetY = data.pupilOffsetY || 0;
        this.mouthCurve = data.mouthCurve || 0;
        this.gazeTarget = data.gazeTarget || { x: this.x, y: this.y };
        this.gazeTimer = data.gazeTimer || 0;
        this.gazeDuration = data.gazeDuration || 4000;

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