import { AUTO, Game, Scale, type Types } from 'phaser';

import { GAME_HEIGHT, GAME_WIDTH } from '../data/constants';
import { BootScene } from '../scenes/BootScene';
import { NightCantinaScene } from '../scenes/NightCantinaScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { UIScene } from '../scenes/UIScene';

const GAME_PARENT = 'juego';

const gameConfig: Types.Core.GameConfig = {
    type: AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: GAME_PARENT,
    pixelArt: true,
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: {
                x: 0,
                y: 0
            },
            debug: false
        }
    },
    scene: [BootScene, PreloadScene, NightCantinaScene, UIScene]
};

new Game(gameConfig);
