/**
 * Data-driven Furniture Registry.
 *
 * Centralises every piece of furniture the player can place during
 * the Pre-Opening phase. The registry is the single source of truth
 * for IDs, textures, tile footprints and semantic types, making it
 * trivial to add new unlockable furniture variants in the future.
 */

/** Broad semantic category of a furniture item. */
export type FurnitureCategory = 'MESA' | 'SILLA';

/** Static, immutable configuration for one furniture variant. */
export interface FurnitureConfig {
    /** Unique identifier (e.g. `mesa_redonda_0`). */
    readonly id: string;
    /** High-level category used by gameplay systems. */
    readonly type: FurnitureCategory;
    /** Phaser texture key loaded during Preload. */
    readonly texture: string;
    /** Human-readable display name (used in UI slots). */
    readonly name: string;
    /** Width of the footprint expressed in tiles. */
    readonly widthTiles: number;
    /** Height of the footprint expressed in tiles. */
    readonly heightTiles: number;
}

/**
 * Master dictionary of all available furniture.
 * Key = `FurnitureConfig.id`.
 */
export const FURNITURE_REGISTRY: Readonly<Record<string, FurnitureConfig>> = {
    mesa_redonda_0: {
        id: 'mesa_redonda_0',
        type: 'MESA',
        texture: 'round_table_0',
        name: 'Mesa Redonda',
        widthTiles: 2,
        heightTiles: 2,
    },
    silla_estandar_0: {
        id: 'silla_estandar_0',
        type: 'SILLA',
        texture: 'table_bench_1',
        name: 'Banco',
        widthTiles: 1,
        heightTiles: 1,
    },
} as const;

/**
 * Ordered list of furniture IDs that the player has unlocked.
 * For now this matches every entry in the registry; later it
 * can be driven by progression / shop purchases.
 */
export const UNLOCKED_FURNITURE_IDS: readonly string[] = [
    'mesa_redonda_0',
    'silla_estandar_0',
] as const;

/**
 * Safely retrieves a furniture config by its ID.
 *
 * @param id Unique furniture identifier.
 * @returns The matching config, or `undefined` if the ID is unknown.
 */
export function getFurnitureConfig(id: string): FurnitureConfig | undefined {
    return FURNITURE_REGISTRY[id];
}

