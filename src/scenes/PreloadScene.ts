import { Scene } from 'phaser';

import {
    PLAYER_FRAME_HEIGHT,
    PLAYER_FRAME_WIDTH,
    PLAYER_SPRITESHEET_KEY,
} from '../data/constants';

const PLAYER_SPRITESHEET_URL = new URL('../../assets/images/WuherAndar.png', import.meta.url).href;

export class PreloadScene extends Scene {
    public constructor() {
        super('PreloadScene');
    }

    public init(): void {
    }

    public preload(): void {
        this.load.spritesheet(PLAYER_SPRITESHEET_KEY, PLAYER_SPRITESHEET_URL, {
            frameWidth: PLAYER_FRAME_WIDTH,
            frameHeight: PLAYER_FRAME_HEIGHT,
        });
    }

    public create(): void {
        this.scene.start('NightCantinaScene');
        this.scene.launch('UIScene');
    }

    public update(): void {
    }
}
