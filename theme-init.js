'use strict';
// Keep bookmarked HTML URLs on their published directory addresses.
(() => {
  const {protocol, pathname, search, hash} = window.location;
  if (!/^https?:$/.test(protocol) || !/\.html$/i.test(pathname)) return;
  try {
    const clean=/\/index\.html$/i.test(pathname)?pathname.slice(0,-10):pathname.slice(0,-5)+'/';
    window.history.replaceState(window.history.state, '', clean + search + hash);
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
