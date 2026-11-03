import { GameObjects, Scene, Tweens } from 'phaser';

import type { BandConfig } from '../data/GameRegistry';

export type BandMemberState = 'IDLE' | 'PLAYING';

/** Simple procedural stand-in for one Bith musician until character art is ready. */
export class BithBandMember extends GameObjects.Container {
    private readonly baseY: number;
    private playingTween: Tweens.Tween | null = null;
    private currentState: BandMemberState = 'IDLE';

    public constructor(
        scene: Scene,
        x: number,
        y: number,
        bodyColor: number,
        private readonly config: BandConfig,
    ) {
        super(scene, x, y);
        this.baseY = y;

        const body = scene.add.rectangle(
            0,
            config.memberHeadRadius,
            config.memberBodyWidth,
            config.memberBodyHeight,
            bodyColor,
        );
        const head = scene.add.circle(
            0,
            -config.memberHeadRadius,
            config.memberHeadRadius,
            bodyColor,
        );
        const instrument = scene.add.rectangle(
            config.memberBodyWidth / 2,
            1,
            config.instrumentWidth,
            config.instrumentHeight,
            config.instrumentColor,
        );
        const instrumentBell = scene.add.circle(
            config.memberBodyWidth / 2 + config.instrumentWidth / 2,
            1,
            config.instrumentHeight,
            config.instrumentColor,
        );
        this.add([body, head, instrument, instrumentBell]);
        scene.add.existing(this);
        this.setDepth(y);
    }

    public get bandMemberState(): BandMemberState {
        return this.currentState;
    }

    public setPlaying(playing: boolean): void {
        const nextState: BandMemberState = playing ? 'PLAYING' : 'IDLE';
        if (this.currentState === nextState) return;
        this.currentState = nextState;
        this.playingTween?.stop();
        this.playingTween = null;

        if (!playing) {
            this.setPosition(this.x, this.baseY).setAngle(0);
            return;
        }

        this.playingTween = this.scene.tweens.add({
            targets: this,
            y: this.baseY - this.config.playingBobOffset,
            angle: this.config.playingBobOffset,
            duration: this.config.playingAnimationDurationMs,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut',
        });
    }

    public override destroy(fromScene?: boolean): void {
        this.playingTween?.stop();
        this.playingTween = null;
        super.destroy(fromScene);
    }
}
