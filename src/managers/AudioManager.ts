import { Scene, Sound, Time, Tweens } from 'phaser';

import { CANTINA_BAND_AUDIO_KEY } from '../data/constants';
import { BAND_PLAYING_DURATION_MS, type AudioBus, type AudioConfig } from '../data/GameRegistry';
import { EVENT_BAND_STARTED, eventBus, type BandStartedData } from '../utils/EventBus';

/** Owns Phaser audio playback and keeps BGM, SFX and UI volumes independently tunable. */
export class AudioManager {
    private bandTrack: Sound.BaseSound | null = null;
    private fadeTimer: Time.TimerEvent | null = null;
    private fadeTween: Tweens.Tween | null = null;
    private readonly oneShotSounds = new Map<Sound.BaseSound, AudioBus>();

    private readonly onBandStartedBound = (data: BandStartedData): void => {
        this.playBandTrack(data.durationMs);
    };

    public constructor(
        private readonly scene: Scene,
        private readonly config: AudioConfig,
    ) {
        eventBus.on(EVENT_BAND_STARTED, this.onBandStartedBound);
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
}
