function updateSelectedEntityPanel(entity) {
    if (!entity) return;

    const panel = document.getElementById('selectionPanel');
    const nameEl = document.getElementById('selectionName');
    const infoEl = document.getElementById('selectionInfo');
    
    const info = entity.getInfo();

    panel.style.display = 'block';
    nameEl.textContent = info.name;
    
    infoEl.innerHTML = `
        <div class="entity-info-section">
            <h4>Personality</h4>
            <div class="personality-text">${info.personality}</div>
            <div class="skills-text">Best skills: ${info.skills}</div>
        </div>

        <div class="entity-info-section">
            <h4>Status</h4>
            <div class="stat-grid">
                <div class="stat-item">
                    <span class="label">Goal:</span>
                    <span class="value">${info.goal}</span>
                </div>
                <div class="stat-item">
                    <span class="label">Task:</span>
                    <span class="value">${info.task}</span>
                </div>
                <div class="stat-item">
                    <span class="label">Energy:</span>
                    <span class="value">${info.energy}%</span>
                </div>
                <div class="stat-item">
                    <span class="label">Happiness:</span>
                    <span class="value">${info.happiness}%</span>
                </div>
                <div class="stat-item">
                    <span class="label">Age:</span>
                    <span class="value">${info.age}s</span>
                </div>
                <div class="stat-item">
                    <span class="label">Relationships:</span>
                    <span class="value">${info.relationships}</span>
                </div>
            </div>
        </div>

        <div class="entity-info-section">
            <h4>Resources</h4>
            <div class="resource-grid">
                <div class="resource-item food">
                    <span>Food</span>
                    <span>${info.resources.food.toFixed(1)}</span>
                </div>
                <div class="resource-item wood">
                    <span>Wood</span>
                    <span>${info.resources.wood.toFixed(1)}</span>
                </div>
                <div class="resource-item stone">
                    <span>Stone</span>
                    <span>${info.resources.stone.toFixed(1)}</span>
                </div>
                <div class="resource-item cooked_food">
                    <span>Cooked</span>
                    <span>${(info.resources.cooked_food || 0).toFixed(1)}</span>
                </div>
                <div class="resource-item planks">
                    <span>Planks</span>
                    <span>${(info.resources.planks || 0).toFixed(1)}</span>
                </div>
                <div class="resource-item bricks">
                    <span>Bricks</span>
                    <span>${(info.resources.bricks || 0).toFixed(1)}</span>
                </div>
            </div>
        </div>

        <div class="entity-info-section">
            <h4>Carrying</h4>
            ${info.inventory.length > 0 
                ? `<div class="inventory-list">${info.inventory.map(item => 
                    `${item.amount.toFixed(1)} ${item.type}`).join(', ')}</div>`
                : '<div class="empty-state">Nothing</div>'}
        </div>
    `;
}

