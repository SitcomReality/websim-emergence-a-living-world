// New file
export class RelationshipManager {
    constructor(entity) {
        this.entity = entity;
    }

    updateRelationshipValue(targetId, change) {
        this.entity.relationships.update(targetId, change);
    }

    getRelationships() {
        return this.entity.relationships.get();
    }
}

