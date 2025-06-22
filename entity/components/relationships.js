export class Relationships {
    constructor() {
        this.relations = new Map();
    }

    getType(value) {
        if (value > 0.3) return 'friendship';
        if (value < -0.3) return 'rivalry';
        return 'neutral';
    }

    update(entityId, change) {
        const current = this.relations.get(entityId) || 0;
        const newValue = Math.max(-1, Math.min(1, current + change));
        this.relations.set(entityId, newValue);
    }

    get() {
        return Array.from(this.relations.entries()).map(([id, value]) => ({
            targetId: id,
            value: value,
            type: this.getType(value)
        }));
    }

    getNonNeutralCount() {
        return this.get().filter(r => r.type !== 'neutral').length;
    }

    serialize() {
        return Array.from(this.relations.entries());
    }

    deserialize(data) {
        this.relations = new Map(data);
    }
}