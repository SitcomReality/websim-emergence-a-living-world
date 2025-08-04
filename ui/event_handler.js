function findClickableObjectsAt(x, y, world) {
    const clickables = [];
    
    // First, find all entities at this position (they get priority)
    const entities = world.getEntities().filter(entity => {
        const dx = entity.x - x;
        const dy = entity.y - y;
        return Math.sqrt(dx * dx + dy * dy) < 15; // 15px click radius
    });
    
    entities.forEach(entity => {
        clickables.push({ type: 'entity', object: entity });
    });
    
    // Then, find all buildings at this position
    const buildings = world.getBuildings().filter(building => {
        const range = building.width / 2 + 2;
        const dx = building.x - x;
        const dy = building.y - y;
        return Math.sqrt(dx * dx + dy * dy) < range;
    });
    
    buildings.forEach(building => {
        clickables.push({ type: 'building', object: building });
    });
    
    return clickables;
}

function findClickedBuilding(x, y, world) {
    return world.getBuildings().find(building => {
        const range = building.width / 2 + 2;
        const dx = building.x - x;
        const dy = building.y - y;
        return Math.sqrt(dx * dx + dy * dy) < range;
    });
}

function findClickedEntity(x, y, world) {
    return world.getEntities().find(entity => {
        const dx = entity.x - x;
        const dy = entity.y - y;
        return Math.sqrt(dx * dx + dy * dy) < 15; // 15px click radius
    });
}

export function setupEventListeners(ui) {
    const { canvas, world } = ui;
    
    // Track selection cycling state
    let lastClickPosition = null;
    let lastClickTime = 0;
    let clickCycleIndex = 0;
    let clickableObjectsAtPosition = [];
    
    const CLICK_CYCLE_TIMEOUT = 2000; // 2 seconds to continue cycling
    const CLICK_POSITION_TOLERANCE = 10; // pixels

    function getScaledCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        return { x, y };
    }

    canvas.addEventListener('click', (e) => {
        const { x, y } = getScaledCoordinates(e);
        const currentTime = Date.now();
        
        // Check if this click is close to the last click position and within time limit
        const isContinuingCycle = lastClickPosition && 
            Math.abs(lastClickPosition.x - x) <= CLICK_POSITION_TOLERANCE &&
            Math.abs(lastClickPosition.y - y) <= CLICK_POSITION_TOLERANCE &&
            (currentTime - lastClickTime) <= CLICK_CYCLE_TIMEOUT;
        
        if (isContinuingCycle) {
            // Continue cycling through objects at this position
            clickCycleIndex = (clickCycleIndex + 1) % Math.max(1, clickableObjectsAtPosition.length);
        } else {
            // New click position or timeout - reset cycling
            clickableObjectsAtPosition = findClickableObjectsAt(x, y, world);
            clickCycleIndex = 0;
        }
        
        // Update click tracking
        lastClickPosition = { x, y };
        lastClickTime = currentTime;
        
        // Select the appropriate object
        if (clickableObjectsAtPosition.length > 0) {
            // Ensure index is still valid (objects might have moved/disappeared)
            if (clickCycleIndex >= clickableObjectsAtPosition.length) {
                clickCycleIndex = 0;
                // Refresh the list of clickable objects
                clickableObjectsAtPosition = findClickableObjectsAt(x, y, world);
            }
            
            if (clickableObjectsAtPosition.length > 0) {
                const selected = clickableObjectsAtPosition[clickCycleIndex];
                
                if (selected.type === 'entity') {
                    ui.selectEntity(selected.object);
                } else if (selected.type === 'building') {
                    ui.selectBuilding(selected.object);
                }
            } else {
                ui.deselect();
            }
        } else {
            ui.deselect();
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        const { x, y } = getScaledCoordinates(e);

        const foundEntity = findClickedEntity(x, y, world);
        if (ui.hoveredEntity !== foundEntity) {
            ui.hoveredEntity = foundEntity;
        }

        const foundBuilding = findClickedBuilding(x, y, world);
        if (ui.hoveredBuilding !== foundBuilding) {
            ui.hoveredBuilding = foundBuilding;
        }
    });

    canvas.addEventListener('mouseleave', () => {
        ui.hoveredEntity = null;
        ui.hoveredBuilding = null;
    });

    const originalAddEvent = world.eventSystem.addEvent;
    world.eventSystem.addEvent = (message) => {
        originalAddEvent.call(world.eventSystem, message);
        ui.updateEventLog(); 
    };
}