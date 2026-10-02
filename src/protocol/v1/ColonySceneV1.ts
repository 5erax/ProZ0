/** Server-selected, explored scene only. No simulation or generation runs on clients. */
export interface ColonySceneV1 {
  readonly version: 1;
  readonly worldSeed: string;
  readonly tick: number;
  readonly clock?: {
    readonly minute: number;
    readonly day: number;
    readonly period: 'day' | 'night';
    readonly segment: string;
    readonly brightness: number;
  };
  readonly playerSkins?: Readonly<Record<string, string>>;
  readonly playerNames?: Readonly<Record<string, string>>;
  readonly map?: readonly {
    x: number;
    y: number;
    terrain: "ground" | "water";
  }[];
  readonly terrain: readonly {
    readonly x: number;
    readonly y: number;
    readonly terrain: "ground" | "water";
  }[];
  readonly entities: readonly {
    readonly id: string;
    readonly definitionId: string;
    readonly type: string;
    readonly x: number;
    readonly y: number;
    readonly revision: number;
    readonly depleted: boolean;
    readonly containerId?: string;
  }[];
  readonly sites: readonly {
    readonly id: string;
    readonly biomeId: string;
    readonly name: string;
    readonly x: number;
    readonly y: number;
  }[];
  readonly survival: {
    readonly health: number;
    readonly food: number;
    readonly water: number;
    readonly stamina?: number;
    readonly temperature?: number;
    readonly lifeState?: string;
  };
}
