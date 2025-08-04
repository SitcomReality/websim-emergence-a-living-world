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
        const imageList = [
            'creature_sprite.png',
            'farmer_sprite.png',
            'trader_sprite.png',
            'crafter_sprite.png',
            'explorer_sprite.png'
        ];
        
        this.images = await loadAssets(imageList);
        this.assetsLoaded = true;
    }

    render(selectedEntity, selectedBuilding, hoveredEntity, hoveredBuilding) {
        if (!this.assetsLoaded) return;
        
        this.clearCanvas();
        drawBackground(this.ctx, this.canvas.width, this.canvas.height);
        
        drawResourceNodes(this.ctx, this.world.getResourceNodes(), this.world.getSaplings());
        drawBuildings(this.ctx, this.world.getBuildings(), selectedBuilding, hoveredBuilding, this.world);
        drawSelectionContextLines(this.ctx, selectedEntity);
        drawRelationships(this.ctx, this.world.getEntities(), selectedEntity);
        drawEntities(this.ctx, this.world.getEntities(), selectedEntity, hoveredEntity, this.images);
        drawVisualEffects(this.ctx, this.world.getVisualEffects());
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}