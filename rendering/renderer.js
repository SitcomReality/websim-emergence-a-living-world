export class Renderer {
    constructor(canvas, world) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.world = world;
        this.images = {};
        this.assetsLoaded = false;
        
        this.canvas.width = world.width;
        this.canvas.height = world.height;
    }

    async loadAssets() {
        const imageList = [
            'creature_sprite.png',
            'farmer_sprite.png',
            'trader_sprite.png',
            'crafter_sprite.png',
            'explorer_sprite.png'
        ];
        
        const promises = imageList.map(src => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.src = `/${src}`;
                img.onload = () => {
                    this.images[src] = img;
                    resolve();
                };
                img.onerror = reject;
            });
        });
        
        await Promise.all(promises);
        this.assetsLoaded = true;
    }

    render(selectedEntity, selectedBuilding, hoveredEntity, hoveredBuilding) {
        if (!this.assetsLoaded) return;
        
        this.clearCanvas();
        this.drawBackground();
        
        this.drawResourceNodes(this.world.getResourceNodes());
        this.drawBuildings(this.world.getBuildings(), selectedBuilding, hoveredBuilding);
        this.drawRelationships(this.world.getEntities());
        this.drawEntities(this.world.getEntities(), selectedEntity, hoveredEntity);
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    drawBackground() {
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#a8e6cf');
        gradient.addColorStop(0.5, '#dcedc8');
        gradient.addColorStop(1, '#f8bbd9');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawResourceNodes(nodes) {
        const colorMap = {
            food: '#8BC34A',
            wood: '#795548',
            stone: '#607D8B',
            water: '#03A9F4'
        };
        
        nodes.forEach(node => {
            this.ctx.fillStyle = colorMap[node.type] || '#ccc';
            this.ctx.globalAlpha = Math.max(0.3, node.amount / node.maxAmount);
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;
    }

    drawBuildings(buildings, selectedBuilding, hoveredBuilding) {
        buildings.forEach(building => {
            if (building.type === 'home') {
                const x = building.x - building.width / 2;
                const y = building.y - building.height / 2;

                this.ctx.save();
                this.ctx.translate(building.x, building.y);

                if (selectedBuilding && building.id === selectedBuilding.id) {
                    this.ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
                    this.ctx.fillRect(-building.width/2 - 4, -building.height/2 - 4, building.width + 8, building.height + 8);
                } else if (hoveredBuilding && building.id === hoveredBuilding.id) {
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    this.ctx.fillRect(-building.width/2 - 2, -building.height/2 - 2, building.width + 4, building.height + 4);
                }
                
                this.ctx.restore();

                this.ctx.fillStyle = '#A1887F';
                this.ctx.strokeStyle = '#5D4037';
                this.ctx.lineWidth = 2;
                this.ctx.fillRect(x, y, building.width, building.height);
                this.ctx.strokeRect(x, y, building.width, building.height);

                this.ctx.fillStyle = '#795548';
                this.ctx.beginPath();
                this.ctx.moveTo(building.x - 14, y);
                this.ctx.lineTo(building.x + 14, y);
                this.ctx.lineTo(building.x, y - 10);
                this.ctx.closePath();
                this.ctx.fill();
            }
        });
    }

    drawRelationships(entities) {
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.6;
        
        const relationships = [];
        entities.forEach(entity => {
            entity.getRelationships().forEach(rel => {
                const target = entities.find(e => e.id === rel.targetId);
                if (target && rel.type !== 'neutral' && entity.id < target.id) {
                    relationships.push({ from: entity, to: target, type: rel.type });
                }
            });
        });
        
        const colorMap = {
            friendship: '#4CAF50',
            rivalry: '#F44336'
        };

        relationships.forEach(rel => {
            this.ctx.strokeStyle = colorMap[rel.type] || '#ccc';
            this.ctx.beginPath();
            this.ctx.moveTo(rel.from.x, rel.from.y);
            this.ctx.lineTo(rel.to.x, rel.to.y);
            this.ctx.stroke();
        });
        
        this.ctx.globalAlpha = 1;
    }

    drawEntities(entities, selectedEntity, hoveredEntity) {
        entities.forEach(entity => {
            const sprite = this.images['creature_sprite.png'];
            if (!sprite) return;
            
            const size = 20;

            this.ctx.save();
            this.ctx.translate(entity.x, entity.y);

            if (selectedEntity && entity.id === selectedEntity.id) {
                this.ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
                this.ctx.beginPath();
                this.ctx.arc(0, 0, size / 2 + 5, 0, 2 * Math.PI);
                this.ctx.fill();
            } else if (hoveredEntity && entity.id === hoveredEntity.id) {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                this.ctx.beginPath();
                this.ctx.arc(0, 0, size / 2 + 3, 0, 2 * Math.PI);
                this.ctx.fill();
            }
            
            this.ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
            
            this.drawCarriedResources(entity);

            this.ctx.restore();

            if (hoveredEntity && entity.id === hoveredEntity.id) {
                this.drawNameplate(entity);
            }
        });
    }

    drawCarriedResources(entity) {
        const resourceColorMap = {
            food: '#8BC34A',
            wood: '#795548',
            stone: '#607D8B',
            water: '#03A9F4',
        };

        entity.inventory.forEach((item, index) => {
            const angle = (index / entity.inventoryCapacity) * 2 * Math.PI - (Math.PI / 2);
            const radius = 14;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            this.ctx.fillStyle = resourceColorMap[item.type];
            this.ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.stroke();
        });
    }

    drawNameplate(entity) {
        const name = entity.getName();
        this.ctx.font = '10px Inter, sans-serif';
        const textMetrics = this.ctx.measureText(name);
        const boxX = entity.x - textMetrics.width / 2;
        const boxY = entity.y - 30;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.roundRect(boxX - 4, boxY - 8, textMetrics.width + 8, 16, 4);
        this.ctx.fill();
        
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(name, entity.x, entity.y - 22);
    }
}