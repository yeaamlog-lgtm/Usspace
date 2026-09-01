/* =========================================================
   USSPACE — memories.js
   Memories • Upload • Gallery • Download • Delete • Sync
   ========================================================= */

(() => {
    "use strict";

    /* =====================================================
       ELEMENTS
       ===================================================== */

    const uploadButton =
        document.getElementById("uploadButton");

    const emptyUploadButton =
        document.getElementById("emptyUploadButton");

    const memoryUpload =
        document.getElementById("memoryUpload");

    const memoryGrid =
        document.getElementById("memoryGrid");

    const emptyGallery =
        document.getElementById("emptyGallery");

    const memoryCount =
        document.getElementById("memoryCount");

    const clearMemories =
        document.getElementById("clearMemories");

    const imageViewer =
        document.getElementById("imageViewer");

    const viewerBackdrop =
        document.getElementById("viewerBackdrop");

    const viewerClose =
        document.getElementById("viewerClose");

    const viewerImage =
        document.getElementById("viewerImage");

    const viewerDate =
        document.getElementById("viewerDate");

    const viewerDownload =
        document.getElementById("viewerDownload");

    const viewerDelete =
        document.getElementById("viewerDelete");

    const sakuraContainer =
        document.getElementById("sakuraContainer");


    /* =====================================================
       CONFIG
       ===================================================== */

    const STORAGE_KEY =
        "usspace_memories";

    const USER_KEY =
        "usspaceUser";

    const ROOM_KEY =
        "usspaceRoom";


    /* =====================================================
       STATE
       ===================================================== */

    let memories = [];

    let currentMemoryId = null;

    let socket = null;

    const username =
        localStorage.getItem(USER_KEY) ||
        "prakhar";

    const roomId =
        localStorage.getItem(ROOM_KEY) ||
        "usspace-private";


    /* =====================================================
       LOAD LOCAL MEMORIES
       ===================================================== */

    function loadMemories() {

        try {

            const saved =
                localStorage.getItem(
                    STORAGE_KEY
                );

            memories =
                saved
                    ? JSON.parse(saved)
                    : [];

            if (
                !Array.isArray(memories)
            ) {
                memories = [];
            }

        } catch (error) {

            console.error(
                "Memory loading error:",
                error
            );

            memories = [];

        }

    }


    /* =====================================================
       SAVE LOCAL MEMORIES
       ===================================================== */

    function saveMemories() {

        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(memories)
            );

        } catch (error) {

            console.error(
                "Memory save error:",
                error
            );

            /*
             * Large photos can exceed
             * browser localStorage limits.
             * Real cloud storage should be
             * used for permanent large files.
             */

            showMessage(
                "Storage full — cloud storage needed"
            );

        }

    }


    /* =====================================================
       RENDER GALLERY
       ===================================================== */

    function renderGallery() {

        memoryGrid.innerHTML = "";

        memoryCount.textContent =
            memories.length;


        if (
            memories.length === 0
        ) {

            emptyGallery.style.display =
                "flex";

            return;

        }


        emptyGallery.style.display =
            "none";


        memories.forEach(
            (memory, index) => {

                const card =
                    createMemoryCard(
                        memory,
                        index
                    );

                memoryGrid.appendChild(
                    card
                );

            }
        );

    }


    /* =====================================================
       CREATE MEMORY CARD
       ===================================================== */

    function createMemoryCard(
        memory,
        index
    ) {

        const card =
            document.createElement(
                "article"
            );

        card.className =
            "memory-card";


        card.style.animationDelay =
            `${Math.min(index * 70, 500)}ms`;


        /* Image wrapper */

        const imageWrapper =
            document.createElement(
                "div"
            );

        imageWrapper.className =
            "memory-image-wrapper";


        /* Image */

        const image =
            document.createElement(
                "img"
            );

        image.className =
            "memory-image";

        image.alt =
            "Our memory";

        image.loading =
            "lazy";

        image.src =
            memory.data;


        /* Heart */

        const heart =
            document.createElement(
                "div"
            );

        heart.className =
            "memory-heart";

        heart.textContent =
            "❤️";


        imageWrapper.appendChild(
            image
        );

        imageWrapper.appendChild(
            heart
        );


        /* Info */

        const info =
            document.createElement(
                "div"
            );

        info.className =
            "memory-info";


        const date =
            document.createElement(
                "span"
            );

        date.className =
            "memory-date";

        date.textContent =
            formatDate(
                memory.createdAt
            );


        const open =
            document.createElement(
                "button"
            );

        open.className =
            "memory-open";

        open.type =
            "button";

        open.textContent =
            "View";


        info.appendChild(
            date
        );

        info.appendChild(
            open
        );


        card.appendChild(
            imageWrapper
        );

        card.appendChild(
            info
        );


        imageWrapper.addEventListener(
            "click",
            () => {

                openViewer(
                    memory.id
                );

            }
        );


        open.addEventListener(
            "click",
            () => {

                openViewer(
                    memory.id
                );

            }
        );


        return card;

    }


    /* =====================================================
       FILE UPLOAD
       ===================================================== */

    function openFilePicker() {

        memoryUpload.click();

    }


    uploadButton.addEventListener(
        "click",
        openFilePicker
    );


    emptyUploadButton.addEventListener(
        "click",
        openFilePicker
    );


    memoryUpload.addEventListener(
        "change",
        async event => {

            const files =
                Array.from(
                    event.target.files || []
                );


            if (
                files.length === 0
            ) {

                return;

            }


            for (
                const file of files
            ) {

                if (
                    !file.type.startsWith(
                        "image/"
                    )
                ) {

                    continue;

                }


                try {

                    const compressed =
                        await prepareImage(
                            file
                        );


                    const memory = {

                        id:
                            createId(),

                        data:
                            compressed,

                        createdAt:
                            Date.now(),

                        createdBy:
                            username

                    };


                    memories.unshift(
                        memory
                    );


                    saveMemories();

                    renderGallery();

                    emitMemory(
                        "memory-created",
                        memory
                    );


                } catch (error) {

                    console.error(
                        "Image error:",
                        error
                    );

                    showMessage(
                        "Photo add nahi ho paayi"
                    );

                }

            }


            memoryUpload.value =
                "";

        }
    );


    /* =====================================================
       IMAGE PREPARATION
       ===================================================== */

    function prepareImage(
        file
    ) {

        return new Promise(
            (resolve, reject) => {

                const reader =
                    new FileReader();


                reader.onload =
                    () => {

                        const image =
                            new Image();


                        image.onload =
                            () => {

                                const maxSize =
                                    1400;


                                let width =
                                    image.width;

                                let height =
                                    image.height;


                                if (
                                    width >
                                    maxSize ||
                                    height >
                                    maxSize
                                ) {

                                    const scale =
                                        Math.min(
                                            maxSize / width,
                                            maxSize / height
                                        );

                                    width =
                                        Math.round(
                                            width *
                                            scale
                                        );

                                    height =
                                        Math.round(
                                            height *
                                            scale
                                        );

                                }


                                const canvas =
                                    document.createElement(
                                        "canvas"
                                    );


                                canvas.width =
                                    width;

                                canvas.height =
                                    height;


                                const context =
                                    canvas.getContext(
                                        "2d"
                                    );


                                context.drawImage(
                                    image,
                                    0,
                                    0,
                                    width,
                                    height
                                );


                                resolve(
                                    canvas.toDataURL(
                                        "image/jpeg",
                                        .82
                                    )
                                );

                            };


                        image.onerror =
                            reject;


                        image.src =
                            reader.result;

                    };


                reader.onerror =
                    reject;


                reader.readAsDataURL(
                    file
                );

            }
        );

    }


    /* =====================================================
       OPEN VIEWER
       ===================================================== */

    function openViewer(
        id
    ) {

        const memory =
            memories.find(
                item =>
                    item.id === id
            );


        if (!memory) {
            return;
        }


        currentMemoryId =
            id;


        viewerImage.src =
            memory.data;


        viewerDate.textContent =
            `Saved ${formatDate(
                memory.createdAt
            )}`;


        imageViewer.classList.add(
            "active"
        );

        imageViewer.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.style.overflow =
            "hidden";

    }


    /* =====================================================
       CLOSE VIEWER
       ===================================================== */

    function closeViewer() {

        imageViewer.classList.remove(
            "active"
        );

        imageViewer.setAttribute(
            "aria-hidden",
            "true"
        );


        document.body.style.overflow =
            "";


        currentMemoryId =
            null;

    }


    viewerClose.addEventListener(
        "click",
        closeViewer
    );


    viewerBackdrop.addEventListener(
        "click",
        closeViewer
    );


    /* =====================================================
       DOWNLOAD PHOTO
       ===================================================== */

    viewerDownload.addEventListener(
        "click",
        () => {

            if (
                !currentMemoryId
            ) {

                return;

            }


            const memory =
                memories.find(
                    item =>
                        item.id ===
                        currentMemoryId
                );


            if (!memory) {
                return;
            }


            const link =
                document.createElement(
                    "a"
                );


            link.href =
                memory.data;


            link.download =
                `usspace-memory-${Date.now()}.jpg`;


            document.body.appendChild(
                link
            );


            link.click();

            link.remove();

        }
    );


    /* =====================================================
       DELETE CURRENT MEMORY
       ===================================================== */

    viewerDelete.addEventListener(
        "click",
        () => {

            if (
                !currentMemoryId
            ) {

                return;

            }


            const confirmed =
                confirm(
                    "Is memory ko delete karna hai?"
                );


            if (!confirmed) {
                return;
            }


            const id =
                currentMemoryId;


            memories =
                memories.filter(
                    memory =>
                        memory.id !== id
                );


            saveMemories();

            renderGallery();

            closeViewer();


            emitMemory(
                "memory-deleted",
                {
                    id
                }
            );

        }
    );


    /* =====================================================
       CLEAR ALL
       ===================================================== */

    clearMemories.addEventListener(
        "click",
        () => {

            if (
                memories.length === 0
            ) {

                return;

            }


            const confirmed =
                confirm(
                    "Saari memories delete karni hain?"
                );


            if (!confirmed) {
                return;
            }


            const ids =
                memories.map(
                    memory =>
                        memory.id
                );


            memories = [];

            saveMemories();

            renderGallery();


            emitMemory(
                "memories-cleared",
                {
                    ids
                }
            );

        }
    );


/* =====================================================
       SOCKET.IO
       ===================================================== */

    function connectSocket() {

        /*
         * Socket.IO script is optional here.
         * Add the server's Socket.IO client
         * before memories.js when server is ready.
         */

        if (
            typeof io !==
            "function"
        ) {

            console.log(
                "Socket.IO client not loaded. Local mode active."
            );

            return;

        }


        try {

            socket =
                io();


            socket.on(
                "connect",
                () => {

                    socket.emit(
                        "join-room",
                        {
                            roomId,
                            username
                        }
                    );

                    socket.emit(
                        "request-memories",
                        {
                            roomId
                        }
                    );

                }
            );


            /* Remote memory */

            socket.on(
                "memory-created",
                remoteMemory => {

                    const memory =
                        remoteMemory?.memory ||
                        remoteMemory;


                    if (
                        !memory ||
                        memory.createdBy ===
                        username
                    ) {

                        return;

                    }


                    const exists =
                        memories.some(
                            item =>
                                item.id ===
                                memory.id
                        );


                    if (!exists) {

                        memories.unshift(
                            memory
                        );

                        saveMemories();

                        renderGallery();

                        showMessage(
                            "🌸 New memory received"
                        );

                    }

                }
            );


            /* Remote deletion */

            socket.on(
                "memory-deleted",
                data => {

                    const id =
                        data?.id ||
                        data?.memory?.id;


                    if (!id) {
                        return;
                    }


                    memories =
                        memories.filter(
                            memory =>
                                memory.id !==
                                id
                        );


                    saveMemories();

                    renderGallery();

                }
            );


            /* Remote clear */

            socket.on(
                "memories-cleared",
                data => {

                    const ids =
                        data?.ids;


                    if (
                        Array.isArray(ids)
                    ) {

                        memories =
                            memories.filter(
                                memory =>
                                    !ids.includes(
                                        memory.id
                                    )
                            );

                    } else {

                        memories = [];

                    }


                    saveMemories();

                    renderGallery();

                }
            );


            /* Complete cloud sync */

            socket.on(
                "memories-sync",
                remoteMemories => {

                    if (
                        !Array.isArray(
                            remoteMemories
                        )
                    ) {

                        return;

                    }


                    memories =
                        mergeMemories(
                            memories,
                            remoteMemories
                        );


                    saveMemories();

                    renderGallery();

                }
            );


        } catch (error) {

            console.error(
                "Socket connection error:",
                error
            );

        }

    }


    /* =====================================================
       EMIT MEMORY
       ===================================================== */

    function emitMemory(
        eventName,
        data
    ) {

        if (
            !socket ||
            !socket.connected
        ) {

            return;

        }


        socket.emit(
            eventName,
            {
                roomId,
                username,
                ...(eventName.includes(
                    "memory"
                )
                    ? { memory: data }
                    : data)
            }
        );

    }


    /* =====================================================
       MERGE
       ===================================================== */

    function mergeMemories(
        local,
        remote
    ) {

        const map =
            new Map();


        local.forEach(
            memory => {

                map.set(
                    memory.id,
                    memory
                );

            }
        );


        remote.forEach(
            memory => {

                if (
                    !memory ||
                    !memory.id
                ) {

                    return;

                }


                if (
                    !map.has(
                        memory.id
                    )
                ) {

                    map.set(
                        memory.id,
                        memory
                    );

                }

            }
        );


        return Array.from(
            map.values()
        ).sort(
            (a, b) =>
                (
                    b.createdAt ||
                    0
                ) -
                (
                    a.createdAt ||
                    0
                )
        );

    }


    /* =====================================================
       FORMAT DATE
       ===================================================== */

    function formatDate(
        timestamp
    ) {

        if (!timestamp) {
            return "Unknown date";
        }


        const date =
            new Date(timestamp);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "Unknown date";

        }


        return date.toLocaleDateString(
            "en-IN",
            {
                day: "numeric",
                month: "short",
                year: "numeric"
            }
        );

    }


    /* =====================================================
       CREATE ID
       ===================================================== */

    function createId() {

        return (
            Date.now().toString(36) +
            "-" +
            Math.random()
                .toString(36)
                .slice(2, 10)
        );

    }


    /* =====================================================
       SMALL MESSAGE
       ===================================================== */

    function showMessage(
        message
    ) {

        const toast =
            document.createElement(
                "div"
            );


        toast.textContent =
            message;


        toast.style.position =
            "fixed";

        toast.style.left =
            "50%";

        toast.style.top =
            "18px";

        toast.style.transform =
            "translate(-50%, -15px)";

        toast.style.zIndex =
            "9999";

        toast.style.padding =
            "10px 15px";

        toast.style.borderRadius =
            "14px";

        toast.style.background =
            "rgba(255,255,255,.95)";

        toast.style.color =
            "#704655";

        toast.style.fontSize =
            "11px";

        toast.style.fontWeight =
            "800";

        toast.style.boxShadow =
            "0 12px 35px rgba(80,40,60,.16)";

        toast.style.opacity =
            "0";

        toast.style.transition =
            "all .3s ease";


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
                    300
                );

            },
            2200
        );

    }


    /* =====================================================
       SAKURA PETALS
       ===================================================== */

    function createPetal() {

        if (
            !sakuraContainer
        ) {

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
            Math.random() * 8;


        petal.style.width =
            `${size}px`;

        petal.style.height =
            `${size * .65}px`;


        petal.style.animationDuration =
            `${
                7 +
                Math.random() * 7
            }s`;


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
                i * 350
            );

        }


        setInterval(
            createPetal,
            850
        );

    }


    /* =====================================================
       KEYBOARD
       ===================================================== */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                if (
                    imageViewer.classList.contains(
                        "active"
                    )
                ) {

                    closeViewer();

                }

            }

        }
    );


    /* =====================================================
       INITIALIZE
       ===================================================== */

    function initialize() {

        loadMemories();

        renderGallery();

        startSakura();

        connectSocket();

    }


    initialize();

})();