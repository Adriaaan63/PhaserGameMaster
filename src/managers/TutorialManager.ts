import { GameObjects, Scene } from 'phaser';

import {
    eventBus,
    EVENT_TUTORIAL_ADVANCE,
    EVENT_TUTORIAL_CLOSED,
    EVENT_TUTORIAL_PAUSE_CHANGED,
    EVENT_TUTORIAL_POINTER,
    EVENT_TUTORIAL_DRAG,
    EVENT_TUTORIAL_DRAG_COMPLETED,
    EVENT_TUTORIAL_BUTTON_HINT,
    EVENT_TUTORIAL_STARTED,
} from '../utils/EventBus';

export interface TutorialStep {
    readonly text: string;
    readonly pauseGameplay: boolean;
    readonly pointer?: { readonly x: number; readonly y: number };
}

/** Coordinates tutorial steps without coupling gameplay scenes to UI objects. */
export class TutorialManager {
    private steps: readonly TutorialStep[] = [];
    private stepIndex = -1;
    private isPaused = false;

    private readonly handleAdvance = (): void => {
        if (this.stepIndex < 0) return;
        this.stepIndex++;
        if (this.stepIndex >= this.steps.length) {
            this.close();
            return;
        }
        this.showCurrentStep();
    };

    private readonly handleClosed = (): void => {
        this.close(false);
    };

    private readonly handleDragCompleted = (): void => {
        this.setPaused(false);
    };

    public constructor(private readonly scene: Scene) {
        eventBus.on(EVENT_TUTORIAL_ADVANCE, this.handleAdvance);
        eventBus.on(EVENT_TUTORIAL_CLOSED, this.handleClosed);
        eventBus.on(EVENT_TUTORIAL_DRAG_COMPLETED, this.handleDragCompleted);
        scene.events.once('shutdown', this.destroy, this);
        scene.events.once('destroy', this.destroy, this);
    }

    public start(steps: readonly TutorialStep[]): void {
        this.steps = steps;
        this.stepIndex = 0;
        this.showCurrentStep();
    }

    public showTutorial(text: string, pauseGameplay = true): void {
        this.start([{ text, pauseGameplay }]);
    }

    public showPointer(x: number, y: number): void {
        this.showPointers([{ x, y }]);
    }

    public showPointers(points: readonly { readonly x: number; readonly y: number }[]): void {
        this.stepIndex = -1;
        this.steps = [];
        this.setPaused(false);
        eventBus.emit(EVENT_TUTORIAL_POINTER, {
            x: points[0]?.x ?? 0,
            y: points[0]?.y ?? 0,
            points,
            visible: points.length > 0,
        });
    }

    public showDragAndDrop(
        sourceX: number,
        sourceY: number,
        targetX: number,
        targetY: number,
    ): void {
        this.stepIndex = -1;
        this.steps = [];
        this.setPaused(true);
        eventBus.emit(EVENT_TUTORIAL_DRAG, { sourceX, sourceY, targetX, targetY });
    }

    public pointToScreen(x: number, y: number): void {
        this.showPointer(x, y);
    }

    public showButtonHint(button: 'open'): void {
        this.stepIndex = -1;
        this.steps = [];
        this.setPaused(false);
        eventBus.emit(EVENT_TUTORIAL_BUTTON_HINT, { button, visible: true });
    }

    public pointToWorld(x: number, y: number): void {
        const camera = this.scene.cameras.main;
        const pointX = camera.x + (x - camera.worldView.x) * camera.zoom;
        const pointY = camera.y + (y - camera.worldView.y) * camera.zoom;
        this.showPointer(pointX, pointY);
    }

    public pointToWorldMany(
        points: readonly { readonly x: number; readonly y: number }[],
    ): void {
        const camera = this.scene.cameras.main;
        this.showPointers(points.map((point) => ({
            x: camera.x + (point.x - camera.worldView.x) * camera.zoom,
            y: camera.y + (point.y - camera.worldView.y) * camera.zoom,
        })));
    }

    public hide(): void {
        eventBus.emit(EVENT_TUTORIAL_CLOSED);
        this.setPaused(false);
    }

    public pointTo(x: number, y: number): void {
        eventBus.emit(EVENT_TUTORIAL_POINTER, { x, y, visible: true });
    }

    public pointToGameObject(gameObject: GameObjects.GameObject): void {
        const positionedObject = gameObject as GameObjects.GameObject & {
            getBounds: () => { readonly centerX: number; readonly centerY: number };
        };
        const bounds = positionedObject.getBounds();
        this.pointTo(bounds.centerX, bounds.centerY);
    }

    public get gameplayPaused(): boolean {
        return this.isPaused;
    }

    public destroy(): void {
        eventBus.off(EVENT_TUTORIAL_ADVANCE, this.handleAdvance);
        eventBus.off(EVENT_TUTORIAL_CLOSED, this.handleClosed);
        eventBus.off(EVENT_TUTORIAL_DRAG_COMPLETED, this.handleDragCompleted);
        this.close();
    }

    private showCurrentStep(): void {
        const step = this.steps[this.stepIndex];
        if (step === undefined) return;
        this.setPaused(step.pauseGameplay);
        eventBus.emit(EVENT_TUTORIAL_STARTED, {
            text: step.text,
            pauseGameplay: step.pauseGameplay,
        });
        eventBus.emit(EVENT_TUTORIAL_POINTER, step.pointer === undefined
            ? { x: 0, y: 0, visible: false }
            : { ...step.pointer, visible: true });
    }

    private close(notifyUi = true): void {
        if (this.stepIndex < 0) return;
        this.stepIndex = -1;
        this.steps = [];
        this.setPaused(false);
        eventBus.emit(EVENT_TUTORIAL_POINTER, { x: 0, y: 0, visible: false });
        if (notifyUi) eventBus.emit(EVENT_TUTORIAL_CLOSED);
    }

    private setPaused(paused: boolean): void {
        if (this.isPaused === paused) return;
        this.isPaused = paused;
        eventBus.emit(EVENT_TUTORIAL_PAUSE_CHANGED, { paused });
    }
}
