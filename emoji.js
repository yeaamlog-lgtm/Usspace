/* USSPACE • EMOJI GUESS */

const socket = io();

const emojiDisplay =
    document.getElementById("emojiDisplay");

const emojiHint =
    document.getElementById("emojiHint");

const answers =
    document.getElementById("emojiAnswers");

const answerMessage =
    document.getElementById("answerMessage");

const roundNumber =
    document.getElementById("roundNumber");

const yourScore =
    document.getElementById("emojiYourScore");

const partnerScore =
    document.getElementById("emojiPartnerScore");

const statusText =
    document.getElementById("gameStatus");

const connectionText =
    document.querySelector("#connectionStatus small");

const resultOverlay =
    document.getElementById("resultOverlay");

const resultTitle =
    document.getElementById("resultTitle");

const resultMessage =
    document.getElementById("resultMessage");

let currentQuestion = null;
let myScore = 0;
let partnerScoreValue = 0;
let round = 1;
let answered = false;

const localQuestions = [
    {
        emojis: "🌧️ ☂️",
        hint: "Think about the weather.",
        options: [
            "Rainy Day",
            "Beach Day",
            "Sunny Morning",
            "Winter Night"
        ],
        answer: "Rainy Day"
    },

    {
        emojis: "🍕 ❤️",
        hint: "A very popular love.",
        options: [
            "Pizza Love",
            "Sweet Dream",
            "Movie Night",
            "Summer Fun"
        ],
        answer: "Pizza Love"
    },

    {
        emojis: "🌙 😴",
        hint: "Something we all need.",
        options: [
            "Good Sleep",
            "Morning Walk",
            "Late Lunch",
            "Study Time"
        ],
        answer: "Good Sleep"
    },

    {
        emojis: "🎂 🎉",
        hint: "A special celebration.",
        options: [
            "Birthday",
            "School Day",
            "Rainy Day",
            "Travel Time"
        ],
        answer: "Birthday"
    },

    {
        emojis: "🌸 💕",
        hint: "A sweet little feeling.",
        options: [
            "Love",
            "Anger",
            "Homework",
            "Adventure"
        ],
        answer: "Love"
    }
];

function loadQuestion(question) {

    currentQuestion = question;
    answered = false;

    emojiDisplay.textContent =
        question.emojis;

    emojiHint.textContent =
        question.hint;

    answerMessage.textContent = "";

    answers.innerHTML = "";

    question.options.forEach(option => {

        const button =
            document.createElement("button");

        button.className =
            "emoji-answer";

        button.textContent =
            option;

        button.addEventListener(
            "click",
            () => chooseAnswer(
                option,
                button
            )
        );

        answers.appendChild(button);
    });

    roundNumber.textContent =
        `${round} / 10`;
}

function chooseAnswer(option, button) {

    if (answered) return;

    answered = true;

    const correct =
        option === currentQuestion.answer;

    if (correct) {

        button.classList.add("correct");

        answerMessage.textContent =
            "Correct! 🌸";

        myScore++;

        yourScore.textContent =
            myScore;

    } else {

        button.classList.add("wrong");

        answerMessage.textContent =
            `Answer: ${currentQuestion.answer}`;
    }

    socket.emit("game:emoji-answer", {
        game: "emoji-guess",
        answer: option,
        correct
    });

    setTimeout(() => {

        round++;

        if (round > 10) {
            finishGame();
            return;
        }

        const next =
            localQuestions[
                (round - 1) %
                localQuestions.length
            ];

        loadQuestion(next);

    }, 900);
}

socket.on("connect", () => {

    connectionText.textContent =
        "Connected";

    statusText.textContent =
        "Connected to your room";

    loadQuestion(localQuestions[0]);
});

socket.on("disconnect", () => {

    connectionText.textContent =
        "Offline";
});

socket.on("emoji:partner-score", data => {

    if (data.score !== undefined) {

        partnerScoreValue =
            data.score;

        partnerScore.textContent =
            partnerScoreValue;
    }
});

socket.on("game:state", data => {

    if (data.game !== "emoji-guess") return;

    if (data.partnerScore !== undefined) {

        partnerScoreValue =
            data.partnerScore;

        partnerScore.textContent =
            partnerScoreValue;
    }

    if (data.question) {
        loadQuestion(data.question);
    }
});

socket.on("game:result", data => {

    if (data.game !== "emoji-guess") return;

    finishGame(data);
});

function finishGame(data = {}) {

    if (myScore > partnerScoreValue) {

        resultTitle.textContent =
            "You Win! 🌸";

    } else if (
        myScore < partnerScoreValue
    ) {

        resultTitle.textContent =
            "Partner Wins! 🌷";

    } else {

        resultTitle.textContent =
            "It's a Tie! 💕";
    }

    resultMessage.textContent =
        `Final score: ${myScore} — ${partnerScoreValue}`;

    resultOverlay.classList.remove(
        "hidden"
    );
}

function newGame() {

    resultOverlay.classList.add(
        "hidden"
    );

    myScore = 0;
    partnerScoreValue = 0;
    round = 1;

    yourScore.textContent = "0";
    partnerScore.textContent = "0";

    socket.emit("game:new", {
        game: "emoji-guess"
    });

    loadQuestion(localQuestions[0]);
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