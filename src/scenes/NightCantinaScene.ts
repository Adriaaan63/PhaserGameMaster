import { Scene } from 'phaser';

import { Player } from '../entities/Player';
import { InteractableObject } from '../entities/InteractableObject';
import { BeverageTower } from '../entities/stations/BeverageTower';
import { Grill } from '../entities/stations/Grill';
import { GridManager } from '../managers/GridManager';
import { PlacementManager } from '../managers/PlacementManager';
import { ROOM_H, ROOM_SCALE, ROOM_W, TILE, VIEW_Y } from '../data/constants';
import {
    EVENT_CANTINA_OPEN,
    EVENT_GAME_MODE_CHANGED,
    EVENT_GAME_WARNING,
    eventBus,
    GAME_MODE_NIGHT,
    GAME_MODE_PRE_OPENING,
    type GameModeChangedData,
} from '../utils/EventBus';

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
    'barra',
    'decoracion',
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
    private placementManager!: PlacementManager;

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
        this.registry.set('gameMode', GAME_MODE_PRE_OPENING);
        eventBus.on(EVENT_CANTINA_OPEN, this.handleOpenCantina, this);
        this.events.once('shutdown', this.cleanupModeEvents, this);
        this.events.once('destroy', this.cleanupModeEvents, this);

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

        // Build the logical grid from all typed layers and restricted zones.
        this.gridManager = new GridManager(map);
        this.registry.set('foodStock', 5);

        // Spawn the player at the Wuher spawn point (object layer) or map center.
        const spawnPoint = this.findSpawnPoint(map);
        this.player = new Player(this, spawnPoint.x, spawnPoint.y, this.gridManager);
        this.player.setDepth(20);
        this.createTestInteractableObjects();
        this.createServiceStations(map);

        // Initialize the Pre-Opening placement manager (Drag & Drop furniture).
        this.placementManager = new PlacementManager(this, this.gridManager, this.player);

        // Set up collisions between the player and every collision-enabled layer.
        for (const layerName of COLLISION_LAYER_NAMES) {
            const layer = map.getLayer(layerName);
            if (layer !== null && layer.tilemapLayer !== null) {
                this.physics.add.collider(this.player, layer.tilemapLayer);
            }
        }

        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.setViewport(
            0,
            VIEW_Y * ROOM_SCALE,
            ROOM_W * TILE * ROOM_SCALE,
            ROOM_H * TILE * ROOM_SCALE,
        );
        this.cameras.main.setZoom(ROOM_SCALE);
        this.cameras.main.centerOn(map.widthInPixels / 2, map.heightInPixels / 2);
    }

    public update(_time: number, delta: number): void {
        this.player.update(delta);
        this.placementManager.update();
    }

    public getGridManager(): GridManager {
        return this.gridManager;
    }

    public getPlacementManager(): PlacementManager {
        return this.placementManager;
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

    private createTestInteractableObjects(): void {
        InteractableObject.ensureTexture(this);

        const testTiles = [
            { x: 10, y: 7 },
            { x: 17, y: 7 },
        ] as const;

        for (const tile of testTiles) {
            const object = new InteractableObject(this, tile.x, tile.y);
            if (!this.gridManager.registerInteractableObject(object, tile.x, tile.y)) {
                object.destroy();
            }
        }
    }

    private createServiceStations(map: Phaser.Tilemaps.Tilemap): void {
        const objectLayer = map.getObjectLayer('Objetos') ?? map.getObjectLayer('objetos');
        if (objectLayer === null) {
            return;
        }

        for (const object of objectLayer.objects) {
            const objectType = object.type?.toLowerCase();
            const objectName = object.name?.toLowerCase();
            const tileX = Math.floor((object.x ?? 0) / TILE);
            const tileY = Math.floor((object.y ?? 0) / TILE);
            const tileWidth = Math.max(1, Math.ceil((object.width ?? TILE) / TILE));
            const tileHeight = Math.max(1, Math.ceil((object.height ?? TILE) / TILE));

            if (objectName === 'torrecentral' || objectType === 'torre_central') {
                const station = new BeverageTower(this, tileX, tileY);
                this.registerStationTiles(station, tileX, tileY, tileWidth, tileHeight);
            } else if (objectName === 'parrilla' || objectType === 'parrilla') {
                const station = new Grill(this, tileX, tileY);
                this.registerStationTiles(station, tileX, tileY, tileWidth, tileHeight);
            }
        }
    }

    private registerStationTiles(
        station: BeverageTower | Grill,
        tileX: number,
        tileY: number,
        width: number,
        height: number,
    ): void {
        for (let offsetX = 0; offsetX < width; offsetX++) {
            for (let offsetY = 0; offsetY < height; offsetY++) {
                this.gridManager.registerStationAt(station, tileX + offsetX, tileY + offsetY);
            }
        }
    }

    private handleOpenCantina(): void {
        const tableCount = this.gridManager.getPlacedFurnitureCount('MESA');
        const chairCount = this.gridManager.getPlacedFurnitureCount('SILLA');

        if (tableCount < 1 || chairCount < 2) {
            eventBus.emit(EVENT_GAME_WARNING, {
                message: 'Necesitas 1 mesa y 2 sillas para abrir.',
            });
            return;
        }

        this.registry.set('gameMode', GAME_MODE_NIGHT);
        this.placementManager.setEnabled(false);

        const modeData: GameModeChangedData = { mode: GAME_MODE_NIGHT };
        eventBus.emit(EVENT_GAME_MODE_CHANGED, modeData);
    }

    private cleanupModeEvents(): void {
        eventBus.off(EVENT_CANTINA_OPEN, this.handleOpenCantina, this);
    }
}
