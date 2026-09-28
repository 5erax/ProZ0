import {
  validatePhase1PresentationState,
  type Phase1InventoryItemPresentation,
  type Phase1MeterPresentation,
  type Phase1PanelPresentation,
  type Phase1PresentationState,
  type Phase1TeammatePresentation,
} from './Phase1PresentationModel';
import {
  applyProductionSprite,
  buildPreviewPatternSprite,
  hudStatusSprite,
  interactionSprite,
  itemIconSprite,
  mapMarkerSprite,
  panelSkinCornerSprite,
  PHASE1_PRODUCTION_WORLD_SPRITES,
  progressionSprite,
  teammateIdentitySprite,
  type Phase1ProductionSprite,
} from './Phase1ProductionAssets';

function createElement<K extends keyof HTMLElementTagNameMap>(
  document: Document,
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

function percent(value: number, max: number): number {
  return Math.round((value / max) * 100);
}

function assetSprite(
  document: Document,
  className: string,
  spriteDefinition: Phase1ProductionSprite | null,
  scale = 1,
): HTMLSpanElement | null {
  if (spriteDefinition === null) {
    return null;
  }

  const element = createElement(document, 'span', className);
  applyProductionSprite(element, spriteDefinition, scale);
  element.setAttribute('aria-hidden', 'true');
  return element;
}

function createProductionWorldPreview(document: Document): HTMLElement {
  const preview = createElement(
    document,
    'div',
    'p1-production-world-preview',
  );
  preview.dataset.productionWorldPreview = 'accepted-raster';

  for (let row = 0; row < 12; row += 1) {
    for (let column = 0; column < 20; column += 1) {
      const tile = assetSprite(
        document,
        'p1-production-world-tile',
        PHASE1_PRODUCTION_WORLD_SPRITES.ground,
      );
      if (tile !== null) {
        tile.style.left = String(column * 32) + 'px';
        tile.style.top = String(row * 32) + 'px';
        preview.append(tile);
      }
    }
  }

  const placements = [
    ['ruin', PHASE1_PRODUCTION_WORLD_SPRITES.ruin, 22, 138, 160],
    ['metal-ore', PHASE1_PRODUCTION_WORLD_SPRITES.metalOre, 190, 238, 278],
    ['potable-water', PHASE1_PRODUCTION_WORLD_SPRITES.potableWater, 252, 244, 276],
    ['player', PHASE1_PRODUCTION_WORLD_SPRITES.player, 300, 182, 230],
    ['predator', PHASE1_PRODUCTION_WORLD_SPRITES.predator, 372, 174, 222],
    ['habitat', PHASE1_PRODUCTION_WORLD_SPRITES.habitat, 478, 158, 254],
    ['death-cache', PHASE1_PRODUCTION_WORLD_SPRITES.deathCache, 344, 276, 300],
    ['condenser', PHASE1_PRODUCTION_WORLD_SPRITES.condenser, 518, 272, 336],
  ] as const;

  for (const [id, definition, left, top, zIndex] of placements) {
    const visual = assetSprite(
      document,
      'p1-production-world-sprite',
      definition,
    );
    if (visual === null) {
      continue;
    }
    visual.dataset.productionWorldAsset = id;
    visual.style.left = String(left) + 'px';
    visual.style.top = String(top) + 'px';
    visual.style.zIndex = String(zIndex);
    preview.append(visual);
  }

  return preview;
}

function meter(
  document: Document,
  presentation: Phase1MeterPresentation,
): HTMLElement {
  const row = createElement(document, 'div', 'p1-meter');
  row.dataset.severity = presentation.severity;
  row.dataset.stateLabel = presentation.stateLabel;
  row.dataset.value = String(presentation.value);
  row.dataset.max = String(presentation.max);
  row.title = presentation.label + ' · ' + presentation.stateLabel;

  const label = createElement(document, 'div', 'p1-meter-label');
  const icon = assetSprite(
    document,
    'p1-asset-icon p1-meter-icon',
    hudStatusSprite(presentation.label),
  );
  if (icon !== null) {
    label.append(icon);
  }
  label.append(presentation.label.toUpperCase());

  const track = createElement(document, 'div', 'p1-meter-track');
  const fill = createElement(document, 'div', 'p1-meter-fill');
  fill.style.width = String(percent(presentation.value, presentation.max)) + '%';
  track.append(fill);

  const value = createElement(
    document,
    'span',
    'p1-meter-value',
    String(Math.round(presentation.value)),
  );
  const alert = createElement(
    document,
    'span',
    'p1-meter-alert',
    presentation.severity === 'critical'
      ? '!!'
      : presentation.severity === 'warning'
        ? '!'
        : '',
  );
  const semanticState = createElement(
    document,
    'span',
    'p1-meter-state p1-visually-hidden',
    presentation.stateLabel,
  );

  row.append(label, track, value, alert, semanticState);
  return row;
}

function itemRow(
  document: Document,
  item: Phase1InventoryItemPresentation,
  selected: boolean,
  compact = false,
): HTMLElement {
  const row = createElement(document, 'div', 'p1-item-row');
  row.dataset.itemId = item.id;
  row.dataset.selected = String(selected);
  row.dataset.available = String(item.available ?? item.condition !== 0);

  const icon = assetSprite(
    document,
    'p1-asset-icon p1-item-icon',
    itemIconSprite(item.name),
  );
  const identity = createElement(
    document,
    'span',
    'p1-item-name',
    compact
      ? '×' + String(item.quantity)
      : item.name + ' ×' + String(item.quantity),
  );
  const state = createElement(
    document,
    'span',
    'p1-item-state',
    item.condition === null
      ? (item.stateLabel ?? '')
      : 'COND ' + String(item.condition) + (item.stateLabel === null ? '' : ' · ' + item.stateLabel),
  );

  if (icon !== null) {
    row.append(icon);
  }
  row.append(identity, state);
  if (
    item.condition !== null
    && (item.conditionMax ?? 100) > 0
  ) {
    const conditionTrack = createElement(
      document,
      'span',
      'p1-item-condition-track',
    );
    conditionTrack.dataset.conditionCurrent = String(item.condition);
    conditionTrack.dataset.conditionMax = String(item.conditionMax ?? 100);
    const conditionFill = createElement(
      document,
      'span',
      'p1-item-condition-fill',
    );
    conditionFill.style.width = String(percent(
      item.condition,
      item.conditionMax ?? 100,
    )) + '%';
    conditionTrack.append(conditionFill);
    row.append(conditionTrack);
  }
  if (compact) {
    row.append(createElement(
      document,
      'span',
      'p1-visually-hidden',
      item.name,
    ));
  }
  return row;
}

function teammate(
  document: Document,
  entry: Phase1TeammatePresentation,
): HTMLElement {
  const row = createElement(document, 'div', 'p1-teammate');
  row.dataset.playerId = entry.playerId;
  row.dataset.presentationIdentitySlot = entry.presentationIdentitySlot;
  row.dataset.markerShape = entry.markerShape;

  const marker = createElement(document, 'span', 'p1-teammate-marker');
  marker.dataset.shape = entry.markerShape;
  applyProductionSprite(marker, teammateIdentitySprite(entry.markerShape));
  const label = createElement(
    document,
    'span',
    'p1-teammate-label',
    entry.label + ' · ' + entry.stateLabel,
  );

  row.append(marker, label);
  return row;
}

function panelTitle(document: Document, title: string): HTMLElement {
  return createElement(document, 'div', 'p1-panel-title', title);
}

function renderPanel(
  document: Document,
  panel: Phase1PanelPresentation,
): HTMLElement {
  const root = createElement(document, 'section', 'p1-panel');
  root.dataset.panelKind = panel.kind;
  const skinCorner = assetSprite(
    document,
    'p1-panel-skin-corner',
    panelSkinCornerSprite(),
  );
  if (skinCorner !== null) {
    root.append(skinCorner);
  }
  root.append(panelTitle(document, panel.title));

  switch (panel.kind) {
    case 'inventory': {
      root.dataset.inventoryActivePane = 'player';
      root.dataset.inventoryQuantity = String(panel.quantity);
      const list = createElement(document, 'div', 'p1-item-list');
      for (const item of panel.items) {
        list.append(itemRow(
          document,
          item,
          item.id === panel.selectedItemId,
          true,
        ));
      }
      const capacity = panel.capacity;
      root.append(
        list,
        createElement(document, 'div', 'p1-panel-detail', panel.detail),
        ...(capacity === undefined
          ? []
          : [createElement(
              document,
              'div',
              'p1-panel-capacity',
              'CARRY · '
                + capacity.weightCurrent.toFixed(1)
                + '/'
                + capacity.weightMax.toFixed(1)
                + ' kg · '
                + capacity.volumeCurrent.toFixed(1)
                + '/'
                + capacity.volumeMax.toFixed(1)
                + ' u · '
                + capacity.stateLabel,
            )]),
        createElement(
          document,
          'div',
          'p1-inventory-controls',
          panel.controls,
        ),
      );
      if (panel.feedback !== null) {
        root.append(
          createElement(
            document,
            'div',
            'p1-feedback',
            panel.feedback,
          ),
        );
      }
      return root;
    }

    case 'container': {
      root.dataset.inventoryActivePane = panel.activePane;
      root.dataset.inventoryQuantity = String(panel.quantity);
      const panes = createElement(document, 'div', 'p1-container-panes');
      const left = createElement(
        document,
        'div',
        'p1-container-pane',
      );
      left.dataset.inventoryPane = 'player';
      left.dataset.active = String(panel.activePane === 'player');
      left.append(createElement(document, 'div', 'p1-subtitle', 'PLAYER'));
      for (const item of panel.playerItems) {
        const selected = item.id === panel.selectedPlayerItemId;
        const row = itemRow(document, item, selected);
        left.append(row);
        if (selected) {
          queueMicrotask(() => {
            if (row.isConnected) {
              row.scrollIntoView({ block: 'nearest' });
            }
          });
        }
      }

      const right = createElement(
        document,
        'div',
        'p1-container-pane',
      );
      right.dataset.inventoryPane = 'storage';
      right.dataset.active = String(panel.activePane === 'storage');
      right.append(createElement(document, 'div', 'p1-subtitle', panel.containerLabel));
      for (const item of panel.containerItems) {
        const selected = item.id === panel.selectedContainerItemId;
        const row = itemRow(document, item, selected);
        right.append(row);
        if (selected) {
          queueMicrotask(() => {
            if (row.isConnected) {
              row.scrollIntoView({ block: 'nearest' });
            }
          });
        }
      }

      panes.append(left, right);
      const capacityContext = createElement(
        document,
        'div',
        'p1-container-capacity-context',
      );
      if (panel.playerCapacity !== undefined) {
        capacityContext.append(createElement(
          document,
          'div',
          'p1-panel-capacity',
          'PLAYER · '
            + panel.playerCapacity.weightCurrent.toFixed(1)
            + '/'
            + panel.playerCapacity.weightMax.toFixed(1)
            + ' kg · '
            + panel.playerCapacity.volumeCurrent.toFixed(1)
            + '/'
            + panel.playerCapacity.volumeMax.toFixed(1)
            + ' u · '
            + panel.playerCapacity.stateLabel,
        ));
      }
      if (panel.containerCapacity !== undefined
        && panel.containerCapacity !== null) {
        capacityContext.append(createElement(
          document,
          'div',
          'p1-panel-capacity',
          'STORAGE · '
            + panel.containerCapacity.weightCurrent.toFixed(1)
            + '/'
            + panel.containerCapacity.weightMax.toFixed(1)
            + ' kg · '
            + panel.containerCapacity.volumeCurrent.toFixed(1)
            + '/'
            + panel.containerCapacity.volumeMax.toFixed(1)
            + ' u',
        ));
      }
      root.append(
        panes,
        capacityContext,
        createElement(
          document,
          'div',
          'p1-inventory-controls',
          panel.controls,
        ),
      );
      if (panel.feedback !== null) {
        const feedback = createElement(document, 'div', 'p1-feedback', panel.feedback);
        feedback.dataset.feedback = panel.feedback;
        root.append(feedback);
      }
      return root;
    }

    case 'craft': {
      const list = createElement(document, 'div', 'p1-craft-list');
      for (const rowState of panel.rows) {
        const row = createElement(document, 'div', 'p1-craft-row');
        row.dataset.state = rowState.state;

        const heading = createElement(document, 'div', 'p1-craft-heading');
        const output = createElement(
          document,
          'span',
          'p1-craft-output',
        );
        for (const outputState of rowState.outputs ?? []) {
          const outputToken = createElement(
            document,
            'span',
            'p1-craft-output-token',
          );
          outputToken.dataset.outputName = outputState.name;
          outputToken.dataset.outputQuantity = String(outputState.quantity);
          const outputIcon = assetSprite(
            document,
            'p1-asset-icon p1-craft-output-icon',
            itemIconSprite(outputState.name),
            0.5,
          );
          if (outputIcon !== null) outputToken.append(outputIcon);
          outputToken.append(
            String(outputState.quantity) + '× ' + outputState.name,
          );
          output.append(outputToken);
        }
        if ((rowState.outputs?.length ?? 0) === 0) {
          output.append('→ ' + rowState.outputLabel);
        }
        heading.append(
          createElement(document, 'span', 'p1-craft-name', rowState.name),
          output,
        );
        row.append(heading);

        const ingredients = createElement(
          document,
          'div',
          'p1-craft-ingredients',
        );
        if ((rowState.ingredients?.length ?? 0) > 0) {
          for (const ingredient of rowState.ingredients ?? []) {
            const token = createElement(
              document,
              'span',
              'p1-craft-ingredient',
            );
            const iconDefinition = itemIconSprite(ingredient.name);
            if (iconDefinition !== null) {
              const icon = createElement(
                document,
                'div',
                'p1-asset-icon p1-craft-ingredient-icon',
              );
              applyProductionSprite(icon, iconDefinition);
              icon.setAttribute('aria-hidden', 'true');
              token.append(icon);
            }
            token.append(
              ingredient.name
              + ' '
              + String(ingredient.have)
              + '/'
              + String(ingredient.need),
            );
            token.dataset.sufficient = String(
              ingredient.have >= ingredient.need,
            );
            ingredients.append(token);
          }
        } else {
          ingredients.append(rowState.requirementLabel);
        }
        row.append(ingredients);

        const footer = createElement(document, 'div', 'p1-craft-footer');
        if (rowState.stationLabel !== undefined
          && rowState.stationLabel !== null) {
          footer.append(createElement(
            document,
            'span',
            'p1-craft-station',
            rowState.stationLabel,
          ));
        }
        footer.append(createElement(
          document,
          'span',
          'p1-craft-state',
          rowState.reason ?? rowState.state,
        ));
        row.append(footer);
        list.append(row);
      }
      root.append(list);
      return root;
    }

    case 'build': {
      const catalog = createElement(
        document,
        'div',
        'p1-build-catalog',
      );
      for (const entry of panel.catalogEntries ?? []) {
        const row = createElement(
          document,
          'div',
          'p1-build-catalog-entry',
        );
        row.dataset.structureId = entry.structureId;
        row.dataset.selected = String(entry.selected);
        row.dataset.buildCapState = entry.buildCapState;
        row.dataset.availableKitCount = String(entry.availableKitCount);
        row.dataset.builtCount = String(entry.builtCount);
        row.dataset.buildCap = String(entry.buildCap);
        const iconSource = (() => {
          switch (entry.structureId) {
            case 'structure:storage-crate':
              return [PHASE1_PRODUCTION_WORLD_SPRITES.storageCrate, 1] as const;
            case 'structure:workbench':
              return [PHASE1_PRODUCTION_WORLD_SPRITES.workbench, 0.5] as const;
            case 'structure:habitat-room':
              return [PHASE1_PRODUCTION_WORLD_SPRITES.habitat, 0.25] as const;
            case 'structure:compact-power-unit':
              return [PHASE1_PRODUCTION_WORLD_SPRITES.powerUnit, 0.5] as const;
            case 'structure:atmospheric-water-condenser':
              return [PHASE1_PRODUCTION_WORLD_SPRITES.condenser, 0.5] as const;
            default:
              return null;
          }
        })();
        if (iconSource !== null) {
          const icon = assetSprite(
            document,
            'p1-build-catalog-icon',
            iconSource[0],
            iconSource[1],
          );
          if (icon !== null) row.append(icon);
        }
        const copy = createElement(
          document,
          'div',
          'p1-build-catalog-copy',
        );
        copy.append(
          createElement(
            document,
            'div',
            'p1-build-catalog-name',
            entry.name,
          ),
          createElement(
            document,
            'div',
            'p1-build-catalog-kit',
            entry.sourceKitName
              + ' ×'
              + String(entry.availableKitCount)
              + ' · CAP '
              + String(entry.builtCount)
              + '/'
              + String(entry.buildCap)
              + ' · '
              + entry.buildCapState,
          ),
        );
        row.append(copy);
        catalog.append(row);
      }

      const preview = createElement(document, 'div', 'p1-build-preview');
      preview.dataset.placementState = panel.placementState;
      const pattern = assetSprite(
        document,
        'p1-build-preview-pattern',
        buildPreviewPatternSprite(panel.placementState),
        6,
      );
      if (pattern !== null) {
        pattern.dataset.productionPatternState = panel.placementState;
        preview.append(pattern);
      }
      preview.append(createElement(
        document,
        'span',
        'p1-build-preview-label',
        panel.placementState,
      ));
      root.append(
        catalog,
        createElement(document, 'div', 'p1-build-name', panel.selectedStructure),
        createElement(document, 'div', 'p1-build-kit', panel.sourceKitLabel),
        preview,
      );
      if (panel.reason !== null) {
        root.append(createElement(document, 'div', 'p1-feedback', panel.reason));
      }
      return root;
    }

    case 'machine': {
      root.dataset.machineState = panel.stateLabel;
      root.append(
        createElement(document, 'div', 'p1-machine-state', panel.stateLabel),
        createElement(document, 'div', 'p1-machine-power', panel.powerLabel),
        createElement(document, 'div', 'p1-machine-output', panel.outputLabel),
      );
      if (panel.reason !== null) {
        root.append(createElement(document, 'div', 'p1-feedback', panel.reason));
      }
      return root;
    }

    case 'recovery': {
      root.append(
        createElement(document, 'div', 'p1-recovery-cause', panel.deathCause),
        createElement(document, 'div', 'p1-recovery-respawn', panel.respawnLabel),
        createElement(document, 'div', 'p1-recovery-consequence', panel.consequenceLabel),
        createElement(document, 'div', 'p1-recovery-cache', panel.cacheLabel),
      );
      return root;
    }

    case 'progression': {
      const levelLine = createElement(
        document,
        'div',
        'p1-progress-level',
      );
      levelLine.dataset.progressionIconIndex = '6';
      const levelIcon = assetSprite(
        document,
        'p1-progression-icon',
        progressionSprite(6),
      );
      if (levelIcon !== null) levelLine.append(levelIcon);
      levelLine.append(panel.levelLabel);
      root.append(
        levelLine,
        createElement(document, 'div', 'p1-progress-xp', panel.xpLabel),
      );
      if (panel.rows !== undefined) {
        const sections = [
          ['SKILLS', 'skill'],
          ['PROFESSIONS', 'profession'],
          ['OBJECTIVES', 'objective'],
        ] as const;
        for (const [sectionLabel, kind] of sections) {
          root.append(createElement(
            document,
            'div',
            'p1-subtitle',
            sectionLabel,
          ));
          const rows = createElement(
            document,
            'div',
            'p1-progression-rows',
          );
          for (const rowState of panel.rows.filter(
            (entry) => entry.kind === kind,
          )) {
            const row = createElement(
              document,
              'div',
              'p1-progression-row',
            );
            row.dataset.progressionKind = rowState.kind;
            row.dataset.progressionState = rowState.state;
            row.dataset.progressionId = rowState.id;
            row.dataset.progressionIconIndex = String(rowState.iconIndex);
            const icon = assetSprite(
              document,
              'p1-progression-icon',
              progressionSprite(rowState.iconIndex),
            );
            if (icon !== null) row.append(icon);
            row.append(
              (rowState.groupLabel === undefined
                ? ''
                : rowState.groupLabel + ' · ')
              + rowState.label
              + ' · '
              + rowState.state,
            );
            rows.append(row);
          }
          root.append(rows);
        }
      } else {
        root.append(
          createElement(document, 'div', 'p1-subtitle', 'SKILLS'),
          createElement(document, 'div', 'p1-progress-list', panel.skillLabels.join(' · ')),
          createElement(document, 'div', 'p1-subtitle', 'PROFESSIONS'),
          createElement(document, 'div', 'p1-progress-list', panel.professionLabels.join(' · ')),
          createElement(document, 'div', 'p1-subtitle', 'QUESTS'),
          createElement(document, 'div', 'p1-progress-list', panel.questLabels.join(' · ')),
        );
      }
      return root;
    }

    case 'map': {
      if (panel.spatial !== undefined) {
        const spatial = panel.spatial;
        const widthCells =
          spatial.maxCellX - spatial.minCellX + 1;
        const heightCells =
          spatial.maxCellY - spatial.minCellY + 1;
        const cellScale = Math.max(
          1,
          Math.min(
            4,
            Math.floor(Math.min(
              500 / Math.max(1, widthCells),
              190 / Math.max(1, heightCells),
            )),
          ),
        );
        const field = createElement(
          document,
          'div',
          'p1-spatial-map',
        );
        field.dataset.mapSpatial = 'true';
        field.dataset.mapKnowledge =
          spatial.knowledgePolicy.toLowerCase().replace('_', '-');
        field.dataset.mapCellScale = String(cellScale);
        field.dataset.exploredCellCount =
          String(spatial.exploredCells.length);
        field.dataset.unknownBoundaryCount =
          String(spatial.unknownBoundaryCells.length);
        field.style.width = String(widthCells * cellScale) + 'px';
        field.style.height = String(heightCells * cellScale) + 'px';

        const withinMapBounds = (
          cellX: number,
          cellY: number,
        ): boolean =>
          cellX >= spatial.minCellX
          && cellX <= spatial.maxCellX
          && cellY >= spatial.minCellY
          && cellY <= spatial.maxCellY;

        const clampPixel = (
          value: number,
          minimum: number,
          maximum: number,
        ): number => Math.max(minimum, Math.min(maximum, value));

        const setCellPosition = (
          element: HTMLElement,
          cellX: number,
          cellY: number,
        ): void => {
          element.style.left =
            String((cellX - spatial.minCellX) * cellScale) + 'px';
          element.style.top =
            String((cellY - spatial.minCellY) * cellScale) + 'px';
          element.style.width = String(cellScale) + 'px';
          element.style.height = String(cellScale) + 'px';
        };

        let visibleExploredCellCount = 0;
        for (const cell of spatial.exploredCells) {
          if (!withinMapBounds(cell.cellX, cell.cellY)) continue;
          visibleExploredCellCount += 1;
          const element = createElement(
            document,
            'div',
            'p1-map-cell p1-map-cell-' + cell.terrain,
          );
          element.dataset.mapCellState = 'EXPLORED';
          element.dataset.terrainState = cell.terrain;
          element.dataset.mapMotif = cell.motif;
          setCellPosition(element, cell.cellX, cell.cellY);
          field.append(element);
        }

        let visibleUnknownBoundaryCount = 0;
        for (const cell of spatial.unknownBoundaryCells) {
          if (!withinMapBounds(cell.cellX, cell.cellY)) continue;
          visibleUnknownBoundaryCount += 1;
          const element = createElement(
            document,
            'div',
            'p1-map-unknown-boundary',
          );
          element.dataset.mapCellState = 'UNKNOWN_BOUNDARY';
          element.dataset.hiddenDetail = 'opaque';
          setCellPosition(element, cell.cellX, cell.cellY);
          field.append(element);
        }

        for (const markerState of spatial.markers) {
          const marker = createElement(
            document,
            'div',
            'p1-map-marker-position',
          );
          marker.dataset.mapMarkerKind = markerState.kind;
          marker.dataset.mapMarkerLabel = markerState.label;
          marker.dataset.mapMarkerIndex =
            String(markerState.atlasIndex);
          marker.dataset.selected = String(markerState.selected);
          marker.dataset.facing = markerState.facing ?? '';
          if (markerState.identitySlot !== null) {
            marker.dataset.presentationIdentitySlot =
              markerState.identitySlot;
          }
          if (markerState.distanceBand !== null) {
            marker.dataset.distanceBand =
              markerState.distanceBand;
          }

          const markerX =
            markerState.worldX / spatial.cellSizeWorldUnits
            - spatial.minCellX;
          const markerY =
            markerState.worldY / spatial.cellSizeWorldUnits
            - spatial.minCellY;
          const rawMarkerLeft = Math.round(markerX * cellScale);
          const rawMarkerTop = Math.round(markerY * cellScale);
          const markerInset = 7;
          const markerLeft = clampPixel(
            rawMarkerLeft,
            markerInset,
            widthCells * cellScale - markerInset,
          );
          const markerTop = clampPixel(
            rawMarkerTop,
            markerInset,
            heightCells * cellScale - markerInset,
          );
          const markerClamped =
            markerLeft !== rawMarkerLeft
            || markerTop !== rawMarkerTop;
          marker.dataset.mapMarkerClamped = String(markerClamped);
          marker.style.left = String(markerLeft) + 'px';
          marker.style.top = String(markerTop) + 'px';

          const icon = assetSprite(
            document,
            'p1-map-marker',
            mapMarkerSprite(markerState.atlasIndex),
          );
          if (icon !== null) {
            marker.append(icon);
          }

          if (
            markerState.kind === 'player'
            && markerState.facing !== null
          ) {
            marker.append(
              createElement(
                document,
                'span',
                'p1-map-facing-peg',
              ),
            );
          }

          field.append(marker);
          if (markerState.selected) {
            const selectionLabel = createElement(
              document,
              'span',
              'p1-map-selection-label',
              markerState.label,
            );
            selectionLabel.dataset.mapSelectionLabel =
              markerState.label;
            selectionLabel.dataset.mapSelectionKind =
              markerState.kind;
            selectionLabel.style.left = String(markerLeft) + 'px';
            selectionLabel.style.top = String(markerTop) + 'px';
            field.append(selectionLabel);
          }
        }

        field.dataset.visibleExploredCellCount =
          String(visibleExploredCellCount);
        field.dataset.visibleUnknownBoundaryCount =
          String(visibleUnknownBoundaryCount);

        const legend = createElement(
          document,
          'div',
          'p1-map-legend',
        );
        const seenLegend = new Set<string>();
        for (const markerState of spatial.markers) {
          const key =
            markerState.kind + ':' + markerState.label;
          if (seenLegend.has(key)) continue;
          seenLegend.add(key);
          const entry = createElement(
            document,
            'span',
            'p1-map-legend-entry',
          );
          const icon = assetSprite(
            document,
            'p1-map-legend-marker',
            mapMarkerSprite(markerState.atlasIndex),
          );
          if (icon !== null) entry.append(icon);
          entry.append(
            createElement(
              document,
              'span',
              'p1-map-legend-label',
              markerState.label,
            ),
          );
          legend.append(entry);
        }

        root.append(
          field,
          legend,
          createElement(
            document,
            'div',
            'p1-map-fog',
            panel.fogLabel,
          ),
        );
        if (
          spatial.selectedDetailLabel !== null
          && spatial.selectedDistanceBand !== null
        ) {
          const detail = createElement(
            document,
            'div',
            'p1-map-detail',
            'DETAIL · '
              + spatial.selectedDetailLabel
              + ' · '
              + spatial.selectedDistanceBand,
          );
          detail.dataset.distanceBand =
            spatial.selectedDistanceBand;
          detail.dataset.selectionMode =
            'read-only-marker-detail';
          root.append(detail);
        }
        if (spatial.selectableTargetCount > 1) {
          root.append(
            createElement(
              document,
              'div',
              'p1-map-cycle-hint',
              'TAB · MARKER DETAIL',
            ),
          );
        }
        return root;
      }

      const mapMarkers = createElement(document, 'div', 'p1-map-markers');
      for (const index of [0, 4, 5, 6]) {
        const icon = assetSprite(
          document,
          'p1-map-marker',
          mapMarkerSprite(index),
        );
        if (icon !== null) {
          mapMarkers.append(icon);
        }
      }
      root.append(
        mapMarkers,
        createElement(document, 'div', 'p1-map-fog', panel.fogLabel),
        createElement(document, 'div', 'p1-map-ruin', panel.ruinLabel),
      );
      if (panel.deathCacheLabel !== null) {
        root.append(createElement(document, 'div', 'p1-map-cache', panel.deathCacheLabel));
      }
      if (panel.sharedDiscoveryLabel !== null) {
        root.append(createElement(document, 'div', 'p1-map-shared', panel.sharedDiscoveryLabel));
      }
      return root;
    }
  }
}

function styles(document: Document): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = [
    '.p1-ui{position:absolute;left:50%;top:50%;width:640px;height:360px;transform-origin:center center;pointer-events:none;font-family:monospace;font-size:8px;line-height:1.15;color:#f4f6ef;text-shadow:1px 1px 0 #10141b;z-index:20;overflow:hidden;}',
    '.p1-production-world-preview{position:absolute;inset:0;overflow:hidden;z-index:0;background:#172033;}',
    '.p1-production-world-tile,.p1-production-world-sprite{position:absolute;display:block;image-rendering:pixelated;}',
    '.p1-survival,.p1-world,.p1-equipment,.p1-interaction,.p1-carry,.p1-toasts,.p1-team,.p1-panel{z-index:2;}',
    '.p1-ui[data-panel-open="true"] .p1-context-hud{display:none!important;}',
    '[data-product-review-help-open="true"] .p1-ui .p1-context-hud{display:none!important;}',
    '.p1-asset-icon,.p1-progression-icon,.p1-map-marker,.p1-panel-skin-corner,.p1-build-preview-pattern{display:inline-block;image-rendering:pixelated;flex:0 0 auto;}',
    '.p1-ui *{box-sizing:border-box;}',
    '.p1-visually-hidden{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important;}',
    '.p1-box,.p1-panel{background:rgba(10,14,22,.90);border:1px solid #d6dccd;box-shadow:0 0 0 1px #111722 inset;}',
    '.p1-survival{position:absolute;left:8px;top:8px;width:156px;min-height:76px;padding:3px;display:grid;grid-template-columns:1fr;gap:1px;}',
    '.p1-meter{min-width:0;display:grid;grid-template-columns:72px 1fr 20px 14px;align-items:center;gap:2px;min-height:12px;}',
    '.p1-meter-label{white-space:nowrap;display:flex;align-items:center;gap:2px;font-weight:700;}',
    '.p1-meter-icon{width:10px!important;height:10px!important;}',
    '.p1-meter-value{text-align:right;font-variant-numeric:tabular-nums;}',
    '.p1-meter-alert{text-align:center;font-weight:700;}',
    '.p1-meter-track{height:4px;background:#263040;border:1px solid #0a0d12;}',
    '.p1-meter-fill{height:100%;background:#e8edf2;}',
    '.p1-meter[data-severity="warning"]{border-right:1px dashed #fff;}',
    '.p1-meter[data-severity="critical"]{outline:1px solid #fff;}',
    '.p1-meter[data-severity="warning"] .p1-meter-track{outline:1px dashed #f1d67d;}',
    '.p1-meter[data-severity="critical"] .p1-meter-track{outline:1px double #fff;}',
    '.p1-world{position:absolute;right:8px;top:8px;width:132px;min-height:38px;padding:4px;}',
    '.p1-world-line{display:flex;justify-content:space-between;gap:4px;}',
    '.p1-equipment{position:absolute;left:8px;bottom:8px;width:164px;min-height:48px;padding:4px;display:grid;gap:2px;}',
    '.p1-equipment-slot,.p1-quick-use{display:flex;align-items:center;gap:3px;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.p1-equipment-slot-label{width:20px;color:#c5ccbd;flex:0 0 auto;font-weight:700;}',
    '.p1-interaction{position:absolute;left:180px;bottom:8px;width:280px;min-height:34px;padding:4px;text-align:center;}',
    '.p1-first-action{position:absolute;left:180px;bottom:48px;width:280px;padding:3px 5px;text-align:center;background:rgba(10,14,22,.86);border:1px dashed #d6dccd;z-index:2;}',
    '.p1-interaction-main{font-size:9px;font-weight:700;}',
    '.p1-interaction[data-state="BLOCKED"],.p1-interaction[data-state="UNAVAILABLE"]{border-style:dashed;}',
    '.p1-progress-track{height:3px;margin-top:2px;background:#273041;}',
    '.p1-progress-fill{height:100%;background:#f4f6ef;}',
    '.p1-carry{position:absolute;right:8px;bottom:8px;width:132px;height:32px;padding:4px;}',
    '.p1-toasts{position:absolute;left:188px;top:8px;width:264px;display:grid;gap:2px;}',
    '.p1-toast{padding:3px 5px;background:rgba(10,14,22,.92);border-left:3px double #f4f6ef;}',
    '.p1-team{position:absolute;right:8px;top:50px;width:132px;display:grid;gap:2px;}',
    '.p1-teammate{display:flex;gap:4px;align-items:center;background:rgba(10,14,22,.84);padding:2px 4px;}',
    '.p1-teammate-marker{width:12px!important;height:12px!important;display:inline-block;image-rendering:pixelated;}',
    '.p1-panel{position:absolute;left:50%;top:50%;width:520px;max-height:300px;transform:translate(-50%,-50%);padding:8px;overflow:hidden;}',
    '.p1-panel[data-panel-kind="craft"]{width:560px;max-height:300px;padding:6px;}',
    '.p1-panel[data-panel-kind="craft"] .p1-panel-title{margin-bottom:3px;}',
    '.p1-panel[data-panel-kind="craft"] .p1-craft-list{gap:1px;}',
    '.p1-panel[data-panel-kind="build"]{left:8px;top:54px;width:204px;max-height:252px;transform:none;padding:6px;}',
    '.p1-panel-skin-corner{position:absolute;left:0;top:0;width:16px!important;height:16px!important;}',
    '.p1-panel-title{font-size:11px;font-weight:700;border-bottom:1px solid #778094;padding:2px 0 4px 14px;margin-bottom:5px;}',
    '.p1-subtitle{margin-top:4px;color:#c5ccbd;}',
    '.p1-item-list,.p1-craft-list{display:grid;gap:2px;}',
    '.p1-item-row,.p1-craft-row{display:grid;gap:4px;padding:3px;border:1px solid #3b465a;}',
    '.p1-item-row{grid-template-columns:24px 2fr 1fr;align-items:center;min-height:30px;}',
    '.p1-panel[data-panel-kind="inventory"] .p1-item-list{grid-template-columns:repeat(4,1fr);gap:4px;}',
    '.p1-panel[data-panel-kind="inventory"] .p1-item-row{grid-template-columns:24px 1fr;grid-template-rows:24px auto;min-height:48px;}',
    '.p1-panel[data-panel-kind="inventory"] .p1-item-state{grid-column:1/3;font-size:7px;}',
    '.p1-item-icon{width:24px!important;height:24px!important;}',
    '.p1-item-condition-track{grid-column:1/-1;height:2px;background:#263040;display:block;align-self:end;}',
    '.p1-item-condition-fill{height:2px;background:#f4f6ef;display:block;}',
    '.p1-item-row[data-selected="true"]{outline:1px solid #fff;background:#253044;}',
    '.p1-item-row[data-available="false"]{opacity:.55;border-style:dashed;background:#1b2029;}',
    '.p1-container-panes{display:grid;grid-template-columns:1fr 1fr;gap:8px;}',
    '.p1-container-pane{border:1px solid #455066;padding:5px;min-height:120px;max-height:190px;overflow-y:auto;}',
    '.p1-craft-row{display:grid;grid-template-columns:1fr;gap:1px;padding:2px 3px;line-height:1.05;}',
    '.p1-craft-heading,.p1-craft-footer{display:flex;justify-content:space-between;gap:6px;align-items:center;min-height:9px;}',
    '.p1-craft-ingredients{display:flex;flex-wrap:wrap;gap:1px 4px;min-height:9px;}',
    '.p1-craft-ingredient{display:inline-flex;align-items:center;gap:2px;border:1px solid #455066;padding:0 2px;}',
    '.p1-craft-ingredient[data-sufficient="false"]{border-style:dashed;font-weight:700;}',
    '.p1-craft-ingredient-icon{display:inline-block!important;width:24px!important;height:24px!important;min-width:24px;min-height:24px;flex:0 0 24px;}',
    '.p1-craft-output{display:inline-flex;gap:3px;align-items:center;}',
    '.p1-craft-output-token{display:inline-flex;gap:2px;align-items:center;}',
    '.p1-craft-output-icon{width:12px!important;height:12px!important;min-width:12px;min-height:12px;}',
    '.p1-craft-output-token{white-space:nowrap;font-size:7px;}',
    '.p1-craft-station{border:1px solid #778094;padding:0 3px;}',
    '.p1-craft-row[data-state="BLOCKED"]{border-style:dashed;}',
    '.p1-feedback{margin-top:5px;padding:4px;border:1px dashed #fff;}',
    '.p1-build-catalog{display:grid;gap:2px;}',
    '.p1-build-catalog-entry{display:grid;grid-template-columns:22px 1fr;gap:4px;align-items:center;min-height:26px;padding:2px;border:1px solid #455066;}',
    '.p1-build-catalog-entry[data-selected="true"]{outline:1px solid #fff;background:#253044;}',
    '.p1-build-catalog-entry[data-build-cap-state="CAP REACHED"]{border-style:double;}',
    '.p1-build-catalog-icon{display:inline-block;image-rendering:pixelated;align-self:center;justify-self:center;}',
    '.p1-build-catalog-name{font-weight:700;}',
    '.p1-build-catalog-kit{font-size:7px;color:#c5ccbd;}',
    '.p1-build-preview{width:72px;height:36px;margin:3px auto;border:2px dashed #fff;display:grid;place-items:center;position:relative;background:rgba(10,14,22,.62);}',
    '.p1-build-preview-pattern{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);}',
    '.p1-build-preview-label{position:relative;z-index:1;padding:2px 4px;background:rgba(10,14,22,.78);}',
    '.p1-build-preview[data-placement-state="VALID"]{border-style:solid;}',
    '.p1-build-preview[data-placement-state="CONNECTOR"]{outline:2px dotted #fff;}',
    '.p1-panel-detail,.p1-progress-list{margin-top:5px;padding:4px;background:#161e2a;}',
    '.p1-progress-icons,.p1-map-markers{display:flex;align-items:center;gap:4px;margin:3px 0;}',
    '.p1-progression-rows{display:grid;gap:2px;margin-top:2px;}',
    '.p1-progression-row{display:flex;align-items:center;gap:4px;padding:2px 3px;border:1px solid #455066;}',
    '.p1-progression-row[data-progression-state="LOCKED"],.p1-progression-row[data-progression-state="INCOMPLETE"]{border-style:dashed;opacity:.72;}',
    '.p1-progression-icon{width:16px!important;height:16px!important;}',
    '.p1-panel-capacity{margin-top:3px;padding:3px 4px;border:1px solid #778094;background:#161e2a;font-variant-numeric:tabular-nums;}',
    '.p1-container-capacity-context{display:grid;grid-template-columns:1fr 1fr;gap:4px;}',
    '.p1-equipment-slot{flex-wrap:wrap;}',
    '.p1-equipment-condition-track{height:2px;background:#263040;display:block;flex:1 0 56px;min-width:40px;}',
    '.p1-equipment-condition-fill{height:2px;background:#f4f6ef;display:block;}',
    '.p1-equipment-slot[data-equipment-state="BROKEN"]{outline:1px dashed #fff;}',
    '.p1-equipment-broken{font-weight:700;}',
    '.p1-panel[data-panel-kind="map"]{width:568px;max-height:318px;padding:6px;}',
    '.p1-panel[data-panel-kind="map"] .p1-panel-title{margin-bottom:3px;}',
    '.p1-spatial-map{position:relative;margin:0 auto 4px;overflow:visible;background:#090d14;border:1px solid #778094;image-rendering:pixelated;}',
    '.p1-map-cell,.p1-map-unknown-boundary{position:absolute;}',
    '.p1-map-cell-ground{background:#53634d;}',
    '.p1-map-cell-ground[data-map-motif="flora"]{box-shadow:inset 0 0 0 1px #7b8769;}',
    '.p1-map-cell-water{background:#354b62;box-shadow:inset 0 0 0 1px #91a7aa;}',
    '.p1-map-unknown-boundary{background:#161c26;box-shadow:inset 0 0 0 1px #2d3544;}',
    '.p1-map-marker-position{position:absolute;width:12px;height:12px;transform:translate(-6px,-6px);z-index:4;}',
    '.p1-map-marker-position[data-map-marker-kind="player"]{z-index:7;outline:2px double #fff;}',
    '.p1-map-marker-position[data-map-marker-kind="base"]{z-index:6;outline:1px solid #fff;}',
    '.p1-map-marker-position[data-selected="true"]{box-shadow:0 0 0 2px #0a0e16,0 0 0 3px #fff;}',
    '.p1-map-marker-position[data-map-marker-clamped="true"]{outline:1px dashed #c5ccbd;}',
    '.p1-map-selection-label{position:absolute;z-index:9;transform:translate(8px,-13px);padding:1px 3px;background:#0a0e16;border:1px solid #fff;font-weight:700;white-space:nowrap;text-shadow:none;}',
    '.p1-map-facing-peg{position:absolute;width:2px;height:2px;background:#fff;left:5px;top:-3px;}',
    '.p1-map-marker-position[data-facing="NE"] .p1-map-facing-peg{left:10px;top:-1px;}',
    '.p1-map-marker-position[data-facing="E"] .p1-map-facing-peg{left:13px;top:5px;}',
    '.p1-map-marker-position[data-facing="SE"] .p1-map-facing-peg{left:10px;top:10px;}',
    '.p1-map-marker-position[data-facing="S"] .p1-map-facing-peg{left:5px;top:13px;}',
    '.p1-map-marker-position[data-facing="SW"] .p1-map-facing-peg{left:0;top:10px;}',
    '.p1-map-marker-position[data-facing="W"] .p1-map-facing-peg{left:-3px;top:5px;}',
    '.p1-map-marker-position[data-facing="NW"] .p1-map-facing-peg{left:0;top:-1px;}',
    '.p1-map-legend{display:flex;flex-wrap:wrap;gap:2px 7px;align-items:center;margin:2px 0;}',
    '.p1-map-legend-entry{display:inline-flex;align-items:center;gap:2px;white-space:nowrap;}',
    '.p1-map-legend-marker{width:12px!important;height:12px!important;}',
    '.p1-map-detail{margin-top:3px;padding:3px 5px;border:1px solid #d6dccd;background:#161e2a;font-weight:700;}',
    '.p1-map-detail[data-distance-band="MID"]{border-style:dashed;}',
    '.p1-map-detail[data-distance-band="FAR"]{border-style:double;}',
    '.p1-map-cycle-hint{margin-top:2px;color:#c5ccbd;}',
    '.p1-hidden{display:none!important;}',
  ].join('');
  return style;
}

export interface Phase1HudOverlay {
  update(state: Phase1PresentationState): void;
  destroy(): void;
}

class Phase1HudOverlayImpl implements Phase1HudOverlay {
  private readonly document: Document;
  private readonly layer: HTMLDivElement;
  private readonly canvas: HTMLCanvasElement;
  private currentState: Phase1PresentationState;

  public constructor(
    private readonly root: HTMLElement,
    canvas: HTMLCanvasElement,
    initialState: Phase1PresentationState,
  ) {
    validatePhase1PresentationState(initialState);
    this.document = root.ownerDocument;
    this.canvas = canvas;
    this.currentState = initialState;
    this.layer = createElement(this.document, 'div', 'p1-ui');
    this.layer.id = 'proz0-phase1-ui';
    this.layer.dataset.presentationAuthority = 'derived-read-only';
    this.layer.dataset.productionAssetFoundation = 'p1-75-78';
    this.layer.append(styles(this.document));
    this.root.append(this.layer);
    this.root.ownerDocument.defaultView?.addEventListener('resize', this.applyScale);
    this.applyScale();
    this.render();
  }

  public update(state: Phase1PresentationState): void {
    validatePhase1PresentationState(state);
    this.currentState = state;
    this.render();
  }

  public destroy(): void {
    this.root.ownerDocument.defaultView?.removeEventListener('resize', this.applyScale);
    delete this.root.dataset.productReviewPanelOpen;
    this.layer.remove();
  }

  private readonly applyScale = (): void => {
    const scale = Number(this.canvas.dataset.displayScale ?? '1');
    this.layer.style.transform =
      'translate(-50%, -50%) scale(' + String(Number.isFinite(scale) ? scale : 1) + ')';
    this.layer.dataset.displayScale = String(Number.isFinite(scale) ? scale : 1);
  };

  private render(): void {
    const state = this.currentState;
    const panelOpen = state.panel !== null;
    this.layer.dataset.panelOpen = String(panelOpen);
    this.root.dataset.productReviewPanelOpen = String(panelOpen);
    const style = this.layer.querySelector('style');
    this.layer.replaceChildren();
    if (style !== null) {
      this.layer.append(style);
    }

    if (this.root.dataset.phase1QaMode !== 'none') {
      this.layer.append(createProductionWorldPreview(this.document));
    }

    const survival = createElement(this.document, 'section', 'p1-survival p1-box p1-context-hud');
    survival.dataset.region = 'survival';
    survival.append(
      meter(this.document, state.health),
      meter(this.document, state.water),
      meter(this.document, state.food),
      meter(this.document, state.stamina),
      meter(this.document, state.temperature),
    );

    const world = createElement(this.document, 'section', 'p1-world p1-box p1-context-hud');
    world.dataset.region = 'world';
    world.dataset.weatherState = state.world.weatherState;
    world.dataset.dayPeriod = state.world.dayPeriod;
    const worldLine = createElement(this.document, 'div', 'p1-world-line');
    worldLine.append(
      createElement(this.document, 'span', '', state.world.timeLabel),
      createElement(this.document, 'span', '', state.world.dayPeriod),
    );
    const weatherLine = createElement(this.document, 'div', 'p1-world-line');
    const weatherIdentity = createElement(this.document, 'span', 'p1-world-weather');
    const weatherIcon = assetSprite(
      this.document,
      'p1-asset-icon',
      hudStatusSprite('WEATHER'),
    );
    if (weatherIcon !== null) {
      weatherIdentity.append(weatherIcon);
    }
    weatherIdentity.append(state.world.weatherLabel);
    weatherLine.append(
      weatherIdentity,
      createElement(this.document, 'span', '', String(state.world.teammateCount) + ' TEAM'),
    );
    world.append(worldLine, weatherLine);

    const equipment = createElement(this.document, 'section', 'p1-equipment p1-box p1-context-hud');
    equipment.dataset.region = 'equipment';

    const equipmentSlots = state.equipmentSlots;
    if (equipmentSlots === undefined) {
      if (state.equipment === null) {
        equipment.textContent = 'NO ACTIVE EQUIPMENT';
      } else {
        const equipmentIcon = assetSprite(
          this.document,
          'p1-asset-icon p1-equipment-icon',
          itemIconSprite(state.equipment.name),
        );
        if (equipmentIcon !== null) {
          equipment.append(equipmentIcon);
        }
        equipment.append(
          state.equipment.name
          + (state.equipment.condition === null
            ? ' · ' + state.equipment.stateLabel
            : ' · ' + String(state.equipment.condition) + '/' + String(state.equipment.conditionMax)
              + ' · ' + state.equipment.stateLabel),
        );
      }
    } else {
      const appendSlot = (
        inputLabel: string,
        emptyLabel: string,
        slot: typeof equipmentSlots.weapon,
        key: string,
      ): void => {
        const row = createElement(
          this.document,
          'div',
          'p1-equipment-slot',
        );
        row.dataset.equipmentSlot = key;
        row.append(createElement(
          this.document,
          'span',
          'p1-equipment-slot-label',
          '[' + inputLabel + ']',
        ));
        if (slot === null) {
          row.append(emptyLabel + ' · —');
        } else {
          const icon = assetSprite(
            this.document,
            'p1-asset-icon p1-equipment-icon',
            itemIconSprite(slot.name),
          );
          if (icon !== null) row.append(icon);
          const conditionLabel =
            slot.condition === null
            || slot.conditionMax === null
            || slot.conditionMax <= 0
              ? ''
              : ' C' + String(slot.condition);
          row.title = slot.name
            + (slot.condition === null || slot.conditionMax === null
              ? ''
              : ' · condition '
                + String(slot.condition)
                + '/'
                + String(slot.conditionMax));
          row.dataset.equipmentState = slot.stateLabel;
          row.append(slot.name + conditionLabel);
          if (
            slot.condition !== null
            && slot.conditionMax !== null
            && slot.conditionMax > 0
          ) {
            const conditionTrack = createElement(
              this.document,
              'span',
              'p1-equipment-condition-track',
            );
            conditionTrack.dataset.conditionCurrent = String(slot.condition);
            conditionTrack.dataset.conditionMax = String(slot.conditionMax);
            const conditionFill = createElement(
              this.document,
              'span',
              'p1-equipment-condition-fill',
            );
            conditionFill.style.width = String(percent(
              slot.condition,
              slot.conditionMax,
            )) + '%';
            conditionTrack.append(conditionFill);
            row.append(conditionTrack);
          }
          if (slot.stateLabel === 'BROKEN') {
            row.append(createElement(
              this.document,
              'span',
              'p1-equipment-broken',
              'BROKEN',
            ));
          }
        }
        equipment.append(row);
      };
      appendSlot('Q', 'WEAPON', equipmentSlots.weapon, 'weapon');
      appendSlot('T', 'WRAP', equipmentSlots.protection, 'protection');

      const quickUse = createElement(
        this.document,
        'div',
        'p1-quick-use',
      );
      quickUse.dataset.quickUseState = equipmentSlots.quickUse.state;
      quickUse.append(
        '[V] CONSUME · '
        + (equipmentSlots.quickUse.target ?? '—'),
      );
      equipment.append(quickUse);
    }

    const carry = createElement(this.document, 'section', 'p1-carry p1-box p1-context-hud');
    carry.dataset.region = 'carry';
    carry.dataset.carryState = state.carry.stateLabel;
    const weightIcon = assetSprite(
      this.document,
      'p1-asset-icon',
      hudStatusSprite('WEIGHT'),
    );
    const volumeIcon = assetSprite(
      this.document,
      'p1-asset-icon',
      hudStatusSprite('VOLUME'),
    );
    if (weightIcon !== null) {
      carry.append(weightIcon);
    }
    carry.append(
      ' ' + String(state.carry.weightCurrent) + '/' + String(state.carry.weightMax) + ' kg ',
    );
    if (volumeIcon !== null) {
      carry.append(volumeIcon);
    }
    carry.append(
      ' ' + String(state.carry.volumeCurrent) + '/' + String(state.carry.volumeMax)
      + ' · ' + state.carry.stateLabel,
    );

    const toasts = createElement(this.document, 'section', 'p1-toasts p1-context-hud');
    for (const toast of state.toasts) {
      const entry = createElement(this.document, 'div', 'p1-toast');
      const toastIcon = assetSprite(
        this.document,
        'p1-asset-icon',
        hudStatusSprite(
          toast.kind === 'progression'
            ? 'XP'
            : toast.kind === 'discovery'
              ? 'DISCOVERY'
              : toast.kind === 'warning'
                ? 'COLD'
                : 'LEVEL',
        ),
      );
      if (toastIcon !== null) {
        entry.append(toastIcon);
      }
      entry.append(
        toast.title + (toast.detail === null ? '' : ' · ' + toast.detail),
      );
      entry.dataset.toastKind = toast.kind;
      entry.dataset.toastId = toast.id;
      toasts.append(entry);
    }

    const team = createElement(this.document, 'section', 'p1-team p1-context-hud');
    for (const entry of state.teammates) {
      team.append(teammate(this.document, entry));
    }

    this.layer.append(survival, world, equipment, carry, toasts, team);

    if (state.firstActionCue !== undefined && state.firstActionCue !== null) {
      const firstAction = createElement(
        this.document,
        'div',
        'p1-first-action p1-context-hud',
        state.firstActionCue,
      );
      firstAction.dataset.firstActionCue = 'visible';
      this.layer.append(firstAction);
    }

    if (state.interaction !== null) {
      const interaction = createElement(this.document, 'section', 'p1-interaction p1-box p1-context-hud');
      interaction.dataset.region = 'interaction';
      interaction.dataset.state = state.interaction.state;
      const interactionMain = createElement(
        this.document,
        'div',
        'p1-interaction-main',
      );
      const interactionIcon = assetSprite(
        this.document,
        'p1-asset-icon',
        interactionSprite(state.interaction.verb),
      );
      if (interactionIcon !== null) {
        interactionMain.append(interactionIcon);
      }
      interactionMain.append(
        '[' + state.interaction.inputLabel + '] '
        + state.interaction.verb + ' · ' + state.interaction.target,
      );
      interaction.append(interactionMain);

      if (state.interaction.reason !== null) {
        interaction.append(createElement(
          this.document,
          'div',
          'p1-interaction-reason',
          state.interaction.reason,
        ));
      }

      if (state.interaction.progress !== null) {
        const track = createElement(this.document, 'div', 'p1-progress-track');
        const fill = createElement(this.document, 'div', 'p1-progress-fill');
        fill.style.width = String(Math.round(state.interaction.progress * 100)) + '%';
        track.append(fill);
        interaction.append(track);
      }

      this.layer.append(interaction);
    }

    if (state.panel !== null) {
      this.layer.append(renderPanel(this.document, state.panel));
    }
  }
}

export function createPhase1HudOverlay(
  root: HTMLElement,
  canvas: HTMLCanvasElement,
  initialState: Phase1PresentationState,
): Phase1HudOverlay {
  return new Phase1HudOverlayImpl(root, canvas, initialState);
}
