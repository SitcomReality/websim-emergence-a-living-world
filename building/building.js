import { BUILDING_SPECS } from './building_specs.js';

export class Building {
    constructor(ownerId, x, y, type = 'home', world) {
        this.id = `building_${Math.random().toString(36).substring(2, 9)}`;
        this.ownerId = ownerId;
        this.x = x;
        this.y = y;
        this.type = type;
        this.level = 1;
        this.rotation = 0; // New property for rotation
        
        // Properties for all buildings
        this.inventory = { food: 0, wood: 0, stone: 0, cooked_food: 0, planks: 0, bricks: 0 };

        // Properties for construction
        this.constructionProgress = 0;
        this.constructionTotal = 0;
        this.requiredResources = {};

        if (type.endsWith('_construction_site')) {
            const baseType = type.replace('_construction_site', '');
            const specs = BUILDING_SPECS[baseType];
            if (specs) {
                this.constructionTotal = specs.constructionTotal;
                this.requiredResources = { ...specs.construction };
            }
        }

        if (type === 'home') {
            this.width = 24;
            this.height = 24;
        } else if (type === 'storage') {
            this.width = 18;
            this.height = 18;
        } else if (type === 'home_construction_site') {
            this.width = 28;
            this.height = 28;
            const owner = world.entities.find(e => e.id === ownerId);
            if(owner) {
                this.rotation = owner.settlementRotation || 0;
            }
        }
    }

    hasSufficientResourcesFor(targetBuildingType) {
        const needed = BUILDING_SPECS[targetBuildingType].construction;
        for(const resource in needed) {
            if ((this.inventory[resource] || 0) < needed[resource]) {
                return false;
            }
        }
        return true;
    }

    getNeededResourcesFor(targetBuildingType) {
        const needed = BUILDING_SPECS[targetBuildingType].construction;
        const missing = [];
        for(const resource in needed) {
            if ((this.inventory[resource] || 0) < needed[resource]) {
                missing.push(resource);
            }
        }
        return missing;
    }

    consumeResourcesFor(targetBuildingType) {
        const needed = BUILDING_SPECS[targetBuildingType].construction;
        for(const resource in needed) {
            this.inventory[resource] -= needed[resource];
        }
    }
}