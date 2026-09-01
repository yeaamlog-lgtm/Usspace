/* =========================================================
   USSPACE — CINEMA.JS
   Camera + Cinema + Socket.IO Sync
   ========================================================= */

(() => {
    "use strict";

    /* -----------------------------------------------------
       ELEMENTS
    ----------------------------------------------------- */

    const localVideo = document.getElementById("localVideo");
    const remoteVideo = document.getElementById("remoteVideo");

    const cinemaVideo = document.getElementById("cinemaVideo");
    const cinemaScreen = document.getElementById("cinemaScreen");

    const screenEmpty = document.getElementById("screenEmpty");
    const videoLoading = document.getElementById("videoLoading");

    const centerPlay = document.getElementById("centerPlay");
    const playButton = document.getElementById("playButton");

    const progressBar = document.getElementById("progressBar");
    const currentTime = document.getElementById("currentTime");
    const duration = document.getElementById("duration");

    const fullscreenButton =
        document.getElementById("fullscreenButton");

    const videoUrl =
        document.getElementById("videoUrl");

    const loadUrlButton =
        document.getElementById("loadUrlButton");

    const videoFile =
        document.getElementById("videoFile");

    const fileName =
        document.getElementById("fileName");

    const movieTitle =
        document.getElementById("movieTitle");

    const cameraToggle =
        document.getElementById("cameraToggle");

    const switchCamera =
        document.getElementById("switchCamera");

    const leaveCinema =
        document.getElementById("leaveCinema");

    const localCameraOff =
        document.getElementById("localCameraOff");

    const partnerWaiting =
        document.getElementById("partnerWaiting");

    const localCameraStatus =
        document.getElementById("localCameraStatus");

    const partnerCameraStatus =
        document.getElementById("partnerCameraStatus");

    const partnerVideoStatus =
        document.getElementById("partnerVideoStatus");

    const partnerStatus =
        document.getElementById("partnerStatus");

    const partnerStatusName =
        document.getElementById("partnerStatusName");

    const liveDot =
        document.getElementById("liveDot");

    const syncStatus =
        document.getElementById("syncStatus");

    const connectionPill =
        document.getElementById("connectionPill");

    const connectionDot =
        document.getElementById("connectionDot");

    const connectionText =
        document.getElementById("connectionText");


    /* -----------------------------------------------------
       STATE
    ----------------------------------------------------- */

    let localStream = null;
    let peerConnection = null;

    let socket = null;

    let currentFacingMode = "user";

    let partnerConnected = false;

    let roomId =
        localStorage.getItem("usspaceRoom") ||
        "usspace-private";

    let username =
        localStorage.getItem("usspaceUser") ||
        "prakhar";


    /* -----------------------------------------------------
       SOCKET.IO
    ----------------------------------------------------- */

    function connectSocket() {

        if (typeof io !== "function") {
            setConnection("offline", "Server offline");
            return;
        }

        try {

            socket = io();

            socket.on("connect", () => {

                setConnection(
                    "connected",
                    "Connected"
                );

                socket.emit("join-room", {
                    roomId,
                    username
                });

            });


            socket.on("disconnect", () => {

                setConnection(
                    "offline",
                    "Disconnected"
                );

                partnerConnected = false;

                updatePartnerUI(false);

            });


            socket.on("connect_error", () => {

                setConnection(
                    "offline",
                    "Server error"
                );

            });


            /* Partner joined */

            socket.on("partner-joined", data => {

                partnerConnected = true;

                updatePartnerUI(true);

                showJoinNotification(
                    data?.username ||
                    "Your partner"
                );

                createOffer();

            });


            /* Incoming offer */

            socket.on("offer", async offer => {

                try {

                    await preparePeer();

                    await peerConnection.setRemoteDescription(
                        new RTCSessionDescription(offer)
                    );

                    const answer =
                        await peerConnection.createAnswer();

                    await peerConnection.setLocalDescription(
                        answer
                    );

                    socket.emit("answer", {
                        roomId,
                        answer
                    });

                } catch (error) {

                    console.error(
                        "Offer error:",
                        error
                    );

                }

            });


            /* Incoming answer */

            socket.on("answer", async answer => {

                try {

                    if (!peerConnection) return;

                    await peerConnection.setRemoteDescription(
                        new RTCSessionDescription(answer)
                    );

                } catch (error) {

                    console.error(
                        "Answer error:",
                        error
                    );

                }

            });


            /* ICE candidate */

            socket.on("ice-candidate", async candidate => {

                try {

                    if (
                        peerConnection &&
                        candidate
                    ) {

                        await peerConnection.addIceCandidate(
                            new RTCIceCandidate(candidate)
                        );

                    }

                } catch (error) {

                    console.error(
                        "ICE error:",
                        error
                    );

                }

            });


            /* Partner camera state */

            socket.on("partner-camera", enabled => {

                partnerCameraStatus.textContent =
                    enabled ? "●" : "○";

                partnerCameraStatus.style.opacity =
                    enabled ? "1" : ".45";

            });


            /* Cinema sync */

            socket.on("cinema-sync", data => {

                if (!data) return;

                syncCinemaFromPartner(data);

            });

        } catch (error) {

            console.error(error);

            setConnection(
                "offline",
                "Connection failed"
            );

        }

    }


    /* -----------------------------------------------------
       CONNECTION UI
    ----------------------------------------------------- */

    function setConnection(state, text) {

        connectionDot.className =
            "connection-dot " + state;

        connectionText.textContent =
            text;

    }


    /* -----------------------------------------------------
       WEBRTC
    ----------------------------------------------------- */

    async function preparePeer() {

        if (peerConnection) {
            return peerConnection;
        }

        peerConnection =
            new RTCPeerConnection({
                iceServers: [
                    {
                        urls:
                            "stun:stun.l.google.com:19302"
                    }
                ]
            });


        if (localStream) {

            localStream
                .getTracks()
                .forEach(track => {

                    peerConnection.addTrack(
                        track,
                        localStream
                    );

                });

        }


        peerConnection.ontrack = event => {

            if (
                event.streams &&
                event.streams[0]
            ) {

                remoteVideo.srcObject =
                    event.streams[0];

                partnerWaiting.classList.add(
                    "hidden"
                );

                partnerVideoStatus.textContent =
                    "Camera connected";

                liveDot.classList.add(
                    "active"
                );

            }

        };


        peerConnection.onicecandidate =
            event => {

                if (
                    event.candidate &&
                    socket
                ) {

                    socket.emit(
                        "ice-candidate",
                        {
                            roomId,
                            candidate:
                                event.candidate
                        }
                    );

                }

            };


        peerConnection.onconnectionstatechange =
            () => {

                const state =
                    peerConnection.connectionState;

                if (state === "connected") {

                    partnerConnected = true;

                    updatePartnerUI(true);

                }

                if (
                    state === "disconnected" ||
                    state === "failed" ||
                    state === "closed"
                ) {

                    partnerConnected = false;

                    updatePartnerUI(false);

                }

            };


        return peerConnection;

    }


    async function createOffer() {

        try {

            await preparePeer();

            const offer =
                await peerConnection.createOffer();

            await peerConnection.setLocalDescription(
                offer
            );

            if (socket) {

                socket.emit("offer", {
                    roomId,
                    offer
                });

            }

        } catch (error) {

            console.error(
                "Create offer error:",
                error
            );

        }

    }


    /* -----------------------------------------------------
       CAMERA
    ----------------------------------------------------- */

    async function startCamera(
        facingMode = currentFacingMode
    ) {

        try {

            if (localStream) {

                localStream
                    .getTracks()
                    .forEach(track =>
                        track.stop()
                    );

            }


            localStream =
                await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode
                    },

                    /*
                       Audio intentionally disabled.
                    */
                    audio: false
                });


            localVideo.srcObject =
                localStream;


            localCameraOff.classList.add(
                "hidden"
            );


            localCameraStatus.textContent =
                "●";


            if (socket) {

                socket.emit(
                    "camera-state",
                    {
                        roomId,
                        enabled: true
                    }
                );

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

                const newTrack =
                    localStream.getVideoTracks()[0];

                if (sender && newTrack) {

                    await sender.replaceTrack(
                        newTrack
                    );

                } else {

                    localStream
                        .getTracks()
                        .forEach(track => {

                            peerConnection.addTrack(
                                track,
                                localStream
                            );

                        });

                }

            } else {

                await preparePeer();

            }

        } catch (error) {

            console.error(
                "Camera error:",
                error
            );

            localCameraOff.classList.remove(
                "hidden"
            );

            localCameraStatus.textContent =
                "○";

            alert(
                "Camera access nahi mil paaya. Browser camera permission check karo."
            );

        }

    }


    async function toggleCamera() {

        if (!localStream) {

            await startCamera();

            return;

        }


        const tracks =
            localStream.getVideoTracks();

        if (!tracks.length) return;

        const enabled =
            !tracks[0].enabled;

        tracks.forEach(track => {

            track.enabled = enabled;

        });


        localCameraOff.classList.toggle(
            "hidden",
            enabled
        );


        localCameraStatus.textContent =
            enabled ? "●" : "○";


        cameraToggle.querySelector("span")
            .textContent =
            enabled
                ? "Camera"
                : "Camera Off";


        if (socket) {

            socket.emit(
                "camera-state",
                {
                    roomId,
                    enabled
                }
            );

        }

    }


    async function changeCamera() {

        currentFacingMode =
            currentFacingMode === "user"
                ? "environment"
                : "user";

        await startCamera(
            currentFacingMode
        );

    }


    /* -----------------------------------------------------
       PARTNER UI
    ----------------------------------------------------- */

    function updatePartnerUI(connected) {

        if (connected) {

            partnerWaiting.classList.add(
                "hidden"
            );

            partnerVideoStatus.textContent =
                "Connected";

            partnerStatus.textContent =
                "is watching with you. 💕";

            liveDot.classList.add(
                "active"
            );

        } else {

            partnerWaiting.classList.remove(
                "hidden"
            );

            partnerVideoStatus.textContent =
                "Waiting...";

            partnerStatus.textContent =
                "is waiting to watch with you...";

            liveDot.classList.remove(
                "active"
            );

        }

    }


    /* -----------------------------------------------------
       PARTNER JOIN NOTIFICATION
    ----------------------------------------------------- */

    function showJoinNotification(name) {

        const notification =
            document.createElement("div");

        notification.textContent =
            `🌸 ${name} joined your cinema`;

        notification.style.position =
            "fixed";

        notification.style.left =
            "50%";

        notification.style.top =
            "18px";

        notification.style.transform =
            "translateX(-50%) translateY(-20px)";

        notification.style.zIndex =
            "9999";

        notification.style.padding =
            "11px 16px";

        notification.style.borderRadius =
            "14px";

        notification.style.background =
            "rgba(255,255,255,.94)";

        notification.style.color =
            "#704655";

        notification.style.fontSize =
            "12px";

        notification.style.fontWeight =
            "800";

        notification.style.boxShadow =
            "0 14px 40px rgba(120,60,85,.18)";

        notification.style.opacity =
            "0";

        notification.style.transition =
            "all .4s ease";

        document.body.appendChild(
            notification
        );


        requestAnimationFrame(() => {

            notification.style.opacity =
                "1";

            notification.style.transform =
                "translateX(-50%) translateY(0)";

        });


        setTimeout(() => {

            notification.style.opacity =
                "0";

            notification.style.transform =
                "translateX(-50%) translateY(-15px)";

            setTimeout(
                () => notification.remove(),
                450
            );

        }, 2600);

    }


    /* =====================================================
       CINEMA
       ===================================================== */


    function formatTime(seconds) {

        if (!Number.isFinite(seconds)) {
            return "0:00";
        }

        const mins =
            Math.floor(seconds / 60);

        const secs =
            Math.floor(seconds % 60)
                .toString()
                .padStart(2, "0");

        return `${mins}:${secs}`;

    }


    function updatePlayButton() {

        const playing =
            !cinemaVideo.paused &&
            !cinemaVideo.ended;

        playButton.textContent =
            playing ? "❚❚" : "▶";

        centerPlay.textContent =
            playing ? "❚❚" : "▶";

        centerPlay.classList.toggle(
            "hidden",
            playing
        );

    }


    function playCinema() {

        cinemaVideo
            .play()
            .catch(() => {});

        sendCinemaEvent("play");

    }


    function pauseCinema() {

        cinemaVideo.pause();

        sendCinemaEvent("pause");

    }


    function toggleCinemaPlay() {

        if (cinemaVideo.paused) {

            playCinema();

        } else {

            pauseCinema();

        }

    }


    function loadCinemaSource(
        source,
        title = "Movie Night"
    ) {

        if (!source) return;

        videoLoading.classList.add(
            "active"
        );

        cinemaVideo.src = source;

        cinemaVideo.load();

        screenEmpty.classList.add(
            "hidden"
        );

        movieTitle.textContent =
            title;

        cinemaVideo.onloadedmetadata =
            () => {

                videoLoading.classList.remove(
                    "active"
                );

                duration.textContent =
                    formatTime(
                        cinemaVideo.duration
                    );

                progressBar.value = 0;

            };

        cinemaVideo.onerror =
            () => {

                videoLoading.classList.remove(
                    "active"
                );

                alert(
                    "Video load nahi ho paaya."
                );

            };

    }


/* -----------------------------------------------------
       URL VIDEO
       ----------------------------------------------------- */

    loadUrlButton.addEventListener(
        "click",
        () => {

            const url =
                videoUrl.value.trim();

            if (!url) {

                videoUrl.focus();

                return;

            }

            loadCinemaSource(
                url,
                "Movie Night"
            );


            if (socket) {

                socket.emit(
                    "cinema-event",
                    {
                        roomId,
                        type: "source",
                        source: url,
                        title: "Movie Night"
                    }
                );

            }

        }
    );


    /* -----------------------------------------------------
       LOCAL VIDEO
       ----------------------------------------------------- */

    videoFile.addEventListener(
        "change",
        event => {

            const file =
                event.target.files[0];

            if (!file) return;

            fileName.textContent =
                file.name;

            const objectUrl =
                URL.createObjectURL(file);

            loadCinemaSource(
                objectUrl,
                file.name
            );

            /*
             * Local object URLs are not sent
             * to the partner because they only
             * exist on this device.
             */

        }
    );


    /* -----------------------------------------------------
       CINEMA CONTROLS
       ----------------------------------------------------- */

    playButton.addEventListener(
        "click",
        toggleCinemaPlay
    );

    centerPlay.addEventListener(
        "click",
        toggleCinemaPlay
    );


    cinemaVideo.addEventListener(
        "play",
        () => {

            updatePlayButton();

        }
    );


    cinemaVideo.addEventListener(
        "pause",
        () => {

            updatePlayButton();

        }
    );


    cinemaVideo.addEventListener(
        "timeupdate",
        () => {

            if (
                Number.isFinite(
                    cinemaVideo.duration
                )
            ) {

                progressBar.value =
                    (
                        cinemaVideo.currentTime /
                        cinemaVideo.duration
                    ) * 100;

            }

            currentTime.textContent =
                formatTime(
                    cinemaVideo.currentTime
                );

        }
    );


    cinemaVideo.addEventListener(
        "loadedmetadata",
        () => {

            duration.textContent =
                formatTime(
                    cinemaVideo.duration
                );

        }
    );


    progressBar.addEventListener(
        "input",
        () => {

            if (
                !Number.isFinite(
                    cinemaVideo.duration
                )
            ) return;

            cinemaVideo.currentTime =
                (
                    Number(progressBar.value) /
                    100
                ) *
                cinemaVideo.duration;

        }
    );


    /* -----------------------------------------------------
       FULLSCREEN
       ----------------------------------------------------- */

    fullscreenButton.addEventListener(
        "click",
        async () => {

            try {

                if (
                    document.fullscreenElement
                ) {

                    await document.exitFullscreen();

                } else {

                    await cinemaScreen.requestFullscreen();

                }

            } catch (error) {

                console.error(
                    "Fullscreen error:",
                    error
                );

            }

        }
    );


    /* -----------------------------------------------------
       CINEMA SOCKET SYNC
       ----------------------------------------------------- */

    function sendCinemaEvent(type) {

        if (!socket) return;

        socket.emit(
            "cinema-event",
            {
                roomId,
                type,
                time:
                    cinemaVideo.currentTime
            }
        );

    }


    function syncCinemaFromPartner(data) {

        if (
            data.type === "source" &&
            data.source
        ) {

            loadCinemaSource(
                data.source,
                data.title ||
                "Movie Night"
            );

            return;

        }


        if (
            typeof data.time ===
            "number"
        ) {

            const difference =
                Math.abs(
                    cinemaVideo.currentTime -
                    data.time
                );

            if (difference > .4) {

                cinemaVideo.currentTime =
                    data.time;

            }

        }


        if (data.type === "play") {

            cinemaVideo
                .play()
                .catch(() => {});

        }


        if (data.type === "pause") {

            cinemaVideo.pause();

        }

        updatePlayButton();

    }


    /* -----------------------------------------------------
       CAMERA BUTTONS
       ----------------------------------------------------- */

    cameraToggle.addEventListener(
        "click",
        toggleCamera
    );

    switchCamera.addEventListener(
        "click",
        changeCamera
    );


    /* -----------------------------------------------------
       LEAVE
       ----------------------------------------------------- */

    leaveCinema.addEventListener(
        "click",
        () => {

            if (
                !confirm(
                    "Cinema se leave karna hai?"
                )
            ) {

                return;

            }


            if (localStream) {

                localStream
                    .getTracks()
                    .forEach(track =>
                        track.stop()
                    );

            }


            if (peerConnection) {

                peerConnection.close();

                peerConnection =
                    null;

            }


            if (socket) {

                socket.emit(
                    "leave-room",
                    {
                        roomId,
                        username
                    }
                );

                socket.disconnect();

            }


            window.location.href =
                "home.html";

        }
    );


    /* -----------------------------------------------------
       PAGE EXIT
       ----------------------------------------------------- */

    window.addEventListener(
        "beforeunload",
        () => {

            if (localStream) {

                localStream
                    .getTracks()
                    .forEach(track =>
                        track.stop()
                    );

            }

            if (peerConnection) {

                peerConnection.close();

            }

        }
    );


    /* -----------------------------------------------------
       INITIALIZE
       ----------------------------------------------------- */

    async function initialize() {

        partnerStatusName.textContent =
            username === "pratishtha"
                ? "Prakhar"
                : "Pratishtha";

        partnerWaiting.classList.remove(
            "hidden"
        );

        setConnection(
            "connecting",
            "Connecting"
        );


        try {

            await startCamera();

        } catch (error) {

            console.error(error);

        }


        connectSocket();

    }


    initialize();

})();