import { GameObjects, Physics, Scene } from 'phaser';

import { GAME_REGISTRY, type GameRegistry } from '../data/GameRegistry';
import { TILE } from '../data/constants';

/** Persistent, blocking corpse and blood pool created after an unresolved fight. */
export class DeadBodyEntity extends GameObjects.Container {
    private readonly progressBackground: GameObjects.Rectangle;
    private readonly progressFill: GameObjects.Rectangle;

    public constructor(
        scene: Scene,
        public readonly tileX: number,
        public readonly tileY: number,
        private readonly registry: GameRegistry = GAME_REGISTRY,
    ) {
        super(scene, tileX * TILE + TILE / 2, tileY * TILE + TILE / 2);
        this.setExclusive(true);
        const aftermath = registry.aftermath;
        const blood = scene.add.ellipse(
            0,
            registry.combat.bloodPoolOffsetY,
            registry.combat.bloodPoolWidth,
            registry.combat.bloodPoolHeight,
            registry.combat.bloodPoolColor,
        );
        const corpse = scene.add.rectangle(
            0,
            0,
            aftermath.bloodBodyWidth,
            aftermath.bloodBodyHeight,
            registry.combat.corpseColor,
        ).setAngle(registry.combat.corpseRotation).setAlpha(registry.combat.corpseAlpha);
        this.progressBackground = scene.add.rectangle(
            0,
            aftermath.progressBarOffsetY,
            aftermath.progressBarWidth,
            aftermath.progressBarHeight,
            aftermath.progressBarBackgroundColor,
        ).setVisible(false);
        this.progressFill = scene.add.rectangle(
            -aftermath.progressBarWidth / 2,
            aftermath.progressBarOffsetY,
            aftermath.progressBarWidth,
            aftermath.progressBarHeight,
            aftermath.progressBarFillColor,
        ).setOrigin(0, 0.5).setScale(0, 1).setVisible(false);
        this.add([blood, corpse, this.progressBackground, this.progressFill]);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        const body = this.body;
        if (!(body instanceof Physics.Arcade.Body)) {
            throw new Error('No se pudo crear el cuerpo físico del cadáver.');
        }
        body
            .setSize(aftermath.corpseCollisionWidth, aftermath.corpseCollisionHeight)
            .setOffset(-aftermath.corpseCollisionWidth / 2, -aftermath.corpseCollisionHeight / 2)
            .setAllowGravity(false)
            .setImmovable(true);
        body.pushable = false;
        body.moves = false;
        this.setDepth(this.y);
    }

    public setCleaningProgress(ratio: number): void {
        this.progressBackground.setVisible(true);
        this.progressFill.setVisible(true).setScale(Math.max(0, Math.min(1, ratio)), 1);
    }

    public resetCleaningProgress(): void {
        this.progressBackground.setVisible(false);
        this.progressFill.setVisible(false).setScale(0, 1);
    }
}
