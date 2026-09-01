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

app.use(express.urlencoded({
    extended: true
}));

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
   SIMPLE HEALTH CHECK
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
       JOIN USER'S PRIVATE SPACE
       ===================================================== */

    socket.on("join-space", (data = {}) => {

        const name =
            typeof data.name === "string"
                ? data.name.trim()
                : "Guest";

        const room =
            typeof data.room === "string"
                ? data.room.trim()
                : "usspace-main";


        socket.data.name = name;
        socket.data.room = room;

        socket.join(room);


        console.log(
            `💕 ${name} joined ${room}`
        );


        /* Tell the joining user */

        socket.emit(
            "space-joined",
            {
                name,
                room
            }
        );


        /* Tell the other person */

        socket.to(room).emit(
            "partner-joined",
            {
                name
            }
        );


        /* Give current member count */

        const roomData =
            io.sockets.adapter.rooms.get(room);

        const memberCount =
            roomData
                ? roomData.size
                : 1;


        io.to(room).emit(
            "room-status",
            {
                count: memberCount
            }
        );

    });



    /* =====================================================
       WEBRTC SIGNALING
       ===================================================== */

    socket.on("webrtc-offer", (offer) => {

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

    });



    socket.on("webrtc-answer", (answer) => {

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

    });



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
       GAME EVENTS
       ===================================================== */

    socket.on("game-event", (data) => {

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

    });



    /* =====================================================
       CANVAS / DRAW EVENTS
       ===================================================== */

    socket.on("draw-event", (data) => {

        const room =
            socket.data.room;

        if (!room) {
            return;
        }


        socket.to(room).emit(
            "draw-event",
            data
        );

    });



    /* =====================================================
       CHAT / NOTE / SHARED DATA EVENTS
       ===================================================== */

    socket.on("sync-event", (data) => {

        const room =
            socket.data.room;

        if (!room) {
            return;
        }


        socket.to(room).emit(
            "sync-event",
            data
        );

    });



    /* =====================================================
       TAKE A BREAK
       ===================================================== */

    socket.on("take-a-break", () => {

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

    });



    /* =====================================================
       LEAVE SPACE
       ===================================================== */

    socket.on("leave-space", () => {

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

    });



    /* =====================================================
       DISCONNECT
       ===================================================== */

    socket.on("disconnect", () => {

        const room =
            socket.data.room;


        console.log(
            "👋 User disconnected:",
            socket.id
        );


        if (room) {

            socket.to(room).emit(
                "partner-left",
                {
                    name:
                        socket.data.name ||
                        "Partner"
                }
            );


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

    });

});


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
            "      USSPACE SERVER ONLINE"
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

        console.log("");

    }
);