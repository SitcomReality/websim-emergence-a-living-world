import { loadAssets } from './asset_loader.js';
import { drawBackground } from './background_drawer.js';
import { drawResourceNodes } from './node_drawer.js';
import { drawBuildings } from './building_drawer.js';
import { drawEntities } from './entity_drawer.js';
import { drawSelectionContextLines, drawRelationships, drawVisualEffects } from './effects_drawer.js';

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
        // We no longer need to load entity sprites, but keep the system for potential future assets
        const imageList = [
            // Entity sprites no longer needed - using procedural generation
        ];
        
        this.images = await loadAssets(imageList);
        this.assetsLoaded = true;
    }

    render(selectedEntity, selectedBuilding, hoveredEntity, hoveredBuilding) {
        this.assetsLoaded = true; // No longer dependent on loading sprites
        
        this.clearCanvas();
        drawBackground(this.ctx, this.canvas.width, this.canvas.height);
        
        drawResourceNodes(this.ctx, this.world.getResourceNodes(), this.world.getSaplings());
        drawBuildings(this.ctx, this.world.getBuildings(), selectedBuilding, hoveredBuilding, this.world);
        this.drawDecorativeStructures(this.ctx, this.world.getDecorativeStructures());
        drawSelectionContextLines(this.ctx, selectedEntity);
        drawRelationships(this.ctx, this.world.getEntities(), selectedEntity);
        drawEntities(this.ctx, this.world.getEntities(), selectedEntity, hoveredEntity, this.images);
        drawVisualEffects(this.ctx, this.world.getVisualEffects());
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawDecorativeStructures(ctx, structures) {
        structures.forEach(structure => {
            ctx.save();
            ctx.translate(structure.x, structure.y);
            
            if (structure.type === 'food_garden') {
                // Draw rows of crops
                ctx.fillStyle = structure.maturity < 1 ? '#7CB342' : '#4CAF50';
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        ctx.beginPath();
                        ctx.arc(i * 6, j * 6, 2 + structure.maturity, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                }
            } else if (structure.type === 'flower_garden') {
                // Draw colorful flowers
                const colors = ['#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3'];
                for (let i = 0; i < 5; i++) {
                    const angle = (i / 5) * Math.PI * 2;
                    const radius = 8 + structure.maturity * 4;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    
                    ctx.fillStyle = colors[i];
                    ctx.beginPath();
                    ctx.arc(x, y, 3, 0, 2 * Math.PI);
                    ctx.fill();
                }
            } else if (structure.type === 'statue') {
                // Draw different statue styles
                ctx.fillStyle = '#9E9E9E';
                if (structure.style === 0) {
                    // Tall pillar
                    ctx.fillRect(-3, -12, 6, 20);
                    ctx.fillRect(-5, -14, 10, 4);
                } else if (structure.style === 1) {
                    // Wide base
                    ctx.fillRect(-6, -8, 12, 12);
                    ctx.fillRect(-4, -12, 8, 8);
                } else {
                    // Abstract shape
                    ctx.beginPath();
                    ctx.moveTo(0, -12);
                    ctx.lineTo(-4, -6);
                    ctx.lineTo(-2, 6);
                    ctx.lineTo(2, 6);
                    ctx.lineTo(4, -6);
                    ctx.closePath();
                    ctx.fill();
                }
            } else if (structure.type === 'shop') {
                // Draw shop stall
                ctx.fillStyle = '#8D6E63';
                ctx.fillRect(-8, -6, 16, 12);
                ctx.fillStyle = '#FFC107';
                ctx.fillRect(-6, -8, 12, 4); // Awning
                
                // Draw some goods
                ctx.fillStyle = '#4CAF50';
                ctx.fillRect(-5, -4, 2, 2);
                ctx.fillStyle = '#795548';
                ctx.fillRect(-1, -4, 2, 2);
                ctx.fillStyle = '#607D8B';
                ctx.fillRect(3, -4, 2, 2);
            }
            
            ctx.restore();
        });
    }
}