/* =========================================================
   ZOMBIES
   BUILD 2.2
   HARD COLLISION + MOBILE HUD COMPATIBILITY
========================================================= */

(function () {
    "use strict";


    /* =====================================================
       DOM
    ====================================================== */

    const canvas =
        document.getElementById("game");

    const gameContainer =
        document.getElementById("game-container");

    const moveStick =
        document.getElementById("move-stick");

    const moveKnob =
        document.getElementById("move-knob");

    const fireButton =
        document.getElementById("fire-button");

    const reloadButton =
        document.getElementById("reload-button");

    const magAmmoElement =
        document.getElementById("mag-ammo");

    const reserveAmmoElement =
        document.getElementById("reserve-ammo");

    const crosshair =
        document.getElementById("crosshair");

    const errorBox =
        document.getElementById("game-error");


    /* =====================================================
       ERROR DISPLAY
    ====================================================== */

    function showError(message) {
        console.error(message);

        if (!errorBox) {
            return;
        }

        errorBox.hidden = false;

        errorBox.style.position = "absolute";
        errorBox.style.left = "50%";
        errorBox.style.top = "50%";
        errorBox.style.transform = "translate(-50%, -50%)";

        errorBox.style.padding = "16px";

        errorBox.style.color = "white";
        errorBox.style.background = "rgba(0, 0, 0, 0.9)";
        errorBox.style.border = "2px solid white";
        errorBox.style.borderRadius = "10px";

        errorBox.textContent = message;
    }


    if (typeof THREE === "undefined") {
        showError(
            "THREE.JS FAILED TO LOAD."
        );

        return;
    }


    /* =====================================================
       THREE CORE
    ====================================================== */

    const scene =
        new THREE.Scene();


    scene.background =
        new THREE.Color(
            0x15171c
        );


    scene.fog =
        new THREE.Fog(
            0x15171c,
            18,
            45
        );


    const camera =
        new THREE.PerspectiveCamera(
            72,
            1,
            0.1,
            100
        );


    camera.rotation.order =
        "YXZ";


    let renderer;


    try {
        renderer =
            new THREE.WebGLRenderer({
                canvas: canvas,
                antialias: true,
                powerPreference: "high-performance"
            });
    } catch (error) {
        showError(
            "WEBGL COULD NOT START."
        );

        return;
    }


    renderer.shadowMap.enabled = true;

    renderer.shadowMap.type =
        THREE.PCFSoftShadowMap;

    renderer.outputEncoding =
        THREE.sRGBEncoding;


    /* =====================================================
       ROOM
    ====================================================== */

    const ROOM_WIDTH = 18;
    const ROOM_DEPTH = 22;
    const ROOM_HEIGHT = 6;


    /* =====================================================
       PLAYER
    ====================================================== */

    const player = {
        position:
            new THREE.Vector3(
                0,
                1.65,
                7
            ),

        yaw: 0,
        pitch: 0,

        velocity:
            new THREE.Vector3(),

        walkSpeed: 4.15,

        acceleration: 20,
        deceleration: 16,

        radius: 0.55,

        joystickForward: 0,
        joystickRight: 0,

        keyboardForward: 0,
        keyboardRight: 0,

        touchSensitivity: 0.0037,
        mouseSensitivity: 0.0028,

        bobTime: 0
    };


    /* =====================================================
       COLLISION WORLD
    ====================================================== */

    /*
       Every obstacle is stored as a 2D X/Z rectangle.

       We expand the rectangles by player.radius when checking
       collision, which is equivalent to treating the player
       like a circular/capsule footprint for this simple map.
    */

    const blockers = [];


    function addBlocker(
        x,
        z,
        width,
        depth,
        name
    ) {
        blockers.push({
            name: name,

            minX:
                x -
                width / 2,

            maxX:
                x +
                width / 2,

            minZ:
                z -
                depth / 2,

            maxZ:
                z +
                depth / 2
        });
    }


    /* =====================================================
       MATERIAL HELPER
    ====================================================== */

    function makeMaterial(
        color,
        roughness
    ) {
        return new THREE.MeshStandardMaterial({
            color: color,
            roughness: roughness,
            metalness: 0
        });
    }


    const floorMaterial =
        makeMaterial(
            0x4a4a49,
            0.95
        );

    const wallMaterial =
        makeMaterial(
            0x77736a,
            0.9
        );

    const ceilingMaterial =
        makeMaterial(
            0x343434,
            1
        );

    const darkMaterial =
        makeMaterial(
            0x2a211d,
            0.9
        );

    const crateMaterial =
        makeMaterial(
            0x553b27,
            0.9
        );

    const redMaterial =
        makeMaterial(
            0x8f2020,
            0.85
        );


    /* =====================================================
       BOX CREATION
    ====================================================== */

    function createBox(
        width,
        height,
        depth,
        x,
        y,
        z,
        material,
        solid,
        name
    ) {
        const mesh =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    width,
                    height,
                    depth
                ),
                material
            );


        mesh.position.set(
            x,
            y,
            z
        );


        mesh.castShadow =
            !!solid;

        mesh.receiveShadow =
            true;


        scene.add(
            mesh
        );


        if (solid) {
            addBlocker(
                x,
                z,
                width,
                depth,
                name
            );
        }


        return mesh;
    }


    /* =====================================================
       FLOOR + CEILING
    ====================================================== */

    createBox(
        ROOM_WIDTH,
        0.25,
        ROOM_DEPTH,
        0,
        -0.125,
        0,
        floorMaterial,
        false,
        "floor"
    );


    createBox(
        ROOM_WIDTH,
        0.2,
        ROOM_DEPTH,
        0,
        ROOM_HEIGHT,
        0,
        ceilingMaterial,
        false,
        "ceiling"
    );


    /* =====================================================
       WALLS
    ====================================================== */

    createBox(
        0.3,
        ROOM_HEIGHT,
        ROOM_DEPTH,
        -ROOM_WIDTH / 2,
        ROOM_HEIGHT / 2,
        0,
        wallMaterial,
        false,
        "left wall"
    );


    createBox(
        0.3,
        ROOM_HEIGHT,
        ROOM_DEPTH,
        ROOM_WIDTH / 2,
        ROOM_HEIGHT / 2,
        0,
        wallMaterial,
        false,
        "right wall"
    );


    createBox(
        ROOM_WIDTH,
        ROOM_HEIGHT,
        0.3,
        0,
        ROOM_HEIGHT / 2,
        -ROOM_DEPTH / 2,
        wallMaterial,
        false,
        "back wall"
    );


    createBox(
        ROOM_WIDTH,
        ROOM_HEIGHT,
        0.3,
        0,
        ROOM_HEIGHT / 2,
        ROOM_DEPTH / 2,
        wallMaterial,
        false,
        "front wall"
    );


    /* =====================================================
       SOLID OBJECTS
    ====================================================== */

    createBox(
        1.4,
        4.2,
        1.4,
        0,
        2.1,
        0,
        darkMaterial,
        true,
        "pillar"
    );


    createBox(
        2.4,
        1.6,
        2,
        -4.2,
        0.8,
        -3.5,
        crateMaterial,
        true,
        "crate A"
    );


    createBox(
        2.8,
        1.1,
        1.8,
        4,
        0.55,
        2,
        crateMaterial,
        true,
        "crate B"
    );


    createBox(
        1.7,
        2.2,
        1.7,
        5,
        1.1,
        -5.5,
        crateMaterial,
        true,
        "crate C"
    );


    /* =====================================================
       VISUAL MARKERS
    ====================================================== */

    for (
        let z = -8;
        z <= 8;
        z += 4
    ) {
        createBox(
            0.15,
            2.1,
            1.2,
            -8.78,
            2,
            z,
            redMaterial,
            false,
            "marker"
        );
    }


    /* =====================================================
       FLOOR GRID
    ====================================================== */

    const grid =
        new THREE.GridHelper(
            18,
            18,
            0x777777,
            0x555555
        );


    grid.position.y =
        0.01;


    scene.add(
        grid
    );


    /* =====================================================
       LIGHTING
    ====================================================== */

    scene.add(
        new THREE.HemisphereLight(
            0x9bb7db,
            0x211710,
            1.2
        )
    );


    const roomLight =
        new THREE.PointLight(
            0xffd7a8,
            2.2,
            26
        );


    roomLight.position.set(
        0,
        5.25,
        0
    );


    roomLight.castShadow =
        true;


    scene.add(
        roomLight
    );


    const lampMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xffddb0,
            emissive: 0xffa23c,
            emissiveIntensity: 1.5
        });


    createBox(
        2.6,
        0.12,
        0.7,
        0,
        5.72,
        0,
        lampMaterial,
        false,
        "lamp"
    );


    /* =====================================================
       COLLISION HELPERS
    ====================================================== */

    function insideExpandedBlocker(
        x,
        z,
        blocker
    ) {
        return (
            x >
                blocker.minX -
                player.radius &&

            x <
                blocker.maxX +
                player.radius &&

            z >
                blocker.minZ -
                player.radius &&

            z <
                blocker.maxZ +
                player.radius
        );
    }


    function isPositionBlocked(
        x,
        z
    ) {
        const roomMinX =
            -ROOM_WIDTH / 2 +
            player.radius +
            0.2;

        const roomMaxX =
            ROOM_WIDTH / 2 -
            player.radius -
            0.2;

        const roomMinZ =
            -ROOM_DEPTH / 2 +
            player.radius +
            0.2;

        const roomMaxZ =
            ROOM_DEPTH / 2 -
            player.radius -
            0.2;


        if (
            x < roomMinX ||
            x > roomMaxX ||
            z < roomMinZ ||
            z > roomMaxZ
        ) {
            return true;
        }


        for (
            let i = 0;
            i < blockers.length;
            i += 1
        ) {
            if (
                insideExpandedBlocker(
                    x,
                    z,
                    blockers[i]
                )
            ) {
                return true;
            }
        }


        return false;
    }


    /*
       If the player ever somehow appears inside a solid,
       this forcibly pushes them to the nearest outside edge.

       This is important because it makes collision self-correcting
       even after a lag spike or unexpected browser frame.
    */

    function resolvePenetration() {
        for (
            let i = 0;
            i < blockers.length;
            i += 1
        ) {
            const box =
                blockers[i];


            const minX =
                box.minX -
                player.radius;

            const maxX =
                box.maxX +
                player.radius;

            const minZ =
                box.minZ -
                player.radius;

            const maxZ =
                box.maxZ +
                player.radius;


            const x =
                player.position.x;

            const z =
                player.position.z;


            if (
                x <= minX ||
                x >= maxX ||
                z <= minZ ||
                z >= maxZ
            ) {
                continue;
            }


            const distanceLeft =
                Math.abs(
                    x -
                    minX
                );

            const distanceRight =
                Math.abs(
                    maxX -
                    x
                );

            const distanceBack =
                Math.abs(
                    z -
                    minZ
                );

            const distanceFront =
                Math.abs(
                    maxZ -
                    z
                );


            const smallest =
                Math.min(
                    distanceLeft,
                    distanceRight,
                    distanceBack,
                    distanceFront
                );


            if (
                smallest ===
                distanceLeft
            ) {
                player.position.x =
                    minX -
                    0.001;

                player.velocity.x = 0;
            } else if (
                smallest ===
                distanceRight
            ) {
                player.position.x =
                    maxX +
                    0.001;

                player.velocity.x = 0;
            } else if (
                smallest ===
                distanceBack
            ) {
                player.position.z =
                    minZ -
                    0.001;

                player.velocity.z = 0;
            } else {
                player.position.z =
                    maxZ +
                    0.001;

                player.velocity.z = 0;
            }
        }
    }


    function moveAxisX(
        amount
    ) {
        if (
            amount === 0
        ) {
            return;
        }


        const nextX =
            player.position.x +
            amount;


        if (
            isPositionBlocked(
                nextX,
                player.position.z
            )
        ) {
            player.velocity.x = 0;

            return;
        }


        player.position.x =
            nextX;
    }


    function moveAxisZ(
        amount
    ) {
        if (
            amount === 0
        ) {
            return;
        }


        const nextZ =
            player.position.z +
            amount;


        if (
            isPositionBlocked(
                player.position.x,
                nextZ
            )
        ) {
            player.velocity.z = 0;

            return;
        }


        player.position.z =
            nextZ;
    }


    function movePlayerWithCollision(
        deltaX,
        deltaZ
    ) {
        /*
           Very small maximum movement step.
           At normal speed this usually means 2-4 collision checks
           per frame and prevents passing through objects.
        */

        const distance =
            Math.hypot(
                deltaX,
                deltaZ
            );


        const maxStep =
            0.025;


        const steps =
            Math.max(
                1,
                Math.ceil(
                    distance /
                    maxStep
                )
            );


        const stepX =
            deltaX /
            steps;

        const stepZ =
            deltaZ /
            steps;


        for (
            let i = 0;
            i < steps;
            i += 1
        ) {
            moveAxisX(
                stepX
            );

            moveAxisZ(
                stepZ
            );

            resolvePenetration();
        }


        /*
           Clamp to room after object collision too.
        */

        player.position.x =
            THREE.MathUtils.clamp(
                player.position.x,
                -ROOM_WIDTH / 2 +
                    player.radius +
                    0.2,
                ROOM_WIDTH / 2 -
                    player.radius -
                    0.2
            );


        player.position.z =
            THREE.MathUtils.clamp(
                player.position.z,
                -ROOM_DEPTH / 2 +
                    player.radius +
                    0.2,
                ROOM_DEPTH / 2 -
                    player.radius -
                    0.2
            );


        resolvePenetration();
    }


    /* =====================================================
       LOOK
    ====================================================== */

    function updateCameraRotation() {
        const limit =
            Math.PI / 2 -
            0.08;


        player.pitch =
            THREE.MathUtils.clamp(
                player.pitch,
                -limit,
                limit
            );


        camera.rotation.y =
            player.yaw;

        camera.rotation.x =
            player.pitch;
    }


    /* =====================================================
       MOVEMENT INPUT
    ====================================================== */

    const forwardVector =
        new THREE.Vector3();

    const rightVector =
        new THREE.Vector3();

    const desiredDirection =
        new THREE.Vector3();


    function getInput() {
        let forward =
            player.joystickForward +
            player.keyboardForward;

        let right =
            player.joystickRight +
            player.keyboardRight;


        const length =
            Math.hypot(
                forward,
                right
            );


        if (
            length > 1
        ) {
            forward /=
                length;

            right /=
                length;
        }


        return {
            forward: forward,
            right: right
        };
    }


    function approach(
        current,
        target,
        amount
    ) {
        if (
            current < target
        ) {
            return Math.min(
                current + amount,
                target
            );
        }


        if (
            current > target
        ) {
            return Math.max(
                current - amount,
                target
            );
        }


        return target;
    }


    function updateMovement(
        deltaTime
    ) {
        const input =
            getInput();


        forwardVector.set(
            -Math.sin(
                player.yaw
            ),
            0,
            -Math.cos(
                player.yaw
            )
        );


        rightVector.set(
            Math.cos(
                player.yaw
            ),
            0,
            -Math.sin(
                player.yaw
            )
        );


        desiredDirection.set(
            0,
            0,
            0
        );


        desiredDirection.addScaledVector(
            forwardVector,
            input.forward
        );


        desiredDirection.addScaledVector(
            rightVector,
            input.right
        );


        if (
            desiredDirection.lengthSq() >
            1
        ) {
            desiredDirection.normalize();
        }


        const targetX =
            desiredDirection.x *
            player.walkSpeed;

        const targetZ =
            desiredDirection.z *
            player.walkSpeed;


        const moving =
            Math.abs(
                input.forward
            ) > 0.01 ||
            Math.abs(
                input.right
            ) > 0.01;


        const rate =
            moving
                ? player.acceleration
                : player.deceleration;


        player.velocity.x =
            approach(
                player.velocity.x,
                targetX,
                rate * deltaTime
            );


        player.velocity.z =
            approach(
                player.velocity.z,
                targetZ,
                rate * deltaTime
            );


        movePlayerWithCollision(
            player.velocity.x *
                deltaTime,

            player.velocity.z *
                deltaTime
        );


        const speed =
            Math.hypot(
                player.velocity.x,
                player.velocity.z
            );


        let bob =
            0;


        if (
            moving &&
            speed > 0.15
        ) {
            player.bobTime +=
                deltaTime *
                8.5;


            bob =
                Math.sin(
                    player.bobTime
                ) *
                0.022;
        } else {
            player.bobTime =
                0;
        }


        camera.position.set(
            player.position.x,
            player.position.y +
                bob,
            player.position.z
        );
    }


    /* =====================================================
       JOYSTICK
    ====================================================== */

    let joystickPointerId =
        null;

    let joystickCenterX =
        0;

    let joystickCenterY =
        0;

    const joystickRadius =
        42;

    const joystickDeadzone =
        0.12;


    function deadzone(
        value
    ) {
        const absolute =
            Math.abs(
                value
            );


        if (
            absolute <
            joystickDeadzone
        ) {
            return 0;
        }


        return (
            Math.sign(
                value
            ) *
            (
                absolute -
                joystickDeadzone
            ) /
            (
                1 -
                joystickDeadzone
            )
        );
    }


    function updateJoystick(
        clientX,
        clientY
    ) {
        let dx =
            clientX -
            joystickCenterX;

        let dy =
            clientY -
            joystickCenterY;


        const distance =
            Math.hypot(
                dx,
                dy
            );


        if (
            distance >
            joystickRadius
        ) {
            const scale =
                joystickRadius /
                distance;


            dx *=
                scale;

            dy *=
                scale;
        }


        moveKnob.style.transform =
            "translate(-50%, -50%) translate(" +
            dx +
            "px, " +
            dy +
            "px)";


        player.joystickRight =
            deadzone(
                dx /
                joystickRadius
            );


        player.joystickForward =
            deadzone(
                -dy /
                joystickRadius
            );
    }


    function resetJoystick() {
        joystickPointerId =
            null;


        player.joystickForward =
            0;

        player.joystickRight =
            0;


        moveKnob.style.transform =
            "translate(-50%, -50%)";
    }


    moveStick.addEventListener(
        "pointerdown",
        function (event) {
            event.preventDefault();
            event.stopPropagation();


            joystickPointerId =
                event.pointerId;


            const rect =
                moveStick.getBoundingClientRect();


            joystickCenterX =
                rect.left +
                rect.width / 2;

            joystickCenterY =
                rect.top +
                rect.height / 2;


            try {
                moveStick.setPointerCapture(
                    event.pointerId
                );
            } catch (error) {
                /* Safari fallback */
            }


            updateJoystick(
                event.clientX,
                event.clientY
            );
        },
        {
            passive: false
        }
    );


    moveStick.addEventListener(
        "pointermove",
        function (event) {
            if (
                event.pointerId !==
                joystickPointerId
            ) {
                return;
            }


            event.preventDefault();
            event.stopPropagation();


            updateJoystick(
                event.clientX,
                event.clientY
            );
        },
        {
            passive: false
        }
    );


    moveStick.addEventListener(
        "pointerup",
        function (event) {
            if (
                event.pointerId ===
                joystickPointerId
            ) {
                event.preventDefault();
                event.stopPropagation();

                resetJoystick();
            }
        },
        {
            passive: false
        }
    );


    moveStick.addEventListener(
        "pointercancel",
        resetJoystick
    );


    /* =====================================================
       TOUCH / MOUSE LOOK
    ====================================================== */

    let lookPointerId =
        null;

    let lastLookX =
        0;

    let lastLookY =
        0;

    let pendingLookX =
        0;

    let pendingLookY =
        0;


    function targetIsControl(
        target
    ) {
        return (
            moveStick.contains(
                target
            ) ||
            fireButton.contains(
                target
            ) ||
            reloadButton.contains(
                target
            )
        );
    }


    gameContainer.addEventListener(
        "pointerdown",
        function (event) {
            if (
                targetIsControl(
                    event.target
                )
            ) {
                return;
            }


            if (
                lookPointerId !==
                null
            ) {
                return;
            }


            event.preventDefault();


            lookPointerId =
                event.pointerId;

            lastLookX =
                event.clientX;

            lastLookY =
                event.clientY;


            try {
                gameContainer.setPointerCapture(
                    event.pointerId
                );
            } catch (error) {
                /* Safari fallback */
            }
        },
        {
            passive: false
        }
    );


    gameContainer.addEventListener(
        "pointermove",
        function (event) {
            if (
                event.pointerId !==
                lookPointerId
            ) {
                return;
            }


            event.preventDefault();


            const dx =
                event.clientX -
                lastLookX;

            const dy =
                event.clientY -
                lastLookY;


            lastLookX =
                event.clientX;

            lastLookY =
                event.clientY;


            const sensitivity =
                event.pointerType ===
                "touch"
                    ? player.touchSensitivity
                    : player.mouseSensitivity;


            pendingLookX +=
                dx *
                sensitivity;

            pendingLookY +=
                dy *
                sensitivity;
        },
        {
            passive: false
        }
    );


    function stopLook(
        event
    ) {
        if (
            event.pointerId ===
            lookPointerId
        ) {
            lookPointerId =
                null;
        }
    }


    gameContainer.addEventListener(
        "pointerup",
        stopLook
    );


    gameContainer.addEventListener(
        "pointercancel",
        stopLook
    );


    function updateLook() {
        const smoothing =
            0.58;


        const applyX =
            pendingLookX *
            smoothing;

        const applyY =
            pendingLookY *
            smoothing;


        player.yaw -=
            applyX;

        player.pitch -=
            applyY;


        pendingLookX -=
            applyX;

        pendingLookY -=
            applyY;


        updateCameraRotation();
    }


    /* =====================================================
       KEYBOARD
    ====================================================== */

    const keys = {
        forward: false,
        backward: false,
        left: false,
        right: false
    };


    function updateKeyboard() {
        player.keyboardForward =
            (
                keys.forward
                    ? 1
                    : 0
            ) -
            (
                keys.backward
                    ? 1
                    : 0
            );


        player.keyboardRight =
            (
                keys.right
                    ? 1
                    : 0
            ) -
            (
                keys.left
                    ? 1
                    : 0
            );
    }


    window.addEventListener(
        "keydown",
        function (event) {
            if (
                event.code === "KeyW" ||
                event.code === "ArrowUp"
            ) {
                keys.forward = true;
            }


            if (
                event.code === "KeyS" ||
                event.code === "ArrowDown"
            ) {
                keys.backward = true;
            }


            if (
                event.code === "KeyA" ||
                event.code === "ArrowLeft"
            ) {
                keys.left = true;
            }


            if (
                event.code === "KeyD" ||
                event.code === "ArrowRight"
            ) {
                keys.right = true;
            }


            updateKeyboard();
        }
    );


    window.addEventListener(
        "keyup",
        function (event) {
            if (
                event.code === "KeyW" ||
                event.code === "ArrowUp"
            ) {
                keys.forward = false;
            }


            if (
                event.code === "KeyS" ||
                event.code === "ArrowDown"
            ) {
                keys.backward = false;
            }


            if (
                event.code === "KeyA" ||
                event.code === "ArrowLeft"
            ) {
                keys.left = false;
            }


            if (
                event.code === "KeyD" ||
                event.code === "ArrowRight"
            ) {
                keys.right = false;
            }


            updateKeyboard();
        }
    );


    /* =====================================================
       FIRE / RELOAD INPUT TEST
    ====================================================== */

    let magAmmo =
        8;

    let reserveAmmo =
        32;


    function updateAmmoHUD() {
        magAmmoElement.textContent =
            String(
                magAmmo
            );


        reserveAmmoElement.textContent =
            String(
                reserveAmmo
            );
    }


    function pulseCrosshair() {
        crosshair.style.transform =
            "translate(-50%, -50%) scale(1.45)";


        setTimeout(
            function () {
                crosshair.style.transform =
                    "translate(-50%, -50%) scale(1)";
            },
            70
        );
    }


    fireButton.addEventListener(
        "pointerdown",
        function (event) {
            event.preventDefault();
            event.stopPropagation();


            if (
                magAmmo <= 0
            ) {
                return;
            }


            magAmmo -=
                1;


            updateAmmoHUD();

            pulseCrosshair();
        },
        {
            passive: false
        }
    );


    reloadButton.addEventListener(
        "pointerdown",
        function (event) {
            event.preventDefault();
            event.stopPropagation();


            const magazineSize =
                8;


            const needed =
                magazineSize -
                magAmmo;


            if (
                needed <= 0 ||
                reserveAmmo <= 0
            ) {
                return;
            }


            const amount =
                Math.min(
                    needed,
                    reserveAmmo
                );


            magAmmo +=
                amount;

            reserveAmmo -=
                amount;


            updateAmmoHUD();
        },
        {
            passive: false
        }
    );


    updateAmmoHUD();


    /* =====================================================
       RESIZE

       visualViewport is important on iOS Safari because the visible
       viewport can differ from the CSS/layout viewport.
    ====================================================== */

    function resizeGame() {
        const viewport =
            window.visualViewport;


        const width =
            viewport
                ? viewport.width
                : window.innerWidth;


        const height =
            viewport
                ? viewport.height
                : window.innerHeight;


        if (
            width <= 0 ||
            height <= 0
        ) {
            return;
        }


        camera.aspect =
            width /
            height;


        camera.updateProjectionMatrix();


        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio ||
                    1,
                2
            )
        );


        renderer.setSize(
            width,
            height,
            false
        );
    }


    window.addEventListener(
        "resize",
        resizeGame
    );


    if (
        window.visualViewport
    ) {
        window.visualViewport.addEventListener(
            "resize",
            resizeGame
        );
    }


    window.addEventListener(
        "orientationchange",
        function () {
            setTimeout(
                resizeGame,
                180
            );
        }
    );


    /* =====================================================
       GAME LOOP
    ====================================================== */

    const clock =
        new THREE.Clock();


    function animate() {
        requestAnimationFrame(
            animate
        );


        const deltaTime =
            Math.min(
                clock.getDelta(),
                0.04
            );


        updateLook();

        updateMovement(
            deltaTime
        );


        renderer.render(
            scene,
            camera
        );
    }


    /* =====================================================
       START
    ====================================================== */

    updateCameraRotation();

    resolvePenetration();

    resizeGame();

    animate();


    console.log(
        "Zombies Build 2.2 loaded."
    );

})();