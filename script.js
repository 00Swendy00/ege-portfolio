// ==========================
// LOADING SCREEN
// ==========================

window.addEventListener("load", function () {

    const loader = document.getElementById("loader");

    if (loader) {

        setTimeout(function () {

            loader.style.opacity = "0";

            setTimeout(function () {

                loader.style.display = "none";

            }, 1000);

        }, 1500);

    }

});

// ==========================
// CURSOR GLOW
// ==========================

const glow = document.querySelector(".cursor-glow");

if (glow) {

    document.addEventListener("mousemove", function (e) {

        glow.style.left = e.clientX + "px";
        glow.style.top = e.clientY + "px";

    });

}

// ==========================
// SCROLL REVEAL
// ==========================

const observer = new IntersectionObserver(function (entries) {

    entries.forEach(function (entry) {

        if (entry.isIntersecting) {

            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0px)";

        }

    });

}, {
    threshold: 0.1
});

document.querySelectorAll("section").forEach(function (section) {

    section.style.opacity = "0";
    section.style.transform = "translateY(80px)";
    section.style.transition = "all 1s ease";

    observer.observe(section);

});

// ==========================
// NAVBAR EFFECT
// ==========================

const navbar = document.querySelector("nav");

window.addEventListener("scroll", function () {

    if (!navbar) return;

    if (window.scrollY > 50) {

        navbar.style.background = "rgba(5,8,22,0.85)";

    } else {

        navbar.style.background = "rgba(0,0,0,.3)";

    }

});

// ==========================
// PROJECT CARD EFFECT
// ==========================

const cards = document.querySelectorAll(".project-card");

cards.forEach(function (card) {

    card.addEventListener("mousemove", function (e) {

        const rect = card.getBoundingClientRect();

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateY = (x - centerX) / 25;
        const rotateX = -(y - centerY) / 25;

        card.style.transform =
            "perspective(1000px) rotateX(" +
            rotateX +
            "deg) rotateY(" +
            rotateY +
            "deg) translateY(-10px)";

    });

    card.addEventListener("mouseleave", function () {

        card.style.transform =
            "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)";

    });

});

// ==========================
// TS PARTICLES
// ==========================

if (typeof tsParticles !== "undefined") {

    tsParticles.load("tsparticles", {

        particles: {
            number: {
                value: 80
            },
            color: {
                value: "#00c6ff"
            },
            links: {
                enable: true,
                color: "#00c6ff",
                distance: 150,
                opacity: 0.4
            },
            move: {
                enable: true,
                speed: 2
            },
            size: {
                value: 2
            }
        },

        interactivity: {
            events: {
                onHover: {
                    enable: true,
                    mode: "grab"
                }
            },
            modes: {
                grab: {
                    distance: 180,
                    links: {
                        opacity: 0.8
                    }
                }
            }
        }

    });

}
