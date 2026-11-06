import { GameObjects, Input, Scene, Tweens, Types } from 'phaser';
import { GAME_REGISTRY } from '../data/GameRegistry';

import {
    eventBus,
    EVENT_TUTORIAL_ADVANCE,
    EVENT_TUTORIAL_CLOSED,
    EVENT_TUTORIAL_POINTER,
    EVENT_TUTORIAL_DRAG,
    EVENT_TUTORIAL_DRAG_COMPLETED,
    EVENT_TUTORIAL_STARTED,
    type TutorialPointerData,
    type TutorialDragData,
    type TutorialStartedData,
    type TutorialClosedData,
} from '../utils/EventBus';

/** Renders the tutorial dialog and the animated world/UI pointer. */
export class TutorialUI {
    private readonly overlay: GameObjects.Container;
    private readonly dialog: GameObjects.Container;
    private readonly dialogText: GameObjects.Text;
    private readonly pointers: readonly GameObjects.Triangle[];
    private readonly pointerTweens: (Tweens.Tween | null)[];
    private readonly dragPointer: GameObjects.Triangle;
    private readonly dragMarker: GameObjects.Arc;
    private readonly interactionBlocker: GameObjects.Rectangle;
    private dragTween: Tweens.Tween | null = null;
    private dragPulse: Tweens.Tween | null = null;
    private isOpen = false;
    private activeTutorialId: number | null = null;
    private readonly handlePointerDown = (pointer: Input.Pointer): void => {
        // Only advance tutorial if clicking on the dialog itself
        if (!this.isOpen) return;
        // Get dialog bounds and check if click is inside
        const dialogRect = this.dialog.getBounds();
        const worldPos = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
        if (
            worldPos.x >= dialogRect.x - 10 &&
            worldPos.x <= dialogRect.x + dialogRect.width + 10 &&
            worldPos.y >= dialogRect.y - 10 &&
            worldPos.y <= dialogRect.y + dialogRect.height + 10
        ) {
            eventBus.emit(EVENT_TUTORIAL_ADVANCE);
        }
    };

    private readonly handleStarted = (data: TutorialStartedData): void => {
        this.activeTutorialId = data.tutorialId;
        this.dialogText.setText(data.text);
        this.dialog.setPosition(this.scene.scale.width / 2, this.scene.scale.height / 2);
        this.dialog.setVisible(true);
        this.overlay.setVisible(true);
        this.isOpen = true;
    };

    private readonly handleClosed = (data: TutorialClosedData): void => {
        if (this.activeTutorialId !== data.tutorialId) return;
        this.stopDragAnimation();
        this.isOpen = false;
        this.activeTutorialId = null;
        this.overlay.setVisible(false);
        this.interactionBlocker.setVisible(false);
    };

    private readonly handlePointer = (data: TutorialPointerData): void => {
        this.activeTutorialId = data.tutorialId;
        this.stopDragAnimation();
        const points = data.points ?? [{ x: data.x, y: data.y }];
        this.overlay.setVisible(data.visible || this.isOpen);
        if (data.visible) {
            this.dialog.setVisible(false);
            this.isOpen = false;
        }
        this.pointers.forEach((pointer, index) => {
            this.pointerTweens[index]?.stop();
            const point = points[index];
            pointer.setVisible(data.visible && point !== undefined);
            if (point === undefined) {
                this.pointerTweens[index] = null;
                return;
            }
            pointer.setPosition(point.x, point.y);
            this.pointerTweens[index] = this.scene.tweens.add({
                targets: pointer,
                y: point.y + 8,
                duration: 450,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut',
            });
        });
    };

    private readonly handleDrag = (data: TutorialDragData): void => {
        this.activeTutorialId = data.tutorialId;
        this.isOpen = false;
        this.pointerTweens.forEach((tween) => tween?.stop());
        this.pointers.forEach((pointer) => pointer.setVisible(false));
        this.dialog.setVisible(false);
        this.dragMarker.setPosition(data.sourceX, data.sourceY).setVisible(true);
        this.dragPointer.setPosition(data.sourceX, data.sourceY).setVisible(true);
        this.overlay.setVisible(true);
        this.interactionBlocker.setVisible(true);
        this.dragPulse?.stop();
        this.dragPulse = this.scene.tweens.add({
            targets: this.dragMarker,
            scale: 1.35,
            alpha: 0.35,
            duration: 350,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut',
        });
        this.dragTween?.stop();
        this.dragTween = this.scene.tweens.add({
            targets: this.dragPointer,
            x: data.targetX,
            y: data.targetY,
            duration: 1_300,
            delay: 500,
            repeat: 0,
            yoyo: false,
            hold: 650,
            repeatDelay: 450,
            ease: 'Sine.InOut',
            onComplete: () => {
                this.stopDragAnimation();
                eventBus.emit(EVENT_TUTORIAL_DRAG_COMPLETED);
            },
        });
    };

    public constructor(private readonly scene: Scene) {
        const width = scene.scale.width;
        const height = scene.scale.height;
        const panel = scene.add.rectangle(0, 0, Math.min(width - 48, 720), 112, 0x111821, 0.96)
            .setStrokeStyle(2, 0xd5a62a);
        this.dialogText = scene.add.text(0, 0, '', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#f4ede2',
            wordWrap: { width: Math.min(width - 96, 800) },
            align: 'center',
        }).setOrigin(0.5);
        const hint = scene.add.text(0, 44, '[Left Click] Continue', {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#d5a62a',
        }).setOrigin(0.5);
        this.dialog = scene.add.container(width / 2, height / 2, [panel, this.dialogText, hint]);
        this.pointers = Array.from({ length: 16 }, () => scene.add.triangle(
            0, 0, 0, 0, 16, 0, 8, 12, 0xffd166,
        ).setOrigin(0.5).setScrollFactor(0).setVisible(false));
        this.pointerTweens = this.pointers.map(() => null);
        this.dragMarker = scene.add.arc(0, 0, 13, 0, 360, false, 0xffd166, 0.18)
            .setStrokeStyle(2, 0xffd166, 0.95)
            .setVisible(false);
        this.dragPointer = scene.add.triangle(
            0, 0, 0, 0, 18, 0, 9, 14, 0xffd166,
        ).setOrigin(0.5).setVisible(false);
        this.overlay = scene.add.container(0, 0, [
            this.dialog,
            ...this.pointers,
            this.dragMarker,
            this.dragPointer,
        ])
            .setScrollFactor(0)
            .setDepth(GAME_REGISTRY.ui.tutorialOverlayDepth)
            .setVisible(false);
        this.interactionBlocker = scene.add.rectangle(0, 0, width, height, 0x000000, 0)
            .setOrigin(0)
            .setInteractive()
            .setDepth(GAME_REGISTRY.ui.tutorialBlockerDepth)
            .setVisible(false);
        this.interactionBlocker.on('pointerdown', (
            pointer: Input.Pointer,
            _localX: number,
            _localY: number,
            event: Types.Input.EventData,
        ) => {
            event.stopPropagation();
            if (pointer.button === 0 && this.isOpen) eventBus.emit(EVENT_TUTORIAL_ADVANCE);
        });

        scene.input.on('pointerdown', this.handlePointerDown);
        const keyboard = scene.input.keyboard;
        if (keyboard === null) throw new Error('No se encontró el teclado para el tutorial.');
        eventBus.on(EVENT_TUTORIAL_STARTED, this.handleStarted);
        eventBus.on(EVENT_TUTORIAL_CLOSED, this.handleClosed);
        eventBus.on(EVENT_TUTORIAL_POINTER, this.handlePointer);
        eventBus.on(EVENT_TUTORIAL_DRAG, this.handleDrag);
        scene.events.once('shutdown', this.destroy, this);
        scene.events.once('destroy', this.destroy, this);
        scene.scale.on('resize', this.reposition, this);
        this.reposition();
    }

    public get isDialogOpen(): boolean {
        return this.isOpen;
    }

    public destroy(): void {
        eventBus.off(EVENT_TUTORIAL_STARTED, this.handleStarted);
        eventBus.off(EVENT_TUTORIAL_CLOSED, this.handleClosed);
        eventBus.off(EVENT_TUTORIAL_POINTER, this.handlePointer);
        eventBus.off(EVENT_TUTORIAL_DRAG, this.handleDrag);
        this.scene.input.off('pointerdown', this.handlePointerDown);
        this.scene.scale.off('resize', this.reposition, this);
        this.pointerTweens.forEach((tween) => tween?.stop());
        this.stopDragAnimation();
        this.interactionBlocker.destroy();
        this.overlay.destroy(true);
    }

    private reposition(): void {
        this.dialog.setPosition(this.scene.scale.width / 2, this.scene.scale.height / 2);
        this.interactionBlocker.setSize(this.scene.scale.width, this.scene.scale.height);
    }

    private stopDragAnimation(): void {
        this.dragTween?.stop();
        this.dragTween = null;
        this.dragPulse?.stop();
        this.dragPulse = null;
        this.dragPointer.setVisible(false);
        this.dragMarker.setVisible(false);
        this.interactionBlocker.setVisible(false);
    }
}
