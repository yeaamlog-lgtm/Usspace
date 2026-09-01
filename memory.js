/* USSPACE • MEMORY MATCH */

const socket = io();

const board = document.getElementById("memoryBoard");
const statusText = document.getElementById("gameStatus");
const turnText = document.getElementById("turnText");
const connectionText = document.querySelector("#connectionStatus small");

const youName = document.getElementById("youName");
const partnerName = document.getElementById("partnerName");

const yourPairs = document.getElementById("yourPairs");
const partnerPairs = document.getElementById("partnerPairs");

const pairsFound = document.getElementById("pairsFound");
const movesText = document.getElementById("moves");

const resultOverlay = document.getElementById("resultOverlay");
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");

const symbols = [
    "🌸", "🌷", "🌙", "⭐",
    "🦋", "🍓", "☁️", "💫"
];

let cards = [];
let flipped = [];
let locked = false;
let myTurn = false;

let scores = {
    you: 0,
    partner: 0
};

let moves = 0;

function createDeck() {
    cards = [...symbols, ...symbols]
        .sort(() => Math.random() - 0.5)
        .map((symbol, index) => ({
            id: index,
            symbol,
            matched: false
        }));

    renderBoard();
}

function renderBoard() {
    board.innerHTML = "";

    cards.forEach(card => {
        const button = document.createElement("button");

        button.className = "memory-card";

        if (
            flipped.includes(card.id) ||
            card.matched
        ) {
            button.classList.add("flipped");
        }

        if (card.matched) {
            button.classList.add("matched");
        }

        button.innerHTML = `
            <div class="memory-inner">
                <div class="memory-front"></div>
                <div class="memory-back">${card.symbol}</div>
            </div>
        `;

        button.addEventListener("click", () => {
            selectCard(card.id);
        });

        board.appendChild(button);
    });
}

function selectCard(id) {
    if (!myTurn || locked) return;

    const card = cards.find(c => c.id === id);

    if (!card || card.matched || flipped.includes(id)) {
        return;
    }

    if (flipped.length >= 2) return;

    flipped.push(id);
    moves++;

    movesText.textContent = moves;

    renderBoard();

    if (flipped.length === 2) {
        locked = true;

        const first = cards.find(c => c.id === flipped[0]);
        const second = cards.find(c => c.id === flipped[1]);

        if (first.symbol === second.symbol) {

            setTimeout(() => {

                first.matched = true;
                second.matched = true;

                scores.you++;

                flipped = [];
                locked = false;

                updateScores();
                renderBoard();

                socket.emit("game:memory-pair", {
                    game: "memory-match"
                });

                checkComplete();

            }, 650);

        } else {

            setTimeout(() => {

                flipped = [];
                locked = false;

                myTurn = false;

                updateTurn();
                renderBoard();

                socket.emit("game:memory-miss", {
                    game: "memory-match"
                });

            }, 850);
        }
    }
}

socket.on("connect", () => {
    connectionText.textContent = "Connected";
    statusText.textContent = "Connected to your room";
});

socket.on("disconnect", () => {
    connectionText.textContent = "Offline";
});

socket.on("game:state", data => {

    if (data.game !== "memory-match") return;

    if (data.cards) {
        cards = data.cards;
        renderBoard();
    }

    if (data.youName) {
        youName.textContent = data.youName;
    }

    if (data.partnerName) {
        partnerName.textContent = data.partnerName;
    }

    if (data.yourTurn !== undefined) {
        myTurn = data.yourTurn;
    }

    updateTurn();
});

socket.on("memory:update", data => {

    if (data.cards) {
        cards = data.cards;
        renderBoard();
    }

    if (data.youScore !== undefined) {
        scores.you = data.youScore;
    }

    if (data.partnerScore !== undefined) {
        scores.partner = data.partnerScore;
    }

    myTurn = data.yourTurn === true;

    updateScores();
    updateTurn();
});

socket.on("game:result", data => {

    if (data.game !== "memory-match") return;

    resultTitle.textContent =
        data.winner === "you"
            ? "You Remembered! 🌸"
            : "Great Game! 🌷";

    resultMessage.textContent =
        "That was a lovely memory game.";

    resultOverlay.classList.remove("hidden");
});

function checkComplete() {

    if (cards.every(card => card.matched)) {

        socket.emit("game:result", {
            game: "memory-match"
        });

    }
}

function updateScores() {
    yourPairs.textContent = scores.you;
    partnerPairs.textContent = scores.partner;

    pairsFound.textContent =
        `${scores.you + scores.partner} / 8`;
}

function updateTurn() {
    turnText.textContent = myTurn
        ? "Your turn 🌸"
        : "Partner's turn 🌷";
}

function newGame() {

    resultOverlay.classList.add("hidden");

    socket.emit("game:new", {
        game: "memory-match"
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

createDeck();