export class Memory {
    constructor(entity) {
        this.entity = entity;
        
        // Resource location memory - tracks success rates at different locations
        this.resourceLocations = new Map(); // nodeId -> { location: {x,y}, type: string, successRate: number, attempts: number, lastVisited: timestamp }
        
        // Strategy memory - tracks success of different approaches
        this.strategies = {
            gatheringPatterns: new Map(), // resourceType -> { strategy: string, successRate: number, attempts: number }
            socialApproaches: new Map(), // entityId -> { approach: string, successRate: number, attempts: number }
            tradePreferences: new Map(), // resourceType -> preference score
        };
        
        // Social memory - detailed relationship history
        this.socialHistory = new Map(); // entityId -> { interactions: [], knownSkills: {}, trustLevel: number }
        
        // Learning parameters
        this.learningRate = 0.1 + Math.random() * 0.1; // How quickly they adapt (0.1-0.2)
        this.memoryDecay = 0.99; // How memories fade over time
        this.maxMemories = 50; // Maximum number of locations to remember
    }

    // Resource location learning
    rememberResourceLocation(node, success) {
        const existing = this.resourceLocations.get(node.id);
        
        if (existing) {
            existing.attempts++;
            const successRate = success ? 1 : 0;
            existing.successRate = existing.successRate * (1 - this.learningRate) + successRate * this.learningRate;
            existing.lastVisited = Date.now();
        } else {
            // Limit memory size
            if (this.resourceLocations.size >= this.maxMemories) {
                this.forgetOldestResourceLocation();
            }
            
            this.resourceLocations.set(node.id, {
                location: { x: node.x, y: node.y },
                type: node.type,
                successRate: success ? 0.8 : 0.2, // Start with reasonable assumptions
                attempts: 1,
                lastVisited: Date.now()
            });
        }
    }

    forgetOldestResourceLocation() {
        let oldest = null;
        let oldestTime = Infinity;
        
        for (const [nodeId, memory] of this.resourceLocations.entries()) {
            if (memory.lastVisited < oldestTime) {
                oldestTime = memory.lastVisited;
                oldest = nodeId;
            }
        }
        
        if (oldest) {
            this.resourceLocations.delete(oldest);
        }
    }

    // Get the best known locations for a resource type
    getBestKnownLocations(resourceType, limit = 3) {
        const locations = Array.from(this.resourceLocations.values())
            .filter(memory => memory.type === resourceType)
            .sort((a, b) => {
                // Sort by success rate, but also consider recency
                const recencyA = Math.max(0, 1 - (Date.now() - a.lastVisited) / 300000); // 5 minute decay
                const recencyB = Math.max(0, 1 - (Date.now() - b.lastVisited) / 300000);
                const scoreA = a.successRate * 0.7 + recencyA * 0.3;
                const scoreB = b.successRate * 0.7 + recencyB * 0.3;
                return scoreB - scoreA;
            })
            .slice(0, limit);
            
        return locations;
    }

    // Social learning - remember what we learn from others
    learnFromEntity(otherEntity, skillName, success) {
        const socialHistory = this.socialHistory.get(otherEntity.id) || {
            interactions: [],
            knownSkills: {},
            trustLevel: 0.5
        };
        
        // Update trust based on teaching success
        if (success) {
            socialHistory.trustLevel = Math.min(1, socialHistory.trustLevel + 0.1);
        } else {
            socialHistory.trustLevel = Math.max(0, socialHistory.trustLevel - 0.05);
        }
        
        // Remember their skill level
        socialHistory.knownSkills[skillName] = otherEntity.personality.getSkill(skillName);
        
        // Log the interaction
        socialHistory.interactions.push({
            type: 'learning',
            skill: skillName,
            success: success,
            timestamp: Date.now()
        });
        
        // Keep only recent interactions
        if (socialHistory.interactions.length > 10) {
            socialHistory.interactions = socialHistory.interactions.slice(-10);
        }
        
        this.socialHistory.set(otherEntity.id, socialHistory);
    }

    // Find the best teacher for a specific skill
    findBestTeacher(entities, skillName) {
        let bestTeacher = null;
        let bestScore = 0;
        
        for (const entity of entities) {
            if (entity.id === this.entity.id) continue;
            
            const socialHistory = this.socialHistory.get(entity.id);
            const theirSkill = entity.personality.getSkill(skillName);
            const mySkill = this.entity.personality.getSkill(skillName);
            
            if (theirSkill <= mySkill + 0.2) continue; // They need to be significantly better
            
            let score = theirSkill - mySkill; // Base score on skill difference
            
            if (socialHistory) {
                score *= socialHistory.trustLevel; // Modify by trust
                
                // Bonus for past successful teaching
                const teachingSuccesses = socialHistory.interactions
                    .filter(i => i.type === 'learning' && i.success)
                    .length;
                score += teachingSuccesses * 0.1;
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestTeacher = entity;
            }
        }
        
        return bestTeacher;
    }

    // Strategy learning - remember what approaches work
    updateStrategy(category, strategyName, success) {
        if (!this.strategies[category]) {
            this.strategies[category] = new Map();
        }
        
        const existing = this.strategies[category].get(strategyName);
        
        if (existing) {
            existing.attempts++;
            const successRate = success ? 1 : 0;
            existing.successRate = existing.successRate * (1 - this.learningRate) + successRate * this.learningRate;
        } else {
            this.strategies[category].set(strategyName, {
                successRate: success ? 0.7 : 0.3,
                attempts: 1
            });
        }
    }

    getBestStrategy(category) {
        if (!this.strategies[category]) return null;
        
        let best = null;
        let bestScore = 0;
        
        for (const [strategyName, data] of this.strategies[category].entries()) {
            if (data.attempts >= 2 && data.successRate > bestScore) {
                bestScore = data.successRate;
                best = strategyName;
            }
        }
        
        return best;
    }

    // Decay memories over time
    update(deltaTime) {
        // Decay resource location memories
        for (const memory of this.resourceLocations.values()) {
            memory.successRate *= this.memoryDecay;
        }
        
        // Decay strategy memories
        for (const categoryMap of Object.values(this.strategies)) {
            if (categoryMap instanceof Map) {
                for (const data of categoryMap.values()) {
                    // Check if the strategy data is an object with successRate, not just a number
                    if (typeof data === 'object' && data !== null && 'successRate' in data) {
                        data.successRate *= this.memoryDecay;
                    }
                }
            }
        }
    }

    serialize() {
        return {
            resourceLocations: Array.from(this.resourceLocations.entries()),
            strategies: {
                gatheringPatterns: Array.from(this.strategies.gatheringPatterns.entries()),
                socialApproaches: Array.from(this.strategies.socialApproaches.entries()),
                tradePreferences: Array.from(this.strategies.tradePreferences.entries()),
            },
            socialHistory: Array.from(this.socialHistory.entries()),
            learningRate: this.learningRate,
        };
    }

    deserialize(data) {
        if (!data) return;
        
        this.resourceLocations = new Map(data.resourceLocations || []);
        this.socialHistory = new Map(data.socialHistory || []);
        this.learningRate = data.learningRate || (0.1 + Math.random() * 0.1);
        
        if (data.strategies) {
            this.strategies.gatheringPatterns = new Map(data.strategies.gatheringPatterns || []);
            this.strategies.socialApproaches = new Map(data.strategies.socialApproaches || []);
            this.strategies.tradePreferences = new Map(data.strategies.tradePreferences || []);
        }
    }
}