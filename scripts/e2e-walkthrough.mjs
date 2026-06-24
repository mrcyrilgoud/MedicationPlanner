import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

const BASE = 'http://127.0.0.1:4173';
const ARTIFACTS = '/opt/cursor/artifacts/walkthrough';
const results = [];

const log = (step, status, detail = '') => {
  results.push({ step, status, detail });
  const icon = status === 'pass' ? '✓' : status === 'fail' ? '✗' : status === 'skip' ? '○' : '•';
  console.log(`${icon} ${step}${detail ? `: ${detail}` : ''}`);
};

const shot = async (page, name) => {
  await mkdir(ARTIFACTS, { recursive: true });
  await page.screenshot({ path: path.join(ARTIFACTS, `${name}.png`), fullPage: true });
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  const medName = `E2E Walkthrough ${Date.now()}`;

  try {
    // Fresh start on dashboard
    await page.goto(`${BASE}/#dashboard`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await shot(page, '01-dashboard');
    log('Dashboard loads', await page.getByRole('heading').first().isVisible() ? 'pass' : 'fail');

    // Create medication with low threshold for dashboard queue
    await page.goto(`${BASE}/#add?mode=create`);
    await page.getByText('Manage Stock').waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(300);
    const createNewBtn = page.getByRole('button', { name: /create new/i });
    if (await createNewBtn.isVisible().catch(() => false)) {
      await createNewBtn.click();
    }
    await page.getByPlaceholder('e.g. Ibuprofen').fill(medName);
    await page.locator('.guided-two-column input[type="number"]').first().fill('5');
    await page.locator('input[type="date"]').fill('2027-12-31');
    await page.getByRole('button', { name: /^save$/i }).first().click();
    await page.waitForTimeout(1000);
    await shot(page, '02-created');
    log('Create medication', 'pass', medName);

    // Inventory visible
    await page.goto(`${BASE}/#inventory?filter=all`);
    await page.getByRole('heading', { name: medName }).waitFor({ state: 'visible', timeout: 10000 });
    log('Inventory shows new medication', 'pass');

    // Consume to trigger low stock (5 threshold, 30 qty -> consume 26)
    await page.getByRole('heading', { name: medName }).click();
    await page.locator('.take-dose-row input[type="number"]').fill('26');
    await page.getByRole('button', { name: /^take$/i }).click();
    await page.waitForTimeout(800);
    log('Consume medication', 'pass', '26 units');

    // Dashboard should show attention queue with Open button
    await page.goto(`${BASE}/#dashboard`);
    await page.waitForTimeout(800);
    const openBtn = page.getByRole('button', { name: /^open$/i }).first();
    const hasOpen = await openBtn.isVisible().catch(() => false);
    if (hasOpen) {
      await openBtn.click();
      await page.waitForURL(/inventory/);
      await page.waitForTimeout(600);
      const expanded = await page.locator(`#med-item-${await page.evaluate(() => {
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.split('?')[1] || '');
        return params.get('medicationId') || '';
      })}`).count();
      await shot(page, '03-deep-link');
      log('Dashboard Open deep-links to inventory', expanded > 0 || page.url().includes('medicationId') ? 'pass' : 'fail', page.url());
    } else {
      await shot(page, '03-dashboard-no-open');
      log('Dashboard Open deep-link', 'fail', 'Open button not visible after low stock');
    }

    // Archive confirmation
    await page.goto(`${BASE}/#inventory?filter=all`);
    await page.getByRole('heading', { name: medName }).click();
    await page.locator('.med-item').filter({ has: page.getByRole('heading', { name: medName }) })
      .getByRole('button', { name: /^archive$/i }).click();
    await page.getByText('Archive Medication?').waitFor();
    await page.getByRole('dialog').getByRole('button', { name: /^archive$/i }).click();
    await page.waitForTimeout(800);
    const gone = !(await page.getByRole('heading', { name: medName }).isVisible().catch(() => false));
    log('Archive with confirmation modal', gone ? 'pass' : 'fail');

    // Permanent delete confirmation in settings
    await page.goto(`${BASE}/#settings`);
    await page.locator('.dm-archive-item').filter({ hasText: medName }).waitFor({ state: 'visible' });
    await page.getByRole('button', { name: /^delete$/i }).click();
    await page.getByText('Delete Permanently?').waitFor();
    await page.getByRole('button', { name: /delete forever/i }).click();
    await page.waitForTimeout(800);
    const deleted = !(await page.locator('.dm-archive-item').filter({ hasText: medName }).isVisible().catch(() => false));
    log('Permanent delete with confirmation', deleted ? 'pass' : 'fail');

    // History audit trail
    await page.goto(`${BASE}/#history`);
    await page.getByText('Activity History').waitFor();
    await page.getByText(medName).first().waitFor({ state: 'visible' });
    log('History records actions', 'pass');

    // PWA manifest + service worker
    const pwa = await page.evaluate(async () => ({
      manifest: !!document.querySelector('link[rel="manifest"]'),
      sw: 'serviceWorker' in navigator ? !!(await navigator.serviceWorker.getRegistration()) : false
    }));
    log('PWA manifest linked', pwa.manifest ? 'pass' : 'fail');
    log('Service worker registered', pwa.sw ? 'pass' : 'fail');

    // IndexedDB has data stores
    const idb = await page.evaluate(async () => {
      const dbs = await indexedDB.databases?.();
      return dbs?.some((db) => db.name === 'MedInventoryDB') ?? false;
    });
    log('IndexedDB MedInventoryDB present', idb ? 'pass' : 'fail');

    log('Console errors', consoleErrors.length === 0 ? 'pass' : 'fail', consoleErrors.slice(0, 2).join(' | ') || 'none');
  } catch (error) {
    log('Test runner error', 'fail', error.message);
    await shot(page, 'error').catch(() => {});
  } finally {
    await writeFile(path.join(ARTIFACTS, 'automated-results.json'), JSON.stringify(results, null, 2));
    const failed = results.filter((r) => r.status === 'fail').length;
    const passed = results.filter((r) => r.status === 'pass').length;
    console.log(`\n=== Automated: ${passed} passed, ${failed} failed ===`);
    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
  }
})();
