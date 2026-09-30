import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
  reporter: process.env.CI ? 'github' : 'list',
  projects: [
    { name: 'functional', grepInvert: /^full scene frame pacing:/ },
    // Timing a game while another worker launches/plays a second game measures
    // combined runner contention. Run the unchanged frame budget on one scene.
    { name: 'frame-pacing', grep: /^full scene frame pacing:/, dependencies: ['functional'] },
  ],
});
