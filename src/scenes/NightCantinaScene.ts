import { Input, Scene } from 'phaser';

import {
    CREDITS_REGISTRY_KEY,
    EMPTY_GLASSES_REGISTRY_KEY,
    GAME_REGISTRY,
    SCRAPS_REGISTRY_KEY,
} from '../data/GameRegistry';
import { Player } from '../entities/Player';
import { InteractableObject } from '../entities/InteractableObject';
import { WantedPoster } from '../entities/WantedPoster';
import { InventoryCrate } from '../entities/InventoryCrate';
import { BeverageTower } from '../entities/stations/BeverageTower';
import { Grill } from '../entities/stations/Grill';
import { GridManager, TILE_TYPE_TABLE } from '../managers/GridManager';
import { PlacementManager } from '../managers/PlacementManager';
import { ROOM_H, ROOM_SCALE, ROOM_W, TILE, VIEW_Y } from '../data/constants';
import { Client } from '../entities/Client';
import { ClientManager } from '../managers/ClientManager';
import { AffinityManager } from '../managers/AffinityManager';
import { CoinManager } from '../managers/CoinManager';
import { DeadBodyManager } from '../managers/DeadBodyManager';
import { FightManager } from '../managers/FightManager';
import { HazardManager } from '../managers/HazardManager';
import { PathfindingManager } from '../managers/PathfindingManager';
import { SeatingManager } from '../managers/SeatingManager';
import { ThreatManager } from '../managers/ThreatManager';
import { BandManager } from '../managers/BandManager';
import { AudioManager } from '../managers/AudioManager';
import { RatManager } from '../managers/RatManager';
import { ReputationManager } from '../managers/ReputationManager';
import { JabbaRaidManager } from '../managers/JabbaRaidManager';
import { WantedManager } from '../managers/WantedManager';
import { ProgressionManager } from '../managers/ProgressionManager';
import { TutorialManager } from '../managers/TutorialManager';
import { Night1Script } from '../managers/Night1Script';
import { Night2Script } from '../managers/Night2Script';
import { UIScene } from './UIScene';
import {
    EVENT_CANTINA_OPEN,
    EVENT_GAME_MODE_CHANGED,
    EVENT_GAME_WARNING,
    EVENT_FURNITURE_PLACED,
    EVENT_FURNITURE_REMOVED,
    EVENT_FURNITURE_REPAIRED,
    EVENT_CLIENT_SELECTED,
    EVENT_CHAIR_ASSIGNED,
    EVENT_TOGGLE_BUILD_MODE,
    EVENT_TOGGLE_CLIENT_GUIDE,
    EVENT_CLIENT_SATISFIED,
    EVENT_CLIENT_MURDERED,
    EVENT_DEAD_BODY_CLEANED,
    EVENT_DEAD_BODY_CREATED,
    EVENT_CLOSE_WANTED_POSTER,
    EVENT_OPEN_WANTED_POSTER,
    EVENT_NIGHT_ENDED,
    EVENT_NIGHT_END_REQUESTED,
    EVENT_NIGHT_END_READY,
    EVENT_TUTORIAL_PAUSE_CHANGED,
    EVENT_NIGHT_FEATURES_CHANGED,
    eventBus,
    GAME_MODE_NIGHT,
    GAME_MODE_PRE_OPENING,
    type BuildModeToggledData,
    type ToggleClientGuideData,
    type ClientSatisfiedData,
    type ClientMurderedData,
    type DeadBodyData,
    type TutorialPauseChangedData,
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
    private affinityManager!: AffinityManager;
    private seatingManager!: SeatingManager;
    private pathfindingManager!: PathfindingManager;
    private fightManager!: FightManager;
    private threatManager!: ThreatManager;
    private reputationManager!: ReputationManager;
    private jabbaRaidManager!: JabbaRaidManager;
    private wantedManager!: WantedManager;
    private wantedPoster: WantedPoster | null = null;
    private inventoryCrate: InventoryCrate | null = null;
    private bandManager!: BandManager;
    private audioManager!: AudioManager;
    private ratManager!: RatManager;
    private deadBodyManager!: DeadBodyManager;
    private hazardManager!: HazardManager;
    private selectedClient: Client | null = null;
    private cancelAssignmentKey!: Input.Keyboard.Key;
    private debugNight2Key: Input.Keyboard.Key | null = null;
    private debugF2Key: Input.Keyboard.Key | null = null;
    private buildModeEnabled = true;
    private isClientGuideOpen = false;
    private isWantedPosterOpen = false;
    private isNightGameplayPaused = false;
    private nightEnding = false;
    private coinManager!: CoinManager;
    private progressionManager!: ProgressionManager;
    private tutorialManager!: TutorialManager;
    private night1Script: Night1Script | null = null;
    private night2Script: Night2Script | null = null;
    private isTutorialPaused = false;

    public constructor() {
        super('NightCantinaScene');
    }

    private handleNightEndReady(): void {
        this.isTutorialPaused = true;
        this.updateNightGameplayPause();
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
        if (typeof this.registry.get(CREDITS_REGISTRY_KEY) !== 'number') {
            this.registry.set(CREDITS_REGISTRY_KEY, GAME_REGISTRY.economy.startingCredits);
        }
        if (typeof this.registry.get(SCRAPS_REGISTRY_KEY) !== 'number') {
            this.registry.set(SCRAPS_REGISTRY_KEY, GAME_REGISTRY.repairs.startingScraps);
        }
        if (typeof this.registry.get(EMPTY_GLASSES_REGISTRY_KEY) !== 'number') {
            this.registry.set(EMPTY_GLASSES_REGISTRY_KEY, 0);
        }
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
        this.bandManager = new BandManager(this, this.gridManager, GAME_REGISTRY.band);
        this.audioManager = new AudioManager(this, GAME_REGISTRY.audio);
        this.registry.set('foodStock', 5);
        this.progressionManager = new ProgressionManager(this);
        this.tutorialManager = new TutorialManager(this);

        // Spawn the player at the Wuher spawn point (object layer) or map center.
        const spawnPoint = this.findSpawnPoint(map);
        this.player = new Player(this, spawnPoint.x, spawnPoint.y, this.gridManager);
        const keyboard = this.input.keyboard;
        if (keyboard === null) {
            throw new Error('No se encontró el teclado para cancelar la asignación de clientes.');
        }
        this.cancelAssignmentKey = keyboard.addKey(Input.Keyboard.KeyCodes.ESC);
        this.debugNight2Key = keyboard.addKey(Input.Keyboard.KeyCodes.TWO);
        this.debugF2Key = keyboard.addKey(Input.Keyboard.KeyCodes.F2);
        this.debugNight2Key.on('down', () => this.debugJumpToNight(2));
        this.debugF2Key.on('down', () => this.debugJumpToNight(2));
        this.updatePlayerDepth();
        this.createTestInteractableObjects();
        this.createServiceStations(map);
        this.createWantedPoster();
        this.createInventoryCrate(map);

        this.seatingManager = new SeatingManager(this, this.gridManager);
        // Placement receives seating state so it cannot remove reserved chairs.
        this.placementManager = new PlacementManager(this, this.gridManager, this.player, this.seatingManager);
        this.pathfindingManager = new PathfindingManager(this.gridManager);
        this.coinManager = new CoinManager(this, this.player, this.pathfindingManager);
        this.reputationManager = new ReputationManager(this);
        this.wantedManager = new WantedManager(
            this,
            this.gridManager,
            this.pathfindingManager,
            this.reputationManager,
        );
        this.ratManager = new RatManager(
            this,
            this.gridManager.getObjectZoneCenterTiles('spawn_ratas'),
            this.coinManager,
            this.pathfindingManager,
        );
        this.clientManager = new ClientManager(
            this,
            this.gridManager,
            this.coinManager,
            this.seatingManager,
            this.pathfindingManager,
            () => this.bandManager.isBandPlaying,
            () => this.wantedManager.currentProfile,
        );
        this.wantedManager.setClientManager(this.clientManager);
        this.coinManager.setBlockedPositionProvider(() => this.clientManager.getOccupiedPositions());
        this.deadBodyManager = new DeadBodyManager(this, this.gridManager);
        this.affinityManager = new AffinityManager(this.clientManager, this.gridManager);
        this.hazardManager = new HazardManager(this.clientManager, this.gridManager);
        this.fightManager = new FightManager(this.clientManager, this.pathfindingManager);
        this.threatManager = new ThreatManager(this);
        this.jabbaRaidManager = new JabbaRaidManager(
            this,
            this.player,
            this.clientManager,
            this.gridManager,
            this.pathfindingManager,
            this.placementManager,
        );
        if (this.progressionManager.currentNight === 1) {
            this.night1Script = new Night1Script(this, this.tutorialManager, {
                emptyCups: [{ tileX: 9, tileY: 6 }, { tileX: 14, tileY: 6 }],
                beverageTower: { tileX: 11, tileY: 9 },
                band: this.gridManager.getObjectZoneCenterTiles('zonaBanda')[0]
                    ?? { tileX: 16, tileY: 10 },
                firstClient: (clientId) => {
                    const client = this.clientManager.getClientById(clientId);
                    return client === null ? null : client.currentTile;
                },
                chairs: () => this.seatingManager.getValidChairs(),
                buildTarget: () => {
                    for (let tileY = 0; tileY < map.height - 1; tileY++) {
                        for (let tileX = 0; tileX < map.width - 1; tileX++) {
                            if (this.gridManager.isTileBuildable(tileX, tileY, 2, 2)) {
                                return { tileX, tileY };
                            }
                        }
                    }
                    return { tileX: 1, tileY: 1 };
                },
                furnitureSlot: () => {
                    const uiScene = this.scene.get('UIScene') as UIScene;
                    return uiScene.getInventoryUI().getFurnitureSlotCenter('mesa_redonda_0');
                },
            });
        } else if (this.progressionManager.currentNight === 2) {
            this.createNight2Script();
        }
        eventBus.on(EVENT_TUTORIAL_PAUSE_CHANGED, this.handleTutorialPauseChanged, this);
        eventBus.on(EVENT_NIGHT_ENDED, this.handleNightEnded, this);
        eventBus.on(EVENT_NIGHT_END_REQUESTED, this.handleNightEndRequested, this);
        eventBus.on(EVENT_NIGHT_END_READY, this.handleNightEndReady, this);
        this.player.setNightInteractionHandler(this.handleNightInteraction);
        this.player.setNightHoldInteractionHandler(this.handleNightHoldInteraction);
        eventBus.on(EVENT_TOGGLE_BUILD_MODE, this.handleBuildModeToggled, this);
        eventBus.on(EVENT_TOGGLE_CLIENT_GUIDE, this.handleClientGuideToggled, this);
        eventBus.on(EVENT_FURNITURE_PLACED, this.handleFurnitureLayoutChanged, this);
        eventBus.on(EVENT_FURNITURE_REMOVED, this.handleFurnitureLayoutChanged, this);
        eventBus.on(EVENT_FURNITURE_REPAIRED, this.handleFurnitureLayoutChanged, this);
        eventBus.on(EVENT_CLIENT_SATISFIED, this.handleClientSatisfied, this);
        eventBus.on(EVENT_CLIENT_MURDERED, this.handleClientMurdered, this);
        eventBus.on(EVENT_DEAD_BODY_CREATED, this.handleDeadBodyChanged, this);
        eventBus.on(EVENT_OPEN_WANTED_POSTER, this.handleWantedPosterOpened, this);
        eventBus.on(EVENT_CLOSE_WANTED_POSTER, this.handleWantedPosterClosed, this);
        eventBus.on(EVENT_DEAD_BODY_CLEANED, this.handleDeadBodyChanged, this);
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
        this.physics.add.collider(this.player, this.clientManager.getCollisionGroup());
        this.physics.add.collider(this.player, this.deadBodyManager.getCollisionGroup());

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
        if (this.nightEnding && !this.isNightGameplayPaused) {
            this.checkNightEndReady();
        }
        if (this.isNightGameplayPaused) {
            if (this.buildModeEnabled) this.placementManager.update();
            return;
        }
        const cancelSelectionPressed = Input.Keyboard.JustDown(this.cancelAssignmentKey);
        if (this.selectedClient !== null && this.selectedClient.clientState !== 'WAITING_IN_LINE') {
            this.clearClientSelection();
        }
        if (this.selectedClient !== null && cancelSelectionPressed) {
            this.clearClientSelection();
            eventBus.emit(EVENT_GAME_WARNING, { message: 'Asignación cancelada.' });
        }
        this.player.update(delta);
        this.updatePlayerDepth();
        this.placementManager.update();
        this.fightManager.update(delta);
        this.clientManager.update(delta);
        this.coinManager.update();
        this.ratManager.update(delta);
        this.jabbaRaidManager.update(delta);
        this.wantedManager.update(delta);
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

    private createWantedPoster(): void {
        const objectLayer = this.gridManager.tilemap.getObjectLayer('Objetos')
            ?? this.gridManager.tilemap.getObjectLayer('objetos');
        const posterObject = objectLayer?.objects.find((object) =>
            object.name?.toLowerCase() === 'cartel'
            || object.type?.toLowerCase() === 'busca_captura',
        );
        if (
            posterObject === undefined
            || posterObject.x === undefined
            || posterObject.y === undefined
        ) return;
        const posterTile = {
            tileX: Math.floor((posterObject.x + (posterObject.width ?? TILE) / 2) / TILE),
            tileY: Math.floor((posterObject.y + (posterObject.height ?? TILE) / 2) / TILE),
        };
        const posterDepth = this.getWantedPosterDepth(posterTile.tileX, posterTile.tileY);
        this.wantedPoster = new WantedPoster(
            this,
            posterTile,
            {
                x: posterObject.x + (posterObject.width ?? TILE) / 2,
                y: posterObject.y + (posterObject.height ?? TILE) / 2,
            },
            posterDepth,
            () => eventBus.emit(EVENT_OPEN_WANTED_POSTER, {
                profile: this.wantedManager.currentProfile,
            }),
        );
        this.wantedPoster.setVisible(this.progressionManager.currentNight > 1);
    }

    private getWantedPosterDepth(tileX: number, tileY: number): number {
        const wallsLayer = this.gridManager.tilemap.getLayer('paredes')?.tilemapLayer;
        const highWallsLayer = this.gridManager.tilemap.getLayer('paredes_altas')?.tilemapLayer;
        if (wallsLayer === null || wallsLayer === undefined || highWallsLayer === null || highWallsLayer === undefined) {
            return (tileY + 1) * TILE + 0.5;
        }

        let baseTileY = tileY;
        for (let offsetY = 1; offsetY <= 15; offsetY++) {
            if (wallsLayer.hasTileAt(tileX, tileY + offsetY)) {
                baseTileY = tileY + offsetY;
                break;
            }
        }

        if (!highWallsLayer.hasTileAt(tileX, tileY)) {
            return (baseTileY + 1) * TILE + 0.5;
        }

        return (baseTileY + 1) * TILE + 1.5;
    }

    private createInventoryCrate(map: Phaser.Tilemaps.Tilemap): void {
        const objectLayer = map.getObjectLayer('Objetos') ?? map.getObjectLayer('objetos');
        const crateObject = objectLayer?.objects.find((object) =>
            object.name?.toLowerCase() === 'caja_inventario'
            || object.type?.toLowerCase() === 'caja_inventario',
        );
        if (
            crateObject === undefined
            || crateObject.x === undefined
            || crateObject.y === undefined
        ) return;
        this.inventoryCrate = new InventoryCrate(
            this,
            crateObject.x + (crateObject.width ?? TILE) / 2,
            crateObject.y + (crateObject.height ?? TILE) / 2,
        );
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

        this.clientManager.configureNight(
            this.progressionManager.difficulty,
            this.progressionManager.currentNight === 1
                ? {
                    forcedRace: this.night1Script?.forcedRace ?? null,
                    allowedOrderItems: ['FILLED_CUP', 'MUSIC'],
                    wantedEnabled: false,
                    spawnAfterBand: true,
                }
                : undefined,
        );
        this.threatManager.setEnabled(this.progressionManager.currentNight > 1);
        this.reputationManager.setEnabled(this.progressionManager.currentNight > 1);
        this.wantedManager.setEnabled(this.progressionManager.currentNight > 1);
        eventBus.emit(EVENT_NIGHT_FEATURES_CHANGED, {
            clientGuideEnabled: this.progressionManager.currentNight > 1,
            advancedSystemsEnabled: this.progressionManager.currentNight > 1,
        });
        this.wantedPoster?.setVisible(this.progressionManager.currentNight > 1);
        this.registry.set('gameMode', GAME_MODE_NIGHT);
        this.placementManager.setEnabled(false);
        this.clientManager.setEnabled(true);
        this.progressionManager.startNight();
    }

    private cleanupModeEvents(): void {
        eventBus.off(EVENT_CANTINA_OPEN, this.handleOpenCantina, this);
        eventBus.off(EVENT_TUTORIAL_PAUSE_CHANGED, this.handleTutorialPauseChanged, this);
        eventBus.off(EVENT_NIGHT_ENDED, this.handleNightEnded, this);
        eventBus.off(EVENT_NIGHT_END_REQUESTED, this.handleNightEndRequested, this);
        eventBus.off(EVENT_NIGHT_END_READY, this.handleNightEndReady, this);
    }

    private handleNightInteraction = (tileX: number, tileY: number): boolean => {
        if (this.wantedManager.interactAt(tileX, tileY)) return true;
        if (this.registry.get('gameMode') !== GAME_MODE_NIGHT || this.buildModeEnabled) return false;

        if (this.ratManager.scareAt(tileX, tileY)) return true;

        if (this.bandManager.isInteractionTile(tileX, tileY)) {
            if (this.player.getHeldObjectType() !== null) {
                eventBus.emit(EVENT_GAME_WARNING, { message: 'Deja el objeto para dar la señal a la banda.' });
                return true;
            }
            this.clearClientSelection();
            if (!this.bandManager.startPerformance()) {
                eventBus.emit(EVENT_GAME_WARNING, {
                    message: this.bandManager.isBandPlaying
                        ? 'La banda ya está tocando.'
                        : 'La banda no está disponible en este escenario.',
                });
            }
            return true;
        }

        if (this.deadBodyManager.hasBodyAt(tileX, tileY)) {
            if (this.player.getHeldObjectType() !== null) {
                eventBus.emit(EVENT_GAME_WARNING, { message: 'Deja el objeto para limpiar el cadáver.' });
            }
            return true;
        }
        if (this.selectedClient !== null && this.selectedClient.clientState !== 'WAITING_IN_LINE') {
            this.clearClientSelection();
        }

        const fightingClient = this.clientManager.getFightingClientAt(tileX, tileY);
        if (fightingClient !== null) {
            if (this.player.getHeldObjectType() !== null) {
                eventBus.emit(EVENT_GAME_WARNING, { message: 'Deja el objeto para separar la pelea.' });
                return true;
            }
            return this.fightManager.intervene(fightingClient.clientId);
        }

        const orderClient = this.clientManager.getClientWaitingForOrderAt(tileX, tileY);
        const heldItemType = this.player.getHeldObjectType();
        if (orderClient !== null && heldItemType !== null) {
            if (orderClient.orderItemId !== heldItemType) {
                eventBus.emit(EVENT_GAME_WARNING, { message: 'Ese cliente pidió otra cosa.' });
                return true;
            }

            if (this.player.consumeHeldObject(heldItemType) && orderClient.receiveOrder(heldItemType)) {
                return true;
            }

            eventBus.emit(EVENT_GAME_WARNING, { message: 'No se pudo entregar el pedido.' });
            return true;
        }

        if (this.selectedClient !== null) return this.assignSelectedClient(tileX, tileY);
        const client = this.clientManager.getWaitingClients().find((candidate) =>
            this.worldToTile(candidate.x) === tileX && this.worldToTile(candidate.y) === tileY,
        );
        if (client === undefined) return false;
        if (this.seatingManager.getValidChairs().length === 0) {
            eventBus.emit(EVENT_GAME_WARNING, { message: 'No hay sillas libres para este cliente.' });
            return true;
        }
        this.selectedClient = client;
        client.setSelected(true);
        this.seatingManager.setHighlightsEnabled(true);
        eventBus.emit(EVENT_CLIENT_SELECTED, { clientId: client.clientId });
        return true;
    };

    private handleNightHoldInteraction = (
        target: { readonly tileX: number; readonly tileY: number } | null,
        interactionHeld: boolean,
        handsEmpty: boolean,
        deltaMs: number,
    ): boolean => this.deadBodyManager?.updateCleaning(target, interactionHeld, handsEmpty, deltaMs) ?? false;

    private handleWantedPosterOpened(): void {
        this.isWantedPosterOpen = true;
        this.updateNightGameplayPause();
    }

    private handleWantedPosterClosed(): void {
        this.isWantedPosterOpen = false;
        this.updateNightGameplayPause();
    }

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
            if (this.seatingManager.getValidChairs().length === 0) {
                this.clearClientSelection();
                eventBus.emit(EVENT_GAME_WARNING, {
                    message: 'Ya no quedan sillas libres. Asignación cancelada.',
                });
                return true;
            }
            if (this.seatingManager.isChair(tileX, tileY)) {
                eventBus.emit(EVENT_GAME_WARNING, { message: 'Esa silla está inactiva u ocupada.' });
                return true;
            }
            return false;
        }
        const start = {
            tileX: this.worldToTile(client.x),
            tileY: this.worldToTile(client.y),
        };
        const route = this.pathfindingManager.findPath(
            start,
            { tileX, tileY },
            this.clientManager.getOccupiedPositions(client.clientId),
        );
        if (route === null || route.length === 0 || !this.seatingManager.reserve(client.clientId, tileX, tileY)) {
            console.warn('No se encontró una ruta válida hasta esa silla.');
            return true;
        }
        if (!client.assignRoute(route)) {
            this.seatingManager.release(client.clientId, tileX, tileY);
            this.clearClientSelection();
            eventBus.emit(EVENT_GAME_WARNING, { message: 'El cliente ya no puede recibir una silla.' });
            return true;
        }
        this.clearClientSelection();
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

    private clearClientSelection(): void {
        this.selectedClient?.setSelected(false);
        this.selectedClient = null;
        this.seatingManager?.setHighlightsEnabled(false);
    }

    private cleanupClientSystems(): void {
        eventBus.off(EVENT_TOGGLE_BUILD_MODE, this.handleBuildModeToggled, this);
        eventBus.off(EVENT_TOGGLE_CLIENT_GUIDE, this.handleClientGuideToggled, this);
        eventBus.off(EVENT_FURNITURE_PLACED, this.handleFurnitureLayoutChanged, this);
        eventBus.off(EVENT_FURNITURE_REMOVED, this.handleFurnitureLayoutChanged, this);
        eventBus.off(EVENT_FURNITURE_REPAIRED, this.handleFurnitureLayoutChanged, this);
        eventBus.off(EVENT_CLIENT_SATISFIED, this.handleClientSatisfied, this);
        eventBus.off(EVENT_CLIENT_MURDERED, this.handleClientMurdered, this);
        eventBus.off(EVENT_DEAD_BODY_CREATED, this.handleDeadBodyChanged, this);
        eventBus.off(EVENT_OPEN_WANTED_POSTER, this.handleWantedPosterOpened, this);
        eventBus.off(EVENT_CLOSE_WANTED_POSTER, this.handleWantedPosterClosed, this);
        eventBus.off(EVENT_DEAD_BODY_CLEANED, this.handleDeadBodyChanged, this);
        this.input.off('pointerdown', this.handlePointerDown, this);
        this.player?.setNightInteractionHandler(null);
        this.player?.setNightHoldInteractionHandler(null);
        if (this.cancelAssignmentKey !== undefined) {
            this.input.keyboard?.removeKey(this.cancelAssignmentKey);
        }
        if (this.debugNight2Key !== null) {
            this.input.keyboard?.removeKey(this.debugNight2Key);
            this.debugNight2Key = null;
        }
        if (this.debugF2Key !== null) {
            this.input.keyboard?.removeKey(this.debugF2Key);
            this.debugF2Key = null;
        }
        this.clearClientSelection();
        this.fightManager?.destroy();
        this.bandManager?.destroy();
        this.audioManager?.destroy();
        this.threatManager?.destroy();
        this.jabbaRaidManager?.destroy();
        this.wantedManager?.destroy();
        this.wantedPoster?.destroy();
        this.wantedPoster = null;
        this.inventoryCrate?.destroy();
        this.inventoryCrate = null;
        this.reputationManager?.destroy();
        this.hazardManager?.destroy();
        this.affinityManager?.destroy();
        this.deadBodyManager?.destroy();
        this.clientManager?.destroy();
        this.seatingManager?.destroy();
        this.ratManager?.destroy();
        this.coinManager?.destroy();
        this.night1Script?.destroy();
        this.night2Script?.destroy();
        this.tutorialManager?.destroy();
        this.progressionManager?.destroy();
    }

    private handleBuildModeToggled(data: BuildModeToggledData): void {
        this.buildModeEnabled = data.enabled;
        if (data.enabled) this.clearClientSelection();
        this.updateNightGameplayPause();
    }

    private handleClientGuideToggled(data: ToggleClientGuideData): void {
        this.isClientGuideOpen = data.enabled;
        this.updateNightGameplayPause();
    }

    private updateNightGameplayPause(): void {
        const isNight = this.registry.get('gameMode') === GAME_MODE_NIGHT;
        const shouldPauseGameplay = this.isWantedPosterOpen
            || this.isClientGuideOpen
            || this.isTutorialPaused
            || (isNight && this.buildModeEnabled);
        if (this.isNightGameplayPaused === shouldPauseGameplay) return;
        this.isNightGameplayPaused = shouldPauseGameplay;

        if (shouldPauseGameplay) {
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

    private handleTutorialPauseChanged(data: TutorialPauseChangedData): void {
        this.isTutorialPaused = data.paused;
        this.updateNightGameplayPause();
    }

    private handleNightEndRequested(): void {
        this.nightEnding = true;
        this.clientManager.setEnabled(false);
        this.isTutorialPaused = false;
        this.updateNightGameplayPause();
    }

    private checkNightEndReady(): void {
        if (this.bandManager.isBandPlaying) return;
        const pendingMusicRewards = this.clientManager.getClients().some((client) => (
            client.clientState === 'SATISFIED' && client.orderItemId === 'MUSIC'
        ));
        if (pendingMusicRewards) return;
        this.nightEnding = false;
        this.progressionManager.completeSafeNightEnd();
    }

    private handleNightEnded(): void {
        if (this.progressionManager.currentNight === 2 && this.night2Script === null) {
            this.createNight2Script();
        }
        this.clientManager.setEnabled(false);
        this.seatingManager.clearOccupancy();
        this.clientManager.clearClients();
        this.placementManager.setEnabled(true);
        eventBus.emit(EVENT_NIGHT_FEATURES_CHANGED, {
            clientGuideEnabled: true,
            advancedSystemsEnabled: true,
        });
        this.wantedPoster?.setVisible(true);
        this.isTutorialPaused = false;
        this.nightEnding = false;
        this.setBuildModeForPreOpening();
    }

    private createNight2Script(): void {
        const posterTile = this.wantedPoster?.tilePosition
            ?? this.gridManager.getObjectZoneCenterTiles('cartel')[0]
            ?? { tileX: 4, tileY: 7 };
        this.night2Script = new Night2Script(this, this.tutorialManager, {
            wantedPoster: posterTile,
        });
    }

    private setBuildModeForPreOpening(): void {
        this.buildModeEnabled = true;
        eventBus.emit(EVENT_TOGGLE_BUILD_MODE, { enabled: true });
        this.updateNightGameplayPause();
    }

    private handleFurnitureLayoutChanged(): void {
        this.seatingManager?.refresh();
        this.affinityManager?.refresh();
        this.hazardManager?.refresh();
    }

    private handleClientSatisfied(data: ClientSatisfiedData): void {
        if (data.orderItemId !== 'FILLED_CUP') return;

        const surface = this.seatingManager.getAvailableServingSurface(data.seatTileX, data.seatTileY);
        if (surface === null) return;

        const emptyCup = new InteractableObject(this, surface.tileX, surface.tileY, 'EMPTY_CUP');
        if (!this.gridManager.registerInteractableObject(emptyCup, surface.tileX, surface.tileY)) {
            emptyCup.destroy();
        }
    }

    private handleClientMurdered(data: ClientMurderedData): void {
        const furnitureMarked = this.placementManager.markFurnitureDestroyed(
            data.furnitureTileX,
            data.furnitureTileY,
        );
        if (!furnitureMarked) {
            this.gridManager.markFurnitureDestroyed(data.furnitureTileX, data.furnitureTileY);
        }
        this.clientManager.removeMurderedClient(data.deadClientId);
        this.seatingManager.refresh();
    }

    private handleDeadBodyChanged(_data: DeadBodyData): void {
        this.seatingManager.refresh();
    }

    private debugJumpToNight(nightNumber: number): void {
        this.clearClientSelection();
        this.tutorialManager?.hide();
        this.tutorialManager?.showPointers([]);
        this.night1Script?.destroy();
        this.night1Script = null;
        this.night2Script?.destroy();
        this.night2Script = null;
        this.nightEnding = false;
        this.isTutorialPaused = false;
        this.updateNightGameplayPause();

        this.progressionManager.setNight(nightNumber);
        this.registry.set('gameMode', GAME_MODE_PRE_OPENING);
        eventBus.emit(EVENT_GAME_MODE_CHANGED, { mode: GAME_MODE_PRE_OPENING });
        eventBus.emit(EVENT_NIGHT_ENDED, {
            completedNight: nightNumber - 1,
            nextNight: nightNumber,
            reason: 'TUTORIAL_CONDITION',
        });
        eventBus.emit(EVENT_GAME_WARNING, {
            message: `[DEBUG] Saltando a Noche ${nightNumber}`,
        });
    }

}
