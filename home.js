/* =========================================================
   USSPACE • HOME.JS
   ========================================================= */

const socket = io(window.location.origin);
let username =
    localStorage.getItem("usspace_username") || "";

let inviteCode =
    localStorage.getItem("usspace_invite_code") || "";

let roomJoined = false;


/* =========================================================
   ELEMENTS
   ========================================================= */

const $ = id => document.getElementById(id);

const connectionDot = $("connectionDot");
const connectionText = $("connectionText");

const usernameDisplay = $("usernameDisplay");

const roomDisplay = $("roomDisplay");
const roomStatus = $("roomStatus");

const partnerStatus = $("partnerStatus");

const inviteOverlay = $("inviteOverlay");
const inviteButton = $("inviteButton");
const closeInviteButton = $("closeInviteButton");

const inviteName = $("inviteName");
const inviteCodeInput = $("inviteCode");

const inviteError = $("inviteError");
const joinSpaceButton = $("joinSpaceButton");

const logoutButton = $("logoutButton");


/* =========================================================
   INITIAL USER
   ========================================================= */

if (username) {
    usernameDisplay.textContent = username;
}

if (inviteCode) {
    roomDisplay.textContent =
        "US-" + inviteCode.toUpperCase();

    roomStatus.textContent =
        "Private room";
}


/* =========================================================
   INVITE MODAL
   ========================================================= */

function openInvite() {

    inviteOverlay.classList.add("show");

    inviteName.value = username;
    inviteCodeInput.value = inviteCode;

    inviteError.textContent = "";

    setTimeout(() => {
        inviteName.focus();
    }, 100);
}


function closeInvite() {

    inviteOverlay.classList.remove("show");
}


inviteButton.addEventListener(
    "click",
    openInvite
);

closeInviteButton.addEventListener(
    "click",
    closeInvite
);


inviteOverlay.addEventListener(
    "click",
    event => {

        if (event.target === inviteOverlay) {
            closeInvite();
        }

    }
);


/* =========================================================
   JOIN
   ========================================================= */

joinSpaceButton.addEventListener(
    "click",
    joinSpace
);


inviteCodeInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {
            joinSpace();
        }

    }
);


function joinSpace() {

    const name =
        inviteName.value.trim();

    const code =
        inviteCodeInput.value
            .trim()
            .replace(/\s+/g, "")
            .toUpperCase();


    inviteError.textContent = "";


    if (!name) {

        inviteError.textContent =
            "Please enter your name.";

        inviteName.focus();

        return;
    }


    if (name.length < 2) {

        inviteError.textContent =
            "Name is too short.";

        return;
    }


    if (!code) {

        inviteError.textContent =
            "Please enter the invite code.";

        inviteCodeInput.focus();

        return;
    }


    if (code.length < 4) {

        inviteError.textContent =
            "Invite code is too short.";

        return;
    }


    username = name;
    inviteCode = code;


    localStorage.setItem(
        "usspace_username",
        username
    );

    localStorage.setItem(
        "usspace_invite_code",
        inviteCode
    );


    usernameDisplay.textContent =
        username;


    roomDisplay.textContent =
        "US-" + inviteCode;


    roomStatus.textContent =
        "Connecting to private space...";


    joinSpaceButton.disabled = true;

    joinSpaceButton.textContent =
        "🌸 Joining...";


    /*
       SERVER EVENT

       server.js should listen for:
       "join-space"

       and return:
       "space-joined"
       OR
       "space-error"
    */

    socket.emit(
        "join-space",
        {
            username: username,
            inviteCode: inviteCode
        }
    );

}


/* =========================================================
   SOCKET CONNECTION
   ========================================================= */

socket.on(
    "connect",
    () => {

        connectionDot.classList.add(
            "connected"
        );

        connectionText.textContent =
            "Connected";


        if (
            username &&
            inviteCode &&
            !roomJoined
        ) {

            socket.emit(
                "join-space",
                {
                    username,
                    inviteCode
                }
            );

        }

    }
);


socket.on(
    "disconnect",
    () => {

        connectionDot.classList.remove(
            "connected"
        );

        connectionText.textContent =
            "Offline";

        roomStatus.textContent =
            "Connection lost.";

        partnerStatus.textContent =
            "Waiting to join";

    }
);


/* =========================================================
   SPACE JOINED
   ========================================================= */

socket.on(
    "space-joined",
    data => {

        roomJoined = true;


        joinSpaceButton.disabled = false;

        joinSpaceButton.textContent =
            "🌸 Joined";


        closeInvite();


        roomStatus.textContent =
            "Private space connected ♡";


        if (data && data.partner) {

            partnerStatus.textContent =
                data.partner + " is here ♡";

        } else {

            partnerStatus.textContent =
                "Waiting for partner";

        }

    }
);


/* =========================================================
   SPACE ERROR
   ========================================================= */

socket.on(
    "space-error",
    message => {

        roomJoined = false;


        joinSpaceButton.disabled = false;

        joinSpaceButton.textContent =
            "🌸 Join Space";


        inviteError.textContent =
            message ||
            "Unable to join this space.";

        roomStatus.textContent =
            "Could not join space.";

    }
);


/* =========================================================
   PARTNER JOIN
   ========================================================= */

socket.on(
    "partner-joined",
    data => {

        const name =
            data?.username ||
            "Partner";


        partnerStatus.textContent =
            name + " is here ♡";


        roomStatus.textContent =
            "Both of you are together 🌸";


        systemMessage(
            name + " joined your space 🌸"
        );

    }
);


/* =========================================================
   PARTNER LEFT
   ========================================================= */

socket.on(
    "partner-left",
    () => {

        partnerStatus.textContent =
            "Waiting to join";

        roomStatus.textContent =
            "Waiting for partner";

        systemMessage(
            "Your partner left the space."
        );

    }
);


/* =========================================================
   CHAT
   ========================================================= */

$("chatForm").addEventListener(
    "submit",
    event => {

        event.preventDefault();


        const input = $("chatInput");

        const message =
            input.value.trim();


        if (!message) {
            return;
        }


        if (!roomJoined) {

            systemMessage(
                "Join your private space first 🌸"
            );

            return;
        }


        socket.emit(
            "chat-message",
            {
                message
            }
        );


        input.value = "";

    }
);


socket.on(
    "chat-message",
    data => {

        if (!data) {
            return;
        }


        addMessage(
            data.username || "Partner",
            data.message || "",
            data.username === username
        );

    }
);


/* =========================================================
   CHAT UI
   ========================================================= */

function addMessage(
    sender,
    message,
    mine
) {

    const messages =
        $("chatMessages");


    $("emptyChat")?.remove();


    const bubble =
        document.createElement("div");


    bubble.className =
        mine
            ? "chat-bubble mine"
            : "chat-bubble partner";


    const name =
        document.createElement("small");


    name.textContent =
        mine
            ? "You"
            : sender;


    const text =
        document.createElement("p");


    text.textContent =
        message;


    bubble.appendChild(name);

    bubble.appendChild(text);


    messages.appendChild(bubble);


    messages.scrollTop =
        messages.scrollHeight;

}


function systemMessage(message) {

    const messages =
        $("chatMessages");


    $("emptyChat")?.remove();


    const item =
        document.createElement("div");


    item.style.textAlign = "center";
    item.style.padding = "8px";
    item.style.fontSize = "7px";
    item.style.color = "#a48791";


    item.textContent =
        message;


    messages.appendChild(item);


    messages.scrollTop =
        messages.scrollHeight;

}


/* =========================================================
   LOGOUT
   ========================================================= */

logoutButton.addEventListener(
    "click",
    () => {

        localStorage.removeItem(
            "usspace_username"
        );

        localStorage.removeItem(
            "usspace_invite_code"
        );


        socket.disconnect();


        window.location.href =
            "index.html";

    }
);


/* =========================================================
   CAMERA
   ========================================================= */

let localStream = null;

let facingMode = "user";


$("cameraButton").addEventListener(
    "click",
    async () => {

        if (localStream) {

            localStream
                .getTracks()
                .forEach(track => track.stop());


            localStream = null;

            $("localVideo").srcObject =
                null;

            $("localPlaceholder").style.display =
                "flex";

            $("cameraStatus").textContent =
                "Camera off";

            return;
        }


        try {

            localStream =
                await navigator.mediaDevices
                    .getUserMedia({
                        video: {
                            facingMode
                        },
                        audio: false
                    });


            $("localVideo").srcObject =
                localStream;


            $("localPlaceholder").style.display =
                "none";


            $("cameraStatus").textContent =
                "Camera on ♡";

        } catch (error) {

            $("cameraStatus").textContent =
                "Camera permission denied";

        }

    }
);


/* =========================================================
   SWITCH CAMERA
   ========================================================= */

$("switchCameraButton").addEventListener(
    "click",
    async () => {

        if (!localStream) {
            return;
        }


        facingMode =
            facingMode === "user"
                ? "environment"
                : "user";


        localStream
            .getTracks()
            .forEach(track => track.stop());


        try {

            localStream =
                await navigator.mediaDevices
                    .getUserMedia({
                        video: {
                            facingMode
                        },
                        audio: false
                    });


            $("localVideo").srcObject =
                localStream;

        } catch (error) {

            $("cameraStatus").textContent =
                "Could not switch camera";

        }

    }
);


/* =========================================================
   WEATHER LOCATION
   ========================================================= */

$("shareWeatherButton").addEventListener(
    "click",
    () => {

        if (!navigator.geolocation) {

            $("myWeatherLocation").textContent =
                "Location unavailable";

            return;
        }


        $("shareWeatherButton").textContent =
            "📍 Getting location...";


        navigator.geolocation.getCurrentPosition(
            position => {

                const location = {
                    latitude:
                        position.coords.latitude,

                    longitude:
                        position.coords.longitude
                };


                socket.emit(
                    "share-location",
                    location
                );


                $("myWeatherLocation").textContent =
                    "Location shared";


                $("shareWeatherButton").textContent =
                    "🌤️ Weather Shared";

            },

            () => {

                $("shareWeatherButton").textContent =
                    "🌤️ Share My Weather";

                $("myWeatherLocation").textContent =
                    "Permission denied";

            }
        );

    }
);


/* =========================================================
   PARTNER LOCATION
   ========================================================= */

socket.on(
    "partner-location",
    () => {

        $("partnerWeatherLocation").textContent =
            "Location shared";

    }
);


/* =========================================================
   SAKURA
   ========================================================= */

const sakura =
    $("sakuraContainer");


function createPetal() {

    const petal =
        document.createElement("span");


    petal.className =
        "sakura-petal";


    petal.style.left =
        Math.random() * 100 + "%";


    petal.style.setProperty(
        "--drift",
        `${Math.random() * 160 - 80}px`
    );


    petal.style.animationDuration =
        `${6 + Math.random() * 7}s`;


    const size =
        7 + Math.random() * 6;


    petal.style.width =
        size + "px";


    petal.style.height =
        size * .7 + "px";


    sakura.appendChild(petal);


    setTimeout(
        () => petal.remove(),
        15000
    );

}


setInterval(
    createPetal,
    500
);


for (
    let i = 0;
    i < 10;
    i++
) {

    setTimeout(
        createPetal,
        i * 250
    );

}
