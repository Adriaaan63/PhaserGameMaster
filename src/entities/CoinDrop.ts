import { Physics, Scene } from 'phaser';

import { GAME_REGISTRY, type EconomyConfig } from '../data/GameRegistry';

const COIN_TEXTURE_KEY = 'generated-credit-coin';

/** Persistent physical credit pickup. Arcade overlap supplies trigger behavior. */
export class CoinDrop extends Physics.Arcade.Image {
    public readonly value: number;
    public readonly lootGroupId: number;
    public readonly createdAt: number;
    private disposition: 'AVAILABLE' | 'ASSIGNED' | 'CARRIED' | 'COLLECTED' | 'STOLEN' = 'AVAILABLE';

    public constructor(
        scene: Scene,
        x: number,
        y: number,
        value: number,
        lootGroupId: number,
        economy: EconomyConfig = GAME_REGISTRY.economy,
    ) {
        CoinDrop.ensureTexture(scene, economy);
        super(scene, x, y, COIN_TEXTURE_KEY);

        this.value = value;
        this.lootGroupId = lootGroupId;
        this.createdAt = scene.time.now;

        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setCircle(economy.coinRadius);
        const body = this.body;
        if (body instanceof Physics.Arcade.Body) {
            body.setAllowGravity(false);
        }
        this.setDepth(y);
    }

    public update(): void {
        this.setDepth(this.y);
    }

    public get ageMs(): number {
        return Math.max(0, this.scene.time.now - this.createdAt);
    }

    public assignToRat(): boolean {
        if (this.disposition !== 'AVAILABLE') return false;
        this.disposition = 'ASSIGNED';
        return true;
    }

    public collectByRat(): boolean {
        if (this.disposition !== 'ASSIGNED') return false;
        this.disposition = 'CARRIED';
        this.setVisible(false);
        const body = this.body;
        if (body instanceof Physics.Arcade.Body) body.enable = false;
        return true;
    }

    public dropFromRat(x: number, y: number): boolean {
        if (this.disposition !== 'ASSIGNED' && this.disposition !== 'CARRIED') return false;
        this.disposition = 'AVAILABLE';
        this.setPosition(x, y);
        this.setVisible(true);
        const body = this.body;
        if (body instanceof Physics.Arcade.Body) {
            body.reset(x, y);
            body.enable = true;
        }
        return true;
    }

    public releaseFromRat(): boolean {
        if (this.disposition !== 'ASSIGNED') return false;
        this.disposition = 'AVAILABLE';
        return true;
    }

    /** Claims this drop exactly once, whether Wuher collects it or a rat steals it. */
    public claim(disposition: 'COLLECTED' | 'STOLEN'): boolean {
        if (
            this.disposition !== 'AVAILABLE'
            && this.disposition !== 'ASSIGNED'
            && this.disposition !== 'CARRIED'
        ) return false;
        this.disposition = disposition;
        this.destroy();
        return true;
    }

    private static ensureTexture(scene: Scene, economy: EconomyConfig): void {
        if (scene.textures.exists(COIN_TEXTURE_KEY)) return;

        const diameter = economy.coinRadius * 2;
        const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
        graphics.fillStyle(economy.coinColor, 1);
        graphics.fillCircle(economy.coinRadius, economy.coinRadius, economy.coinRadius);
        graphics.lineStyle(economy.coinOutlineWidth, economy.coinOutlineColor, 1);
        graphics.strokeCircle(economy.coinRadius, economy.coinRadius, economy.coinRadius);
        graphics.generateTexture(COIN_TEXTURE_KEY, diameter, diameter);
        graphics.destroy();
    }
}
