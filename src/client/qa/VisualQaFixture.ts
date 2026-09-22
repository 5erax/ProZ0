import {
  createWorldPosition,
  type WorldPosition,
} from '../../foundation';
import type {
  GroundTone,
  PixiPresentationOptions,
  TallDepthVisual,
} from '../presentation/PixiPresentationAdapter';

export type VisualQaMode = 'none' | 'light' | 'dark' | 'shimmer' | 'depth';

export interface VisualQaFixture {
  readonly mode: VisualQaMode;
  readonly initialPlayerPosition: WorldPosition;
  readonly presentation: Omit<PixiPresentationOptions, 'solids'>;
}

const DEPTH_TEST_OBJECT: TallDepthVisual = Object.freeze({
  id: 'qa-depth-pillar',
  anchorX: 0,
  anchorY: 0,
  widthPx: 32,
  heightPx: 64,
});

function parseMode(value: string | null): VisualQaMode {
  switch (value) {
    case 'light':
    case 'dark':
    case 'shimmer':
    case 'depth':
      return value;
    default:
      return 'none';
  }
}

function parseScale(value: string | null): number | undefined {
  if (value === null || value === '') {
    return undefined;
  }

  const scale = Number(value);

  if (!Number.isInteger(scale) || scale < 1) {
    throw new Error('qaScale must be a positive integer.');
  }

  return scale;
}

function toneForMode(mode: VisualQaMode): GroundTone {
  return mode === 'light' ? 'light' : 'dark';
}

export function resolveVisualQaFixture(search: string): VisualQaFixture {
  const params = new URLSearchParams(search);
  const mode = parseMode(params.get('qaVisual'));
  const displayScale = parseScale(params.get('qaScale'));

  if (mode === 'depth') {
    return Object.freeze({
      mode,
      initialPlayerPosition: createWorldPosition(0, -0.75),
      presentation: Object.freeze({
        groundTone: 'dark',
        displayScale,
        tallDepthVisual: DEPTH_TEST_OBJECT,
      }),
    });
  }

  if (mode === 'shimmer') {
    return Object.freeze({
      mode,
      initialPlayerPosition: createWorldPosition(-1.25, 0),
      presentation: Object.freeze({
        groundTone: 'dark',
        displayScale,
      }),
    });
  }

  return Object.freeze({
    mode,
    initialPlayerPosition: createWorldPosition(0, 0),
    presentation: Object.freeze({
      groundTone: toneForMode(mode),
      displayScale,
    }),
  });
}
