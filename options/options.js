// Options page for ReloadPilot by mbahnizen

document.addEventListener('DOMContentLoaded', async () => {
  const versionEl = document.getElementById('version');
  const managedCountEl = document.getElementById('managed-count');
  const feedbackEl = document.getElementById('tools-feedback');
  const exportBtn = document.getElementById('export-btn');
  const importFile = document.getElementById('import-file');

  versionEl.textContent = browser.runtime.getManifest().version;
  await renderManagedCount();

  exportBtn.addEventListener('click', exportManagedUrls);
  importFile.addEventListener('change', importManagedUrls);

  async function renderManagedCount() {
    const { monitoredUrls } = await browser.storage.local.get(['monitoredUrls']);
    const count = monitoredUrls ? Object.keys(monitoredUrls).length : 0;
    managedCountEl.textContent = `${count} managed URL${count === 1 ? '' : 's'} stored locally.`;
  }

  async function exportManagedUrls() {
    const { monitoredUrls } = await browser.storage.local.get(['monitoredUrls']);
    const payload = {
      app: 'ReloadPilot',
      version: browser.runtime.getManifest().version,
      exportedAt: new Date().toISOString(),
      monitoredUrls: monitoredUrls || {}
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reloadpilot-managed-urls-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    const count = monitoredUrls ? Object.keys(monitoredUrls).length : 0;
    showFeedback(`Export complete. Saved ${count} managed URL${count === 1 ? '' : 's'} to a JSON backup file.`);
  }

  async function importManagedUrls(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const imported = normalizeImportPayload(payload);

      if (Object.keys(imported).length === 0) {
        showFeedback('No valid managed URLs found in that file.', true);
        return;
      }

      const { monitoredUrls } = await browser.storage.local.get(['monitoredUrls']);
      const merged = { ...(monitoredUrls || {}), ...imported };
      await browser.storage.local.set({ monitoredUrls: merged });
      await browser.runtime.sendMessage({ type: 'RELOAD_STATE' });
      await renderManagedCount();
      const importedCount = Object.keys(imported).length;
      showFeedback(`Import complete. Merged ${importedCount} URL${importedCount === 1 ? '' : 's'} into ReloadPilot. Open the popup and check the Managed tab to review them.`);
    } catch (e) {
      showFeedback('Import failed. Choose a valid ReloadPilot JSON file.', true);
    } finally {
      importFile.value = '';
    }
  }

  function normalizeImportPayload(payload) {
    const source = payload && payload.monitoredUrls ? payload.monitoredUrls : payload;
    const normalized = {};

    if (!source || typeof source !== 'object' || Array.isArray(source)) return normalized;

    for (const [url, config] of Object.entries(source)) {
      if (!isHttpUrl(url)) continue;

      const interval = Number(config && config.interval);
      if (!Number.isFinite(interval)) continue;

      normalized[url] = {
        interval: Math.max(5, Math.round(interval)),
        addedAt: Number(config.addedAt) || Date.now()
      };
    }

    return normalized;
  }

  function isHttpUrl(raw) {
    try {
      const parsed = new URL(raw);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (e) {
      return false;
    }
  }

  function showFeedback(message, isError = false) {
    feedbackEl.textContent = message;
    feedbackEl.classList.toggle('error', isError);
  }
});
