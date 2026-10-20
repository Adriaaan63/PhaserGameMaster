import { Scene } from 'phaser';

export class BootScene extends Scene {
    public constructor() {
        super('BootScene');
    }

    public init(): void {
    }

    public preload(): void {
    }

    public create(): void {
        this.scene.start('PreloadScene');
    }

    public update(): void {
    }
}
