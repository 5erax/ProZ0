import { defineConfig } from 'vite';
import { assertDictionaryParity } from './src/client/localization/Locale';
import { uiMessages } from './src/client/localization/UiMessages';
import { coreMessages } from './src/client/localization/CoreMessages';
import { lobbyMessages } from './src/client/localization/LobbyMessages';
import { resourceMessages } from './src/client/localization/ResourceFacts';
import { statusMessages } from './src/client/localization/StatusMessages';
for (const dictionary of [uiMessages,coreMessages,lobbyMessages,resourceMessages,statusMessages]) assertDictionaryParity(dictionary);

const proxy=process.env.PROZ0_LOCAL_PILOT?{'/api/pilot':{target:process.env.PROZ0_LOCAL_PILOT,ws:true}}:undefined;
export default defineConfig({
  server: { host: '127.0.0.1',...(proxy?{proxy}:{}) },
  preview: { host: '127.0.0.1',...(proxy?{proxy}:{}) },
  build: { target: 'es2022' },
});
