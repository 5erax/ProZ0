import type { ContentId } from '../../content';
import type { PlayerId } from '../../foundation';

export type ProgressionRepeatKind = 'gather' | 'craft' | 'repair';

export type ProgressionQuestId =
  | 'profession-quest:chart-the-unknown'
  | 'profession-quest:bring-water-online';

export type ProgressionProfessionId =
  | 'profession:explorer-prototype'
  | 'profession:engineer-prototype';

export type ProgressionSkillId =
  | 'skill:fieldcraft-basics'
  | 'skill:maintenance-basics';

export type ProgressionGameplayEvent =
  | {
      readonly type: 'gather-completed';
      readonly eventId: string;
      readonly playerId: PlayerId;
      readonly resourceId: ContentId;
    }
  | {
      readonly type: 'craft-completed';
      readonly eventId: string;
      readonly playerId: PlayerId;
      readonly recipeId: ContentId;
    }
  | {
      readonly type: 'repair-completed';
      readonly eventId: string;
      readonly playerId: PlayerId;
      readonly conditionBefore: number;
      readonly conditionAfter: number;
    }
  | {
      readonly type: 'structure-placed';
      readonly eventId: string;
      readonly playerId: PlayerId;
      readonly structureId: ContentId;
    }
  | {
      readonly type: 'machine-output-collected';
      readonly eventId: string;
      readonly playerId: PlayerId;
      readonly machineId: ContentId;
      readonly itemId: ContentId;
      readonly quantity: number;
    }
  | {
      readonly type: 'expedition-band-entered';
      readonly eventId: string;
      readonly playerId: PlayerId;
    }
  | {
      readonly type: 'ruin-located';
      readonly eventId: string;
      readonly playerId: PlayerId;
      readonly ruinId: ContentId;
    }
  | {
      readonly type: 'ruin-inspected';
      readonly eventId: string;
      readonly playerId: PlayerId;
      readonly ruinId: ContentId;
    }
  | {
      readonly type: 'returned-to-base-alive';
      readonly eventId: string;
      readonly playerId: PlayerId;
      readonly structureId: ContentId;
      readonly alive: boolean;
    }
  | {
      readonly type: 'structures-present';
      readonly eventId: string;
      readonly playerId: PlayerId;
      readonly structureIds: readonly ContentId[];
    }
  | {
      readonly type: 'powered-machine-interacted';
      readonly eventId: string;
      readonly playerId: PlayerId;
      readonly machineId: ContentId;
      readonly powered: boolean;
    }
  | {
      readonly type: 'hostile-resolved';
      readonly eventId: string;
      readonly playerId: PlayerId;
      readonly hostileId: ContentId;
      readonly resolution: 'retreat' | 'kill';
      readonly eligibleParticipant: boolean;
    }
  | {
      readonly type: 'own-death-cache-recovered';
      readonly eventId: string;
      readonly playerId: PlayerId;
      readonly quantity: number;
    };

export interface ProgressionQuestSnapshot {
  readonly questId: ProgressionQuestId;
  readonly completedObjectives: number;
  readonly completed: boolean;
}

export interface ProgressionEventReceipt {
  readonly eventId: string;
  readonly event: Readonly<ProgressionGameplayEvent>;
}

export interface PlayerProgressionSnapshot {
  readonly playerId: PlayerId;
  readonly revision: number;
  readonly totalXp: number;
  readonly level: number;
  readonly milestoneRuleIds: readonly string[];
  readonly repeatCounts: Readonly<Record<ProgressionRepeatKind, number>>;
  readonly skillIds: readonly ProgressionSkillId[];
  readonly questStates: readonly ProgressionQuestSnapshot[];
  readonly professionIds: readonly ProgressionProfessionId[];
  readonly eventReceipts: readonly ProgressionEventReceipt[];
}

export interface ProgressionAuthoritySnapshot {
  readonly players: readonly PlayerProgressionSnapshot[];
}

export type ProgressionQuestStatus =
  | 'locked'
  | 'available'
  | 'in-progress'
  | 'completed';

export interface ProgressionQuestView {
  readonly questId: ProgressionQuestId;
  readonly status: ProgressionQuestStatus;
  readonly completedObjectives: number;
  readonly totalObjectives: number;
}

export interface PlayerProgressionView {
  readonly playerId: PlayerId;
  readonly revision: number;
  readonly totalXp: number;
  readonly level: number;
  readonly milestoneRuleIds: readonly string[];
  readonly repeatCounts: Readonly<Record<ProgressionRepeatKind, number>>;
  readonly skillIds: readonly ProgressionSkillId[];
  readonly quests: readonly ProgressionQuestView[];
  readonly professionIds: readonly ProgressionProfessionId[];
}

export type ProgressionApplyResult =
  | {
      readonly status: 'applied' | 'duplicate' | 'ignored';
      readonly eventId: string;
      readonly xpAwarded: number;
      readonly view: Readonly<PlayerProgressionView>;
      readonly unlockedSkillIds: readonly ProgressionSkillId[];
      readonly unlockedProfessionIds: readonly ProgressionProfessionId[];
    }
  | {
      readonly status: 'rejected';
      readonly eventId: string;
      readonly reason: 'INVALID_EVENT' | 'OPERATION_ID_CONFLICT';
    };
