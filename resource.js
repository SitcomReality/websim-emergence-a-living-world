export class ResourceManager {
    constructor() {
        this.nodes = [];
        this.totalResources = 0;
    }

    generateResources(worldWidth, worldHeight) {
        this.nodes = [];
        const nodeCount = 15 + Math.floor(Math.random() * 10);
        
        for (let i = 0; i < nodeCount; i++) {
            this.addRandomNode(worldWidth, worldHeight);
        }
    }

    addRandomNode(worldWidth = 800, worldHeight = 600) {
        const types = ['food', 'wood', 'stone', 'water'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        const node = {
            id: Math.random().toString(36).substring(2, 9),
            type: type,
            x: Math.random() * (worldWidth - 40) + 20,
            y: Math.random() * (worldHeight - 40) + 20,
            amount: Math.floor(Math.random() * 5) + 3,
            maxAmount: Math.floor(Math.random() * 5) + 5,
            regenerationRate: 0.1 + Math.random() * 0.2
        };
        
        this.nodes.push(node);
        this.updateTotalResources();
    }

    gatherFrom(node) {
        if (node.amount > 0) {
            const gathered = Math.min(1, node.amount);
            node.amount -= gathered;
            this.updateTotalResources();
            
            return {
                type: node.type,
                amount: gathered
            };
        }
        return null;
    }

    update(deltaTime) {
        // Regenerate resources over time
        this.nodes.forEach(node => {
            if (node.amount < node.maxAmount) {
                node.amount = Math.min(node.maxAmount, 
                    node.amount + node.regenerationRate * (deltaTime / 1000));
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

