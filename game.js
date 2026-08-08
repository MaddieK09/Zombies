/* =========================================================
   ZOMBIES
   BUILD 3.11
   SOLID PISTOL + HIDE GLB LINES + SMALL MUZZLE FLASH
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


    if (typeof THREE.GLTFLoader === "undefined") {
        showError(
            "GLTFLOADER FAILED TO LOAD."
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


    /*
       Dedicated first-person weapon scene.

       This is rendered AFTER the 3D world so the pistol cannot
       disappear inside walls or get lost because of depth/clipping.
    */

    const weaponScene =
        new THREE.Scene();


    const weaponCamera =
        new THREE.PerspectiveCamera(
            50,
            1,
            0.01,
            10
        );


    weaponCamera.position.set(
        0,
        0,
        0
    );


    /* =====================================================
       WEAPON-SCENE LIGHTING

       The GLB uses lit materials, so the dedicated first-person
       scene needs its own lights. Without these, the real model
       renders as a black silhouette.
    ====================================================== */

    const weaponAmbientLight =
        new THREE.HemisphereLight(
            0xffffff,
            0x5f6670,
            0.32
        );


    weaponScene.add(
        weaponAmbientLight
    );


    const weaponKeyLight =
        new THREE.DirectionalLight(
            0xffffff,
            0.45
        );


    weaponKeyLight.position.set(
        -1.5,
        2.0,
        2.5
    );


    weaponScene.add(
        weaponKeyLight
    );


    const weaponFillLight =
        new THREE.DirectionalLight(
            0xbfd4ff,
            0.16
        );


    weaponFillLight.position.set(
        2.0,
        0.5,
        1.0
    );


    weaponScene.add(
        weaponFillLight
    );


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


    /*
       We manually clear once per frame, then render:
       1. world
       2. weapon overlay
    */

    renderer.autoClear =
        false;


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

    /*
       Meshes that bullets can hit.
       Floor, walls, props, and solid obstacles all get registered here.
    */
    const worldHitMeshes = [];

    /*
       Temporary bullet impact marks.
       We cap the number so the phone never accumulates thousands.
    */
    const bulletImpacts = [];
    const MAX_BULLET_IMPACTS = 35;


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

        worldHitMeshes.push(
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
       FIRST-PERSON WEAPON
    ====================================================== */

    /*
       The weapon is made from simple Three.js primitives for now.
       Later we can swap this for a real 3D weapon model without
       changing the firing/reload system.
    */

    const weapon = {
        group:
            new THREE.Group(),

        basePosition:
            new THREE.Vector3(
                0.24,
                -0.33,
                -1.12
            ),

        baseRotation:
            new THREE.Euler(
                -0.015,
                -0.055,
                0.010
            ),

        recoil:
            0,

        recoilVelocity:
            0,

        swayX:
            0,

        swayY:
            0,

        bobTime:
            0,

        muzzleFlashTime:
            0,

        reloadTime:
            0,

        reloadDuration:
            1.05,

        isReloading:
            false
    };


    weaponScene.add(
        weapon.group
    );


    weapon.group.position.copy(
        weapon.basePosition
    );


    weapon.group.rotation.copy(
        weapon.baseRotation
    );


    /*
       Slightly oversized for phone screens so it reads clearly.
    */

    weapon.group.scale.set(
        1,
        1,
        1
    );


    /* =====================================================
       REAL PISTOL MODEL
    ====================================================== */

    /*
       Put your model here in the repository:

       pistol.glb

       The loader below automatically:
       - loads the GLB
       - centers it
       - detects its longest axis
       - rotates that axis toward the camera's forward direction
       - scales it to a useful first-person size

       Fine positioning can then be adjusted with the constants below.
    */


    const PISTOL_MODEL_PATH =
        "pistol.glb";


    const MODEL_TARGET_LENGTH =
        0.62;


    /*
       Fine-tuning values.

       If the specific GLB comes in facing backwards/upside-down,
       these are the ONLY values we should need to tweak later.
    */

    const MODEL_ROTATION_FIX =
        new THREE.Euler(
            0,
            0,
            0
        );


    const MODEL_POSITION_FIX =
        new THREE.Vector3(
            0,
            0,
            0
        );


    const weaponModelHolder =
        new THREE.Group();


    weapon.group.add(
        weaponModelHolder
    );


    let pistolModel =
        null;


    function preparePistolModel(
        model
    ) {
        /*
           Remove cameras/lights that may have been exported
           inside the asset.
        */

        model.traverse(
            function (child) {
                if (
                    child.isCamera ||
                    child.isLight
                ) {
                    child.visible =
                        false;
                }


                /*
                   Some GLB exports contain Line / LineSegments helper
                   geometry. Hide all of those so the pistol cannot look
                   like a transparent wireframe.
                */

                if (
                    child.isLine ||
                    child.isLineSegments ||
                    child.isPoints
                ) {
                    child.visible =
                        false;
                }


                if (
                    child.isMesh
                ) {
                    child.frustumCulled =
                        false;


                    child.castShadow =
                        false;


                    child.receiveShadow =
                        false;


                    /*
                       The weapon gets its own render pass, so it
                       doesn't need to interact with world depth.
                    */

                    /*
                       BUILD 3.7 MATERIAL OVERRIDE

                       The uploaded GLB geometry is good, but its exported
                       material is rendering as a pure black silhouette on
                       iPhone Safari.

                       Instead of trusting the imported material, give the
                       REAL pistol mesh a fresh gunmetal material in code.
                    */

                    if (
                        child.geometry &&
                        child.geometry.attributes &&
                        !child.geometry.attributes.normal
                    ) {
                        child.geometry.computeVertexNormals();
                    }


                    const meshName =
                        (
                            child.name ||
                            ""
                        ).toLowerCase();


                    let gunColor =
                        0x2b3036;


                    /*
                       BUILD 3.8:
                       Use an unlit base material so iPhone Safari cannot
                       wash the pistol out or turn it into a silhouette.

                       Subtle edges preserve the low-poly shape/detail.
                    */

                    if (
                        meshName.includes("grip") ||
                        meshName.includes("handle") ||
                        meshName.includes("mag")
                    ) {
                        gunColor =
                            0x20252a;
                    } else if (
                        meshName.includes("barrel") ||
                        meshName.includes("trigger") ||
                        meshName.includes("sight")
                    ) {
                        gunColor =
                            0x2a3036;
                    }


                    child.material =
                        new THREE.MeshBasicMaterial({
                            color:
                                gunColor,

                            side:
                                THREE.DoubleSide,

                            depthTest:
                                false,

                            depthWrite:
                                false,

                            vertexColors:
                                false,

                            fog:
                                false,

                            toneMapped:
                                false,

                            transparent:
                                false,

                            opacity:
                                1,

                            colorWrite:
                                true
                        });


                    child.material.needsUpdate =
                        true;


                    /*
                       No wireframe/edge overlay in Build 3.10.
                       The real GLB mesh is rendered as one solid opaque object.
                    */


                    child.renderOrder =
                        1000;
                }
            }
        );


        /*
           Calculate original bounds.
        */

        model.updateMatrixWorld(
            true
        );


        let box =
            new THREE.Box3().setFromObject(
                model
            );


        let size =
            new THREE.Vector3();


        box.getSize(
            size
        );


        /*
           Orient the model's longest dimension along local Z,
           because first-person guns point forward/back along Z.
        */

        if (
            size.x >= size.y &&
            size.x >= size.z
        ) {
            model.rotation.y =
                Math.PI / 2;
        } else if (
            size.y >= size.x &&
            size.y >= size.z
        ) {
            model.rotation.x =
                Math.PI / 2;
        }


        model.updateMatrixWorld(
            true
        );


        /*
           Recalculate after automatic orientation.
        */

        box =
            new THREE.Box3().setFromObject(
                model
            );


        size =
            new THREE.Vector3();


        box.getSize(
            size
        );


        const longest =
            Math.max(
                size.x,
                size.y,
                size.z
            );


        if (
            longest > 0
        ) {
            const scale =
                MODEL_TARGET_LENGTH /
                longest;


            model.scale.setScalar(
                scale
            );
        }


        model.updateMatrixWorld(
            true
        );


        /*
           Center the actual geometry around the holder's origin.
        */

        box =
            new THREE.Box3().setFromObject(
                model
            );


        const center =
            new THREE.Vector3();


        box.getCenter(
            center
        );


        model.position.sub(
            center
        );


        /*
           Push the centered gun slightly so its rear sits
           closer to the player and the muzzle points forward.
        */

        model.position.z +=
            0.04;


        model.position.add(
            MODEL_POSITION_FIX
        );


        model.rotation.x +=
            MODEL_ROTATION_FIX.x;


        model.rotation.y +=
            MODEL_ROTATION_FIX.y;


        model.rotation.z +=
            MODEL_ROTATION_FIX.z;


        model.updateMatrixWorld(
            true
        );


        weaponModelHolder.add(
            model
        );


        pistolModel =
            model;


        console.log(
            "Real pistol GLB loaded successfully."
        );
    }


    const gltfLoader =
        new THREE.GLTFLoader();


    gltfLoader.load(
        PISTOL_MODEL_PATH,

        function (gltf) {
            preparePistolModel(
                gltf.scene
            );
        },

        function (progress) {
            /*
               Optional loading progress.
            */

            if (
                progress.total
            ) {
                const percent =
                    Math.round(
                        progress.loaded /
                        progress.total *
                        100
                    );


                console.log(
                    "Pistol model: " +
                    percent +
                    "%"
                );
            }
        },

        function (error) {
            console.error(
                error
            );


            showError(
                "PISTOL MODEL FAILED TO LOAD. Make sure pistol.glb exists."
            );
        }
    );


    /*
       Muzzle flash mesh.
    */

    const muzzleFlashMaterial =
        new THREE.MeshBasicMaterial({
            color: 0xffd36b,
            transparent: true,
            opacity: 0,
            depthTest: false,
            depthWrite: false
        });


    const muzzleFlash =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.065,
                8,
                6
            ),
            muzzleFlashMaterial
        );


    muzzleFlash.position.set(
        0,
        0.015,
        -0.345
    );


    muzzleFlash.scale.set(
        1.0,
        0.55,
        1.6
    );


    muzzleFlash.renderOrder =
        1002;


    weaponModelHolder.add(
        muzzleFlash
    );


    const muzzleLight =
        new THREE.PointLight(
            0xffb347,
            0,
            2.5
        );


    muzzleLight.position.set(
        0,
        0.015,
        -0.345
    );


    weaponModelHolder.add(
        muzzleLight
    );


    /*
       Raycaster used by hitscan weapons.
    */

    const weaponRaycaster =
        new THREE.Raycaster();


    const rayScreenCenter =
        new THREE.Vector2(
            0,
            0
        );


    const impactMaterial =
        new THREE.MeshBasicMaterial({
            color: 0x171717,
            depthWrite: false
        });


    function createBulletImpact(
        point,
        normal
    ) {
        const mark =
            new THREE.Mesh(
                new THREE.CircleGeometry(
                    0.045,
                    10
                ),
                impactMaterial.clone()
            );


        mark.position.copy(
            point
        );


        /*
           Push the mark very slightly off the surface
           to prevent z-fighting.
        */

        mark.position.addScaledVector(
            normal,
            0.006
        );


        const lookTarget =
            point.clone().add(
                normal
            );


        mark.lookAt(
            lookTarget
        );


        scene.add(
            mark
        );


        bulletImpacts.push(
            mark
        );


        if (
            bulletImpacts.length >
            MAX_BULLET_IMPACTS
        ) {
            const oldest =
                bulletImpacts.shift();


            scene.remove(
                oldest
            );


            oldest.geometry.dispose();
            oldest.material.dispose();
        }
    }


    function fireHitscan() {
        weaponRaycaster.setFromCamera(
            rayScreenCenter,
            camera
        );


        weaponRaycaster.far =
            55;


        const hits =
            weaponRaycaster.intersectObjects(
                worldHitMeshes,
                false
            );


        if (
            hits.length <= 0
        ) {
            return;
        }


        const hit =
            hits[0];


        if (
            !hit.face
        ) {
            return;
        }


        const worldNormal =
            hit.face.normal.clone();


        const normalMatrix =
            new THREE.Matrix3().getNormalMatrix(
                hit.object.matrixWorld
            );


        worldNormal.applyMatrix3(
            normalMatrix
        ).normalize();


        createBulletImpact(
            hit.point,
            worldNormal
        );
    }


    function startMuzzleFlash() {
        weapon.muzzleFlashTime =
            0.065;


        muzzleFlashMaterial.opacity =
            0.78;


        muzzleFlash.scale.set(
            0.85 +
                Math.random() *
                0.35,
            0.45 +
                Math.random() *
                0.20,
            1.25 +
                Math.random() *
                0.45
        );


        muzzleLight.intensity =
            1.2;
    }


    function addWeaponRecoil() {
        weapon.recoilVelocity +=
            0.065;


        weapon.recoil =
            Math.min(
                weapon.recoil +
                    0.012,
                0.085
            );


        /*
           Tiny camera kick.
        */

        player.pitch +=
            0.006 +
            Math.random() *
            0.002;


        player.yaw +=
            (
                Math.random() -
                0.5
            ) *
            0.0025;


        updateCameraRotation();
    }


    function updateWeapon(
        deltaTime,
        moving,
        speed
    ) {
        /*
           Recoil spring.
        */

        weapon.recoilVelocity +=
            (
                -weapon.recoil *
                28
            ) *
            deltaTime;


        weapon.recoilVelocity *=
            Math.pow(
                0.0008,
                deltaTime
            );


        weapon.recoil +=
            weapon.recoilVelocity *
            deltaTime;


        weapon.recoil =
            Math.max(
                0,
                weapon.recoil
            );


        /*
           Walking bob.
        */

        if (
            moving &&
            speed > 0.15 &&
            !weapon.isReloading
        ) {
            weapon.bobTime +=
                deltaTime *
                (
                    7.5 +
                    speed *
                    0.55
                );
        }


        const bobStrength =
            moving
                ? Math.min(
                    speed /
                    player.walkSpeed,
                    1
                )
                : 0;


        const bobX =
            Math.sin(
                weapon.bobTime
            ) *
            0.013 *
            bobStrength;


        const bobY =
            Math.abs(
                Math.cos(
                    weapon.bobTime
                )
            ) *
            0.010 *
            bobStrength;


        /*
           Very subtle look sway.
        */

        const swayTargetX =
            THREE.MathUtils.clamp(
                pendingLookX *
                    -0.020,
                -0.035,
                0.035
            );


        const swayTargetY =
            THREE.MathUtils.clamp(
                pendingLookY *
                    0.020,
                -0.025,
                0.025
            );


        weapon.swayX +=
            (
                swayTargetX -
                weapon.swayX
            ) *
            Math.min(
                1,
                deltaTime *
                11
            );


        weapon.swayY +=
            (
                swayTargetY -
                weapon.swayY
            ) *
            Math.min(
                1,
                deltaTime *
                11
            );


        /*
           Reload animation.
        */

        let reloadOffsetY =
            0;

        let reloadOffsetX =
            0;

        let reloadRoll =
            0;

        let reloadPitch =
            0;


        if (
            weapon.isReloading
        ) {
            weapon.reloadTime +=
                deltaTime;


            const t =
                Math.min(
                    weapon.reloadTime /
                    weapon.reloadDuration,
                    1
                );


            /*
               Down -> rotate -> come back.
            */

            reloadOffsetY =
                -Math.sin(
                    Math.PI *
                    t
                ) *
                0.16;


            reloadOffsetX =
                Math.sin(
                    Math.PI *
                    t
                ) *
                0.035;


            reloadRoll =
                Math.sin(
                    Math.PI *
                    t
                ) *
                -0.38;


            reloadPitch =
                Math.sin(
                    Math.PI *
                    t
                ) *
                0.16;


            if (
                t >= 1
            ) {
                completeReload();
            }
        }


        weapon.group.position.set(
            weapon.basePosition.x +
                bobX +
                weapon.swayX +
                reloadOffsetX,

            weapon.basePosition.y -
                bobY +
                weapon.swayY +
                reloadOffsetY,

            weapon.basePosition.z +
                weapon.recoil
        );


        weapon.group.rotation.set(
            weapon.baseRotation.x +
                weapon.recoil *
                0.65 +
                reloadPitch,

            weapon.baseRotation.y +
                weapon.swayX *
                0.8,

            weapon.baseRotation.z +
                bobX *
                -0.7 +
                reloadRoll
        );


        /*
           Muzzle flash decay.
        */

        if (
            weapon.muzzleFlashTime >
            0
        ) {
            weapon.muzzleFlashTime -=
                deltaTime;


            const ratio =
                Math.max(
                    0,
                    weapon.muzzleFlashTime /
                    0.065
                );


            muzzleFlashMaterial.opacity =
                ratio;


            muzzleLight.intensity =
                ratio *
                2.5;
        } else {
            muzzleFlashMaterial.opacity =
                0;


            muzzleLight.intensity =
                0;
        }
    }


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


        updateWeapon(
            deltaTime,
            moving,
            speed
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
       FIRE / RELOAD
    ====================================================== */

    let magAmmo =
        8;

    let reserveAmmo =
        32;


    const magazineSize =
        8;


    let lastFireTime =
        -9999;


    const fireInterval =
        0.22;


    let emptyClickCooldown =
        0;


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


    function flashEmptyAmmo() {
        if (
            emptyClickCooldown >
            0
        ) {
            return;
        }


        emptyClickCooldown =
            0.18;


        magAmmoElement.style.opacity =
            "0.28";


        setTimeout(
            function () {
                magAmmoElement.style.opacity =
                    "1";
            },
            90
        );
    }


    function tryFire() {
        if (
            weapon.isReloading
        ) {
            return;
        }


        const now =
            performance.now() /
            1000;


        if (
            now -
            lastFireTime <
            fireInterval
        ) {
            return;
        }


        lastFireTime =
            now;


        if (
            magAmmo <= 0
        ) {
            flashEmptyAmmo();

            return;
        }


        magAmmo -=
            1;


        updateAmmoHUD();

        pulseCrosshair();

        addWeaponRecoil();

        startMuzzleFlash();

        fireHitscan();
    }


    function startReload() {
        if (
            weapon.isReloading
        ) {
            return;
        }


        if (
            magAmmo >=
            magazineSize
        ) {
            return;
        }


        if (
            reserveAmmo <= 0
        ) {
            return;
        }


        weapon.isReloading =
            true;


        weapon.reloadTime =
            0;


        reloadButton.style.opacity =
            "0.5";
    }


    function completeReload() {
        if (
            !weapon.isReloading
        ) {
            return;
        }


        const needed =
            magazineSize -
            magAmmo;


        const amount =
            Math.min(
                needed,
                reserveAmmo
            );


        magAmmo +=
            amount;


        reserveAmmo -=
            amount;


        weapon.isReloading =
            false;


        weapon.reloadTime =
            0;


        reloadButton.style.opacity =
            "1";


        updateAmmoHUD();
    }


    fireButton.addEventListener(
        "pointerdown",
        function (event) {
            event.preventDefault();
            event.stopPropagation();


            tryFire();
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


            startReload();
        },
        {
            passive: false
        }
    );


    /*
       Desktop testing.
    */

    window.addEventListener(
        "keydown",
        function (event) {
            if (
                event.code ===
                "Space"
            ) {
                event.preventDefault();

                tryFire();
            }


            if (
                event.code ===
                "KeyR"
            ) {
                startReload();
            }
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


        weaponCamera.aspect =
            width /
            height;


        weaponCamera.updateProjectionMatrix();


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


        if (
            emptyClickCooldown >
            0
        ) {
            emptyClickCooldown -=
                deltaTime;
        }


        updateMovement(
            deltaTime
        );


        /*
           WORLD PASS
        */

        renderer.clear();


        renderer.render(
            scene,
            camera
        );


        /*
           FIRST-PERSON WEAPON PASS

           Clear only depth, not the color buffer, so the pistol
           is drawn on top of the world instead of replacing it.
        */

        renderer.clearDepth();


        renderer.render(
            weaponScene,
            weaponCamera
        );
    }


    /* =====================================================
       START
    ====================================================== */

    /*
       Definitive runtime version marker.
       index.html cache-busts this file with ?v=39.
    */

    document.documentElement.dataset.zombiesBuild =
        "3.11";


    console.log(
        "ZOMBIES BUILD 3.11 ACTIVE"
    );


    updateCameraRotation();

    resolvePenetration();

    resizeGame();

    animate();


    console.log(
        "Zombies Build 3.4b loaded: root-level real GLB pistol model."
    );

})();