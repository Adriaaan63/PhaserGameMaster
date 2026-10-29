import { Scene } from 'phaser';

import { Player } from '../entities/Player';
import { InteractableObject } from '../entities/InteractableObject';
import { BeverageTower } from '../entities/stations/BeverageTower';
import { Grill } from '../entities/stations/Grill';
import { GridManager, TILE_TYPE_TABLE } from '../managers/GridManager';
import { PlacementManager } from '../managers/PlacementManager';
import { ROOM_H, ROOM_SCALE, ROOM_W, TILE, VIEW_Y } from '../data/constants';
import { Client } from '../entities/Client';
import { ClientManager } from '../managers/ClientManager';
import { PathfindingManager } from '../managers/PathfindingManager';
import { SeatingManager } from '../managers/SeatingManager';
import {
    EVENT_CANTINA_OPEN,
    EVENT_GAME_MODE_CHANGED,
    EVENT_GAME_WARNING,
    EVENT_FURNITURE_PLACED,
    EVENT_FURNITURE_REMOVED,
    EVENT_CLIENT_SELECTED,
    EVENT_CHAIR_ASSIGNED,
    EVENT_TOGGLE_BUILD_MODE,
    eventBus,
    GAME_MODE_NIGHT,
    GAME_MODE_PRE_OPENING,
    type BuildModeToggledData,
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
    decoracion: 0,
    mobiliario: 0,
};

/** Ordered list of tile layers to create and render (bottom → top) - 3/4 perspective. */
const TILE_LAYER_NAMES: readonly string[] = [
    'suelo',
    'paredes',
    'paredes_altas',
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

const VOLUMETRIC_LAYERS = ['paredes', 'puertas', 'paredes_altas'];

export class NightCantinaScene extends Scene {
    private player!: Player;
    private gridManager!: GridManager;
    private placementManager!: PlacementManager;
    private clientManager!: ClientManager;
    private seatingManager!: SeatingManager;
    private pathfindingManager!: PathfindingManager;
    private selectedClient: Client | null = null;
    private buildModeEnabled = true;
    private isNightBuildPaused = false;

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

            if (COLLISION_LAYER_NAMES.has(layerName)) {
                layer.setCollisionByProperty({ collides: true });
            }

            // Procesamos Y-Sorting para las volumétricas, o dejamos depth 0 para las planas
            if (VOLUMETRIC_LAYERS.includes(layerName)) {
                this.createYSortedLayer(layer, map, layerName);
            } else {
                layer.setDepth(TILE_LAYER_DEPTHS[layerName] ?? 0);
            }
        }

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
        this.clientManager = new ClientManager(this, this.gridManager);
        this.seatingManager = new SeatingManager(this, this.gridManager);
        this.pathfindingManager = new PathfindingManager(this.gridManager);
        this.player.setNightInteractionHandler(this.handleNightInteraction);
        eventBus.on(EVENT_TOGGLE_BUILD_MODE, this.handleBuildModeToggled, this);
        eventBus.on(EVENT_FURNITURE_PLACED, this.handleFurnitureLayoutChanged, this);
        eventBus.on(EVENT_FURNITURE_REMOVED, this.handleFurnitureLayoutChanged, this);
        this.input.on('pointerdown', this.handlePointerDown, this);
        this.events.once('shutdown', this.cleanupClientSystems, this);
        this.events.once('destroy', this.cleanupClientSystems, this);

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
        if (this.registry.get('gameMode') === GAME_MODE_NIGHT && this.buildModeEnabled) {
            this.placementManager.update();
            return;
        }
        if (this.selectedClient?.clientState === 'LEAVING') {
            this.selectedClient = null;
            this.seatingManager.setHighlightsEnabled(false);
        }
        this.player.update(delta);
        this.updatePlayerDepth();
        this.placementManager.update();
        this.clientManager.update(delta);
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
    
    private createYSortedLayer(
        tileLayer: Phaser.Tilemaps.TilemapLayerBase,
        map: Phaser.Tilemaps.Tilemap,
        layerName: string
    ): void {
        const paredesLayer = map.getLayer('paredes')?.tilemapLayer;

        tileLayer.forEachTile((tile) => {
            if (tile.index < 0 || tile.tileset === null || tile.tileset.image === null) return;

            const coordinates = tile.tileset.getTileTextureCoordinates(tile.index) as { x: number; y: number } | null;
            if (coordinates === null) return;

            const textureKey = tile.tileset.image.key;
            const texture = this.textures.get(textureKey);
            const frameName = `tile_${tile.index}`;

            if (!texture.has(frameName)) {
                texture.add(frameName, 0, coordinates.x, coordinates.y, TILE, TILE);
            }

            const sprite = this.add.image(
                tile.pixelX + TILE / 2,
                tile.pixelY + TILE / 2,
                textureKey,
                frameName,
            );

            let gridBaseY = tile.y;
            const maxSearch = 15;

            if (layerName === 'paredes_altas' && paredesLayer !== null && paredesLayer !== undefined) {
                // Paredes altas: Buscan su base física en la capa de colisión 'paredes'
                for (let offsetY = 1; offsetY <= maxSearch; offsetY++) {
                    if (paredesLayer.hasTileAt(tile.x, tile.y + offsetY)) {
                        gridBaseY = tile.y + offsetY;
                        break;
                    }
                }
            } else {
                // Demás capas volumétricas (barra, paredes, puertas): 
                // Escanean su PROPIA capa hacia abajo para agrupar las columnas verticales en un solo bloque 3D.
                for (let offsetY = 1; offsetY <= maxSearch; offsetY++) {
                    if (tileLayer.hasTileAt(tile.x, tile.y + offsetY)) {
                        gridBaseY = tile.y + offsetY;
                    } else {
                        break; // Rompemos el bucle al encontrar el final de la estructura
                    }
                }
            }

            // Pequeño offset para evitar Z-fighting en la misma coordenada Y
            const zOffsets: Record<string, number> = {
                'paredes': 0,
                'paredes_altas': 1,
                'puertas': 2
            };
            
            const baseDepth = gridBaseY * TILE + TILE;
            sprite.setDepth(baseDepth + (zOffsets[layerName] ?? 0));
        });

        // Ocultamos la capa visualmente pero mantenemos intactas las colisiones
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
        const testConfigs = [
            { x: 9, y: 7, type: 'EMPTY_CUP' as const },
            { x: 14, y: 7, type: 'EMPTY_CUP' as const },
        ] as const;

        for (const config of testConfigs) {
            const object = new InteractableObject(this, config.x, config.y, config.type);
            if (!this.gridManager.registerInteractableObject(object, config.x, config.y)) {
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
            const rawX = object.x ?? 0;
            const rawY = object.y ?? 0;
            const rawWidth = object.width ?? TILE;
            const rawHeight = object.height ?? TILE;

            // Math.round para compensar offsets flotantes de objetos en Tiled (ej. 221.67px -> fila 7)
            const tileX = Math.round(rawX / TILE);
            const tileY = Math.round(rawY / TILE);

            if (objectName === 'parrilla' || objectType === 'parrilla') {
                // La estructura de la parrilla ocupa 2x2 celdas de mostrador (columnas 11..12, filas 7..8)
                const width = Math.max(2, Math.round(rawWidth / TILE));
                const height = Math.max(2, Math.round(rawHeight / TILE));
                const station = new Grill(this, tileX, tileY, width, height);
                this.registerStationTiles(station, tileX, tileY, width, height);
            } else if (objectName === 'torrecentral' || objectType === 'torre_central') {
                // La torre central de bebidas ocupa 2x2 celdas (columnas 11..12, filas 9..10)
                const width = Math.max(2, Math.round(rawWidth / TILE));
                const height = Math.max(2, Math.round(rawHeight / TILE));
                const actualTileY = tileY === 10 ? 9 : tileY;
                const station = new BeverageTower(this, tileX, actualTileY, width, height);
                this.registerStationTiles(station, tileX, actualTileY, width, height);
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
        const tableCount = this.gridManager.getPlacedFurnitureCount(TILE_TYPE_TABLE);
        this.seatingManager.refresh();
        const chairCount = this.seatingManager.getValidChairs().length;

        if (tableCount < 1 || chairCount < 2) {
            eventBus.emit(EVENT_GAME_WARNING, {
                message: 'Necesitas 1 mesa y 2 sillas para abrir.',
            });
            return;
        }

        this.registry.set('gameMode', GAME_MODE_NIGHT);
        this.placementManager.setEnabled(false);
        this.clientManager.setEnabled(true);

        const modeData: GameModeChangedData = { mode: GAME_MODE_NIGHT };
        eventBus.emit(EVENT_GAME_MODE_CHANGED, modeData);
    }

    private cleanupModeEvents(): void {
        eventBus.off(EVENT_CANTINA_OPEN, this.handleOpenCantina, this);
    }

    private handleNightInteraction = (tileX: number, tileY: number): boolean => {
        if (this.registry.get('gameMode') !== GAME_MODE_NIGHT || this.buildModeEnabled) return false;
        if (this.selectedClient?.clientState === 'LEAVING') {
            this.selectedClient = null;
            this.seatingManager.setHighlightsEnabled(false);
        }
        if (this.selectedClient !== null) return this.assignSelectedClient(tileX, tileY);
        const client = this.clientManager.getWaitingClients().find((candidate) =>
            this.worldToTile(candidate.x) === tileX && this.worldToTile(candidate.y) === tileY,
        );
        if (client === undefined) return false;
        this.selectedClient = client;
        client.setSelected(true);
        this.seatingManager.setHighlightsEnabled(true);
        eventBus.emit(EVENT_CLIENT_SELECTED, { clientId: client.getData('clientId') as number });
        return true;
    };

    private handlePointerDown(pointer: Phaser.Input.Pointer): void {
        if (
            this.registry.get('gameMode') !== GAME_MODE_NIGHT
            || this.buildModeEnabled
            || this.selectedClient === null
            || pointer.button !== 0
        ) return;
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const tileX = this.gridManager.tilemap.worldToTileX(worldPoint.x);
        const tileY = this.gridManager.tilemap.worldToTileY(worldPoint.y);
        if (tileX !== null && tileY !== null && this.seatingManager.isChair(tileX, tileY)) {
            this.assignSelectedClient(tileX, tileY);
        }
    }

    private assignSelectedClient(tileX: number, tileY: number): boolean {
        const client = this.selectedClient;
        if (client === null) return false;
        if (!this.seatingManager.isValidAndFree(tileX, tileY)) {
            if (this.seatingManager.isChair(tileX, tileY)) console.warn('Silla inactiva u ocupada.');
            return this.seatingManager.isChair(tileX, tileY);
        }
        const start = {
            tileX: this.worldToTile(client.x),
            tileY: this.worldToTile(client.y),
        };
        const route = this.pathfindingManager.findPath(start, { tileX, tileY });
        if (route === null || route.length === 0 || !this.seatingManager.reserve(tileX, tileY)) {
            console.warn('No se encontró una ruta válida hasta esa silla.');
            return true;
        }
        client.setSelected(false);
        client.assignRoute(route);
        this.selectedClient = null;
        this.seatingManager.setHighlightsEnabled(false);
        eventBus.emit(EVENT_CHAIR_ASSIGNED, {
            clientId: client.getData('clientId') as number,
            tileX,
            tileY,
        });
        return true;
    }

    private worldToTile(worldPosition: number): number {
        return Math.floor(worldPosition / TILE);
    }

    private cleanupClientSystems(): void {
        eventBus.off(EVENT_TOGGLE_BUILD_MODE, this.handleBuildModeToggled, this);
        eventBus.off(EVENT_FURNITURE_PLACED, this.handleFurnitureLayoutChanged, this);
        eventBus.off(EVENT_FURNITURE_REMOVED, this.handleFurnitureLayoutChanged, this);
        this.input.off('pointerdown', this.handlePointerDown, this);
        this.player?.setNightInteractionHandler(null);
        this.clientManager?.destroy();
        this.seatingManager?.destroy();
        this.selectedClient = null;
    }

    private handleBuildModeToggled(data: BuildModeToggledData): void {
        this.buildModeEnabled = data.enabled;
        const shouldPauseNight = data.enabled && this.registry.get('gameMode') === GAME_MODE_NIGHT;
        this.setNightBuildPause(shouldPauseNight);
    }

    private setNightBuildPause(paused: boolean): void {
        if (this.isNightBuildPaused === paused) return;
        this.isNightBuildPaused = paused;

        if (paused) {
            this.player.setVelocity(0, 0);
            this.player.anims.pause();
            this.physics.world.pause();
            this.time.paused = true;
            this.tweens.paused = true;
            return;
        }

        this.physics.world.resume();
        this.time.paused = false;
        this.tweens.paused = false;
        this.player.anims.resume();
    }

    private handleFurnitureLayoutChanged(): void {
        this.seatingManager?.refresh();
    }
}
