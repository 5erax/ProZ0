import {expect,test} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {Phase1HostedAuthorityComposition} from '../../src/integration';
import {HOSTED_PROTOCOL_VERSION} from '../../src/protocol';

test('full scene frame pacing: eight hosted authority players preserve the fixed-step tick budget',async()=>{
  const colony=await Phase1HostedAuthorityComposition.create({worldId:'world:p2-tick-budget',worldSeed:'p1-world-golden',maxPlayers:8,colonyDepthEnabled:true,interactionRangeWorldUnits:1.25,spawnClearanceRadiusWorldUnits:1.25,requiredAccessRadiusWorldUnits:1.25,persistence:{save:async(authorityTick:number)=>({authorityTick,durableSaveRevision:1})}});
  try {
    for(let i=0;i<8;i++){
      const transport='perf:'+String(i);
      const messages=colony.host.receiveText(transport,JSON.stringify({protocolVersion:HOSTED_PROTOCOL_VERSION,messageType:'CLIENT_HELLO',clientMessageSeq:0,payload:{protocolVersion:HOSTED_PROTOCOL_VERSION,contentCompatibility:colony.bundle.getContentCompatibility(),worldCompatibility:colony.bundle.getWorldCompatibility()}}));
      const message=messages.find(entry=>entry.envelope.messageType==='SESSION_ACCEPTED')!;
      const accepted=message.envelope.payload as unknown as {connectionId:string;snapshotId:string;playerId:string};
      colony.host.receiveText(transport,JSON.stringify({protocolVersion:HOSTED_PROTOCOL_VERSION,messageType:'BASELINE_APPLIED',clientMessageSeq:1,sessionId:colony.host.getSessionId(),connectionId:accepted.connectionId,payload:{snapshotId:accepted.snapshotId}}));
      // Spread active players through eight different chunk neighborhoods; this is a labeled load fixture.
      colony.bundle.getRuntime(accepted.playerId).relocatePlayer({x:100+i*40,y:i%2===0?-120:120});
    }
    expect(colony.host.diagnostics().session.readyPlayers).toBe(8);
    for(let i=0;i<30;i++)await colony.step();
    const elapsed:number[]=[];
    for(let i=0;i<500;i++){
      const start=performance.now();await colony.step();elapsed.push(performance.now()-start);
    }
    elapsed.sort((a,b)=>a-b);
    const p95Ms=elapsed[Math.floor(elapsed.length*.95)]!;
    const report={sourceHeadSha:process.env.P0_TEST_HEAD_SHA??'local-working-tree',fixture:'eight admitted authority clients in separate streamed neighborhoods; real replication and survival steps',samples:elapsed.length,p95Ms,maximumMs:elapsed.at(-1),budgetMs:1000/60,authorityTick:colony.bundle.authorityTick,activeChunks:colony.bundle.world.getActiveChunkViews().length};
    const directory=resolve('test-results/phase2-frame-pacing');mkdirSync(directory,{recursive:true});
    writeFileSync(resolve(directory,'hosted-ticks.json'),JSON.stringify(report,null,2));
    expect(p95Ms).toBeLessThanOrEqual(1000/60);
    expect(colony.bundle.authorityTick).toBe(530);
  } finally {await colony.destroy();}
});
