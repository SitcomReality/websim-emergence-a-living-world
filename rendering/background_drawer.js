export function drawBackground(ctx, width, height) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#134E5E'); // Deep jungle blue-green
    gradient.addColorStop(1, '#71B280'); // Lighter, leafy green
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
}

