export class Task {
    constructor(entity) {
        this.entity = entity;
        this.current = 'idle';
        this.targetNode = null;
        this.targetNodeId = null; // for saving
        this.actionTimer = Math.random() * 2000;
        this.actionInterval = 3000 + Math.random() * 4000;
    }

    update(deltaTime) {
        this.actionTimer += deltaTime;
    }

    shouldPerformAction() {
        if (this.actionTimer >= this.actionInterval) {
            this.actionTimer = 0;
            // Longer interval
            this.actionInterval = 3000 + Math.random() * 4000;
            return true;
        }
        return false;
    }

    set(taskName, targetNode = null) {
        this.current = taskName;
        this.targetNode = targetNode;
    }
    
    idle() {
        this.set('idle');
        this.clearTarget();
    }
    
    clearTarget() {
        this.targetNode = null;
    }

    serialize() {
        return {
            current: this.current,
            targetNodeId: this.targetNode ? this.targetNode.id : null,
            actionTimer: this.actionTimer,
            actionInterval: this.actionInterval,
        };
    }
    
    deserialize(data) {
        if (!data) return;
        this.current = data.current;
        this.actionTimer = data.actionTimer;
        this.actionInterval = data.actionInterval;
        this.targetNodeId = data.targetNodeId; // Store for linking
    }
    
    linkSavedData(world) {
        if (this.targetNodeId) {
            // Target could be a resource node or a building
            this.targetNode = world.resourceManager.getNodes().find(n => n.id === this.targetNodeId) ||
                              world.buildingManager.getBuildingById(this.targetNodeId);
        }
    }
}