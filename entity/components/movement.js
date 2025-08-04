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