import { loadState, saveState } from './lib/storage.js';
import { diffActivity, MAX_ACTIVITY } from './lib/activity.js';
import { currentUser } from './lib/auth.js';
import { pushStateToCloud, pullStateFromCloud } from './lib/cloudSync.js';
import { getSupabaseClient } from './lib/supabase.js';
import { syncEndSavingsWallet } from './lib/state.js';
import { derive } from './lib/derive.js';

export function createStore() {
  let state = loadState();
  let derived = derive(state);
  let saved = true;
  let saveTimer = null;
  let cloudDebounceTimer = null;
  let lastSyncTime = null;

  const user = currentUser();
  let cloudStatus = (!user || !getSupabaseClient()) ? 'disabled' : 'idle';

  const listeners = new Set();

  function notify() {
    derived = derive(state);
    listeners.forEach((listener) => {
      try {
        listener(state, derived);
      } catch (err) {
        console.error('Store listener error:', err);
      }
    });
  }

  function scheduleSave() {
    saveState(state);
    saved = true;
    notify();

    const activeUser = currentUser();
    if (activeUser && getSupabaseClient()) {
      clearTimeout(cloudDebounceTimer);
      cloudDebounceTimer = setTimeout(() => {
        cloudStatus = 'syncing';
        notify();
        pushStateToCloud(activeUser, state)
          .then((res) => {
            if (res.success) {
              cloudStatus = 'synced';
              if (res.updatedAt) lastSyncTime = res.updatedAt;
            } else {
              cloudStatus = 'error';
            }
            notify();
          })
          .catch(() => {
            cloudStatus = 'error';
            notify();
          });
      }, 1200);
    }
  }

  function update(recipe) {
    const prev = state;
    const next = recipe(prev);
    const syncedWallets = syncEndSavingsWallet(next.wallets, next.endSavings);
    const withWallets = syncedWallets !== next.wallets ? { ...next, wallets: syncedWallets } : next;
    const added = diffActivity(prev, withWallets);
    if (added.length === 0) {
      state = withWallets;
    } else {
      state = {
        ...withWallets,
        activity: [...added, ...withWallets.activity].slice(0, MAX_ACTIVITY),
      };
    }
    scheduleSave();
  }

  function replace(newState) {
    const syncedWallets = syncEndSavingsWallet(newState.wallets, newState.endSavings);
    state = syncedWallets !== newState.wallets ? { ...newState, wallets: syncedWallets } : newState;
    scheduleSave();
  }

  async function syncNow() {
    const activeUser = currentUser();
    if (!activeUser || !getSupabaseClient()) return false;
    cloudStatus = 'syncing';
    notify();
    const res = await pushStateToCloud(activeUser, state);
    if (res.success) {
      cloudStatus = 'synced';
      if (res.updatedAt) lastSyncTime = res.updatedAt;
      notify();
      return true;
    }
    cloudStatus = 'error';
    notify();
    return false;
  }

  async function pullNow() {
    const activeUser = currentUser();
    if (!activeUser || !getSupabaseClient()) return false;
    cloudStatus = 'syncing';
    notify();
    const res = await pullStateFromCloud(activeUser);
    if (res.success && res.state) {
      saveState(res.state);
      state = res.state;
      cloudStatus = 'synced';
      if (res.updatedAt) lastSyncTime = res.updatedAt;
      notify();
      return true;
    }
    cloudStatus = 'error';
    notify();
    return false;
  }

  function initCloudSync() {
    const activeUser = currentUser();
    if (!activeUser || !getSupabaseClient()) return;
    cloudStatus = 'syncing';
    notify();

    pullStateFromCloud(activeUser)
      .then((res) => {
        if (res.success && res.state) {
          const local = loadState();
          const isLocalEmpty =
            local.mode === null ||
            (local.expenses.length === 0 && local.incomes.length === 0 && local.allowance === 0);
          const cloudHasData =
            res.state.mode !== null ||
            res.state.expenses.length > 0 ||
            res.state.incomes.length > 0 ||
            res.state.allowance > 0;
          const cloudHasMore =
            res.state.expenses.length > local.expenses.length ||
            res.state.incomes.length > local.incomes.length ||
            (res.state.activity?.length ?? 0) > (local.activity?.length ?? 0);

          if ((isLocalEmpty && cloudHasData) || cloudHasMore) {
            saveState(res.state);
            state = res.state;
          }
          cloudStatus = 'synced';
          if (res.updatedAt) lastSyncTime = res.updatedAt;
          notify();
        } else {
          pushStateToCloud(activeUser, loadState()).then((pushRes) => {
            if (pushRes.success) {
              cloudStatus = 'synced';
              if (pushRes.updatedAt) lastSyncTime = pushRes.updatedAt;
            } else {
              cloudStatus = 'idle';
            }
            notify();
          });
        }
      })
      .catch(() => {
        cloudStatus = 'idle';
        notify();
      });
  }

  initCloudSync();

  return {
    getState: () => state,
    getDerived: () => derived,
    getSaved: () => saved,
    getCloudStatus: () => cloudStatus,
    getLastSyncTime: () => lastSyncTime,
    update,
    replace,
    syncNow,
    pullNow,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    reloadFromStorage() {
      state = loadState();
      derived = derive(state);
      notify();
    },
    destroy() {
      clearTimeout(saveTimer);
      clearTimeout(cloudDebounceTimer);
      listeners.clear();
    },
  };
}
