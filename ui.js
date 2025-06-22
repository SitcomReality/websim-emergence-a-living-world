import { Renderer } from './rendering/renderer.js';

export class UI {
    constructor(world) {
        this.world = world;
        this.selectedEntity = null;
        this.selectedBuilding = null;
        this.hoveredEntity = null;
        this.hoveredBuilding = null;

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

            // Find clicked building
            const clickedBuilding = this.world.getBuildings().find(building => {
                return x >= building.x - building.width / 2 &&
                       x <= building.x + building.width / 2 &&
                       y >= building.y - building.height / 2 &&
                       y <= building.y + building.height / 2;
            });

            if (clickedBuilding) {
                this.selectBuilding(clickedBuilding);
                return;
            }

            // Find clicked entity
            const clickedEntity = this.world.getEntities().find(entity => {
                const dx = entity.x - x;
                const dy = entity.y - y;
                return Math.sqrt(dx * dx + dy * dy) < 15; // 15px click radius
            });

            if (clickedEntity) {
                this.selectEntity(clickedEntity);
            } else {
                this.deselect();
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

            const foundBuilding = this.world.getBuildings().find(building => {
                return x >= building.x - building.width / 2 &&
                       x <= building.x + building.width / 2 &&
                       y >= building.y - building.height / 2 &&
                       y <= building.y + building.height / 2;
            });

            if (this.hoveredBuilding !== foundBuilding) {
                this.hoveredBuilding = foundBuilding;
            }
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.hoveredEntity = null;
            this.hoveredBuilding = null;
        });
    }

    selectEntity(entity) {
        this.selectedEntity = entity;
        this.selectedBuilding = null;
        this.updateSelectionPanel();
    }

    selectBuilding(building) {
        this.selectedBuilding = building;
        this.selectedEntity = null;
        this.updateSelectionPanel();
    }

    deselect() {
        this.selectedEntity = null;
        this.selectedBuilding = null;
        document.getElementById('selectionPanel').style.display = 'none';
    }

    updateSelectionPanel() {
        if (this.selectedEntity) {
            this.updateSelectedEntityPanel();
        } else if (this.selectedBuilding) {
            this.updateSelectedBuildingPanel();
        } else {
            this.deselect();
        }
    }

    updateSelectedEntityPanel() {
        if (!this.selectedEntity) return;

        const panel = document.getElementById('selectionPanel');
        const nameEl = document.getElementById('selectionName');
        const infoEl = document.getElementById('selectionInfo');
        const statsEl = document.getElementById('selectionStats');

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

    updateSelectedBuildingPanel() {
        if (!this.selectedBuilding) return;

        const panel = document.getElementById('selectionPanel');
        const nameEl = document.getElementById('selectionName');
        const infoEl = document.getElementById('selectionInfo');
        const statsEl = document.getElementById('selectionStats');
        
        const building = this.selectedBuilding;
        const owner = this.world.getEntities().find(e => e.id === building.ownerId);

        panel.style.display = 'block';

        if (owner) {
            nameEl.textContent = `Home of ${owner.getName()}`;
            infoEl.innerHTML = `
                <div style="font-size: 14px;">A modest dwelling. Level ${building.level}</div>
            `;
            
            const resources = owner.getResources();
            statsEl.innerHTML = `
                 <div style="margin-top: 10px; font-size: 11px;">
                    <div>Stored Resources:</div>
                    <div style="margin-left: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                        <span>Food: ${resources.food.toFixed(1)}</span>
                        <span>Water: ${resources.water.toFixed(1)}</span>
                        <span>Wood: ${resources.wood.toFixed(1)}</span>
                        <span>Stone: ${resources.stone.toFixed(1)}</span>
                    </div>
                </div>
            `;
        } else {
             nameEl.textContent = `Abandoned Home`;
             infoEl.innerHTML = `This home's owner is no longer around.`;
             statsEl.innerHTML = '';
        }
    }

    update() {
        // Main render call
        this.renderer.render(this.selectedEntity, this.selectedBuilding, this.hoveredEntity, this.hoveredBuilding);

        // Update sidebar UI
        this.updateStats();
        this.updateEventLog();

        this.updateSelectionPanel();
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

        // Update resource counts
        const resourceTotals = this.world.resourceManager.getTotalResources();
        document.getElementById('foodCount').textContent = resourceTotals.food.toFixed(1);
        document.getElementById('waterCount').textContent = resourceTotals.water.toFixed(1);
        document.getElementById('woodCount').textContent = resourceTotals.wood.toFixed(1);
        document.getElementById('stoneCount').textContent = resourceTotals.stone.toFixed(1);
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
        this.deselect();
        this.renderer.clearCanvas();
    }

    render() {
        // This is now just a wrapper around update() for the initial call
        this.update();
    }
}