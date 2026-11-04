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
import { PlacementManager } from './PlacementManager';

/** Coordinates the temporary Jabba raid response and its furniture damage. */
export class JabbaRaidManager {
    private raidActive = false;
    private destroyedFurnitureCount = 0;
    private readonly destroyedFurnitureKeys = new Set<string>();

    private readonly handleRaidStarted = (): void => {
        if (this.raidActive) return;
        this.raidActive = true;
        this.destroyedFurnitureCount = 0;
        this.destroyedFurnitureKeys.clear();
        this.clientManager.setEnabled(false);
        for (const client of this.clientManager.getClients()) {
            client.fleeImmediately();
        }
        this.spawnRaidThugs();
        this.destroyFurnitureForRaid();
    };

    private readonly handleRaidEnded = (): void => {
        this.raidActive = false;
        this.clientManager.setEnabled(true);
    };

    public constructor(
        private readonly clientManager: ClientManager,
        private readonly grid: GridManager,
        private readonly placement: PlacementManager,
    ) {
        eventBus.on(EVENT_JABBA_RAID_STARTED, this.handleRaidStarted);
        eventBus.on(EVENT_JABBA_RAID_ENDED, this.handleRaidEnded);
    }

    public destroy(): void {
        eventBus.off(EVENT_JABBA_RAID_STARTED, this.handleRaidStarted);
        eventBus.off(EVENT_JABBA_RAID_ENDED, this.handleRaidEnded);
    }

    public get isActive(): boolean {
        return this.raidActive;
    }

    /**
     * Placeholder hook for the future thug entities and their pathfinding.
     * The current prototype applies their four destruction results immediately.
     */
    private spawnRaidThugs(): void {
        // TODO: Instantiate four thug NPCs and assign one furniture target to each.
        // TODO: Let each thug report through registerFurnitureDestroyed().
    }

    private destroyFurnitureForRaid(): void {
        for (let tileY = 0; tileY < this.grid.tilemap.height; tileY++) {
            for (let tileX = 0; tileX < this.grid.tilemap.width; tileX++) {
                if (this.destroyedFurnitureCount >= 4) return;
                const entry = this.grid.getFurnitureAt(tileX, tileY);
                const rootX = entry?.rootX ?? tileX;
                const rootY = entry?.rootY ?? tileY;
                const key = `${rootX}:${rootY}`;
                if (this.destroyedFurnitureKeys.has(key) || this.grid.isFurnitureDestroyed(rootX, rootY)) continue;
                const tileType = this.grid.getTileTypeAtGrid(tileX, tileY);
                if (
                    entry === null
                    && tileType !== TILE_TYPE_TABLE
                    && tileType !== TILE_TYPE_CHAIR
                ) continue;
                if (!this.placement.markFurnitureDestroyed(rootX, rootY)) continue;
                this.registerFurnitureDestroyed(key);
            }
        }
    }

    private registerFurnitureDestroyed(key: string): void {
        if (this.destroyedFurnitureKeys.has(key)) return;
        this.destroyedFurnitureKeys.add(key);
        this.destroyedFurnitureCount++;
        if (this.destroyedFurnitureCount < 4) return;
        eventBus.emit(EVENT_JABBA_RAID_ENDED, {
            destroyedFurnitureCount: this.destroyedFurnitureCount,
        });
    }
}
