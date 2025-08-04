export function updateStats(world) {
    const entities = world.getEntities();
    const relationshipCount = entities.reduce((count, entity) =>
        count + entity.getRelationships().filter(r => r.type !== 'neutral').length, 0);

    document.getElementById('entityCount').textContent = entities.length;
    document.getElementById('cycleCount').textContent = world.getCycleCount();
    document.getElementById('relationshipCount').textContent = Math.floor(relationshipCount / 2);

    // Count trades (simplified - just count recent trade events)
    const recentEvents = world.getEvents();
    const tradeEvents = recentEvents.filter(e => e.message.includes('traded'));
    document.getElementById('tradeCount').textContent = tradeEvents.length;

    // Update resource counts
    const resourceTotals = world.resourceManager.getTotalResources();
    document.getElementById('foodCount').textContent = resourceTotals.food.toFixed(1);
    document.getElementById('woodCount').textContent = resourceTotals.wood.toFixed(1);
    document.getElementById('stoneCount').textContent = resourceTotals.stone.toFixed(1);
}

export function updateEventLog(world) {
    const eventLog = document.getElementById('eventLog');
    const events = world.getEvents();

    eventLog.innerHTML = events.map(event =>
        `<div style="margin-bottom: 5px; padding: 3px; background: rgba(255,255,255,0.1); border-radius: 3px;">
            ${event.message}
        </div>`
    ).join('');
}

function displayHomeInfo(building, owner) {
    const infoEl = document.getElementById('selectionInfo');
    const statsEl = document.getElementById('selectionStats');
    infoEl.innerHTML = `<div style="font-size: 14px;">A modest dwelling. Level ${building.level}</div>`;
    
    if(owner) {
        const res = building.inventory;
        statsEl.innerHTML = `
             <div style="margin-top: 10px; font-size: 11px;">
                <div>Stored Resources:</div>
                <div style="margin-left: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                    <span>Food: ${res.food.toFixed(1)}</span>
                    <span>Wood: ${res.wood.toFixed(1)}</span>
                    <span>Stone: ${res.stone.toFixed(1)}</span>
                    <span>Cooked Food: ${(res.cooked_food || 0).toFixed(1)}</span>
                    <span>Planks: ${(res.planks || 0).toFixed(1)}</span>
                    <span>Bricks: ${(res.bricks || 0).toFixed(1)}</span>
                </div>
            </div>
        `;
    } else {
        statsEl.innerHTML = '<div style="font-size: 12px; margin-top: 10px;">This home is empty.</div>';
    }
}

function displayStorageInfo(building, owner) {
    const infoEl = document.getElementById('selectionInfo');
    const statsEl = document.getElementById('selectionStats');
    infoEl.innerHTML = `<div style="font-size: 14px;">A simple storage shed.</div>`;
    
    if(owner) {
        const res = building.inventory;
        statsEl.innerHTML = `
             <div style="margin-top: 10px; font-size: 11px;">
                <div>Stored Resources:</div>
                <div style="margin-left: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                    <span>Food: ${res.food.toFixed(1)}</span>
                    <span>Wood: ${res.wood.toFixed(1)}</span>
                    <span>Stone: ${res.stone.toFixed(1)}</span>
                    <span>Cooked Food: ${(res.cooked_food || 0).toFixed(1)}</span>
                    <span>Planks: ${(res.planks || 0).toFixed(1)}</span>
                    <span>Bricks: ${(res.bricks || 0).toFixed(1)}</span>
                </div>
            </div>
        `;
    } else {
        statsEl.innerHTML = '<div style="font-size: 12px; margin-top: 10px;">This shed is abandoned.</div>';
    }
}

function displayConstructionInfo(building, owner) {
    const infoEl = document.getElementById('selectionInfo');
    const statsEl = document.getElementById('selectionStats');
    const progress = (building.constructionProgress / building.constructionTotal) * 100;
    infoEl.innerHTML = `<div style="font-size: 14px;">Construction in progress.</div>
    <div style="font-size: 12px; margin-top: 5px;">Progress: ${progress.toFixed(0)}%</div>`;
    
    const needed = building.requiredResources;
    let neededText = Object.keys(needed).map(k => `${needed[k]} ${k}`).join(', ');

    statsEl.innerHTML = `
        <div style="margin-top: 10px; font-size: 11px;">
            <div>Initial materials gathered. Construction can proceed.</div>
        </div>
    `;
}

function updateSelectedBuildingPanel(building, world) {
    if (!building) return;

    const panel = document.getElementById('selectionPanel');
    const nameEl = document.getElementById('selectionName');
    
    const owner = world.getEntities().find(e => e.id === building.ownerId);

    panel.style.display = 'block';

    let buildingTitle = building.type.replace(/_/g, ' ');
    buildingTitle = buildingTitle.charAt(0).toUpperCase() + buildingTitle.slice(1);

    if (owner) {
        nameEl.textContent = `${buildingTitle} of ${owner.getName()}`;
    } else {
         nameEl.textContent = `Abandoned ${buildingTitle}`;
    }

    if (building.type === 'home') {
        displayHomeInfo(building, owner);
    } else if (building.type === 'storage') {
        displayStorageInfo(building, owner);
    } else if (building.type === 'home_construction_site') {
        displayConstructionInfo(building, owner);
    }
}

function updateSelectedEntityPanel(entity) {
    if (!entity) return;

    const panel = document.getElementById('selectionPanel');
    const nameEl = document.getElementById('selectionName');
    const infoEl = document.getElementById('selectionInfo');
    const statsEl = document.getElementById('selectionStats');

    const info = entity.getInfo();

    panel.style.display = 'block';
    nameEl.textContent = info.name;
    infoEl.innerHTML = `
        ${info.personality}<br>
        <span style="font-size: 12px; color: rgba(255,255,255,0.7)">Task: ${info.task}</span>
    `;

    const inventoryText = info.inventory.length > 0
        ? info.inventory.map(item => `${item.amount.toFixed(1)} ${item.type}`).join(', ')
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
                <div>Resources (at home/storage):</div>
                <div style="margin-left: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 2px;">
                    <span>Food: ${info.resources.food.toFixed(1)}</span>
                    <span>C-Food: ${info.resources.cooked_food.toFixed(1)}</span>
                    <span>Wood: ${info.resources.wood.toFixed(1)}</span>
                    <span>Planks: ${info.resources.planks.toFixed(1)}</span>
                    <span>Stone: ${info.resources.stone.toFixed(1)}</span>
                    <span>Bricks: ${info.resources.bricks.toFixed(1)}</span>
                </div>
            </div>
             <div style="margin-top: 8px; font-size: 11px;">
                <div>Carrying: ${inventoryText}</div>
            </div>
        </div>
    `;
}

export function updateSelectionPanel(world, selectedEntity, selectedBuilding) {
    const panel = document.getElementById('selectionPanel');
    if (selectedEntity) {
        updateSelectedEntityPanel(selectedEntity);
    } else if (selectedBuilding) {
        updateSelectedBuildingPanel(selectedBuilding, world);
    } else {
        panel.style.display = 'none';
    }
}