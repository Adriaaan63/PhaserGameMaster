import type { Scene } from 'phaser';

import { STARTING_FOOD_STOCK } from '../data/constants';
import {
    CREDITS_REGISTRY_KEY,
    CRIMINAL_REPUTATION_REGISTRY_KEY,
    CURRENT_NIGHT_REGISTRY_KEY,
    EMPTY_GLASSES_REGISTRY_KEY,
    GAME_REGISTRY,
    IMPERIAL_HEAT_REGISTRY_KEY,
    SCRAPS_REGISTRY_KEY,
    WANTED_PROFILE_REGISTRY_KEY,
} from '../data/GameRegistry';
import { GAME_MODE_PRE_OPENING } from '../utils/EventBus';

export const MAIN_MENU_SCENE_KEY = 'MainMenuScene';
export const OPTIONS_MENU_SCENE_KEY = 'OptionsMenuScene';
export const PAUSE_MENU_SCENE_KEY = 'PauseMenuScene';
export const NIGHT_SCENE_KEY = 'NightCantinaScene';
export const UI_SCENE_KEY = 'UIScene';

/** Coordinates menu transitions and preserves the active gameplay scene on pause. */
export class MenuFlowManager {
    public startNewGame(scene: Scene): void {
        this.resetRunState(scene);
        scene.scene.stop(MAIN_MENU_SCENE_KEY);
        scene.scene.start(NIGHT_SCENE_KEY);
        scene.scene.launch(UI_SCENE_KEY);
    }

    public openOptions(scene: Scene, returnSceneKey: string): void {
        scene.scene.pause(returnSceneKey);
        scene.scene.launch(OPTIONS_MENU_SCENE_KEY, { returnSceneKey });
        scene.scene.bringToTop(OPTIONS_MENU_SCENE_KEY);
    }

    public openPause(scene: Scene): void {
        if (scene.scene.isActive(PAUSE_MENU_SCENE_KEY)) return;
        scene.scene.pause(NIGHT_SCENE_KEY);
        scene.scene.pause(UI_SCENE_KEY);
        scene.scene.launch(PAUSE_MENU_SCENE_KEY);
        scene.scene.bringToTop(PAUSE_MENU_SCENE_KEY);
        scene.sound.pauseAll();
    }

    public resumeGame(scene: Scene): void {
        scene.sound.resumeAll();
        scene.scene.stop(PAUSE_MENU_SCENE_KEY);
        scene.scene.resume(UI_SCENE_KEY);
        scene.scene.resume(NIGHT_SCENE_KEY);
    }

    public returnToMainMenu(scene: Scene): void {
        scene.sound.stopAll();
        scene.scene.stop(OPTIONS_MENU_SCENE_KEY);
        scene.scene.stop(PAUSE_MENU_SCENE_KEY);
        scene.scene.stop(UI_SCENE_KEY);
        scene.scene.stop(NIGHT_SCENE_KEY);
        scene.scene.start(MAIN_MENU_SCENE_KEY);
    }

    public returnFromOptions(scene: Scene, returnSceneKey: string): void {
        scene.scene.stop(OPTIONS_MENU_SCENE_KEY);
        scene.scene.resume(returnSceneKey);
    }

    private resetRunState(scene: Scene): void {
        const { registry } = scene;
        registry.set('gameMode', GAME_MODE_PRE_OPENING);
        registry.set(CURRENT_NIGHT_REGISTRY_KEY, GAME_REGISTRY.progression.startingNight);
        registry.set(CREDITS_REGISTRY_KEY, GAME_REGISTRY.economy.startingCredits);
        registry.set(SCRAPS_REGISTRY_KEY, GAME_REGISTRY.repairs.startingScraps);
        registry.set(EMPTY_GLASSES_REGISTRY_KEY, GAME_REGISTRY.economy.startingEmptyGlasses);
        registry.set(CRIMINAL_REPUTATION_REGISTRY_KEY, GAME_REGISTRY.reputation.startingReputation);
        registry.set(IMPERIAL_HEAT_REGISTRY_KEY, GAME_REGISTRY.threat.startingHeat);
        registry.set('foodStock', STARTING_FOOD_STOCK);
        registry.set('requireFoodPurchase', false);
        registry.remove(WANTED_PROFILE_REGISTRY_KEY);
    }
}
