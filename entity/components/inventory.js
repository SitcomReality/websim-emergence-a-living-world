export class Inventory {
    constructor(capacity = 2) {
        this.items = [];
        this.capacity = capacity;
    }

    isFull() {
        let carriedAmount = 0;
        this.items.forEach(item => carriedAmount += item.amount);
        return carriedAmount >= this.capacity;
    }

    getAmount(type) {
        const item = this.items.find(i => i.type === type);
        return item ? item.amount : 0;
    }

    add(item) {
        const existingItem = this.items.find(i => i.type === item.type);
        if (existingItem) {
            existingItem.amount += item.amount;
            existingItem.amount = Math.round(existingItem.amount * 10) / 10;
        } else {
            this.items.push(item);
        }
    }

    use(type, amount) {
        const item = this.items.find(i => i.type === type);
        if (item) {
            item.amount -= amount;
            if (item.amount <= 0.01) { // Use a small epsilon for float comparison
                this.items = this.items.filter(i => i.type !== type);
            }
            return true;
        }
        return false;
    }

    clear() {
        this.items = [];
    }

    serialize() {
        return {
            items: this.items,
            capacity: this.capacity
        };
    }

    deserialize(data) {
        this.items = data.items || [];
        this.capacity = data.capacity || 2;
    }
}