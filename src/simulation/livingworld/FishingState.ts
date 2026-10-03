import { FISH_SPECIES, FISHING_REEL_WINDOW_TICKS, FISHING_SPOT_CAP, FISHING_STOCK_CAP } from '../../content/livingworld/FishingContent';

export interface FishingSpot { key: string; stock: number; ordinal: number; recoveryTick: number }
export interface FishingSession { id: string; playerId: string; spotKey: string; x: number; y: number; anchorX: number; anchorY: number; rodStackId: string; startedTick: number; biteTick: number; endTick: number; healthMilli: number; fishItemId: string }
export interface FishingState { version: 1; revision: number; lastTick: number; spots: FishingSpot[]; sessions: FishingSession[]; receipts: { id: string; signature: string; message: string }[] }
export function validateFishingState(value: unknown): FishingState {
  const s = value as FishingState, integer = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
  const string = (v: unknown, max = 180): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;
  const point = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1e7;
  if (!s || s.version !== 1 || !integer(s.revision) || !integer(s.lastTick) || !Array.isArray(s.spots) || s.spots.length > FISHING_SPOT_CAP || !Array.isArray(s.sessions) || s.sessions.length > 8 || !Array.isArray(s.receipts) || s.receipts.length > 96) throw Error('Invalid fishing state');
  const spots = new Set<string>(), players = new Set<string>(), sessions = new Set<string>(), receipts = new Set<string>();
  for (const p of s.spots) {
    if (!p || !/^(-?\d+):(-?\d+)$/.test(p.key) || p.key.split(':').some(n => Math.abs(Number(n)) > 312500 || !Number.isSafeInteger(Number(n)) || String(Number(n)) !== n) || spots.has(p.key) || ![p.stock, p.ordinal, p.recoveryTick].every(integer) || p.stock > FISHING_STOCK_CAP || p.recoveryTick > s.lastTick) throw Error('Invalid fishing population');
    spots.add(p.key);
  }
  for (const p of s.sessions) {
    if (!p || !string(p.id, 120) || sessions.has(p.id) || !string(p.playerId) || players.has(p.playerId) || !spots.has(p.spotKey) || p.spotKey !== Math.floor(p.x / 32) + ':' + Math.floor(p.y / 32) || ![p.x, p.y, p.anchorX, p.anchorY].every(point) || Math.hypot(p.x - p.anchorX, p.y - p.anchorY) > 4 || !string(p.rodStackId) || ![p.startedTick, p.biteTick, p.endTick, p.healthMilli].every(integer) || p.healthMilli > 100000 || p.startedTick > s.lastTick || p.biteTick - p.startedTick < 360 || p.biteTick - p.startedTick > 720 || p.endTick !== p.biteTick + FISHING_REEL_WINDOW_TICKS || !FISH_SPECIES.some(f => f.itemId === p.fishItemId)) throw Error('Invalid fishing session');
    players.add(p.playerId); sessions.add(p.id);
  }
  for (const p of s.receipts) {
    if (!p || !string(p.id, 120) || receipts.has(p.id) || !string(p.signature, 2048) || !string(p.message, 220)) throw Error('Invalid fishing receipt');
    receipts.add(p.id);
  }
  return structuredClone(s);
}
