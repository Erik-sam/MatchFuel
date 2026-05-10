// =============================================
// PROFILES — multi-user storage (feature 10)
// =============================================
// Всеки потребител си има профил в localStorage.
// Без backend — името на профила е и ключ, и идентификатор.
//
// Storage layout:
//   "fnwo_profiles" → { [name]: { fields: {...}, history: [...] } }
//   "fnwo_active"   → "current profile name"
//
// История: преди feature 10 беше глобален ключ "fnwo_history".
// При първо зареждане я мигрираме в "Default" профил, за да
// не се изгуби история на съществуващи потребители.
// =============================================

const PROFILES_KEY  = "fnwo_profiles";
const ACTIVE_KEY    = "fnwo_active";
const LEGACY_HISTORY_KEY = "fnwo_history";
const DEFAULT_NAME  = "Default";

function readAll() {
  const raw = localStorage.getItem(PROFILES_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function writeAll(profiles) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

function migrateIfNeeded() {
  const profiles = readAll();
  if (Object.keys(profiles).length > 0) return;

  const legacy = localStorage.getItem(LEGACY_HISTORY_KEY);
  let history = [];
  if (legacy) {
    try { history = JSON.parse(legacy) || []; } catch {}
  }

  profiles[DEFAULT_NAME] = { fields: {}, history };
  writeAll(profiles);
  localStorage.setItem(ACTIVE_KEY, DEFAULT_NAME);

  if (legacy) localStorage.removeItem(LEGACY_HISTORY_KEY);
}

export function initProfiles() {
  migrateIfNeeded();
  const profiles = readAll();
  if (Object.keys(profiles).length === 0) {
    profiles[DEFAULT_NAME] = { fields: {}, history: [] };
    writeAll(profiles);
    localStorage.setItem(ACTIVE_KEY, DEFAULT_NAME);
  }
  if (!localStorage.getItem(ACTIVE_KEY)) {
    localStorage.setItem(ACTIVE_KEY, Object.keys(profiles)[0]);
  }
}

export function listProfiles() {
  return Object.keys(readAll());
}

export function getActiveProfile() {
  return localStorage.getItem(ACTIVE_KEY) || DEFAULT_NAME;
}

export function setActiveProfile(name) {
  const profiles = readAll();
  if (!profiles[name]) return false;
  localStorage.setItem(ACTIVE_KEY, name);
  return true;
}

export function createProfile(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return { ok: false, reason: "empty" };
  const profiles = readAll();
  if (profiles[trimmed]) return { ok: false, reason: "exists" };
  profiles[trimmed] = { fields: {}, history: [] };
  writeAll(profiles);
  localStorage.setItem(ACTIVE_KEY, trimmed);
  return { ok: true, name: trimmed };
}

export function deleteProfile(name) {
  const profiles = readAll();
  if (!profiles[name]) return { ok: false, reason: "missing" };
  delete profiles[name];

  if (Object.keys(profiles).length === 0) {
    profiles[DEFAULT_NAME] = { fields: {}, history: [] };
    writeAll(profiles);
    localStorage.setItem(ACTIVE_KEY, DEFAULT_NAME);
    return { ok: true, switchedTo: DEFAULT_NAME };
  }
  writeAll(profiles);

  if (getActiveProfile() === name) {
    const next = Object.keys(profiles)[0];
    localStorage.setItem(ACTIVE_KEY, next);
    return { ok: true, switchedTo: next };
  }
  return { ok: true };
}

export function saveProfileFields(fields) {
  const name = getActiveProfile();
  const profiles = readAll();
  if (!profiles[name]) return;
  profiles[name].fields = { ...(profiles[name].fields || {}), ...fields };
  writeAll(profiles);
}

export function loadProfileFields() {
  const name = getActiveProfile();
  const profiles = readAll();
  return profiles[name]?.fields || {};
}

export function loadProfileHistory() {
  const name = getActiveProfile();
  const profiles = readAll();
  return profiles[name]?.history || [];
}

export function saveProfileHistory(history) {
  const name = getActiveProfile();
  const profiles = readAll();
  if (!profiles[name]) return;
  profiles[name].history = history;
  writeAll(profiles);
}
