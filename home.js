/* =========================================================
   USSPACE • HOME.JS
   Invite + Join + Chat + Camera + Socket.IO
   ========================================================= */

"use strict";


/* =========================================================
   SOCKET.IO
   ========================================================= */

let socket = null;

if (typeof io === "function") {

    socket = io();

} else {

    console.error(
        "❌ Socket.IO load nahi hua."
    );

}


/* =========================================================
   USER
   ========================================================= */

const username =
    localStorage.getItem("usspace_username") ||
    localStorage.getItem("username") ||
    "You";


const usernameDisplay =
    document.getElementById(
        "usernameDisplay"
    );


if (usernameDisplay) {
    usernameDisplay.textContent = username;
}


/* =========================================================
   INVITE CODE
   ========================================================= */

function generateInviteCode() {

    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < 6; i++) {

        code +=
            chars.charAt(
                Math.floor(
                    Math.random() *
                    chars.length
                )
            );

    }

    return code;
}


/* Get existing code or create new one */

let inviteCode =
    localStorage.getItem(
        "usspace_invite_code"
    );


if (
    !inviteCode ||
    inviteCode.length !== 6
) {

    inviteCode =
        generateInviteCode();

    localStorage.setItem(
        "usspace_invite_code",
        inviteCode
    );

}


/* =========================================================
   INVITE ELEMENTS
   ========================================================= */

const inviteCodeDisplay =
    document.getElementById(
        "inviteCodeDisplay"
    );


const modalInviteCode =
    document.getElementById(
        "modalInviteCode"
    );


function showInviteCode() {

    if (inviteCodeDisplay) {

        inviteCodeDisplay.textContent =
            inviteCode;

    }


    if (modalInviteCode) {

        modalInviteCode.textContent =
            inviteCode;

    }

}


showInviteCode();


/* =========================================================
   INVITE MODAL
   ========================================================= */

const inviteModal =
    document.getElementById(
        "inviteModal"
    );


const openJoinButton =
    document.getElementById(
        "openJoinButton"
    );


const closeInviteModal =
    document.getElementById(
        "closeInviteModal"
    );


function openInviteModal() {

    if (!inviteModal) {
        return;
    }

    showInviteCode();

    inviteModal.classList.add(
        "show"
    );

    inviteModal.setAttribute(
        "aria-hidden",
        "false"
    );

}


function closeInvite() {

    if (!inviteModal) {
        return;
    }

    inviteModal.classList.remove(
        "show"
    );

    inviteModal.setAttribute(
        "aria-hidden",
        "true"
    );

}


if (openJoinButton) {

    openJoinButton.addEventListener(
        "click",
        openInviteModal
    );

}


if (closeInviteModal) {

    closeInviteModal.addEventListener(
        "click",
        closeInvite
    );

}


if (inviteModal) {

    inviteModal.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                inviteModal
            ) {

                closeInvite();

            }

        }
    );

}


/* =========================================================
   COPY INVITE CODE
   ========================================================= */

const copyInviteButton =
    document.getElementById(
        "copyInviteButton"
    );


const modalCopyButton =
    document.getElementById(
        "modalCopyButton"
    );


const inviteMessage =
    document.getElementById(
        "inviteMessage"
    );


async function copyInviteCode() {

    try {

        await navigator.clipboard.writeText(
            inviteCode
        );

        showInviteMessage(
            "💕 Invite code copied!"
        );

    } catch (error) {

        const textArea =
            document.createElement(
                "textarea"
            );

        textArea.value =
            inviteCode;

        document.body.appendChild(
            textArea
        );

        textArea.select();

        document.execCommand(
            "copy"
        );

        textArea.remove();

        showInviteMessage(
            "💕 Invite code copied!"
        );

    }

}


if (copyInviteButton) {

    copyInviteButton.addEventListener(
        "click",
        copyInviteCode
    );

}


if (modalCopyButton) {

    modalCopyButton.addEventListener(
        "click",
        copyInviteCode
    );

}


function showInviteMessage(message) {

    if (!inviteMessage) {
        return;
    }

    inviteMessage.textContent =
        message;

    clearTimeout(
        window.inviteMessageTimer
    );

    window.inviteMessageTimer =
        setTimeout(
            function () {

                inviteMessage.textContent =
                    "";

            },
            2500
        );

}


/* =========================================================
   JOIN SPACE
   ========================================================= */

const joinForm =
    document.getElementById(
        "joinForm"
    );


const joinCodeInput =
    document.getElementById(
        "joinCodeInput"
    );


if (joinCodeInput) {

    joinCodeInput.addEventListener(
        "input",
        function () {

            this.value =
                this.value
                    .toUpperCase()
                    .replace(
                        /[^A-Z0-9]/g,
                        ""
                    )
                    .slice(0, 6);

        }
    );

}


if (joinForm) {

    joinForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            const code =
                joinCodeInput
                    ? joinCodeInput.value
                        .trim()
                        .toUpperCase()
                    : "";


            if (code.length !== 6) {

                showInviteMessage(
                    "⚠️ Please enter a 6-character code."
                );

                return;

            }


            localStorage.setItem(
                "usspace_room",
                code
            );


            if (socket) {

                socket.emit(
                    "join-space",
                    {
                        name: username,
                        room: code
                    }
                );

            }


            showInviteMessage(
                "🌸 Joining space..."
            );


            setTimeout(
                function () {

                    closeInvite();

                    updatePartnerStatus(
                        "Joining space..."
                    );

                },
                600
            );

        }
    );

}


/* =========================================================
   ROOM
   ========================================================= */

let room =
    localStorage.getItem(
        "usspace_room"
    );


if (!room) {

    room = inviteCode;

    localStorage.setItem(
        "usspace_room",
        room
    );

}


function joinCurrentRoom() {

    if (!socket) {
        return;
    }


    socket.emit(
        "join-space",
        {
            name: username,
            room: room
        }
    );

}


if (socket) {

    socket.on(
        "connect",
        function () {

            console.log(
                "🌸 Socket connected:",
                socket.id
            );

            setConnection(
                true,
                "Online"
            );

            joinCurrentRoom();

        }
    );


    socket.on(
        "disconnect",
        function () {

            console.log(
                "❌ Socket disconnected"
            );

            setConnection(
                false,
                "Offline"
            );

            updatePartnerStatus(
                "Connection lost"
            );

        }
    );


    socket.on(
        "space-joined",
        function (data) {

            if (data && data.room) {

                room =
                    data.room;

                localStorage.setItem(
                    "usspace_room",
                    room
                );

            }

            console.log(
                "💕 Joined space:",
                room
            );

        }
    );


    socket.on(
        "partner-joined",
        function (data) {

            const partnerName =
                data &&
                data.name
                    ? data.name
                    : "Partner";


            updatePartnerStatus(
                partnerName +
                " is here 💕"
            );

        }
    );


    socket.on(
        "partner-left",
        function () {

            updatePartnerStatus(
                "Waiting to join"
            );


            stopRemoteVideo();

        }
    );


    socket.on(
        "room-status",
        function (data) {

            const count =
                data &&
                typeof data.count === "number"
                    ? data.count
                    : 1;


            if (count >= 2) {

                updatePartnerStatus(
                    "Connected 💕"
                );

            } else {

                updatePartnerStatus(
                    "Waiting to join"
                );

            }

        }
    );

}


/* =========================================================
   CONNECTION STATUS
   ========================================================= */

const connectionDot =
    document.getElementById(
        "connectionDot"
    );


const connectionText =
    document.getElementById(
        "connectionText"
    );


function setConnection(
    online,
    text
) {

    if (connectionDot) {

        connectionDot.classList.toggle(
            "online",
            online
        );

    }


    if (connectionText) {

        connectionText.textContent =
            text;

    }

}


/* =========================================================
   PARTNER STATUS
   ========================================================= */

const partnerStatus =
    document.getElementById(
        "partnerStatus"
    );


function updatePartnerStatus(
    text
) {

    if (partnerStatus) {

        partnerStatus.textContent =
            text;

    }

}


/* =========================================================
   CHAT
   ========================================================= */

const chatForm =
    document.getElementById(
        "chatForm"
    );


const chatInput =
    document.getElementById(
        "chatInput"
    );


const chatMessages =
    document.getElementById(
        "chatMessages"
    );


const emptyChat =
    document.getElementById(
        "emptyChat"
    );


function addChatMessage(
    name,
    message,
    own
) {

    if (!chatMessages) {
        return;
    }


    if (emptyChat) {

        emptyChat.style.display =
            "none";

    }


    const messageElement =
        document.createElement(
            "div"
        );


    messageElement.style.margin =
        "8px 0";


    messageElement.style.padding =
        "9px 12px";


    messageElement.style.borderRadius =
        "13px";


    messageElement.style.background =
        own
            ? "#fff0f5"
            : "#ffffff";


    messageElement.style.border =
        "1px solid rgba(190,105,135,.12)";


    messageElement.innerHTML =
        `<strong style="font-size:9px;">
            ${escapeHTML(name)}
        </strong>
        <div style="font-size:11px;margin-top:3px;">
            ${escapeHTML(message)}
        </div>`;


    chatMessages.appendChild(
        messageElement
    );


    chatMessages.scrollTop =
        chatMessages.scrollHeight;

}


function escapeHTML(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


if (chatForm) {

    chatForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            if (!chatInput) {
                return;
            }


            const message =
                chatInput.value.trim();


            if (!message) {
                return;
            }


            addChatMessage(
                username,
                message,
                true
            );


            if (socket) {

                socket.emit(
                    "sync-event",
                    {
                        type: "chat",
                        name: username,
                        message: message
                    }
                );

            }


            chatInput.value =
                "";

        }
    );

}


if (socket) {

    socket.on(
        "sync-event",
        function (data) {

            if (
                !data ||
                data.type !== "chat"
            ) {
                return;
            }


            addChatMessage(
                data.name ||
                    "Partner",
                data.message ||
                    "",
                false
            );

        }
    );

}


/* =========================================================
   CAMERA
   ========================================================= */

const localVideo =
    document.getElementById(
        "localVideo"
    );


const localPlaceholder =
    document.getElementById(
        "localPlaceholder"
    );


const cameraButton =
    document.getElementById(
        "cameraButton"
    );


const cameraStatus =
    document.getElementById(
        "cameraStatus"
    );


let localStream =
    null;


let currentFacingMode =
    "user";


async function startCamera() {

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        setCameraStatus(
            "Camera not supported"
        );

        return;

    }


    try {

        if (localStream) {

            localStream
                .getTracks()
                .forEach(
                    track =>
                        track.stop()
                );

        }


        localStream =
            await navigator.mediaDevices
                .getUserMedia(
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


        if (localPlaceholder) {

            localPlaceholder.style.display =
                "none";

        }


        setCameraStatus(
            "Camera on"
        );


        if (cameraButton) {

            cameraButton.textContent =
                "📷";

        }


    } catch (error) {

        console.error(
            "Camera error:",
            error
        );


        setCameraStatus(
            "Camera permission needed"
        );

    }

}


function stopCamera() {

    if (localStream) {

        localStream
            .getTracks()
            .forEach(
                track =>
                    track.stop()
            );

        localStream =
            null;

    }


    if (localVideo) {

        localVideo.srcObject =
            null;

    }


    if (localPlaceholder) {

        localPlaceholder.style.display =
            "flex";

    }


    setCameraStatus(
        "Camera off"
    );

}


function setCameraStatus(text) {

    if (cameraStatus) {

        cameraStatus.textContent =
            text;

    }

}


if (cameraButton) {

    cameraButton.addEventListener(
        "click",
        function () {

            if (localStream) {

                stopCamera();

            } else {

                startCamera();

            }

        }
    );

}


/* =========================================================
   SWITCH CAMERA
   ========================================================= */

const switchCameraButton =
    document.getElementById(
        "switchCameraButton"
    );


if (switchCameraButton) {

    switchCameraButton.addEventListener(
        "click",
        async function () {

            currentFacingMode =
                currentFacingMode === "user"
                    ? "environment"
                    : "user";


            await startCamera();

        }
    );

}


/* =========================================================
   REMOTE VIDEO
   ========================================================= */

const remoteVideo =
    document.getElementById(
        "remoteVideo"
    );


const remotePlaceholder =
    document.getElementById(
        "remotePlaceholder"
    );


function stopRemoteVideo() {

    if (remoteVideo) {

        remoteVideo.srcObject =
            null;

    }


    if (remotePlaceholder) {

        remotePlaceholder.style.display =
            "flex";

    }

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

    if (!breakOverlay) {
        return;
    }

    breakOverlay.classList.add(
        "show"
    );

    breakOverlay.setAttribute(
        "aria-hidden",
        "false"
    );


    if (socket) {

        socket.emit(
            "take-a-break"
        );

    }

}


function closeBreak() {

    if (!breakOverlay) {
        return;
    }

    breakOverlay.classList.remove(
        "show"
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


if (socket) {

    socket.on(
        "partner-break",
        function (data) {

            console.log(
                "💕 Partner is taking a break",
                data
            );

        }
    );

}


/* =========================================================
   LOGOUT
   ========================================================= */

const logoutButton =
    document.getElementById(
        "logoutButton"
    );


if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        function () {

            if (socket) {

                socket.emit(
                    "leave-space"
                );

            }


            stopCamera();


            localStorage.removeItem(
                "usspace_room"
            );


            window.location.href =
                "index.html";

        }
    );

}


/* =========================================================
   SAKURA
   ========================================================= */

const sakuraContainer =
    document.getElementById(
        "sakuraContainer"
    );


function createSakura() {

    if (!sakuraContainer) {
        return;
    }


    const flower =
        document.createElement(
            "div"
        );


    flower.className =
        "sakura";


    flower.textContent =
        "🌸";


    flower.style.left =
        Math.random() * 100 +
        "%";


    flower.style.fontSize =
        (10 + Math.random() * 12) +
        "px";


    flower.style.animationDuration =
        (7 + Math.random() * 8) +
        "s";


    flower.style.animationDelay =
        Math.random() * 5 +
        "s";


    sakuraContainer.appendChild(
        flower
    );


    setTimeout(
        function () {

            flower.remove();

        },
        16000
    );

}


for (
    let i = 0;
    i < 10;
    i++
) {

    createSakura();

}


setInterval(
    createSakura,
    1200
);


/* =========================================================
   PAGE LOAD
   ========================================================= */

console.log(
    "🌸 USSPACE Home loaded"
);

console.log(
    "💌 Invite Code:",
    inviteCode
);

console.log(
    "🚪 Room:",
    room
);
