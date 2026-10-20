import { AUTO, Game as PhaserGame, Scale, type Types } from 'phaser';

import { BootScene } from '../scenes/BootScene';
import { NightCantinaScene } from '../scenes/NightCantinaScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { UIScene } from '../scenes/UIScene';

const GAME_PARENT = 'juego';

function createGameConfig(): Types.Core.GameConfig {
    return {
        type: AUTO,
        width: 1280,
        height: 720,
        parent: GAME_PARENT,
        backgroundColor: '#17131f',
        scale: {
            mode: Scale.RESIZE,
            autoCenter: Scale.CENTER_BOTH
        },
        scene: [BootScene, PreloadScene, NightCantinaScene, UIScene]
    };
}

export class Game extends PhaserGame {
    public constructor() {
        super(createGameConfig());
    }
}
