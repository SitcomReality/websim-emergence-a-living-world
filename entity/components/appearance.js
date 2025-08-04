// New file
export class Appearance {
    constructor(entity) {
        this.entity = entity;
        this.skinColor = this.generateSkinColor();
        this.eyeOpenness = 1.0;
        this.pupilOffsetX = 0;
        this.pupilOffsetY = 0;
        this.mouthCurve = 0;
        this.gazeTarget = { x: entity.x, y: entity.y };
        this.gazeTimer = 0;
        this.gazeDuration = 3000 + Math.random() * 2000;
    }

    generateSkinColor() {
        const hue = Math.random() * 360;
        const saturation = 45;
        const lightness = 70;
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    get() {
        let eyeOpenness = this.eyeOpenness;
        let mouthCurve = this.mouthCurve;

        // Blinking logic
        const now = Date.now();
        const blinkCycle = now % 4000; // 4-second cycle
        const blinkDuration = 150; // 150ms blink
        const blinkChance = 0.002; // 0.2% chance per frame
        
        if (blinkCycle < blinkDuration || Math.random() < blinkChance) {
            eyeOpenness = 0.1; // Closed eyes
        }

        if (this.entity.vitals.happiness > 80) mouthCurve = Math.max(mouthCurve, 0.8);
        else if (this.entity.vitals.happiness < 30) mouthCurve = Math.min(mouthCurve, -0.6);

        if (this.entity.vitals.energy < 20) eyeOpenness *= 0.6;

        const timeVariation = Math.sin(Date.now() / 3000 + this.entity.id.charCodeAt(0)) * 0.1;
        eyeOpenness = Math.max(0.2, Math.min(1.0, eyeOpenness + timeVariation));

        return {
            skinColor: this.skinColor,
            eyeOpenness: eyeOpenness,
            pupilOffsetX: this.pupilOffsetX,
            pupilOffsetY: this.pupilOffsetY,
            mouthCurve: mouthCurve
        };
    }

    update(deltaTime) {
        this.gazeTimer += deltaTime;
        let target = null;
        const task = this.entity.task;

        if (task.target) {
            target = task.target.student || task.target.partners?.[0] || task.target.audience?.[0] || task.target;
        } else if (task.current === 'socializing') {
            const nearbyEntity = this.entity.findNearbyEntity(150);
            if (nearbyEntity) target = nearbyEntity;
        }

        if (!target && (this.entity.targetX !== this.entity.x || this.entity.targetY !== this.entity.y)) {
            target = { x: this.entity.targetX, y: this.entity.targetY };
        }

        if (!target) {
            if (this.gazeTimer >= this.gazeDuration) {
                this.gazeTimer = 0;
                this.gazeDuration = 2000 + Math.random() * 4000;
                const lookRange = 80;
                this.gazeTarget = {
                    x: this.entity.x + (Math.random() - 0.5) * lookRange,
                    y: this.entity.y + (Math.random() - 0.5) * lookRange
                };
            }
            target = this.gazeTarget;
        } else {
            this.gazeTimer = 0;
            this.gazeTarget = target;
        }

        if (!target) target = { x: this.entity.x, y: this.entity.y + 1 };

        const dx = target.x - this.entity.x;
        const dy = target.y - this.entity.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxPupilOffset = 2.0;

        if (distance > 1) {
            const targetPupilX = (dx / distance) * maxPupilOffset;
            const targetPupilY = (dy / distance) * maxPupilOffset;
            const lerpFactor = 0.08;
            this.pupilOffsetX = this.pupilOffsetX * (1 - lerpFactor) + targetPupilX * lerpFactor;
            this.pupilOffsetY = this.pupilOffsetY * (1 - lerpFactor) + targetPupilY * lerpFactor;
        } else {
            const lerpFactor = 0.05;
            this.pupilOffsetX *= (1 - lerpFactor);
            this.pupilOffsetY *= (1 - lerpFactor);
        }
    }

    serialize() {
        return {
            skinColor: this.skinColor,
            eyeOpenness: this.eyeOpenness,
            pupilOffsetX: this.pupilOffsetX,
            pupilOffsetY: this.pupilOffsetY,
            mouthCurve: this.mouthCurve,
            gazeTarget: this.gazeTarget,
            gazeTimer: this.gazeTimer,
            gazeDuration: this.gazeDuration,
        };
    }

    deserialize(data) {
        if (!data) return;
        this.skinColor = data.skinColor || this.generateSkinColor();
        this.eyeOpenness = data.eyeOpenness || 1.0;
        this.pupilOffsetX = data.pupilOffsetX || 0;
        this.pupilOffsetY = data.pupilOffsetY || 0;
        this.mouthCurve = data.mouthCurve || 0;
        this.gazeTarget = data.gazeTarget || { x: this.entity.x, y: this.entity.y };
        this.gazeTimer = data.gazeTimer || 0;
        this.gazeDuration = data.gazeDuration || 4000;
    }
}