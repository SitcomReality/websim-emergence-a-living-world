export function drawSelectionContextLines(ctx, selectedEntity) {
    if (!selectedEntity) return;

    ctx.save();
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.8;

    // Draw line to home
    const homeX = selectedEntity.homeX;
    const homeY = selectedEntity.homeY;
    if (homeX !== null && homeY !== null) {
        ctx.strokeStyle = 'rgba(0, 150, 255, 0.8)'; // Blue
        ctx.beginPath();
        ctx.moveTo(selectedEntity.x, selectedEntity.y);
        ctx.lineTo(homeX, homeY);
        ctx.stroke();
    }

    // Draw line to target destination
    if (selectedEntity.currentTask !== 'idle' && selectedEntity.currentTask !== 'wandering' && selectedEntity.targetX !== selectedEntity.x && selectedEntity.targetY !== selectedEntity.y) {
        ctx.strokeStyle = 'rgba(255, 50, 50, 0.8)'; // Red
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(selectedEntity.x, selectedEntity.y);
        ctx.lineTo(selectedEntity.targetX, selectedEntity.targetY);
        ctx.stroke();
    }

    ctx.restore();
}

export function drawRelationships(ctx, entities, selectedEntity) {
    if (!selectedEntity) return;

    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    
    const relationships = [];
    selectedEntity.getRelationships().forEach(rel => {
        const target = entities.find(e => e.id === rel.targetId);
        if (target && rel.type !== 'neutral') {
            relationships.push({ from: selectedEntity, to: target, type: rel.type });
        }
    });
    
    const colorMap = {
        friendship: '#4CAF50',
        rivalry: '#F44336'
    };

    relationships.forEach(rel => {
        ctx.strokeStyle = colorMap[rel.type] || '#ccc';
        ctx.beginPath();
        ctx.moveTo(rel.from.x, rel.from.y);
        ctx.lineTo(rel.to.x, rel.to.y);
        ctx.stroke();
    });
    
    ctx.globalAlpha = 1;
}

export function drawVisualEffects(ctx, effects) {
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    effects.forEach(effect => {
        if (effect.type === 'relationship') {
            const icon = effect.icon === 'friendship' ? '💖' : '😠';
             ctx.save();
             const remainingLife = effect.life / effect.duration;
             ctx.globalAlpha = Math.max(0, remainingLife);
             const scale = 1 + (1 - remainingLife) * 0.5;
             const yOffset = (1 - remainingLife) * -20;
             ctx.translate(effect.x, effect.y + yOffset);
             ctx.scale(scale, scale);
             ctx.fillText(icon, 0, 0);
             ctx.restore();
        }
    });
}