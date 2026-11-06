import { Math as PhaserMath, type Scene } from 'phaser';

import {
    AUDIO_MASTER_VOLUME_REGISTRY_KEY,
    AUDIO_MUTED_REGISTRY_KEY,
    type AudioSettings,
    GAME_REGISTRY,
} from '../data/GameRegistry';
import { EVENT_AUDIO_SETTINGS_UPDATED, eventBus } from '../utils/EventBus';

/** Persists the player's global audio preferences in the shared Phaser registry. */
export class AudioSettingsManager {
    public constructor(private readonly scene: Scene) {
        if (typeof scene.registry.get(AUDIO_MASTER_VOLUME_REGISTRY_KEY) !== 'number') {
            scene.registry.set(AUDIO_MASTER_VOLUME_REGISTRY_KEY, GAME_REGISTRY.audio.defaultMasterVolume);
        }
        if (typeof scene.registry.get(AUDIO_MUTED_REGISTRY_KEY) !== 'boolean') {
            scene.registry.set(AUDIO_MUTED_REGISTRY_KEY, GAME_REGISTRY.audio.defaultMuted);
        }
        scene.sound.volume = scene.registry.get(AUDIO_MUTED_REGISTRY_KEY) === true
            ? 0
            : this.getMasterVolume();
    }

    public get settings(): AudioSettings {
        return {
            masterVolume: this.getMasterVolume(),
            muted: this.scene.registry.get(AUDIO_MUTED_REGISTRY_KEY) === true,
        };
    }

    public setMasterVolume(volume: number): void {
        const masterVolume = PhaserMath.Clamp(volume, 0, 1);
        this.scene.registry.set(AUDIO_MASTER_VOLUME_REGISTRY_KEY, masterVolume);
        this.scene.sound.volume = this.settings.muted ? 0 : masterVolume;
        this.publish();
    }

    public setMuted(muted: boolean): void {
        this.scene.registry.set(AUDIO_MUTED_REGISTRY_KEY, muted);
        this.scene.sound.volume = muted ? 0 : this.getMasterVolume();
        this.publish();
    }

    private getMasterVolume(): number {
        const value = this.scene.registry.get(AUDIO_MASTER_VOLUME_REGISTRY_KEY);
        return typeof value === 'number'
            ? PhaserMath.Clamp(value, 0, 1)
            : GAME_REGISTRY.audio.defaultMasterVolume;
    }

    private publish(): void {
        eventBus.emit(EVENT_AUDIO_SETTINGS_UPDATED, { settings: this.settings });
    }
}
