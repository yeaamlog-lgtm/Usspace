/* USSPACE • GUESS THE NUMBER */

const socket = io();

const input = document.getElementById("guessInput");
const guessButton = document.getElementById("guessButton");

const hint = document.getElementById("hint");
const history = document.getElementById("guessHistory");

const statusText = document.getElementById("gameStatus");
const turnText = document.getElementById("turnText");

const connectionText =
    document.querySelector("#connectionStatus small");

const attemptsText =
    document.getElementById("attempts");

const roundText =
    document.getElementById("round");

const yourScore =
    document.getElementById("yourScore");

const partnerScore =
    document.getElementById("partnerScore");

const resultOverlay =
    document.getElementById("resultOverlay");

const resultTitle =
    document.getElementById("resultTitle");

const resultMessage =
    document.getElementById("resultMessage");

let attempts = 0;
let round = 1;
let myTurn = false;

function addHistory(number, result) {

    const empty =
        history.querySelector(".empty-history");

    if (empty) {
        empty.remove();
    }

    const item =
        document.createElement("div");

    item.className =
        `guess-item ${result}`;

    let message = "Correct!";

    if (result === "higher") {
        message = "Try higher ↑";
    }

    if (result === "lower") {
        message = "Try lower ↓";
    }

    item.innerHTML = `
        <span>${message}</span>
        <strong>${number}</strong>
    `;

    history.prepend(item);
}

function submitGuess() {

    if (!myTurn) return;

    const number =
        Number(input.value);

    if (
        !Number.isInteger(number) ||
        number < 1 ||
        number > 100
    ) {
        hint.textContent =
            "Choose a number between 1 and 100.";
        return;
    }

    socket.emit("game:guess", {
        game: "guess",
        number
    });

    input.value = "";
    input.focus();
}

guessButton.addEventListener(
    "click",
    submitGuess
);

input.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {
            submitGuess();
        }
    }
);

socket.on("connect", () => {

    connectionText.textContent =
        "Connected";

    statusText.textContent =
        "Connected to your room";
});

socket.on("disconnect", () => {

    connectionText.textContent =
        "Offline";
});

socket.on("game:state", data => {

    if (data.game !== "guess") return;

    myTurn =
        data.yourTurn === true;

    if (data.attempts !== undefined) {
        attempts =
            data.attempts;
    }

    if (data.round !== undefined) {
        round =
            data.round;
    }

    attemptsText.textContent =
        attempts;

    roundText.textContent =
        round;

    turnText.textContent =
        myTurn
            ? "Your turn 🌸"
            : "Partner's turn 🌷";
});

socket.on("game:guess-result", data => {

    if (data.game !== "guess") return;

    attempts++;

    attemptsText.textContent =
        attempts;

    addHistory(
        data.number,
        data.result
    );

    if (data.result === "higher") {

        hint.textContent =
            "Go a little higher ↑";

    } else if (data.result === "lower") {

        hint.textContent =
            "Go a little lower ↓";

    } else if (data.result === "correct") {

        hint.textContent =
            "You found it! 🌸";
    }

    myTurn =
        data.nextTurn === "you";

    turnText.textContent =
        myTurn
            ? "Your turn 🌸"
            : "Partner's turn 🌷";
});

socket.on("game:result", data => {

    if (data.game !== "guess") return;

    if (data.winner === "you") {

        resultTitle.textContent =
            "You Got It! 🎯";

        resultMessage.textContent =
            "Perfect guess ✨";

    } else {

        resultTitle.textContent =
            "Round Complete 🌷";

        resultMessage.textContent =
            "Let's try another round.";
    }

    resultOverlay.classList.remove(
        "hidden"
    );
});

function newGame() {

    resultOverlay.classList.add(
        "hidden"
    );

    attempts = 0;

    attemptsText.textContent = "0";

    history.innerHTML = `
        <div class="empty-history">
            Your guesses will appear here
        </div>
    `;

    hint.textContent =
        "I'm thinking of a number...";

    socket.emit("game:new", {
        game: "guess"
    });
}

document
    .getElementById("newGameButton")
    .addEventListener(
        "click",
        newGame
    );

document
    .getElementById("resultNewGame")
    .addEventListener(
        "click",
        newGame
    );

document
    .getElementById("leaveButton")
    .addEventListener(
        "click",
        () => {
            window.location.href =
                "games.html";
        }
    );