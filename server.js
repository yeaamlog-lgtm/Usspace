/* =========================================================
   USSPACE • SERVER
   Express + Socket.IO
   ========================================================= */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");


/* =========================================================
   APP SETUP
   ========================================================= */

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});


/* =========================================================
   PORT
   ========================================================= */

const PORT = process.env.PORT || 3000;


/* =========================================================
   STATIC FILES
   ========================================================= */

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(
    express.static(
        path.join(__dirname)
    )
);


/* =========================================================
   HOME ROUTE
   ========================================================= */

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "index.html"
        )
    );

});


/* =========================================================
   HEALTH CHECK
   ========================================================= */

app.get("/status", (req, res) => {

    res.json({
        online: true,
        service: "USSPACE",
        socketIO: true,
        time: new Date().toISOString()
    });

});


/* =========================================================
   SOCKET.IO
   ========================================================= */

io.on("connection", (socket) => {

    console.log(
        "🌸 User connected:",
        socket.id
    );


    /* =====================================================
       JOIN PRIVATE SPACE
       ===================================================== */

    socket.on("join-space", (data = {}) => {

        /*
         * New Home.js sends:
         *
         * {
         *   username: "Prakhar",
         *   inviteCode: "US-5827"
         * }
         *
         * Older pages may send:
         *
         * {
         *   name: "Prakhar",
         *   room: "room123"
         * }
         *
         * Both are supported.
         */


        const name =
            typeof data.username === "string"
                ? data.username.trim()
                : (
                    typeof data.name === "string"
                        ? data.name.trim()
                        : "Guest"
                );


        const room =
            typeof data.inviteCode === "string"
                ? data.inviteCode.trim().toUpperCase()
                : (
                    typeof data.room === "string"
                        ? data.room.trim()
                        : "usspace-main"
                );


        if (!name || !room) {

            socket.emit(
                "space-error",
                "Invalid name or invite code."
            );

            return;
        }


        /*
         * If already inside another room,
         * leave it first.
         */

        if (socket.data.room) {

            socket.leave(
                socket.data.room
            );

        }


        /*
         * Maximum 2 people per private room.
         */

        const existingRoom =
            io.sockets.adapter.rooms.get(room);

        const existingCount =
            existingRoom
                ? existingRoom.size
                : 0;


        if (existingCount >= 2) {

            socket.emit(
                "space-error",
                "This space already has two players."
            );

            return;
        }


        socket.data.name = name;

        socket.data.username = name;

        socket.data.room = room;

        socket.data.inviteCode = room;


        socket.join(room);


        console.log(
            `💕 ${name} joined ${room}`
        );


        /*
         * Get members after joining.
         */

        const roomData =
            io.sockets.adapter.rooms.get(room);

        const memberCount =
            roomData
                ? roomData.size
                : 1;


        /*
         * Tell joining user.
         */

        socket.emit(
            "space-joined",
            {
                name: name,
                username: name,
                room: room,
                inviteCode: room,
                partner:
                    memberCount === 2
                        ? getPartnerName(
                            socket,
                            room
                        )
                        : null
            }
        );


        /*
         * Tell the other person.
         */

        socket.to(room).emit(
            "partner-joined",
            {
                name: name,
                username: name
            }
        );


        /*
         * Update room status.
         */

        io.to(room).emit(
            "room-status",
            {
                count: memberCount
            }
        );

    });


    /* =====================================================
       WEBRTC OFFER
       ===================================================== */

    socket.on(
        "webrtc-offer",
        (offer) => {

            const room =
                socket.data.room;

            if (!room) {
                return;
            }


            socket.to(room).emit(
                "webrtc-offer",
                {
                    offer,
                    from: socket.id
                }
            );

        }
    );


    /* =====================================================
       WEBRTC ANSWER
       ===================================================== */

    socket.on(
        "webrtc-answer",
        (answer) => {

            const room =
                socket.data.room;

            if (!room) {
                return;
            }


            socket.to(room).emit(
                "webrtc-answer",
                {
                    answer,
                    from: socket.id
                }
            );

        }
    );


    /* =====================================================
       WEBRTC ICE
       ===================================================== */

    socket.on(
        "webrtc-ice-candidate",
        (candidate) => {

            const room =
                socket.data.room;

            if (!room) {
                return;
            }


            socket.to(room).emit(
                "webrtc-ice-candidate",
                {
                    candidate,
                    from: socket.id
                }
            );

        }
    );


    /* =====================================================
       CHAT
       ===================================================== */

    socket.on(
        "chat-message",
        (data = {}) => {

            const room =
                socket.data.room;

            if (!room) {
                return;
            }


            const message =
                typeof data.message === "string"
                    ? data.message.trim()
                    : "";


            if (!message) {
                return;
            }


            /*
             * Prevent extremely large messages.
             */

            const safeMessage =
                message.slice(0, 500);


            io.to(room).emit(
                "chat-message",
                {
                    username:
                        socket.data.username ||
                        socket.data.name ||
                        "Partner",

                    name:
                        socket.data.name ||
                        "Partner",

                    message:
                        safeMessage
                }
            );

        }
    );


    /* =====================================================
       SHARE LOCATION
       ===================================================== */

    socket.on(
        "share-location",
        (data = {}) => {

            const room =
                socket.data.room;

            if (!room) {
                return;
            }


            const latitude =
                Number(data.latitude);

            const longitude =
                Number(data.longitude);


            if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude)
            ) {

                return;

            }


            socket.to(room).emit(
                "partner-location",
                {
                    latitude,
                    longitude,

                    username:
                        socket.data.username ||
                        socket.data.name ||
                        "Partner"
                }
            );

        }
    );


    /* =====================================================
       GAME EVENTS
       ===================================================== */

    socket.on(
        "game-event",
        (data = {}) => {

            const room =
                socket.data.room;

            if (!room) {
                return;
            }


            socket.to(room).emit(
                "game-event",
                {
                    ...data,
                    from: socket.id
                }
            );

        }
    );


    /* =====================================================
       CANVAS / DRAW EVENTS
       ===================================================== */

    socket.on(
        "draw-event",
        (data) => {

            const room =
                socket.data.room;

            if (!room) {
                return;
            }


            socket.to(room).emit(
                "draw-event",
                data
            );

        }
    );


    /* =====================================================
       SYNC EVENTS
       ===================================================== */

    socket.on(
        "sync-event",
        (data) => {

            const room =
                socket.data.room;

            if (!room) {
                return;
            }


            socket.to(room).emit(
                "sync-event",
                data
            );

        }
    );


    /* =====================================================
       TAKE A BREAK
       ===================================================== */

    socket.on(
        "take-a-break",
        () => {

            const room =
                socket.data.room;

            if (!room) {
                return;
            }


            socket.to(room).emit(
                "partner-break",
                {
                    name:
                        socket.data.name ||
                        "Partner"
                }
            );

        }
    );


    /* =====================================================
       LEAVE SPACE
       ===================================================== */

    socket.on(
        "leave-space",
        () => {

            const room =
                socket.data.room;

            if (!room) {
                return;
            }


            socket.to(room).emit(
                "partner-left",
                {
                    name:
                        socket.data.name ||
                        "Partner"
                }
            );


            socket.leave(room);


            socket.data.room = null;

            socket.data.inviteCode = null;

        }
    );


    /* =====================================================
       DISCONNECT
       ===================================================== */

    socket.on(
        "disconnect",
        () => {

            const room =
                socket.data.room;


            console.log(
                "👋 User disconnected:",
                socket.id
            );


            if (!room) {
                return;
            }


            socket.to(room).emit(
                "partner-left",
                {
                    name:
                        socket.data.name ||
                        "Partner"
                }
            );


            /*
             * Give remaining users the new count.
             */

            const roomData =
                io.sockets.adapter.rooms.get(room);

            const memberCount =
                roomData
                    ? roomData.size
                    : 0;


            io.to(room).emit(
                "room-status",
                {
                    count: memberCount
                }
            );

        }
    );

});


/* =========================================================
   HELPER
   ========================================================= */

function getPartnerName(
    currentSocket,
    room
) {

    const roomData =
        io.sockets.adapter.rooms.get(room);


    if (!roomData) {
        return null;
    }


    for (const socketId of roomData) {

        if (socketId === currentSocket.id) {
            continue;
        }


        const partner =
            io.sockets.sockets.get(socketId);


        if (partner) {

            return (
                partner.data.username ||
                partner.data.name ||
                "Partner"
            );

        }

    }


    return null;

}


/* =========================================================
   ERROR HANDLING
   ========================================================= */

process.on(
    "uncaughtException",
    (error) => {

        console.error(
            "❌ Server error:",
            error
        );

    }
);


process.on(
    "unhandledRejection",
    (error) => {

        console.error(
            "❌ Unhandled rejection:",
            error
        );

    }
);


/* =========================================================
   START SERVER
   ========================================================= */

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log("");

        console.log(
            "🌸 ==============================="
        );

        console.log(
            "        USSPACE SERVER ONLINE"
        );

        console.log(
            "🌸 ==============================="
        );

        console.log(
            `🚀 Port: ${PORT}`
        );

        console.log(
            `🌐 Local: http://localhost:${PORT}`
        );

        console.log(
            "💕 Socket.IO: READY"
        );

        console.log(
            "🔐 Private rooms: MAX 2 USERS"
        );

        console.log("");

    }
);
