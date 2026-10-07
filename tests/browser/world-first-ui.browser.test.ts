import '../../src/client/presentation/UiTokens.css';
import {expect,it} from 'vitest';
import {page,userEvent} from 'vitest/browser';
import {createPhase1ProductReviewRuntime} from '../../src/client/runtime/Phase1ProductReviewRuntime';
import {createColonySettings} from '../../src/client/runtime/ColonySettings';
import {setLocale} from '../../src/client/localization/Locale';
import {vi} from 'vitest';
import {Phase1AuthorityBundle} from '../../src/integration/Phase1AuthorityBundle';
import {createColonyDepthOverlay} from '../../src/client/presentation/ColonyDepthOverlay';
import {EXPLORATION_TEMPLATES} from '../../src/content/phase2/ExplorationContent';

it('keeps the HUD corners clear, unifies the world cycle and exposes real mouse navigation in EN/VI',async()=>{
  const root=document.createElement('section');root.id='app';root.style.cssText='position:relative;width:100%;height:100%';document.body.append(root);
  const runtime=await createPhase1ProductReviewRuntime(root,{worldId:'world:world-first-ui',worldSeed:'p1-world-golden',playerIds:['solo'],localPlayerId:'solo',singlePlayerExpeditionEnabled:true,colonyDepthEnabled:true,interactionRangeWorldUnits:1.25,spawnClearanceRadiusWorldUnits:1.25,requiredAccessRadiusWorldUnits:1.25});
  const settings=createColonySettings(root);
  try {
    for(const [width,height] of [[1280,720],[1600,900],[1920,1080]]){
      await page.viewport(width!,height!);window.dispatchEvent(new Event('resize'));
      for(const language of ['en','vi'] as const){
        setLocale(language);await userEvent.keyboard('{Escape}');
        const hud=Array.from(root.querySelectorAll<HTMLElement>('.p1-survival,.p1-world,.p1-equipment,.p1-interaction,.p1-action-dock')).filter(e=>e.getBoundingClientRect().height>0);
        for(const [i,a] of hud.entries()){
          const rect=a.getBoundingClientRect();expect(rect.left).toBeGreaterThanOrEqual(0);expect(rect.right).toBeLessThanOrEqual(width!);expect(rect.bottom).toBeLessThanOrEqual(height!);
          for(const b of hud.slice(i+1)){const other=b.getBoundingClientRect();expect(rect.right<=other.left||rect.left>=other.right||rect.bottom<=other.top||rect.top>=other.bottom).toBe(true);}
        }
        expect(root.querySelector('.p1-world .p1-world-cycle')!.textContent).toContain(language==='vi'?'Năm':'Year');
        expect(root.querySelector('.lw-season')!.textContent).toContain(language==='vi'?'Năm':'Year');
        const build=root.querySelector<HTMLButtonElement>('[data-review-action=open-build]')!;
        build.click();expect(build.getAttribute('aria-pressed')).toBe('true');
        root.querySelector<HTMLButtonElement>('.p1-panel-close')!.click();expect(root.querySelector('.p1-panel')).toBeNull();
        root.querySelector<HTMLButtonElement>('[data-review-action=open-map]')!.click();
        const marker=root.querySelector<HTMLButtonElement>('[data-review-action=map-select-marker]')!;expect(marker).not.toBeNull();marker.click();
        expect(root.querySelector('.p1-map-detail')!.textContent).toContain(language==='vi'?'Căn cứ':'BASE');
        await userEvent.keyboard('{Escape}');
        root.querySelector<HTMLButtonElement>('[data-review-action=open-farm]')!.click();expect(root.dataset.livingPanelOpen).toBe('true');
        await userEvent.keyboard('{Escape}');
      }
    }
    const compact=root.querySelector<HTMLButtonElement>('[data-hud-compact]')!;
    compact.click();expect(root.dataset.hudDensity).toBe('expanded');expect(compact.getAttribute('aria-pressed')).toBe('false');
    compact.click();expect(root.dataset.hudDensity).toBe('compact');expect(compact.getAttribute('aria-pressed')).toBe('true');
  }finally{settings.destroy();runtime.destroy();root.remove();setLocale('en');}
},30_000);

it('retains inspected journal sites while chunks are unavailable and refreshes new known sites without changing authority state',async()=>{
  const bundle=await Phase1AuthorityBundle.create({worldId:'world:journal-chunk-readiness',worldSeed:'p1-world-golden',playerIds:['solo'],singlePlayerExpeditionEnabled:true,colonyDepthEnabled:true,interactionRangeWorldUnits:4,spawnClearanceRadiusWorldUnits:0,requiredAccessRadiusWorldUnits:0});await bundle.stepSolo();
  const sites=bundle.colonyDepth.sites(),observed=sites.find(site=>site.template==='laboratory')!,known=sites.find(site=>site.id!==observed.id)!;
  await bundle.world.activatePosition(known.position);await bundle.worldStore.revealResolvedPlayerPosition(known.position);
  const state=bundle.colonyDepth.read(),read=vi.spyOn(bundle.colonyDepth,'read').mockReturnValue({...state,inspectedSites:[observed.id]}),query=vi.spyOn(bundle.worldStore,'query').mockReturnValue(undefined);
  const root=document.createElement('section');document.body.append(root);const overlay=createColonyDepthOverlay(root,bundle,'solo');
  try {
    root.querySelector<HTMLButtonElement>('[data-colony-panel=journal]')!.click();
    expect(root.querySelector('[data-discovered-landmark="'+observed.id+'"]')?.textContent).toContain(observed.name);
    expect(root.querySelector('[data-discovered-landmark="'+known.id+'"]')).toBeNull();
    query.mockRestore();overlay.render();
    expect(root.querySelector('[data-discovered-landmark="'+known.id+'"]')).not.toBeNull();
    expect(root.querySelector('[data-discovered-landmark="'+observed.id+'"]')).not.toBeNull();
    expect(bundle.colonyDepth.read().revision).toBe(state.revision);
  }finally {overlay.destroy();root.remove();query.mockRestore();read.mockRestore();await bundle.destroy();}
},30_000);


it('withholds restored relay destination until laboratory discovery in either order',async()=>{
  for(const order of ['relay-first','lab-first'] as const){
    const bundle=await Phase1AuthorityBundle.create({
      worldId:'world:relay-knowledge-'+order,
      worldSeed:'p1-world-golden',
      playerIds:['solo'],
      singlePlayerExpeditionEnabled:true,
      colonyDepthEnabled:true,
      worldGenerationVersion:5,
      interactionRangeWorldUnits:4,
      spawnClearanceRadiusWorldUnits:0,
      requiredAccessRadiusWorldUnits:0,
    });
    const root=document.createElement('section');document.body.append(root);
    const command=(action:'inspect-site'|'restore-site',targetId:string)=>bundle.colonyDepth.execute({
      operationId:'browser:'+order+':'+action+':'+targetId+':'+bundle.colonyDepth.read().revision,
      playerId:'solo',
      expectedRevision:bundle.colonyDepth.read().revision,
      expectedInventoryRevision:bundle.items.getContainerView('inventory:solo').revision,
      action,
      targetId,
    });
    const discover=async(site:(ReturnType<typeof bundle.colonyDepth.sites>)[number])=>{
      bundle.getRuntime('solo').relocatePlayer(site.position);
      await bundle.stepSolo();
      expect(bundle.world.isExploredPosition(site.position)).toBe(true);
      expect(command('inspect-site',site.id).status).toBe('committed');
    };
    const sites=bundle.colonyDepth.sites();
    const relay=sites.find(site=>site.template==='relay')!;
    const lab=sites.find(site=>site.template==='laboratory')!;
    const relayTemplate=EXPLORATION_TEMPLATES.find(template=>template.id==='relay')!;
    let overlay:ReturnType<typeof createColonyDepthOverlay>|null=null;
    try{
      await bundle.stepSolo();
      if(order==='lab-first')await discover(lab);
      await discover(relay);
      expect(bundle.items.commitColonyExchange({
        operationId:'browser:'+order+':relay-costs',
        playerId:'solo',
        expectedInventoryRevision:bundle.items.getContainerView('inventory:solo').revision,
        inputs:[],
        outputs:relayTemplate.costs.map(([itemDefinitionId,quantity])=>({itemDefinitionId,quantity})),
      }).status).toBe('committed');
      expect(command('restore-site',relay.id).status).toBe('committed');
      expect(bundle.colonyDepth.siteStage(relay.id)).toBe('restored');

      const revisionBeforeOverlay=bundle.colonyDepth.read().revision;
      const ledgerBefore=JSON.stringify(bundle.items.exportLedgerSnapshot());
      overlay=createColonyDepthOverlay(root,bundle,'solo');
      root.querySelector<HTMLButtonElement>('[data-colony-panel=journal]')!.click();
      expect(bundle.colonyDepth.read().revision).toBe(revisionBeforeOverlay);
      expect(JSON.stringify(bundle.items.exportLedgerSnapshot())).toBe(ledgerBefore);

      const relayRow=root.querySelector<HTMLElement>('[data-discovered-landmark="'+relay.id+'"]')!;
      let signal=relayRow.querySelector<HTMLElement>('[data-relay-signal]')!;
      if(order==='relay-first'){
        expect(signal.dataset.relayDisclosure).toBe('withheld');
        expect(signal.textContent).not.toContain(lab.name);
        expect(signal.textContent).not.toContain(String(lab.position.x)+', '+String(lab.position.y));
        expect(signal.textContent).not.toMatch(/\b\d+ m\b/);
        await discover(lab);
        overlay.render();
        signal=root.querySelector<HTMLElement>('[data-discovered-landmark="'+relay.id+'"] [data-relay-signal]')!;
      }
      expect(signal.dataset.relayDisclosure).toBe('observed');
      expect(signal.textContent).toContain(lab.name);
      expect(signal.textContent).toContain(String(lab.position.x)+', '+String(lab.position.y));
    }finally{
      overlay?.destroy();root.remove();setLocale('en');await bundle.destroy();
    }
  }
},30_000);

it('keeps journal comparisons observed-only unless inspected sites share supported evidence in EN and VI',async()=>{
  const bundle=await Phase1AuthorityBundle.create({
    worldId:'world:journal-comparison-boundary',
    worldSeed:'p1-world-golden',
    playerIds:['solo'],
    singlePlayerExpeditionEnabled:true,
    colonyDepthEnabled:true,
    worldGenerationVersion:5,
    interactionRangeWorldUnits:4,
    spawnClearanceRadiusWorldUnits:0,
    requiredAccessRadiusWorldUnits:0,
  });
  const root=document.createElement('section');document.body.append(root);
  const command=(targetId:string)=>bundle.colonyDepth.execute({
    operationId:'browser:journal:inspect:'+targetId+':'+bundle.colonyDepth.read().revision,
    playerId:'solo',
    expectedRevision:bundle.colonyDepth.read().revision,
    expectedInventoryRevision:bundle.items.getContainerView('inventory:solo').revision,
    action:'inspect-site',
    targetId,
  });
  const inspect=async(site:(ReturnType<typeof bundle.colonyDepth.sites>)[number])=>{
    bundle.getRuntime('solo').relocatePlayer(site.position);
    await bundle.stepSolo();
    expect(bundle.world.isExploredPosition(site.position)).toBe(true);
    expect(command(site.id).status).toBe('committed');
  };
  const sites=bundle.colonyDepth.sites();
  const relay=sites.find(site=>site.template==='relay')!;
  const array=sites.find(site=>site.template==='array')!;
  const lab=sites.find(site=>site.template==='laboratory')!;
  const mine=sites.find(site=>site.template==='mine')!;
  let overlay:ReturnType<typeof createColonyDepthOverlay>|null=null;
  try{
    await bundle.stepSolo();
    await inspect(array);
    await inspect(relay);
    overlay=createColonyDepthOverlay(root,bundle,'solo');
    root.querySelector<HTMLButtonElement>('[data-colony-panel=journal]')!.click();

    for(const language of ['en','vi'] as const){
      setLocale(language);overlay.render();
      const neutral=root.querySelector<HTMLElement>('[data-observed-comparison="neutral"]')!;
      expect(neutral).not.toBeNull();
      expect(neutral.dataset.comparisonCertainty).toBe('observed-only');
      expect(neutral.dataset.comparisonFeature).toBe('none');
      expect(neutral.textContent).toContain(
        language==='en'
          ? 'Similarities alone do not establish their purpose.'
          : 'Điểm tương đồng chưa đủ xác định mục đích của chúng.',
      );
      expect(neutral.textContent).not.toContain(
        language==='en'?'supply network':'mạng lưới tiếp tế',
      );
    }

    // Reverse the implementation-order expectation: mine is inspected before lab.
    await inspect(mine);
    await inspect(lab);
    overlay.render();
    for(const language of ['en','vi'] as const){
      setLocale(language);overlay.render();
      const bounded=root.querySelector<HTMLElement>('[data-observed-comparison="bounded"]')!;
      expect(bounded).not.toBeNull();
      expect(bounded.dataset.comparisonCertainty).toBe('hypothesis');
      expect(bounded.dataset.comparisonFeature).toBe('repairable-facility');
      expect(bounded.textContent).toContain(lab.name);
      expect(bounded.textContent).toContain(mine.name);
      expect(bounded.textContent).toContain(
        language==='en'
          ? 'may reflect reuse or shared constraints'
          : 'có thể phản ánh việc tái sử dụng hoặc các ràng buộc giống nhau',
      );
      expect(bounded.textContent).toContain(
        language==='en'?'remain unresolved':'vẫn chưa rõ',
      );
      expect(bounded.textContent).not.toContain(
        language==='en'?'supply network':'mạng lưới tiếp tế',
      );
    }
  }finally{
    overlay?.destroy();root.remove();setLocale('en');await bundle.destroy();
  }
},30_000);
