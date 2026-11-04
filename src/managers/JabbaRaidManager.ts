import { Scene } from 'phaser';

import { GAME_REGISTRY } from '../data/GameRegistry';
import { TILE } from '../data/constants';
import { Client } from '../entities/Client';
import { Player } from '../entities/Player';
import { Thug } from '../entities/Thug';
import {
    eventBus,
    EVENT_JABBA_RAID_ENDED,
    EVENT_JABBA_RAID_STARTED,
} from '../utils/EventBus';
import { ClientManager } from './ClientManager';
import {
    GridManager,
    TILE_TYPE_CHAIR,
    TILE_TYPE_TABLE,
} from './GridManager';
import { PathfindingManager } from './PathfindingManager';
import { PlacementManager } from './PlacementManager';

type RaidPhase = 'FORMING' | 'ATTACKING' | 'RETURNING' | 'FINISHED';

interface RaidFurnitureTarget {
    readonly key: string;
    readonly tileX: number;
    readonly tileY: number;
}

/** Coordinates the playable Jabba raid cinematic from entry to retreat. */
export class JabbaRaidManager {
    private raidActive = false;
    private phase: RaidPhase = 'FINISHED';
    private formationCenterX = 0;
    private formationCenterY = 0;
    private formationLineY = 0;
    private entrancePosition: { readonly tileX: number; readonly tileY: number } | null = null;
    private destroyedFurnitureCount = 0;
    private readonly thugs: Thug[] = [];
    private readonly destroyedFurnitureKeys = new Set<string>();
    private readonly pendingTargets = new Map<string, RaidFurnitureTarget>();

    private readonly handleRaidStarted = (): void => {
        if (this.raidActive) return;
        this.raidActive = true;
        this.phase = 'FORMING';
        this.destroyedFurnitureCount = 0;
        this.destroyedFurnitureKeys.clear();
        this.pendingTargets.clear();
        this.clientManager.setEnabled(false);
        this.player.setMovementEnabled(false);
        for (const client of this.clientManager.getClients()) client.fleeImmediately();
        this.spawnRaidThugs();
    };

    private readonly handleRaidEnded = (): void => {
        this.raidActive = false;
        this.phase = 'FINISHED';
        this.clientManager.setEnabled(true);
        this.player.setMovementEnabled(true);
    };

    public constructor(
        private readonly scene: Scene,
        private readonly player: Player,
        private readonly clientManager: ClientManager,
        private readonly grid: GridManager,
        private readonly pathfinding: PathfindingManager,
        private readonly placement: PlacementManager,
    ) {
        eventBus.on(EVENT_JABBA_RAID_STARTED, this.handleRaidStarted);
        eventBus.on(EVENT_JABBA_RAID_ENDED, this.handleRaidEnded);
    }

    public destroy(): void {
        eventBus.off(EVENT_JABBA_RAID_STARTED, this.handleRaidStarted);
        eventBus.off(EVENT_JABBA_RAID_ENDED, this.handleRaidEnded);
        for (const thug of this.thugs) thug.finish();
        this.thugs.length = 0;
        this.player.setMovementEnabled(true);
    }

    public get isActive(): boolean {
        return this.raidActive;
    }

    public update(deltaMs: number): void {
        if (!this.raidActive) return;
        if (this.phase === 'FORMING') {
            this.updateFormation(deltaMs);
            return;
        }
        for (const thug of this.thugs) thug.update(deltaMs);
        if (this.phase === 'ATTACKING') this.updateAttacks();
        if (this.phase === 'RETURNING') this.updateReturns();
    }

    private spawnRaidThugs(): void {
        const entrance = this.grid.getObjectZoneCenterTiles('cantina_entrada')[0];
        if (entrance === undefined) {
            throw new Error('No se encontró el objeto de entrada "cantina_entrada" para la incursión de Jabba.');
        }

        this.entrancePosition = entrance;
        this.formationCenterX = entrance.tileX * TILE + TILE / 2;
        this.formationCenterY = entrance.tileY * TILE + TILE / 2;
        this.formationLineY = this.getFormationLineY(this.formationCenterY);
        const config = GAME_REGISTRY.jabbaRaid;
        const halfSpacing = config.formationSpacing / 2;
        const offsets = [
            { x: -halfSpacing, y: 0 },
            { x: halfSpacing, y: 0 },
            { x: -halfSpacing, y: config.formationRowOffsetY },
            { x: halfSpacing, y: config.formationRowOffsetY },
        ];
        for (const offset of offsets.slice(0, config.thugCount)) {
            const thug = new Thug(
                this.scene,
                this.formationCenterX + offset.x,
                this.formationCenterY + offset.y,
                config.thugSpeed,
                config.thugBodyWidth,
                config.thugBodyHeight,
                config.thugColor,
            );
            thug.setFormationState();
            this.thugs.push(thug);
        }
    }

    private updateFormation(deltaMs: number): void {
        const distance = GAME_REGISTRY.jabbaRaid.marchSpeed * deltaMs / 1000;
        this.formationCenterY += distance;
        const halfSpacing = GAME_REGISTRY.jabbaRaid.formationSpacing / 2;
        const rowOffset = GAME_REGISTRY.jabbaRaid.formationRowOffsetY;
        const offsets = [
            { x: -halfSpacing, y: 0 },
            { x: halfSpacing, y: 0 },
            { x: -halfSpacing, y: rowOffset },
            { x: halfSpacing, y: rowOffset },
        ];
        this.thugs.forEach((thug, index) => {
            const offset = offsets[index];
            if (offset === undefined) return;
            thug.setPosition(this.formationCenterX + offset.x, this.formationCenterY + offset.y);
            thug.setDepth(thug.y + thug.height);
        });
        if (this.formationCenterY < this.formationLineY) return;
        this.assignFurnitureTargets();
    }

    private assignFurnitureTargets(): void {
        const targets = this.findOperationalFurniture();
        if (targets.length < this.thugs.length) {
            this.finishRaidWithoutTargets();
            return;
        }
        this.phase = 'ATTACKING';
        this.thugs.forEach((thug, index) => {
            const target = targets[index];
            if (target === undefined) return;
            const route = this.pathfinding.findPathToAdjacent(
                thug.currentTile,
                { tileX: target.tileX, tileY: target.tileY },
            );
            if (route === null) {
                this.finishRaidWithoutTargets();
                return;
            }
            this.pendingTargets.set(target.key, target);
            thug.assignTarget(route, target.key);
        });
    }

    private updateAttacks(): void {
        for (const thug of this.thugs) {
            if (thug.currentState !== 'ATTACKING' || !thug.hasReachedRouteEnd()) continue;
            const targetKey = thug.assignedTargetKey;
            if (targetKey === null) continue;
            thug.startExplosion();
            this.playExplosion(thug, targetKey);
        }
        if (this.thugs.every((thug) => thug.currentState === 'EXPLODING' || thug.currentState === 'RETURNING')) {
            this.phase = 'RETURNING';
        }
    }

    private updateReturns(): void {
        for (const thug of this.thugs) {
            if (thug.currentState === 'EXPLODING' && thug.isExplosionComplete) {
                this.tryAssignReturnRoute(thug);
            }
            if (thug.currentState !== 'RETURNING' || !thug.hasReachedRouteEnd()) continue;
            thug.finish();
            this.destroyedFurnitureCount++;
        }
        if (this.destroyedFurnitureCount < this.thugs.length) return;
        eventBus.emit(EVENT_JABBA_RAID_ENDED, {
            destroyedFurnitureCount: this.destroyedFurnitureCount,
        });
    }

    private playExplosion(thug: Thug, targetKey: string): void {
        const target = this.pendingTargets.get(targetKey);
        if (target === undefined) return;
        const effect = this.scene.add.circle(
            target.tileX * TILE + TILE / 2,
            target.tileY * TILE + TILE / 2,
            TILE / 4,
            GAME_REGISTRY.jabbaRaid.explosionColor,
        ).setDepth(target.tileY * TILE + TILE);
        this.scene.tweens.add({
            targets: effect,
            scale: 3,
            alpha: 0,
            duration: GAME_REGISTRY.jabbaRaid.explosionDurationMs,
            onComplete: () => {
                effect.destroy();
                this.placement.markFurnitureDestroyed(target.tileX, target.tileY);
                thug.completeExplosion();
                this.tryAssignReturnRoute(thug);
            },
        });
    }

    private tryAssignReturnRoute(thug: Thug): void {
        if (thug.currentState !== 'EXPLODING' || this.entrancePosition === null) return;
        const route = this.pathfinding.findPath(
            thug.currentTile,
            this.entrancePosition,
        ) ?? this.pathfinding.findPathToAdjacent(
            thug.currentTile,
            this.entrancePosition,
        );
        if (route !== null) thug.assignReturnRoute(route);
    }

    private findOperationalFurniture(): RaidFurnitureTarget[] {
        const results: RaidFurnitureTarget[] = [];
        const seen = new Set<string>();
        for (let tileY = 0; tileY < this.grid.tilemap.height; tileY++) {
            for (let tileX = 0; tileX < this.grid.tilemap.width; tileX++) {
                const entry = this.grid.getFurnitureAt(tileX, tileY);
                const tileType = this.grid.getTileTypeAtGrid(tileX, tileY);
                if (
                    entry === null
                    && tileType !== TILE_TYPE_TABLE
                    && tileType !== TILE_TYPE_CHAIR
                ) continue;
                const rootX = entry?.rootX ?? tileX;
                const rootY = entry?.rootY ?? tileY;
                const key = `${rootX}:${rootY}`;
                if (seen.has(key) || this.grid.isFurnitureDestroyed(rootX, rootY)) continue;
                seen.add(key);
                results.push({ key, tileX: rootX, tileY: rootY });
                if (results.length === GAME_REGISTRY.jabbaRaid.thugCount) return results;
            }
        }
        return results;
    }

    private getFormationLineY(entranceY: number): number {
        const queueTiles = this.grid.getObjectZoneCenterTiles('zonaColaEntrada');
        const queueLine = queueTiles.reduce(
            (line, tile) => Math.max(line, tile.tileY * TILE + TILE / 2),
            entranceY,
        );
        return Math.max(entranceY, queueLine);
    }

    private finishRaidWithoutTargets(): void {
        for (const thug of this.thugs) thug.finish();
        this.destroyedFurnitureCount = this.thugs.length;
        eventBus.emit(EVENT_JABBA_RAID_ENDED, {
            destroyedFurnitureCount: this.destroyedFurnitureCount,
        });
    }
}
