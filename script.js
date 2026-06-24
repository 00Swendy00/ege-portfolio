```js
"use strict";

// =========================
// LOADER
// =========================
window.addEventListener("load", () => {
    const loader = document.getElementById("loader");

    if (!loader) return;

    setTimeout(() => {
        loader.style.opacity = "0";

        setTimeout(() => {
            loader.style.display = "none";
        }, 1000);

    }, 2500);
});

// =========================
// CURSOR GLOW
// =========================
document.addEventListener("DOMContentLoaded", () => {
    const glow = document.querySelector(".cursor-glow");

    if (!glow) return;

    document.addEventListener("mousemove", (e) => {
        glow.style.left = `${e.clientX}px`;
        glow.style.top = `${e.clientY}px`;
    });
});
```
