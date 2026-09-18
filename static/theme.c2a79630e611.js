"use strict";
(() => {
  const key = "voxyn.dashboard.theme";
  let value = "dark";
  try { value = localStorage.getItem(key) || "dark"; } catch (_) { value = "dark"; }
  document.documentElement.dataset.theme = value === "light" ? "light" : "dark";
  window.VoxynTheme = {
    key,
    get: () => document.documentElement.dataset.theme === "dark" ? "dark" : "light",
    set: value => {
      const safe = value === "dark" ? "dark" : "light";
      document.documentElement.dataset.theme = safe;
      try { localStorage.setItem(key, safe); } catch (_) { /* visual preference still applies */ }
      return safe;
    },
  };
})();
