/* =========================================================
   USSPACE — NOTES.JS
   Sticky Notes • Edit • Delete • Autosave • Sync Ready
   ========================================================= */

(() => {
    "use strict";

    /* =====================================================
       ELEMENTS
       ===================================================== */

    const notesWall =
        document.getElementById("notesWall");

    const emptyNotes =
        document.getElementById("emptyNotes");

    const addNoteButton =
        document.getElementById("addNoteButton");

    const emptyAddButton =
        document.getElementById("emptyAddButton");

    const noteModal =
        document.getElementById("noteModal");

    const modalBackdrop =
        document.getElementById("modalBackdrop");

    const closeEditor =
        document.getElementById("closeEditor");

    const cancelNote =
        document.getElementById("cancelNote");

    const saveNote =
        document.getElementById("saveNote");

    const noteTitle =
        document.getElementById("noteTitle");

    const noteContent =
        document.getElementById("noteContent");

    const notesCount =
        document.getElementById("notesCount");

    const saveStatus =
        document.getElementById("saveStatus");

    const statusDot =
        document.getElementById("statusDot");

    const statusText =
        document.getElementById("statusText");

    const sakuraContainer =
        document.getElementById("sakuraContainer");


    /* =====================================================
       STATE
       ===================================================== */

    const STORAGE_KEY =
        "usspace_notes";

    let notes = [];

    let editingId = null;

    let selectedColor = "yellow";

    let socket = null;

    const username =
        localStorage.getItem("usspaceUser") ||
        "prakhar";

    const roomId =
        localStorage.getItem("usspaceRoom") ||
        "usspace-private";


    /* =====================================================
       LOCAL STORAGE
       ===================================================== */

    function loadLocalNotes() {

        try {

            const saved =
                localStorage.getItem(STORAGE_KEY);

            notes =
                saved
                    ? JSON.parse(saved)
                    : [];

            if (!Array.isArray(notes)) {
                notes = [];
            }

        } catch (error) {

            console.error(
                "Notes loading error:",
                error
            );

            notes = [];

        }

    }


    function saveLocalNotes() {

        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(notes)
            );

        } catch (error) {

            console.error(
                "Notes save error:",
                error
            );

        }

    }


    /* =====================================================
       SAVE STATUS
       ===================================================== */

    function setSaveStatus(
        state,
        text
    ) {

        statusDot.className =
            "status-dot";

        if (state) {

            statusDot.classList.add(
                state
            );

        }

        statusText.textContent =
            text;

    }


    function savingAnimation() {

        setSaveStatus(
            "saving",
            "Saving..."
        );

        setTimeout(() => {

            setSaveStatus(
                "",
                "Saved"
            );

        }, 450);

    }


    /* =====================================================
       RENDER NOTES
       ===================================================== */

    function renderNotes() {

        const oldNotes =
            notesWall.querySelectorAll(
                ".sticky-note"
            );

        oldNotes.forEach(note =>
            note.remove()
        );


        notesCount.textContent =
            notes.length;


        if (notes.length === 0) {

            emptyNotes.style.display =
                "flex";

            return;

        }


        emptyNotes.style.display =
            "none";


        notes.forEach(
            (note, index) => {

                const card =
                    createNoteCard(
                        note,
                        index
                    );

                notesWall.appendChild(
                    card
                );

            }
        );

    }


    /* =====================================================
       CREATE NOTE CARD
       ===================================================== */

    function createNoteCard(
        note,
        index
    ) {

        const card =
            document.createElement("article");

        card.className =
            `sticky-note ${note.color || "yellow"}`;

        const rotations = [
            "-1.5deg",
            "1.2deg",
            "-0.8deg",
            "1.8deg",
            "-2deg"
        ];

        card.style.setProperty(
            "--note-rotation",
            rotations[
                index %
                rotations.length
            ]
        );


        /* Pin */

        const pin =
            document.createElement("div");

        pin.className =
            "note-pin";


        /* Title */

        const title =
            document.createElement("h3");

        title.className =
            "note-title";

        title.textContent =
            note.title ||
            "Untitled note";


        /* Content */

        const content =
            document.createElement("p");

        content.className =
            "note-content";

        content.textContent =
            note.content ||
            "";


        /* Date */

        const date =
            document.createElement("span");

        date.className =
            "note-date";

        date.textContent =
            formatDate(
                note.updatedAt ||
                note.createdAt
            );


        /* Actions */

        const actions =
            document.createElement("div");

        actions.className =
            "note-actions";


        const editButton =
            document.createElement("button");

        editButton.className =
            "note-action";

        editButton.type =
            "button";

        editButton.textContent =
            "✏️";

        editButton.title =
            "Edit";


        const deleteButton =
            document.createElement("button");

        deleteButton.className =
            "note-action";

        deleteButton.type =
            "button";

        deleteButton.textContent =
            "🗑️";

        deleteButton.title =
            "Delete";


        editButton.addEventListener(
            "click",
            () => {

                openEditor(note);

            }
        );


        deleteButton.addEventListener(
            "click",
            () => {

                deleteNote(note.id);

            }
        );


        actions.appendChild(
            editButton
        );

        actions.appendChild(
            deleteButton
        );


        card.appendChild(pin);

        card.appendChild(title);

        card.appendChild(content);

        card.appendChild(date);

        card.appendChild(actions);


        return card;

    }


    /* =====================================================
       DATE
       ===================================================== */

    function formatDate(
        timestamp
    ) {

        if (!timestamp) {
            return "";
        }

        const date =
            new Date(timestamp);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "";

        }

        return date.toLocaleDateString(
            "en-IN",
            {
                day: "numeric",
                month: "short"
            }
        );

    }


    /* =====================================================
       OPEN EDITOR
       ===================================================== */

    function openEditor(note = null) {

        noteModal.classList.add(
            "active"
        );

        noteModal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow =
            "hidden";


        if (note) {

            editingId =
                note.id;

            noteTitle.value =
                note.title || "";

            noteContent.value =
                note.content || "";

            selectedColor =
                note.color ||
                "yellow";

        } else {

            editingId =
                null;

            noteTitle.value =
                "";

            noteContent.value =
                "";

            selectedColor =
                "yellow";

        }


        updateColorSelection();


        setTimeout(() => {

            noteTitle.focus();

        }, 100);

    }


    /* =====================================================
       CLOSE EDITOR
       ===================================================== */

    function closeEditorModal() {

        noteModal.classList.remove(
            "active"
        );

        noteModal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.style.overflow =
            "";

        editingId =
            null;

    }


    /* =====================================================
       COLOR SELECTION
       ===================================================== */

    function updateColorSelection() {

        const buttons =
            document.querySelectorAll(
                ".color-option"
            );

        buttons.forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.color ===
                selectedColor
            );

        });

    }


    document
        .querySelectorAll(".color-option")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    selectedColor =
                        button.dataset.color;

                    updateColorSelection();

                }
            );

        });


    /* =====================================================
       SAVE NOTE
       ===================================================== */

    function saveCurrentNote() {

        const title =
            noteTitle.value.trim();

        const content =
            noteContent.value.trim();


        if (!title && !content) {

            noteTitle.focus();

            return;

        }


        savingAnimation();


        const now =
            Date.now();


        if (editingId) {

            const index =
                notes.findIndex(
                    note =>
                        note.id ===
                        editingId
                );


            if (index !== -1) {

                notes[index] = {
                    ...notes[index],

                    title:
                        title ||
                        "Untitled note",

                    content,

                    color:
                        selectedColor,

                    updatedAt:
                        now,

                    updatedBy:
                        username
                };

            }

        } else {

            const newNote = {

                id:
                    createId(),

                title:
                    title ||
                    "Untitled note",

                content,

                color:
                    selectedColor,

                createdAt:
                    now,

                updatedAt:
                    now,

                createdBy:
                    username,

                updatedBy:
                    username

            };


            notes.unshift(
                newNote
            );


            /* Send to partner */

            emitNoteChange(
                "note-created",
                newNote
            );

        }


        if (editingId) {

            const updated =
                notes.find(
                    note =>
                        note.id ===
                        editingId
                );

            if (updated) {

                emitNoteChange(
                    "note-updated",
                    updated
                );

            }

        }


        saveLocalNotes();

        renderNotes();

        closeEditorModal();

    }


    /* =====================================================
       DELETE NOTE
       ===================================================== */

    function deleteNote(id) {

        const note =
            notes.find(
                item =>
                    item.id === id
            );


        if (!note) return;


        const confirmed =
            confirm(
                "Is note ko delete karna hai?"
            );


        if (!confirmed) {
            return;
        }


        notes =
            notes.filter(
                item =>
                    item.id !== id
            );


        saveLocalNotes();

        renderNotes();

        savingAnimation();


        emitNoteChange(
            "note-deleted",
            {
                id
            }
        );

    }


    /* =====================================================
       ID
       ===================================================== */

    function createId() {

        return (
            Date.now().toString(36) +
            Math.random()
                .toString(36)
                .slice(2, 8)
        );

    }


    /* =====================================================
       SOCKET.IO
       ===================================================== */

    function connectSocket() {

        if (
            typeof io !==
            "function"
        ) {

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

                }
            );


            /*
             * Server can send complete
             * notes collection.
             */

            socket.on(
                "notes-sync",
                remoteNotes => {

                    if (
                        !Array.isArray(
                            remoteNotes
                        )
                    ) {

                        return;

                    }


                    notes =
                        mergeNotes(
                            notes,
                            remoteNotes
                        );


                    saveLocalNotes();

                    renderNotes();

                }
            );


            /*
             * Single note events
             */

            socket.on(
                "note-created",
                remoteNote => {

                    if (
                        !remoteNote ||
                        remoteNote.createdBy ===
                        username
                    ) {

                        return;

                    }


                    const exists =
                        notes.some(
                            note =>
                                note.id ===
                                remoteNote.id
                        );


                    if (!exists) {

                        notes.unshift(
                            remoteNote
                        );

                        saveLocalNotes();

                        renderNotes();

                        showNoteNotification(
                            "🌸 New note received"
                        );

                    }

                }
            );


            socket.on(
                "note-updated",
                remoteNote => {

                    if (
                        !remoteNote ||
                        remoteNote.updatedBy ===
                        username
                    ) {

                        return;

                    }


                    const index =
                        notes.findIndex(
                            note =>
                                note.id ===
                                remoteNote.id
                        );


                    if (index !== -1) {

                        notes[index] =
                            remoteNote;

                    } else {

                        notes.unshift(
                            remoteNote
                        );

                    }


                    saveLocalNotes();

                    renderNotes();

                }
            );


            socket.on(
                "note-deleted",
                data => {

                    if (
                        !data ||
                        !data.id
                    ) {

                        return;

                    }


                    notes =
                        notes.filter(
                            note =>
                                note.id !==
                                data.id
                        );


                    saveLocalNotes();

                    renderNotes();

                }
            );


        } catch (error) {

            console.error(
                "Socket error:",
                error
            );

        }

    }


    /* =====================================================
       SEND NOTE EVENT
       ===================================================== */

    function emitNoteChange(
        type,
        data
    ) {

        if (
            !socket ||
            !socket.connected
        ) {

            return;

        }


        socket.emit(
            type,
            {
                roomId,
                username,
                note: data
            }
        );

    }


    /* =====================================================
       MERGE NOTES
       ===================================================== */

    function mergeNotes(
        local,
        remote
    ) {

        const map =
            new Map();


        local.forEach(note => {

            map.set(
                note.id,
                note
            );

        });


        remote.forEach(note => {

            const existing =
                map.get(note.id);


            if (
                !existing ||
                (
                    note.updatedAt ||
                    0
                ) >
                (
                    existing.updatedAt ||
                    0
                )
            ) {

                map.set(
                    note.id,
                    note
                );

            }

        });


        return Array.from(
            map.values()
        ).sort(
            (a, b) =>
                (
                    b.updatedAt ||
                    0
                ) -
                (
                    a.updatedAt ||
                    0
                )
        );

    }


/* =====================================================
       NOTIFICATION
       ===================================================== */

    function showNoteNotification(
        message
    ) {

        const notification =
            document.createElement(
                "div"
            );


        notification.textContent =
            message;


        notification.style.position =
            "fixed";

        notification.style.left =
            "50%";

        notification.style.top =
            "18px";

        notification.style.transform =
            "translateX(-50%) translateY(-15px)";

        notification.style.zIndex =
            "9999";

        notification.style.padding =
            "10px 15px";

        notification.style.borderRadius =
            "14px";

        notification.style.background =
            "rgba(255,255,255,.94)";

        notification.style.color =
            "#704655";

        notification.style.fontSize =
            "11px";

        notification.style.fontWeight =
            "800";

        notification.style.boxShadow =
            "0 12px 35px rgba(100,50,70,.15)";

        notification.style.opacity =
            "0";

        notification.style.transition =
            "all .35s ease";


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
                "translateX(-50%) translateY(-10px)";

            setTimeout(
                () =>
                    notification.remove(),
                350
            );

        }, 2200);

    }


    /* =====================================================
       SAKURA PETALS
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
            Math.random() *
            100 +
            "%";


        const size =
            7 +
            Math.random() *
            8;


        petal.style.width =
            size +
            "px";

        petal.style.height =
            size * .65 +
            "px";


        const duration =
            7 +
            Math.random() *
            7;


        petal.style.animationDuration =
            duration +
            "s";


        petal.style.animationDelay =
            Math.random() *
            2 +
            "s";


        sakuraContainer.appendChild(
            petal
        );


        setTimeout(
            () =>
                petal.remove(),
            (
                duration +
                3
            ) * 1000
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
                    noteModal.classList.contains(
                        "active"
                    )
                ) {

                    closeEditorModal();

                }

            }


            if (
                event.ctrlKey &&
                event.key === "Enter"
            ) {

                if (
                    noteModal.classList.contains(
                        "active"
                    )
                ) {

                    saveCurrentNote();

                }

            }

        }
    );


    /* =====================================================
       BUTTON EVENTS
       ===================================================== */

    addNoteButton.addEventListener(
        "click",
        () =>
            openEditor()
    );


    emptyAddButton.addEventListener(
        "click",
        () =>
            openEditor()
    );


    saveNote.addEventListener(
        "click",
        saveCurrentNote
    );


    cancelNote.addEventListener(
        "click",
        closeEditorModal
    );


    closeEditor.addEventListener(
        "click",
        closeEditorModal
    );


    modalBackdrop.addEventListener(
        "click",
        closeEditorModal
    );


    /* =====================================================
       INITIALIZE
       ===================================================== */

    function initialize() {

        loadLocalNotes();

        renderNotes();

        startSakura();

        connectSocket();

    }


    initialize();

})();