export class Movement {
    constructor(entity, x, y) {
        this.entity = entity;
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.speed = 20;
        this.stuckTimer = 0;
    }
    
    update(deltaTime) {
        this.moveTowardsTarget(deltaTime);
        this.checkIfStuck(deltaTime);
    }
    
    checkIfStuck(deltaTime) {
        const distanceToTarget = Math.sqrt(Math.pow(this.targetX - this.x, 2) + Math.pow(this.targetY - this.y, 2));

        // Only check for stuck if we have a target and are not close to it.
        // A wandering entity's target can be its own position, so distanceToTarget can be 0.
        if (distanceToTarget > 2 && (this.targetX !== this.x || this.targetY !== this.y)) {
             // We can check if we're moving by seeing if our position has changed.
             // However, a simpler check is to see if we're close to another entity, as that's the main cause.
             let isBlocked = false;
             for (const other of this.entity.world.getEntities()) {
                if (other.id === this.entity.id) continue;
                const otherDx = this.x - other.x;
                const otherDy = this.y - other.y;
                if ((otherDx * otherDx + otherDy * otherDy) < 15*15) { // within avoidance radius
                    isBlocked = true;
                    break;
                }
             }

             if (isBlocked) {
                this.stuckTimer += deltaTime;
             } else {
                this.stuckTimer = 0;
             }

             if (this.stuckTimer > 2000) { // If blocked for 2 seconds, give up.
                this.stuckTimer = 0;
                this.entity.task.idle();
                this.entity.world.eventSystem.addEvent(`${this.entity.name} got stuck and decided to do something else.`);
             }
        } else {
            this.stuckTimer = 0; // Not stuck if at/near target.
        }
    }
    
    moveTowardsTarget(deltaTime) {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distanceToTarget = Math.sqrt(dx * dx + dy * dy);
        
        if (distanceToTarget > 2) {
            let moveX = 0;
            let moveY = 0;

            // --- Vector towards target ---
            if (distanceToTarget > 0) {
                moveX = dx / distanceToTarget;
                moveY = dy / distanceToTarget;
            }

            // --- Avoidance behavior ---
            const avoidanceRadius = 15; // The distance within which entities start avoiding each other
            const repulsionStrength = 0.8; // How strongly they repel
            let avoidanceX = 0;
            let avoidanceY = 0;
            let neighbors = 0;

            const otherEntities = this.entity.world.getEntities();
            for (const other of otherEntities) {
                if (other.id === this.entity.id) continue;

                const otherDx = this.x - other.x;
                const otherDy = this.y - other.y;
                const distSq = otherDx * otherDx + otherDy * otherDy;

                if (distSq < avoidanceRadius * avoidanceRadius && distSq > 0) {
                    const distance = Math.sqrt(distSq);
                    const force = (avoidanceRadius - distance) / avoidanceRadius;
                    avoidanceX += (otherDx / distance) * force;
                    avoidanceY += (otherDy / distance) * force;
                    neighbors++;
                }
            }

            if (neighbors > 0) {
                avoidanceX /= neighbors;
                avoidanceY /= neighbors;
                
                // Combine movement and avoidance vectors
                moveX = moveX * (1 - repulsionStrength) + avoidanceX * repulsionStrength;
                moveY = moveY * (1 - repulsionStrength) + avoidanceY * repulsionStrength;
            }

            // Normalize final movement vector
            const finalMoveMagnitude = Math.sqrt(moveX * moveX + moveY * moveY);
            if (finalMoveMagnitude > 0) {
                moveX /= finalMoveMagnitude;
                moveY /= finalMoveMagnitude;
            }
            
            const moveDistance = this.speed * (deltaTime / 1000);
            this.x += moveX * moveDistance;
            this.y += moveY * moveDistance;

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
            stuckTimer: this.stuckTimer,
        };
    }
    
    deserialize(data) {
        if (!data) return;
        this.x = data.x;
        this.y = data.y;
        this.targetX = data.targetX;
        this.targetY = data.targetY;
        this.speed = data.speed;
        this.stuckTimer = data.stuckTimer || 0;
    }
}