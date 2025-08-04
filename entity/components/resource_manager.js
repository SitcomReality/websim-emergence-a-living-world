// New file
export class ResourceManager {
    constructor(entity) {
        this.entity = entity;
        this.resources = {};
    }

    initializeResources() {
        this.resources = {
            food: Math.floor(Math.random() * 5) + 2,
            wood: Math.floor(Math.random() * 3) + 1,
            stone: Math.floor(Math.random() * 3) + 1,
            cooked_food: 0,
            planks: 0,
            bricks: 0,
        };
        for (const resource in this.resources) {
            this.resources[resource] = Math.round(this.resources[resource] * 10) / 10;
        }
    }

    getNeeds() {
        const needs = [];
        const res = this.getResources(); // Use combined resources for needs assessment
        if (res.food < 3) needs.push('food');
        
        if (!this.entity.home) {
            if (!this.entity.storageShed) {
                 if (this.entity.getCarriedResourceAmount('wood') + res.wood < 1) needs.push('wood');
            } else {
                const needed = this.entity.storageShed.getNeededResourcesFor('home');
                if (needed.length > 0) needs.push(...needed);
            }
        } else {
            if (res.wood < 2) needs.push('wood');
            if (res.stone < 2) needs.push('stone');
        }

        return [...new Set(needs)];
    }

    getResources() {
        const total = { ...this.resources };
        const depositPoint = this.entity.getDepositPoint();
        if (depositPoint && depositPoint.inventory) {
            for(const type in depositPoint.inventory) {
                total[type] = (total[type] || 0) + depositPoint.inventory[type];
            }
        }
        const allTypes = ['food', 'wood', 'stone', 'cooked_food', 'planks', 'bricks'];
        allTypes.forEach(type => {
            if (!total.hasOwnProperty(type)) {
                total[type] = 0;
            }
        });
        return total;
    }

    useResource(type, amount) {
        const carried = this.entity.inventory.getAmount(type);
        if (carried >= amount) {
            this.entity.inventory.use(type, amount);
            return;
        }

        let remainingNeeded = amount;
        if (carried > 0) {
            remainingNeeded -= carried;
            this.entity.inventory.use(type, carried);
        }

        if (this.resources[type] && this.resources[type] >= remainingNeeded) {
            this.resources[type] = Math.max(0, this.resources[type] - remainingNeeded);
        }
    }
    
    useResourceFromHome(type, amount) {
        const resources = this.getResources();
        if (resources[type] >= amount) {
            const depositPoint = this.entity.getDepositPoint();
            if (depositPoint && depositPoint.inventory[type] >= amount) {
                depositPoint.inventory[type] -= amount;
                return true;
            } else if (this.resources[type] >= amount) {
                this.resources[type] -= amount;
                return true;
            }
        }
        return false;
    }

    giveResource(type, amount) {
        const depositPoint = this.entity.getDepositPoint();
        if (depositPoint && depositPoint.inventory[type] >= amount) {
            depositPoint.inventory[type] -= amount;
        } else if (this.resources[type] >= amount) {
             this.resources[type] -= amount;
        }
    }

    receiveResource(type, amount) {
        this.entity.tradeInventory.add({ type, amount });
    }

    depositTradeInventory() {
        const depositPoint = this.entity.getDepositPoint();
        if (!depositPoint || this.entity.tradeInventory.items.length === 0) {
            this.entity.task.idle();
            return;
        }

        this.entity.tradeInventory.items.forEach(item => {
            depositPoint.inventory[item.type] = (depositPoint.inventory[item.type] || 0) + item.amount;
        });

        this.entity.world.eventSystem.addEvent(`${this.entity.name} stored away goods from a trade.`);
        this.entity.tradeInventory.clear();
        this.entity.task.idle();
    }

    serialize() {
        return {
            resources: this.resources,
        };
    }

    deserialize(data) {
        if (!data) return;
        this.resources = data.resources || {};
        // Ensure all resource types exist for backward compatibility
        const allTypes = ['food', 'wood', 'stone', 'cooked_food', 'planks', 'bricks'];
        allTypes.forEach(type => {
            if (!this.resources.hasOwnProperty(type)) {
                this.resources[type] = 0;
            }
        });
    }
}
