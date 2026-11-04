import { GameObjects, Scene } from 'phaser';

import { GAME_REGISTRY } from '../data/GameRegistry';
import type { ClientPosition } from './Client';

/** Visual wall prop used as the in-world interaction point for the wanted poster. */
export class WantedPoster extends GameObjects.Container {
    public readonly tilePosition: ClientPosition;

    public constructor(
        scene: Scene,
        tilePosition: ClientPosition,
        worldPosition: { readonly x: number; readonly y: number },
        depth: number,
        onInteract: () => void,
    ) {
        const config = GAME_REGISTRY.wanted;
        const width = 48;
        const height = 56;
        const paper = scene.add.rectangle(0, 0, width, height, config.posterBackgroundColor)
            .setStrokeStyle(3, config.posterPanelColor);
        const title = scene.add.text(0, -height / 2 + 8, 'BUSCA', {
            fontFamily: 'monospace',
            fontSize: '9px',
            color: `#${config.posterDetailColor.toString(16).padStart(6, '0')}`,
            fontStyle: 'bold',
        }).setOrigin(0.5);
        const portrait = scene.add.rectangle(0, 4, 22, 22, config.posterPanelColor);
        const prompt = scene.add.text(0, height / 2 - 9, '[Space]', {
            fontFamily: 'monospace',
            fontSize: '9px',
            color: `#${config.posterDetailColor.toString(16).padStart(6, '0')}`,
        }).setOrigin(0.5);

        super(scene, worldPosition.x, worldPosition.y, [
            paper,
            title,
            portrait,
            prompt,
        ]);
        this.tilePosition = tilePosition;
        this.setDepth(depth);
        this.setSize(width, height);
        this.setInteractive({ useHandCursor: true });
        this.on('pointerdown', onInteract);
        scene.add.existing(this);
    }
}
