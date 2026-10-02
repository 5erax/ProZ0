import {
  FORAGE,
  SPECIES,
  LIVING_RECIPES,
  cropDefinition,
  speciesDefinition,
  forageDefinition,
  seasonAt,
  soilAt,
  livingHash,
} from '../../content/livingworld/LivingWorldContent';
import type { Phase1ItemAuthority } from '../items';
import type {
  ExpeditionAuthority,
  ExpeditionActor,
} from '../expedition/ExpeditionAuthority';
import {
  emptyLivingWorld,
  validateLivingWorld,
  type LivingWorldState,
  type LivingAnimal,
} from './LivingWorldState';
export interface LivingServices {
  seed: string;
  tick(): number;
  actor(id: string): ExpeditionActor;
  players(): readonly string[];
  ground(x: number, y: number): boolean;
  plotGround(x: number, y: number): string | null;
  weather(x: number, y: number): string;
  weapon(id: string): boolean;
  cancelRest(id: string): void;
}
export interface LivingCommand {
  id: string;
  playerId: string;
  expectedRevision: number;
  expectedInventoryRevision: number;
  action:
    | 'till'
    | 'plant'
    | 'water'
    | 'fertilize'
    | 'harvest'
    | 'clear'
    | 'forage'
    | 'hunt'
    | 'loot'
    | 'tame'
    | 'feed'
    | 'release'
    | 'produce'
    | 'shear'
    | 'craft'
    | 'fuel'
    | 'fill';
  target: string;
  x?: number;
  y?: number;
  crop?: string;
}
export class LivingWorldAuthority {
  private state: LivingWorldState;
  constructor(
    private readonly items: Phase1ItemAuthority,
    private readonly expedition: ExpeditionAuthority,
    private readonly services: LivingServices,
    saved?: LivingWorldState,
  ) {
    this.state = validateLivingWorld(
      saved ?? emptyLivingWorld(services.tick()),
    );
  }
  private snapshot: LivingWorldState | null = null;
  private reconcile() {
    const facilities = this.expedition.read().facilities;
    let changed = false;
    const stations = this.state.stations.filter((s) =>
      facilities.some((f) => f.id === s.id),
    );
    if (stations.length !== this.state.stations.length) {
      this.state.stations = stations;
      changed = true;
    }
    for (const a of this.state.animals) {
      if (!a.pen) continue;
      const f = facilities.find((f) => f.id === a.pen);
      if (!f) {
        a.pen = null;
        a.owner = null;
        a.anchorX = a.x;
        a.anchorY = a.y;
        changed = true;
      } else if (a.anchorX !== f.x || a.anchorY !== f.y) {
        a.x += f.x - a.anchorX;
        a.y += f.y - a.anchorY;
        a.anchorX = f.x;
        a.anchorY = f.y;
        changed = true;
      }
    }
    if (changed) this.state.revision++;
  }
  public presentationSnapshot(): Readonly<LivingWorldState> {
    this.reconcile();
    if (this.snapshot?.revision !== this.state.revision) {
      this.snapshot = structuredClone(this.state);
      for (const value of Object.values(this.snapshot))
        if (Array.isArray(value)) {
          for (const e of value) if (typeof e === 'object') Object.freeze(e);
          Object.freeze(value);
        }
      Object.freeze(this.snapshot);
    }
    return this.snapshot;
  }
  public read() {
    this.reconcile();
    return structuredClone(this.state);
  }
  public season() {
    return seasonAt(this.services.tick());
  }
  public thermalTarget(
    point: { x: number; y: number },
    base: number,
    sheltered: boolean,
  ): number {
    if (sheltered || this.near(point, 'field-cabin', 1.5)) return 50;
    if (
      this.state.stations.some(
        (s) =>
          s.fireUntil > this.services.tick() &&
          this.expedition
            .read()
            .facilities.some(
              (f) =>
                f.id === s.id && Math.hypot(f.x - point.x, f.y - point.y) <= 4,
            ),
      )
    )
      return 48;
    return Math.max(0, Math.min(100, base + this.season().thermalOffset));
  }
  public renewal(point: { x: number; y: number }, id: string) {
    return id === 'resource:fiber-plant' || id === 'resource:food-plant' || id==='resource:timber-source'
      ? Math.max(
          0.4,
          Math.min(
            3,
            1000000 /
              (this.season().growthMilli *
                soilAt(this.services.seed, point).growthMilli),
          ),
        )
      : 1;
  }
  private near(
    point: { x: number; y: number },
    definition: string,
    radius = 4,
  ) {
    return this.expedition
      .read()
      .facilities.find(
        (f) =>
          f.definitionId === definition &&
          Math.hypot(point.x - f.x, point.y - f.y) <= radius,
      );
  }
  private station(id: string) {
    let s = this.state.stations.find((s) => s.id === id);
    if (!s) {
      s = { id, water: 0, fireUntil: 0 };
      this.state.stations.push(s);
    }
    return s;
  }
  private discover(point: { x: number; y: number }) {
    const rx = Math.floor(point.x / 16),
      ry = Math.floor(point.y / 16),
      key = rx + ':' + ry;
    if (!this.state.regions.includes(key)) {
      if (this.state.regions.length >= 128) return;
      this.state.regions.push(key);
    }
    for (let i = 0; i < 6; i++) {
      const h = livingHash(this.services.seed + ':forage:' + key + ':' + i),
        x = rx * 16 + 2 + (h % 12),
        y = ry * 16 + 2 + ((h >>> 8) % 12);
      if (
        !this.state.forage.some((f) => f.id === 'forage:' + key + ':' + i) &&
        this.services.ground(x, y) &&
        this.state.forage.length < 768
      )
        this.state.forage.push({
          id: 'forage:' + key + ':' + i,
          kind: FORAGE[i]!.id,
          x,
          y,
          readyTick: 0,
        });
    }
    for (let i = 0; i < 5 && this.state.animals.length < 96; i++) {
      const h = livingHash(this.services.seed + ':animal:' + key + ':' + i),
        x = rx * 16 + 3 + (h % 10),
        y = ry * 16 + 3 + ((h >>> 8) % 10),
        sp =
          i === 4
            ? SPECIES[(h % 2) + 4]!
            : SPECIES[
                Math.floor(i / 2) +
                  (livingHash(this.services.seed + ':species:' + key) % 2) * 2
              ]!;
      const spawn = 'wild:' + key + ':' + i;
      if (!this.state.spawned.includes(spawn) && this.services.ground(x, y)) {
        this.state.spawned.push(spawn);
        this.state.animals.push(
          this.animal(sp.id, x, y, (i % 2) as 0 | 1, true),
        );
      }
    }
  }
  private animal(
    species: string,
    x: number,
    y: number,
    sex: 0 | 1,
    adult = false,
  ): LivingAnimal {
    const d = speciesDefinition(species)!;
    return {
      id: 'animal:' + ++this.state.serial,
      species,
      x,
      y,
      anchorX: x,
      anchorY: y,
      sex,
      age: adult ? d.matureSeconds * 60 : 0,
      health: d.health,
      energy: 10000,
      thirst: 10000,
      breedTick: this.services.tick() + d.breedSeconds * 60,
      product: 0,
      productTicks: 0,
      pen: null,
      owner: null,
      attackTick: 0,
    };
  }
  public tick() {
    const tick = this.services.tick();
    if (tick - this.state.lastTick < 60) return;
    // No offline or unbounded catch-up: the bundle invokes this every active second.
    const delta = Math.min(60, tick - this.state.lastTick);
    this.state.lastTick = tick;
    for (const id of this.services.players())
      this.discover(this.services.actor(id));
    const season = this.season(),
      facilities = this.expedition.read().facilities;
    this.state.stations = this.state.stations.filter((s) =>
      facilities.some((f) => f.id === s.id),
    );
    for (const f of facilities.filter(
      (f) => f.definitionId === 'irrigation-tank',
    )) {
      const s = this.station(f.id);
      if (this.services.weather(f.x, f.y) === 'mist-rain' && tick % 600 === 0)
        s.water = Math.min(24, s.water + 1);
    }
    for (const p of this.state.plots) {
      if (!p.crop || p.dead) continue;
      const soil = soilAt(this.services.seed, p),
        green = this.near(p, 'greenhouse'),
        rain = this.services.weather(p.x, p.y) === 'mist-rain';
      p.moisture = Math.min(
        10000,
        Math.max(
          0,
          p.moisture +
            (rain ? 55 : 0) -
            Math.round(
              ((25 * season.evaporationMilli) / soil.retentionMilli) *
                (green ? 0.6 : 1),
            ),
        ),
      );
      if (p.moisture < 3500) {
        const tank = this.near(p, 'irrigation-tank', 5),
          s = tank ? this.station(tank.id) : null;
        if (s && s.water > 0) {
          s.water--;
          p.moisture = Math.min(10000, p.moisture + 6500);
        }
      }
      if (p.moisture === 0) {
        p.dryTicks += delta;
        if (p.dryTicks >= 5400) p.dead = true;
      } else {
        p.dryTicks = 0;
        const rate = green && season.id === 'winter' ? 900 : season.growthMilli;
        p.progress = Math.min(
          cropDefinition(p.crop)!.cycleTicks,
          p.progress +
            Math.round(
              (delta * rate * soil.growthMilli * (1 + p.fertility * 0.15)) /
                1000000,
            ),
        );
      }
    }
    const births: LivingAnimal[] = [];
    const consumed = new Set<string>();
    for (const a of this.state.animals) {
      if (a.health === 0) continue;
      const d = speciesDefinition(a.species)!;
      a.age +=
        a.energy > 2000 && a.thirst > 2000 ? delta : Math.floor(delta / 2);
      const pen = a.pen ? facilities.find((f) => f.id === a.pen) : null;
      if (a.pen && !pen) {
        a.pen = null;
        a.owner = null;
        a.anchorX = a.x;
        a.anchorY = a.y;
      }
      if (pen && (a.anchorX !== pen.x || a.anchorY !== pen.y)) {
        a.x += pen.x - a.anchorX;
        a.y += pen.y - a.anchorY;
        a.anchorX = pen.x;
        a.anchorY = pen.y;
      }
      const wildFood =
        (soilAt(this.services.seed, a).growthMilli * season.growthMilli) /
        1000000;
      a.energy = Math.max(
        0,
        Math.min(
          10000,
          a.energy +
            (a.pen
              ? -12
              : d.diet.length
                ? -25
                : Math.round(wildFood * 25) - 18),
        ),
      );
      a.thirst = Math.max(
        0,
        Math.min(
          10000,
          a.thirst +
            (a.pen
              ? -10
              : this.services.weather(a.x, a.y) === 'mist-rain'
                ? 35
                : soilAt(this.services.seed, a).retentionMilli > 1000
                  ? 8
                  : -8) *
              (season.id === 'summer' ? 2 : 1),
        ),
      );
      if (a.pen && a.thirst < 3000) {
        const tank = this.near(a, 'irrigation-tank', 5),
          s = tank ? this.station(tank.id) : null;
        if (s && s.water > 0) {
          s.water--;
          a.thirst = 10000;
        }
      }
      if ((a.energy === 0 || a.thirst === 0) && tick % 600 === 0) {
        a.health = Math.max(0, a.health - 1);
        continue;
      }
      const prey = d.diet.length
        ? this.state.animals
            .filter(
              (p) =>
                p.health > 0 &&
                !p.pen &&
                (d.diet as readonly string[]).includes(p.species) &&
                Math.hypot(p.x - a.x, p.y - a.y) < 8,
            )
            .sort(
              (p, q) =>
                Math.hypot(p.x - a.x, p.y - a.y) -
                Math.hypot(q.x - a.x, q.y - a.y),
            )[0]
        : null;
      const predator = !d.diet.length
        ? this.state.animals.find(
            (p) =>
              p.health > 0 &&
              (
                speciesDefinition(p.species)!.diet as readonly string[]
              ).includes(a.species) &&
              Math.hypot(p.x - a.x, p.y - a.y) < 4,
          )
        : null;
      const phase =
        ((livingHash(a.id + ':' + Math.floor(tick / 600)) % 8) * Math.PI) / 4;
      const tx =
          prey?.x ??
          (predator
            ? a.x + (a.x - predator.x)
            : a.anchorX + Math.cos(phase) * (a.pen ? 1 : 3)),
        ty =
          prey?.y ??
          (predator
            ? a.y + (a.y - predator.y)
            : a.anchorY + Math.sin(phase) * (a.pen ? 1 : 3));
      const dist = Math.hypot(tx - a.x, ty - a.y),
        speed = prey || predator?.health ? 0.7 : 0.3;
      if (dist > 0.1) {
        const x = a.x + ((tx - a.x) / dist) * Math.min(speed, dist),
          y = a.y + ((ty - a.y) / dist) * Math.min(speed, dist);
        if (this.services.ground(x, y)) {
          a.x = x;
          a.y = y;
        }
      }
      if (
        prey &&
        Math.hypot(prey.x - a.x, prey.y - a.y) < 1 &&
        tick >= a.attackTick
      ) {
        prey.health = Math.max(0, prey.health - 2);
        a.attackTick = tick + 180;
        if (!prey.health) {
          a.energy = 10000;
          consumed.add(prey.id);
        }
      }
      if (
        a.pen &&
        a.age >= d.matureSeconds * 60 &&
        a.energy > 3000 &&
        a.thirst > 3000 &&
        d.product
      ) {
        a.productTicks += delta;
        if (a.productTicks >= d.productSeconds * 60) {
          a.productTicks = 0;
          a.product = Math.min(8, a.product + 1);
        }
      }
      if (
        a.sex === 0 &&
        a.age >= d.matureSeconds * 60 &&
        a.energy > 5000 &&
        a.thirst > 3000 &&
        tick >= a.breedTick
      ) {
        const mate = this.state.animals.find(
          (m) =>
            m.health > 0 &&
            m.species === a.species &&
            m.sex === 1 &&
            m.age >= d.matureSeconds * 60 &&
            m.energy > 5000 &&
            m.thirst > 3000 &&
            m.pen === a.pen &&
            Math.hypot(m.x - a.x, m.y - a.y) < 5 &&
            tick >= m.breedTick,
        );
        const local =
          this.state.animals.filter(
            (m) =>
              m.health > 0 &&
              (a.pen
                ? m.pen === a.pen
                : Math.hypot(m.x - a.anchorX, m.y - a.anchorY) < 16),
          ).length + births.length;
        if (
          mate &&
          local < (a.pen ? 8 : 16) &&
          this.state.animals.length + births.length < 96
        ) {
          const child = this.animal(
            a.species,
            a.x,
            a.y,
            (livingHash(this.services.seed + ':birth:' + this.state.serial) %
              2) as 0 | 1,
          );
          child.pen = a.pen;
          child.owner = a.owner;
          child.anchorX = a.anchorX;
          child.anchorY = a.anchorY;
          births.push(child);
          a.energy -= 2000;
          mate.energy -= 2000;
          a.breedTick = mate.breedTick = tick + d.breedSeconds * 60;
        }
      }
    }
    this.state.animals = this.state.animals.filter((a) => !consumed.has(a.id));
    this.state.animals.push(...births);
    if (tick % 3600 === 0) {
      for (const id of this.services.players()) {
        const p = this.services.actor(id);
        if (
          this.state.animals.filter(
            (a) =>
              !a.pen && a.health > 0 && Math.hypot(a.x - p.x, a.y - p.y) < 16,
          ).length < 4 &&
          this.state.animals.length < 96
        ) {
          const h = livingHash(
              this.services.seed +
                ':migration:' +
                tick +
                ':' +
                Math.floor(p.x / 16) +
                ':' +
                Math.floor(p.y / 16),
            ),
            x = p.x + 3 + (h % 3),
            y = p.y + 3 + ((h >>> 8) % 3),
            d = SPECIES[h % 6]!;
          if (this.services.ground(x, y))
            this.state.animals.push(
              this.animal(d.id, x, y, (h % 2) as 0 | 1, true),
            );
        }
      }
    }

    this.state.revision++;
  }
  public execute(c: LivingCommand): {
    status: 'committed' | 'rejected';
    message: string;
  } {
    this.reconcile();
    const reject = (message: string) => ({
        status: 'rejected' as const,
        message,
      }),
      signature = JSON.stringify(c),
      receipt = this.state.receipts.find((r) => r.id === c.id);
    if (receipt)
      return receipt.signature === signature
        ? { status: 'committed', message: receipt.message }
        : reject('OPERATION_ID_CONFLICT');
    if (
      typeof c.id !== 'string' ||
      typeof c.playerId !== 'string' ||
      !c.playerId ||
      typeof c.target !== 'string' ||
      c.target.length > 180 ||
      !c.id ||
      c.id.length > 120 ||
      c.expectedRevision !== this.state.revision
    )
      return reject('STALE_REVISION');
    let actor: ExpeditionActor;
    try {
      actor = this.services.actor(c.playerId);
    } catch {
      return reject('UNKNOWN_PLAYER');
    }
    if (!actor.alive) return reject('PLAYER_DEAD');
    const inventory = this.items.getContainerView('inventory:' + c.playerId);
    if (inventory.revision !== c.expectedInventoryRevision)
      return reject('STALE_INVENTORY_REVISION');
    const has = (id: string) =>
        inventory.stacks.some((s) => s.itemDefinitionId === id),
      next = structuredClone(this.state),
      p = next.plots.find((p) => p.id === c.target),
      a = next.animals.find((a) => a.id === c.target),
      f = next.forage.find((f) => f.id === c.target),
      facility = this.expedition
        .read()
        .facilities.find((f) => f.id === c.target),
      distance = (e: { x: number; y: number }) =>
        Math.hypot(e.x - actor.x, e.y - actor.y),
      near = 4;
    const inputs: { itemDefinitionId: string; quantity: number }[] = [],
      outputs: typeof inputs = [];
    let message = 'DONE';
    const consume = (id: string, q = 1) =>
        inputs.push({ itemDefinitionId: id, quantity: q }),
      produce = (id: string, q = 1) =>
        outputs.push({ itemDefinitionId: id, quantity: q });
    const station = () => {
      let s = next.stations.find((s) => s.id === c.target);
      if (!s) {
        s = { id: c.target, water: 0, fireUntil: 0 };
        next.stations.push(s);
      }
      return s;
    };
    if (c.action === 'craft') {
      const r = LIVING_RECIPES.find((r) => r.id === c.target);
      if (!r) return reject('UNKNOWN_RECIPE');
      if (r.station && !this.near(actor, r.station))
        return reject('NEARBY_STATION_REQUIRED');
      for (const [id, q] of r.costs) consume(id, q);
      produce(r.output, r.quantity);
      message = 'CRAFTED';
    } else if (c.action === 'till') {
      const x = c.x!,
        y = c.y!;
      if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        Math.abs(x) > 1e7 ||
        Math.abs(y) > 1e7
      )
        return reject('INVALID_POSITION');
      if (distance({ x, y }) > near) return reject('OUT_OF_RANGE');
      if (!has('item:field-hoe')) return reject('FIELD_HOE_REQUIRED');
      if (next.plots.length >= 256) return reject('PLOT_LIMIT');
      const reason = this.services.plotGround(x, y);
      if (reason) return reject(reason);
      if (
        next.plots.some((p) => Math.hypot(p.x - x, p.y - y) < 1) ||
        this.expedition
          .read()
          .facilities.some(
            (f) => Math.abs(f.x - x) < 1.5 && Math.abs(f.y - y) < 1.5,
          )
      )
        return reject('OCCUPIED_GROUND');
      next.plots.push({
        id: 'plot:' + ++next.serial,
        owner: c.playerId,
        x,
        y,
        crop: null,
        progress: 0,
        moisture: 8000,
        dryTicks: 0,
        dead: false,
        fertility: 0,
      });
      message = 'SOIL_TILLED';
    } else if (
      ['plant', 'water', 'fertilize', 'harvest', 'clear'].includes(c.action)
    ) {
      if (!p) return reject('PLOT_MISSING');
      if (p.owner !== c.playerId) return reject('NOT_OWNER');
      if (distance(p) > near) return reject('OUT_OF_RANGE');
      if (c.action === 'plant') {
        const crop = cropDefinition(c.crop ?? '');
        if (!crop) return reject('UNKNOWN_CROP');
        if (p.crop) return reject('CLEAR_PLOT_FIRST');
        consume(crop.seed);
        p.crop = crop.id;
        p.dead = false;
        p.progress = 0;
        p.dryTicks = 0;
        message = 'PLANTED';
      }
      if (c.action === 'water') {
        if (!has('item:watering-can')) return reject('WATERING_CAN_REQUIRED');
        consume('item:clean-water');
        p.moisture = 10000;
        p.dryTicks = 0;
        message = 'WATERED';
      }
      if (c.action === 'fertilize') {
        if (p.fertility >= 3) return reject('SOIL_ALREADY_FERTILE');
        consume('item:compost');
        p.fertility++;
        message = 'FERTILIZED';
      }
      if (c.action === 'harvest') {
        const crop = cropDefinition(p.crop ?? '');
        if (!crop || p.dead || p.progress < crop.cycleTicks)
          return reject('NOT_READY');
        produce(
          crop.output,
          Math.floor((crop.yield * this.season().yieldMilli) / 1000),
        );
        produce(crop.seed, 2);
        p.crop = null;
        p.progress = 0;
        p.fertility = Math.max(0, p.fertility - 1);
        message = 'HARVESTED';
      }
      if (c.action === 'clear') {
        p.crop = null;
        p.dead = false;
        p.progress = 0;
        p.dryTicks = 0;
        message = 'CLEARED';
      }
    } else if (c.action === 'forage') {
      if (!f) return reject('FORAGE_MISSING');
      if (distance(f) > near) return reject('OUT_OF_RANGE');
      if (this.services.tick() < f.readyTick) return reject('RENEWING');
      const d = forageDefinition(f.kind)!;
      produce(d.output, d.quantity);
      f.readyTick =
        this.services.tick() +
        Math.round(
          d.renewalTicks *
            (f.kind.startsWith('wild-') || f.kind === 'berry-bush'
              ? this.renewal(f, 'resource:fiber-plant')
              : 1),
        );
      message = 'FORAGED';
    } else if (c.action === 'fuel' || c.action === 'fill') {
      if (!facility || facility.owner !== c.playerId)
        return reject('FACILITY_MISSING');
      if (distance(facility) > near) return reject('OUT_OF_RANGE');
      if (c.action === 'fuel') {
        if (facility.definitionId !== 'campfire')
          return reject('CAMPFIRE_REQUIRED');
        consume('item:timber');
        station().fireUntil =
          Math.max(this.services.tick(), station().fireUntil) + 18000;
        message = 'FIRE_LIT';
      } else {
        if (facility.definitionId !== 'irrigation-tank')
          return reject('TANK_REQUIRED');
        if (station().water >= 24) return reject('TANK_FULL');
        consume('item:clean-water');
        station().water = Math.min(24, station().water + 4);
        message = 'TANK_FILLED';
      }
    } else {
      if (!a) return reject('ANIMAL_MISSING');
      if (distance(a) > near) return reject('OUT_OF_RANGE');
      const d = speciesDefinition(a.species)!;
      if (c.action === 'loot') {
        if (a.health > 0) return reject('STILL_ALIVE');
        produce('item:raw-meat', d.meat);
        produce('item:raw-hide', 1);
        produce('item:bone', 1);
        next.animals = next.animals.filter((b) => b.id !== a.id);
        message = 'LOOTED';
      } else {
        if (a.health === 0) return reject('ANIMAL_DEAD');
        if (c.action === 'hunt') {
          if (!this.services.weapon(c.playerId))
            return reject('EQUIP_WEAPON_FIRST');
          if (this.services.tick() < a.attackTick) return reject('COOLDOWN');
          a.health = Math.max(0, a.health - 4);
          a.attackTick = this.services.tick() + 60;
          message = a.health === 0 ? 'HUNTED' : 'HIT';
        } else if (c.action === 'tame') {
          if (a.pen) return reject('ALREADY_TAME');
          if (!d.tame) return reject('WILD_PREDATOR');
          const pen = this.expedition
            .read()
            .facilities.filter(
              (f) =>
                f.owner === c.playerId &&
                (f.definitionId === 'livestock-pen' ||
                  (f.definitionId === 'poultry-coop' &&
                    a.species === 'chicken')) &&
                Math.hypot(a.x - f.x, a.y - f.y) <= 6,
            )
            .find(
              (f) =>
                next.animals.filter((a) => a.pen === f.id && a.health > 0)
                  .length < 8,
            );
          if (!pen) return reject('BUILD_NEARBY_PEN');
          consume('item:animal-feed');
          a.pen = pen.id;
          a.owner = c.playerId;
          a.x = a.anchorX = pen.x;
          a.y = a.anchorY = pen.y;
          message = 'TAMED';
        } else {
          if (a.owner !== c.playerId) return reject('NOT_OWNER');
          if (c.action === 'feed') {
            consume('item:animal-feed');
            consume('item:clean-water');
            a.energy = 10000;
            a.thirst = 10000;
            message = 'FED';
          } else if (c.action === 'release') {
            a.pen = null;
            a.owner = null;
            message = 'RELEASED';
          } else if (c.action === 'produce') {
            if (!d.product || a.product === 0) return reject('NOT_READY');
            produce(d.product, a.product);
            a.product = 0;
            message = 'PRODUCE_COLLECTED';
          } else if (c.action === 'shear') {
            if (
              a.species !== 'goat' ||
              a.age < d.matureSeconds * 60 ||
              this.services.tick() < a.breedTick
            )
              return reject('NOT_READY');
            produce('item:wool', 2);
            a.breedTick = this.services.tick() + 18000;
            message = 'SHEARED';
          } else return reject('INVALID_ACTION');
        }
      }
    }
    if (inputs.length || outputs.length) {
      const result = this.items.commitColonyExchange({
        operationId: c.id,
        playerId: c.playerId,
        expectedInventoryRevision: c.expectedInventoryRevision,
        inputs,
        outputs,
      });
      if (result.status === 'rejected') return reject(result.reason);
    }
    this.services.cancelRest(c.playerId);
    next.revision++;
    next.receipts.push({ id: c.id, signature, message });
    next.receipts = next.receipts.slice(-96);
    this.state = next;
    return { status: 'committed', message };
  }
}
