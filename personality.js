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
        
        // Generate skills - each skill ranges from 0.5 (poor) to 2.0 (excellent)
        this.skills = {
            wood_harvesting: 0.5 + Math.random() * 1.5,
            wood_processing: 0.5 + Math.random() * 1.5,
            stone_harvesting: 0.5 + Math.random() * 1.5,
            stone_processing: 0.5 + Math.random() * 1.5,
            food_harvesting: 0.5 + Math.random() * 1.5,
            food_processing: 0.5 + Math.random() * 1.5
        };
        
        // Round skills to 2 decimal places for cleaner display
        for (const skill in this.skills) {
            this.skills[skill] = Math.round(this.skills[skill] * 100) / 100;
        }
        
        // Ensure some balance - highly aggressive entities are less cooperative
        if (this.traits.aggression > 0.7) {
            this.traits.cooperation *= 0.5;
        }
        
        // Highly social entities are more cooperative
        if (this.traits.sociability > 0.7) {
            this.traits.cooperation = Math.min(1, this.traits.cooperation + 0.3);
        }
    }

    getSkill(skillName) {
        return this.skills[skillName] || 1.0;
    }

    getBestSkills(count = 2) {
        // Return the top skills for this entity
        const skillEntries = Object.entries(this.skills);
        skillEntries.sort((a, b) => b[1] - a[1]);
        return skillEntries.slice(0, count);
    }

    getDescription() {
        const descriptions = [];
        
        if (this.traits.curiosity > 0.7) descriptions.push("curious");
        else if (this.traits.curiosity < 0.3) descriptions.push("cautious");
        if (this.traits.sociability > 0.7) descriptions.push("social");
        else if (this.traits.sociability < 0.3) descriptions.push("solitary");
        if (this.traits.productivity > 0.7) descriptions.push("hardworking");
        else if (this.traits.productivity < 0.3) descriptions.push("lazy");
        if (this.traits.aggression > 0.7) descriptions.push("aggressive");
        if (this.traits.cooperation > 0.7) descriptions.push("cooperative");
        if (this.traits.risktaking > 0.7) descriptions.push("adventurous");
        
        // Add skill specializations
        const bestSkills = this.getBestSkills(1);
        if (bestSkills.length > 0 && bestSkills[0][1] > 1.5) {
            const skillName = bestSkills[0][0].replace('_', ' ');
            descriptions.push(`skilled at ${skillName}`);
        }
        
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