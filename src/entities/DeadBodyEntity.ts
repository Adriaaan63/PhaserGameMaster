import { GameObjects, Physics, Scene } from 'phaser';

import { GAME_REGISTRY, type GameRegistry } from '../data/GameRegistry';
import { TILE } from '../data/constants';

/** Persistent, blocking corpse and blood pool created after an unresolved fight. */
export class DeadBodyEntity extends GameObjects.Container {
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
        this.add([blood, corpse]);
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

}
