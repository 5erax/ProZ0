import { FISHING_RANGE, FISHING_REEL_WINDOW_TICKS, FISHING_SPOT_CAP, FISHING_STOCK_CAP } from '../../content/livingworld/FishingContent';
import { livingHash, seasonAt } from '../../content/livingworld/LivingWorldContent';
import type { Phase1ItemAuthority } from '../items';
import { validateFishingState, type FishingState } from './FishingState';

export interface FishingServices {
  seed: string;
  tick(): number;
  actor(id: string): { x: number; y: number; alive: boolean; healthMilli: number };
  water(x: number, y: number): boolean;
  clearLine(from: { x: number; y: number }, to: { x: number; y: number }): boolean;
  habitat(x: number, y: number): 'pond' | 'river' | 'marsh';
  cancelRest(id: string): void;
}
export interface FishingCommand { id: string; playerId: string; expectedRevision: number; expectedInventoryRevision: number; action: 'cast' | 'reel' | 'cancel'; x?: number; y?: number }
export class FishingAuthority {
  private state: FishingState | undefined;
  private readonly lastMessages = new Map<string, string>();
  constructor(private readonly items: Phase1ItemAuthority, private readonly services: FishingServices, saved?: FishingState) {
    this.state = saved === undefined ? undefined : validateFishingState(saved);
  }
  public read(): FishingState | undefined { return this.state && structuredClone(this.state); }
  public revision(): number { return this.state?.revision ?? 0; }
  public session(playerId: string) { const s = this.state?.sessions.find(s => s.playerId === playerId); return s && Object.freeze({ ...s }); }
  public message(playerId: string) { return this.lastMessages.get(playerId) ?? ''; }
  public water(x: number, y: number) { return Number.isFinite(x) && Number.isFinite(y) && Math.abs(x) <= 1e7 && Math.abs(y) <= 1e7 && this.services.water(x, y); }
  public population(x: number, y: number) {
    const spot = this.state?.spots.find(s => s.key === Math.floor(x / 32) + ':' + Math.floor(y / 32));
    const tick = this.services.tick(), interval = seasonAt(tick).id === 'spring' ? 5400 : seasonAt(tick).id === 'winter' ? 10800 : 7200;
    return { stock: spot?.stock ?? FISHING_STOCK_CAP, capacity: FISHING_STOCK_CAP, recoverySeconds: !spot || spot.stock === FISHING_STOCK_CAP ? null : Math.max(0, Math.ceil((spot.recoveryTick + interval - tick) / 60)) };
  }
  /** The cursor preview and the cast use identical rules; probing never creates stock or advances RNG. */
  public assessCast(playerId: string, x: number, y: number): string | null {
    let actor: ReturnType<FishingServices['actor']>;
    try { actor = this.services.actor(playerId); } catch { return 'UNKNOWN_PLAYER'; }
    if (!actor.alive) return 'PLAYER_DEAD';
    if (this.session(playerId)) return 'FISHING_ALREADY_CAST';
    const inventory = this.items.getContainerView('inventory:' + playerId);
    if (!inventory.stacks.some(s => s.itemDefinitionId === 'item:fishing-rod')) return 'FISHING_ROD_REQUIRED';
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 1e7 || Math.abs(y) > 1e7) return 'INVALID_POSITION';
    const point = { x: Math.floor(x / 2) * 2 + 1, y: Math.floor(y / 2) * 2 + 1 };
    if (Math.hypot(point.x - actor.x, point.y - actor.y) > FISHING_RANGE) return 'OUT_OF_RANGE';
    if (!this.water(point.x, point.y)) return 'FISHING_WATER_REQUIRED';
    if (this.water(actor.x, actor.y)) return 'FISHING_STAND_ON_BANK';
    if (!this.services.clearLine(actor, point)) return 'FISHING_LINE_BLOCKED';
    if ((this.state?.sessions.length ?? 0) >= 8) return 'FISHING_SESSION_LIMIT';
    const key = Math.floor(point.x / 32) + ':' + Math.floor(point.y / 32), spot = this.state?.spots.find(s => s.key === key);
    if (!spot && (this.state?.spots.length ?? 0) >= FISHING_SPOT_CAP) return 'FISHING_SPOT_LIMIT';
    if ((spot?.stock ?? FISHING_STOCK_CAP) <= (this.state?.sessions.filter(s => s.spotKey === key).length ?? 0)) return 'FISHING_STOCK_RECOVERING';
    if (spot && !Number.isSafeInteger(spot.ordinal + 1)) return 'FISHING_SPOT_LIMIT';
    return inventory.stacks.some(s => s.itemDefinitionId === 'item:fishing-bait' && s.quantity > 0) ? null : 'FISHING_BAIT_REQUIRED';
  }
  public tick() {
    if (!this.state) return;
    const tick = this.services.tick();
    if (tick <= this.state.lastTick) return;
    this.state.lastTick = tick;
    let changed = false;
    for (const s of [...this.state.sessions]) {
      let reason = '';
      try {
        const actor = this.services.actor(s.playerId);
        if (!actor.alive) reason = 'PLAYER_DEAD';
        else if (actor.healthMilli < s.healthMilli) reason = 'FISHING_INTERRUPTED_DAMAGE';
        else if (Math.hypot(actor.x - s.anchorX, actor.y - s.anchorY) > .35) reason = 'FISHING_INTERRUPTED_MOVE';
        else if (!this.items.getContainerView('inventory:' + s.playerId).stacks.some(i => i.stackId === s.rodStackId && i.itemDefinitionId === 'item:fishing-rod')) reason = 'FISHING_ROD_MISSING';
        else if (tick > s.endTick) reason = 'FISHING_MISSED_BITE';
        if (!reason && s.healthMilli !== actor.healthMilli) { s.healthMilli = actor.healthMilli; changed = true; }
      } catch { reason = 'UNKNOWN_PLAYER'; }
      if (reason) { this.state.sessions = this.state.sessions.filter(p => p.id !== s.id); this.lastMessages.set(s.playerId, reason); changed = true; }
    }
    const interval = seasonAt(tick).id === 'spring' ? 5400 : seasonAt(tick).id === 'winter' ? 10800 : 7200;
    for (const p of this.state.spots) {
      if (tick - p.recoveryTick < interval) continue;
      // One active recovery step, never an unbounded/offline catch-up or per-cast reset.
      p.recoveryTick = tick; p.stock = Math.min(FISHING_STOCK_CAP, p.stock + 1); changed = true;
    }
    if (changed) this.state.revision++;
  }
  public execute(c: FishingCommand): { status: 'committed' | 'rejected'; message: string } {
    const reject = (message: string) => ({ status: 'rejected' as const, message });
    const signature = JSON.stringify(c), receipt = this.state?.receipts.find(r => r.id === c.id);
    if (receipt) return receipt.signature === signature ? { status: 'committed', message: receipt.message } : reject('OPERATION_ID_CONFLICT');
    if (typeof c.id !== 'string' || !c.id || c.id.length > 120 || typeof c.playerId !== 'string' || !c.playerId || c.expectedRevision !== this.revision()) return reject('STALE_REVISION');
    let actor: ReturnType<FishingServices['actor']>;
    try { actor = this.services.actor(c.playerId); } catch { return reject('UNKNOWN_PLAYER'); }
    if (!actor.alive) return reject('PLAYER_DEAD');
    const inventory = this.items.getContainerView('inventory:' + c.playerId);
    if (inventory.revision !== c.expectedInventoryRevision) return reject('STALE_INVENTORY_REVISION');
    const tick = this.services.tick();
    const next = this.read() ?? { version: 1 as const, revision: 0, lastTick: tick, spots: [], sessions: [], receipts: [] };
    next.lastTick = tick;
    const session = next.sessions.find(s => s.playerId === c.playerId);
    const inputs: { itemDefinitionId: string; quantity: number }[] = [], outputs: typeof inputs = [];
    let message: string;
    if (c.action === 'cast') {
      const reason = this.assessCast(c.playerId, c.x!, c.y!); if (reason) return reject(reason);
      const rod = inventory.stacks.find(s => s.itemDefinitionId === 'item:fishing-rod')!;
      const x = Math.floor(c.x! / 2) * 2 + 1, y = Math.floor(c.y! / 2) * 2 + 1;
      const key = Math.floor(x / 32) + ':' + Math.floor(y / 32);
      let spot = next.spots.find(s => s.key === key);
      if (!spot) {
        spot = { key, stock: FISHING_STOCK_CAP, ordinal: 0, recoveryTick: tick }; next.spots.push(spot);
      }
      const h = livingHash('fishing:v1:' + this.services.seed + ':' + key + ':' + spot.ordinal++);
      const habitat = this.services.habitat(x, y);
      const fish = habitat === 'river' ? h % 4 ? 'item:river-trout' : 'item:pond-minnow' : habitat === 'marsh' ? h % 4 ? 'item:marsh-perch' : 'item:pond-minnow' : 'item:pond-minnow';
      const biteTick = tick + 360 + h % 361;
      next.sessions.push({ id: c.id, playerId: c.playerId, spotKey: key, x, y, anchorX: actor.x, anchorY: actor.y, rodStackId: rod.stackId, startedTick: tick, biteTick, endTick: biteTick + FISHING_REEL_WINDOW_TICKS, healthMilli: actor.healthMilli, fishItemId: fish });
      inputs.push({ itemDefinitionId: 'item:fishing-bait', quantity: 1 }); message = 'FISHING_CAST';
    } else if (c.action === 'reel') {
      if (!session) return reject('FISHING_NO_SESSION');
      if (Math.hypot(actor.x - session.anchorX, actor.y - session.anchorY) > .35 || actor.healthMilli < session.healthMilli) return reject('FISHING_INTERRUPTED');
      if (!inventory.stacks.some(s => s.stackId === session.rodStackId && s.itemDefinitionId === 'item:fishing-rod')) return reject('FISHING_ROD_MISSING');
      if (tick < session.biteTick) return reject('FISHING_WAIT_FOR_BITE');
      if (tick > session.endTick) return reject('FISHING_MISSED_BITE');
      const spot = next.spots.find(s => s.key === session.spotKey)!;
      if (!spot.stock) return reject('FISHING_STOCK_RECOVERING');
      outputs.push({ itemDefinitionId: session.fishItemId, quantity: 1 }); spot.stock--;
      next.sessions = next.sessions.filter(s => s.id !== session.id); message = 'FISHING_CAUGHT:' + session.fishItemId;
    } else if (c.action === 'cancel') {
      if (!session) return reject('FISHING_NO_SESSION');
      next.sessions = next.sessions.filter(s => s.id !== session.id); message = 'FISHING_CANCELLED';
    } else return reject('INVALID_ACTION');
    next.revision++; next.receipts.push({ id: c.id, signature, message }); next.receipts = next.receipts.slice(-96);
    try { validateFishingState(next); } catch { return reject('INVALID_FISHING_STATE'); }
    if (inputs.length || outputs.length) {
      const result = this.items.commitColonyExchange({ operationId: c.id, playerId: c.playerId, expectedInventoryRevision: inventory.revision, inputs, outputs });
      if (result.status === 'rejected') return reject(result.reason);
    }
    this.services.cancelRest(c.playerId); this.state = next; this.lastMessages.set(c.playerId, message);
    return { status: 'committed', message };
  }
}
