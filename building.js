const BUILDING_SPECS = {
    home: {
        construction: {
            wood: 10,
            stone: 5,
        },
        constructionTotal: 100, // total "work" units to build
    },
    storage: {
        construction: {
            wood: 1
        },
        constructionTotal: 10,
    }
};

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
        this.inventory = { food: 0, water: 0, wood: 0, stone: 0 };

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

export class BuildingManager {
    constructor(world) {
        this.world = world;
        this.buildings = [];
    }

    createHomeForEntity(entity, x, y) {
        const home = new Building(entity.id, x, y, 'home', this.world);
        home.rotation = entity.settlementRotation || 0;
        this.buildings.push(home);
        // Transfer resources from owner's personal supply to new home
        home.inventory = { ...entity.resources };
        entity.resources = { food: 0, water: 0, wood: 0, stone: 0 };
        return home;
    }

    createStorageShed(ownerId, x, y) {
        const shed = new Building(ownerId, x, y + 15, 'storage', this.world); // Place slightly below home plot
        const owner = this.world.entities.find(e => e.id === ownerId);
        if (owner) {
            shed.rotation = owner.settlementRotation || 0;
        }
        this.buildings.push(shed);
        return shed;
    }

    startHomeConstruction(entity, x, y) {
        const site = new Building(entity.id, x, y, 'home_construction_site', this.world);
        
        // Check if resources are in the shed and consume them
        if (entity.storageShed && entity.storageShed.hasSufficientResourcesFor('home')) {
            entity.storageShed.consumeResourcesFor('home');
            this.buildings.push(site);
            this.world.eventSystem.addEvent(`${entity.getName()} has started construction on a new home!`);
            return site;
        }
        return null;
    }

    advanceConstruction(site, amount) {
        site.constructionProgress += amount;
        if (site.constructionProgress >= site.constructionTotal) {
            return this.finishConstruction(site);
        }
        return null; // Not finished
    }
    
    finishConstruction(site) {
        const owner = this.world.entities.find(e => e.id === site.ownerId);
        if (!owner) { // Owner might have died
            this.buildings = this.buildings.filter(b => b.id !== site.id); // remove site
            return null;
        }

        const newHome = this.createHomeForEntity(owner, site.x, site.y);
        
        // If there was a storage shed, move its inventory to the new home
        if (owner.storageShed) {
            for (const type in owner.storageShed.inventory) {
                newHome.inventory[type] = (newHome.inventory[type] || 0) + owner.storageShed.inventory[type];
            }
            // Remove the old shed
            this.buildings = this.buildings.filter(b => b.id !== owner.storageShed.id);
            owner.storageShed = null;
            owner.storageShedId = null; // Clear the saved ID too
        }

        // Remove the construction site
        this.buildings = this.buildings.filter(b => b.id !== site.id);
        
        return newHome;
    }

    findBestBuildLocation(entity) {
        const gridSize = 50;
        let bestSpot = null;
        let maxScore = -Infinity;

        const allHomes = this.world.getEntities()
            .filter(e => e.id !== entity.id && e.homeLocation)
            .map(e => ({ x: e.homeLocation.x, y: e.homeLocation.y, rotation: e.settlementRotation }));

        // Pioneer logic: high risktaking entities might start a new settlement
        const isPioneer = allHomes.length < 2 || (entity.personality.traits.risktaking > 0.7 && Math.random() < 0.35);
        let settlementToJoin = null;

        if (!isPioneer && allHomes.length > 0) {
            // Find the closest existing settlement to join.
            // A simple approach: find the closest home and consider its settlement.
            let minDistance = Infinity;
            for (const home of allHomes) {
                const dist = this.world.getDistance(entity, home);
                if (dist < minDistance) {
                    minDistance = dist;
                    settlementToJoin = home;
                }
            }
        }
        
        if (isPioneer) {
            entity.settlementRotation = Math.random() * Math.PI * 2;
        } else if (settlementToJoin) {
            entity.settlementRotation = settlementToJoin.rotation;
        } else {
            entity.settlementRotation = 0; // Default if no homes exist yet.
        }

        for (let x = gridSize; x < this.world.width - gridSize; x += gridSize) {
            for (let y = gridSize; y < this.world.height - gridSize; y += gridSize) {
                let score = 0;
                // Avoid building on top of existing buildings
                if (this.getBuildingAt(x, y, 30)) continue;

                // Avoid building on a spot another entity has already claimed
                const isClaimed = allHomes.some(spot => {
                    const dx = spot.x - x;
                    const dy = spot.y - y;
                    return (dx * dx + dy * dy) < (gridSize * gridSize * 0.8); // check within grid cell
                });
                if (isClaimed) continue;

                // Score based on proximity to resources
                const waterNode = this.world.resourceManager.getNodes().find(n => n.type === 'water');
                const foodNode = this.world.resourceManager.getNodes().find(n => n.type === 'food');
                if (waterNode) score += 5000 / this.world.getDistance({x,y}, waterNode);
                if (foodNode) score += 5000 / this.world.getDistance({x,y}, foodNode);
                
                // Score based on distance to settlements (pioneer vs settler)
                if (allHomes.length > 0) {
                    let minDistanceToHome = Infinity;
                    allHomes.forEach(home => {
                        const dist = this.world.getDistance({x, y}, home);
                        if (dist < minDistanceToHome) {
                            minDistanceToHome = dist;
                        }
                    });

                    if (isPioneer) {
                        // Reward being far from existing settlements, but not infinitely far
                        score += Math.min(minDistanceToHome, 400); 
                    } else {
                        // Reward being close to existing settlements
                        score -= minDistanceToHome * 0.5;
                    }
                }

                // Add some random fuzz
                score += Math.random() * 50;

                if (score > maxScore) {
                    maxScore = score;
                    bestSpot = { x, y };
                }
            }
        }
        
        if (bestSpot) {
            // Add random offset to break the grid pattern
            const offsetRange = gridSize / 3;
            bestSpot.x += (Math.random() - 0.5) * offsetRange;
            bestSpot.y += (Math.random() - 0.5) * offsetRange;
        }

        return bestSpot;
    }

    getBuildingAt(x, y, range = 10) {
        return this.buildings.find(b => {
            const dx = b.x - x;
            const dy = b.y - y;
            return Math.sqrt(dx*dx + dy*dy) < range;
        });
    }

    getBuildingById(id) {
        return this.buildings.find(b => b.id === id);
    }

    getBuildings() {
        return this.buildings;
    }

    reset() {
        this.buildings = [];
    }

    serialize() {
        return {
            buildings: this.buildings.map(b => ({ ...b })) // Simple properties can be shallow copied
        };
    }

    deserialize(data, world) {
        this.world = world;
        this.buildings = [];
        if (data && data.buildings) {
            this.buildings = data.buildings.map(buildingData => {
                const building = new Building(buildingData.ownerId, buildingData.x, buildingData.y, buildingData.type, this.world);
                Object.assign(building, buildingData);
                return building;
            });
        }
    }
}