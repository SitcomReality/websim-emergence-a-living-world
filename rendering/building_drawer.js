function drawBuildingSelection(ctx, building, selectedBuilding, hoveredBuilding) {
    ctx.save();
    ctx.translate(building.x, building.y);
    ctx.rotate(building.rotation || 0);

    if (selectedBuilding && building.id === selectedBuilding.id) {
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(0, 0, building.width / 2 + 5, 0, 2 * Math.PI);
        ctx.fill();
    } else if (hoveredBuilding && building.id === hoveredBuilding.id) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, building.width / 2 + 3, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    ctx.restore();
}

function drawHome(ctx, building, selectedBuilding, hoveredBuilding, world) {
    drawBuildingSelection(ctx, building, selectedBuilding, hoveredBuilding);

    ctx.save();
    ctx.translate(building.x, building.y);
    ctx.rotate(building.rotation || 0);

    const x = -building.width / 2;
    const y = -building.height / 2;

    ctx.fillStyle = '#A1887F';
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, building.width, building.height);
    ctx.strokeRect(x, y, building.width, building.height);

    ctx.fillStyle = '#795548';
    ctx.beginPath();
    ctx.moveTo(x - 2, y);
    ctx.lineTo(x + building.width + 2, y);
    ctx.lineTo(x + building.width / 2, y - 10);
    ctx.closePath();
    ctx.fill();

    // Check if an entity is processing here
    const owner = world.entities.find(e => e.id === building.ownerId);
    if (owner && owner.currentTask.startsWith('processing') && owner.targetNode?.id === building.id) {
        ctx.font = '14px sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
         // Draw a simple icon like a hammer
        ctx.fillText('🔨', 0, 0);
    }

    ctx.restore();
}

function drawStorage(ctx, building, selectedBuilding, hoveredBuilding) {
    drawBuildingSelection(ctx, building, selectedBuilding, hoveredBuilding);
    
    ctx.save();
    ctx.translate(building.x, building.y);
    ctx.rotate(building.rotation || 0);

    const x = -building.width / 2;
    const y = -building.height / 2;
    
    ctx.fillStyle = '#c7a76c';
    ctx.strokeStyle = '#8d6e63';
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, building.width, building.height);
    ctx.strokeRect(x, y, building.width, building.height);
    ctx.restore();
}

function drawConstructionSite(ctx, building, selectedBuilding, hoveredBuilding) {
    drawBuildingSelection(ctx, building, selectedBuilding, hoveredBuilding);
    
    ctx.save();
    ctx.translate(building.x, building.y);
    ctx.rotate(building.rotation || 0);

    // Cleared ground
    ctx.fillStyle = 'rgba(93, 64, 55, 0.4)'; // dark muddy brown
    ctx.beginPath();
    ctx.arc(0, 0, building.width / 2, 0, 2 * Math.PI);
    ctx.fill();

    const progress = building.constructionProgress / building.constructionTotal;
    
    if (progress > 0.1) { // Foundation
        ctx.strokeStyle = '#6D4C41';
        ctx.lineWidth = 2;
        ctx.strokeRect(-building.width/2 + 2, -building.height/2 + 2, building.width - 4, building.height - 4);
    }

    if (progress > 0.4) { // Frame
        ctx.fillStyle = '#8D6E63';
        ctx.globalAlpha = (progress - 0.4) / 0.5;
         // Corner posts
        ctx.fillRect(-building.width/2+2, -building.height/2+2, 4, 4);
        ctx.fillRect(building.width/2-6, -building.height/2+2, 4, 4);
        ctx.fillRect(-building.width/2+2, building.height/2-6, 4, 4);
        ctx.fillRect(building.width/2-6, building.height/2-6, 4, 4);
    }

    if (progress > 0.8) { // Partial roof
         ctx.globalAlpha = (progress - 0.8) / 0.2;
         ctx.fillStyle = '#795548';
         ctx.beginPath();
         ctx.moveTo(0, -building.height/2 - 5);
         ctx.lineTo(-building.width/2, -building.height/2 + 8);
         ctx.lineTo(building.width/2, -building.height/2 + 8);
         ctx.closePath();
         ctx.fill();
    }

    ctx.restore();
}

export function drawBuildings(ctx, buildings, selectedBuilding, hoveredBuilding, world) {
    buildings.forEach(building => {
        if (building.type === 'home') {
            drawHome(ctx, building, selectedBuilding, hoveredBuilding, world);
        } else if (building.type === 'storage') {
            drawStorage(ctx, building, selectedBuilding, hoveredBuilding);
        } else if (building.type === 'home_construction_site') {
            drawConstructionSite(ctx, building, selectedBuilding, hoveredBuilding);
        }
    });
}