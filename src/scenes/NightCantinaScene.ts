import { Scene } from 'phaser';

import { Player } from '../entities/Player';
import { GridManager } from '../managers/GridManager';

const MAP_KEY = 'cantina';
const MAP_URL = new URL('../../assets/maps/cantina2.tmj', import.meta.url).href;
const TILESET_KEY = 'cantina-tileset';
const TILESET_URL = new URL('../../assets/images/cantina_tileset.png', import.meta.url).href;

/** Name used inside the TMJ file for the tileset (`"name"` field). */
const TILESET_TMJ_NAME = 'cantina_tileset';

/** Ordered list of tile layers to create and render (bottom → top). */
const TILE_LAYER_NAMES: readonly string[] = [
    'suelo',
    'paredes',
    'decoracion',
    'barra',
    'mobiliario',
    'puertas',
] as const;

/**
 * Layers whose tiles with `collides: true` should block the player.
 * Walls and bar counter segments are the primary collision sources.
 */
const COLLISION_LAYER_NAMES: ReadonlySet<string> = new Set([
    'paredes',
    'barra',
    'decoracion',
    'mobiliario',
]);

export class NightCantinaScene extends Scene {
    private player!: Player;
    private gridManager!: GridManager;

    public constructor() {
        super('NightCantinaScene');
    }

    public init(): void {
    }

    public preload(): void {
        this.load.tilemapTiledJSON(MAP_KEY, MAP_URL);
        this.load.image(TILESET_KEY, TILESET_URL);
    }

    public create(): void {
        const map = this.make.tilemap({ key: MAP_KEY });
        const tileset = map.addTilesetImage(TILESET_TMJ_NAME, TILESET_KEY);

        if (tileset === null) {
            throw new Error(`No se pudo cargar el tileset "${TILESET_TMJ_NAME}" del mapa de la cantina.`);
        }

        // Create every tile layer in render order and configure collisions.
        for (const layerName of TILE_LAYER_NAMES) {
            const layer = map.createLayer(layerName, tileset, 0, 0);

            if (layer === null) {
                console.warn(`Capa "${layerName}" no encontrada en el mapa; se omite.`);
                continue;
            }

            if (COLLISION_LAYER_NAMES.has(layerName)) {
                layer.setCollisionByProperty({ collides: true });
            }
        }

        // Build the logical grid from all typed layers.
        this.gridManager = new GridManager(map);

        // Spawn the player at the Wuher spawn point (object layer) or map center.
        const spawnPoint = this.findSpawnPoint(map);
        this.player = new Player(this, spawnPoint.x, spawnPoint.y, this.gridManager);

        // Set up collisions between the player and every collision-enabled layer.
        for (const layerName of COLLISION_LAYER_NAMES) {
            const layer = map.getLayer(layerName);
            if (layer !== null && layer.tilemapLayer !== null) {
                this.physics.add.collider(this.player, layer.tilemapLayer);
            }
        }

        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.startFollow(this.player, true);
    }

    public update(): void {
        this.player.update();
    }

    /**
     * Looks for a `spawnWuher` object inside the `objetos` object layer.
     * Falls back to the centre of the map if no spawn marker exists.
     */
    private findSpawnPoint(map: Phaser.Tilemaps.Tilemap): { x: number; y: number } {
         const objectLayer = map.getObjectLayer('Objetos') ?? map.getObjectLayer('objetos');

        if (objectLayer !== null) {
            const spawnObj = objectLayer.objects.find((obj) => obj.name === 'spawnWuher');
            if (spawnObj !== undefined && spawnObj.x !== undefined && spawnObj.y !== undefined) {
                return {
                    x: spawnObj.x + (spawnObj.width ?? 0) / 2,
                    y: spawnObj.y + (spawnObj.height ?? 0) / 2,
                };
            }
        }

        return {
            x: map.widthInPixels / 2,
            y: map.heightInPixels / 2,
        };
    }
}
