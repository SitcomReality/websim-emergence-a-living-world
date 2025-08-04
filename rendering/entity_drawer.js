function drawCarriedResources(ctx, entity) {
    const resourceColorMap = {
        food: '#8BC34A',
        wood: '#795548',
        stone: '#607D8B',
        cooked_food: '#E65100', // Deep orange for cooked food
        planks: '#AF8264',      // Lighter brown for planks
        bricks: '#C62828',      // Reddish-brown for bricks
    };

    entity.inventory.items.forEach((item, index) => {
        const angle = (index / entity.inventory.capacity) * 2 * Math.PI - (Math.PI / 2);
        const radius = 14;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        ctx.fillStyle = resourceColorMap[item.type];
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
    });
}

function drawNameplate(ctx, entity) {
    const name = entity.getName();
    ctx.font = '10px Inter, sans-serif';
    const textMetrics = ctx.measureText(name);
    const boxX = entity.x - textMetrics.width / 2;
    const boxY = entity.y - 30;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.roundRect(boxX - 4, boxY - 8, textMetrics.width + 8, 16, 4);
    ctx.fill();
    
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, entity.x, entity.y - 22);
}

function drawHarvestIndicator(ctx, entity) {
    if (!entity.currentTask.startsWith('Harvesting')) return;

    const resourceType = entity.currentTask.split(' ')[1];
    let icon = '⛏️'; // Default
    if (resourceType === 'Wood') icon = '🪓';
    if (resourceType === 'Food') icon = '🧺';

    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, entity.x, entity.y - 25);
}

function drawProceduralEntity(ctx, entity, isSelected, isHovered) {
    const size = 20;

    ctx.save();
    ctx.translate(entity.x, entity.y);

    // Selection/hover highlights
    if (isSelected) {
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(0, 0, size / 2 + 5, 0, 2 * Math.PI);
        ctx.fill();
    } else if (isHovered) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, size / 2 + 3, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    // Get entity appearance data
    const appearance = entity.getAppearance();
    
    // Draw body (smaller circle below head)
    ctx.fillStyle = appearance.skinColor;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 6, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Draw head (main circle)
    ctx.fillStyle = appearance.skinColor;
    ctx.beginPath();
    ctx.arc(0, 0, size / 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Draw eyes
    const eyeOpenness = appearance.eyeOpenness; // 0 = closed, 1 = fully open
    const eyeWidth = 4;
    const eyeHeight = 4 * eyeOpenness;
    const eyeY = -2;
    
    // Left eye
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.ellipse(-3, eyeY, eyeWidth / 2, eyeHeight / 2, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    
    // Right eye  
    ctx.beginPath();
    ctx.ellipse(3, eyeY, eyeWidth / 2, eyeHeight / 2, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Draw pupils (only if eyes are open enough)
    if (eyeOpenness > 0.2) {
        ctx.fillStyle = 'black';
        const pupilSize = Math.min(2, eyeHeight * 0.6);
        
        // Create clipping region for pupils to stay within eye area
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(-3, eyeY, eyeWidth / 2, eyeHeight / 2, 0, 0, 2 * Math.PI);
        ctx.ellipse(3, eyeY, eyeWidth / 2, eyeHeight / 2, 0, 0, 2 * Math.PI);
        ctx.clip();
        
        // Left pupil
        ctx.beginPath();
        ctx.arc(-3 + appearance.pupilOffsetX, eyeY + appearance.pupilOffsetY, pupilSize / 2, 0, 2 * Math.PI);
        ctx.fill();
        
        // Right pupil
        ctx.beginPath();
        ctx.arc(3 + appearance.pupilOffsetX, eyeY + appearance.pupilOffsetY, pupilSize / 2, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.restore();
    }
    
    // Draw mouth
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const mouthY = 3;
    const mouthCurve = appearance.mouthCurve; // -1 = frown, 0 = neutral, 1 = smile
    
    if (Math.abs(mouthCurve) < 0.1) {
        // Neutral mouth - straight line
        ctx.moveTo(-2, mouthY);
        ctx.lineTo(2, mouthY);
    } else if (mouthCurve > 0) {
        // Smile - upward curve
        ctx.moveTo(-2, mouthY);
        ctx.quadraticCurveTo(0, mouthY - mouthCurve * 2, 2, mouthY);
    } else {
        // Frown - downward curve
        ctx.moveTo(-2, mouthY);
        ctx.quadraticCurveTo(0, mouthY - mouthCurve * 2, 2, mouthY);
    }
    ctx.stroke();
    
    drawCarriedResources(ctx, entity);

    ctx.restore();
}

export function drawEntities(ctx, entities, selectedEntity, hoveredEntity, images) {
    entities.forEach(entity => {
        const isSelected = selectedEntity && entity.id === selectedEntity.id;
        const isHovered = hoveredEntity && entity.id === hoveredEntity.id;
        
        drawProceduralEntity(ctx, entity, isSelected, isHovered);

        if (entity.currentTask.startsWith('Harvesting')) {
            drawHarvestIndicator(ctx, entity);
        }

        if (isHovered) {
            drawNameplate(ctx, entity);
        }
    });
}