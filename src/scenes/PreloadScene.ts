import { Scene } from 'phaser';

import {
    PLAYER_FRAME_HEIGHT,
    PLAYER_FRAME_WIDTH,
    PLAYER_SPRITESHEET_KEY,
    TEXTURE_DRINK_EMPTY,
    TEXTURE_DRINK_FULL,
    TEXTURE_FOOD,
} from '../data/constants';
import { FURNITURE_REGISTRY } from '../data/FurnitureRegistry';

const PLAYER_SPRITESHEET_URL = new URL('../../assets/images/WuherAndar.png', import.meta.url).href;
const FOOD_SPRITE_URL = new URL('../../assets/sprites/kitchen_props2_4.png', import.meta.url).href;
const DRINK_FULL_SPRITE_URL = new URL('../../assets/sprites/kitchen_props_3.png', import.meta.url).href;
const DRINK_EMPTY_SPRITE_URL = new URL('../../assets/sprites/kitchen_props2_25.png', import.meta.url).href;

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

        // Load furniture sprites registered in the data-driven registry
        for (const config of Object.values(FURNITURE_REGISTRY)) {
            const spriteUrl = new URL(`../../assets/sprites/${config.texture}.png`, import.meta.url).href;
            this.load.image(config.texture, spriteUrl);
        }

        // Load kitchen items (food, full drink, empty drink)
        this.load.image(TEXTURE_FOOD, FOOD_SPRITE_URL);
        this.load.image(TEXTURE_DRINK_FULL, DRINK_FULL_SPRITE_URL);
        this.load.image(TEXTURE_DRINK_EMPTY, DRINK_EMPTY_SPRITE_URL);
    }

    public create(): void {
        this.scene.start('NightCantinaScene');
        this.scene.launch('UIScene');
    }

    public update(): void {
    }
}
