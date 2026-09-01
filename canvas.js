/* =========================================================
   USSPACE — CANVAS.JS
   Shared Canvas • Drawing + Live Sync
   ========================================================= */

"use strict";

/* =========================================================
   AUTH CHECK
   ========================================================= */

const loggedIn = localStorage.getItem("usspace_logged_in");
const currentUser = localStorage.getItem("usspace_user");

if (loggedIn !== "true" || !currentUser) {
    window.location.replace("index.html");
}


/* =========================================================
   PRIVATE SPACE
   ========================================================= */

const ROOM_ID = "USSPACE_PRIVATE_ROOM";

const partner =
    currentUser === "prakhar"
        ? "pratishtha"
        : "prakhar";


/* =========================================================
   ELEMENTS
   ========================================================= */

const canvas =
    document.getElementById("drawingCanvas");

const wrapper =
    document.getElementById("drawingWrapper");

const emptyState =
    document.getElementById("canvasEmpty");

const brushSize =
    document.getElementById("brushSize");

const brushColor =
    document.getElementById("brushColor");

const penTool =
    document.getElementById("penTool");

const eraserTool =
    document.getElementById("eraserTool");

const undoButton =
    document.getElementById("undoButton");

const clearButton =
    document.getElementById("clearButton");

const connectionDot =
    document.getElementById("connectionDot");

const connectionText =
    document.getElementById("connectionText");

const canvasStatus =
    document.getElementById("canvasStatus");

const partnerDrawingName =
    document.getElementById(
        "partnerDrawingName"
    );

const partnerDrawingStatus =
    document.getElementById(
        "partnerDrawingStatus"
    );

const drawingLiveDot =
    document.getElementById(
        "drawingLiveDot"
    );

const sakuraContainer =
    document.getElementById(
        "sakuraContainer"
    );


/* =========================================================
   USER UI
   ========================================================= */

if (partnerDrawingName) {
    partnerDrawingName.textContent =
        partner;
}


/* =========================================================
   CANVAS CONTEXT
   ========================================================= */

const ctx =
    canvas.getContext("2d", {
        alpha: false
    });


/* =========================================================
   STATE
   ========================================================= */

let socket = null;

let drawing = false;

let tool = "pen";

let lastX = 0;

let lastY = 0;

let history = [];

let historyIndex = -1;

let canvasReady = false;

let resizeTimer = null;


/* =========================================================
   DRAWING SETTINGS
   ========================================================= */

function getBrushSize() {

    return Number(
        brushSize?.value || 5
    );
}


/* =========================================================
   CANVAS SIZE
   ========================================================= */

function resizeCanvas(
    preserve = true
) {

    if (!canvas || !wrapper) {
        return;
    }


    const oldCanvas =
        document.createElement("canvas");

    const oldCtx =
        oldCanvas.getContext("2d");


    if (
        preserve &&
        canvas.width > 0 &&
        canvas.height > 0
    ) {

        oldCanvas.width =
            canvas.width;

        oldCanvas.height =
            canvas.height;

        oldCtx.drawImage(
            canvas,
            0,
            0
        );
    }


    const rect =
        wrapper.getBoundingClientRect();


    const dpr =
        Math.min(
            window.devicePixelRatio || 1,
            2
        );


    canvas.width =
        Math.floor(
            rect.width * dpr
        );

    canvas.height =
        Math.floor(
            rect.height * dpr
        );


    canvas.style.width =
        `${rect.width}px`;

    canvas.style.height =
        `${rect.height}px`;


    ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );


    ctx.fillStyle =
        "#fffdfd";

    ctx.fillRect(
        0,
        0,
        rect.width,
        rect.height
    );


    if (
        preserve &&
        oldCanvas.width
    ) {

        ctx.drawImage(
            oldCanvas,
            0,
            0,
            oldCanvas.width,
            oldCanvas.height,
            0,
            0,
            rect.width,
            rect.height
        );
    }


    canvasReady = true;

    updateEmptyState();
}


/* =========================================================
   INITIALIZE CANVAS
   ========================================================= */

function initializeCanvas() {

    resizeCanvas(false);


    ctx.lineCap =
        "round";

    ctx.lineJoin =
        "round";

    ctx.imageSmoothingEnabled =
        true;


    saveHistory();
}


/* =========================================================
   POINTER POSITION
   ========================================================= */

function getPointerPosition(
    event
) {

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


/* =========================================================
   START DRAWING
   ========================================================= */

function startDrawing(
    event
) {

    if (!canvasReady) {
        return;
    }


    event.preventDefault();


    const point =
        getPointerPosition(
            event
        );


    drawing = true;


    lastX =
        point.x;

    lastY =
        point.y;


    ctx.beginPath();

    ctx.moveTo(
        lastX,
        lastY
    );


    /*
     * Small dot for taps.
     */

    ctx.lineTo(
        lastX + .01,
        lastY + .01
    );


    drawPoint();


    canvas.classList.add(
        "drawing"
    );


    if (emptyState) {

        emptyState.classList.add(
            "hidden"
        );
    }


    if (partnerDrawingStatus) {

        partnerDrawingStatus.textContent =
            "is drawing with you...";

    }


    if (drawingLiveDot) {

        drawingLiveDot.classList.add(
            "active"
        );
    }
}


/* =========================================================
   DRAW
   ========================================================= */

function draw(
    event
) {

    if (!drawing) {
        return;
    }


    event.preventDefault();


    const point =
        getPointerPosition(
            event
        );


    const x =
        point.x;

    const y =
        point.y;


    const size =
        getBrushSize();


    if (tool === "eraser") {

        ctx.globalCompositeOperation =
            "destination-out";

        ctx.strokeStyle =
            "rgba(0,0,0,1)";

    } else {

        ctx.globalCompositeOperation =
            "source-over";

        ctx.strokeStyle =
            brushColor?.value ||
            "#d8789b";
    }


    ctx.lineWidth =
        size;


    ctx.beginPath();

    ctx.moveTo(
        lastX,
        lastY
    );

    ctx.lineTo(
        x,
        y
    );

    ctx.stroke();


    /*
     * Send only the small stroke segment,
     * not the complete canvas.
     */

    sendStroke(
        lastX,
        lastY,
        x,
        y,
        size,
        tool === "eraser"
            ? null
            : brushColor?.value
    );


    lastX =
        x;

    lastY =
        y;
}


/* =========================================================
   DRAW POINT
   ========================================================= */

function drawPoint() {

    const size =
        getBrushSize();


    if (tool === "eraser") {

        ctx.globalCompositeOperation =
            "destination-out";

        ctx.fillStyle =
            "rgba(0,0,0,1)";

    } else {

        ctx.globalCompositeOperation =
            "source-over";

        ctx.fillStyle =
            brushColor?.value ||
            "#d8789b";
    }


    ctx.beginPath();

    ctx.arc(
        lastX,
        lastY,
        size / 2,
        0,
        Math.PI * 2
    );

    ctx.fill();


    ctx.globalCompositeOperation =
        "source-over";
}


/* =========================================================
   STOP DRAWING
   ========================================================= */

function stopDrawing() {

    if (!drawing) {
        return;
    }


    drawing = false;


    canvas.classList.remove(
        "drawing"
    );


    ctx.globalCompositeOperation =
        "source-over";


    saveHistory();


    updateEmptyState();


    if (partnerDrawingStatus) {

        partnerDrawingStatus.textContent =
            "is waiting for you...";
    }


    if (drawingLiveDot) {

        drawingLiveDot.classList.remove(
            "active"
        );
    }


    /*
     * Send a completed-drawing event.
     */

    if (socket) {

        socket.emit(
            "canvas-drawing-end",
            {
                room: ROOM_ID,
                username: currentUser
            }
        );
    }
}


/* =========================================================
   SEND STROKE
   ========================================================= */

function sendStroke(
    x1,
    y1,
    x2,
    y2,
    size,
    color
) {

    if (!socket) {
        return;
    }


    const rect =
        canvas.getBoundingClientRect();


    /*
     * Normalize coordinates so different
     * phone screen sizes can reproduce them.
     */

    socket.emit(
        "canvas-stroke",
        {

            room:
                ROOM_ID,

            username:
                currentUser,

            x1:
                x1 / rect.width,

            y1:
                y1 / rect.height,

            x2:
                x2 / rect.width,

            y2:
                y2 / rect.height,

            size:
                size / rect.width,

            color:
                color,

            tool:
                tool
        }
    );
}


/* =========================================================
   RECEIVE REMOTE STROKE
   ========================================================= */

function drawRemoteStroke(
    data
) {

    if (!canvasReady) {
        return;
    }


    const rect =
        canvas.getBoundingClientRect();


    const x1 =
        data.x1 *
        rect.width;

    const y1 =
        data.y1 *
        rect.height;

    const x2 =
        data.x2 *
        rect.width;

    const y2 =
        data.y2 *
        rect.height;


    const size =
        Math.max(
            1,
            data.size *
            rect.width
        );


    if (
        data.tool ===
        "eraser"
    ) {

        ctx.globalCompositeOperation =
            "destination-out";

    } else {

        ctx.globalCompositeOperation =
            "source-over";
    }


    ctx.strokeStyle =
        data.color ||
        "#d8789b";


    ctx.lineWidth =
        size;


    ctx.lineCap =
        "round";

    ctx.lineJoin =
        "round";


    ctx.beginPath();

    ctx.moveTo(
        x1,
        y1
    );

    ctx.lineTo(
        x2,
        y2
    );

    ctx.stroke();


    ctx.globalCompositeOperation =
        "source-over";


    if (emptyState) {

        emptyState.classList.add(
            "hidden"
        );
    }


    updateEmptyState();
}


/* =========================================================
   HISTORY
   ========================================================= */

function saveHistory() {

    if (!canvasReady) {
        return;
    }


    const image =
        canvas.toDataURL(
            "image/png",
            .85
        );


    /*
     * Remove future states after undo.
     */

    if (
        historyIndex <
        history.length - 1
    ) {

        history =
            history.slice(
                0,
                historyIndex + 1
            );
    }


    history.push(
        image
    );


    /*
     * Keep memory lightweight.
     */

    if (
        history.length > 15
    ) {

        history.shift();
    }


    historyIndex =
        history.length - 1;
}


/* =========================================================
   RESTORE HISTORY
   ========================================================= */

function restoreHistory(
    imageData
) {

    const image =
        new Image();


    image.onload =
        () => {

            const rect =
                canvas.getBoundingClientRect();


            ctx.globalCompositeOperation =
                "source-over";


            ctx.fillStyle =
                "#fffdfd";


            ctx.fillRect(
                0,
                0,
                rect.width,
                rect.height
            );


            ctx.drawImage(
                image,
                0,
                0,
                rect.width,
                rect.height
            );


            updateEmptyState();
        };


    image.src =
        imageData;
}


/* =========================================================
   UNDO
   ========================================================= */

function undo() {

    if (
        historyIndex <= 0
    ) {
        return;
    }


    historyIndex--;


    restoreHistory(
        history[historyIndex]
    );


    if (socket) {

        socket.emit(
            "canvas-undo",
            {
                room: ROOM_ID,
                username: currentUser,
                image:
                    history[
                        historyIndex
                    ]
            }
        );
    }


    animateButton(
        undoButton
    );
}


/* =========================================================
   CLEAR CANVAS
   ========================================================= */

function clearCanvas(
    broadcast = true
) {

    const rect =
        canvas.getBoundingClientRect();


    ctx.globalCompositeOperation =
        "source-over";


    ctx.fillStyle =
        "#fffdfd";


    ctx.fillRect(
        0,
        0,
        rect.width,
        rect.height
    );


    saveHistory();


    updateEmptyState();


    if (broadcast && socket) {

        socket.emit(
            "canvas-clear",
            {
                room: ROOM_ID,
                username: currentUser
            }
        );
    }


    animateButton(
        clearButton
    );
}


/* =========================================================
   REMOTE UNDO
   ========================================================= */

function receiveRemoteCanvas(
    image
) {

    if (!image) {
        return;
    }


    restoreHistory(
        image
    );


    saveHistory();
}


/* =========================================================
   EMPTY STATE
   ========================================================= */

function updateEmptyState() {

    if (!emptyState) {
        return;
    }


    const rect =
        canvas.getBoundingClientRect();


    const pixels =
        ctx.getImageData(
            0,
            0,
            Math.min(
                canvas.width,
                Math.floor(
                    rect.width
                )
            ),
            Math.min(
                canvas.height,
                Math.floor(
                    rect.height
                )
            )
        ).data;


    /*
     * Instead of checking every pixel,
     * inspect a small sample.
     */

    let hasDrawing =
        false;


    const step =
        Math.max(
            4,
            Math.floor(
                pixels.length / 5000
            )
        );


    for (
        let i = 0;
        i < pixels.length;
        i += step
    ) {

        const r =
            pixels[i];

        const g =
            pixels[i + 1];

        const b =
            pixels[i + 2];


        /*
         * Canvas background is close to
         * #fffdfd.
         */

        if (
            r < 245 ||
            g < 240 ||
            b < 242
        ) {

            hasDrawing =
                true;

            break;
        }
    }


    emptyState.classList.toggle(
        "hidden",
        hasDrawing
    );
}


/* =========================================================
   TOOLS
   ========================================================= */

function setTool(
    selectedTool
) {

    tool =
        selectedTool;


    penTool?.classList.toggle(
        "active",
        tool === "pen"
    );


    eraserTool?.classList.toggle(
        "active",
        tool === "eraser"
    );
}


/* =========================================================
   BUTTON ANIMATION
   ========================================================= */

function animateButton(
    button
) {

    if (!button) {
        return;
    }


    button.animate(
        [
            {
                transform:
                    "scale(1)"
            },

            {
                transform:
                    "scale(.88)"
            },

            {
                transform:
                    "scale(1)"
            }
        ],
        {
            duration: 240,
            easing:
                "ease-out"
        }
    );
}


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
   SOCKET.IO
   ========================================================= */

function initializeSocket() {

    if (
        typeof io !==
        "function"
    ) {

        setConnection(
            "offline",
            "Offline"
        );

        if (canvasStatus) {

            canvasStatus.textContent =
                "Local drawing mode";
        }

        return;
    }


    socket =
        io();


    socket.on(
        "connect",
        () => {

            setConnection(
                "connected",
                "Connected"
            );


            if (canvasStatus) {

                canvasStatus.textContent =
                    "Shared canvas ready";
            }


            socket.emit(
                "join-private-space",
                {
                    room:
                        ROOM_ID,

                    username:
                        currentUser
                }
            );
        }
    );


    socket.on(
        "disconnect",
        () => {

            setConnection(
                "offline",
                "Offline"
            );


            if (canvasStatus) {

                canvasStatus.textContent =
                    "Reconnecting...";
            }
        }
    );


    /* =====================================================
       REMOTE STROKE
       ===================================================== */

    socket.on(
        "canvas-stroke",
        data => {

            if (
                !data ||
                data.username ===
                    currentUser
            ) {
                return;
            }


            drawRemoteStroke(
                data
            );
        }
    );


 /* =====================================================
       REMOTE DRAWING START
       ===================================================== */

    socket.on(
        "canvas-drawing-start",
        data => {

            if (
                data?.username ===
                currentUser
            ) {
                return;
            }


            if (partnerDrawingStatus) {

                partnerDrawingStatus.textContent =
                    "is drawing...";
            }


            if (drawingLiveDot) {

                drawingLiveDot.classList.add(
                    "active"
                );
            }
        }
    );


    /* =====================================================
       REMOTE DRAWING END
       ===================================================== */

    socket.on(
        "canvas-drawing-end",
        data => {

            if (
                data?.username ===
                currentUser
            ) {
                return;
            }


            if (partnerDrawingStatus) {

                partnerDrawingStatus.textContent =
                    "is waiting for you...";
            }


            if (drawingLiveDot) {

                drawingLiveDot.classList.remove(
                    "active"
                );
            }
        }
    );


    /* =====================================================
       REMOTE CLEAR
       ===================================================== */

    socket.on(
        "canvas-clear",
        data => {

            if (
                data?.username ===
                currentUser
            ) {
                return;
            }


            clearCanvas(
                false
            );
        }
    );


    /* =====================================================
       REMOTE UNDO
       ===================================================== */

    socket.on(
        "canvas-undo",
        data => {

            if (
                data?.username ===
                currentUser
            ) {
                return;
            }


            if (data?.image) {

                receiveRemoteCanvas(
                    data.image
                );
            }
        }
    );


    /* =====================================================
       PARTNER JOINED
       ===================================================== */

    socket.on(
        "partner-joined",
        data => {

            if (
                data?.username ===
                currentUser
            ) {
                return;
            }


            if (canvasStatus) {

                canvasStatus.textContent =
                    `${partner} joined`;
            }


            if (partnerDrawingStatus) {

                partnerDrawingStatus.textContent =
                    "is ready to draw with you 🌸";
            }
        }
    );


    /* =====================================================
       PARTNER LEFT
       ===================================================== */

    socket.on(
        "partner-left",
        data => {

            if (canvasStatus) {

                canvasStatus.textContent =
                    "Waiting for your partner...";
            }


            if (partnerDrawingStatus) {

                partnerDrawingStatus.textContent =
                    "is away for now...";
            }


            if (drawingLiveDot) {

                drawingLiveDot.classList.remove(
                    "active"
                );
            }
        }
    );
}


/* =========================================================
   CANVAS POINTER EVENTS
   ========================================================= */

canvas?.addEventListener(
    "pointerdown",
    event => {

        if (
            event.pointerType ===
            "mouse" &&
            event.button !== 0
        ) {
            return;
        }


        try {

            canvas.setPointerCapture(
                event.pointerId
            );

        } catch (_) {}


        if (socket) {

            socket.emit(
                "canvas-drawing-start",
                {
                    room:
                        ROOM_ID,

                    username:
                        currentUser
                }
            );
        }


        startDrawing(
            event
        );
    }
);


canvas?.addEventListener(
    "pointermove",
    draw
);


canvas?.addEventListener(
    "pointerup",
    stopDrawing
);


canvas?.addEventListener(
    "pointercancel",
    stopDrawing
);


canvas?.addEventListener(
    "pointerleave",
    event => {

        /*
         * Keep drawing while touch/pointer
         * remains captured.
         */

        if (
            event.pointerType ===
            "mouse"
        ) {

            stopDrawing();
        }
    }
);


/* =========================================================
   BUTTON EVENTS
   ========================================================= */

penTool?.addEventListener(
    "click",
    () => {

        setTool(
            "pen"
        );

        animateButton(
            penTool
        );
    }
);


eraserTool?.addEventListener(
    "click",
    () => {

        setTool(
            "eraser"
        );

        animateButton(
            eraserTool
        );
    }
);


undoButton?.addEventListener(
    "click",
    undo
);


clearButton?.addEventListener(
    "click",
    () => {

        clearCanvas(
            true
        );
    }
);


/* =========================================================
   RESIZE
   ========================================================= */

window.addEventListener(
    "resize",
    () => {

        clearTimeout(
            resizeTimer
        );


        resizeTimer =
            setTimeout(
                () => {

                    resizeCanvas(
                        true
                    );

                },
                150
            );
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
        document.createElement(
            "span"
        );


    petal.className =
        "sakura-petal";


    petal.style.left =
        `${Math.random() * 100}%`;


    const size =
        7 +
        Math.random() * 7;


    petal.style.width =
        `${size}px`;

    petal.style.height =
        `${size * .68}px`;


    petal.style.animationDuration =
        `${7 + Math.random() * 6}s`;


    petal.style.opacity =
        .18 +
        Math.random() * .3;


    sakuraContainer.appendChild(
        petal
    );


    setTimeout(
        () => {

            petal.remove();

        },
        14000
    );
}


for (
    let i = 0;
    i < 8;
    i++
) {

    setTimeout(
        createPetal,
        i * 300
    );
}


const petalTimer =
    setInterval(
        createPetal,
        1300
    );


/* =========================================================
   CLEANUP
   ========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        clearInterval(
            petalTimer
        );


        if (socket) {

            socket.emit(
                "leave-private-space",
                {
                    room:
                        ROOM_ID,

                    username:
                        currentUser
                }
            );
        }
    }
);


/* =========================================================
   INITIALIZE
   ========================================================= */

initializeCanvas();

setTool("pen");

initializeSocket();


console.log(
    "USSPACE Canvas initialized:",
    {
        user:
            currentUser,

        partner:
            partner,

        room:
            ROOM_ID
    }
);