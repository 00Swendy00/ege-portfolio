"use strict";

// ======================
// LOADER
// ======================
window.addEventListener("load", () => {
const loader = document.getElementById("loader");

```
if (!loader) return;

setTimeout(() => {
    loader.style.opacity = "0";
    loader.style.pointerEvents = "none";

    setTimeout(() => {
        loader.style.display = "none";
    }, 1000);

}, 2500);
```

});

// ======================
// CURSOR GLOW
// ======================
document.addEventListener("DOMContentLoaded", () => {
const glow = document.querySelector(".cursor-glow");

```
if (!glow) return;

document.addEventListener("mousemove", (e) => {
    glow.style.left = e.clientX + "px";
    glow.style.top = e.clientY + "px";
});
```

});

// ======================
// MATRIX RAIN
// ======================
const canvas = document.getElementById("matrix-rain");

if (canvas) {

```
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

resizeCanvas();

const letters =
    "ESP32ARDUINOIOTHTMLCSSJS0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const fontSize = 16;
let columns = Math.floor(canvas.width / fontSize);
let drops = [];

function resetDrops() {
    drops = [];
    columns = Math.floor(canvas.width / fontSize);

    for (let i = 0; i < columns; i++) {
        drops[i] = Math.random() * canvas.height;
    }
}

resetDrops();

function drawMatrix() {

    ctx.fillStyle = "rgba(5,8,22,0.08)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#00ff88";
    ctx.font = fontSize + "px monospace";

    for (let i = 0; i < drops.length; i++) {

        const text =
            letters[Math.floor(Math.random() * letters.length)];

        ctx.fillText(
            text,
            i * fontSize,
            drops[i]
        );

        if (
            drops[i] > canvas.height &&
            Math.random() > 0.975
        ) {
            drops[i] = 0;
        }

        drops[i] += fontSize;
    }
}

setInterval(drawMatrix, 35);

window.addEventListener("resize", () => {
    resizeCanvas();
    resetDrops();
});
```

}
