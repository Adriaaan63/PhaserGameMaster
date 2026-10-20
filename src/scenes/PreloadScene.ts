import { Scene } from 'phaser';

const PLAYER_TEXTURE_KEY = 'player-placeholder';
const PLAYER_TEXTURE_URL = new URL('../../assets/sprites/player.png', import.meta.url).href;

export class PreloadScene extends Scene {
    public constructor() {
        super('PreloadScene');
    }

    public init(): void {
    }

    public preload(): void {
        this.load.image(PLAYER_TEXTURE_KEY, PLAYER_TEXTURE_URL);
    }

    public create(): void {
        this.scene.start('NightCantinaScene');
        this.scene.launch('UIScene');
    }

    public update(): void {
    }
}
