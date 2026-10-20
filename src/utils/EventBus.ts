import { Events } from 'phaser';

export const EVENT_GAME_READY = 'game-ready';

export class EventBus extends Events.EventEmitter {
}

export const eventBus = new EventBus();
