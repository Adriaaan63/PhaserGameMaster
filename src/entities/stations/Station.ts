import type { GameObjects } from 'phaser';

export interface Station extends GameObjects.GameObject {
    readonly tileX: number;
    readonly tileY: number;
}
