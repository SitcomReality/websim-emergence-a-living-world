export class ResourceManager {
    constructor() {
        this.nodes = [];
        this.totalResources = 0;
    }

    generateResources(worldWidth, worldHeight) {
        this.nodes = [];
        
        // Generate different resource patterns
        this.generateWaterSources(worldWidth, worldHeight);
        this.generateFoodPatches(worldWidth, worldHeight);
        this.generateForestClusters(worldWidth, worldHeight);
        this.generateStoneVeins(worldWidth, worldHeight);
    }

    generateWaterSources(worldWidth, worldHeight) {
        // Create 2-3 water source centers (springs/lakes)
        const waterCenters = 2 + Math.floor(Math.random() * 2);
        
        for (let i = 0; i < waterCenters; i++) {
            const centerX = Math.random() * worldWidth;
            const centerY = Math.random() * worldHeight;
            
            // Create a cluster around each center
            const nodesInCluster = 3 + Math.floor(Math.random() * 4);
            for (let j = 0; j < nodesInCluster; j++) {
                const angle = (j / nodesInCluster) * Math.PI * 2 + Math.random() * 0.5;
                const distance = Math.random() * 80;
                const x = Math.max(20, Math.min(worldWidth - 20, centerX + Math.cos(angle) * distance));
                const y = Math.max(20, Math.min(worldHeight - 20, centerY + Math.sin(angle) * distance));
                
                this.createNode('water', x, y, 4 + Math.floor(Math.random() * 3), 6 + Math.floor(Math.random() * 4));
            }
        }
        
        // Create 1-2 rivers (lines of water nodes)
        const rivers = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < rivers; i++) {
            this.generateRiver(worldWidth, worldHeight);
        }
    }

    generateRiver(worldWidth, worldHeight) {
        const startX = Math.random() * worldWidth;
        const startY = Math.random() * worldHeight;
        const direction = Math.random() * Math.PI * 2;
        const length = 5 + Math.floor(Math.random() * 8);
        
        let currentX = startX;
        let currentY = startY;
        let currentDir = direction;
        
        for (let i = 0; i < length; i++) {
            // Add some meandering to the river
            currentDir += (Math.random() - 0.5) * 0.5;
            const stepSize = 40 + Math.random() * 30;
            
            currentX += Math.cos(currentDir) * stepSize;
            currentY += Math.sin(currentDir) * stepSize;
            
            if (currentX >= 20 && currentX <= worldWidth - 20 && 
                currentY >= 20 && currentY <= worldHeight - 20) {
                this.createNode('water', currentX, currentY, 2 + Math.floor(Math.random() * 2), 4 + Math.floor(Math.random() * 2));
            }
        }
    }

    generateFoodPatches(worldWidth, worldHeight) {
        // Create 3-5 agricultural patches
        const patches = 3 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < patches; i++) {
            const centerX = Math.random() * worldWidth;
            const centerY = Math.random() * worldHeight;
            const patchSize = 60 + Math.random() * 80;
            const nodesInPatch = 4 + Math.floor(Math.random() * 6);
            
            for (let j = 0; j < nodesInPatch; j++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * patchSize;
                const x = Math.max(20, Math.min(worldWidth - 20, centerX + Math.cos(angle) * distance));
                const y = Math.max(20, Math.min(worldHeight - 20, centerY + Math.sin(angle) * distance));
                
                this.createNode('food', x, y, 3 + Math.floor(Math.random() * 4), 5 + Math.floor(Math.random() * 3));
            }
        }
    }

    generateForestClusters(worldWidth, worldHeight) {
        // Create 2-4 forest areas
        const forests = 2 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < forests; i++) {
            const centerX = Math.random() * worldWidth;
            const centerY = Math.random() * worldHeight;
            const forestSize = 80 + Math.random() * 100;
            const density = 0.8 + Math.random() * 0.4; // Trees per unit area
            const treeCount = Math.floor(forestSize * density / 15);
            
            for (let j = 0; j < treeCount; j++) {
                // Use gaussian distribution for more natural clustering
                const angle = Math.random() * Math.PI * 2;
                const distance = this.gaussianRandom() * forestSize * 0.5;
                const x = Math.max(20, Math.min(worldWidth - 20, centerX + Math.cos(angle) * distance));
                const y = Math.max(20, Math.min(worldHeight - 20, centerY + Math.sin(angle) * distance));
                
                this.createNode('wood', x, y, 2 + Math.floor(Math.random() * 3), 4 + Math.floor(Math.random() * 2));
            }
        }
    }

    generateStoneVeins(worldWidth, worldHeight) {
        // Create 2-3 mineral veins/quarries
        const veins = 2 + Math.floor(Math.random() * 2);
        
        for (let i = 0; i < veins; i++) {
            const startX = Math.random() * worldWidth;
            const startY = Math.random() * worldHeight;
            const veinDirection = Math.random() * Math.PI * 2;
            const veinLength = 100 + Math.random() * 150;
            const nodesInVein = 4 + Math.floor(Math.random() * 5);
            
            for (let j = 0; j < nodesInVein; j++) {
                // Create nodes along the vein with some scatter
                const progress = j / (nodesInVein - 1);
                const distanceAlongVein = progress * veinLength;
                const scatterDistance = Math.random() * 40 - 20;
                
                const x = Math.max(20, Math.min(worldWidth - 20, 
                    startX + Math.cos(veinDirection) * distanceAlongVein + 
                    Math.cos(veinDirection + Math.PI/2) * scatterDistance));
                const y = Math.max(20, Math.min(worldHeight - 20, 
                    startY + Math.sin(veinDirection) * distanceAlongVein + 
                    Math.sin(veinDirection + Math.PI/2) * scatterDistance));
                
                this.createNode('stone', x, y, 3 + Math.floor(Math.random() * 4), 5 + Math.floor(Math.random() * 3));
            }
        }
    }

    createNode(type, x, y, amount, maxAmount) {
        const node = {
            id: Math.random().toString(36).substring(2, 9),
            type: type,
            x: x,
            y: y,
            amount: amount,
            maxAmount: maxAmount,
            regenerationRate: this.getRegenerationRate(type)
        };
        
        this.nodes.push(node);
        this.updateTotalResources();
    }

    getRegenerationRate(type) {
        // Different regeneration rates for different resources
        switch (type) {
            case 'food': return 0.15 + Math.random() * 0.1; // Grows back relatively quickly
            case 'water': return 0.2 + Math.random() * 0.1; // Replenishes fastest
            case 'wood': return 0.05 + Math.random() * 0.05; // Slower regeneration
            case 'stone': return 0.02 + Math.random() * 0.03; // Slowest regeneration
            default: return 0.1 + Math.random() * 0.2;
        }
    }

    gaussianRandom() {
        // Box-Muller transform for gaussian distribution
        const u1 = Math.random();
        const u2 = Math.random();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }

    addRandomNode(worldWidth = 800, worldHeight = 600) {
        // When adding random nodes (from explorer discoveries), use appropriate patterns
        const types = ['food', 'wood', 'stone', 'water'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        // Find existing nodes of the same type to cluster near them
        const sameTypeNodes = this.nodes.filter(node => node.type === type);
        
        let x, y;
        if (sameTypeNodes.length > 0 && Math.random() < 0.7) {
            // 70% chance to spawn near existing nodes of the same type
            const nearbyNode = sameTypeNodes[Math.floor(Math.random() * sameTypeNodes.length)];
            const angle = Math.random() * Math.PI * 2;
            const distance = 30 + Math.random() * 60;
            x = Math.max(20, Math.min(worldWidth - 20, nearbyNode.x + Math.cos(angle) * distance));
            y = Math.max(20, Math.min(worldHeight - 20, nearbyNode.y + Math.sin(angle) * distance));
        } else {
            // 30% chance to spawn in a completely new location
            x = Math.random() * (worldWidth - 40) + 20;
            y = Math.random() * (worldHeight - 40) + 20;
        }
        
        this.createNode(type, x, y, 
            Math.floor(Math.random() * 5) + 3, 
            Math.floor(Math.random() * 5) + 5);
    }

    gatherFrom(node) {
        if (node.amount > 0) {
            const gathered = Math.min(1, node.amount);
            node.amount -= gathered;
            this.updateTotalResources();
            
            return {
                type: node.type,
                amount: Math.round(gathered * 10) / 10
            };
        }
        return null;
    }

    update(deltaTime) {
        // Regenerate resources over time
        this.nodes.forEach(node => {
            if (node.amount < node.maxAmount) {
                const newAmount = node.amount + node.regenerationRate * (deltaTime / 1000);
                node.amount = Math.min(node.maxAmount, newAmount);
                node.amount = Math.round(node.amount * 10) / 10;
            }
        });
        
        this.updateTotalResources();
    }

    updateTotalResources() {
        this.totalResources = this.nodes.reduce((sum, node) => sum + node.amount, 0);
    }

    getTotalResources() {
        return this.totalResources;
    }

    getNodes() {
        return this.nodes;
    }

    reset() {
        this.nodes = [];
        this.totalResources = 0;
    }
}