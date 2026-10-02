export const COLONY_AUTOSAVE_EVENT = 'proz0:autosave';
export interface ColonyAutosaveIntent { readonly id: string; readonly reason: 'rest' | 'dawn'; readonly tick: number }

/** Crossing detector initialized from the loaded checkpoint; no duplicate on reload. */
export class ColonyAutosaveCrossings {
  constructor(private night: number, private restCooldown: number) {}
  advance(worldId: string, player: string, tick: number, night: number, cooldown: number, alive: boolean): ColonyAutosaveIntent | null {
    const rested = cooldown > this.restCooldown;
    const dawn = night > this.night;
    this.night = night; this.restCooldown = cooldown;
    if (!alive || (!rested && !dawn)) return null;
    return { id: `${worldId}:${player}:${rested ? 'rest:' + cooldown : 'dawn:' + night}`, reason: rested ? 'rest' : 'dawn', tick };
  }
}
