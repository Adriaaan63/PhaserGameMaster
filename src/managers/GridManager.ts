import { Tilemaps } from 'phaser';

import type { InteractableObject } from '../entities/InteractableObject';

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

/**
 * Layers that prevent building furniture upon them.
 */
const COLLISION_LAYER_NAMES: readonly string[] = [
    'paredes',
    'barra',
    'decoracion',
    'mobiliario',
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
 * `decoracion`, `puertas`) and object groups to build a unified lookup of tile types,
 * restricted areas, and dynamic furniture state.
 */
export class GridManager {
    public readonly tilemap: Tilemaps.Tilemap;
    private readonly furnitureTypes: Map<string, FurnitureTileType> = new Map();
    private readonly placedFurniture: Map<string, FurnitureTileType> = new Map();
    private readonly interactableObjects: Map<string, InteractableObject> = new Map();
    private readonly restrictedTiles: Set<string> = new Set();

    public constructor(tilemap: Tilemaps.Tilemap) {
        this.tilemap = tilemap;
        this.readAllTypedLayers();
        this.readRestrictedZones();
    }

    /** Returns the semantic tile type at the given world-pixel position. */
    public getTileTypeAtWorldPosition(worldX: number, worldY: number): FurnitureTileType {
        const tileX = this.tilemap.worldToTileX(worldX);
        const tileY = this.tilemap.worldToTileY(worldY);

        if (tileX === null || tileY === null) {
            return TILE_TYPE_EMPTY;
        }

        return this.getTileTypeAtGrid(tileX, tileY);
    }

    /** Returns the semantic tile type at grid coordinates. */
    public getTileTypeAtGrid(tileX: number, tileY: number): FurnitureTileType {
        const key = this.getTileKey(tileX, tileY);
        return this.placedFurniture.get(key) ?? this.furnitureTypes.get(key) ?? TILE_TYPE_EMPTY;
    }

    /**
     * Determines whether a specific tile coordinate is eligible for furniture placement.
     * Returns true only if:
     * 1. The tile is within map bounds.
     * 2. It has an interior floor tile (not void, not exterior, and not marked buildable: false).
     * 3. It does not collide with walls, bar counters, decorations, or doors.
     * 4. It does not lie inside a restricted zone (band stage, kitchen, storage, queue, spawns).
     * 5. It is not currently occupied by placed or static furniture.
     *
     * @param tileX Grid X coordinate.
     * @param tileY Grid Y coordinate.
     */
    public isTileBuildable(tileX: number, tileY: number): boolean {
        // 1. Map boundaries
        if (tileX < 0 || tileX >= this.tilemap.width || tileY < 0 || tileY >= this.tilemap.height) {
            return false;
        }

        const key = this.getTileKey(tileX, tileY);

        // 2. Already occupied by dynamically placed furniture
        if (this.placedFurniture.has(key)) {
            return false;
        }

        // 3. Marked restricted by zone objects or explicit non-buildable properties
        if (this.restrictedTiles.has(key)) {
            return false;
        }

        // 4. Must have a valid interior floor tile (suelo layer)
        const floorTile = this.tilemap.getTileAt(tileX, tileY, false, 'suelo');
        if (floorTile === null || floorTile.index <= 0) {
            return false;
        }

        const floorProps = floorTile.properties as Record<string, unknown> | undefined;
        if (floorProps !== undefined) {
            if (floorProps.buildable === false || floorProps.tipo === 'EXTERIOR') {
                return false;
            }
        }

        // 5. Collision layers (walls, bar, pre-existing furniture, doors, blocking decor)
        for (const layerName of COLLISION_LAYER_NAMES) {
            const tile = this.tilemap.getTileAt(tileX, tileY, false, layerName);
            if (tile !== null && tile.index > 0) {
                const props = tile.properties as Record<string, unknown> | undefined;
                if (
                    layerName === 'paredes'
                    || layerName === 'barra'
                    || layerName === 'mobiliario'
                    || layerName === 'puertas'
                    || tile.collides
                    || props?.collides === true
                    || props?.buildable === false
                ) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Registers a furniture item placed dynamically onto the grid.
     *
     * @param tileX Grid X coordinate.
     * @param tileY Grid Y coordinate.
     * @param type Furniture type (e.g. TILE_TYPE_TABLE or TILE_TYPE_CHAIR).
     * @returns True if placement succeeded, false if tile was unbuildable.
     */
    public placeFurniture(tileX: number, tileY: number, type: FurnitureTileType): boolean {
        if (!this.isTileBuildable(tileX, tileY)) {
            return false;
        }

        const key = this.getTileKey(tileX, tileY);
        this.placedFurniture.set(key, type);
        this.furnitureTypes.set(key, type);
        return true;
    }

    /**
     * Removes dynamically placed furniture at grid coordinates.
     *
     * @param tileX Grid X coordinate.
     * @param tileY Grid Y coordinate.
     * @returns The removed FurnitureTileType, or null if none existed.
     */
    public removeFurniture(tileX: number, tileY: number): FurnitureTileType | null {
        const key = this.getTileKey(tileX, tileY);
        const removed = this.placedFurniture.get(key) ?? null;

        if (removed !== null) {
            this.placedFurniture.delete(key);
            this.furnitureTypes.delete(key);
        }

        return removed;
    }

    /**
     * Checks if a tile is currently occupied by dynamically placed furniture.
     */
    public hasFurnitureAt(tileX: number, tileY: number): boolean {
        return this.placedFurniture.has(this.getTileKey(tileX, tileY));
    }

    /**
     * Gets the dynamically placed furniture type at the given grid coordinates, if any.
     */
    public getFurnitureAt(tileX: number, tileY: number): FurnitureTileType | null {
        return this.placedFurniture.get(this.getTileKey(tileX, tileY)) ?? null;
    }

    public registerInteractableObject(
        object: InteractableObject,
        tileX: number,
        tileY: number,
    ): boolean {
        const key = this.getTileKey(tileX, tileY);
        if (this.interactableObjects.has(key)) {
            return false;
        }

        this.interactableObjects.set(key, object);
        return true;
    }

    public getInteractableObjectAt(tileX: number, tileY: number): InteractableObject | null {
        return this.interactableObjects.get(this.getTileKey(tileX, tileY)) ?? null;
    }

    public removeInteractableObject(tileX: number, tileY: number): InteractableObject | null {
        const key = this.getTileKey(tileX, tileY);
        const object = this.interactableObjects.get(key) ?? null;
        if (object !== null) {
            this.interactableObjects.delete(key);
        }
        return object;
    }

    /**
     * Checks whether a tile belongs to an invalid or restricted zone.
     */
    public isTileRestricted(tileX: number, tileY: number): boolean {
        return this.restrictedTiles.has(this.getTileKey(tileX, tileY));
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
     * semantic role and checking for `buildable: false`.
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

                if (properties.buildable === false) {
                    this.restrictedTiles.add(this.getTileKey(tile.x, tile.y));
                }

                const tileType = properties[TILE_TYPE_PROPERTY];
                if (isFurnitureTileType(tileType)) {
                    this.furnitureTypes.set(this.getTileKey(tile.x, tile.y), tileType);
                }
            }
        }
    }

    /**
     * Scans the Tiled object layer(s) for restricted zones (`zonaBanda`, `zonaCocina`,
     * `zonaAlmacen`, `zonaColaEntrada`, spawns, detectors, and doors) and marks their
     * corresponding grid tiles as non-buildable.
     */
    private readRestrictedZones(): void {
        const objectLayer = this.tilemap.getObjectLayer('Objetos') ?? this.tilemap.getObjectLayer('objetos');
        if (objectLayer === null) {
            return;
        }

        const tileWidth = this.tilemap.tileWidth || 32;
        const tileHeight = this.tilemap.tileHeight || 32;

        for (const obj of objectLayer.objects) {
            const name = (obj.name ?? '').toLowerCase();
            const type = (obj.type ?? '').toLowerCase();
            const props = (obj.properties ?? []) as Array<{ name: string; value: unknown }>;
            const buildableProp = props.find((p) => p.name === 'buildable');
            const hasBuildableFalse = buildableProp !== undefined && buildableProp.value === false;

            const isRestricted =
                hasBuildableFalse
                || name.startsWith('zona')
                || name.startsWith('spawn')
                || name.startsWith('detector')
                || name.startsWith('entrada')
                || name.startsWith('salida')
                || type.startsWith('zona')
                || type.startsWith('spawn')
                || type.startsWith('puerta')
                || type === 'detector_droides'
                || type === 'cola_entrada';

            if (isRestricted && obj.x !== undefined && obj.y !== undefined) {
                const width = obj.width ?? tileWidth;
                const height = obj.height ?? tileHeight;

                const minTileX = Math.floor(obj.x / tileWidth);
                const minTileY = Math.floor(obj.y / tileHeight);
                const maxTileX = Math.floor((obj.x + Math.max(1, width) - 0.01) / tileWidth);
                const maxTileY = Math.floor((obj.y + Math.max(1, height) - 0.01) / tileHeight);

                for (let tx = minTileX; tx <= maxTileX; tx++) {
                    for (let ty = minTileY; ty <= maxTileY; ty++) {
                        if (tx >= 0 && tx < this.tilemap.width && ty >= 0 && ty < this.tilemap.height) {
                            this.restrictedTiles.add(this.getTileKey(tx, ty));
                        }
                    }
                }
            }
        }
    }

    private getTileKey(tileX: number, tileY: number): string {
        return `${tileX}:${tileY}`;
    }
}
