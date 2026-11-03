import { GameObjects, Physics, Scene, Tweens } from 'phaser';

import { GAME_REGISTRY, type GameRegistry } from '../data/GameRegistry';
import { TILE } from '../data/constants';
import type { CoinDrop } from './CoinDrop';
import type { PathfindingManager } from '../managers/PathfindingManager';
import type { ClientPosition } from './Client';

export type RatState = 'IDLE' | 'SEEKING' | 'RETURNING' | 'FLEEING';

interface RatCallbacks {
    readonly onReturned: (rat: Rat) => void;
    readonly onCoinsStolen: (coins: readonly CoinDrop[]) => void;
}

/** Physical scurrier that commits to one coin until it returns to its spawn. */
export class Rat extends GameObjects.Container {
    private readonly spawnPosition: ClientPosition;
    private readonly pathfinding: PathfindingManager;
    private readonly registry: GameRegistry;
    private readonly callbacks: RatCallbacks;
    private readonly bodyGraphic: GameObjects.Ellipse;
    private readonly eyeGraphic: GameObjects.Ellipse;
    private readonly targetCoins: readonly CoinDrop[];
    private currentTargetCoin: CoinDrop | null = null;
    private readonly carriedCoins = new Set<CoinDrop>();
    private runTween: Tweens.Tween | null = null;
    private route: readonly ClientPosition[] = [];
    private routeIndex = 0;
    private currentState: RatState = 'SEEKING';
    private hasCoin = false;
    private movementSpeed: number;

    public constructor(
        scene: Scene,
        spawnPosition: ClientPosition,
        targetCoins: readonly CoinDrop[],
        pathfinding: PathfindingManager,
        callbacks: RatCallbacks,
        registry: GameRegistry = GAME_REGISTRY,
    ) {
        super(scene, spawnPosition.tileX * TILE + TILE / 2, spawnPosition.tileY * TILE + TILE / 2);
        this.spawnPosition = spawnPosition;
        this.targetCoins = targetCoins;
        this.pathfinding = pathfinding;
        this.callbacks = callbacks;
        this.registry = registry;
        this.movementSpeed = registry.rats.movementSpeed;

        this.bodyGraphic = scene.add.ellipse(
            0,
            0,
            registry.rats.bodyWidth,
            registry.rats.bodyHeight,
            registry.rats.bodyColor,
        );
        this.eyeGraphic = scene.add.ellipse(
            registry.rats.bodyWidth * 0.28,
            -registry.rats.bodyHeight * 0.2,
            3,
            3,
            registry.rats.eyeColor,
        );
        this.add([this.bodyGraphic, this.eyeGraphic]);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        const body = this.body;
        if (!(body instanceof Physics.Arcade.Body)) {
            throw new Error('No se pudo crear el cuerpo físico de la rata.');
        }
        body.setSize(registry.rats.bodyWidth, registry.rats.bodyHeight)
            .setOffset(-registry.rats.bodyWidth / 2, -registry.rats.bodyHeight / 2)
            .setAllowGravity(false)
            .setImmovable(true);
        body.moves = false;
        this.setDepth(this.y);
        this.setVisible(true);
        this.runTween = scene.tweens.add({
            targets: this.bodyGraphic,
            scaleY: 0.72,
            duration: 110,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut',
        });
        this.selectNextCoin();
    }

    public get ratState(): RatState {
        return this.currentState;
    }

    public get assignedCoins(): readonly CoinDrop[] {
        return this.targetCoins;
    }

    public update(deltaMs: number): void {
        if (!this.active) return;
        if (this.currentState === 'SEEKING' || this.currentState === 'RETURNING' || this.currentState === 'FLEEING') {
            this.advanceAlongRoute(deltaMs);
        }
        this.setDepth(this.y);
    }

    /** Scares the rat and releases its carried coin before returning to the spawn. */
    public scare(): boolean {
        if (this.currentState !== 'SEEKING' && this.currentState !== 'RETURNING') return false;
        for (const coin of this.carriedCoins) coin.dropFromRat(this.x, this.y);
        for (const coin of this.targetCoins) {
            if (!this.carriedCoins.has(coin)) coin.releaseFromRat();
        }
        this.carriedCoins.clear();
        this.hasCoin = false;
        this.currentState = 'FLEEING';
        this.movementSpeed = this.registry.rats.fleeingSpeed;
        this.route = [];
        this.routeIndex = 0;
        this.buildRouteToSpawn();
        return true;
    }

    public override destroy(fromScene?: boolean): void {
        this.runTween?.stop();
        this.runTween = null;
        if (this.hasCoin) {
            for (const coin of this.carriedCoins) coin.dropFromRat(this.x, this.y);
            for (const coin of this.targetCoins) {
                if (!this.carriedCoins.has(coin)) coin.releaseFromRat();
            }
            this.carriedCoins.clear();
            this.hasCoin = false;
        }
        super.destroy(fromScene);
    }

    private buildRouteToCoin(): void {
        if (this.currentTargetCoin === null) return;
        const route = this.pathfinding.findPath(
            this.currentTile,
            this.getCoinTile(this.currentTargetCoin),
        );
        this.route = route ?? [];
        this.routeIndex = 0;
    }

    private buildRouteToSpawn(): void {
        const route = this.pathfinding.findPathToAdjacent(this.currentTile, this.spawnPosition);
        this.route = route ?? [];
        this.routeIndex = 0;
        if (route === null && !this.isAtSpawn()) return;
        if (this.route.length === 0 && this.isAtSpawn()) this.finishReturn();
    }

    private advanceAlongRoute(deltaMs: number): void {
        const target = this.route[this.routeIndex];
        if (target === undefined) {
            if (
                this.currentState === 'SEEKING'
                && this.currentTargetCoin !== null
                && this.isAtCoin(this.currentTargetCoin)
            ) {
                this.collectTargetCoin();
            } else if (this.currentState === 'SEEKING') {
                this.buildRouteToCoin();
            }
            else if (this.currentState === 'RETURNING' || this.currentState === 'FLEEING') {
                this.buildRouteToSpawn();
            }
            return;
        }

        const targetX = target.tileX * TILE + TILE / 2;
        const targetY = target.tileY * TILE + TILE / 2;
        const distance = Math.hypot(targetX - this.x, targetY - this.y);
        const step = this.movementSpeed * deltaMs / 1000;
        if (distance <= step) {
            this.setPosition(targetX, targetY);
            this.routeIndex++;
        } else {
            this.setPosition(
                this.x + (targetX - this.x) / distance * step,
                this.y + (targetY - this.y) / distance * step,
            );
        }

        if (this.currentState === 'SEEKING' && this.routeIndex >= this.route.length) {
            this.collectTargetCoin();
        } else if (
            (this.currentState === 'RETURNING' || this.currentState === 'FLEEING')
            && this.routeIndex >= this.route.length
        ) {
            this.finishReturn();
        }
    }

    private collectTargetCoin(): void {
        if (this.currentState !== 'SEEKING' || this.currentTargetCoin === null) return;
        if (!this.currentTargetCoin.collectByRat()) {
            for (const coin of this.targetCoins) {
                if (!this.carriedCoins.has(coin)) coin.releaseFromRat();
            }
            this.currentState = 'FLEEING';
            this.movementSpeed = this.registry.rats.fleeingSpeed;
            this.buildRouteToSpawn();
            return;
        }
        this.carriedCoins.add(this.currentTargetCoin);
        this.hasCoin = true;
        this.selectNextCoin();
    }

    private selectNextCoin(): void {
        const nextCoin = this.targetCoins
            .filter((coin) => !this.carriedCoins.has(coin))
            .find((coin) => coin.active);
        if (nextCoin === undefined) {
            this.currentTargetCoin = null;
            this.currentState = 'RETURNING';
            this.movementSpeed = this.registry.rats.movementSpeed;
            this.buildRouteToSpawn();
            return;
        }
        this.currentTargetCoin = nextCoin;
        this.currentState = 'SEEKING';
        this.movementSpeed = this.registry.rats.movementSpeed;
        this.buildRouteToCoin();
    }

    private finishReturn(): void {
        this.setPosition(
            this.spawnPosition.tileX * TILE + TILE / 2,
            this.spawnPosition.tileY * TILE + TILE / 2,
        );
        if (this.hasCoin) {
            const stolenCoins = [...this.carriedCoins].filter((coin) => coin.claim('STOLEN'));
            this.callbacks.onCoinsStolen(stolenCoins);
            this.carriedCoins.clear();
            this.hasCoin = false;
        }
        this.currentState = 'IDLE';
        this.callbacks.onReturned(this);
    }

    private get currentTile(): ClientPosition {
        return { tileX: Math.floor(this.x / TILE), tileY: Math.floor(this.y / TILE) };
    }

    private getCoinTile(target: CoinDrop): ClientPosition {
        return { tileX: Math.floor(target.x / TILE), tileY: Math.floor(target.y / TILE) };
    }

    private isAtCoin(target: CoinDrop): boolean {
        return this.currentTile.tileX === Math.floor(target.x / TILE)
            && this.currentTile.tileY === Math.floor(target.y / TILE);
    }

    private isAtSpawn(): boolean {
        return this.currentTile.tileX === this.spawnPosition.tileX
            && this.currentTile.tileY === this.spawnPosition.tileY;
    }

}
