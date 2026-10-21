import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/browser',timeout:45000,workers:1,use:{baseURL:process.env.PLAYWRIGHT_BASE_URL||'http://localhost:3000',headless:true,launchOptions:{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']},trace:'retain-on-failure'},reporter:[['list'],['html',{open:'never'}]]});
