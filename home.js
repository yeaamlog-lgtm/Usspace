/* =========================================================
   USSPACE — HOME.JS
   Home Dashboard Logic
   ========================================================= */

"use strict";


/* =========================================================
   LOGIN PROTECTION
   ========================================================= */

const currentUser =
    localStorage.getItem("usspace_user");

const loggedIn =
    localStorage.getItem("usspace_logged_in");


if (
    !currentUser ||
    loggedIn !== "true"
) {
    window.location.replace("index.html");
}


/* =========================================================
   BASIC ELEMENTS
   ========================================================= */

const usernameDisplay =
    document.getElementById("usernameDisplay");

const logoutButton =
    document.getElementById("logoutButton");

const connectionDot =
    document.getElementById("connectionDot");

const connectionText =
    document.getElementById("connectionText");

const sakuraContainer =
    document.getElementById("sakuraContainer");


/* =========================================================
   DISPLAY USER
   ========================================================= */

if (usernameDisplay && currentUser) {

    usernameDisplay.textContent =
        currentUser;
}


/* =========================================================
   ROOM
   ========================================================= */

let roomCode =
    localStorage.getItem("usspace_room");

if (!roomCode) {

    roomCode =
        Math.floor(
            1000 +
            Math.random() * 9000
        ).toString();

    localStorage.setItem(
        "usspace_room",
        roomCode
    );
}


/* =========================================================
   SOCKET.IO
   ========================================================= */

let socket = null;

try {

    if (
        typeof io === "function"
    ) {

        socket = io();

    }

} catch (error) {

    console.log(
        "Socket connection unavailable:",
        error
    );
}


/* =========================================================
   CONNECTION STATUS
   ========================================================= */

function setConnectionStatus(
    status,
    text
) {

    if (connectionText) {
        connectionText.textContent = text;
    }

    if (!connectionDot) return;


    connectionDot.classList.remove(
        "connected",
        "connecting",
        "offline"
    );


    connectionDot.classList.add(
        status
    );
}


if (socket) {

    setConnectionStatus(
        "connecting",
        "Connecting..."
    );


    socket.on(
        "connect",
        () => {

            setConnectionStatus(
                "connected",
                "Connected"
            );


            socket.emit(
                "join-room",
                {
                    room: roomCode,
                    username: currentUser
                }
            );
        }
    );


    socket.on(
        "disconnect",
        () => {

            setConnectionStatus(
                "offline",
                "Offline"
            );
        }
    );


    socket.on(
        "connect_error",
        () => {

            setConnectionStatus(
                "offline",
                "Server unavailable"
            );
        }
    );

} else {

    setConnectionStatus(
        "offline",
        "Offline"
    );
}


/* =========================================================
   LOGOUT
   ========================================================= */

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        () => {

            localStorage.removeItem(
                "usspace_logged_in"
            );

            localStorage.removeItem(
                "usspace_user"
            );

            /*
               Keep room code so the same
               private space can be reused.
            */

            document.body.style.transition =
                "opacity .3s ease";

            document.body.style.opacity =
                "0";


            setTimeout(
                () => {

                    window.location.replace(
                        "index.html"
                    );

                },
                300
            );
        }
    );
}


/* =========================================================
   CAMERA
   ========================================================= */

const localVideo =
    document.getElementById("localVideo");

const localPlaceholder =
    document.getElementById(
        "localPlaceholder"
    );

const cameraButton =
    document.getElementById(
        "cameraButton"
    );

const switchCameraButton =
    document.getElementById(
        "switchCameraButton"
    );

const cameraStatus =
    document.getElementById(
        "cameraStatus"
    );


let localStream = null;

let cameraEnabled = false;

let currentFacingMode = "user";


/* =========================================================
   CAMERA STATUS
   ========================================================= */

function updateCameraUI() {

    if (!localPlaceholder) return;


    if (cameraEnabled) {

        localPlaceholder.style.opacity =
            "0";

        localPlaceholder.style.pointerEvents =
            "none";

        if (cameraButton) {
            cameraButton.textContent =
                "📷";
        }

        if (cameraStatus) {
            cameraStatus.textContent =
                "Camera ON";
        }

    } else {

        localPlaceholder.style.opacity =
            "1";

        localPlaceholder.style.pointerEvents =
            "auto";

        if (cameraButton) {
            cameraButton.textContent =
                "📷";
        }

        if (cameraStatus) {
            cameraStatus.textContent =
                "Camera OFF";
        }
    }
}


/* =========================================================
   START CAMERA
   ========================================================= */

async function startCamera() {

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        if (cameraStatus) {
            cameraStatus.textContent =
                "Camera not supported";
        }

        return;
    }


    try {

        if (localStream) {

            localStream
                .getTracks()
                .forEach(
                    track => track.stop()
                );
        }


        localStream =
            await navigator.mediaDevices.getUserMedia(
                {
                    video: {
                        facingMode:
                            currentFacingMode
                    },

                    audio: false
                }
            );


        if (localVideo) {

            localVideo.srcObject =
                localStream;
        }


        cameraEnabled = true;

        updateCameraUI();


        if (socket) {

            socket.emit(
                "camera-state",
                {
                    room: roomCode,
                    username: currentUser,
                    enabled: true
                }
            );
        }

    } catch (error) {

        console.log(
            "Camera error:",
            error
        );


        cameraEnabled = false;

        updateCameraUI();


        if (cameraStatus) {

            if (
                error.name ===
                "NotAllowedError"
            ) {

                cameraStatus.textContent =
                    "Camera permission denied";

            } else {

                cameraStatus.textContent =
                    "Unable to open camera";
            }
        }
    }
}


/* =========================================================
   STOP CAMERA
   ========================================================= */

function stopCamera() {

    if (!localStream) return;


    localStream
        .getVideoTracks()
        .forEach(
            track => {
                track.enabled = false;
            }
        );


    cameraEnabled = false;

    updateCameraUI();


    if (socket) {

        socket.emit(
            "camera-state",
            {
                room: roomCode,
                username: currentUser,
                enabled: false
            }
        );
    }
}


/* =========================================================
   CAMERA ON / OFF
   ========================================================= */

if (cameraButton) {

    cameraButton.addEventListener(
        "click",
        async () => {

            if (!localStream) {

                await startCamera();

                return;
            }


            const videoTracks =
                localStream.getVideoTracks();


            if (!videoTracks.length) {

                await startCamera();

                return;
            }


            cameraEnabled =
                !cameraEnabled;


            videoTracks.forEach(
                track => {
                    track.enabled =
                        cameraEnabled;
                }
            );


            updateCameraUI();


            if (socket) {

                socket.emit(
                    "camera-state",
                    {
                        room: roomCode,
                        username: currentUser,
                        enabled:
                            cameraEnabled
                    }
                );
            }
        }
    );
}


/* =========================================================
   SWITCH CAMERA
   ========================================================= */

if (switchCameraButton) {

    switchCameraButton.addEventListener(
        "click",
        async () => {

            currentFacingMode =
                currentFacingMode === "user"
                    ? "environment"
                    : "user";


            await startCamera();
        }
    );
}


/* =========================================================
   CHAT
   ========================================================= */

const chatForm =
    document.getElementById("chatForm");

const chatInput =
    document.getElementById("chatInput");

const chatMessages =
    document.getElementById("chatMessages");

const emptyChat =
    document.getElementById("emptyChat");


/* =========================================================
   ADD MESSAGE
   ========================================================= */

function addMessage(
    username,
    message,
    mine = false
) {

    if (!chatMessages) return;


    if (emptyChat) {
        emptyChat.remove();
    }


    const messageElement =
        document.createElement("div");


    messageElement.className =
        "chat-message" +
        (mine ? " mine" : "");


    const sender =
        document.createElement("small");

    sender.textContent =
        mine
            ? "YOU"
            : username;


    const text =
        document.createElement("span");

    text.textContent =
        message;


    messageElement.appendChild(
        sender
    );

    messageElement.appendChild(
        text
    );


    chatMessages.appendChild(
        messageElement
    );


    chatMessages.scrollTo(
        {
            top:
                chatMessages.scrollHeight,

            behavior:
                "smooth"
        }
    );
}


/* =========================================================
   SEND CHAT
   ========================================================= */

if (chatForm) {

    chatForm.addEventListener(
        "submit",
        event => {

            event.preventDefault();


            if (!chatInput) return;


            const message =
                chatInput.value.trim();


            if (!message) return;


            /*
               Maximum 500 characters.
            */

            const cleanMessage =
                message.slice(0, 500);


            if (socket) {

                socket.emit(
                    "chat-message",
                    {
                        room: roomCode,
                        username: currentUser,
                        message:
                            cleanMessage
                    }
                );

            } else {

                /*
                   Local fallback so the UI
                   still works without server.
                */

                addMessage(
                    currentUser,
                    cleanMessage,
                    true
                );
            }


            chatInput.value = "";

            chatInput.focus();
        }
    );
}


/* =========================================================
   RECEIVE CHAT
   ========================================================= */

if (socket) {

    socket.on(
        "chat-message",
        data => {

            if (!data) return;


            const isMine =
                data.username ===
                currentUser;


            addMessage(
                data.username ||
                    "Partner",

                data.message ||
                    "",

                isMine
            );
        }
    );
}


/* =========================================================
   PARTNER CAMERA STATUS
   ========================================================= */

const partnerStatus =
    document.getElementById(
        "partnerStatus"
    );

const remotePlaceholder =
    document.getElementById(
        "remotePlaceholder"
    );


if (socket) {

    socket.on(
        "partner-camera-state",
        data => {

            if (!data) return;


            if (data.enabled) {

                if (partnerStatus) {

                    partnerStatus.textContent =
                        "Camera on";
                }

            } else {

                if (partnerStatus) {

                    partnerStatus.textContent =
                        "Camera off";
                }
            }
        }
    );


    socket.on(
        "partner-joined",
        data => {

            if (partnerStatus) {

                partnerStatus.textContent =
                    "Partner is here 🌸";
            }


            showBlossomNotification(
                "Your partner joined 🌸"
            );
        }
    );


    socket.on(
        "partner-left",
        () => {

            if (partnerStatus) {

                partnerStatus.textContent =
                    "Waiting to join";
            }


            showBlossomNotification(
                "Partner left the space"
            );
        }
    );
}


/* =========================================================
   WEATHER
   ========================================================= */

const shareWeatherButton =
    document.getElementById(
        "shareWeatherButton"
    );

const myWeatherIcon =
    document.getElementById(
        "myWeatherIcon"
    );

const myTemperature =
    document.getElementById(
        "myTemperature"
    );

const myWeatherLocation =
    document.getElementById(
        "myWeatherLocation"
    );


const partnerWeatherIcon =
    document.getElementById(
        "partnerWeatherIcon"
    );

const partnerTemperature =
    document.getElementById(
        "partnerTemperature"
    );

const partnerWeatherLocation =
    document.getElementById(
        "partnerWeatherLocation"
    );


/* =========================================================
   WEATHER ICON
   ========================================================= */

function weatherIcon(code) {

    if (code === 0) {
        return "☀️";
    }

    if (
        code >= 1 &&
        code <= 3
    ) {
        return "🌤️";
    }

    if (
        code >= 45 &&
        code <= 48
    ) {
        return "🌫️";
    }

    if (
        code >= 51 &&
        code <= 67
    ) {
        return "🌧️";
    }

    if (
        code >= 71 &&
        code <= 77
    ) {
        return "❄️";
    }

    if (
        code >= 80 &&
        code <= 82
    ) {
        return "🌦️";
    }

    if (
        code >= 95
    ) {
        return "⛈️";
    }

    return "🌸";
}


/* =========================================================
   SHARE WEATHER
   ========================================================= */

async function shareWeather() {

    if (!navigator.geolocation) {

        if (myWeatherLocation) {

            myWeatherLocation.textContent =
                "Location unavailable";
        }

        return;
    }


    if (shareWeatherButton) {

        shareWeatherButton.disabled =
            true;

        shareWeatherButton.textContent =
            "🌤️ Getting weather...";
    }


    navigator.geolocation.getCurrentPosition(
        async position => {

            const latitude =
                position.coords.latitude;

            const longitude =
                position.coords.longitude;


            try {

                const url =
                    "https://api.open-meteo.com/v1/forecast" +
                    `?latitude=${latitude}` +
                    `&longitude=${longitude}` +
                    "&current=temperature_2m,weather_code" +
                    "&timezone=auto";


                const response =
                    await fetch(url);


                if (!response.ok) {
                    throw new Error(
                        "Weather request failed"
                    );
                }


                const data =
                    await response.json();


                const temperature =
                    Math.round(
                        data.current.temperature_2m
                    );


                const code =
                    data.current.weather_code;


                const icon =
                    weatherIcon(code);


                if (myWeatherIcon) {
                    myWeatherIcon.textContent =
                        icon;
                }


                if (myTemperature) {

                    myTemperature.textContent =
                        `${temperature}°C`;
                }


                if (myWeatherLocation) {

                    myWeatherLocation.textContent =
                        "Shared from your location";
                }


                if (socket) {

                    socket.emit(
                        "weather-share",
                        {
                            room: roomCode,
                            username: currentUser,
                            temperature,
                            code,
                            icon
                        }
                    );
                }


                if (shareWeatherButton) {

                    shareWeatherButton.textContent =
                        "✓ Weather Shared";
                }

            } catch (error) {

                console.log(
                    "Weather error:",
                    error
                );


                if (myWeatherLocation) {

                    myWeatherLocation.textContent =
                        "Weather unavailable";
                }


                if (shareWeatherButton) {

                    shareWeatherButton.textContent =
                        "🌤️ Try Again";
                }

            } finally {

                if (shareWeatherButton) {

                    shareWeatherButton.disabled =
                        false;
                }
            }
        },

        error => {

            console.log(
                "Location error:",
                error
            );


            if (myWeatherLocation) {

                myWeatherLocation.textContent =
                    "Location permission needed";
            }


            if (shareWeatherButton) {

                shareWeatherButton.disabled =
                    false;

                shareWeatherButton.textContent =
                    "🌤️ Try Again";
            }
        },

        {
            enableHighAccuracy: false,

            timeout: 10000,

            maximumAge: 300000
        }
    );
}


if (shareWeatherButton) {

    shareWeatherButton.addEventListener(
        "click",
        shareWeather
    );
}


/* =========================================================
   RECEIVE PARTNER WEATHER
   ========================================================= */

if (socket) {

    socket.on(
        "weather-share",
        data => {

            if (!data) return;


            if (partnerWeatherIcon) {

                partnerWeatherIcon.textContent =
                    data.icon ||
                    weatherIcon(
                        data.code
                    );
            }


            if (partnerTemperature) {

                partnerTemperature.textContent =
                    `${data.temperature}°C`;
            }


            if (partnerWeatherLocation) {

                partnerWeatherLocation.textContent =
                    "Shared by partner";
            }


            showBlossomNotification(
                "Partner shared their weather 🌤️"
            );
        }
    );
}


/* =========================================================
   TAKE A BREAK
   ========================================================= */

const breakButton =
    document.getElementById(
        "breakButton"
    );

const breakOverlay =
    document.getElementById(
        "breakOverlay"
    );

const closeBreakButton =
    document.getElementById(
        "closeBreakButton"
    );


function openBreak() {

    if (!breakOverlay) return;


    breakOverlay.classList.add(
        "active"
    );

    breakOverlay.setAttribute(
        "aria-hidden",
        "false"
    );
}


function closeBreak() {

    if (!breakOverlay) return;


    breakOverlay.classList.remove(
        "active"
    );

    breakOverlay.setAttribute(
        "aria-hidden",
        "true"
    );
}


if (breakButton) {

    breakButton.addEventListener(
        "click",
        openBreak
    );
}


if (closeBreakButton) {

    closeBreakButton.addEventListener(
        "click",
        closeBreak
    );
}


if (breakOverlay) {

    breakOverlay.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                breakOverlay
            ) {

                closeBreak();
            }
        }
    );
}


/* =========================================================
   SAKURA PETALS
   ========================================================= */

function createPetal() {

    if (!sakuraContainer) return;


    const petal =
        document.createElement("span");


    petal.className =
        "sakura-petal";


    petal.style.left =
        Math.random() * 100 + "vw";


    const size =
        7 + Math.random() * 9;


    petal.style.width =
        `${size}px`;


    petal.style.height =
        `${size * .7}px`;


    petal.style.opacity =
        .25 +
        Math.random() * .4;


    const duration =
        7 +
        Math.random() * 7;


    petal.style.animationDuration =
        `${duration}s`;


    petal.style.animationDelay =
        `${Math.random() * 1.5}s`;


    sakuraContainer.appendChild(
        petal
    );


    setTimeout(
        () => petal.remove(),
        (duration + 2) * 1000
    );
}


for (
    let i = 0;
    i < 15;
    i++
) {

    setTimeout(
        createPetal,
        i * 180
    );
}


setInterval(
    createPetal,
    900
);


/* =========================================================
   BLOSSOM NOTIFICATION
   ========================================================= */

function showBlossomNotification(
    message
) {

    const old =
        document.querySelector(
            ".blossom-notification"
        );


    if (old) {
        old.remove();
    }


    const notification =
        document.createElement("div");


    notification.className =
        "blossom-notification";


    notification.textContent =
        message;


    notification.style.cssText = `
        position: fixed;
        top: 76px;
        left: 50%;
        transform: translateX(-50%) translateY(-15px);
        z-index: 200;
        padding: 11px 16px;
        border-radius: 18px;
        background: rgba(255,255,255,.92);
        border: 1px solid rgba(238,190,207,.65);
        box-shadow: 0 15px 35px rgba(170,80,115,.16);
        color: #73495a;
        font-size: 10px;
        font-weight: 800;
        backdrop-filter: blur(15px);
        opacity: 0;
        transition: opacity .3s ease, transform .3s ease;
    `;


    document.body.appendChild(
        notification
    );


    requestAnimationFrame(
        () => {

            notification.style.opacity =
                "1";

            notification.style.transform =
                "translateX(-50%) translateY(0)";
        }
    );


    setTimeout(
        () => {

            notification.style.opacity =
                "0";

            notification.style.transform =
                "translateX(-50%) translateY(-10px)";


            setTimeout(
                () => notification.remove(),
                350
            );

        },
        2800
    );
}


/* =========================================================
   PAGE VISIBILITY
   ========================================================= */

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.hidden &&
            localStream
        ) {

            /*
               Keep camera state controlled
               by the user. We don't secretly
               turn it off.
            */
        }
    }
);


/* =========================================================
   PAGE EXIT
   ========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        if (localStream) {

            localStream
                .getTracks()
                .forEach(
                    track => track.stop()
                );
        }
    }
);


/* =========================================================
   INITIAL UI
   ========================================================= */

updateCameraUI();

console.log(
    "USSPACE Home loaded for:",
    currentUser
);