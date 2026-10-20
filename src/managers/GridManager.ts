import { Tilemaps } from 'phaser';

export const TILE_TYPE_EMPTY = 'VACIO';
export const TILE_TYPE_TABLE = 'MESA';
export const TILE_TYPE_CHAIR = 'SILLA';
export const TILE_TYPE_BAR = 'BARRA';
export const TILE_TYPE_FLOOR = 'SUELO';
export const TILE_TYPE_WALL = 'PARED';
export const TILE_TYPE_STAGE = 'ESCENARIO';
export const TILE_TYPE_MAIN_DOOR = 'PUERTA_PRINCIPAL';
export const TILE_TYPE_BACK_DOOR = 'PUERTA_TRASERA';
export const TILE_TYPE_DROID_DETECTOR = 'DETECTOR_DROIDES';
export const TILE_TYPE_DRINK_CYLINDER = 'CILINDRO_BEBIDA';
export const TILE_TYPE_GRILL = 'PARRILLA';
export const TILE_TYPE_STORAGE = 'ALMACEN';
export const TILE_TYPE_WANTED_POSTER = 'POSTER_BUSCADOS';
export const TILE_TYPE_VENT_GRATE = 'REJILLA_VENTILACION';
export const TILE_TYPE_ALCOVE_FLOOR = 'SUELO_ALCOBA';
export const TILE_TYPE_COUNTER_SURFACE = 'ENCIMERA';
export const TILE_TYPE_SPEAKER = 'ALTAVOZ';
export const TILE_TYPE_TIP_JAR = 'BOTE_PROPINAS';
export const TILE_TYPE_BROKEN_FURNITURE = 'MOBILIARIO_ROTO';
export const TILE_TYPE_MESS = 'CHARCO';
export const TILE_TYPE_CREDITS = 'CREDITOS_SUELO';
export const TILE_TYPE_RAT_DEN = 'MADRIGUERA_RATAS';

export type FurnitureTileType =
    | typeof TILE_TYPE_EMPTY
    | typeof TILE_TYPE_TABLE
    | typeof TILE_TYPE_CHAIR
    | typeof TILE_TYPE_BAR
    | typeof TILE_TYPE_FLOOR
    | typeof TILE_TYPE_WALL
    | typeof TILE_TYPE_STAGE
    | typeof TILE_TYPE_MAIN_DOOR
    | typeof TILE_TYPE_BACK_DOOR
    | typeof TILE_TYPE_DROID_DETECTOR
    | typeof TILE_TYPE_DRINK_CYLINDER
    | typeof TILE_TYPE_GRILL
    | typeof TILE_TYPE_STORAGE
    | typeof TILE_TYPE_WANTED_POSTER
    | typeof TILE_TYPE_VENT_GRATE
    | typeof TILE_TYPE_ALCOVE_FLOOR
    | typeof TILE_TYPE_COUNTER_SURFACE
    | typeof TILE_TYPE_SPEAKER
    | typeof TILE_TYPE_TIP_JAR
    | typeof TILE_TYPE_BROKEN_FURNITURE
    | typeof TILE_TYPE_MESS
    | typeof TILE_TYPE_CREDITS
    | typeof TILE_TYPE_RAT_DEN;

/**
 * Names of all tile layers that carry typed furniture/interactable tiles.
 * The GridManager reads each of these layers when building its internal
 * lookup map. Layers listed later override tiles from earlier layers
 * when they overlap on the same grid cell.
 */
const TYPED_LAYER_NAMES: readonly string[] = [
    'suelo',
    'barra',
    'mobiliario',
    'decoracion',
    'puertas',
] as const;

const TILE_TYPE_PROPERTY = 'tipo';

const ALL_TILE_TYPES: ReadonlySet<string> = new Set<string>([
    TILE_TYPE_EMPTY,
    TILE_TYPE_TABLE,
    TILE_TYPE_CHAIR,
    TILE_TYPE_BAR,
    TILE_TYPE_FLOOR,
    TILE_TYPE_WALL,
    TILE_TYPE_STAGE,
    TILE_TYPE_MAIN_DOOR,
    TILE_TYPE_BACK_DOOR,
    TILE_TYPE_DROID_DETECTOR,
    TILE_TYPE_DRINK_CYLINDER,
    TILE_TYPE_GRILL,
    TILE_TYPE_STORAGE,
    TILE_TYPE_WANTED_POSTER,
    TILE_TYPE_VENT_GRATE,
    TILE_TYPE_ALCOVE_FLOOR,
    TILE_TYPE_COUNTER_SURFACE,
    TILE_TYPE_SPEAKER,
    TILE_TYPE_TIP_JAR,
    TILE_TYPE_BROKEN_FURNITURE,
    TILE_TYPE_MESS,
    TILE_TYPE_CREDITS,
    TILE_TYPE_RAT_DEN,
]);

type TilePropertyValue = string | number | boolean;

function isTilePropertyRecord(value: object): value is Record<string, TilePropertyValue> {
    return Object.values(value).every((property) => (
        typeof property === 'string'
        || typeof property === 'number'
        || typeof property === 'boolean'
    ));
}

function isFurnitureTileType(value: TilePropertyValue | undefined): value is FurnitureTileType {
    return typeof value === 'string' && ALL_TILE_TYPES.has(value);
}

/**
 * Manages the tile-based grid that defines furniture placement,
 * interactable objects, and walkable zones in the cantina.
 *
 * Reads multiple Tiled layers (`suelo`, `barra`, `mobiliario`,
 * `decoracion`, `puertas`) to build a unified lookup of tile types
 * keyed by grid coordinates.
 */
export class GridManager {
    public readonly tilemap: Tilemaps.Tilemap;
    private readonly furnitureTypes: Map<string, FurnitureTileType> = new Map();

    public constructor(tilemap: Tilemaps.Tilemap) {
        this.tilemap = tilemap;
        this.readAllTypedLayers();
    }

    /** Returns the semantic tile type at the given world-pixel position. */
    public getTileTypeAtWorldPosition(worldX: number, worldY: number): FurnitureTileType {
        const tileX = this.tilemap.worldToTileX(worldX);
        const tileY = this.tilemap.worldToTileY(worldY);

        if (tileX === null || tileY === null) {
            return TILE_TYPE_EMPTY;
        }

        return this.furnitureTypes.get(this.getTileKey(tileX, tileY)) ?? TILE_TYPE_EMPTY;
    }

    /** Returns the semantic tile type at grid coordinates. */
    public getTileTypeAtGrid(tileX: number, tileY: number): FurnitureTileType {
        return this.furnitureTypes.get(this.getTileKey(tileX, tileY)) ?? TILE_TYPE_EMPTY;
    }

    /**
     * Scans all typed tile layers in order and populates the
     * internal map. Later layers overwrite earlier ones on the
     * same cell, so the highest-priority layer (e.g. `puertas`)
     * wins when there is a conflict.
     */
    private readAllTypedLayers(): void {
        for (const layerName of TYPED_LAYER_NAMES) {
            const layer = this.tilemap.getLayer(layerName);

            if (layer === null) {
                // Layer is optional; skip silently.
                continue;
            }

            this.readLayer(layer);
        }
    }

    /**
     * Iterates over every cell in a single layer, extracting
     * the custom `tipo` property that identifies each tile's
     * semantic role.
     */
    private readLayer(layer: Tilemaps.LayerData): void {
        for (const row of layer.data) {
            for (const tile of row) {
                if (tile === null || tile.index <= 0) {
                    continue;
                }

                const properties = tile.properties;
                if (typeof properties !== 'object' || properties === null || !isTilePropertyRecord(properties)) {
                    continue;
                }

                const tileType = properties[TILE_TYPE_PROPERTY];
                if (isFurnitureTileType(tileType)) {
                    this.furnitureTypes.set(this.getTileKey(tile.x, tile.y), tileType);
                }
            }
        }
    }

    private getTileKey(tileX: number, tileY: number): string {
        return `${tileX}:${tileY}`;
    }
}
