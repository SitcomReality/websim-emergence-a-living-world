import { Renderer } from './rendering/renderer.js';
import { setupEventListeners } from './ui/event_handler.js';
import * as PanelUpdater from './ui/panel_updater.js';

export class UI {
    constructor(world) {
        this.world = world;
        this.selectedEntity = null;
        this.selectedBuilding = null;
        this.hoveredEntity = null;
        this.hoveredBuilding = null;

        this.canvas = document.getElementById('worldCanvas');
        this.renderer = new Renderer(this.canvas, world);
    }

    async initialize() {
        await this.renderer.loadAssets();
        setupEventListeners(this);
        this.updateEventLog(); // Initial render of event log
        this.render(); // Initial render
    }

    selectEntity(entity) {
        this.selectedEntity = entity;
        this.selectedBuilding = null;
    }

    selectBuilding(building) {
        this.selectedBuilding = building;
        this.selectedEntity = null;
    }

    deselect() {
        this.selectedEntity = null;
        this.selectedBuilding = null;
    }

    update() {
        // Main render call
        this.renderer.render(this.selectedEntity, this.selectedBuilding, this.hoveredEntity, this.hoveredBuilding);

        // Update sidebar UI
        PanelUpdater.updateStats(this.world);
        PanelUpdater.updateSelectionPanel(this.world, this.selectedEntity, this.selectedBuilding);
    }

    updateEventLog() {
        PanelUpdater.updateEventLog(this.world);
    }

    reset() {
        this.deselect();
        this.renderer.clearCanvas();
        this.updateEventLog();
    }

    render() {
        // This is now just a wrapper around update() for the initial call
        this.update();
    }
}