import { GridManager, TILE_TYPE_CHAIR, TILE_TYPE_TABLE, TILE_TYPE_BAR } from './GridManager';
import type { ClientPosition } from '../entities/Client';

const BLOCKING_LAYER_NAMES: readonly string[] = ['paredes', 'barra', 'decoracion', 'mobiliario', 'puertas'];

const NEIGHBORS: readonly ClientPosition[] = [
    { tileX: 1, tileY: 0 }, { tileX: -1, tileY: 0 },
    { tileX: 0, tileY: 1 }, { tileX: 0, tileY: -1 },
];

export class PathfindingManager {
    public constructor(private readonly grid: GridManager) {}

    public findPath(start: ClientPosition, goal: ClientPosition): readonly ClientPosition[] | null {
        const queue: ClientPosition[] = [start];
        const cameFrom = new Map<string, ClientPosition | null>([[this.key(start), null]]);
        for (let head = 0; head < queue.length; head++) {
            const current = queue[head];
            if (current.tileX === goal.tileX && current.tileY === goal.tileY) return this.reconstruct(cameFrom, current);
            for (const offset of NEIGHBORS) {
                const next = { tileX: current.tileX + offset.tileX, tileY: current.tileY + offset.tileY };
                const key = this.key(next);
                if (cameFrom.has(key) || !this.isWalkable(next, goal)) continue;
                cameFrom.set(key, current);
                queue.push(next);
            }
        }
        return null;
    }

    private isWalkable(position: ClientPosition, goal: ClientPosition): boolean {
        if (position.tileX < 0 || position.tileY < 0 || position.tileX >= this.grid.tilemap.width || position.tileY >= this.grid.tilemap.height) return false;
        if (position.tileX === goal.tileX && position.tileY === goal.tileY) return true;
        const type = this.grid.getTileTypeAtGrid(position.tileX, position.tileY);
        if (type === TILE_TYPE_CHAIR || type === TILE_TYPE_TABLE || type === TILE_TYPE_BAR) return false;
        for (const layerName of BLOCKING_LAYER_NAMES) {
            const layer = this.grid.tilemap.getLayer(layerName);
            const tile = layer?.data[position.tileY]?.[position.tileX];
            if (tile !== undefined && tile !== null && tile.index > 0) {
                const properties = tile.properties as Record<string, unknown> | undefined;
                if (tile.collides || properties?.collides === true || layerName === 'paredes') {
                    return false;
                }
            }
        }
        const floor = this.grid.tilemap.getTileAt(position.tileX, position.tileY, false, 'suelo');
        return floor !== null && floor.index > 0;
    }

    private reconstruct(cameFrom: Map<string, ClientPosition | null>, end: ClientPosition): ClientPosition[] {
        const path: ClientPosition[] = [];
        let current: ClientPosition | null = end;
        while (current !== null) {
            path.push(current);
            current = cameFrom.get(this.key(current)) ?? null;
        }
        return path.reverse().slice(1);
    }

    private key(position: ClientPosition): string { return `${position.tileX}:${position.tileY}`; }
}
