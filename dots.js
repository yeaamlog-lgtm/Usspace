/* USSPACE • DOTS & BOXES */

const socket = io();

const board = document.getElementById("dotsBoard");
const statusText = document.getElementById("gameStatus");
const turnText = document.getElementById("turnText");
const connectionText = document.querySelector("#connectionStatus small");

const yourScore = document.getElementById("youBoxes");
const partnerScore = document.getElementById("partnerBoxes");

const resultOverlay = document.getElementById("resultOverlay");
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");

const SIZE = 4;

let lines = new Set();
let boxes = {};
let myTurn = false;

let scores = {
    you: 0,
    partner: 0
};

function key(type, row, col) {
    return `${type}-${row}-${col}`;
}

function buildBoard() {

    board.innerHTML = "";

    const total = SIZE - 1;

    for (let row = 0; row < SIZE; row++) {

        for (let col = 0; col < SIZE; col++) {

            const dot = document.createElement("div");

            dot.className = "dot";

            dot.style.left =
                `calc(${col} * (100% - 28px) / ${total} + 7px)`;

            dot.style.top =
                `calc(${row} * (100% - 28px) / ${total} + 7px)`;

            board.appendChild(dot);
        }
    }

    for (let row = 0; row < SIZE; row++) {

        for (let col = 0; col < total; col++) {

            createLine(
                "h",
                row,
                col
            );
        }
    }

    for (let row = 0; row < total; row++) {

        for (let col = 0; col < SIZE; col++) {

            createLine(
                "v",
                row,
                col
            );
        }
    }

    render();
}

function createLine(type, row, col) {

    const button = document.createElement("button");

    button.className =
        `dot-line ${type === "h" ? "horizontal" : "vertical"}`;

    const x =
        col * (100 - 28 / SIZE) / (SIZE - 1) + 7;

    const y =
        row * (100 - 28 / SIZE) / (SIZE - 1) + 7;

    if (type === "h") {

        button.style.left =
            `calc(${col} * (100% - 28px) / ${SIZE - 1} + 14px)`;

        button.style.top =
            `calc(${row} * (100% - 28px) / ${SIZE - 1} + 10px)`;

        button.style.width =
            `calc((100% - 28px) / ${SIZE - 1} - 2px)`;

    } else {

        button.style.left =
            `calc(${col} * (100% - 28px) / ${SIZE - 1} + 10px)`;

        button.style.top =
            `calc(${row} * (100% - 28px) / ${SIZE - 1} + 14px)`;

        button.style.height =
            `calc((100% - 28px) / ${SIZE - 1} - 2px)`;
    }

    button.addEventListener("click", () => {

        if (!myTurn) return;

        const id = key(type, row, col);

        if (lines.has(id)) return;

        socket.emit("game:move", {
            game: "dots",
            type,
            row,
            col
        });
    });

    button.dataset.line = key(type, row, col);

    board.appendChild(button);
}

function render() {

    document.querySelectorAll(".dot-line")
        .forEach(line => {

            line.classList.remove(
                "you",
                "partner"
            );

            if (lines.has(line.dataset.line)) {

                const owner =
                    lines.get(line.dataset.line);

                line.classList.add(owner);
            }
        });

    yourScore.textContent = scores.you;
    partnerScore.textContent = scores.partner;

    turnText.textContent = myTurn
        ? "Your turn 🌸"
        : "Partner's turn 🌷";
}

socket.on("connect", () => {

    connectionText.textContent = "Connected";
    statusText.textContent =
        "Connected to your room";
});

socket.on("disconnect", () => {

    connectionText.textContent = "Offline";
    statusText.textContent =
        "Connection lost";
});

socket.on("game:state", data => {

    if (data.game !== "dots") return;

    if (data.lines) {
        lines = new Map(
            Object.entries(data.lines)
        );
    }

    if (data.boxes) {
        boxes = data.boxes;
    }

    if (data.yourScore !== undefined) {
        scores.you = data.yourScore;
    }

    if (data.partnerScore !== undefined) {
        scores.partner = data.partnerScore;
    }

    if (data.yourTurn !== undefined) {
        myTurn = data.yourTurn;
    }

    render();
});

socket.on("game:move", data => {

    if (data.game !== "dots") return;

    const id =
        key(data.type, data.row, data.col);

    lines.set(
        id,
        data.symbol || "partner"
    );

    myTurn =
        data.nextTurn === "you";

    render();
});

socket.on("game:result", data => {

    if (data.game !== "dots") return;

    resultTitle.textContent =
        data.winner === "you"
            ? "You Win! 🌸"
            : "Partner Wins! 🌷";

    resultMessage.textContent =
        "Every little box counts ✨";

    resultOverlay.classList.remove("hidden");
});

function newGame() {

    resultOverlay.classList.add("hidden");

    lines.clear();
    boxes = {};

    socket.emit("game:new", {
        game: "dots"
    });
}

document
    .getElementById("newGameButton")
    .addEventListener("click", newGame);

document
    .getElementById("resultNewGame")
    .addEventListener("click", newGame);

document
    .getElementById("leaveButton")
    .addEventListener("click", () => {
        window.location.href = "games.html";
    });

buildBoard();