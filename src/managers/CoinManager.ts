import { Physics, Scene } from 'phaser';

import { TILE } from '../data/constants';
import {
    CREDITS_REGISTRY_KEY,
    GAME_REGISTRY,
    type EconomyConfig,
    type GameRegistry,
} from '../data/GameRegistry';
import { CoinDrop } from '../entities/CoinDrop';
import type { Player } from '../entities/Player';
import type { ClientPosition } from '../entities/Client';
import { PathfindingManager } from './PathfindingManager';
import {
    eventBus,
    EVENT_COIN_COLLECTED,
    EVENT_COIN_STOLEN,
    type CoinCollectedData,
    type CoinStolenData,
} from '../utils/EventBus';

/** Owns persistent coin drops and arbitrates collection versus future rat theft. */
export class CoinManager {
    private readonly coins: Physics.Arcade.Group;
    private getBlockedPositions: () => readonly ClientPosition[] = () => [];

    public constructor(
        private readonly scene: Scene,
        private readonly player: Player,
        private readonly pathfinding: PathfindingManager,
        private readonly registry: GameRegistry = GAME_REGISTRY,
    ) {
        this.coins = scene.physics.add.group();
        scene.physics.add.overlap(this.player, this.coins, this.handlePlayerOverlap, undefined, this);
    }

    public spawnSatisfiedClientReward(x: number, y: number, economy: EconomyConfig = this.registry.economy): void {
        const playerTile = this.getPlayerTile();
        const clientTile = this.getTilePosition(x, y);
        const reachableTiles = this.pathfinding.getReachableFloorTiles(
            playerTile,
            economy.coinPlacementSearchRadiusTiles,
            this.getBlockedPositions(),
        );
        const safeDropTiles = [...reachableTiles].sort((left, right) =>
            this.distanceToClient(left, clientTile) - this.distanceToClient(right, clientTile)
            || left.distanceFromStart - right.distanceFromStart,
        );

        for (let index = 0; index < economy.coinsPerSatisfiedClient; index++) {
            const dropTile = safeDropTiles[index % Math.max(1, safeDropTiles.length)];
            const dropPosition = dropTile === undefined
                ? { x: this.player.x, y: this.player.y }
                : this.getWorldPosition(dropTile);
            const coin = new CoinDrop(
                this.scene,
                dropPosition.x,
                dropPosition.y,
                economy.valuePerCoin,
                economy,
            );
            this.coins.add(coin);
        }
    }

    public update(): void {
        for (const child of this.coins.getChildren()) {
            if (child instanceof CoinDrop && child.active) child.update();
        }
    }

    public setBlockedPositionProvider(provider: () => readonly ClientPosition[]): void {
        this.getBlockedPositions = provider;
    }

    /** Allows rat AI to choose drops without exposing the underlying physics group. */
    public getAvailableCoins(): readonly CoinDrop[] {
        return this.coins.getChildren().filter(
            (child): child is CoinDrop => child instanceof CoinDrop && child.active,
        );
    }

    /** Atomically removes a coin stolen by an NPC and notifies gameplay systems. */
    public stealCoin(coin: CoinDrop): boolean {
        if (!coin.claim('STOLEN')) return false;
        const data: CoinStolenData = { value: coin.value };
        eventBus.emit(EVENT_COIN_STOLEN, data);
        return true;
    }

    public destroy(): void {
        this.coins.clear(true, true);
    }

    private handlePlayerOverlap(_player: unknown, candidate: unknown): void {
        if (!(candidate instanceof CoinDrop) || !candidate.claim('COLLECTED')) return;

        const currentCredits = this.scene.registry.get(CREDITS_REGISTRY_KEY);
        const totalCredits = (typeof currentCredits === 'number'
            ? currentCredits
            : this.registry.economy.startingCredits) + candidate.value;
        this.scene.registry.set(CREDITS_REGISTRY_KEY, totalCredits);

        const data: CoinCollectedData = { value: candidate.value, totalCredits };
        eventBus.emit(EVENT_COIN_COLLECTED, data);
    }

    private getPlayerTile(): ClientPosition {
        return this.getTilePosition(this.player.x, this.player.y);
    }

    private getTilePosition(x: number, y: number): ClientPosition {
        return { tileX: Math.floor(x / TILE), tileY: Math.floor(y / TILE) };
    }

    private getWorldPosition(tile: ClientPosition): { readonly x: number; readonly y: number } {
        return { x: (tile.tileX + 0.5) * TILE, y: (tile.tileY + 0.5) * TILE };
    }

    private distanceToClient(tile: ClientPosition, client: ClientPosition): number {
        return Math.abs(tile.tileX - client.tileX) + Math.abs(tile.tileY - client.tileY);
    }
}
