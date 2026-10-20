import { Scene } from 'phaser';

export class PreloadScene extends Scene {
    public constructor() {
        super('PreloadScene');
    }

    public init(): void {
    }

    public preload(): void {
    }

    public create(): void {
        this.scene.start('NightCantinaScene');
        this.scene.launch('UIScene');
    }

    public update(): void {
    }
}
