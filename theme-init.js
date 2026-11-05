'use strict';
// Keep bookmarked index URLs on the clean directory address without reloading.
(() => {
  const {protocol, pathname, search, hash} = window.location;
  if (!/^https?:$/.test(protocol) || !/\/index\.html$/i.test(pathname)) return;
  try {
    window.history.replaceState(window.history.state, '', pathname.slice(0, -10) + search + hash);
  } catch (_) {}
})();
try {
  document.documentElement.dataset.theme = localStorage.getItem('ege-theme') === 'dark' ? 'dark' : 'light';
} catch (_) {
  document.documentElement.dataset.theme = 'light';
}
try {
  document.documentElement.lang = localStorage.getItem('ege-language') === 'en' ? 'en' : 'tr';
} catch (_) {
  document.documentElement.lang = 'tr';
}
