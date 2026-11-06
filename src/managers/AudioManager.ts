import { Scene, Sound, Time, Tweens } from 'phaser';

import { CANTINA_BAND_AUDIO_KEY } from '../data/constants';
import {
    AUDIO_MASTER_VOLUME_REGISTRY_KEY,
    AUDIO_MUTED_REGISTRY_KEY,
    BAND_PLAYING_DURATION_MS,
    GAME_REGISTRY,
    type AudioBus,
    type AudioConfig,
} from '../data/GameRegistry';
import {
    EVENT_AUDIO_SETTINGS_UPDATED,
    EVENT_BAND_STARTED,
    eventBus,
    type AudioSettingsUpdatedData,
    type BandStartedData,
} from '../utils/EventBus';

/** Owns Phaser audio playback and keeps BGM, SFX and UI volumes independently tunable. */
export class AudioManager {
    private bandTrack: Sound.BaseSound | null = null;
    private fadeTimer: Time.TimerEvent | null = null;
    private fadeTween: Tweens.Tween | null = null;
    private readonly oneShotSounds = new Map<Sound.BaseSound, AudioBus>();

    private readonly onBandStartedBound = (data: BandStartedData): void => {
        this.playBandTrack(data.durationMs);
    };
    private readonly onAudioSettingsUpdatedBound = (data: AudioSettingsUpdatedData): void => {
        this.applyAudioSettings(data.settings.masterVolume, data.settings.muted);
    };

    public constructor(
        private readonly scene: Scene,
        private readonly config: AudioConfig,
    ) {
        eventBus.on(EVENT_BAND_STARTED, this.onBandStartedBound);
        eventBus.on(EVENT_AUDIO_SETTINGS_UPDATED, this.onAudioSettingsUpdatedBound);
        this.applyAudioSettings(
            this.readMasterVolume(),
            this.scene.registry.get(AUDIO_MUTED_REGISTRY_KEY) === true,
        );
        scene.events.once('shutdown', this.destroy, this);
        scene.events.once('destroy', this.destroy, this);
    }

    /** Plays a one-shot sound through its logical audio bus. */
    public playOneShot(soundKey: string, bus: AudioBus): void {
        this.enforceOneShotLimit(bus);
        const sound = this.scene.sound.add(soundKey, {
            loop: false,
            volume: this.config.busVolumes[bus],
        });
        this.oneShotSounds.set(sound, bus);
        sound.once('complete', () => {
            this.oneShotSounds.delete(sound);
            sound.destroy();
        });
        sound.play();
    }

    public destroy(): void {
        eventBus.off(EVENT_BAND_STARTED, this.onBandStartedBound);
        eventBus.off(EVENT_AUDIO_SETTINGS_UPDATED, this.onAudioSettingsUpdatedBound);
        this.fadeTimer?.remove(false);
        this.fadeTimer = null;
        this.fadeTween?.stop();
        this.fadeTween = null;
        this.stopBandTrack();

        for (const sound of this.oneShotSounds.keys()) sound.destroy();
        this.oneShotSounds.clear();
    }

    private enforceOneShotLimit(bus: AudioBus): void {
        const oldestSound = [...this.oneShotSounds.entries()]
            .find(([, activeBus]) => activeBus === bus)?.[0];
        const activeCount = [...this.oneShotSounds.values()]
            .filter((activeBus) => activeBus === bus).length;
        if (oldestSound === undefined || activeCount < this.config.maxConcurrentOneShotsPerBus) return;

        this.oneShotSounds.delete(oldestSound);
        oldestSound.stop();
        oldestSound.destroy();
    }

    private playBandTrack(durationMs: number): void {
        if (this.bandTrack !== null) return;

        const volume = this.config.busVolumes.BGM;
        const track = this.scene.sound.add(CANTINA_BAND_AUDIO_KEY, { loop: true, volume });
        this.bandTrack = track;
        track.play();

        const fadeOutMs = Math.min(this.config.bandFadeOutMs, durationMs);
        const fadeDelayMs = Math.max(0, Math.min(durationMs, BAND_PLAYING_DURATION_MS) - fadeOutMs);
        this.fadeTimer = this.scene.time.delayedCall(fadeDelayMs, () => {
            this.fadeTimer = null;
            this.fadeTween = this.scene.tweens.add({
                targets: track,
                volume: 0,
                duration: fadeOutMs,
                ease: 'Sine.Out',
                onComplete: () => {
                    this.fadeTween = null;
                    this.stopBandTrack();
                },
            });
        });
    }

    private stopBandTrack(): void {
        if (this.bandTrack === null) return;
        this.bandTrack.stop();
        this.bandTrack.destroy();
        this.bandTrack = null;
    }

    private readMasterVolume(): number {
        const volume = this.scene.registry.get(AUDIO_MASTER_VOLUME_REGISTRY_KEY);
        return typeof volume === 'number' ? volume : GAME_REGISTRY.audio.defaultMasterVolume;
    }

    private applyAudioSettings(masterVolume: number, muted: boolean): void {
        this.scene.sound.volume = muted ? 0 : masterVolume;
    }
}
