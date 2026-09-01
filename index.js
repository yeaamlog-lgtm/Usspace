/* =========================================================
   USSPACE — INDEX.JS
   Login + Remember Me + Sakura Petals
   ========================================================= */

"use strict";


/* =========================================================
   USER ACCOUNTS
   ========================================================= */

const USERS = {
    prakhar: "31 july",
    pratishtha: "31 july"
};


/* =========================================================
   ELEMENTS
   ========================================================= */

const loginForm = document.getElementById("loginForm");

const usernameInput = document.getElementById("username");

const passwordInput = document.getElementById("password");

const togglePassword =
    document.getElementById("togglePassword");

const enterButton =
    document.getElementById("enterButton");

const loginError =
    document.getElementById("loginError");

const sakuraContainer =
    document.getElementById("sakuraContainer");


/* =========================================================
   REMEMBERED LOGIN
   ========================================================= */

const savedUser =
    localStorage.getItem("usspace_user");

const savedLogin =
    localStorage.getItem("usspace_logged_in");


/*
   If the user has already logged in,
   don't ask for the password again.
*/

if (
    savedUser &&
    savedLogin === "true" &&
    USERS[savedUser]
) {

    window.location.replace("home.html");
}


/* =========================================================
   PASSWORD SHOW / HIDE
   ========================================================= */

if (togglePassword) {

    togglePassword.addEventListener(
        "click",
        () => {

            const isPassword =
                passwordInput.type === "password";

            passwordInput.type =
                isPassword
                    ? "text"
                    : "password";

            togglePassword.textContent =
                isPassword
                    ? "🙈"
                    : "👁";

            togglePassword.setAttribute(
                "aria-label",
                isPassword
                    ? "Hide password"
                    : "Show password"
            );
        }
    );
}


/* =========================================================
   LOGIN
   ========================================================= */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        (event) => {

            event.preventDefault();


            const username =
                usernameInput.value.trim();

            const password =
                passwordInput.value;


            /* Clear previous error */

            loginError.textContent = "";


            /* Validate username */

            if (!username || !USERS[username]) {

                showError(
                    "Please choose your name 🌸"
                );

                return;
            }


            /* Validate password */

            if (USERS[username] !== password) {

                showError(
                    "Wrong password… try again 🌸"
                );

                shakeLogin();

                passwordInput.value = "";

                passwordInput.focus();

                return;
            }


            /* =================================================
               SUCCESS
               ================================================= */

            localStorage.setItem(
                "usspace_user",
                username
            );

            localStorage.setItem(
                "usspace_logged_in",
                "true"
            );


            /*
               Create a room code only once.
               Both users can use the same room.
            */

            if (
                !localStorage.getItem(
                    "usspace_room"
                )
            ) {

                const roomCode =
                    Math.floor(
                        1000 +
                        Math.random() * 9000
                    ).toString();

                localStorage.setItem(
                    "usspace_room",
                    roomCode
                );
            }


            /* Button animation */

            enterButton.classList.add(
                "success"
            );

            enterButton.querySelector(
                "span"
            ).textContent =
                "WELCOME ♡";


            /*
               Small delay makes the
               transition feel smoother.
            */

            setTimeout(
                () => {

                    window.location.replace(
                        "home.html"
                    );

                },
                450
            );
        }
    );
}


/* =========================================================
   ERROR MESSAGE
   ========================================================= */

function showError(message) {

    loginError.textContent = message;

    loginError.style.animation = "none";

    void loginError.offsetWidth;

    loginError.style.animation =
        "errorAppear .25s ease";
}


/* =========================================================
   LOGIN SHAKE
   ========================================================= */

function shakeLogin() {

    const card =
        document.querySelector(
            ".login-card"
        );

    if (!card) return;


    card.classList.remove("shake");

    /*
       Force browser reflow so the animation
       works every single time.
    */

    void card.offsetWidth;

    card.classList.add("shake");


    setTimeout(
        () => {

            card.classList.remove(
                "shake"
            );

        },
        500
    );
}


/* =========================================================
   SAKURA PETAL SYSTEM
   ========================================================= */

function createPetal() {

    if (!sakuraContainer) return;


    const petal =
        document.createElement("span");

    petal.className =
        "sakura-petal";


    /* Random position */

    petal.style.left =
        Math.random() * 100 + "vw";


    /* Random size */

    const size =
        7 + Math.random() * 10;

    petal.style.width =
        size + "px";

    petal.style.height =
        size * 0.72 + "px";


    /* Random opacity */

    petal.style.opacity =
        0.25 + Math.random() * 0.45;


    /* Random animation speed */

    const duration =
        7 + Math.random() * 7;

    petal.style.animationDuration =
        duration + "s";


    /* Random delay */

    petal.style.animationDelay =
        Math.random() * 1.5 + "s";


    /* Slight random rotation */

    petal.style.transform =
        `rotate(${Math.random() * 360}deg)`;


    sakuraContainer.appendChild(
        petal
    );


    /*
       Remove after animation
       so the page doesn't become heavy.
    */

    setTimeout(
        () => {

            petal.remove();

        },
        (duration + 2) * 1000
    );
}


/* =========================================================
   INITIAL PETALS
   ========================================================= */

for (
    let i = 0;
    i < 14;
    i++
) {

    setTimeout(
        createPetal,
        i * 180
    );
}


/* =========================================================
   CONTINUOUS PETALS
   ========================================================= */

setInterval(
    createPetal,
    850
);


/* =========================================================
   EXTRA ERROR ANIMATION
   ========================================================= */

const extraStyle =
    document.createElement("style");

extraStyle.textContent = `

    @keyframes errorAppear {

        from {
            opacity: 0;
            transform: translateY(-4px);
        }

        to {
            opacity: 1;
            transform: translateY(0);
        }

    }

    .enter-button.success {

        transform: scale(0.97);

        box-shadow:
            0 0 30px
            rgba(235, 105, 150, 0.4);

    }

`;

document.head.appendChild(
    extraStyle
);