/* =========================================================
   USSPACE — DRAW & GUESS
   draw.js
   ========================================================= */

(() => {
    "use strict";

    /* =====================================================
       ELEMENTS
       ===================================================== */

    const canvas =
        document.getElementById("drawingCanvas");

    const ctx =
        canvas.getContext("2d");

    const placeholder =
        document.getElementById("canvasPlaceholder");

    const timerElement =
        document.getElementById("timer");

    const turnText =
        document.getElementById("turnText");

    const wordDisplay =
        document.getElementById("wordDisplay");

    const guessInput =
        document.getElementById("guessInput");

    const guessButton =
        document.getElementById("guessButton");

    const guessMessages =
        document.getElementById("guessMessages");

    const guessCount =
        document.getElementById("guessCount");

    const youName =
        document.getElementById("youName");

    const partnerName =
        document.getElementById("partnerName");

    const connectionStatus =
        document.getElementById("connectionStatus");

    const canvasOwner =
        document.getElementById("canvasOwner");

    const startButton =
        document.getElementById("startGameButton");

    const nextButton =
        document.getElementById("nextRoundButton");

    const undoButton =
        document.getElementById("undoButton");

    const clearButton =
        document.getElementById("clearButton");

    const drawingTools =
        document.getElementById("drawingTools");

    const sakuraContainer =
        document.getElementById("sakuraContainer");


    /* =====================================================
       USER / ROOM
       ===================================================== */

    const username =
        localStorage.getItem("usspaceUser") ||
        "You";

    const roomId =
        localStorage.getItem("usspaceRoom") ||
        sessionStorage.getItem("usspaceGameRoom") ||
        "usspace-private";

    const playerId =
        sessionStorage.getItem("usspacePlayerId") ||
        crypto.randomUUID();

    sessionStorage.setItem(
        "usspacePlayerId",
        playerId
    );

    youName.textContent =
        username;


    /* =====================================================
       GAME STATE
       ===================================================== */

    let socket = null;

    let connected = false;

    let drawing = false;

    let canDraw = false;

    let currentBrushSize = 4;

    let currentRound = 0;

    let currentTurn = null;

    let timeLeft = 60;

    let timerInterval = null;

    let strokes = [];

    let currentStroke = [];

    let guessTotal = 0;

    let gameStarted = false;

    let partnerJoined = false;


    /* =====================================================
       WORDS
       ===================================================== */

    const words = [
        "flower",
        "heart",
        "cat",
        "moon",
        "star",
        "coffee",
        "house",
        "tree",
        "sun",
        "butterfly",
        "pizza",
        "rainbow",
        "cake",
        "camera",
        "cloud",
        "ice cream",
        "guitar",
        "rabbit",
        "book",
        "umbrella"
    ];


    let currentWord = "";


    /* =====================================================
       CANVAS RESIZE
       ===================================================== */

    function resizeCanvas() {

        const rect =
            canvas.getBoundingClientRect();

        const oldImage =
            canvas.width > 0
                ? canvas.toDataURL()
                : null;

        const dpr =
            Math.max(
                1,
                Math.min(
                    window.devicePixelRatio || 1,
                    2
                )
            );

        canvas.width =
            Math.round(rect.width * dpr);

        canvas.height =
            Math.round(rect.height * dpr);

        ctx.setTransform(
            dpr,
            0,
            0,
            dpr,
            0,
            0
        );

        ctx.lineCap =
            "round";

        ctx.lineJoin =
            "round";

        ctx.strokeStyle =
            "#6d4b59";

        ctx.fillStyle =
            "#6d4b59";

        if (oldImage) {

            const image =
                new Image();

            image.onload = () => {

                ctx.drawImage(
                    image,
                    0,
                    0,
                    rect.width,
                    rect.height
                );

            };

            image.src =
                oldImage;
        }
    }


    window.addEventListener(
        "resize",
        resizeCanvas
    );


    /* =====================================================
       POINTER POSITION
       ===================================================== */

    function getPoint(event) {

        const rect =
            canvas.getBoundingClientRect();

        return {

            x:
                event.clientX -
                rect.left,

            y:
                event.clientY -
                rect.top

        };
    }


    /* =====================================================
       DRAWING
       ===================================================== */

    function startDrawing(event) {

        if (!canDraw) {
            return;
        }

        event.preventDefault();

        drawing = true;

        currentStroke = [];

        const point =
            getPoint(event);

        currentStroke.push({
            x: point.x,
            y: point.y
        });

        ctx.beginPath();

        ctx.moveTo(
            point.x,
            point.y
        );

        ctx.lineWidth =
            currentBrushSize;

        try {

            canvas.setPointerCapture(
                event.pointerId
            );

        } catch (_) {}
    }


    function draw(event) {

        if (!drawing || !canDraw) {
            return;
        }

        event.preventDefault();

        const point =
            getPoint(event);

        currentStroke.push({
            x: point.x,
            y: point.y
        });

        ctx.lineTo(
            point.x,
            point.y
        );

        ctx.stroke();

        sendDrawingPoint(
            point.x,
            point.y
        );
    }


    function stopDrawing(event) {

        if (!drawing) {
            return;
        }

        drawing = false;

        try {

            canvas.releasePointerCapture(
                event.pointerId
            );

        } catch (_) {}

        if (
            currentStroke.length > 0
        ) {

            strokes.push({
                size:
                    currentBrushSize,

                points:
                    [...currentStroke]
            });

            sendStrokeEnd();

        }

        currentStroke = [];
    }


    canvas.addEventListener(
        "pointerdown",
        startDrawing
    );

    canvas.addEventListener(
        "pointermove",
        draw
    );

    canvas.addEventListener(
        "pointerup",
        stopDrawing
    );

    canvas.addEventListener(
        "pointercancel",
        stopDrawing
    );

    canvas.addEventListener(
        "pointerleave",
        event => {

            if (drawing) {
                stopDrawing(event);
            }

        }
    );


    /* =====================================================
       DRAWING TOOLS
       ===================================================== */

    drawingTools
        .querySelectorAll(".tool")
        .forEach(tool => {

            tool.addEventListener(
                "click",
                () => {

                    drawingTools
                        .querySelectorAll(".tool")
                        .forEach(item =>
                            item.classList.remove(
                                "active"
                            )
                        );

                    tool.classList.add(
                        "active"
                    );

                    currentBrushSize =
                        Number(
                            tool.dataset.size
                        ) || 4;
                }
            );

        });


    /* =====================================================
       REDRAW ALL STROKES
       ===================================================== */

    function redrawCanvas() {

        const rect =
            canvas.getBoundingClientRect();

        ctx.clearRect(
            0,
            0,
            rect.width,
            rect.height
        );

        strokes.forEach(
            stroke => {

                if (
                    !stroke.points ||
                    !stroke.points.length
                ) {
                    return;
                }

                ctx.beginPath();

                ctx.lineWidth =
                    stroke.size || 4;

                ctx.strokeStyle =
                    "#6d4b59";

                const first =
                    stroke.points[0];

                ctx.moveTo(
                    first.x,
                    first.y
                );

                stroke.points
                    .slice(1)
                    .forEach(point => {

                        ctx.lineTo(
                            point.x,
                            point.y
                        );

                    });

                ctx.stroke();

            }
        );

    }


    /* =====================================================
       UNDO
       ===================================================== */

    undoButton.addEventListener(
        "click",
        () => {

            if (!canDraw) {
                return;
            }

            if (!strokes.length) {
                return;
            }

            strokes.pop();

            redrawCanvas();

            emit(
                "draw-undo"
            );

        }
    );


    /* =====================================================
       CLEAR
       ===================================================== */

    clearButton.addEventListener(
        "click",
        () => {

            if (!canDraw) {
                return;
            }

            strokes = [];

            redrawCanvas();

            emit(
                "draw-clear"
            );

        }
    );


    /* =====================================================
       SOCKET.IO
       ===================================================== */

    function connectSocket() {

        if (
            typeof io !== "function"
        ) {

            setConnection(
                false,
                "Offline"
            );

            return;

        }


        socket =
            io();


        socket.on(
            "connect",
            () => {

                connected = true;

                setConnection(
                    true,
                    "Connected"
                );


                emit(
                    "join-room",
                    {
                        roomId,
                        username,
                        playerId
                    }
                );

            }
        );


        socket.on(
            "disconnect",
            () => {

                connected = false;

                setConnection(
                    false,
                    "Offline"
                );

            }
        );


        /* Partner joined */

        socket.on(
            "partner-joined",
            data => {

                partnerJoined =
                    true;

                partnerName.textContent =
                    data?.username ||
                    "Partner";

                updatePlayers();

                showToast(
                    `${partnerName.textContent} joined 🌸`
                );

            }
        );


        socket.on(
            "user-joined",
            data => {

                if (
                    data?.username &&
                    data.username !== username
                ) {

                    partnerJoined =
                        true;

                    partnerName.textContent =
                        data.username;

                    updatePlayers();

                }

            }
        );


        /* Drawing */

        socket.on(
            "draw-point",
            data => {

                if (
                    !data ||
                    data.playerId === playerId
                ) {
                    return;
                }

                drawRemotePoint(
                    data.x,
                    data.y,
                    data.size
                );

            }
        );


        socket.on(
            "draw-stroke-end",
            data => {

                if (
                    data?.playerId ===
                    playerId
                ) {
                    return;
                }

                if (data?.stroke) {

                    strokes.push(
                        data.stroke
                    );

                }

            }
        );


        socket.on(
            "draw-undo",
            () => {

                if (strokes.length) {
                    strokes.pop();
                }

                redrawCanvas();

            }
        );


        socket.on(
            "draw-clear",
            () => {

                strokes = [];

                redrawCanvas();

            }
        );


        /* Guess */

        socket.on(
            "game-guess",
            data => {

                if (!data) {
                    return;
                }

                addGuess(
                    data.username ||
                    "Partner",
                    data.guess ||
                    ""
                );

                checkGuessLocally(
                    data.guess || "",
                    false
                );

            }
        );


        /* Game */

        socket.on(
            "game-start",
            data => {

                if (
                    data?.playerId ===
                    playerId
                ) {
                    return;
                }

                startRemoteGame(
                    data
                );

            }
        );


        socket.on(
            "round-start",
            data => {

                if (
                    data?.playerId ===
                    playerId
                ) {
                    return;
                }

                startRemoteRound(
                    data
                );

            }
        );


        socket.on(
            "game-time",
            data => {

                if (
                    typeof data?.time ===
                    "number"
                ) {

                    timeLeft =
                        data.time;

                    updateTimer();

                }

            }
        );


        socket.on(
            "game-end",
            () => {

                finishRound();

            }
        );


        socket.on(
            "partner-left",
            () => {

                partnerJoined =
                    false;

                partnerName.textContent =
                    "Waiting...";

                updatePlayers();

                showToast(
                    "Partner left the game"
                );

            }
        );

    }


    /* =====================================================
       SOCKET EMIT HELPER
       ===================================================== */

    function emit(
        event,
        data = {}
    ) {

        if (
            socket &&
            connected
        ) {

            socket.emit(
                event,
                {
                    ...data,
                    roomId
                }
            );

        }

    }


    /* =====================================================
       DRAW SOCKET EVENTS
       ===================================================== */

    function sendDrawingPoint(
        x,
        y
    ) {

        emit(
            "draw-point",
            {
                playerId,
                x,
                y,
                size:
                    currentBrushSize
            }
        );

    }


    function sendStrokeEnd() {

        const stroke =
            strokes[
                strokes.length - 1
            ];

        emit(
            "draw-stroke-end",
            {
                playerId,
                stroke
            }
        );

    }


    function drawRemotePoint(
        x,
        y,
        size
    ) {

        if (
            typeof x !== "number" ||
            typeof y !== "number"
        ) {
            return;
        }

        ctx.beginPath();

        ctx.lineWidth =
            Number(size) || 4;

        ctx.strokeStyle =
            "#6d4b59";

        ctx.moveTo(
            x - .1,
            y - .1
        );

        ctx.lineTo(
            x,
            y
        );

        ctx.stroke();

    }


    /* =====================================================
       START GAME
       ===================================================== */

    startButton.addEventListener(
        "click",
        startGame
    );


    function startGame() {

        if (gameStarted) {
            return;
        }

        gameStarted =
            true;

        currentRound = 1;

        currentWord =
            randomWord();

        currentTurn =
            playerId;

        emit(
            "game-start",
            {
                playerId,
                username,
                round: currentRound,
                word: currentWord,
                turn: playerId
            }
        );

        startRound();

    }


    /* =====================================================
       REMOTE START
       ===================================================== */

    function startRemoteGame(
        data
    ) {

        gameStarted =
            true;

        currentRound =
            data?.round || 1;

        currentTurn =
            data?.turn ||
            null;

        currentWord =
            data?.word ||
            randomWord();

        startRound();

    }


    /* =====================================================
       START ROUND
       ===================================================== */

    function startRound() {

        timeLeft = 60;

        clearInterval(
            timerInterval
        );

        strokes = [];

        redrawCanvas();

        updateTimer();

        updateTurnUI();

        startButton.classList.add(
            "hidden"
        );

        nextButton.classList.add(
            "hidden"
        );

        placeholder.style.opacity =
            canDraw ? "0" : "1";


        timerInterval =
            setInterval(
                () => {

                    timeLeft--;

                    updateTimer();

                    if (
                        connected &&
                        currentTurn === playerId
                    ) {

                        emit(
                            "game-time",
                            {
                                playerId,
                                time:
                                    timeLeft
                            }
                        );

                    }

                    if (
                        timeLeft <= 0
                    ) {

                        finishRound();

                    }

                },
                1000
            );

    }


/* =====================================================
       REMOTE ROUND
       ===================================================== */

    function startRemoteRound(
        data
    ) {

        currentRound =
            data?.round ||
            currentRound + 1;

        currentTurn =
            data?.turn ||
            currentTurn;

        currentWord =
            data?.word ||
            randomWord();

        startRound();

    }


    /* =====================================================
       TURN UI
       ===================================================== */

    function updateTurnUI() {

        canDraw =
            currentTurn === playerId;

        if (canDraw) {

            turnText.textContent =
                "Your turn — draw!";

            canvasOwner.textContent =
                "Your turn";

            wordDisplay.textContent =
                currentWord;

            guessInput.disabled =
                true;

            guessButton.disabled =
                true;

            placeholder.style.opacity =
                "0";

        } else {

            turnText.textContent =
                "Partner is drawing...";

            canvasOwner.textContent =
                "Partner's turn";

            wordDisplay.textContent =
                "••••••";

            guessInput.disabled =
                false;

            guessButton.disabled =
                false;

            placeholder.style.opacity =
                "0";

        }

        updatePlayers();

    }


    /* =====================================================
       PLAYER UI
       ===================================================== */

    function updatePlayers() {

        const youCard =
            document.getElementById(
                "youCard"
            );

        const partnerCard =
            document.getElementById(
                "partnerCard"
            );


        youCard.classList.toggle(
            "active",
            currentTurn === playerId
        );


        partnerCard.classList.toggle(
            "active",
            currentTurn !== playerId &&
            partnerJoined
        );

    }


    /* =====================================================
       TIMER
       ===================================================== */

    function updateTimer() {

        timerElement.textContent =
            Math.max(
                0,
                timeLeft
            );

        if (
            timeLeft <= 10
        ) {

            timerElement.style.color =
                "#c96888";

        } else {

            timerElement.style.color =
                "";

        }

    }


    /* =====================================================
       FINISH ROUND
       ===================================================== */

    function finishRound() {

        clearInterval(
            timerInterval
        );

        canDraw =
            false;

        updateTurnUI();

        nextButton.classList.remove(
            "hidden"
        );

        placeholder.style.opacity =
            "1";

        emit(
            "game-end",
            {
                playerId
            }
        );

    }


    /* =====================================================
       NEXT ROUND
       ===================================================== */

    nextButton.addEventListener(
        "click",
        () => {

            currentRound++;

            currentTurn =
                currentTurn === playerId
                    ? "partner"
                    : playerId;


            /*
             * If the previous turn was represented
             * by another socket ID, assign ourselves
             * as the next artist when appropriate.
             */

            if (
                currentTurn ===
                "partner"
            ) {

                currentTurn =
                    partnerJoined
                        ? "partner"
                        : playerId;

            }


            currentWord =
                randomWord();

            emit(
                "round-start",
                {
                    playerId,
                    round:
                        currentRound,
                    word:
                        currentWord,
                    turn:
                        currentTurn
                }
            );

            startRound();

        }
    );


    /* =====================================================
       GUESSING
       ===================================================== */

    guessButton.addEventListener(
        "click",
        submitGuess
    );


    guessInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                submitGuess();

            }

        }
    );


    function submitGuess() {

        const guess =
            guessInput.value.trim();


        if (!guess) {
            return;
        }


        addGuess(
            username,
            guess
        );


        emit(
            "game-guess",
            {
                playerId,
                username,
                guess
            }
        );


        checkGuessLocally(
            guess,
            true
        );


        guessInput.value =
            "";

    }


    /* =====================================================
       CHECK GUESS
       ===================================================== */

    function checkGuessLocally(
        guess,
        isOwnGuess
    ) {

        if (!currentWord) {
            return;
        }

        const normalize =
            value =>
                String(value)
                    .toLowerCase()
                    .trim();


        if (
            normalize(guess) ===
            normalize(currentWord)
        ) {

            showToast(
                isOwnGuess
                    ? "Correct! 🌸"
                    : "Partner guessed it! 🌸"
            );

            clearInterval(
                timerInterval
            );

            nextButton.classList.remove(
                "hidden"
            );

        }

    }


    /* =====================================================
       GUESS FEED
       ===================================================== */

    function addGuess(
        name,
        guess
    ) {

        const empty =
            guessMessages.querySelector(
                ".empty-feed"
            );

        if (empty) {
            empty.remove();
        }


        const message =
            document.createElement(
                "div"
            );

        message.className =
            "guess-message";


        const safeName =
            escapeHTML(name);

        const safeGuess =
            escapeHTML(guess);


        message.innerHTML =
            `<strong>${safeName}</strong> ${safeGuess}`;


        guessMessages.appendChild(
            message
        );


        guessTotal++;

        guessCount.textContent =
            guessTotal;


        guessMessages.scrollTop =
            guessMessages.scrollHeight;

    }


    /* =====================================================
       RANDOM WORD
       ===================================================== */

    function randomWord() {

        return words[
            Math.floor(
                Math.random() *
                words.length
            )
        ];

    }


    /* =====================================================
       CONNECTION UI
       ===================================================== */

    function setConnection(
        online,
        text
    ) {

        const dot =
            connectionStatus.querySelector(
                "span"
            );

        const label =
            connectionStatus.querySelector(
                "small"
            );


        label.textContent =
            text;


        if (online) {

            dot.style.background =
                "#79aa87";

        } else {

            dot.style.background =
                "#d99aa9";

        }

    }


    /* =====================================================
       TOAST
       ===================================================== */

    function showToast(
        message
    ) {

        const old =
            document.querySelector(
                ".draw-toast"
            );

        if (old) {
            old.remove();
        }


        const toast =
            document.createElement(
                "div"
            );

        toast.className =
            "draw-toast";

        toast.textContent =
            message;


        Object.assign(
            toast.style,
            {

                position:
                    "fixed",

                top:
                    "22px",

                left:
                    "50%",

                transform:
                    "translate(-50%, -10px)",

                zIndex:
                    "99999",

                padding:
                    "11px 17px",

                borderRadius:
                    "14px",

                background:
                    "rgba(255,255,255,.95)",

                color:
                    "#704455",

                fontSize:
                    "11px",

                fontWeight:
                    "700",

                border:
                    "1px solid rgba(210,126,151,.18)",

                boxShadow:
                    "0 18px 45px rgba(100,50,70,.16)",

                opacity:
                    "0",

                transition:
                    "all .25s ease"

            }
        );


        document.body.appendChild(
            toast
        );


        requestAnimationFrame(
            () => {

                toast.style.opacity =
                    "1";

                toast.style.transform =
                    "translate(-50%, 0)";

            }
        );


        setTimeout(
            () => {

                toast.style.opacity =
                    "0";

                toast.style.transform =
                    "translate(-50%, -10px)";

                setTimeout(
                    () =>
                        toast.remove(),
                    250
                );

            },
            2000
        );

    }


    /* =====================================================
       SAFE HTML
       ===================================================== */

    function escapeHTML(
        value
    ) {

        return String(value)
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );

    }


    /* =====================================================
       SAKURA
       ===================================================== */

    function createPetal() {

        if (!sakuraContainer) {
            return;
        }


        const petal =
            document.createElement(
                "span"
            );

        petal.className =
            "sakura-petal";


        petal.style.left =
            `${Math.random() * 100}%`;


        const size =
            6 +
            Math.random() * 7;


        petal.style.width =
            `${size}px`;

        petal.style.height =
            `${size * .7}px`;


        petal.style.animationDuration =
            `${7 + Math.random() * 7}s`;


        sakuraContainer.appendChild(
            petal
        );


        setTimeout(
            () =>
                petal.remove(),
            15000
        );

    }


    function startSakura() {

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


        setInterval(
            createPetal,
            1000
        );

    }


    /* =====================================================
       INITIALIZE
       ===================================================== */

    function initialize() {

        resizeCanvas();

        setConnection(
            false,
            "Connecting"
        );

        startSakura();

        connectSocket();

    }


    initialize();

})();