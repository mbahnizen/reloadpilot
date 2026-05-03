// Popup logic for ReloadPilot by mbahnizen

document.addEventListener('DOMContentLoaded', async () => {
  const currentDomainEl = document.getElementById('current-domain');
  const currentUrlEl = document.getElementById('current-url');
  const statePill = document.getElementById('state-pill');
  const activeStatus = document.getElementById('active-status');
  const countdownLabel = document.getElementById('countdown-label');
  const countdownValue = document.getElementById('countdown-value');
  const countdownProgress = document.getElementById('countdown-progress');
  const intervalSummary = document.getElementById('interval-summary');
  const addBtn = document.getElementById('add-btn');
  const removeBtn = document.getElementById('remove-btn');
  const pauseAllBtn = document.getElementById('pause-all-btn');
  const intervalVal = document.getElementById('interval-val');
  const bulkIntervalVal = document.getElementById('bulk-interval-val');
  const bulkFeedback = document.getElementById('bulk-feedback');
  const bulkAddBtn = document.getElementById('bulk-add-btn');
  const bulkTextarea = document.getElementById('bulk-urls');
  const openOptionsBtn = document.getElementById('open-options-btn');
  const managedGlobalNote = document.getElementById('managed-global-note');

  document.getElementById('current-year').textContent = new Date().getFullYear();
  openOptionsBtn.addEventListener('click', () => {
    browser.runtime.openOptionsPage();
    window.close();
  });

  const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
  const currentUrl = activeTab && activeTab.url ? activeTab.url : '';
  let selectedUnit = 1;
  let bulkSelectedUnit = 1;
  let countdownTimer = null;
  let activeConfig = null;
  let globalPaused = false;
  let statusRefreshInFlight = false;

  renderCurrentTab(currentUrl, activeTab && activeTab.title);

  const { monitoredUrls, lastConfig } = await browser.storage.local.get(['monitoredUrls', 'lastConfig']);

  if (monitoredUrls && monitoredUrls[currentUrl]) {
    applyIntervalToControls(monitoredUrls[currentUrl].interval);
  } else if (lastConfig) {
    intervalVal.value = lastConfig.val;
    selectedUnit = lastConfig.unit;
  }

  bulkIntervalVal.value = intervalVal.value;
  bulkSelectedUnit = selectedUnit;

  const unitBtns = document.querySelectorAll('#interval-unit .unit-btn');
  const bulkUnitBtns = document.querySelectorAll('#bulk-interval-unit .unit-btn');
  syncUnitButtons();
  syncBulkUnitButtons();

  unitBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedUnit = parseInt(btn.dataset.val, 10);
      syncUnitButtons();
    });
  });

  bulkUnitBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      bulkSelectedUnit = parseInt(btn.dataset.val, 10);
      syncBulkUnitButtons();
      renderBulkFeedback();
    });
  });

  document.querySelectorAll('.current-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      intervalVal.value = btn.dataset.val;
      selectedUnit = parseInt(btn.dataset.unit, 10);
      syncUnitButtons();
    });
  });

  document.querySelectorAll('.bulk-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      bulkIntervalVal.value = btn.dataset.val;
      bulkSelectedUnit = parseInt(btn.dataset.unit, 10);
      syncBulkUnitButtons();
      renderBulkFeedback();
    });
  });

  bulkTextarea.addEventListener('input', renderBulkFeedback);
  bulkIntervalVal.addEventListener('input', renderBulkFeedback);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  addBtn.addEventListener('click', async () => {
    const interval = getValidatedInterval(intervalVal, selectedUnit);

    await browser.storage.local.set({
      lastConfig: { val: intervalVal.value, unit: selectedUnit }
    });

    await browser.runtime.sendMessage({
      type: 'ADD_URL',
      url: currentUrl,
      interval
    });

    await refreshCurrentStatus();
    renderManagedList();
  });

  removeBtn.addEventListener('click', async () => {
    await browser.runtime.sendMessage({
      type: 'REMOVE_URL',
      url: currentUrl
    });

    activeConfig = null;
    renderInactiveState();
    renderManagedList();
  });

  pauseAllBtn.addEventListener('click', async () => {
    await browser.runtime.sendMessage({ type: 'SET_PAUSED', paused: !globalPaused });
    await refreshCurrentStatus();
    renderManagedList();
  });

  bulkAddBtn.addEventListener('click', async () => {
    const result = parseBulkUrls();
    const interval = getValidatedInterval(bulkIntervalVal, bulkSelectedUnit);

    if (result.valid.length === 0) {
      renderBulkFeedback('Add at least one valid http:// or https:// URL.');
      return;
    }

    await browser.storage.local.set({
      lastConfig: { val: bulkIntervalVal.value, unit: bulkSelectedUnit }
    });

    for (const url of result.valid) {
      await browser.runtime.sendMessage({ type: 'ADD_URL', url, interval });
    }

    bulkTextarea.value = result.invalid.map(item => item.raw).join('\n');
    bulkAddBtn.textContent = `Added ${result.valid.length}`;
    setTimeout(() => { bulkAddBtn.textContent = 'Add All URLs'; }, 1400);

    await refreshCurrentStatus();
    renderManagedList();
    renderBulkFeedback(result.invalid.length ? 'Valid URLs added. Invalid lines stayed in the box.' : 'All URLs added.');
  });

  document.getElementById('clear-all-btn').addEventListener('click', () => {
    document.getElementById('clear-all-container').classList.add('hidden');
    document.getElementById('clear-all-warning').classList.remove('hidden');
  });

  document.getElementById('cancel-clear-btn').addEventListener('click', () => {
    document.getElementById('clear-all-warning').classList.add('hidden');
    document.getElementById('clear-all-container').classList.remove('hidden');
  });

  document.getElementById('confirm-clear-btn').addEventListener('click', async () => {
    await browser.runtime.sendMessage({ type: 'CLEAR_ALL' });
    activeConfig = null;
    renderInactiveState();
    renderManagedList();
  });

  await refreshCurrentStatus();
  renderManagedList();
  renderBulkFeedback();

  window.addEventListener('unload', () => {
    if (countdownTimer) clearInterval(countdownTimer);
  });

  function renderCurrentTab(url, title) {
    currentUrlEl.textContent = url || 'Unavailable page';
    currentUrlEl.title = url || '';

    try {
      const parsed = new URL(url);
      currentDomainEl.textContent = parsed.hostname || title || 'Current tab';
    } catch (e) {
      currentDomainEl.textContent = title || 'Current tab';
    }
  }

  function getValidatedInterval(inputEl, unit) {
    let rawValue = parseInt(inputEl.value, 10);
    if (!Number.isFinite(rawValue) || rawValue < 1) rawValue = 5;

    let interval = rawValue * unit;
    if (interval < 5) interval = 5;

    inputEl.value = unit === 1 ? interval : rawValue;
    return interval;
  }

  function applyIntervalToControls(interval) {
    const parts = getIntervalParts(interval);
    intervalVal.value = parts.value;
    selectedUnit = parts.unit;
  }

  function getIntervalParts(interval) {
    if (interval >= 3600 && interval % 3600 === 0) {
      return { value: interval / 3600, unit: 3600 };
    }

    if (interval >= 60 && interval % 60 === 0) {
      return { value: interval / 60, unit: 60 };
    }

    return { value: interval, unit: 1 };
  }

  function syncUnitButtons() {
    unitBtns.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.val, 10) === selectedUnit);
    });
  }

  function syncBulkUnitButtons() {
    bulkUnitBtns.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.val, 10) === bulkSelectedUnit);
    });
  }

  function parseBulkUrls() {
    const lines = bulkTextarea.value.split('\n').map(line => line.trim()).filter(Boolean);
    const seen = new Set();
    const valid = [];
    const invalid = [];

    for (const raw of lines) {
      const parsed = normalizeHttpUrl(raw);

      if (!parsed) {
        invalid.push({ raw, reason: 'Use http:// or https://' });
        continue;
      }

      if (seen.has(parsed)) continue;
      seen.add(parsed);
      valid.push(parsed);
    }

    return { valid, invalid, total: lines.length };
  }

  function normalizeHttpUrl(raw) {
    try {
      const parsed = new URL(raw);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
      if (!parsed.hostname) return null;
      return parsed.href;
    } catch (e) {
      return null;
    }
  }

  function renderBulkFeedback(customMessage) {
    const result = parseBulkUrls();
    const interval = getPreviewInterval(bulkIntervalVal, bulkSelectedUnit);

    if (customMessage) {
      bulkFeedback.textContent = customMessage;
      bulkFeedback.classList.toggle('error', result.valid.length === 0 && result.invalid.length > 0);
      bulkAddBtn.disabled = result.valid.length === 0;
      return;
    }

    if (result.total === 0) {
      bulkFeedback.textContent = 'No URLs entered yet.';
      bulkFeedback.classList.remove('error');
      bulkAddBtn.disabled = true;
      return;
    }

    const invalidPreview = result.invalid.length
      ? ` Invalid: ${result.invalid.slice(0, 2).map(item => item.raw).join(', ')}${result.invalid.length > 2 ? ', ...' : ''}.`
      : '';

    bulkFeedback.textContent = `${result.valid.length} valid, ${result.invalid.length} invalid. Bulk interval: ${formatInterval(interval)}.${invalidPreview}`;
    bulkFeedback.classList.toggle('error', result.invalid.length > 0);
    bulkAddBtn.disabled = result.valid.length === 0;
  }

  function getPreviewInterval(inputEl, unit) {
    const rawValue = parseInt(inputEl.value, 10);
    if (!Number.isFinite(rawValue) || rawValue < 1) return 5;
    return Math.max(5, rawValue * unit);
  }

  function formatInterval(sec) {
    if (sec >= 3600) {
      const hours = sec / 3600;
      return `${formatNumber(hours)}h`;
    }

    if (sec >= 60) {
      const minutes = sec / 60;
      return `${formatNumber(minutes)}m`;
    }

    return `${sec}s`;
  }

  function formatNumber(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  function formatCountdown(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const restMinutes = minutes % 60;
      return `${hours}h ${String(restMinutes).padStart(2, '0')}m`;
    }

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  async function refreshCurrentStatus(options = {}) {
    const status = await browser.runtime.sendMessage({
      type: 'GET_TAB_STATUS',
      tabId: activeTab.id,
      url: currentUrl
    });

    globalPaused = Boolean(status && status.paused);

    if (globalPaused) {
      activeConfig = null;
      renderPausedState();
      return;
    }

    if (status && status.active) {
      activeConfig = status;
      applyIntervalToControls(status.interval);
      syncUnitButtons();
      if (options.keepTimer && countdownTimer) {
        intervalSummary.textContent = `Reloading every ${formatInterval(activeConfig.interval)}`;
        updateCountdown();
      } else {
        renderActiveState();
      }
      return;
    }

    activeConfig = null;
    renderInactiveState();
  }

  function renderPausedState() {
    statePill.textContent = 'Paused';
    statePill.classList.remove('active');
    statePill.classList.add('paused');
    addBtn.classList.add('hidden');
    removeBtn.classList.add('hidden');
    renderGlobalControl();
    activeStatus.classList.add('hidden');
    countdownProgress.style.width = '0%';

    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  function renderActiveState() {
    statePill.textContent = 'Active';
    statePill.classList.add('active');
    statePill.classList.remove('paused');
    addBtn.classList.add('hidden');
    removeBtn.classList.remove('hidden');
    renderGlobalControl();
    activeStatus.classList.remove('hidden');
    intervalSummary.textContent = `Reloading every ${formatInterval(activeConfig.interval)}`;

    if (countdownTimer) clearInterval(countdownTimer);
    updateCountdown();
    countdownTimer = setInterval(updateCountdown, 1000);
  }

  function renderInactiveState() {
    statePill.textContent = 'Idle';
    statePill.classList.remove('active');
    statePill.classList.remove('paused');
    addBtn.classList.remove('hidden');
    removeBtn.classList.add('hidden');
    renderGlobalControl();
    activeStatus.classList.add('hidden');
    countdownProgress.style.width = '0%';

    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  function renderGlobalControl() {
    pauseAllBtn.textContent = globalPaused ? 'Resume All' : 'Pause All';
    pauseAllBtn.classList.toggle('paused', globalPaused);
    managedGlobalNote.textContent = globalPaused
      ? 'Reload timers are paused. Managed URLs stay saved locally.'
      : 'All managed URLs are ready to reload on schedule.';
  }

  function updateCountdown() {
    if (!activeConfig) return;

    if (!activeConfig.nextReloadAt) {
      countdownLabel.textContent = 'Status';
      countdownValue.textContent = 'Active';
      countdownProgress.style.width = '100%';
      return;
    }

    const remainingMs = activeConfig.nextReloadAt - Date.now();
    const intervalMs = activeConfig.interval * 1000;
    const progress = Math.max(0, Math.min(1, 1 - remainingMs / intervalMs));

    countdownLabel.textContent = 'Next reload in';
    countdownValue.textContent = formatCountdown(remainingMs);
    countdownProgress.style.width = `${progress * 100}%`;

    if (remainingMs <= 0) {
      countdownValue.textContent = 'Reloading';
      countdownProgress.style.width = '100%';
      refreshStatusAfterReload();
    }
  }

  async function refreshStatusAfterReload() {
    if (statusRefreshInFlight) return;

    statusRefreshInFlight = true;
    setTimeout(async () => {
      try {
        await refreshCurrentStatus({ keepTimer: true });
      } finally {
        statusRefreshInFlight = false;
      }
    }, 900);
  }

  function renderManagedList() {
    browser.storage.local.get(['monitoredUrls']).then(({ monitoredUrls }) => {
      const listEl = document.getElementById('managed-list');
      const emptyEl = document.getElementById('managed-empty');
      const clearBtnContainer = document.getElementById('clear-all-container');
      const warningEl = document.getElementById('clear-all-warning');

      listEl.textContent = '';
      warningEl.classList.add('hidden');

      if (!monitoredUrls || Object.keys(monitoredUrls).length === 0) {
        emptyEl.classList.remove('hidden');
        clearBtnContainer.classList.add('hidden');
        renderGlobalControl();
        return;
      }

      emptyEl.classList.add('hidden');
      clearBtnContainer.classList.remove('hidden');
      renderGlobalControl();

      for (const [url, config] of Object.entries(monitoredUrls)) {
        const item = document.createElement('div');
        item.className = 'managed-item';

        const info = document.createElement('div');
        info.className = 'managed-info';

        const domain = document.createElement('div');
        domain.className = 'managed-domain';
        domain.textContent = getDomainLabel(url);

        const urlSpan = document.createElement('div');
        urlSpan.className = 'managed-url';
        urlSpan.title = url;
        urlSpan.textContent = url;

        const interval = document.createElement('div');
        interval.className = 'managed-interval';
        interval.textContent = `Every ${formatInterval(config.interval)}`;

        info.appendChild(domain);
        info.appendChild(urlSpan);
        info.appendChild(interval);

        const actions = document.createElement('div');
        actions.className = 'managed-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'icon-btn';
        editBtn.textContent = 'Edit';
        editBtn.title = 'Change interval';
        editBtn.addEventListener('click', () => {
          renderManagedEditor(item, url, config.interval);
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.textContent = 'x';
        delBtn.title = 'Stop reloading';
        delBtn.addEventListener('click', async () => {
          await browser.runtime.sendMessage({ type: 'REMOVE_URL', url });
          if (url === currentUrl) {
            activeConfig = null;
            renderInactiveState();
          }
          renderManagedList();
        });

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        item.appendChild(info);
        item.appendChild(actions);
        listEl.appendChild(item);
      }
    });
  }

  function renderManagedEditor(item, url, interval) {
    const parts = getIntervalParts(interval);
    item.classList.add('editing');
    item.textContent = '';

    const editor = document.createElement('div');
    editor.className = 'managed-editor';

    const title = document.createElement('div');
    title.className = 'managed-editor-title';
    title.textContent = getDomainLabel(url);

    const controls = document.createElement('div');
    controls.className = 'managed-edit-controls';

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '1';
    input.value = parts.value;

    const unitGroup = document.createElement('div');
    unitGroup.className = 'segmented-control compact';

    let editUnit = parts.unit;
    const editUnitButtons = [
      { label: 'Sec', value: 1 },
      { label: 'Min', value: 60 },
      { label: 'Hr', value: 3600 }
    ].map(option => {
      const btn = document.createElement('button');
      btn.className = 'unit-btn';
      btn.textContent = option.label;
      btn.classList.toggle('active', option.value === editUnit);
      btn.addEventListener('click', () => {
        editUnit = option.value;
        editUnitButtons.forEach(unitBtn => unitBtn.classList.remove('active'));
        btn.classList.add('active');
      });
      unitGroup.appendChild(btn);
      return btn;
    });

    controls.appendChild(input);
    controls.appendChild(unitGroup);

    const actions = document.createElement('div');
    actions.className = 'managed-edit-actions';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'primary-btn compact-btn';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', async () => {
      const newInterval = getValidatedInterval(input, editUnit);
      await browser.runtime.sendMessage({ type: 'ADD_URL', url, interval: newInterval });
      if (url === currentUrl) await refreshCurrentStatus();
      renderManagedList();
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'secondary-btn compact-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', renderManagedList);

    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);

    editor.appendChild(title);
    editor.appendChild(controls);
    editor.appendChild(actions);
    item.appendChild(editor);
  }

  function getDomainLabel(url) {
    try {
      const parsed = new URL(url);
      return parsed.hostname || url;
    } catch (e) {
      return url;
    }
  }
});
