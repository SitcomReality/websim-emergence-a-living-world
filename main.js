import { World } from './world.js';
import { UI } from './ui.js';

class EmergenceGame {
    constructor() {
        this.world = new World();
        this.ui = new UI(this.world);
        this.isRunning = true;
        this.speed = 1;
        this.lastTime = 0;
        this.targetFPS = 60;
        this.frameTime = 1000 / this.targetFPS;
        
        this.initializeControls();
        this.start();
    }

    initializeControls() {
        const playBtn = document.getElementById('playBtn');
        const speedBtn = document.getElementById('speedBtn');
        const resetBtn = document.getElementById('resetBtn');
        const saveBtn = document.getElementById('saveBtn');
        const loadBtn = document.getElementById('loadBtn');

        playBtn.addEventListener('click', () => {
            this.isRunning = !this.isRunning;
            playBtn.textContent = this.isRunning ? '⏸️' : '▶️';
            playBtn.classList.toggle('active', this.isRunning);
        });

        speedBtn.addEventListener('click', () => {
            const speeds = [1, 2, 4];
            const currentSpeedIndex = speeds.indexOf(this.speed);
            this.speed = speeds[(currentSpeedIndex + 1) % speeds.length];
            speedBtn.textContent = `${this.speed}x`;
        });

        resetBtn.addEventListener('click', () => {
            this.world.reset();
            this.ui.reset();
            this.world.initialize();
            this.ui.initialize();
        });

        saveBtn.addEventListener('click', () => this.saveGame());
        loadBtn.addEventListener('click', () => this.loadGame());
    }

    saveGame() {
        const wasRunning = this.isRunning;
        this.isRunning = false;
        try {
            const saveData = this.world.serialize();
            localStorage.setItem('emergenceSaveData', JSON.stringify(saveData));
            console.log('Game saved!');
            this.world.eventSystem.addEvent("World state saved.");
        } catch (e) {
            console.error("Failed to save game:", e);
            this.world.eventSystem.addEvent("Error: Could not save world state.");
        }
        this.isRunning = wasRunning;
    }

    loadGame() {
        const saveDataString = localStorage.getItem('emergenceSaveData');
        if (saveDataString) {
            this.isRunning = false;
            try {
                const saveData = JSON.parse(saveDataString);
                this.world.deserialize(saveData);
                this.ui.reset();
                this.ui.initialize(); // Re-initialize UI with new world state
                this.world.eventSystem.addEvent("World state loaded.");
                console.log('Game loaded!');
            } catch (e) {
                console.error("Failed to load game:", e);
                this.world.eventSystem.addEvent("Error: Could not load world state. Starting new world.");
                this.world.initialize();
            }
            this.isRunning = true;
        } else {
            console.log('No save data found.');
            this.world.eventSystem.addEvent("No save data found.");
        }
    }

    async start() {
        this.world.initialize();
        await this.ui.initialize();
        this.gameLoop();
    }

    gameLoop(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        
        if (deltaTime >= this.frameTime / this.speed) {
            if (this.isRunning) {
                this.world.update(deltaTime);
                this.ui.update();
            }
            this.lastTime = currentTime;
        }

        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// Start the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new EmergenceGame();
});