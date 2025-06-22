export class UI {
    constructor(world) {
        this.world = world;
        this.selectedEntity = null;
        this.entityElements = new Map();
        this.resourceElements = new Map();
        this.canvas = document.getElementById('worldCanvas');
        this.relationshipSvg = document.getElementById('relationshipSvg');
        
        this.setupEventListeners();
    }

    initialize() {
        this.render();
    }

    setupEventListeners() {
        // Entity selection
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const clickedEntity = this.world.getEntities().find(entity => {
                const dx = entity.x - x;
                const dy = entity.y - y;
                return Math.sqrt(dx * dx + dy * dy) < 15;
            });
            
            if (clickedEntity) {
                this.selectEntity(clickedEntity);
            } else {
                this.deselectEntity();
            }
        });
    }

    selectEntity(entity) {
        // Remove previous selection
        if (this.selectedEntity) {
            const prevElement = this.entityElements.get(this.selectedEntity.id);
            if (prevElement) {
                prevElement.classList.remove('active');
            }
        }
        
        this.selectedEntity = entity;
        const element = this.entityElements.get(entity.id);
        if (element) {
            element.classList.add('active');
        }
        
        this.updateSelectedEntityPanel();
    }

    deselectEntity() {
        if (this.selectedEntity) {
            const element = this.entityElements.get(this.selectedEntity.id);
            if (element) {
                element.classList.remove('active');
            }
        }
        
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
            ${info.role} - ${info.personality}<br>
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
                        Food: ${info.resources.food}, Water: ${info.resources.water}<br>
                        Wood: ${info.resources.wood}, Stone: ${info.resources.stone}
                    </div>
                </div>
                 <div style="margin-top: 8px; font-size: 11px;">
                    <div>Carrying: ${inventoryText}</div>
                </div>
            </div>
        `;
    }

    update() {
        this.updateEntities();
        this.updateResources();
        this.updateRelationships();
        this.updateStats();
        this.updateEventLog();
        
        if (this.selectedEntity) {
            this.updateSelectedEntityPanel();
        }
    }

    updateEntities() {
        const entities = this.world.getEntities();
        
        // Remove entities that no longer exist
        for (const [id, element] of this.entityElements) {
            if (!entities.find(e => e.id === id)) {
                element.remove();
                this.entityElements.delete(id);
            }
        }
        
        // Update or create entity elements
        entities.forEach(entity => {
            let element = this.entityElements.get(entity.id);
            
            if (!element) {
                element = document.createElement('div');
                element.className = `entity ${entity.role.name.toLowerCase()}`;
                element.style.zIndex = '2';
                
                const carrier = document.createElement('div');
                carrier.className = 'entity-carrier';
                element.appendChild(carrier);

                const namePlate = document.createElement('div');
                namePlate.className = 'entity-name-plate';
                namePlate.textContent = entity.getName();
                element.appendChild(namePlate);

                this.canvas.appendChild(element);
                this.entityElements.set(entity.id, element);
            }
            
            element.style.left = `${entity.x - 10}px`;
            element.style.top = `${entity.y - 10}px`;
            element.title = `${entity.getName()} (${entity.role.name})`;

            this.updateCarriedResources(entity, element);
        });
    }

    updateCarriedResources(entity, entityElement) {
        const carrier = entityElement.querySelector('.entity-carrier');
        carrier.innerHTML = '';
        
        entity.inventory.forEach((item, index) => {
            const resourceEl = document.createElement('div');
            resourceEl.className = `carried-resource ${item.type}`;
            
            // Position carried items around the entity
            const angle = (index / entity.inventoryCapacity) * 2 * Math.PI - (Math.PI / 2);
            const x = Math.cos(angle) * 14; // Increased radius to avoid overlapping sprite
            const y = Math.sin(angle) * 14;

            resourceEl.style.transform = `translate(${x}px, ${y}px)`;
            
            carrier.appendChild(resourceEl);
        });
    }

    updateResources() {
        const nodes = this.world.getResourceNodes();
        
        // Remove resource nodes that no longer exist
        for (const [id, element] of this.resourceElements) {
            if (!nodes.find(n => n.id === id)) {
                element.remove();
                this.resourceElements.delete(id);
            }
        }
        
        // Update or create resource elements
        nodes.forEach(node => {
            let element = this.resourceElements.get(node.id);
            
            if (!element) {
                element = document.createElement('div');
                element.className = `resource-node ${node.type}`;
                this.canvas.appendChild(element);
                this.resourceElements.set(node.id, element);
            }
            
            element.style.left = `${node.x - 6}px`;
            element.style.top = `${node.y - 6}px`;
            element.style.opacity = Math.max(0.3, node.amount / node.maxAmount);
            element.title = `${node.type}: ${Math.round(node.amount)}/${node.maxAmount}`;
        });
    }

    updateRelationships() {
        const entities = this.world.getEntities();
        const relationships = [];
        
        entities.forEach(entity => {
            entity.getRelationships().forEach(rel => {
                const target = entities.find(e => e.id === rel.targetId);
                if (target && rel.type !== 'neutral') {
                    relationships.push({
                        from: entity,
                        to: target,
                        type: rel.type
                    });
                }
            });
        });
        
        // Clear existing lines
        this.relationshipSvg.innerHTML = '';
        
        // Draw relationship lines
        relationships.forEach(rel => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', rel.from.x);
            line.setAttribute('y1', rel.from.y);
            line.setAttribute('x2', rel.to.x);
            line.setAttribute('y2', rel.to.y);
            line.setAttribute('stroke-width', '1');
            line.className.baseVal = `relationship-line ${rel.type}`;
            this.relationshipSvg.appendChild(line);
        });
    }

    updateStats() {
        const entities = this.world.getEntities();
        const relationships = entities.reduce((count, entity) => 
            count + entity.getRelationships().filter(r => r.type !== 'neutral').length, 0);
        
        document.getElementById('entityCount').textContent = entities.length;
        document.getElementById('cycleCount').textContent = this.world.getCycleCount();
        document.getElementById('relationshipCount').textContent = relationships;
        
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
        // Clear all UI elements
        this.entityElements.forEach(element => element.remove());
        this.resourceElements.forEach(element => element.remove());
        this.entityElements.clear();
        this.resourceElements.clear();
        this.relationshipSvg.innerHTML = '';
        this.deselectEntity();
    }

    render() {
        this.update();
    }
}