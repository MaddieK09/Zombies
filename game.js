import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js";

/* =========================================================
   ZOMBIES - FIRST 3D PLAYABLE TEST
   ---------------------------------------------------------
   Current milestone:
   - Three.js renderer
   - First-person camera
   - Simple 3D test room
   - Lighting
   - Mobile joystick movement
   - Mobile drag-to-look
   - Desktop WASD + mouse drag
   - Responsive landscape rendering

   Zombies, weapons, collision, doors, rounds, etc. come later.
========================================================= */


/* =========================================================
   DOM REFERENCES
========================================================= */

const canvas = document.getElementById("game");
const gameContainer = document.getElementById("game-container");

const moveStick = document.getElementById("move-stick");
const moveKnob = document.getElementById("move-knob");

const fireButton = document.getElementById("fire-button");
const reloadButton = document.getElementById("reload-button");


/* =========================================================
   THREE.JS CORE
========================================================= */

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x111318);
scene.fog = new THREE.Fog(0x111318, 15, 45);


const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);


/* =========================================================
   RENDERER
========================================================= */

const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance"
});

renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, 2)
);

renderer.setSize(
    window.innerWidth,
    window.innerHeight,
    false
);

renderer.shadowMap.enabled = true;

renderer.shadowMap.type = THREE.PCFSoftShadowMap;


/* =========================================================
   PLAYER
========================================================= */

const player = {
    position: new THREE.Vector3(0, 1.65, 7),

    yaw: 0,
    pitch: 0,

    moveForward: 0,
    moveRight: 0,

    speed: 4.0,

    lookSensitivityTouch: 0.004,
    lookSensitivityMouse: 0.003
};


camera.position.copy(player.position);

camera.rotation.order = "YXZ";


/* =========================================================
   LIGHTING
========================================================= */

const ambientLight = new THREE.HemisphereLight(
    0x8fa8c9,
    0x24180f,
    1.5
);

scene.add(ambientLight);


const ceilingLight = new THREE.PointLight(
    0xffd7a3,
    32,
    22,
    2
);

ceilingLight.position.set(0, 5.5, 0);

ceilingLight.castShadow = true;

ceilingLight.shadow.mapSize.width = 1024;
ceilingLight.shadow.mapSize.height = 1024;

scene.add(ceilingLight);


/* =========================================================
   MATERIALS
========================================================= */

const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444,
    roughness: 0.95,
    metalness: 0.0
});


const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x6a675f,
    roughness: 0.9,
    metalness: 0.0
});


const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: 0x303030,
    roughness: 1.0
});


const trimMaterial = new THREE.MeshStandardMaterial({
    color: 0x241b17,
    roughness: 0.8
});


/* =========================================================
   ROOM HELPERS
========================================================= */

function createBox({
    width,
    height,
    depth,
    x,
    y,
    z,
    material,
    castShadow = false,
    receiveShadow = true
}) {

    const geometry = new THREE.BoxGeometry(
        width,
        height,
        depth
    );

    const mesh = new THREE.Mesh(
        geometry,
        material
    );

    mesh.position.set(x, y, z);

    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;

    scene.add(mesh);

    return mesh;
}


/* =========================================================
   TEST ROOM
========================================================= */

const ROOM_WIDTH = 18;
const ROOM_DEPTH = 22;
const ROOM_HEIGHT = 6;


/* FLOOR */

createBox({
    width: ROOM_WIDTH,
    height: 0.25,
    depth: ROOM_DEPTH,
    x: 0,
    y: -0.125,
    z: 0,
    material: floorMaterial,
    receiveShadow: true
});


/* CEILING */

createBox({
    width: ROOM_WIDTH,
    height: 0.2,
    depth: ROOM_DEPTH,
    x: 0,
    y: ROOM_HEIGHT,
    z: 0,
    material: ceilingMaterial
});


/* LEFT WALL */

createBox({
    width: 0.3,
    height: ROOM_HEIGHT,
    depth: ROOM_DEPTH,
    x: -ROOM_WIDTH / 2,
    y: ROOM_HEIGHT / 2,
    z: 0,
    material: wallMaterial
});


/* RIGHT WALL */

createBox({
    width: 0.3,
    height: ROOM_HEIGHT,
    depth: ROOM_DEPTH,
    x: ROOM_WIDTH / 2,
    y: ROOM_HEIGHT / 2,
    z: 0,
    material: wallMaterial
});


/* BACK WALL */

createBox({
    width: ROOM_WIDTH,
    height: ROOM_HEIGHT,
    depth: 0.3,
    x: 0,
    y: ROOM_HEIGHT / 2,
    z: -ROOM_DEPTH / 2,
    material: wallMaterial
});


/* FRONT WALL */

createBox({
    width: ROOM_WIDTH,
    height: ROOM_HEIGHT,
    depth: 0.3,
    x: 0,
    y: ROOM_HEIGHT / 2,
    z: ROOM_DEPTH / 2,
    material: wallMaterial
});


/* =========================================================
   ROOM DETAILS
========================================================= */

/* CENTER PILLAR */

createBox({
    width: 1.4,
    height: 4,
    depth: 1.4,
    x: 0,
    y: 2,
    z: 0,
    material: trimMaterial,
    castShadow: true
});


/* TEST CRATE 1 */

createBox({
    width: 2,
    height: 1.5,
    depth: 2,
    x: -4.2,
    y: 0.75,
    z: -4,
    material: trimMaterial,
    castShadow: true
});


/* TEST CRATE 2 */

createBox({
    width: 2.5,
    height: 1.1,
    depth: 1.8,
    x: 4,
    y: 0.55,
    z: 2,
    material: trimMaterial,
    castShadow: true
});


/* =========================================================
   LIGHT FIXTURE
========================================================= */

const lampMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd8a3,
    emissive: 0xffa447,
    emissiveIntensity: 1.8
});


createBox({
    width: 2.4,
    height: 0.12,
    depth: 0.65,
    x: 0,
    y: 5.75,
    z: 0,
    material: lampMaterial
});


/* =========================================================
   SIMPLE WALL MARKERS

   These help make movement obvious during testing.
========================================================= */

const markerMaterial = new THREE.MeshStandardMaterial({
    color: 0x7e1c1c,
    roughness: 0.8
});


for (let z = -8; z <= 8; z += 4) {

    createBox({
        width: 0.12,
        height: 2,
        depth: 1.2,
        x: -8.75,
        y: 2,
        z,
        material: markerMaterial
    });
}


/* =========================================================
   PLAYER CAMERA UPDATE
========================================================= */

function updateCameraRotation() {

    player.pitch = THREE.MathUtils.clamp(
        player.pitch,
        -Math.PI / 2 + 0.05,
        Math.PI / 2 - 0.05
    );

    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;
}


/* =========================================================
   PLAYER MOVEMENT
========================================================= */

const forwardVector = new THREE.Vector3();
const rightVector = new THREE.Vector3();
const movementVector = new THREE.Vector3();


function updatePlayer(deltaTime) {

    const forwardAmount = player.moveForward;
    const rightAmount = player.moveRight;

    if (
        Math.abs(forwardAmount) < 0.01 &&
        Math.abs(rightAmount) < 0.01
    ) {
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


    movementVector.set(0, 0, 0);

    movementVector.addScaledVector(
        forwardVector,
        forwardAmount
    );

    movementVector.addScaledVector(
        rightVector,
        rightAmount
    );


    if (movementVector.lengthSq() > 1) {
        movementVector.normalize();
    }


    movementVector.multiplyScalar(
        player.speed * deltaTime
    );


    player.position.add(movementVector);


    /* ---------------------------------------------
       TEMPORARY ROOM BOUNDARY

       This is NOT the final collision system.
       It only keeps the player inside the test room.
    --------------------------------------------- */

    const padding = 0.8;

    player.position.x = THREE.MathUtils.clamp(
        player.position.x,
        -ROOM_WIDTH / 2 + padding,
        ROOM_WIDTH / 2 - padding
    );


    player.position.z = THREE.MathUtils.clamp(
        player.position.z,
        -ROOM_DEPTH / 2 + padding,
        ROOM_DEPTH / 2 - padding
    );


    camera.position.copy(player.position);
}


/* =========================================================
   MOBILE MOVEMENT JOYSTICK
========================================================= */

let movePointerId = null;

let moveCenterX = 0;
let moveCenterY = 0;

const JOYSTICK_RADIUS = 42;


function updateJoystick(clientX, clientY) {

    let dx = clientX - moveCenterX;
    let dy = clientY - moveCenterY;

    const distance = Math.hypot(dx, dy);

    if (distance > JOYSTICK_RADIUS) {

        const scale = JOYSTICK_RADIUS / distance;

        dx *= scale;
        dy *= scale;
    }


    moveKnob.style.transform =
        `translate(-50%, -50%) translate(${dx}px, ${dy}px)`;


    player.moveRight = dx / JOYSTICK_RADIUS;

    player.moveForward = -dy / JOYSTICK_RADIUS;
}


function resetJoystick() {

    movePointerId = null;

    player.moveForward = 0;
    player.moveRight = 0;

    moveKnob.style.transform =
        "translate(-50%, -50%)";
}


moveStick.addEventListener(
    "pointerdown",
    (event) => {

        event.preventDefault();

        movePointerId = event.pointerId;

        moveStick.setPointerCapture(
            event.pointerId
        );

        const rect =
            moveStick.getBoundingClientRect();

        moveCenterX =
            rect.left + rect.width / 2;

        moveCenterY =
            rect.top + rect.height / 2;

        updateJoystick(
            event.clientX,
            event.clientY
        );
    }
);


moveStick.addEventListener(
    "pointermove",
    (event) => {

        if (
            event.pointerId !==
            movePointerId
        ) {
            return;
        }

        event.preventDefault();

        updateJoystick(
            event.clientX,
            event.clientY
        );
    }
);


moveStick.addEventListener(
    "pointerup",
    (event) => {

        if (
            event.pointerId ===
            movePointerId
        ) {
            resetJoystick();
        }
    }
);


moveStick.addEventListener(
    "pointercancel",
    resetJoystick
);


/* =========================================================
   MOBILE / MOUSE LOOK
========================================================= */

let lookPointerId = null;

let previousLookX = 0;
let previousLookY = 0;


function isControlElement(target) {

    return (
        target === moveStick ||
        moveStick.contains(target) ||
        target === fireButton ||
        target === reloadButton ||
        fireButton.contains(target) ||
        reloadButton.contains(target)
    );
}


gameContainer.addEventListener(
    "pointerdown",
    (event) => {

        if (isControlElement(event.target)) {
            return;
        }

        if (lookPointerId !== null) {
            return;
        }

        lookPointerId = event.pointerId;

        previousLookX = event.clientX;
        previousLookY = event.clientY;

        gameContainer.setPointerCapture(
            event.pointerId
        );
    }
);


gameContainer.addEventListener(
    "pointermove",
    (event) => {

        if (
            event.pointerId !==
            lookPointerId
        ) {
            return;
        }

        event.preventDefault();

        const deltaX =
            event.clientX - previousLookX;

        const deltaY =
            event.clientY - previousLookY;

        previousLookX = event.clientX;
        previousLookY = event.clientY;


        const isTouch =
            event.pointerType === "touch";


        const sensitivity = isTouch
            ? player.lookSensitivityTouch
            : player.lookSensitivityMouse;


        player.yaw -=
            deltaX * sensitivity;

        player.pitch -=
            deltaY * sensitivity;


        updateCameraRotation();
    }
);


function stopLooking(event) {

    if (
        event.pointerId ===
        lookPointerId
    ) {
        lookPointerId = null;
    }
}


gameContainer.addEventListener(
    "pointerup",
    stopLooking
);


gameContainer.addEventListener(
    "pointercancel",
    stopLooking
);


/* =========================================================
   DESKTOP KEYBOARD CONTROLS
========================================================= */

const keyboard = {
    forward: false,
    backward: false,
    left: false,
    right: false
};


function updateKeyboardMovement() {

    let forward = 0;
    let right = 0;

    if (keyboard.forward) {
        forward += 1;
    }

    if (keyboard.backward) {
        forward -= 1;
    }

    if (keyboard.right) {
        right += 1;
    }

    if (keyboard.left) {
        right -= 1;
    }


    /*
       Do not overwrite an active mobile joystick.
    */

    if (movePointerId === null) {

        player.moveForward = forward;
        player.moveRight = right;
    }
}


window.addEventListener(
    "keydown",
    (event) => {

        switch (event.code) {

            case "KeyW":
            case "ArrowUp":
                keyboard.forward = true;
                break;

            case "KeyS":
            case "ArrowDown":
                keyboard.backward = true;
                break;

            case "KeyA":
            case "ArrowLeft":
                keyboard.left = true;
                break;

            case "KeyD":
            case "ArrowRight":
                keyboard.right = true;
                break;
        }

        updateKeyboardMovement();
    }
);


window.addEventListener(
    "keyup",
    (event) => {

        switch (event.code) {

            case "KeyW":
            case "ArrowUp":
                keyboard.forward = false;
                break;

            case "KeyS":
            case "ArrowDown":
                keyboard.backward = false;
                break;

            case "KeyA":
            case "ArrowLeft":
                keyboard.left = false;
                break;

            case "KeyD":
            case "ArrowRight":
                keyboard.right = false;
                break;
        }

        updateKeyboardMovement();
    }
);


/* =========================================================
   TEMPORARY BUTTON TESTS
========================================================= */

fireButton.addEventListener(
    "pointerdown",
    (event) => {

        event.preventDefault();

        console.log("FIRE pressed");
    }
);


reloadButton.addEventListener(
    "pointerdown",
    (event) => {

        event.preventDefault();

        console.log("RELOAD pressed");
    }
);


/* =========================================================
   RESIZE / ORIENTATION HANDLING
========================================================= */

function resizeGame() {

    const width = window.innerWidth;
    const height = window.innerHeight;

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
    () => {

        setTimeout(
            resizeGame,
            100
        );
    }
);


/* =========================================================
   ANIMATION LOOP
========================================================= */

const clock = new THREE.Clock();


function animate() {

    requestAnimationFrame(animate);

    const deltaTime = Math.min(
        clock.getDelta(),
        0.05
    );

    updatePlayer(deltaTime);

    renderer.render(
        scene,
        camera
    );
}


updateCameraRotation();
resizeGame();
animate();


console.log(
    "Zombies 3D test loaded successfully."
);
