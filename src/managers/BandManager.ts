import { Scene, Time } from 'phaser';

import { BAND_PLAYING_DURATION_MS, type BandConfig } from '../data/GameRegistry';
import { TILE } from '../data/constants';
import { BithBandMember } from '../entities/BithBandMember';
import { EVENT_BAND_STARTED, eventBus, type BandStartedData } from '../utils/EventBus';
import type { GridManager } from './GridManager';

/** Places and coordinates the four stationary musicians on the Tiled band zone. */
export class BandManager {
    private readonly members: BithBandMember[];
    private readonly bandTiles: readonly { readonly tileX: number; readonly tileY: number }[];
    private performanceTimer: Time.TimerEvent | null = null;
    private playing = false;

    public constructor(
        private readonly scene: Scene,
        grid: GridManager,
        private readonly config: BandConfig,
    ) {
        this.bandTiles = grid.getObjectZoneTiles('zonaBanda');
        this.members = this.createMembers();

        if (this.bandTiles.length === 0) {
            console.warn('No se encontraron tiles para "zonaBanda" en el mapa.');
        }
    }

    public get isBandPlaying(): boolean {
        return this.playing;
    }

    /** Returns true when the player's facing tile is in or next to the stage zone. */
    public isInteractionTile(tileX: number, tileY: number): boolean {
        return this.bandTiles.some((tile) => (
            Math.abs(tile.tileX - tileX) + Math.abs(tile.tileY - tileY)
            <= this.config.interactionRadiusTiles
        ));
    }

    /** Starts one timed performance and notifies audio and music-order listeners. */
    public startPerformance(): boolean {
        if (this.playing || this.members.length === 0) return false;

        this.playing = true;
        for (const member of this.members) member.setPlaying(true);
        this.performanceTimer = this.scene.time.delayedCall(
            BAND_PLAYING_DURATION_MS,
            this.stopPerformance,
            [],
            this,
        );
        const data: BandStartedData = { durationMs: BAND_PLAYING_DURATION_MS };
        eventBus.emit(EVENT_BAND_STARTED, data);
        return true;
    }

    public destroy(): void {
        this.performanceTimer?.remove(false);
        this.performanceTimer = null;
        this.playing = false;
        for (const member of this.members) member.destroy();
        this.members.length = 0;
    }

    private stopPerformance(): void {
        this.performanceTimer = null;
        this.playing = false;
        for (const member of this.members) member.setPlaying(false);
    }

    private createMembers(): BithBandMember[] {
        if (this.bandTiles.length === 0 || this.config.memberBodyColors.length === 0) return [];

        const minTileX = Math.min(...this.bandTiles.map((tile) => tile.tileX));
        const maxTileX = Math.max(...this.bandTiles.map((tile) => tile.tileX));
        const minTileY = Math.min(...this.bandTiles.map((tile) => tile.tileY));
        const maxTileY = Math.max(...this.bandTiles.map((tile) => tile.tileY));
        const zoneWidth = maxTileX - minTileX + 1;
        const centerRow = (minTileY + maxTileY + 1) / 2;
        const members: BithBandMember[] = [];

        for (let index = 0; index < this.config.memberCount; index++) {
            const columnRatio = (index + 0.5) / this.config.memberCount;
            const tileX = minTileX + zoneWidth * columnRatio;
            const tileY = centerRow;
            const colorIndex = index % this.config.memberBodyColors.length;
            const bodyColor = this.config.memberBodyColors[colorIndex];
            if (bodyColor === undefined) continue;

            const member = new BithBandMember(
                this.scene,
                tileX * TILE,
                tileY * TILE,
                bodyColor,
                this.config,
            );
            members.push(member);
        }

        return members;
    }
}
