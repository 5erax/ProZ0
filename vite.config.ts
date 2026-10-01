import { defineConfig } from 'vite';

const proxy=process.env.PROZ0_LOCAL_PILOT?{'/api/pilot':{target:process.env.PROZ0_LOCAL_PILOT,ws:true}}:undefined;
export default defineConfig({
  server: { host: '127.0.0.1',...(proxy?{proxy}:{}) },
  preview: { host: '127.0.0.1',...(proxy?{proxy}:{}) },
  build: { target: 'es2022' },
});
