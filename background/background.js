// Background script for ReloadPilot by mbahnizen
// Uses page-native location.reload() via scripting API and keeps badge countdowns tab-scoped.

let monitoredUrls = {};
let isPaused = false;
const tabStates = new Map();

const BADGE_BG = '#12c7f4';
const BADGE_TEXT = '#080c13';
const COUNTDOWN_SECONDS = 5;

const noop = () => {};

function setBadgeColors(tabId) {
  browser.action.setBadgeBackgroundColor({ tabId, color: BADGE_BG }).catch(noop);

  if (browser.action.setBadgeTextColor) {
    browser.action.setBadgeTextColor({ tabId, color: BADGE_TEXT }).catch(noop);
  }
}

function clearTabBadge(tabId) {
  browser.action.setBadgeText({ tabId, text: '' }).catch(noop);
}

function clearTabTimers(tabId) {
  const state = tabStates.get(tabId);
  if (!state) return;

  clearTimeout(state.badgeStartTimer);
  clearInterval(state.badgeInterval);
  clearTabBadge(tabId);
}

function clearTabState(tabId) {
  clearTabTimers(tabId);
  tabStates.delete(tabId);
}

function scheduleBadgeCountdown(tabId) {
  const state = tabStates.get(tabId);
  if (!state) return;

  clearTabTimers(tabId);
  setBadgeColors(tabId);

  const startAt = state.nextReloadAt - COUNTDOWN_SECONDS * 1000;
  const delay = Math.max(0, startAt - Date.now());

  state.badgeStartTimer = setTimeout(() => {
    const tick = () => {
      const latest = tabStates.get(tabId);
      if (!latest) return;

      const secondsLeft = Math.ceil((latest.nextReloadAt - Date.now()) / 1000);
      if (secondsLeft > 0 && secondsLeft <= COUNTDOWN_SECONDS) {
        browser.action.setBadgeText({ tabId, text: String(secondsLeft) }).catch(noop);
        return;
      }

      clearTabTimers(tabId);
    };

    tick();
    if (!tabStates.has(tabId)) return;
    state.badgeInterval = setInterval(tick, 250);
  }, delay);
}

async function clearPageTimer(tabId) {
  await browser.scripting.executeScript({
    target: { tabId },
    func: () => {
      if (window.__reloadPilotTimer) {
        clearTimeout(window.__reloadPilotTimer);
        window.__reloadPilotTimer = null;
      }

      if (window.__arTimer) {
        clearTimeout(window.__arTimer);
        window.__arTimer = null;
      }
    }
  }).catch(noop);
}

// Load persisted state.
browser.storage.local.get(['monitoredUrls', 'isPaused']).then(result => {
  isPaused = Boolean(result.isPaused);
  if (result.monitoredUrls) {
    monitoredUrls = result.monitoredUrls;
    if (!isPaused) injectAllMatchingTabs();
  }
});

async function injectAllMatchingTabs() {
  for (const url in monitoredUrls) {
    const intervalMs = monitoredUrls[url].interval * 1000;
    try {
      const tabs = await browser.tabs.query({ url });
      for (const tab of tabs) {
        injectTimer(tab.id, intervalMs, url);
      }
    } catch (e) {}
  }
}

function injectTimer(tabId, intervalMs, url) {
  if (isPaused) return;

  const nextReloadAt = Date.now() + intervalMs;

  clearTabState(tabId);

  tabStates.set(tabId, {
    url,
    interval: Math.round(intervalMs / 1000),
    nextReloadAt,
    badgeStartTimer: null,
    badgeInterval: null
  });

  scheduleBadgeCountdown(tabId);

  browser.scripting.executeScript({
    target: { tabId },
    func: (ms) => {
      if (window.__reloadPilotTimer) clearTimeout(window.__reloadPilotTimer);
      if (window.__arTimer) clearTimeout(window.__arTimer);

      window.__reloadPilotTimer = setTimeout(() => {
        window.__reloadPilotTimer = null;
        location.reload();
      }, ms);
    },
    args: [intervalMs]
  }).catch(() => {
    clearTabState(tabId);
  });
}

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return;

  const state = tabStates.get(tabId);
  if (state && state.url !== tab.url) {
    clearTabState(tabId);
  }

  const config = monitoredUrls[tab.url];
  if (config) {
    injectTimer(tabId, config.interval * 1000, tab.url);
  }
});

browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'ADD_URL') {
    let interval = message.interval;
    if (interval < 5) interval = 5;

    monitoredUrls[message.url] = {
      interval,
      addedAt: Date.now()
    };

    return browser.storage.local.set({ monitoredUrls }).then(() => {
      if (!isPaused) {
        browser.tabs.query({ url: message.url }).then(tabs => {
          for (const tab of tabs) {
            injectTimer(tab.id, interval * 1000, message.url);
          }
        }).catch(noop);
      }

      return { status: 'success' };
    });
  }

  if (message.type === 'REMOVE_URL') {
    delete monitoredUrls[message.url];

    return browser.storage.local.set({ monitoredUrls }).then(async () => {
      for (const [tabId, state] of Array.from(tabStates.entries())) {
        if (state.url === message.url) {
          await clearPageTimer(tabId);
          clearTabState(tabId);
        }
      }

      return { status: 'success' };
    });
  }

  if (message.type === 'CLEAR_ALL') {
    for (const tabId of Array.from(tabStates.keys())) {
      clearPageTimer(tabId);
      clearTabState(tabId);
    }

    monitoredUrls = {};
    return browser.storage.local.set({ monitoredUrls }).then(() => ({ status: 'success' }));
  }

  if (message.type === 'SET_PAUSED') {
    isPaused = Boolean(message.paused);

    if (isPaused) {
      for (const tabId of Array.from(tabStates.keys())) {
        clearPageTimer(tabId);
        clearTabState(tabId);
      }
    }

    return browser.storage.local.set({ isPaused }).then(async () => {
      if (!isPaused) await injectAllMatchingTabs();
      return { status: 'success', paused: isPaused };
    });
  }

  if (message.type === 'RELOAD_STATE') {
    return browser.storage.local.get(['monitoredUrls', 'isPaused']).then(async result => {
      for (const tabId of Array.from(tabStates.keys())) {
        clearPageTimer(tabId);
        clearTabState(tabId);
      }

      monitoredUrls = result.monitoredUrls || {};
      isPaused = Boolean(result.isPaused);

      if (!isPaused) await injectAllMatchingTabs();

      return {
        status: 'success',
        paused: isPaused,
        managedCount: Object.keys(monitoredUrls).length
      };
    });
  }

  if (message.type === 'GET_TAB_STATUS') {
    if (isPaused) {
      clearTabBadge(message.tabId);
      return Promise.resolve({ active: false, paused: true });
    }

    const config = monitoredUrls[message.url];
    if (!config) {
      clearTabBadge(message.tabId);
      return Promise.resolve({ active: false, paused: false });
    }

    const state = tabStates.get(message.tabId);
    if (!state || state.url !== message.url) {
      injectTimer(message.tabId, config.interval * 1000, message.url);
    }

    const latest = tabStates.get(message.tabId);
    return Promise.resolve({
      active: true,
      paused: false,
      interval: config.interval,
      nextReloadAt: latest ? latest.nextReloadAt : null
    });
  }

  if (message.type === 'GET_GLOBAL_STATE') {
    return Promise.resolve({
      paused: isPaused,
      managedCount: Object.keys(monitoredUrls).length
    });
  }
});

browser.tabs.onRemoved.addListener((tabId) => {
  clearTabState(tabId);
});
