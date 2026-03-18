// Hour and Minute calculation for the CueTips clock system.
//
// When a vinyl record is played back at a different speed, its pitch shifts.
// "Hour" maps the pitch-shifted key onto a Camelot wheel position (1-12).
// "Minute" captures the fractional semitone remainder (0-59).
//
// Reference tempo is 120 BPM. A track at 120 BPM has zero pitch shift.

const SEMITONE_RATIO = 1.0595;

// Modulo that always returns a non-negative result (matching Swift's custom %% operator)
function mod(value: number, divisor: number): number {
  let r = value % divisor;
  if (r < 0) r += divisor;
  return r;
}

// Map a note name to its semitone index (0-11)
const NOTE_MAP: Record<string, number> = {
  C: 0, "C#": 1, Db: 1,
  D: 2, "D#": 3, Eb: 3,
  E: 4,
  F: 5, "F#": 6, Gb: 6,
  G: 7, "G#": 8, Ab: 8,
  A: 9, "A#": 10, Bb: 10,
  B: 11,
};

function rootToSemitone(root: string): number | null {
  return NOTE_MAP[root] ?? null;
}

interface HourMinute {
  hour: number;
  minute: number;
}

// Calculate hour and minute from BPM, key root name, mode, and tuning (cents).
// Returns null if BPM or key root is missing.
export function calcHourMinute(
  bpm: number | null | undefined,
  root: string | null | undefined,
  mode: string | null | undefined,
  tuning: number | null | undefined,
): HourMinute | null {
  if (!bpm || bpm <= 0 || !root) return null;

  const rootSemitone = rootToSemitone(root);
  if (rootSemitone === null) return null;

  const cents = tuning ?? 0;

  // How many semitones the pitch shifts when adjusting from track BPM to 120
  const shiftFloat = -Math.log(bpm / 120.0) / Math.log(SEMITONE_RATIO) + cents / 100.0;
  const shift = Math.ceil(shiftFloat);

  // Apply pitch shift, then map into Camelot space
  const shiftedKey = mod(Math.floor(rootSemitone) + shift, 12);
  let camelot = mod(8 + shiftedKey * 7, 12);
  if (mode?.toLowerCase() === "minor") {
    camelot = mod(camelot - 3, 12);
  }
  const hour = camelot === 0 ? 12 : camelot;

  // Fractional semitone remainder, scaled to 0-59
  const minute = Math.max(0, Math.min(59, Math.floor(Math.abs(60.0 * (shiftFloat - shift)))));

  return { hour, minute };
}

// Convenience: parse a key string like "C minor" into root + mode, then calculate.
export function calcHourMinuteFromKeyString(
  bpm: number | null | undefined,
  key: string | null | undefined,
  tuning: number | null | undefined,
): HourMinute | null {
  if (!key) return calcHourMinute(bpm, null, null, tuning);
  const parts = key.split(" ");
  return calcHourMinute(bpm, parts[0], parts[1] ?? null, tuning);
}
