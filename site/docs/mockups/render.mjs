import { chromium } from '../../node_modules/playwright-core/index.mjs';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
const b = await chromium.launch();
for (const f of readdirSync('.').filter(f=>f.endsWith('.html'))) {
  for (const [w,h] of [[390,844],[1440,900]]) {
    const p = await b.newPage({ viewport:{width:w,height:h} });
    await p.goto('file://'+resolve(f)); await p.waitForTimeout(200);
    await p.screenshot({ path:`${f.replace('.html','')}-${w}.png`, fullPage:true });
    await p.close();
  }
}
await b.close();
