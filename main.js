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
    }

    start() {
        this.world.initialize();
        this.ui.initialize();
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