export class Task {
    constructor(entity) {
        this.entity = entity;
        this.current = 'idle';
        this.goal = 'Surviving';
        this.target = null; // Can be a node, building, or entity
        this.targetId = null; // for saving
        this.processingJob = null; // For processing tasks { rawType, processedType, amount }
        this.harvestingProgress = 0; // For time-based gathering
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

    set(taskName, target = null) {
        this.current = taskName;
        this.target = target;
        this.processingJob = null;
        this.harvestingProgress = 0; // Reset progress on new task
    }
    
    setGoal(goalName) {
        this.goal = goalName;
    }
    
    clearGoal() {
        this.setGoal('Improving Livelihood');
    }

    setProcessing(job, building) {
        this.set(`processing ${job.rawType}`, building);
        this.processingJob = job;
    }

    idle() {
        this.set('idle');
        this.clearTarget();
    }
    
    clearTarget() {
        this.target = null;
        this.processingJob = null;
        this.harvestingProgress = 0;
    }

    serialize() {
        return {
            current: this.current,
            goal: this.goal,
            targetId: this.target ? this.target.id : null,
            actionTimer: this.actionTimer,
            actionInterval: this.actionInterval,
            processingJob: this.processingJob,
            harvestingProgress: this.harvestingProgress,
        };
    }
    
    deserialize(data) {
        if (!data) return;
        this.current = data.current;
        this.goal = data.goal || 'Surviving';
        this.actionTimer = data.actionTimer;
        this.actionInterval = data.actionInterval;
        this.targetId = data.targetId; // Store for linking
        this.processingJob = data.processingJob;
        this.harvestingProgress = data.harvestingProgress || 0;
    }
    
    linkSavedData(world) {
        if (this.targetId) {
            // Target could be a resource node, a building, or another entity
            this.target = world.resourceManager.getNodes().find(n => n.id === this.targetId) ||
                              world.buildingManager.getBuildingById(this.targetId) ||
                              world.entities.find(e => e.id === this.targetId);
        }
    }
}