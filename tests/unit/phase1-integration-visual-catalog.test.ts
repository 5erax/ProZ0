import { describe, expect, it } from 'vitest';
import {
  PHASE1_PRODUCTION_WORLD_SPRITES,
  PHASE1_VERTICAL_SLICE_REQUIRED_VISUALS,
  coldRainSprite,
  condenserSprite,
  deathCacheSprite,
  fogMaskSprite,
  habitatSprite,
  powerUnitSprite,
  resourceNodeSprite,
  ruinInspectMarkerSprite,
} from '../../src/client/presentation';

describe('Phase 1 integration production visual catalog', () => {
  it('covers every player-facing category required by the vertical-slice flow', () => {
    expect(PHASE1_VERTICAL_SLICE_REQUIRED_VISUALS).toEqual([
      'ground',
      'player',
      'thermalWrap',
      'passiveWildlife',
      'predator',
      'landingModule',
      'habitat',
      'storageCrate',
      'workbench',
      'powerUnit',
      'condenser',
      'fiberPlant',
      'foodPlant',
      'treeTimber',
      'stoneOutcrop',
      'metalOre',
      'potableWater',
      'ruin',
      'ruinInspectMarker',
      'deathCache',
      'worldDrop',
      'fogMask',
      'coldRain',
      'weatherDither',
      'nonbuildablePattern',
    ]);

    for (const key of PHASE1_VERTICAL_SLICE_REQUIRED_VISUALS) {
      const sprite = PHASE1_PRODUCTION_WORLD_SPRITES[key];

      expect(sprite.assetPath).toMatch(/^assets\/phase1\//);
      expect(sprite.url.length).toBeGreaterThan(0);
      expect(sprite.sourceWidth % sprite.cellWidth).toBe(0);
      expect(sprite.sourceHeight % sprite.cellHeight).toBe(0);
      expect(sprite.columns).toBe(sprite.sourceWidth / sprite.cellWidth);
    }
  });

  it('maps approved resource and recovery states without gameplay-side guessing', () => {
    expect(resourceNodeSprite('fiberPlant', 'NORMAL').index).toBe(0);
    expect(resourceNodeSprite('fiberPlant', 'DEPLETED').index).toBe(1);
    expect(resourceNodeSprite('metalOre', 'DEPLETED').index).toBe(1);

    expect(deathCacheSprite('ACTIVE').index).toBe(0);
    expect(deathCacheSprite('TARGETED').index).toBe(1);
    expect(deathCacheSprite('RECOVERED').index).toBe(2);

    expect(ruinInspectMarkerSprite('AVAILABLE').index).toBe(0);
    expect(ruinInspectMarkerSprite('TARGETED').index).toBe(1);
    expect(ruinInspectMarkerSprite('INVESTIGATED').index).toBe(2);
  });

  it('maps weather, fog, habitat and machine presentation states to accepted atlas cells', () => {
    expect(fogMaskSprite(0).index).toBe(0);
    expect(fogMaskSprite(15).index).toBe(15);
    expect(() => fogMaskSprite(16)).toThrow(/0\.\.15/);

    expect(coldRainSprite('RAIN_STREAK', 3).index).toBe(3);
    expect(coldRainSprite('GROUND_SPLASH', 0).index).toBe(4);
    expect(coldRainSprite('GROUND_SPLASH', 3).index).toBe(7);

    expect(habitatSprite(0, 'NORMAL').index).toBe(0);
    expect(habitatSprite(90, 'CONNECTOR_TARGET').index).toBe(5);
    expect(habitatSprite(270, 'SHELTER_ACTIVE').index).toBe(11);

    expect(powerUnitSprite('OPERATING_0').index).toBe(0);
    expect(powerUnitSprite('SELECTED').index).toBe(4);

    expect(condenserSprite('DISABLED').index).toBe(0);
    expect(condenserSprite('UNPOWERED').index).toBe(1);
    expect(condenserSprite('RUNNING_3').index).toBe(5);
    expect(condenserSprite('OUTPUT_FULL').index).toBe(6);
  });
});
