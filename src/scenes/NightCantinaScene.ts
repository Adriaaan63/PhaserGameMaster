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
const TILESETS = [
    {
        key: 'cantina-tileset',
        name: 'cantina_tileset',
        url: new URL('../../assets/images/cantina_tileset.png', import.meta.url).href,
    },
    {
        key: 'interiors-tilesets',
        name: 'Interiors_tilesets',
        url: new URL('../../assets/images/Interiors_tilesets.png', import.meta.url).href,
    },
    {
        key: 'windows-and-doors',
        name: 'windows_and_doors2',
        url: new URL('../../assets/images/windows_and_doors2.png', import.meta.url).href,
    },
    {
        key: 'furniture-and-props',
        name: 'furniture_and_props',
        url: new URL('../../assets/images/furniture_and_props.png', import.meta.url).href,
    },
] as const;

const TILE_LAYER_DEPTHS: Readonly<Record<string, number>> = {
    suelo: 0,
    paredes: 0,
    barra: 0,
    decoracion: 0,
    mobiliario: 0,
    puertas: 0,
};

/** Ordered list of tile layers to create and render (bottom → top) - 3/4 perspective. */
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
        for (const tileset of TILESETS) {
            this.load.image(tileset.key, tileset.url);
        }
    }

    public create(): void {
        this.registry.set('gameMode', GAME_MODE_PRE_OPENING);
        eventBus.on(EVENT_CANTINA_OPEN, this.handleOpenCantina, this);
        this.events.once('shutdown', this.cleanupModeEvents, this);
        this.events.once('destroy', this.cleanupModeEvents, this);

        const map = this.make.tilemap({ key: MAP_KEY });
        const tilesets = TILESETS.map((tileset) => map.addTilesetImage(tileset.name, tileset.key));
        if (tilesets.some((tileset) => tileset === null)) {
            const missingTilesets = TILESETS
                .filter((_tileset, index) => tilesets[index] === null)
                .map((tileset) => tileset.name)
                .join(', ');
            throw new Error(`No se pudieron cargar los tilesets de la cantina: ${missingTilesets}.`);
        }
        const tilemapTilesets = tilesets.filter((tileset): tileset is Phaser.Tilemaps.Tileset => tileset !== null);

        // Create every tile layer in render order and configure collisions.
        for (const layerName of TILE_LAYER_NAMES) {
            const layer = map.createLayer(layerName, tilemapTilesets, 0, 0);

            if (layer === null) {
                console.warn(`Capa "${layerName}" no encontrada en el mapa; se omite.`);
                continue;
            }

            layer.setDepth(TILE_LAYER_DEPTHS[layerName] ?? 0);

            if (COLLISION_LAYER_NAMES.has(layerName)) {
                layer.setCollisionByProperty({ collides: true });
            }
        }

        const paredesAltasLayer = map.createLayer('paredes_altas', tilemapTilesets, 0, 0);
        if (paredesAltasLayer === null) {
            throw new Error('No se pudo crear la capa "paredes_altas" del mapa.');
        }
        this.createYSortedHighWalls(paredesAltasLayer, map);

        // Build the logical grid from all typed layers and restricted zones.
        this.gridManager = new GridManager(map);
        this.registry.set('foodStock', 5);

        // Spawn the player at the Wuher spawn point (object layer) or map center.
        const spawnPoint = this.findSpawnPoint(map);
        this.player = new Player(this, spawnPoint.x, spawnPoint.y, this.gridManager);
        this.updatePlayerDepth();
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
        this.updatePlayerDepth();
        this.placementManager.update();
    }

    public getGridManager(): GridManager {
        return this.gridManager;
    }

    public getPlacementManager(): PlacementManager {
        return this.placementManager;
    }

    private updatePlayerDepth(): void {
        this.player.setDepth(this.player.body?.bottom ?? this.player.y);
    }
    
    private createYSortedHighWalls(
        tileLayer: Phaser.Tilemaps.TilemapLayerBase,
        map: Phaser.Tilemaps.Tilemap,
    ): void {
        const paredesLayer = map.getLayer('paredes')?.tilemapLayer;

        tileLayer.forEachTile((tile) => {
            if (tile.index < 0 || tile.tileset === null || tile.tileset.image === null) {
                return;
            }

            const coordinates = tile.tileset.getTileTextureCoordinates(tile.index) as {
                x: number;
                y: number;
            } | null;

            if (coordinates === null) {
                return;
            }

            const textureKey = tile.tileset.image.key;
            const texture = this.textures.get(textureKey);
            const frameName = `tile_${tile.index}`;

            if (!texture.has(frameName)) {
                texture.add(frameName, 0, coordinates.x, coordinates.y, TILE, TILE);
            }

            const wall = this.add.image(
                tile.pixelX + TILE / 2,
                tile.pixelY + TILE / 2,
                textureKey,
                frameName,
            );

            let gridBaseY = tile.y;
            const maxSearch = 10;

            if (paredesLayer !== null && paredesLayer !== undefined) {
                for (let offsetY = 1; offsetY <= maxSearch; offsetY++) {
                    if (paredesLayer.hasTileAt(tile.x, tile.y + offsetY)) {
                        gridBaseY = tile.y + offsetY;
                        break;
                    }
                }
            }

            wall.setDepth(gridBaseY * TILE + TILE);
        });

        tileLayer.setVisible(false);
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
            { x: 8, y: 7 },
            { x: 15, y: 7 },
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
