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
        this.drawSelectionContextLines(selectedEntity);
        this.drawRelationships(this.world.getEntities(), selectedEntity);
        this.drawEntities(this.world.getEntities(), selectedEntity, hoveredEntity);
        this.drawVisualEffects(this.world.getVisualEffects());
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    drawBackground() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#134E5E'); // Deep jungle blue-green
        gradient.addColorStop(1, '#71B280'); // Lighter, leafy green
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawResourceNodes(nodes) {
        nodes.forEach(node => {
            this.ctx.globalAlpha = Math.max(0.3, node.amount / node.maxAmount);
            switch(node.type) {
                case 'food':
                    this.drawFoodNode(node);
                    break;
                case 'wood':
                    this.drawWoodNode(node);
                    break;
                case 'stone':
                    this.drawStoneNode(node);
                    break;
                case 'water':
                    this.drawWaterNode(node);
                    break;
                default:
                    this.ctx.fillStyle = '#ccc';
                    this.ctx.beginPath();
                    this.ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI);
                    this.ctx.fill();
            }
        });
        this.ctx.globalAlpha = 1;
    }

    drawFoodNode(node) {
        // Bush-like structure
        this.ctx.fillStyle = '#1B5E20'; // Dark green base
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, 7, 0, 2 * Math.PI);
        this.ctx.fill();

        this.ctx.fillStyle = '#4CAF50'; // Lighter green leaves
        this.ctx.beginPath();
        this.ctx.arc(node.x + 3, node.y - 3, 4, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(node.x - 3, node.y - 2, 4, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y + 3, 4, 0, 2 * Math.PI);
        this.ctx.fill();
    }

    drawWoodNode(node) {
        // Tree: trunk and canopy
        const trunkWidth = 4;
        const trunkHeight = 10;
        this.ctx.fillStyle = '#5D4037'; // Brown trunk
        this.ctx.fillRect(node.x - trunkWidth / 2, node.y, trunkWidth, trunkHeight);

        this.ctx.fillStyle = '#388E3C'; // Dark green canopy
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI);
        this.ctx.fill();
    }

    drawStoneNode(node) {
        // Rock-like shape
        this.ctx.fillStyle = '#757575'; // Grey stone
        this.ctx.beginPath();
        this.ctx.moveTo(node.x - 6, node.y + 4);
        this.ctx.lineTo(node.x - 5, node.y - 5);
        this.ctx.lineTo(node.x + 2, node.y - 6);
        this.ctx.lineTo(node.x + 7, node.y - 2);
        this.ctx.lineTo(node.x + 5, node.y + 5);
        this.ctx.closePath();
        this.ctx.fill();

        // Mossy highlight
        this.ctx.fillStyle = 'rgba(76, 175, 80, 0.5)';
        this.ctx.beginPath();
        this.ctx.arc(node.x + 2, node.y - 2, 4, 0, 2 * Math.PI);
        this.ctx.fill();
    }

    drawWaterNode(node) {
        // Puddle of water
        this.ctx.fillStyle = '#0097A7'; // Darker cyan
        this.ctx.beginPath();
        this.ctx.ellipse(node.x, node.y, 8, 6, 0, 0, 2 * Math.PI);
        this.ctx.fill();

        this.ctx.fillStyle = '#4DD0E1'; // Lighter cyan highlight
        this.ctx.beginPath();
        this.ctx.ellipse(node.x + 1, node.y - 1, 4, 2.5, 0, 0, 2 * Math.PI);
        this.ctx.fill();
    }

    drawBuildings(buildings, selectedBuilding, hoveredBuilding) {
        buildings.forEach(building => {
            if (building.type === 'home') {
                this.drawHome(building, selectedBuilding, hoveredBuilding);
            } else if (building.type === 'storage') {
                this.drawStorage(building, selectedBuilding, hoveredBuilding);
            } else if (building.type === 'home_construction_site') {
                this.drawConstructionSite(building, selectedBuilding, hoveredBuilding);
            }
        });
    }

    drawBuildingSelection(building, selectedBuilding, hoveredBuilding) {
        this.ctx.save();
        this.ctx.translate(building.x, building.y);

        if (selectedBuilding && building.id === selectedBuilding.id) {
            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, building.width / 2 + 5, 0, 2 * Math.PI);
            this.ctx.fill();
        } else if (hoveredBuilding && building.id === hoveredBuilding.id) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, building.width / 2 + 3, 0, 2 * Math.PI);
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }

    drawHome(building, selectedBuilding, hoveredBuilding) {
        const x = building.x - building.width / 2;
        const y = building.y - building.height / 2;

        this.drawBuildingSelection(building, selectedBuilding, hoveredBuilding);

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

    drawStorage(building, selectedBuilding, hoveredBuilding) {
        const x = building.x - building.width / 2;
        const y = building.y - building.height / 2;

        this.drawBuildingSelection(building, selectedBuilding, hoveredBuilding);
        
        this.ctx.fillStyle = '#c7a76c';
        this.ctx.strokeStyle = '#8d6e63';
        this.ctx.lineWidth = 2;
        this.ctx.fillRect(x, y, building.width, building.height);
        this.ctx.strokeRect(x, y, building.width, building.height);
    }

    drawConstructionSite(building, selectedBuilding, hoveredBuilding) {
        const x = building.x - building.width / 2;
        const y = building.y - building.height / 2;

        this.drawBuildingSelection(building, selectedBuilding, hoveredBuilding);
        
        this.ctx.save();
        this.ctx.translate(building.x, building.y);

        // Cleared ground
        this.ctx.fillStyle = 'rgba(93, 64, 55, 0.4)'; // dark muddy brown
        this.ctx.beginPath();
        this.ctx.arc(0, 0, building.width / 2, 0, 2 * Math.PI);
        this.ctx.fill();

        const progress = building.constructionProgress / building.constructionTotal;
        
        if (progress > 0.1) { // Foundation
            this.ctx.strokeStyle = '#6D4C41';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(-building.width/2 + 2, -building.height/2 + 2, building.width - 4, building.height - 4);
        }

        if (progress > 0.4) { // Frame
            this.ctx.fillStyle = '#8D6E63';
            this.ctx.globalAlpha = (progress - 0.4) / 0.5;
             // Corner posts
            this.ctx.fillRect(-building.width/2+2, -building.height/2+2, 4, 4);
            this.ctx.fillRect(building.width/2-6, -building.height/2+2, 4, 4);
            this.ctx.fillRect(-building.width/2+2, building.height/2-6, 4, 4);
            this.ctx.fillRect(building.width/2-6, building.height/2-6, 4, 4);
        }

        if (progress > 0.8) { // Partial roof
             this.ctx.globalAlpha = (progress - 0.8) / 0.2;
             this.ctx.fillStyle = '#795548';
             this.ctx.beginPath();
             this.ctx.moveTo(0, -building.height/2 - 5);
             this.ctx.lineTo(-building.width/2, -building.height/2 + 8);
             this.ctx.lineTo(building.width/2, -building.height/2 + 8);
             this.ctx.closePath();
             this.ctx.fill();
        }

        this.ctx.restore();
    }

    drawSelectionContextLines(selectedEntity) {
        if (!selectedEntity) return;

        this.ctx.save();
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 0.8;

        // Draw line to home
        const homeX = selectedEntity.homeX;
        const homeY = selectedEntity.homeY;
        if (homeX !== null && homeY !== null) {
            this.ctx.strokeStyle = 'rgba(0, 150, 255, 0.8)'; // Blue
            this.ctx.beginPath();
            this.ctx.moveTo(selectedEntity.x, selectedEntity.y);
            this.ctx.lineTo(homeX, homeY);
            this.ctx.stroke();
        }

        // Draw line to target destination
        if (selectedEntity.currentTask !== 'idle' && selectedEntity.currentTask !== 'wandering') {
            this.ctx.strokeStyle = 'rgba(255, 50, 50, 0.8)'; // Red
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(selectedEntity.x, selectedEntity.y);
            this.ctx.lineTo(selectedEntity.targetX, selectedEntity.targetY);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    drawRelationships(entities, selectedEntity) {
        if (!selectedEntity) return;

        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.6;
        
        const relationships = [];
        selectedEntity.getRelationships().forEach(rel => {
            const target = entities.find(e => e.id === rel.targetId);
            if (target && rel.type !== 'neutral') {
                relationships.push({ from: selectedEntity, to: target, type: rel.type });
            }
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

        entity.inventory.items.forEach((item, index) => {
            const angle = (index / entity.inventory.capacity) * 2 * Math.PI - (Math.PI / 2);
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

    drawVisualEffects(effects) {
        this.ctx.font = '20px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        effects.forEach(effect => {
            if (effect.type === 'relationship') {
                const icon = effect.icon === 'friendship' ? '💖' : '😠';
                 this.ctx.save();
                 const remainingLife = effect.life / effect.duration;
                 this.ctx.globalAlpha = Math.max(0, remainingLife);
                 const scale = 1 + (1 - remainingLife) * 0.5;
                 const yOffset = (1 - remainingLife) * -20;
                 this.ctx.translate(effect.x, effect.y + yOffset);
                 this.ctx.scale(scale, scale);
                 this.ctx.fillText(icon, 0, 0);
                 this.ctx.restore();
            }
        });
    }
}