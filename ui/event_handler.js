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

    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const clickedBuilding = findClickedBuilding(x, y, world);
        if (clickedBuilding) {
            ui.selectBuilding(clickedBuilding);
            return;
        }

        const clickedEntity = findClickedEntity(x, y, world);
        if (clickedEntity) {
            ui.selectEntity(clickedEntity);
        } else {
            ui.deselect();
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

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

