import { GameObjects, Scene } from 'phaser';
import {
    CHAIR_HIGHLIGHT_COLOR, ORPHAN_CHAIR_COLOR, TILE,
} from '../data/constants';
import {
    GridManager, TILE_TYPE_BAR, TILE_TYPE_CHAIR, TILE_TYPE_TABLE,
} from './GridManager';

export interface ChairPosition { readonly tileX: number; readonly tileY: number; }
export type ChairState = 'ACTIVA' | 'SILLA_INACTIVA';
interface ChairVisual { readonly position: ChairPosition; readonly marker: GameObjects.Arc; readonly state: ChairState; }
const ORTHOGONAL_NEIGHBORS: readonly ChairPosition[] = [
    { tileX: 0, tileY: -1 }, { tileX: 1, tileY: 0 },
    { tileX: 0, tileY: 1 }, { tileX: -1, tileY: 0 },
];

export class SeatingManager {
    private chairs: ChairVisual[] = [];
    private readonly occupied = new Map<string, number>();
    private highlighting = false;

    public constructor(private readonly scene: Scene, private readonly grid: GridManager) { this.refresh(); }

    public refresh(): void {
        for (const chair of this.chairs) chair.marker.destroy();
        this.chairs = [];
        for (let tileY = 0; tileY < this.grid.tilemap.height; tileY++) {
            for (let tileX = 0; tileX < this.grid.tilemap.width; tileX++) {
                if (this.grid.getTileTypeAtGrid(tileX, tileY) !== TILE_TYPE_CHAIR) continue;
                const adjacentFurniture = ORTHOGONAL_NEIGHBORS.some((offset) => {
                    const type = this.grid.getTileTypeAtGrid(tileX + offset.tileX, tileY + offset.tileY);
                    return type === TILE_TYPE_TABLE || type === TILE_TYPE_BAR;
                });
                const position = { tileX, tileY };
                const marker = this.scene.add.arc(
                    tileX * TILE + TILE / 2, tileY * TILE + TILE / 2 - TILE / 2,
                    7, 0, 360, false, adjacentFurniture ? CHAIR_HIGHLIGHT_COLOR : ORPHAN_CHAIR_COLOR,
                ).setDepth(tileY * TILE + TILE);
                marker.setVisible(!adjacentFurniture);
                this.chairs.push({ position, marker, state: adjacentFurniture ? 'ACTIVA' : 'SILLA_INACTIVA' });
            }
        }
        this.updateHighlights();
    }

    public getValidChairs(): readonly ChairPosition[] {
        return this.chairs.filter((chair) => chair.state === 'ACTIVA' && !this.occupied.has(this.key(chair.position)))
            .map((chair) => chair.position);
    }

    public isChair(tileX: number, tileY: number): boolean {
        return this.chairs.some((chair) => chair.position.tileX === tileX && chair.position.tileY === tileY);
    }

    public isValidAndFree(tileX: number, tileY: number): boolean {
        return this.getValidChairs().some((chair) => chair.tileX === tileX && chair.tileY === tileY);
    }

    public reserve(clientId: number, tileX: number, tileY: number): boolean {
        if (!this.isValidAndFree(tileX, tileY)) return false;
        this.occupied.set(this.key({ tileX, tileY }), clientId);
        this.updateHighlights();
        return true;
    }

    /** Releases a previously reserved chair so another client can use it. */
    public release(clientId: number, tileX: number, tileY: number): void {
        const key = this.key({ tileX, tileY });
        if (this.occupied.get(key) !== clientId) return;
        this.occupied.delete(key);
        this.updateHighlights();
    }

    public isOccupied(tileX: number, tileY: number): boolean {
        return this.occupied.has(this.key({ tileX, tileY }));
    }

    /** Finds an unoccupied table or bar tile orthogonally adjacent to this chair. */
    public getAvailableServingSurface(tileX: number, tileY: number): ChairPosition | null {
        for (const offset of ORTHOGONAL_NEIGHBORS) {
            const surfaceX = tileX + offset.tileX;
            const surfaceY = tileY + offset.tileY;
            const type = this.grid.getTileTypeAtGrid(surfaceX, surfaceY);
            if (
                (type === TILE_TYPE_TABLE || type === TILE_TYPE_BAR)
                && this.grid.getInteractableObjectAt(surfaceX, surfaceY) === null
            ) {
                return { tileX: surfaceX, tileY: surfaceY };
            }
        }
        return null;
    }

    public setHighlightsEnabled(enabled: boolean): void { this.highlighting = enabled; this.updateHighlights(); }

    public destroy(): void { for (const chair of this.chairs) chair.marker.destroy(); this.chairs = []; }

    private updateHighlights(): void {
        for (const chair of this.chairs) {
            const active = chair.state === 'ACTIVA';
            chair.marker.setVisible(!active || (this.highlighting && !this.occupied.has(this.key(chair.position))));
            if (active) chair.marker.setAlpha(this.highlighting ? 0.55 : 0);
        }
    }

    private key(position: ChairPosition): string { return `${position.tileX}:${position.tileY}`; }
}
