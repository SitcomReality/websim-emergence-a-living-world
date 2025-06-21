export class Personality {
    constructor() {
        this.traits = {
            curiosity: Math.random(),
            sociability: Math.random(),
            productivity: Math.random(),
            aggression: Math.random(),
            cooperation: Math.random(),
            risktaking: Math.random()
        };
        
        // Ensure some balance - highly aggressive entities are less cooperative
        if (this.traits.aggression > 0.7) {
            this.traits.cooperation *= 0.5;
        }
        
        // Highly social entities are more cooperative
        if (this.traits.sociability > 0.7) {
            this.traits.cooperation = Math.min(1, this.traits.cooperation + 0.3);
        }
    }

    getDescription() {
        const descriptions = [];
        
        if (this.traits.curiosity > 0.7) descriptions.push("curious");
        if (this.traits.sociability > 0.7) descriptions.push("social");
        if (this.traits.productivity > 0.7) descriptions.push("hardworking");
        if (this.traits.aggression > 0.7) descriptions.push("aggressive");
        if (this.traits.cooperation > 0.7) descriptions.push("cooperative");
        if (this.traits.risktaking > 0.7) descriptions.push("adventurous");
        
        if (descriptions.length === 0) {
            descriptions.push("balanced");
        }
        
        return descriptions.join(", ");
    }

    makeDecision(options) {
        // Simple decision making based on personality
        // This can be expanded with more complex logic
        const weights = options.map(option => {
            let weight = 1;
            
            if (option.type === 'social' && this.traits.sociability > 0.5) weight *= 2;
            if (option.type === 'risky' && this.traits.risktaking > 0.5) weight *= 1.5;
            if (option.type === 'aggressive' && this.traits.aggression > 0.5) weight *= 1.8;
            if (option.type === 'cooperative' && this.traits.cooperation > 0.5) weight *= 1.6;
            
            return weight;
        });
        
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < options.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return options[i];
            }
        }
        
        return options[0];
    }
}

