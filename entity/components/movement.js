export class Movement {
    constructor(entity, x, y) {
        this.entity = entity;
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.speed = 20;
    }
    
    update(deltaTime) {
        this.moveTowardsTarget(deltaTime);
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
            if (this.entity.currentTask === 'wandering' || this.entity.currentTask === 'exploring') {
                 this.entity.task.idle();
            }
            // Snap to target if it's a node
            if (this.entity.targetNode) {
                this.x = this.targetX;
                this.y = this.targetY;
            }
        }
    }

    isAtTarget() {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        return Math.sqrt(dx * dx + dy * dy) < 5;
    }

    serialize() {
        return {
            x: this.x,
            y: this.y,
            targetX: this.targetX,
            targetY: this.targetY,
            speed: this.speed,
        };
    }
    
    deserialize(data) {
        if (!data) return;
        this.x = data.x;
        this.y = data.y;
        this.targetX = data.targetX;
        this.targetY = data.targetY;
        this.speed = data.speed;
    }
}

