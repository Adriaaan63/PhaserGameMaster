import { Scene } from 'phaser';

import {
    PLAYER_FRAME_HEIGHT,
    PLAYER_FRAME_WIDTH,
    PLAYER_SPRITESHEET_KEY,
} from '../data/constants';
import { FURNITURE_REGISTRY } from '../data/FurnitureRegistry';

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

        // Load every furniture sprite registered in the data-driven registry
        for (const config of Object.values(FURNITURE_REGISTRY)) {
            const spriteUrl = new URL(`../../assets/sprites/${config.texture}.png`, import.meta.url).href;
            this.load.image(config.texture, spriteUrl);
        }
    }

    public create(): void {
        this.scene.start('NightCantinaScene');
        this.scene.launch('UIScene');
    }

    public update(): void {
    }
}
