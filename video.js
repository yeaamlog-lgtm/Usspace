/* =========================================================
   USSPACE — VIDEO.JS
   WebRTC + Socket.IO Video Call
   ========================================================= */

"use strict";


/* =========================================================
   LOGIN / USER CHECK
   ========================================================= */

const loggedIn =
    localStorage.getItem("usspace_logged_in");

const currentUser =
    localStorage.getItem("usspace_user");

if (
    loggedIn !== "true" ||
    !currentUser
) {
    window.location.replace("index.html");
}


/* =========================================================
   ROOM
   ========================================================= */

const ROOM_ID = "USSPACE_PRIVATE_ROOM";

const PARTNER =
    currentUser === "prakhar"
        ? "pratishtha"
        : "prakhar";


/* =========================================================
   ELEMENTS
   ========================================================= */

const localVideo =
    document.getElementById("localVideo");

const remoteVideo =
    document.getElementById("remoteVideo");

const localPlaceholder =
    document.getElementById("localPlaceholder");

const remotePlaceholder =
    document.getElementById("remotePlaceholder");

const localName =
    document.getElementById("localName");

const localNameLabel =
    document.getElementById("localNameLabel");

const remoteName =
    document.getElementById("remoteName");

const remoteNameLabel =
    document.getElementById("remoteNameLabel");

const localCameraState =
    document.getElementById("localCameraState");

const remoteCameraState =
    document.getElementById("remoteCameraState");

const microphoneButton =
    document.getElementById("microphoneButton");

const speakerButton =
    document.getElementById("speakerButton");

const cameraButton =
    document.getElementById("cameraButton");

const switchCameraButton =
    document.getElementById("switchCameraButton");

const fullscreenButton =
    document.getElementById("fullscreenButton");

const leaveButton =
    document.getElementById("leaveButton");

const connectionDot =
    document.getElementById("connectionDot");

const connectionText =
    document.getElementById("connectionText");

const connectionPill =
    document.getElementById("connectionPill");

const statusTitle =
    document.getElementById("statusTitle");

const statusDescription =
    document.getElementById("statusDescription");

const statusIcon =
    document.getElementById("statusIcon");

const partnerNotification =
    document.getElementById(
        "partnerNotification"
    );

const leaveModal =
    document.getElementById("leaveModal");

const cancelLeave =
    document.getElementById("cancelLeave");

const confirmLeave =
    document.getElementById("confirmLeave");

const sakuraContainer =
    document.getElementById(
        "sakuraContainer"
    );


/* =========================================================
   USER DISPLAY
   ========================================================= */

if (localName) {
    localName.textContent =
        currentUser;
}

if (localNameLabel) {
    localNameLabel.textContent =
        currentUser;
}

if (remoteName) {
    remoteName.textContent =
        PARTNER;
}

if (remoteNameLabel) {
    remoteNameLabel.textContent =
        PARTNER;
}


/* =========================================================
   VARIABLES
   ========================================================= */

let socket = null;

let localStream = null;

let peerConnection = null;

let partnerPresent = false;

let cameraFacingMode = "user";

let microphoneEnabled = true;

let cameraEnabled = true;

let speakerEnabled = true;

let makingOffer = false;

let ignoreOffer = false;

let isSettingRemoteAnswerPending = false;


/* =========================================================
   WEBRTC CONFIG
   ========================================================= */

const rtcConfiguration = {

    iceServers: [

        {
            urls:
                "stun:stun.l.google.com:19302"
        },

        {
            urls:
                "stun:stun1.l.google.com:19302"
        }

    ]

};


/* =========================================================
   CONNECTION UI
   ========================================================= */

function setConnection(
    type,
    text
) {

    if (connectionText) {
        connectionText.textContent =
            text;
    }

    if (connectionDot) {

        connectionDot.classList.remove(
            "connected",
            "connecting",
            "offline"
        );

        connectionDot.classList.add(
            type
        );
    }
}


/* =========================================================
   STATUS UI
   ========================================================= */

function updateStatus(
    title,
    description,
    icon = "🌸"
) {

    if (statusTitle) {
        statusTitle.textContent =
            title;
    }

    if (statusDescription) {
        statusDescription.textContent =
            description;
    }

    if (statusIcon) {
        statusIcon.textContent =
            icon;
    }
}


/* =========================================================
   SOCKET INITIALIZATION
   ========================================================= */

function initializeSocket() {

    if (
        typeof io !== "function"
    ) {

        console.error(
            "Socket.IO client not found."
        );

        setConnection(
            "offline",
            "Socket unavailable"
        );

        return;
    }


    socket = io();


    socket.on(
        "connect",
        () => {

            setConnection(
                "connected",
                "Connected"
            );


            socket.emit(
                "join-private-space",
                {
                    room: ROOM_ID,
                    username: currentUser
                }
            );
        }
    );


    socket.on(
        "disconnect",
        () => {

            setConnection(
                "offline",
                "Disconnected"
            );

            updateStatus(
                "Connection lost",
                "Trying to reconnect...",
                "🍃"
            );
        }
    );


    socket.on(
        "connect_error",
        error => {

            console.error(
                "Socket connection error:",
                error
            );

            setConnection(
                "offline",
                "Connection error"
            );
        }
    );


    /* =====================================================
       PARTNER JOINED
       ===================================================== */

    socket.on(
        "partner-joined",
        data => {

            const partner =
                data?.username ||
                PARTNER;


            if (
                partner === currentUser
            ) {
                return;
            }


            partnerPresent = true;


            showPartnerJoined(
                partner
            );


            updateStatus(
                `${partner} is here`,
                "Connecting your video...",
                "🌸"
            );


            createPeerConnection(
                true
            );
        }
    );


    /* =====================================================
       EXISTING PARTNER
       ===================================================== */

    socket.on(
        "partner-present",
        data => {

            const partner =
                data?.username ||
                PARTNER;


            if (
                partner === currentUser
            ) {
                return;
            }


            partnerPresent = true;


            showPartnerJoined(
                partner
            );


            updateStatus(
                `${partner} is here`,
                "Connecting your video...",
                "💕"
            );


            createPeerConnection(
                false
            );
        }
    );


    /* =====================================================
       WEBRTC OFFER
       ===================================================== */

    socket.on(
        "webrtc-offer",
        async data => {

            try {

                if (!data?.offer) {
                    return;
                }


                if (!peerConnection) {

                    await createPeerConnection(
                        false
                    );
                }


                const offer =
                    data.offer;


                const polite =
                    currentUser >
                    PARTNER;


                const offerCollision =
                    makingOffer ||
                    peerConnection.signalingState !==
                        "stable";


                ignoreOffer =
                    !polite &&
                    offerCollision;


                if (ignoreOffer) {
                    return;
                }


                await peerConnection.setRemoteDescription(
                    offer
                );


                isSettingRemoteAnswerPending =
                    false;


                const answer =
                    await peerConnection.createAnswer();


                await peerConnection.setLocalDescription(
                    answer
                );


                socket.emit(
                    "webrtc-answer",
                    {
                        room: ROOM_ID,
                        answer:
                            peerConnection.localDescription
                    }
                );


            } catch (error) {

                console.error(
                    "Offer handling error:",
                    error
                );
            }
        }
    );


    /* =====================================================
       WEBRTC ANSWER
       ===================================================== */

    socket.on(
        "webrtc-answer",
        async data => {

            try {

                if (
                    !peerConnection ||
                    !data?.answer
                ) {
                    return;
                }


                isSettingRemoteAnswerPending =
                    true;


                await peerConnection.setRemoteDescription(
                    data.answer
                );


                isSettingRemoteAnswerPending =
                    false;


            } catch (error) {

                console.error(
                    "Answer error:",
                    error
                );
            }
        }
    );


    /* =====================================================
       ICE CANDIDATE
       ===================================================== */

    socket.on(
        "webrtc-ice-candidate",
        async data => {

            try {

                if (
                    !data?.candidate ||
                    !peerConnection
                ) {
                    return;
                }


                await peerConnection.addIceCandidate(
                    data.candidate
                );


            } catch (error) {

                if (!ignoreOffer) {

                    console.error(
                        "ICE candidate error:",
                        error
                    );
                }
            }
        }
    );


    /* =====================================================
       PARTNER CAMERA STATE
       ===================================================== */

    socket.on(
        "partner-camera-state",
        data => {

            if (
                typeof data?.enabled !==
                "boolean"
            ) {
                return;
            }


            updateRemoteCameraState(
                data.enabled
            );
        }
    );


    /* =====================================================
       PARTNER AUDIO STATE
       ===================================================== */

    socket.on(
        "partner-audio-state",
        data => {

            /*
             * We receive this state so the UI can
             * reflect the partner's microphone.
             */

            if (
                typeof data?.enabled !==
                "boolean"
            ) {
                return;
            }


            updateRemoteAudioState(
                data.enabled
            );
        }
    );


    /* =====================================================
       PARTNER LEFT
       ===================================================== */

    socket.on(
        "partner-left",
        () => {

            partnerPresent = false;


            closePeerConnection();


            if (remoteVideo) {
                remoteVideo.srcObject =
                    null;
            }


            showRemotePlaceholder();


            updateStatus(
                "Waiting for your partner",
                "Your partner has left the call.",
                "🌸"
            );
        }
    );
}


/* =========================================================
   GET CAMERA + MICROPHONE
   ========================================================= */

async function startLocalMedia() {

    try {

        updateStatus(
            "Starting your camera",
            "Please allow camera and microphone access.",
            "📷"
        );


        localStream =
            await navigator.mediaDevices.getUserMedia(
                {
                    video: {
                        facingMode:
                            cameraFacingMode
                    },

                    audio: true
                }
            );


        if (localVideo) {

            localVideo.srcObject =
                localStream;

            localVideo.muted =
                true;
        }


        cameraEnabled = true;

        microphoneEnabled = true;


        updateCameraUI();

        updateMicrophoneUI();


        updateStatus(
            "Your camera is ready",
            partnerPresent
                ? "Connecting to your partner..."
                : "Waiting for your partner to join.",
            "🌸"
        );


    } catch (error) {

        console.error(
            "Media error:",
            error
        );


        cameraEnabled = false;


        updateStatus(
            "Camera permission needed",
            "Allow camera and microphone access to use video calling.",
            "📷"
        );


        showLocalPlaceholder();
    }
}


/* =========================================================
   CREATE PEER CONNECTION
   ========================================================= */

async function createPeerConnection(
    shouldOffer = false
) {

    if (peerConnection) {
        return peerConnection;
    }


    peerConnection =
        new RTCPeerConnection(
            rtcConfiguration
        );


    /* =====================================================
       ADD LOCAL TRACKS
       ===================================================== */

    if (localStream) {

        localStream
            .getTracks()
            .forEach(
                track => {

                    peerConnection.addTrack(
                        track,
                        localStream
                    );
                }
            );
    }


    /* =====================================================
       RECEIVE REMOTE TRACKS
       ===================================================== */

    peerConnection.ontrack =
        event => {

            const stream =
                event.streams[0];


            if (!stream) {
                return;
            }


            if (remoteVideo) {

                remoteVideo.srcObject =
                    stream;

                remoteVideo
                    .play()
                    .catch(
                        () => {}
                    );
            }


            showRemoteVideo();


            updateStatus(
                "You're connected",
                `${PARTNER} is on the call.`,
                "💕"
            );


            setConnection(
                "connected",
                "Call connected"
            );
        };


    /* =====================================================
       ICE
       ===================================================== */

    peerConnection.onicecandidate =
        event => {

            if (
                event.candidate &&
                socket
            ) {

                socket.emit(
                    "webrtc-ice-candidate",
                    {
                        room: ROOM_ID,
                        candidate:
                            event.candidate
                    }
                );
            }
        };


    /* =====================================================
       CONNECTION STATE
       ===================================================== */

    peerConnection.onconnectionstatechange =
        () => {

            if (!peerConnection) {
                return;
            }


            const state =
                peerConnection.connectionState;


            if (
                state === "connected"
            ) {

                setConnection(
                    "connected",
                    "Call connected"
                );


                updateStatus(
                    "You're connected",
                    `${PARTNER} is on the call.`,
                    "💕"
                );

            } else if (
                state === "connecting"
            ) {

                setConnection(
                    "connecting",
                    "Connecting..."
                );

            } else if (
                state === "disconnected"
            ) {

                setConnection(
                    "connecting",
                    "Reconnecting..."
                );

            } else if (
                state === "failed"
            ) {

                setConnection(
                    "offline",
                    "Connection failed"
                );


                updateStatus(
                    "Connection failed",
                    "Trying to reconnect...",
                    "🍃"
                );

            } else if (
                state === "closed"
            ) {

                setConnection(
                    "offline",
                    "Call ended"
                );
            }
        };


    /* =====================================================
       NEGOTIATION
       ===================================================== */

    peerConnection.onnegotiationneeded =
        async () => {

            try {

                makingOffer = true;


                await peerConnection.setLocalDescription();


                if (socket) {

                    socket.emit(
                        "webrtc-offer",
                        {
                            room: ROOM_ID,
                            offer:
                                peerConnection.localDescription
                        }
                    );
                }


            } catch (error) {

                console.error(
                    "Negotiation error:",
                    error
                );


            } finally {

                makingOffer = false;
            }
        };


/* =====================================================
       CREATE OFFER WHEN REQUESTED
       ===================================================== */

    if (
        shouldOffer &&
        socket
    ) {

        try {

            makingOffer = true;


            const offer =
                await peerConnection.createOffer();


            await peerConnection.setLocalDescription(
                offer
            );


            socket.emit(
                "webrtc-offer",
                {
                    room: ROOM_ID,
                    offer:
                        peerConnection.localDescription
                }
            );


        } catch (error) {

            console.error(
                "Create offer error:",
                error
            );


        } finally {

            makingOffer = false;
        }
    }


    return peerConnection;
}


/* =========================================================
   CAMERA TOGGLE
   ========================================================= */

function toggleCamera() {

    if (!localStream) {
        return;
    }


    const videoTracks =
        localStream.getVideoTracks();


    if (!videoTracks.length) {
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
                room: ROOM_ID,
                enabled:
                    cameraEnabled
            }
        );
    }
}


/* =========================================================
   CAMERA UI
   ========================================================= */

function updateCameraUI() {

    if (cameraButton) {

        cameraButton.classList.toggle(
            "active",
            cameraEnabled
        );

        cameraButton.classList.toggle(
            "off",
            !cameraEnabled
        );

        cameraButton.setAttribute(
            "aria-pressed",
            String(cameraEnabled)
        );


        const icon =
            cameraButton.querySelector(
                ".control-icon"
            );


        if (icon) {

            icon.textContent =
                cameraEnabled
                    ? "📷"
                    : "🚫";
        }
    }


    if (localCameraState) {

        localCameraState.textContent =
            cameraEnabled
                ? "Camera ON"
                : "Camera OFF";
    }


    if (localPlaceholder) {

        localPlaceholder.classList.toggle(
            "hidden",
            cameraEnabled
        );
    }


    if (localVideo) {

        localVideo.classList.toggle(
            "muted",
            !cameraEnabled
        );
    }
}


/* =========================================================
   MICROPHONE TOGGLE
   ========================================================= */

function toggleMicrophone() {

    if (!localStream) {
        return;
    }


    const audioTracks =
        localStream.getAudioTracks();


    if (!audioTracks.length) {
        return;
    }


    microphoneEnabled =
        !microphoneEnabled;


    audioTracks.forEach(
        track => {

            track.enabled =
                microphoneEnabled;
        }
    );


    updateMicrophoneUI();


    if (socket) {

        socket.emit(
            "audio-state",
            {
                room: ROOM_ID,
                enabled:
                    microphoneEnabled
            }
        );
    }
}


/* =========================================================
   MICROPHONE UI
   ========================================================= */

function updateMicrophoneUI() {

    if (!microphoneButton) {
        return;
    }


    microphoneButton.classList.toggle(
        "active",
        microphoneEnabled
    );


    microphoneButton.classList.toggle(
        "off",
        !microphoneEnabled
    );


    microphoneButton.setAttribute(
        "aria-pressed",
        String(microphoneEnabled)
    );


    const icon =
        microphoneButton.querySelector(
            ".control-icon"
        );


    if (icon) {

        icon.textContent =
            microphoneEnabled
                ? "🎤"
                : "🔇";
    }
}


/* =========================================================
   SPEAKER TOGGLE
   ========================================================= */

async function toggleSpeaker() {

    speakerEnabled =
        !speakerEnabled;


    if (remoteVideo) {

        try {

            /*
             * Modern browsers support
             * setSinkId, but Android browsers
             * may not.
             */

            if (
                typeof remoteVideo
                    .setSinkId ===
                "function"
            ) {

                await remoteVideo.setSinkId(
                    speakerEnabled
                        ? ""
                        : "none"
                );

            } else {

                remoteVideo.muted =
                    !speakerEnabled;
            }


        } catch (error) {

            remoteVideo.muted =
                !speakerEnabled;
        }
    }


    if (speakerButton) {

        speakerButton.classList.toggle(
            "active",
            speakerEnabled
        );

        speakerButton.classList.toggle(
            "off",
            !speakerEnabled
        );


        speakerButton.setAttribute(
            "aria-pressed",
            String(speakerEnabled)
        );


        const icon =
            speakerButton.querySelector(
                ".control-icon"
            );


        if (icon) {

            icon.textContent =
                speakerEnabled
                    ? "🔊"
                    : "🔇";
        }
    }
}


/* =========================================================
   SWITCH CAMERA
   ========================================================= */

async function switchCamera() {

    if (!localStream) {
        return;
    }


    cameraFacingMode =
        cameraFacingMode === "user"
            ? "environment"
            : "user";


    try {

        const newStream =
            await navigator.mediaDevices.getUserMedia(
                {
                    video: {
                        facingMode:
                            {
                                ideal:
                                    cameraFacingMode
                            }
                    },

                    audio: false
                }
            );


        const newVideoTrack =
            newStream.getVideoTracks()[0];


        if (!newVideoTrack) {
            return;
        }


        const oldVideoTrack =
            localStream.getVideoTracks()[0];


        if (oldVideoTrack) {

            localStream.removeTrack(
                oldVideoTrack
            );

            oldVideoTrack.stop();
        }


        localStream.addTrack(
            newVideoTrack
        );


        if (localVideo) {

            localVideo.srcObject =
                localStream;
        }


        if (peerConnection) {

            const sender =
                peerConnection
                    .getSenders()
                    .find(
                        item =>
                            item.track &&
                            item.track.kind ===
                                "video"
                    );


            if (sender) {

                await sender.replaceTrack(
                    newVideoTrack
                );
            }
        }


        newVideoTrack.enabled =
            cameraEnabled;


        if (switchCameraButton) {

            switchCameraButton.animate(
                [
                    {
                        transform:
                            "rotate(0deg) scale(1)"
                    },

                    {
                        transform:
                            "rotate(180deg) scale(.9)"
                    },

                    {
                        transform:
                            "rotate(360deg) scale(1)"
                    }
                ],
                {
                    duration: 450,
                    easing:
                        "cubic-bezier(.2,.8,.2,1)"
                }
            );
        }


    } catch (error) {

        console.error(
            "Camera switch failed:",
            error
        );


        /*
         * Some phones/browser combinations
         * need the opposite facingMode value.
         */

        cameraFacingMode =
            cameraFacingMode === "user"
                ? "environment"
                : "user";
    }
}


/* =========================================================
   REMOTE CAMERA STATE
   ========================================================= */

function updateRemoteCameraState(
    enabled
) {

    if (!remoteCameraState) {
        return;
    }


    remoteCameraState.textContent =
        enabled
            ? "Camera ON"
            : "Camera OFF";


    if (!enabled) {

        showRemotePlaceholder();

    } else {

        if (
            remoteVideo?.srcObject
        ) {
            showRemoteVideo();
        }
    }
}


/* =========================================================
   REMOTE AUDIO STATE
   ========================================================= */

function updateRemoteAudioState(
    enabled
) {

    if (!remoteVideo) {
        return;
    }


    /*
     * The actual remote MediaStream audio
     * is controlled by the incoming tracks.
     * This state is mainly for UI/notification.
     */

    remoteVideo.dataset.audio =
        enabled
            ? "on"
            : "off";
}


/* =========================================================
   SHOW LOCAL PLACEHOLDER
   ========================================================= */

function showLocalPlaceholder() {

    if (localPlaceholder) {

        localPlaceholder.classList.remove(
            "hidden"
        );
    }
}


/* =========================================================
   SHOW REMOTE PLACEHOLDER
   ========================================================= */

function showRemotePlaceholder() {

    if (remotePlaceholder) {

        remotePlaceholder.classList.remove(
            "hidden"
        );
    }
}


/* =========================================================
   SHOW REMOTE VIDEO
   ========================================================= */

function showRemoteVideo() {

    if (remotePlaceholder) {

        remotePlaceholder.classList.add(
            "hidden"
        );
    }
}


/* =========================================================
   PARTNER NOTIFICATION
   ========================================================= */

function showPartnerJoined(
    name
) {

    if (!partnerNotification) {
        return;
    }


    const strong =
        partnerNotification.querySelector(
            "strong"
        );


    const small =
        partnerNotification.querySelector(
            "small"
        );


    if (strong) {

        strong.textContent =
            `${name} is here!`;
    }


    if (small) {

        small.textContent =
            "Your video space is ready.";
    }


    partnerNotification.classList.add(
        "active"
    );


    partnerNotification.setAttribute(
        "aria-hidden",
        "false"
    );


    setTimeout(
        () => {

            partnerNotification.classList.remove(
                "active"
            );

            partnerNotification.setAttribute(
                "aria-hidden",
                "true"
            );

        },
        3500
    );
}


/* =========================================================
   FULLSCREEN
   ========================================================= */

async function toggleFullscreen() {

    const page =
        document.querySelector(
            ".video-page"
        );


    try {

        if (
            !document.fullscreenElement
        ) {

            if (
                page?.requestFullscreen
            ) {

                await page.requestFullscreen();
            }

        } else {

            await document.exitFullscreen();
        }


    } catch (error) {

        console.warn(
            "Fullscreen unavailable:",
            error
        );
    }
}


/* =========================================================
   LEAVE MODAL
   ========================================================= */

function openLeaveModal() {

    if (!leaveModal) {
        return;
    }


    leaveModal.classList.add(
        "active"
    );


    leaveModal.setAttribute(
        "aria-hidden",
        "false"
    );
}


function closeLeaveModal() {

    if (!leaveModal) {
        return;
    }


    leaveModal.classList.remove(
        "active"
    );


    leaveModal.setAttribute(
        "aria-hidden",
        "true"
    );
}


/* =========================================================
   LEAVE CALL
   ========================================================= */

function leaveCall() {

    if (socket) {

        socket.emit(
            "leave-private-space",
            {
                room: ROOM_ID,
                username: currentUser
            }
        );
    }


    closePeerConnection();


    if (localStream) {

        localStream
            .getTracks()
            .forEach(
                track =>
                    track.stop()
            );

        localStream = null;
    }


    localStorage.removeItem(
        "usspace_in_video_call"
    );


    document.body.style.transition =
        "opacity .35s ease";

    document.body.style.opacity =
        "0";


    setTimeout(
        () => {

            window.location.href =
                "home.html";

        },
        350
    );
}


/* =========================================================
   CLOSE PEER CONNECTION
   ========================================================= */

function closePeerConnection() {

    if (!peerConnection) {
        return;
    }


    peerConnection.ontrack =
        null;

    peerConnection.onicecandidate =
        null;

    peerConnection.onnegotiationneeded =
        null;


    try {

        peerConnection.close();

    } catch (_) {}


    peerConnection =
        null;
}


/* =========================================================
   BUTTON EVENTS
   ========================================================= */

if (cameraButton) {

    cameraButton.addEventListener(
        "click",
        toggleCamera
    );
}


if (microphoneButton) {

    microphoneButton.addEventListener(
        "click",
        toggleMicrophone
    );
}


if (speakerButton) {

    speakerButton.addEventListener(
        "click",
        toggleSpeaker
    );
}


if (switchCameraButton) {

    switchCameraButton.addEventListener(
        "click",
        switchCamera
    );
}


if (fullscreenButton) {

    fullscreenButton.addEventListener(
        "click",
        toggleFullscreen
    );
}


if (leaveButton) {

    leaveButton.addEventListener(
        "click",
        openLeaveModal
    );
}


if (cancelLeave) {

    cancelLeave.addEventListener(
        "click",
        closeLeaveModal
    );
}


if (confirmLeave) {

    confirmLeave.addEventListener(
        "click",
        leaveCall
    );
}


if (leaveModal) {

    leaveModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                leaveModal
            ) {

                closeLeaveModal();
            }
        }
    );
}


/* =========================================================
   ESCAPE KEY
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            leaveModal?.classList.contains(
                "active"
            )
        ) {

            closeLeaveModal();
        }
    }
);


/* =========================================================
   SAKURA PETALS
   ========================================================= */

function createPetal() {

    if (!sakuraContainer) {
        return;
    }


    const petal =
        document.createElement("span");


    petal.className =
        "sakura-petal";


    petal.style.left =
        `${Math.random() * 100}%`;


    const size =
        7 +
        Math.random() * 8;


    petal.style.width =
        `${size}px`;


    petal.style.height =
        `${size * .68}px`;


    petal.style.opacity =
        .2 +
        Math.random() * .4;


    const duration =
        7 +
        Math.random() * 7;


    petal.style.animationDuration =
        `${duration}s`;


    sakuraContainer.appendChild(
        petal
    );


    setTimeout(
        () => petal.remove(),
        (duration + 1) * 1000
    );
}


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


const petalInterval =
    setInterval(
        createPetal,
        1000
    );

/* =========================================================
   PAGE CLEANUP
   ========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        clearInterval(
            petalInterval
        );


        if (socket) {

            socket.emit(
                "leave-private-space",
                {
                    room: ROOM_ID,
                    username: currentUser
                }
            );
        }


        if (localStream) {

            localStream
                .getTracks()
                .forEach(
                    track =>
                        track.stop()
                );
        }


        closePeerConnection();
    }
);


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initializeVideoPage() {

    setConnection(
        "connecting",
        "Starting..."
    );


    updateStatus(
        "Preparing your call",
        "Getting everything ready...",
        "🌸"
    );


    await startLocalMedia();


    initializeSocket();


    localStorage.setItem(
        "usspace_in_video_call",
        "true"
    );
}


initializeVideoPage();


/* =========================================================
   DEBUG
   ========================================================= */

console.log(
    "USSPACE Video initialized:",
    {
        user: currentUser,
        partner: PARTNER,
        room: ROOM_ID
    }
);