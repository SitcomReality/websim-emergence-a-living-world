export class Vitals {
    constructor(energy = 100, happiness = 50, age = 0) {
        this.energy = energy;
        this.happiness = happiness;
        this.age = age;
    }

    update(deltaTime) {
        this.age += deltaTime / 1000;
        this.energy = Math.max(0, this.energy - (deltaTime / 1000) * 0.1);
        this.happiness = Math.max(0, this.happiness - (deltaTime / 1000) * 0.05);
    }

    increaseEnergy(amount) {
        this.energy = Math.min(100, this.energy + amount);
    }

    increaseHappiness(amount) {
        this.happiness = Math.min(100, this.happiness + amount);
    }

    serialize() {
        return {
            energy: this.energy,
            happiness: this.happiness,
            age: this.age
        };
    }

    deserialize(data) {
        this.energy = data.energy;
        this.happiness = data.happiness;
        this.age = data.age;
    }
}

