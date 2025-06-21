const firstNames = [
    'Alex', 'Blake', 'Casey', 'Drew', 'Ember', 'Finn', 'Gray', 'Haven',
    'Iris', 'Juno', 'Kit', 'Lane', 'Moss', 'Nova', 'Oak', 'Pine',
    'Quinn', 'River', 'Sage', 'Teal', 'Uma', 'Vale', 'Wren', 'Zara'
];

const lastNames = [
    'Ashworth', 'Brightwater', 'Clearspring', 'Driftwood', 'Evergreen',
    'Fieldstone', 'Goldleaf', 'Heartwood', 'Ironwood', 'Moonstone',
    'Oakenheart', 'Riverbend', 'Starweaver', 'Thornfield', 'Willowbrook'
];

export function generateName() {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    return `${firstName} ${lastName}`;
}

export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

export function randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
}

export function weightedRandom(items, weights) {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return items[i];
        }
    }
    
    return items[0];
}

