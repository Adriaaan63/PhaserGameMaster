import { Scene, Time } from 'phaser';

import { ClientRace } from '../data/GameRegistry';
import { TILE } from '../data/constants';
import {
    eventBus,
    EVENT_BAND_STARTED,
    EVENT_BEVERAGE_FILLED,
    EVENT_CLIENT_SELECTED,
    EVENT_CLIENT_SEATED,
    EVENT_CLIENT_SATISFIED,
    EVENT_CLIENT_SPAWNED,
    EVENT_FURNITURE_PLACED,
    EVENT_GAME_MODE_CHANGED,
    EVENT_INTERACTABLE_PICKED,
    EVENT_TUTORIAL_CLOSED,
    EVENT_TUTORIAL_DRAG_COMPLETED,
    GAME_MODE_NIGHT,
    type ClientSelectedData,
    type ClientSeatedData,
    type ClientSpawnedData,
    type FurniturePlacedData,
    type GameModeChangedData,
    type InteractablePickedData,
    type TutorialClosedData,
} from '../utils/EventBus';
import { TutorialManager } from './TutorialManager';

type Night1Stage =
    | 'MOVE_DIALOG'
    | 'BUILD_DIALOG'
    | 'BUILD_ACTION'
    | 'OPEN_DIALOG'
    | 'OPEN_ACTION'
    | 'OBJECT_DIALOG'
    | 'OBJECT_ACTION'
    | 'TOWER_DIALOG'
    | 'TOWER_ACTION'
    | 'BAND_DIALOG'
    | 'BAND_ACTION'
    | 'WAITING_FOR_FIRST_CLIENT'
    | 'CLIENT_DIALOG'
    | 'CLIENT_ACTION'
    | 'CHAIR_ACTION'
    | 'SERVICE'
    | 'REWARD_DIALOG'
    | 'COMPLETE';

interface TutorialTargets {
    readonly emptyCups: readonly { readonly tileX: number; readonly tileY: number }[];
    readonly beverageTower: { readonly tileX: number; readonly tileY: number };
    readonly band: { readonly tileX: number; readonly tileY: number };
    readonly firstClient: (clientId: number) => { readonly tileX: number; readonly tileY: number } | null;
    readonly chairs: () => readonly { readonly tileX: number; readonly tileY: number }[];
    readonly buildTarget: () => { readonly tileX: number; readonly tileY: number };
    readonly furnitureSlot: () => { readonly x: number; readonly y: number };
}

/** Enforces the exact guided sequence for the first tutorial night. */
export class Night1Script {
    private startupTimer: Time.TimerEvent | null = null;
    private stage: Night1Stage = 'MOVE_DIALOG';
    private placedTable = false;
    private placedChairs = 0;
    private nightStarted = false;
    private destroyed = false;

    private readonly handleTutorialClosed = (data: TutorialClosedData): void => {
        if (this.destroyed || data.reason === 'DESTROYED') return;
        switch (this.stage) {
            case 'MOVE_DIALOG':
                this.showBuildDialog();
                break;
            case 'BUILD_DIALOG':
                this.stage = 'BUILD_ACTION';
                this.tutorial.showDragAndDrop(
                    this.getFurnitureSlotPosition().x,
                    this.getFurnitureSlotPosition().y,
                    this.getBuildTargetScreenPosition().x,
                    this.getBuildTargetScreenPosition().y,
                );
                break;
            case 'OPEN_DIALOG':
                this.stage = 'OPEN_ACTION';
                this.tutorial.showButtonHint('open');
                break;
            case 'OBJECT_DIALOG':
                this.stage = 'OBJECT_ACTION';
                this.pointToCups();
                break;
            case 'TOWER_DIALOG':
                this.stage = 'TOWER_ACTION';
                this.tutorial.pointToWorld(
                    this.targets.beverageTower.tileX * TILE + TILE / 2,
                    this.targets.beverageTower.tileY * TILE + TILE / 2,
                );
                break;
            case 'BAND_DIALOG':
                this.stage = 'BAND_ACTION';
                this.tutorial.pointToWorld(
                    this.targets.band.tileX * TILE + TILE / 2,
                    this.targets.band.tileY * TILE + TILE / 2,
                );
                break;
            case 'CLIENT_DIALOG':
                this.stage = 'CLIENT_ACTION';
                this.pointToFirstClient();
                break;
            case 'REWARD_DIALOG':
                this.stage = 'COMPLETE';
                this.tutorial.hide();
                break;
            default:
                break;
        }
    };

    private readonly handleDragCompleted = (): void => {
        if (this.stage !== 'BUILD_ACTION') return;
        this.tutorial.pointToScreen(
            this.getHudButtonPosition('build').x,
            this.getHudButtonPosition('build').y,
        );
    };

    private readonly handleFurniturePlaced = (data: FurniturePlacedData): void => {
        if (this.stage !== 'BUILD_ACTION') return;
        if (data.furnitureId.startsWith('mesa_')) this.placedTable = true;
        if (data.furnitureId.startsWith('silla_')) this.placedChairs++;
        if (this.placedTable && this.placedChairs >= 2) {
            this.stage = 'OPEN_DIALOG';
            this.tutorial.showTutorial(
                'When everything is ready, open the cantina from the top bar.',
            );
        }
    };

    private readonly handleModeChanged = (data: GameModeChangedData): void => {
        if (data.mode !== GAME_MODE_NIGHT || this.nightStarted) return;
        this.stage = 'OBJECT_DIALOG';
        this.tutorial.showTutorial(
            'Objects are used with Space when Wuher is facing them. Tonight only drinks and music are available.',
        );
        this.nightStarted = true;
    };

    private readonly handlePicked = (data: InteractablePickedData): void => {
        if (this.stage !== 'OBJECT_ACTION' || data.objectType !== 'EMPTY_CUP') return;
        this.stage = 'TOWER_DIALOG';
        this.tutorial.showTutorial(
            'The central Beverage Tower fills an empty cup. Carry a cup there and hold Space until it is full.',
        );
    };

    private readonly handleBeverageFilled = (): void => {
        if (this.stage !== 'TOWER_ACTION') return;
        this.stage = 'BAND_DIALOG';
        this.tutorial.showTutorial(
            'The Bith Band satisfies every seated music order at once. Stand near the band and press Space to start the performance.',
        );
    };

    private readonly handleBandStarted = (): void => {
        if (this.stage !== 'BAND_ACTION') return;
        this.stage = 'WAITING_FOR_FIRST_CLIENT';
        this.tutorial.hide();
    };

    private readonly handleClientSpawned = (data: ClientSpawnedData): void => {
        if (this.stage !== 'WAITING_FOR_FIRST_CLIENT' || data.clientId !== 1) return;
        this.stage = 'CLIENT_DIALOG';
        this.tutorial.showTutorial(
            'When a customer is waiting, press Space while facing them to select them. Then choose a highlighted free chair.',
        );
    };

    private readonly handleClientSelected = (data: ClientSelectedData): void => {
        if (this.stage !== 'CLIENT_ACTION' || data.clientId !== 1) return;
        this.stage = 'SERVICE';
        this.tutorial.pointToWorldMany(this.targets.chairs().map((chair) => ({
            x: chair.tileX * TILE + TILE / 2,
            y: chair.tileY * TILE + TILE / 2,
        })));
    };

    private readonly handleClientSeated = (data: ClientSeatedData): void => {
        if (this.stage !== 'SERVICE' || data.clientId !== 1) return;
        this.tutorial.showTutorial(
            'A seated customer is now waiting for service. Read the order bubble, take an empty cup, fill it at the Beverage Tower while holding Space, and deliver the drink with Space.',
        );
    };

    private readonly handleSatisfied = (): void => {
        if (this.stage !== 'SERVICE') return;
        this.stage = 'REWARD_DIALOG';
        this.tutorial.showTutorial(
            'The customer dropped credits on the floor. Collect them quickly. If you wait too long, rats may steal them. If they steal them, you can scare them with Space. Then, keep serving customers.',
        );
    };

    public constructor(
        private readonly scene: Scene,
        private readonly tutorial: TutorialManager,
        private readonly targets: TutorialTargets,
    ) {
        eventBus.on(EVENT_TUTORIAL_CLOSED, this.handleTutorialClosed);
        eventBus.on(EVENT_TUTORIAL_DRAG_COMPLETED, this.handleDragCompleted);
        eventBus.on(EVENT_FURNITURE_PLACED, this.handleFurniturePlaced);
        eventBus.on(EVENT_INTERACTABLE_PICKED, this.handlePicked);
        eventBus.on(EVENT_BEVERAGE_FILLED, this.handleBeverageFilled);
        eventBus.on(EVENT_BAND_STARTED, this.handleBandStarted);
        eventBus.on(EVENT_CLIENT_SPAWNED, this.handleClientSpawned);
        eventBus.on(EVENT_CLIENT_SELECTED, this.handleClientSelected);
        eventBus.on(EVENT_CLIENT_SEATED, this.handleClientSeated);
        eventBus.on(EVENT_CLIENT_SATISFIED, this.handleSatisfied);
        eventBus.on(EVENT_GAME_MODE_CHANGED, this.handleModeChanged);
        this.startupTimer = scene.time.delayedCall(0, () => {
            this.startupTimer = null;
            this.tutorial.showTutorial('Welcome to Chalmun’s Cantina. Move Wuher with WASD.');
        });
        scene.events.once('shutdown', this.destroy, this);
        scene.events.once('destroy', this.destroy, this);
    }

    public get forcedRace(): ClientRace {
        return ClientRace.HUMAN;
    }

    public destroy(): void {
        if (this.destroyed) return;
        this.destroyed = true;
        this.startupTimer?.remove(false);
        this.startupTimer = null;
        eventBus.off(EVENT_TUTORIAL_CLOSED, this.handleTutorialClosed);
        eventBus.off(EVENT_TUTORIAL_DRAG_COMPLETED, this.handleDragCompleted);
        eventBus.off(EVENT_FURNITURE_PLACED, this.handleFurniturePlaced);
        eventBus.off(EVENT_INTERACTABLE_PICKED, this.handlePicked);
        eventBus.off(EVENT_BEVERAGE_FILLED, this.handleBeverageFilled);
        eventBus.off(EVENT_BAND_STARTED, this.handleBandStarted);
        eventBus.off(EVENT_CLIENT_SPAWNED, this.handleClientSpawned);
        eventBus.off(EVENT_CLIENT_SELECTED, this.handleClientSelected);
        eventBus.off(EVENT_CLIENT_SEATED, this.handleClientSeated);
        eventBus.off(EVENT_CLIENT_SATISFIED, this.handleSatisfied);
        eventBus.off(EVENT_GAME_MODE_CHANGED, this.handleModeChanged);
    }

    private showBuildDialog(): void {
        this.stage = 'BUILD_DIALOG';
        this.tutorial.showTutorial(
            'Build Mode lets you prepare the cantina. Drag tables and chairs from the bottom inventory onto valid tiles in the room. The cantina needs one table and two chairs.',
        );
    }

    private pointToFirstClient(): void {
        const position = this.targets.firstClient(1);
        if (position === null) return;
        this.tutorial.pointToWorld(position.tileX * TILE + TILE / 2, position.tileY * TILE + TILE / 2);
    }

    private pointToCups(): void {
        this.tutorial.pointToWorldMany(this.targets.emptyCups.map((cup) => ({
            x: cup.tileX * TILE + TILE / 2,
            y: cup.tileY * TILE + TILE / 2,
        })));
    }

    private getHudButtonPosition(id: 'build' | 'open'): { readonly x: number; readonly y: number } {
        const slotIndex = id === 'build' ? 6 : 7;
        const width = this.scene.scale.width;
        const margin = 12;
        const slotWidth = (width - margin * 2) / 8;
        return {
            x: margin + slotWidth * (slotIndex + 0.5),
            y: 26,
        };
    }

    private getFurnitureSlotPosition(): { readonly x: number; readonly y: number } {
        return this.targets.furnitureSlot();
    }

    private getBuildTargetScreenPosition(): { readonly x: number; readonly y: number } {
        const target = this.targets.buildTarget();
        const worldX = target.tileX * TILE + TILE;
        const worldY = target.tileY * TILE + TILE;
        const camera = this.scene.cameras.main;
        return {
            x: camera.x + (worldX - camera.worldView.x) * camera.zoom,
            y: camera.y + (worldY - camera.worldView.y) * camera.zoom,
        };
    }
}
