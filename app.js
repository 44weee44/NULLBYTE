import {
  BALANCE, PLUGINS, HARDWARE, SITES, LOCATIONS, createInitialState, validNickname, escapeText as esc,
  getInstalledPlugin, getPlugin, getHardwareUsage, getRamUsage, purchasePlugin, buyHardware, uninstallPlugin,
  acceptMission, getSite, getSiteProgress, operateSite, exportMissionResult, submitMission,
  processTimedEvents, bankStatus, bankRisk, attemptBankSimulation, saveEditorFile, validateNbs, runNbs,
  recordHistory, addBookmark, idempotencyKey
} from './engine.js';
import { loadSavedGame, saveGame } from './storage.js';

// TEMPORARY RESTORE - full file being re-applied in next commit
console.error('NULLBYTE: app.js was temporarily truncated. Please wait for full restore.');
