/* =========================================================
   ZOMBIES - 3D FOUNDATION TEST
   Stable non-module build for GitHub Pages + mobile Safari
========================================================= */

(function () {
    "use strict";

    /* =====================================================
       ERROR SCREEN
    ====================================================== */

    const errorBox = document.getElementById("game-error");

    function showError(message) {
        console.error(message);

        if (!errorBox) return;

        errorBox.hidden = false;

        errorBox.style.position = "absolute";
        errorBox.style.left = "50%";
        errorBox.style.top = "50%";
        errorBox.style.transform = "translate(-50%, -50%)";
        errorBox.style.zIndex = "99999";
        errorBox.style.maxWidth = "80%";
        errorBox.style.padding = "18px 22px";
        errorBox.style.border = "2px solid white";
        errorBox.style.borderRadius = "12px";
        errorBox.style.background = "rgba(0,0,0,0.9)";
        errorBox.style.color = "white";
        errorBox.style.fontFamily = "Arial, sans-serif";
        errorBox.style.fontSize = "16px";
        errorBox.style.textAlign = "center";
        errorBox.style.pointerEvents = "none";

        errorBox.textContent = message;
    }


    window.addEventListener("error", function (event) {
        if (event && event.message) {
            showError("GAME ERROR: " + event.message);
        }
    });


    if (typeof THREE === "undefined") {
        showError(
            "THREE.JS FAILED TO LOAD. Check your internet connection, then refresh the page."
        );
        return;
    }


    /* =====================================================
       DOM
    ====================================================== */

    const canvas = document.getElementById("game");
    const gameContainer = document.getElementById("game-container");

    const moveStick = document.getElementById("move-stick");
    const moveKnob = document.getElementById("move-knob");

    const fireButton = document.getElementById("fire-button");
    const reloadButton = document.getElementById("reload-button");

    const magAmmoElement = document.getElementById("mag-ammo");
    const reserveAmmoElement = document.getElementById("reserve-ammo");


    if (
        !canvas ||
        !gameContainer ||
        !moveStick ||
        !moveKnob ||
        !fireButton ||
        !reloadButton
    ) {
        showError("GAME ERROR: One or more required HTML elements are missing.");
        return;
    }


    /* =====================================================
       SCENE
    ====================================================== */

    const scene = new THREE.Scene();

    scene.background = new THREE.Color(0x15171c);

    scene.fog = new THREE.Fog(
        0x15171c,
        18,
        45
    );


    /* =====================================================
       CAMERA
    ====================================================== */

    const camera = new THREE.PerspectiveCamera(
        72,
        window.innerWidth / window.innerHeight,
        0.1,
        100
    );

    camera.rotation.order = "YXZ";


    /* =====================================================
       RENDERER
    ====================================================== */

    let renderer;

    try {
        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: false,
            powerPreference: "high-performance"
        });
    } catch (error) {
        showError(
            "WEBGL COULD NOT START: " +
            (error && error.message ? error.message : "Unknown error")
        );
        return;
    }


    renderer.setPixelRatio(
        Math.min(
            window.devicePixelRatio || 1,
            2
        )
    );

    renderer.setSize(
        window.innerWidth,
        window.innerHeight,
        false
    );

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    renderer.outputEncoding = THREE.sRGBEncoding;


    /* =====================================================
       PLAYER
    ====================================================== */

    const player = {
        x: 0,
        y: 1.65,
        z: 7,

        yaw: 0,
        pitch: 0,

        joystickForward: 0,
        joystickRight: 0,

        keyboardForward: 0,
        keyboardRight: 0,

        speed: 4.0
    };


    camera.position.set(
        player.x,
        player.y,
        player.z
    );


    /* =====================================================
       ROOM DIMENSIONS
    ====================================================== */

    const ROOM_WIDTH = 18;
    const ROOM_DEPTH = 22;
    const ROOM_HEIGHT = 6;

    const PLAYER_PADDING = 0.7;


    /* =====================================================
       MATERIALS
    ====================================================== */

    function material(color, roughness) {
        return new THREE.MeshStandardMaterial({
            color: color,
            roughness: roughness,
            metalness: 0
        });
    }


    const floorMaterial = material(0x4a4a49, 0.95);
    const wallMaterial = material(0x77736a, 0.9);
    const ceilingMaterial = material(0x343434, 1);
    const darkMaterial = material(0x2a211d, 0.9);
    const crateMaterial = material(0x553b27, 0.9);
    const redMaterial = material(0x8f2020, 0.85);


    /* =====================================================
       BOX HELPER
    ====================================================== */

    function createBox(
        width,
        height,
        depth,
        x,
        y,
        z,
        meshMaterial,
        castShadow,
        receiveShadow
    ) {
        const geometry = new THREE.BoxGeometry(
            width,
            height,
            depth
        );

        const mesh = new THREE.Mesh(
            geometry,
            meshMaterial
        );

        mesh.position.set(
            x,
            y,
            z
        );

        mesh.castShadow = !!castShadow;
        mesh.receiveShadow = receiveShadow !== false;

        scene.add(mesh);

        return mesh;
    }


    /* =====================================================
       FLOOR
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
        true
    );


    /* =====================================================
       CEILING
    ====================================================== */

    createBox(
        ROOM_WIDTH,
        0.2,
        ROOM_DEPTH,
        0,
        ROOM_HEIGHT,
        0,
        ceilingMaterial,
        false,
        true
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
        true
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
        true
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
        true
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
        true
    );


    /* =====================================================
       CENTER PILLAR
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
        true
    );


    /* =====================================================
       CRATES
    ====================================================== */

    createBox(
        2.4,
        1.6,
        2,
        -4.2,
        0.8,
        -3.5,
        crateMaterial,
        true,
        true
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
        true
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
        true
    );


    /* =====================================================
       WALL MARKERS
    ====================================================== */

    for (let z = -8; z <= 8; z += 4) {
        createBox(
            0.15,
            2.1,
            1.2,
            -8.78,
            2,
            z,
            redMaterial,
            false,
            true
        );
    }


    /* =====================================================
       LIGHTING
    ====================================================== */

    const hemisphere = new THREE.HemisphereLight(
        0x9bb7db,
        0x211710,
        1.2
    );

    scene.add(hemisphere);


    const ceilingLight = new THREE.PointLight(
        0xffd7a8,
        2.2,
        26
    );

    ceilingLight.position.set(
        0,
        5.25,
        0
    );

    ceilingLight.castShadow = true;

    scene.add(ceilingLight);


    const lampMaterial = new THREE.MeshStandardMaterial({
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
        false
    );


    /* =====================================================
       FLOOR GRID

       Makes movement immediately obvious.
    ====================================================== */

    const grid = new THREE.GridHelper(
        18,
        18,
        0x777777,
        0x555555
    );

    grid.position.y = 0.01;

    scene.add(grid);


    /* =====================================================
       CAMERA ROTATION
    ====================================================== */

    function updateCameraRotation() {
        const limit = Math.PI / 2 - 0.05;

        player.pitch = THREE.MathUtils.clamp(
            player.pitch,
            -limit,
            limit
        );

        camera.rotation.y = player.yaw;
        camera.rotation.x = player.pitch;
    }


    /* =====================================================
       MOVEMENT VECTORS
    ====================================================== */

    const forwardVector = new THREE.Vector3();
    const rightVector = new THREE.Vector3();
    const moveVector = new THREE.Vector3();


    function getMovementInput() {
        let forward =
            player.joystickForward +
            player.keyboardForward;

        let right =
            player.joystickRight +
            player.keyboardRight;

        const length = Math.hypot(
            forward,
            right
        );

        if (length > 1) {
            forward /= length;
            right /= length;
        }

        return {
            forward: forward,
            right: right
        };
    }


    function updatePlayer(deltaTime) {
        const input = getMovementInput();

        if (
            Math.abs(input.forward) < 0.001 &&
            Math.abs(input.right) < 0.001
        ) {
            camera.position.set(
                player.x,
                player.y,
                player.z
            );

            return;
        }


        forwardVector.set(
            -Math.sin(player.yaw),
            0,
            -Math.cos(player.yaw)
        );


        rightVector.set(
            Math.cos(player.yaw),
            0,
            -Math.sin(player.yaw)
        );


        moveVector.set(0, 0, 0);

        moveVector.addScaledVector(
            forwardVector,
            input.forward
        );

        moveVector.addScaledVector(
            rightVector,
            input.right
        );


        if (moveVector.lengthSq() > 1) {
            moveVector.normalize();
        }


        moveVector.multiplyScalar(
            player.speed * deltaTime
        );


        player.x += moveVector.x;
        player.z += moveVector.z;


        player.x = THREE.MathUtils.clamp(
            player.x,
            -ROOM_WIDTH / 2 + PLAYER_PADDING,
            ROOM_WIDTH / 2 - PLAYER_PADDING
        );


        player.z = THREE.MathUtils.clamp(
            player.z,
            -ROOM_DEPTH / 2 + PLAYER_PADDING,
            ROOM_DEPTH / 2 - PLAYER_PADDING
        );


        camera.position.set(
            player.x,
            player.y,
            player.z
        );
    }


    /* =====================================================
       MOBILE JOYSTICK
    ====================================================== */

    let joystickPointerId = null;

    let joystickCenterX = 0;
    let joystickCenterY = 0;

    const JOYSTICK_MAX = 42;


    function setJoystickPosition(
        clientX,
        clientY
    ) {
        let dx = clientX - joystickCenterX;
        let dy = clientY - joystickCenterY;

        const distance = Math.hypot(
            dx,
            dy
        );


        if (distance > JOYSTICK_MAX) {
            const scale =
                JOYSTICK_MAX / distance;

            dx *= scale;
            dy *= scale;
        }


        moveKnob.style.transform =
            "translate(-50%, -50%) translate(" +
            dx +
            "px, " +
            dy +
            "px)";


        player.joystickRight =
            dx / JOYSTICK_MAX;

        player.joystickForward =
            -dy / JOYSTICK_MAX;
    }


    function resetJoystick() {
        joystickPointerId = null;

        player.joystickForward = 0;
        player.joystickRight = 0;

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
                rect.left + rect.width / 2;

            joystickCenterY =
                rect.top + rect.height / 2;


            try {
                moveStick.setPointerCapture(
                    event.pointerId
                );
            } catch (error) {
                // Safari may reject pointer capture
                // in some edge cases. Movement still works.
            }


            setJoystickPosition(
                event.clientX,
                event.clientY
            );
        },
        { passive: false }
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

            setJoystickPosition(
                event.clientX,
                event.clientY
            );
        },
        { passive: false }
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
        { passive: false }
    );


    moveStick.addEventListener(
        "pointercancel",
        resetJoystick
    );


    /* =====================================================
       TOUCH / MOUSE LOOK
    ====================================================== */

    let lookPointerId = null;

    let lastLookX = 0;
    let lastLookY = 0;


    function isControl(target) {
        return (
            moveStick.contains(target) ||
            fireButton.contains(target) ||
            reloadButton.contains(target)
        );
    }


    gameContainer.addEventListener(
        "pointerdown",
        function (event) {
            if (isControl(event.target)) {
                return;
            }

            if (lookPointerId !== null) {
                return;
            }

            event.preventDefault();

            lookPointerId = event.pointerId;

            lastLookX = event.clientX;
            lastLookY = event.clientY;


            try {
                gameContainer.setPointerCapture(
                    event.pointerId
                );
            } catch (error) {
                // Pointer capture is optional here.
            }
        },
        { passive: false }
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
                event.clientX - lastLookX;

            const dy =
                event.clientY - lastLookY;

            lastLookX = event.clientX;
            lastLookY = event.clientY;


            const sensitivity =
                event.pointerType === "touch"
                    ? 0.0042
                    : 0.003;


            player.yaw -=
                dx * sensitivity;

            player.pitch -=
                dy * sensitivity;


            updateCameraRotation();
        },
        { passive: false }
    );


    function endLook(event) {
        if (
            event.pointerId ===
            lookPointerId
        ) {
            lookPointerId = null;
        }
    }


    gameContainer.addEventListener(
        "pointerup",
        endLook
    );

    gameContainer.addEventListener(
        "pointercancel",
        endLook
    );


    /* =====================================================
       DESKTOP KEYBOARD
    ====================================================== */

    const keys = {
        w: false,
        s: false,
        a: false,
        d: false
    };


    function updateKeyboardInput() {
        player.keyboardForward =
            (keys.w ? 1 : 0) -
            (keys.s ? 1 : 0);

        player.keyboardRight =
            (keys.d ? 1 : 0) -
            (keys.a ? 1 : 0);
    }


    window.addEventListener(
        "keydown",
        function (event) {
            switch (event.code) {
                case "KeyW":
                case "ArrowUp":
                    keys.w = true;
                    break;

                case "KeyS":
                case "ArrowDown":
                    keys.s = true;
                    break;

                case "KeyA":
                case "ArrowLeft":
                    keys.a = true;
                    break;

                case "KeyD":
                case "ArrowRight":
                    keys.d = true;
                    break;
            }

            updateKeyboardInput();
        }
    );


    window.addEventListener(
        "keyup",
        function (event) {
            switch (event.code) {
                case "KeyW":
                case "ArrowUp":
                    keys.w = false;
                    break;

                case "KeyS":
                case "ArrowDown":
                    keys.s = false;
                    break;

                case "KeyA":
                case "ArrowLeft":
                    keys.a = false;
                    break;

                case "KeyD":
                case "ArrowRight":
                    keys.d = false;
                    break;
            }

            updateKeyboardInput();
        }
    );


    /* =====================================================
       TEMPORARY FIRE TEST

       This DOES visibly work now so we can confirm
       the button is receiving input.
    ====================================================== */

    let magAmmo = 8;
    let reserveAmmo = 32;


    function updateAmmoHUD() {
        magAmmoElement.textContent =
            String(magAmmo);

        reserveAmmoElement.textContent =
            String(reserveAmmo);
    }


    function flashCrosshair() {
        const crosshair =
            document.getElementById("crosshair");

        if (!crosshair) return;

        crosshair.style.transform =
            "translate(-50%, -50%) scale(1.45)";

        setTimeout(function () {
            crosshair.style.transform =
                "translate(-50%, -50%) scale(1)";
        }, 80);
    }


    fireButton.addEventListener(
        "pointerdown",
        function (event) {
            event.preventDefault();
            event.stopPropagation();

            if (magAmmo <= 0) {
                return;
            }

            magAmmo -= 1;

            updateAmmoHUD();
            flashCrosshair();
        },
        { passive: false }
    );


    /* =====================================================
       TEMPORARY RELOAD TEST
    ====================================================== */

    reloadButton.addEventListener(
        "pointerdown",
        function (event) {
            event.preventDefault();
            event.stopPropagation();

            const magazineSize = 8;

            const needed =
                magazineSize - magAmmo;

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

            magAmmo += amount;
            reserveAmmo -= amount;

            updateAmmoHUD();
        },
        { passive: false }
    );


    updateAmmoHUD();


    /* =====================================================
       RESIZE
    ====================================================== */

    function resizeGame() {
        const width =
            window.innerWidth;

        const height =
            window.innerHeight;


        if (
            width <= 0 ||
            height <= 0
        ) {
            return;
        }


        camera.aspect =
            width / height;

        camera.updateProjectionMatrix();


        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio || 1,
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


    window.addEventListener(
        "orientationchange",
        function () {
            setTimeout(
                resizeGame,
                150
            );
        }
    );


    /* =====================================================
       GAME LOOP
    ====================================================== */

    const clock = new THREE.Clock();


    function animate() {
        requestAnimationFrame(
            animate
        );

        const deltaTime =
            Math.min(
                clock.getDelta(),
                0.05
            );


        updatePlayer(
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

    resizeGame();

    animate();

    console.log(
        "Zombies 3D foundation loaded."
    );

})();