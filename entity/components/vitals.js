export class Vitals {
    constructor(energy = 100, happiness = 50, age = 0) {
        this.energy = energy;
        this.happiness = happiness;
        this.age = age;
        this.lifespan = 480 + Math.random() * 240; // Lives for 8-12 minutes
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
            age: this.age,
            lifespan: this.lifespan
        };
    }

    deserialize(data) {
        this.energy = data.energy;
        this.happiness = data.happiness;
        this.age = data.age;
        this.lifespan = data.lifespan || 600;
    }
}