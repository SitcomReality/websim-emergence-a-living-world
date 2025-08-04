function drawCarriedResources(ctx, entity) {
    const resourceColorMap = {
        food: '#8BC34A',
        wood: '#795548',
        stone: '#607D8B',
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

export function drawEntities(ctx, entities, selectedEntity, hoveredEntity, images) {
    entities.forEach(entity => {
        const sprite = images['creature_sprite.png'];
        if (!sprite) return;
        
        const size = 20;

        ctx.save();
        ctx.translate(entity.x, entity.y);

        if (selectedEntity && entity.id === selectedEntity.id) {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(0, 0, size / 2 + 5, 0, 2 * Math.PI);
            ctx.fill();
        } else if (hoveredEntity && entity.id === hoveredEntity.id) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(0, 0, size / 2 + 3, 0, 2 * Math.PI);
            ctx.fill();
        }
        
        ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
        
        drawCarriedResources(ctx, entity);

        ctx.restore();

        if (hoveredEntity && entity.id === hoveredEntity.id) {
            drawNameplate(ctx, entity);
        }
    });
}