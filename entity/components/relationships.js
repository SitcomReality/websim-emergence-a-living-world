export class Relationships {
    constructor() {
        this.relations = new Map();
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
            type: value > 0.3 ? 'friendship' : value < -0.3 ? 'rivalry' : 'neutral'
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

