// New file
export class DecorativeStructureManager {
    constructor(world) {
        this.world = world;
        this.structures = []; // Gardens, statues, shops, etc.
    }

    reset() {
        this.structures = [];
    }

    getStructures() {
        return this.structures;
    }

    createGarden(x, y, type, ownerId) {
        const garden = {
            id: Math.random().toString(36).substring(2, 9),
            type: type, // 'food_garden' or 'flower_garden'
            x: x,
            y: y,
            ownerId: ownerId,
            maturity: 0, // 0 to 1, affects appearance and benefits
            lastHarvest: 0
        };
        this.structures.push(garden);
        return garden;
    }

    createStatue(x, y, ownerId) {
        const statue = {
            id: Math.random().toString(36).substring(2, 9),
            type: 'statue',
            x: x,
            y: y,
            ownerId: ownerId,
            style: Math.floor(Math.random() * 3) // Different statue styles
        };
        this.structures.push(statue);
        return statue;
    }

    createShop(x, y, ownerId) {
        const shop = {
            id: Math.random().toString(36).substring(2, 9),
            type: 'shop',
            x: x,
            y: y,
            ownerId: ownerId,
            inventory: { food: 0, wood: 0, stone: 0, cooked_food: 0, planks: 0, bricks: 0 },
            customerCount: 0
        };
        this.structures.push(shop);
        return shop;
    }

    update(deltaTime) {
        this.updateDecorativeStructures(deltaTime);
    }
    
    updateDecorativeStructures(deltaTime) {
        this.structures.forEach(structure => {
            if (structure.type === 'food_garden' || structure.type === 'flower_garden') {
                // Gardens mature over time
                if (structure.maturity < 1) {
                    structure.maturity = Math.min(1, structure.maturity + deltaTime / 30000); // 30 seconds to mature
                }
                
                // Mature gardens provide periodic benefits
                if (structure.maturity >= 1) {
                    const owner = this.world.entities.find(e => e.id === structure.ownerId);
                    if (owner && this.world.getDistance(owner, structure) < 100) {
                        // Passive happiness boost from nearby gardens
                        owner.vitals.increaseHappiness(deltaTime / 10000); // Small continuous boost
                    }
                }
            } else if (structure.type === 'statue') {
                // Statues provide happiness to their owner when nearby
                const owner = this.world.entities.find(e => e.id === structure.ownerId);
                if (owner && this.world.getDistance(owner, structure) < 80) {
                    owner.vitals.increaseHappiness(deltaTime / 15000); // Pride boost
                }
            }
        });
    }

    serialize() {
        return {
            structures: this.structures,
        };
    }

    deserialize(data) {
        if (!data) return;
        this.structures = data.structures || [];
    }
}