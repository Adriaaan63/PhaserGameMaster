"""Generate an original 15-second alien swing loop for the cantina band."""

from dataclasses import dataclass
import math
from pathlib import Path

import numpy as np
import soundfile as sf


SAMPLE_RATE = 22_050
DURATION_SECONDS = 15
TEMPO_BPM = 128
BEATS_PER_BAR = 4
BAR_COUNT = 8
SWING_RATIO = 2 / 3
OUTPUT_PATH = Path(__file__).resolve().parents[1] / 'assets' / 'sound' / 'cantina_band_loop.mp3'

BEAT_SECONDS = 60 / TEMPO_BPM
TOTAL_BEATS = BEATS_PER_BAR * BAR_COUNT
MIDI_SEMITONE_RATIO = 2 ** (1 / 12)
CLARINET_SCALE = (62, 65, 67, 68, 69, 72, 74)  # Original D-minor blues vocabulary.
BAR_ROOTS = (38, 43, 45, 38, 46, 43, 45, 38)
WALKING_BASS_STEPS = (0, 7, 10, 11)
CALL_EIGHTHS = (0, 1, 3, 5, 6, 7)
ANSWER_EIGHTHS = (1, 2, 4, 5, 6, 7)
CALL_DEGREES = (6, 4, 3, 2, 4, 6)
ANSWER_DEGREES = (2, 3, 4, 5, 3, 0)


@dataclass(frozen=True)
class NoteEvent:
    start_beat: float
    midi_note: int
    duration_beats: float
    instrument: str
    velocity: float
    pan: float


def midi_frequency(midi_note: int) -> float:
    return 440 * MIDI_SEMITONE_RATIO ** (midi_note - 69)


def swung_eighth(bar_index: int, eighth_index: int) -> float:
    beat_index, is_offbeat = divmod(eighth_index, 2)
    swing_offset = SWING_RATIO if is_offbeat else 0
    return bar_index * BEATS_PER_BAR + beat_index + swing_offset


def add_event(
    events: list[NoteEvent],
    start_beat: float,
    midi_note: int,
    duration_beats: float,
    instrument: str,
    velocity: float,
    pan: float,
) -> None:
    events.append(NoteEvent(start_beat, midi_note, duration_beats, instrument, velocity, pan))


def create_arrangement() -> list[NoteEvent]:
    events: list[NoteEvent] = []

    for bar_index, root in enumerate(BAR_ROOTS):
        bar_start = bar_index * BEATS_PER_BAR

        # Walking bass keeps a four-to-the-bar pulse and walks into each harmony.
        for beat_index, interval in enumerate(WALKING_BASS_STEPS):
            add_event(
                events,
                bar_start + beat_index,
                root + interval,
                0.82,
                'walking_bass',
                0.64,
                -0.18,
            )

        # Alternating clarinets trade short, syncopated call-and-response phrases.
        phrase_is_call = bar_index % 2 == 0
        eighth_positions = CALL_EIGHTHS if phrase_is_call else ANSWER_EIGHTHS
        scale_degrees = CALL_DEGREES if phrase_is_call else ANSWER_DEGREES
        instrument = 'clarinet_a' if phrase_is_call else 'clarinet_b'
        for note_index, eighth_index in enumerate(eighth_positions):
            degree = scale_degrees[note_index]
            octave = 12 if note_index in (0, 4) else 0
            duration = 0.68 if note_index in (0, 3, 5) else 0.36
            add_event(
                events,
                swung_eighth(bar_index, eighth_index),
                CLARINET_SCALE[degree] + octave,
                duration,
                instrument,
                0.54 if phrase_is_call else 0.48,
                -0.36 if phrase_is_call else 0.36,
            )

        # Ragtime-style piano chords answer the bass on swung offbeats.
        chord_notes = (root + 12, root + 15, root + 19)
        for eighth_index in (1, 5, 7):
            start_beat = swung_eighth(bar_index, eighth_index)
            for chord_note in chord_notes:
                add_event(events, start_beat, chord_note, 0.24, 'honky_tonk', 0.22, 0.08)

        # Muted brass punctuates the ends of phrases instead of playing a rock beat.
        if bar_index % 2 == 1:
            add_event(events, bar_start + 2.67, root + 19, 0.42, 'alto_sax', 0.27, -0.08)
            add_event(events, bar_start + 3.67, root + 24, 0.30, 'muted_trumpet', 0.24, 0.20)

        # Light woodblock timekeeping and occasional steel-drum answers.
        for beat_index in (1, 3):
            add_event(events, bar_start + beat_index, 84, 0.12, 'woodblock', 0.18, 0.0)
        add_event(events, swung_eighth(bar_index, 7), root + 31, 0.34, 'steel_drum', 0.2, 0.42)

    return events


def note_envelope(time_from_start: np.ndarray, duration_seconds: float, instrument: str) -> np.ndarray:
    if instrument in ('honky_tonk', 'steel_drum', 'woodblock'):
        attack_seconds = 0.003
        release_seconds = min(0.22, duration_seconds * 0.9)
    else:
        attack_seconds = 0.025
        release_seconds = min(0.12, duration_seconds * 0.35)

    attack = np.clip(time_from_start / attack_seconds, 0, 1)
    release = np.clip((duration_seconds - time_from_start) / release_seconds, 0, 1)
    sustain = np.minimum(attack, release)
    if instrument in ('honky_tonk', 'steel_drum', 'woodblock'):
        decay_rate = 8 if instrument == 'steel_drum' else 5
        sustain *= np.exp(-time_from_start * decay_rate)
    return sustain


def instrument_wave(
    time_from_start: np.ndarray,
    frequency: float,
    instrument: str,
    noise: np.ndarray,
) -> np.ndarray:
    phase = 2 * math.pi * frequency * time_from_start

    if instrument.startswith('clarinet'):
        # Gentle FM and uneven partials make the reed tone metallic without obscuring it.
        modulator = 0.055 * np.sin(2 * math.pi * 5.1 * time_from_start)
        phase += modulator
        return (
            np.sin(phase)
            + 0.44 * np.sin(phase * 3)
            + 0.16 * np.sin(phase * 5)
            + 0.05 * np.sin(phase * 7)
        ) / 1.65

    if instrument == 'alto_sax':
        return (
            np.sin(phase)
            + 0.42 * np.sin(phase * 2)
            + 0.3 * np.sin(phase * 3)
            + 0.12 * np.sin(phase * 4)
        ) / 1.84

    if instrument == 'muted_trumpet':
        return (
            np.sin(phase)
            + 0.12 * np.sin(phase * 2)
            + 0.52 * np.sin(phase * 3)
            + 0.08 * np.sin(phase * 5)
        ) / 1.72

    if instrument == 'honky_tonk':
        detuned_phase = 2 * math.pi * frequency * MIDI_SEMITONE_RATIO ** 0.035 * time_from_start
        return (np.sin(phase) + 0.58 * np.sin(detuned_phase) + 0.24 * np.sin(phase * 2)) / 1.82

    if instrument == 'walking_bass':
        return (np.sin(phase) + 0.28 * np.sin(phase * 2) + 0.12 * np.sin(phase * 3)) / 1.4

    if instrument == 'steel_drum':
        return (np.sin(phase) + 0.38 * np.sin(phase * 2.76) + 0.18 * np.sin(phase * 5.4)) / 1.56

    # A short filtered click; there is intentionally no conventional drum kit.
    return 0.62 * np.sin(2 * math.pi * 1_650 * time_from_start) + 0.38 * noise


def render_event(event: NoteEvent, sample_count: int, randomizer: np.random.Generator) -> tuple[int, np.ndarray]:
    start_seconds = event.start_beat * BEAT_SECONDS
    duration_seconds = event.duration_beats * BEAT_SECONDS
    start_sample = round(start_seconds * SAMPLE_RATE)
    event_sample_count = min(round(duration_seconds * SAMPLE_RATE), sample_count - start_sample)
    time_from_start = np.arange(event_sample_count, dtype=np.float32) / SAMPLE_RATE
    noise = randomizer.normal(0, 0.2, event_sample_count).astype(np.float32)
    frequency = midi_frequency(event.midi_note)

    if event.instrument == 'clarinet_b':
        frequency *= MIDI_SEMITONE_RATIO ** 0.04

    envelope = note_envelope(time_from_start, duration_seconds, event.instrument)
    wave = instrument_wave(time_from_start, frequency, event.instrument, noise)
    return start_sample, wave * envelope * event.velocity


def synthesize_loop() -> np.ndarray:
    sample_count = round(SAMPLE_RATE * DURATION_SECONDS)
    left = np.zeros(sample_count, dtype=np.float32)
    right = np.zeros(sample_count, dtype=np.float32)
    randomizer = np.random.default_rng(7301)

    for event in create_arrangement():
        start_sample, rendered = render_event(event, sample_count, randomizer)
        end_sample = start_sample + len(rendered)
        left[start_sample:end_sample] += rendered * (1 - event.pan) / 2
        right[start_sample:end_sample] += rendered * (1 + event.pan) / 2

    # A short cross-feedback gives the electronic cabaret feel some space.
    echo_samples = round(SAMPLE_RATE * 0.045)
    left[echo_samples:] += right[:-echo_samples] * 0.08
    right[echo_samples:] += left[:-echo_samples] * 0.08

    stereo = np.column_stack((left, right))
    peak = float(np.max(np.abs(stereo)))
    if peak > 0:
        stereo *= 0.88 / peak

    edge_samples = round(SAMPLE_RATE * 0.02)
    edge_fade = np.sin(np.linspace(0, math.pi / 2, edge_samples, dtype=np.float32))
    stereo[:edge_samples] *= edge_fade[:, None]
    stereo[-edge_samples:] *= edge_fade[::-1, None]
    return stereo


def main() -> None:
    samples = synthesize_loop()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    sf.write(
        str(OUTPUT_PATH),
        samples,
        SAMPLE_RATE,
        format='MP3',
        subtype='MPEG_LAYER_III',
        bitrate_mode='CBR',
    )
    print(
        f'Created {OUTPUT_PATH} ({DURATION_SECONDS}s, {TEMPO_BPM} BPM, '
        f'{BAR_COUNT} bars, {len(samples)} stereo frames).'
    )


if __name__ == '__main__':
    main()
