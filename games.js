/* =========================================================
   USSPACE • GAMES.JS
   Standalone Games Page
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       GAME ROUTES
       ===================================================== */

    const gameRoutes = {

        "draw-guess": "draw.html",

        "tic-tac-toe": "tictactoe.html",

        "connect-four": "connect4.html",

        "emoji-guess": "emoji.html",

        "memory-match": "memory.html",

        "dots": "dots.html",

        "guess": "guess.html"

    };


    /* =====================================================
       GAME CARD NAVIGATION
       ===================================================== */

    const gameCards =
        document.querySelectorAll(".game-card");


    gameCards.forEach(card => {

        card.addEventListener("click", () => {

            const game =
                card.dataset.game;

            const destination =
                gameRoutes[game];


            if (!destination) {
                console.warn(
                    "Game route not found:",
                    game
                );

                return;
            }


            /* Small click animation */

            card.style.transform =
                "scale(0.98)";


            setTimeout(() => {

                window.location.href =
                    destination;

            }, 120);

        });

    });



    /* =====================================================
       PLAYER NAME
       ===================================================== */

    const playerName =
        document.getElementById("playerName");


    try {

        const savedName =
            localStorage.getItem("usspace_player_name");


        if (savedName && playerName) {

            playerName.textContent =
                savedName;

        }

    } catch (error) {

        console.log(
            "Player name unavailable."
        );

    }



    /* =====================================================
       PARTNER STATUS
       ===================================================== */

    const partnerStatus =
        document.getElementById(
            "partnerStatus"
        );


    function updatePartnerStatus() {

        if (!partnerStatus) {
            return;
        }


        /*
         * server.js can later update this
         * using Socket.IO.
         *
         * For now we keep the UI
         * in a safe offline state.
         */

        const partnerOnline =
            localStorage.getItem(
                "usspace_partner_online"
            );


        if (partnerOnline === "true") {

            partnerStatus.classList.add(
                "online"
            );

        } else {

            partnerStatus.classList.remove(
                "online"
            );

        }

    }


    updatePartnerStatus();



    /* =====================================================
       SAKURA PETALS
       ===================================================== */

    const sakuraContainer =
        document.getElementById(
            "sakuraContainer"
        );


    function createSakuraPetal() {

        if (!sakuraContainer) {
            return;
        }


        const petal =
            document.createElement("span");


        petal.className =
            "sakura-petal";


        const size =
            Math.random() * 7 + 7;


        const left =
            Math.random() * 100;


        const duration =
            Math.random() * 7 + 7;


        const delay =
            Math.random() * 2;


        const drift =
            Math.random() * 160 - 80;


        petal.style.left =
            `${left}%`;


        petal.style.width =
            `${size}px`;


        petal.style.height =
            `${size * 0.72}px`;


        petal.style.animationDuration =
            `${duration}s`;


        petal.style.animationDelay =
            `${delay}s`;


        petal.style.setProperty(
            "--drift",
            `${drift}px`
        );


        sakuraContainer.appendChild(
            petal
        );


        setTimeout(() => {

            petal.remove();

        }, (duration + delay) * 1000);

    }


    /* Initial petals */

    for (let i = 0; i < 14; i++) {

        setTimeout(
            createSakuraPetal,
            i * 250
        );

    }


    /* Continuous petals */

    setInterval(
        createSakuraPetal,
        700
    );



    /* =====================================================
       PAGE VISIBILITY
       ===================================================== */

    document.addEventListener(
        "visibilitychange",
        () => {

            if (
                document.hidden
            ) {

                document
                    .querySelectorAll(
                        ".sakura-petal"
                    )
                    .forEach(
                        petal => {
                            petal.style
                                .animationPlayState =
                                "paused";
                        }
                    );

            } else {

                document
                    .querySelectorAll(
                        ".sakura-petal"
                    )
                    .forEach(
                        petal => {
                            petal.style
                                .animationPlayState =
                                "running";
                        }
                    );

            }

        }
    );



    /* =====================================================
       KEYBOARD ACCESSIBILITY
       ===================================================== */

    gameCards.forEach(card => {

        card.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {

                    event.preventDefault();

                    card.click();

                }

            }
        );

    });



    /* =====================================================
       DEBUG
       ===================================================== */

    console.log(
        "🌸 USSPACE Games loaded successfully."
    );

});