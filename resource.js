export class ResourceManager {
    constructor(world) {
        this.world = world;
        this.nodes = [];
        this.saplings = []; // For seeds/saplings that will grow into new nodes
        this.resourceTotals = { food: 0, wood: 0, stone: 0 };
    }

    generateResources(worldWidth, worldHeight) {
        this.nodes = [];
        this.saplings = [];
        
        // Generate different resource patterns
        this.generateFoodPatches(worldWidth, worldHeight);
        this.generateForestClusters(worldWidth, worldHeight);
        this.generateStoneVeins(worldWidth, worldHeight);
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
                this.updateTotalResources();
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
                this.updateTotalResources();
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
                this.updateTotalResources();
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
            regenerationRate: this.getRegenerationRate(type),
            isDepleted: false, // flag for removal
        };
        
        this.nodes.push(node);
        this.updateTotalResources();
    }

    getRegenerationRate(type) {
        // Different regeneration rates for different resources
        switch (type) {
            case 'food': return 0.15 + Math.random() * 0.1; // Grows back relatively quickly
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
        const types = ['food', 'wood', 'stone'];
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
        this.updateTotalResources();
    }

    gatherFrom(node) {
        if (node.amount > 0) {
            const gathered = Math.min(1, node.amount);
            node.amount -= gathered;
            
            if (node.amount <= 0) {
                node.isDepleted = true;
            }

            this.updateTotalResources();
            
            return {
                type: node.type,
                amount: Math.round(gathered * 10) / 10
            };
        }
        return null;
    }

    update(deltaTime) {
        // Regenerate stone resources over time
        this.nodes.forEach(node => {
            if (node.type === 'stone' && node.amount < node.maxAmount) {
                const newAmount = node.amount + node.regenerationRate * (deltaTime / 1000);
                node.amount = Math.min(node.maxAmount, newAmount);
            }
        });
        
        // Handle depleted nodes
        const depletedNodes = this.nodes.filter(n => n.isDepleted);
        depletedNodes.forEach(node => {
            this.handleNodeDepletion(node);
        });

        if (depletedNodes.length > 0) {
            this.nodes = this.nodes.filter(n => !n.isDepleted);
        }

        // Grow saplings
        this.updateSaplings(deltaTime);

        this.updateTotalResources();
    }
    
    handleNodeDepletion(node) {
        if (node.type !== 'food' && node.type !== 'wood') {
            return; // Only food and wood create saplings
        }

        const saplingCount = Math.floor(Math.random() * 4); // 0 to 3 saplings
        for (let i = 0; i < saplingCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 10 + Math.random() * 20; // 10 to 30 pixels away
            const x = node.x + Math.cos(angle) * distance;
            const y = node.y + Math.sin(angle) * distance;

            // Ensure sapling is within world bounds
            const clampedX = Math.max(20, Math.min(this.world.width - 20, x));
            const clampedY = Math.max(20, Math.min(this.world.height - 20, y));

            this.saplings.push({
                id: Math.random().toString(36).substring(2, 9),
                type: node.type,
                x: clampedX,
                y: clampedY,
                nextCheckTime: Date.now() + 45000, // First check after 45 seconds
                isFirstCheck: true
            });
        }
    }

    updateSaplings() {
        const now = Date.now();
        const grownSaplingIds = new Set();

        this.saplings.forEach(sapling => {
            if (now >= sapling.nextCheckTime) {
                if (Math.random() < 0.1) { // 10% chance to grow
                    grownSaplingIds.add(sapling.id);
                    this.createNode(sapling.type, sapling.x, sapling.y, 
                        3 + Math.floor(Math.random() * 4), // new node amount
                        5 + Math.floor(Math.random() * 3)  // new node max amount
                    );
                } else {
                    // Not grown, schedule next check
                    sapling.nextCheckTime += 5000; // try again in 5 seconds
                }
            }
        });
        
        if (grownSaplingIds.size > 0) {
            this.saplings = this.saplings.filter(s => !grownSaplingIds.has(s.id));
        }
    }

    updateTotalResources() {
        this.resourceTotals = { food: 0, wood: 0, stone: 0 };
        this.nodes.forEach(node => {
            if (this.resourceTotals[node.type] !== undefined) {
                this.resourceTotals[node.type] += node.amount;
            }
        });
    }

    getTotalResources() {
        return this.resourceTotals;
    }

    getNodes() {
        return this.nodes;
    }
    
    getSaplings() {
        return this.saplings;
    }

    reset() {
        this.nodes = [];
        this.saplings = [];
        this.resourceTotals = { food: 0, wood: 0, stone: 0 };
    }

    serialize() {
        return {
            nodes: this.nodes,
            saplings: this.saplings,
        };
    }

    deserialize(data) {
        this.nodes = data.nodes || [];
        this.saplings = data.saplings || [];
        this.updateTotalResources();
    }
}