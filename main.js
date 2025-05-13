// import * as THREE from "three";
// import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
// import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

// const scene = new THREE.Scene();
// const clock = new THREE.Clock();

// const renderer = new THREE.WebGLRenderer();
// renderer.setSize(window.innerWidth, window.innerHeight);
// document.body.appendChild(renderer.domElement);

// const fov = 45;
// const aspect = 2; // the canvas default
// const near = 0.1;
// const far = 100;
// const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
// camera.position.set(0, 10, 20);

// const geometry = new THREE.BoxGeometry(1, 1, 1);
// const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
// const cube = new THREE.Mesh(geometry, material);
// scene.add(cube);

// camera.position.z = 5;

// const controls = new PointerLockControls(camera, document.body);

// const loader = new GLTFLoader();
// loader.load(
//   "./minify_test.glb",
//   function (gltf) {
//     scene.add(gltf.scene);
//   },
//   undefined,
//   function (error) {
//     console.error(error);
//   }
// );

// function animate() {
//   cube.rotation.x += 0.01;
//   cube.rotation.y += 0.01;
//   controls.update(clock.getDelta());
//   renderer.render(scene, camera);
// }
// renderer.setAnimationLoop(animate);

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

let camera, scene, renderer, controls;

const objects = [];

let raycaster;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let moveUp = false;
let moveDown = false;
let sprintActive = false;
// let canJump = false;

let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const vertex = new THREE.Vector3();
const color = new THREE.Color();

init();

function init() {
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.y = 10;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  scene.fog = new THREE.Fog(0xffffff, 0, 750);

  const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 2.5);
  light.position.set(0.5, 1, 0.75);
  scene.add(light);

  controls = new PointerLockControls(camera, document.body);
  controls.object.position.x = 22.7;
  controls.object.position.y = -0.65;
  controls.object.position.z = -50;

  const blocker = document.getElementById("blocker");
  const instructions = document.getElementById("instructions");

  instructions.addEventListener("click", function () {
    controls.lock();
  });

  controls.addEventListener("lock", function () {
    instructions.style.display = "none";
    blocker.style.display = "none";
  });

  controls.addEventListener("unlock", function () {
    blocker.style.display = "block";
    instructions.style.display = "";
  });

  scene.add(controls.object);

  const onKeyDown = function (event) {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        moveForward = true;
        break;

      case "ArrowLeft":
      case "KeyA":
        moveLeft = true;
        break;

      case "ArrowDown":
      case "KeyS":
        moveBackward = true;
        break;

      case "ArrowRight":
      case "KeyD":
        moveRight = true;
        break;

      case "ShiftLeft":
      case "ShiftRight":
        sprintActive = true;
        break;
    }
  };

  const onKeyUp = function (event) {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        moveForward = false;
        break;

      case "ArrowLeft":
      case "KeyA":
        moveLeft = false;
        break;

      case "ArrowDown":
      case "KeyS":
        moveBackward = false;
        break;

      case "ArrowRight":
      case "KeyD":
        moveRight = false;
        break;

      case "ShiftLeft":
      case "ShiftRight":
        sprintActive = false;
        break;
    }
  };

  document.body.onmousedown = function (e) {
    var isRightMB;
    var isLeftMB;
    e = e || window.event;

    if ("which" in e) {
      // Gecko (Firefox), WebKit (Safari/Chrome) & Opera
      isRightMB = e.which == 3;
      isLeftMB = e.which == 1;
    } else if ("button" in e) {
      // IE, Opera
      isRightMB = e.button == 2;
      isLeftMB = e.button == 1;
    }

    if (isRightMB) {
      moveDown = true;
    }

    if (isLeftMB) {
      moveUp = true;
    }
  };

  document.body.onmouseup = function (e) {
    var isRightMB;
    var isLeftMB;
    e = e || window.event;

    if ("which" in e) {
      // Gecko (Firefox), WebKit (Safari/Chrome) & Opera
      isRightMB = e.which == 3;
      isLeftMB = e.which == 1;
    } else if ("button" in e) {
      // IE, Opera
      isRightMB = e.button == 2;
      isLeftMB = e.button == 1;
    }

    if (isRightMB) {
      moveDown = false;
    }

    if (isLeftMB) {
      moveUp = false;
    }
  };

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  raycaster = new THREE.Raycaster(
    new THREE.Vector3(),
    new THREE.Vector3(0, -1, 0),
    0,
    10
  );

  // floor

  let floorGeometry = new THREE.PlaneGeometry(2000, 2000, 100, 100);
  floorGeometry.rotateX(-Math.PI / 2);

  // vertex displacement

  let position = floorGeometry.attributes.position;

  for (let i = 0, l = position.count; i < l; i++) {
    vertex.fromBufferAttribute(position, i);

    vertex.x += Math.random() * 20 - 10;
    vertex.y += Math.random() * 2;
    vertex.z += Math.random() * 20 - 10;

    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  floorGeometry = floorGeometry.toNonIndexed(); // ensure each face has unique vertices

  position = floorGeometry.attributes.position;
  const colorsFloor = [];

  for (let i = 0, l = position.count; i < l; i++) {
    color.setHSL(
      Math.random() * 0.3 + 0.5,
      0.75,
      Math.random() * 0.25 + 0.75,
      THREE.SRGBColorSpace
    );
    colorsFloor.push(color.r, color.g, color.b);
  }

  floorGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(colorsFloor, 3)
  );

  const loader = new GLTFLoader();
  loader.load(
    "./akiraszkola2025_minified.glb",
    function (gltf) {
      const scale = 16;
      gltf.scene.scale.set(scale, scale, scale);
      scene.add(gltf.scene);
    },
    undefined,
    function (error) {
      console.error(error);
    }
  );

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  const time = performance.now();

  if (controls.isLocked === true) {
    raycaster.ray.origin.copy(controls.object.position);
    raycaster.ray.origin.y -= 10;

    const delta = (time - prevTime) / 1000;

    const speed = sprintActive ? 1.0 : 10.0;

    velocity.x -= velocity.x * speed * delta;
    velocity.z -= velocity.z * speed * delta;
    velocity.y -= velocity.y * speed * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.y = Number(moveUp) - Number(moveDown);
    direction.normalize(); // this ensures consistent movements in all directions

    if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;
    if (moveUp || moveDown) velocity.y -= direction.y * 400.0 * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
    // controls.moveUp(-velocity.y * delta);

    controls.object.position.y += -velocity.y * delta; // new behavior

    console.log(moveUp, moveDown);

    // if (controls.object.position.y < 10) {
    //   velocity.y = 0;
    //   controls.object.position.y = 10;

    //   canJump = true;
    // }
  }

  prevTime = time;

  renderer.render(scene, camera);
}
