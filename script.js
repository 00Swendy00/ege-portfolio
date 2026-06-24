// LOADING SCREEN

window.addEventListener("load", () => {

    setTimeout(() => {

        document.getElementById("loader").style.opacity = "0";

        setTimeout(() => {

            document.getElementById("loader").style.display = "none";

        }, 1000);

    }, 3000);

});


// MOUSE GLOW

const glow = document.querySelector(".cursor-glow");

document.addEventListener("mousemove", (e) => {

    glow.style.left = e.clientX + "px";
    glow.style.top = e.clientY + "px";

});


// SCROLL REVEAL

const observer = new IntersectionObserver((entries) => {

    entries.forEach(entry => {

        if (entry.isIntersecting) {

            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0px)";

        }

    });

}, {
    threshold: 0.1
});

document.querySelectorAll("section").forEach(section => {

    section.style.opacity = "0";
    section.style.transform = "translateY(80px)";
    section.style.transition = "1s";

    observer.observe(section);

});


// PARALLAX HERO

window.addEventListener("scroll", () => {

    const scrolled = window.pageYOffset;

    const hero = document.querySelector(".hero");

    hero.style.backgroundPositionY = scrolled * 0.5 + "px";

});


// PROJECT CARD EFFECT

const cards = document.querySelectorAll(".project-card");

cards.forEach(card => {

    card.addEventListener("mousemove", (e) => {

        const rect = card.getBoundingClientRect();

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateY = (x - centerX) / 25;
        const rotateX = -(y - centerY) / 25;

        card.style.transform =
            `perspective(1000px)
             rotateX(${rotateX}deg)
             rotateY(${rotateY}deg)
             translateY(-10px)`;

    });

    card.addEventListener("mouseleave", () => {

        card.style.transform =
            "perspective(1000px) rotateX(0) rotateY(0)";

    });

});
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
distance: 150
},

move: {
enable: true,
speed: 2
},

size: {
value: 2
}

}

});