export class Role {
    constructor(name, description, primarySkill, needs, actions) {
        this.name = name;
        this.description = description;
        this.primarySkill = primarySkill;
        this.needs = needs;
        this.actions = actions;
    }

    static assignRandomRole() {
        const roles = [
            new Role(
                "Farmer",
                "Produces food for the community",
                "agriculture",
                ["water", "stone"],
                ["plantCrops", "harvest", "tendAnimals"]
            ),
            new Role(
                "Trader",
                "Facilitates exchange of goods",
                "commerce",
                ["food", "water"],
                ["seekTrades", "transport", "negotiate"]
            ),
            new Role(
                "Crafter",
                "Converts raw materials into useful items",
                "crafting",
                ["wood", "stone"],
                ["craft", "repair", "innovate"]
            ),
            new Role(
                "Explorer",
                "Discovers new resources and opportunities",
                "exploration",
                ["food", "water"],
                ["scout", "map", "discover"]
            )
        ];
        
        return roles[Math.floor(Math.random() * roles.length)];
    }

    performAction(entity) {
        const actionName = this.actions[Math.floor(Math.random() * this.actions.length)];
        
        switch (actionName) {
            case "plantCrops":
                this.plantCrops(entity);
                break;
            case "harvest":
                this.harvest(entity);
                break;
            case "seekTrades":
                this.seekTrades(entity);
                break;
            case "craft":
                this.craft(entity);
                break;
            case "scout":
                this.scout(entity);
                break;
            default:
                // Generic action
                entity.energy = Math.min(100, entity.energy + 10);
                break;
        }
    }

    plantCrops(entity) {
        if (entity.resources.water >= 1) {
            entity.giveResource("water", 1);
            entity.resources.food += 2;
            entity.world.eventSystem.addEvent(`${entity.getName()} planted crops`);
        }
    }

    harvest(entity) {
        if (Math.random() < 0.7) {
            entity.resources.food += 1;
            entity.world.eventSystem.addEvent(`${entity.getName()} harvested food`);
        }
    }

    seekTrades(entity) {
        // Trader actively seeks out other entities for trades
        const nearbyEntity = entity.findNearbyEntity();
        if (nearbyEntity && entity.world.canTrade(entity, nearbyEntity)) {
            entity.world.executeTrade(entity, nearbyEntity);
        }
    }

    craft(entity) {
        if (entity.resources.wood >= 1 && entity.resources.stone >= 1) {
            entity.giveResource("wood", 1);
            entity.giveResource("stone", 1);
            // Create a valuable crafted item (represented as bonus resources)
            entity.resources.food += 1;
            entity.world.eventSystem.addEvent(`${entity.getName()} crafted something useful`);
        }
    }

    scout(entity) {
        // Explorer discovers new resource nodes
        if (Math.random() < 0.3) {
            entity.world.resourceManager.addRandomNode();
            entity.world.eventSystem.addEvent(`${entity.getName()} discovered new resources!`);
        }
    }

    getNeeds(entity) {
        return this.needs.filter(need => entity.resources[need] < 3);
    }
}

