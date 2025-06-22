import { Renderer } from './rendering/renderer.js';

export class UI {
    constructor(world) {
        this.world = world;
        this.selectedEntity = null;
        this.hoveredEntity = null;

        this.canvas = document.getElementById('worldCanvas');
        this.renderer = new Renderer(this.canvas, world);

        this.setupEventListeners();
    }

    async initialize() {
        await this.renderer.loadAssets();
        this.render(); // Initial render
    }

    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Find clicked entity
            const clickedEntity = this.world.getEntities().find(entity => {
                const dx = entity.x - x;
                const dy = entity.y - y;
                return Math.sqrt(dx * dx + dy * dy) < 15; // 15px click radius
            });

            if (clickedEntity) {
                this.selectEntity(clickedEntity);
            } else {
                this.deselectEntity();
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const foundEntity = this.world.getEntities().find(entity => {
                const dx = entity.x - x;
                const dy = entity.y - y;
                return Math.sqrt(dx * dx + dy * dy) < 15;
            });

            if (this.hoveredEntity !== foundEntity) {
                this.hoveredEntity = foundEntity;
            }
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.hoveredEntity = null;
        });
    }

    selectEntity(entity) {
        this.selectedEntity = entity;
        this.updateSelectedEntityPanel();
    }

    deselectEntity() {
        this.selectedEntity = null;
        document.getElementById('selectedEntityPanel').style.display = 'none';
    }

    updateSelectedEntityPanel() {
        if (!this.selectedEntity) return;

        const panel = document.getElementById('selectedEntityPanel');
        const nameEl = document.getElementById('selectedEntityName');
        const infoEl = document.getElementById('selectedEntityInfo');
        const statsEl = document.getElementById('selectedEntityStats');

        const info = this.selectedEntity.getInfo();

        panel.style.display = 'block';
        nameEl.textContent = info.name;
        infoEl.innerHTML = `
            ${info.personality}<br>
            <span style="font-size: 12px; color: rgba(255,255,255,0.7)">Task: ${info.task}</span>
        `;

        const inventoryText = info.inventory.length > 0
            ? info.inventory.map(item => `${item.amount} ${item.type}`).join(', ')
            : 'nothing';

        statsEl.innerHTML = `
            <div style="margin-top: 10px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 12px;">
                    <div>Energy: ${info.energy}</div>
                    <div>Happiness: ${info.happiness}</div>
                    <div>Age: ${info.age}s</div>
                    <div>Relationships: ${info.relationships}</div>
                </div>
                <div style="margin-top: 8px; font-size: 11px;">
                    <div>Resources (at home):</div>
                    <div style="margin-left: 10px;">
                        Food: ${info.resources.food.toFixed(1)}, Water: ${info.resources.water.toFixed(1)}<br>
                        Wood: ${info.resources.wood.toFixed(1)}, Stone: ${info.resources.stone.toFixed(1)}
                    </div>
                </div>
                 <div style="margin-top: 8px; font-size: 11px;">
                    <div>Carrying: ${inventoryText}</div>
                </div>
            </div>
        `;
    }

    update() {
        // Main render call
        this.renderer.render(this.selectedEntity, this.hoveredEntity);

        // Update sidebar UI
        this.updateStats();
        this.updateEventLog();

        if (this.selectedEntity) {
            this.updateSelectedEntityPanel();
        }
    }

    updateStats() {
        const entities = this.world.getEntities();
        const relationshipCount = entities.reduce((count, entity) =>
            count + entity.getRelationships().filter(r => r.type !== 'neutral').length, 0);

        document.getElementById('entityCount').textContent = entities.length;
        document.getElementById('cycleCount').textContent = this.world.getCycleCount();
        document.getElementById('relationshipCount').textContent = Math.floor(relationshipCount / 2);

        // Count trades (simplified - just count recent trade events)
        const recentEvents = this.world.getEvents();
        const tradeEvents = recentEvents.filter(e => e.message.includes('traded'));
        document.getElementById('tradeCount').textContent = tradeEvents.length;
    }

    updateEventLog() {
        const eventLog = document.getElementById('eventLog');
        const events = this.world.getEvents();

        eventLog.innerHTML = events.map(event =>
            `<div style="margin-bottom: 5px; padding: 3px; background: rgba(255,255,255,0.1); border-radius: 3px;">
                ${event.message}
            </div>`
        ).join('');
    }

    reset() {
        this.deselectEntity();
        this.renderer.clearCanvas();
    }

    render() {
        // This is now just a wrapper around update() for the initial call
        this.update();
    }
}