function drawFoodNode(ctx, node) {
    // Bush-like structure
    ctx.fillStyle = '#1B5E20'; // Dark green base
    ctx.beginPath();
    ctx.arc(node.x, node.y, 7, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#4CAF50'; // Lighter green leaves
    ctx.beginPath();
    ctx.arc(node.x + 3, node.y - 3, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(node.x - 3, node.y - 2, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(node.x, node.y + 3, 4, 0, 2 * Math.PI);
    ctx.fill();
}

function drawWoodNode(ctx, node) {
    // Tree: trunk and canopy
    const trunkWidth = 4;
    const trunkHeight = 10;
    ctx.fillStyle = '#5D4037'; // Brown trunk
    ctx.fillRect(node.x - trunkWidth / 2, node.y, trunkWidth, trunkHeight);

    ctx.fillStyle = '#388E3C'; // Dark green canopy
    ctx.beginPath();
    ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI);
    ctx.fill();
}

function drawStoneNode(ctx, node) {
    // Rock-like shape
    ctx.fillStyle = '#757575'; // Grey stone
    ctx.beginPath();
    ctx.moveTo(node.x - 6, node.y + 4);
    ctx.lineTo(node.x - 5, node.y - 5);
    ctx.lineTo(node.x + 2, node.y - 6);
    ctx.lineTo(node.x + 7, node.y - 2);
    ctx.lineTo(node.x + 5, node.y + 5);
    ctx.closePath();
    ctx.fill();

    // Mossy highlight
    ctx.fillStyle = 'rgba(76, 175, 80, 0.5)';
    ctx.beginPath();
    ctx.arc(node.x + 2, node.y - 2, 4, 0, 2 * Math.PI);
    ctx.fill();
}

function drawWaterNode(ctx, node) {
    // Puddle of water
    ctx.fillStyle = '#0097A7'; // Darker cyan
    ctx.beginPath();
    ctx.ellipse(node.x, node.y, 8, 6, 0, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#4DD0E1'; // Lighter cyan highlight
    ctx.beginPath();
    ctx.ellipse(node.x + 1, node.y - 1, 4, 2.5, 0, 0, 2 * Math.PI);
    ctx.fill();
}


export function drawResourceNodes(ctx, nodes) {
    nodes.forEach(node => {
        ctx.globalAlpha = Math.max(0.3, node.amount / node.maxAmount);
        switch(node.type) {
            case 'food':
                drawFoodNode(ctx, node);
                break;
            case 'wood':
                drawWoodNode(ctx, node);
                break;
            case 'stone':
                drawStoneNode(ctx, node);
                break;
            case 'water':
                drawWaterNode(ctx, node);
                break;
            default:
                ctx.fillStyle = '#ccc';
                ctx.beginPath();
                ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI);
                ctx.fill();
        }
    });
    ctx.globalAlpha = 1;
}

