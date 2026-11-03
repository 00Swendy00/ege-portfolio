'use strict';
try {
  document.documentElement.dataset.theme = localStorage.getItem('ege-theme') === 'dark' ? 'dark' : 'light';
} catch (_) {
  document.documentElement.dataset.theme = 'light';
}
