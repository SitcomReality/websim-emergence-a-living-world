export class EventSystem {
    constructor() {
        this.events = [];
        this.maxEvents = 50;
    }

    addEvent(message) {
        const event = {
            message: message,
            timestamp: Date.now(),
            id: Math.random().toString(36).substring(2, 9)
        };
        
        this.events.unshift(event);
        
        if (this.events.length > this.maxEvents) {
            this.events = this.events.slice(0, this.maxEvents);
        }
    }

    getRecentEvents(count = 10) {
        return this.events.slice(0, count);
    }

    clear() {
        this.events = [];
    }
}

