var sphereShape, sphereBody, world, physicsMaterial, walls = [],
  balls = [],
  ballMeshes = [],
  boxes = [],
  boxMeshes = [],
  bulletBBoxes = [];
var camera;
var scene;

use_wireframe = false

var renderer;
var raycaster;
var objects = [];
var object;
this.score = 0;

//for bbox
THREE.Sphere.__closest = new THREE.Vector3();
THREE.Sphere.prototype.intersectsBox = function(box) {
  THREE.Sphere.__closest.set(this.center.x, this.center.y, this.center.z);
  THREE.Sphere.__closest.clamp(box.min, box.max);
  var distance = this.center.distanceToSquared(THREE.Sphere.__closest);
  return distance < (this.radius * this.radius);
};

rotation = new CANNON.Quaternion();
this.randomCreate = 0;
var geometry, material, mesh;
var controls, time = Date.now();
//for the menu on esc or start
var blocker = document.getElementById('blocker');
var instructions = document.getElementById('instructions');
//for controls
var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;
if (havePointerLock) {
  var element = document.body;
  var pointerlockchange = function(event) {
    if (document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element) {
      controls.enabled = true;
      blocker.style.display = 'none';
    } else {
      controls.enabled = false;
      blocker.style.display = '-webkit-box';
      blocker.style.display = '-moz-box';
      blocker.style.display = 'box';
      instructions.style.display = '';
    }
  }
  var pointerlockerror = function(event) {
    instructions.style.display = '';
  }
  document.addEventListener('pointerlockchange', pointerlockchange, false);
  document.addEventListener('mozpointerlockchange', pointerlockchange, false);
  document.addEventListener('webkitpointerlockchange', pointerlockchange, false);
  document.addEventListener('pointerlockerror', pointerlockerror, false);
  document.addEventListener('mozpointerlockerror', pointerlockerror, false);
  document.addEventListener('webkitpointerlockerror', pointerlockerror, false);
  instructions.addEventListener('click', function(event) {
    instructions.style.display = 'none';
    //lock the pointer
    element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
    if (/Firefox/i.test(navigator.userAgent)) {
      var fullscreenchange = function(event) {
        if (document.fullscreenElement === element || document.mozFullscreenElement === element || document.mozFullScreenElement === element) {
          document.removeEventListener('fullscreenchange', fullscreenchange);
          document.removeEventListener('mozfullscreenchange', fullscreenchange);
          element.requestPointerLock();
        }
      }
      document.addEventListener('fullscreenchange', fullscreenchange, false);
      document.addEventListener('mozfullscreenchange', fullscreenchange, false);
      element.requestFullscreen = element.requestFullscreen || element.mozRequestFullscreen || element.mozRequestFullScreen || element.webkitRequestFullscreen;
      element.requestFullscreen();
    } else {
      element.requestPointerLock();
    }
  }, false);
} else {
  instructions.innerHTML = 'Your browser doesn\'t seem to support Pointer Lock API';
}

initCannon();
init();
animate();

function initCannon() {
  //set up the world
  world = new CANNON.World();
  world.quatNormalizeSkip = 0;
  world.quatNormalizeFast = false;
  var solver = new CANNON.GSSolver();
  world.defaultContactMaterial.contactEquationStiffness = 1e9;
  world.defaultContactMaterial.contactEquationRelaxation = 4;
  solver.iterations = 7;
  solver.tolerance = 0.1;
  var split = true;
  if (split)
    world.solver = new CANNON.SplitSolver(solver);
  else
    world.solver = solver;
  world.gravity.set(0, -20, 0);
  world.broadphase = new CANNON.NaiveBroadphase();
  //create a slippery floor 
  physicsMaterial = new CANNON.Material("soapFloor");
  var physicsContactMaterial = new CANNON.ContactMaterial(physicsMaterial, physicsMaterial);
  world.addContactMaterial(physicsContactMaterial);
  //create a sphere

  var mass = 3,
    radius = 1;
  sphereShape = new CANNON.Sphere(radius);
  sphereBody = new CANNON.Body({
    mass: mass
  });
  sphereBody.addShape(sphereShape);
  sphereBody.position.set(0, 10, -5);
  sphereBody.linearDamping = 0.9;
  world.addBody(sphereBody);
  // create a plane
  var groundShape = new CANNON.Plane();
  var groundBody = new CANNON.Body({
    mass: 0
  });
  groundBody.addShape(groundShape);
  groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  world.addBody(groundBody);
}


function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 21000);
  scene.add(camera);
  //crosshair
  crosshairGeometry = new THREE.SphereGeometry(1);
  crosshairMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff
  });
  crosshair = new THREE.Mesh(crosshairGeometry, crosshairMaterial);
  camera.add(crosshair);
  crosshair.scale.set(0.001, 0.001, 0.001);
  crosshair.position.set(0, 0, -0.25);


  var ambient = new THREE.AmbientLight(0x111111);
  scene.add(ambient);
  light = new THREE.SpotLight(0xffffff);
  light.position.set(10, 30, 20);
  light.target.position.set(0, 0, 0);

  light.castShadow = true;
  light.shadow.camera.near = 20;
  light.shadow.camera.far = 5000;
  light.shadow.camera.fov = 40;
  light.shadowMapBias = 0.1;
  light.shadowMapDarkness = 0.7;
  light.shadow.mapSize.width = 2048;
  light.shadow.mapSize.height = 2048;

  scene.add(light);

  var cube = new THREE.CubeGeometry(10000, 10000, 10000);

  //skybox
  var cubeMaterials = [
    // back side
    new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load('images/skybox/back.png'),
      side: THREE.DoubleSide
    }),
    // front side
    new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load('images/skybox/front.png'),
      side: THREE.DoubleSide
    }),
    // Top side
    new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load('images/skybox/up.png'),
      side: THREE.DoubleSide
    }),
    // Bottom side
    new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load('images/skybox/down.png'),
      side: THREE.DoubleSide
    }),
    // right side
    new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load('images/skybox/left.png'),
      side: THREE.DoubleSide
    }),
    // left side
    new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load('images/skybox/right.png'),
      side: THREE.DoubleSide
    })
  ];


  //MAP START
  //add cube & materials
  var cubeMaterial = new THREE.MeshFaceMaterial(cubeMaterials);
  var mesh = new THREE.Mesh(cube, cubeMaterial);
  scene.add(mesh);

  controls = new PointerLockControls(camera, sphereBody);
  scene.add(controls.getObject());

  // floor
  geometry = new THREE.PlaneGeometry(10000, 10000);
  geometry.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
  texture = new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load('images/maptextures/floor.png'),
      side: THREE.DoubleSide
    }),
    this.mesh = new THREE.Mesh(geometry, texture);
  this.mesh.castShadow = false;
  this.mesh.receiveShadow = true;
  this.floorBBox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
  //this.floorhelper = new THREE.BoxHelper(this.mesh, 0xffffff);
  //scene.add(this.floorhelper);
  scene.add(this.mesh);
  renderer = new THREE.WebGLRenderer();
  renderer.sortObjects = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMapSoft = true;
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0xffffff, 1);
  document.body.appendChild(renderer.domElement);
  window.addEventListener('resize', onWindowResize, false);

  //wall
  material = new THREE.MeshBasicMaterial({
    map: new THREE.TextureLoader().load('images/maptextures/sandstonewall.png'),
    side: THREE.DoubleSide,
    wireframe: use_wireframe
  });
  halfExtents = new CANNON.Vec3(20, 5, 0.2);
  boxShape = new CANNON.Box(halfExtents);
  boxGeometry = new THREE.BoxGeometry(halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2);
  boxBody = new CANNON.Body({
    mass: 0,
    wireframe: use_wireframe
  });
  boxBody.addShape(boxShape);
  boxMesh = new THREE.Mesh(boxGeometry, material);
  world.addBody(boxBody);
  scene.add(boxMesh);
  boxBody.position.set(0, 5, -10);
  boxMesh.position.set(0, 5, -10);
  boxMesh.castShadow = false;
  boxMesh.receiveShadow = false;

  //wall
  material2 = new THREE.MeshBasicMaterial({
    map: new THREE.TextureLoader().load('images/maptextures/sandstonewall.png'),
    side: THREE.DoubleSide,
    wireframe: use_wireframe
  });
  halfExtents2 = new CANNON.Vec3(20, 5, 0.2);
  boxShape2 = new CANNON.Box(halfExtents2);
  boxGeometry2 = new THREE.BoxGeometry(halfExtents2.x * 2, halfExtents2.y * 2, halfExtents2.z * 2);
  boxBody2 = new CANNON.Body({
    mass: 0,
    wireframe: use_wireframe
  });
  boxBody2.addShape(boxShape2);
  boxMesh2 = new THREE.Mesh(boxGeometry2, material2);
  world.addBody(boxBody2);
  scene.add(boxMesh2);
  boxBody2.position.set(0, 5, 10);
  boxMesh2.position.set(0, 5, 10);
  boxMesh2.castShadow = false;
  boxMesh2.receiveShadow = false;

  //floor stair
  material = new THREE.MeshBasicMaterial({
    map: new THREE.TextureLoader().load('images/maptextures/ironfloor.png'),
    side: THREE.DoubleSide,
    wireframe: use_wireframe
  });
  halfExtents = new CANNON.Vec3(5, 0.2, 10);
  stairShape = new CANNON.Box(halfExtents);
  stairGeometry = new THREE.BoxGeometry(halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2);
  stairBody = new CANNON.Body({
    mass: 0,
    wireframe: use_wireframe
  });
  stairBody.addShape(stairShape);
  stairMesh = new THREE.Mesh(stairGeometry, material);
  //collision body rotation
  rotation.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), 75);
  stairBody.quaternion = rotation.mult(stairBody.quaternion);
  //collision body rotation end
  stairBody.position.set(0, 1.8, 0);
  stairMesh.position.set(0, 1.8, 0);
  stairMesh.rotation.z = 75;
  stairMesh.castShadow = false;
  stairMesh.receiveShadow = false;
  world.addBody(stairBody);
  scene.add(stairMesh);
  objects.push(stairMesh);
  material = new THREE.MeshBasicMaterial({
    map: new THREE.TextureLoader().load('images/maptextures/ironfloor.png'),
    side: THREE.DoubleSide,
    wireframe: use_wireframe
  });
  halfExtents = new CANNON.Vec3(5, 0.2, 10);
  stairShape = new CANNON.Box(halfExtents);
  stairGeometry = new THREE.BoxGeometry(halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2);
  stairBody = new CANNON.Body({
    mass: 0,
    wireframe: use_wireframe
  });
  stairBody.addShape(stairShape);
  stairMesh = new THREE.Mesh(stairGeometry, material);
  stairBody.position.set(-9.2, 3.65, 0);
  stairMesh.position.set(-9.2, 3.65, 0);
  stairMesh.castShadow = false;
  stairMesh.receiveShadow = false;
  world.addBody(stairBody);
  scene.add(stairMesh);
  objects.push(stairMesh);
  //MAP END

  //"enemies", just copy and paste them and change some shit to create more
  //enemy 1
  this.sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1));
  this.sphere.position.set(-30, 2, 0);
  this.sphereBBox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
  //this.sphereHelper = new THREE.BoxHelper(this.sphere, 0xffffff);
  //this.sphereHelper.update();
  scene.add(this.sphere);
  // scene.add(this.sphereHelper);
  //enemy 2
  this.sphere2 = new THREE.Mesh(
    new THREE.SphereGeometry(1));
  this.sphere2.position.set(-30, 5, 0);
  this.sphereBBox2 = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
  //this.sphereHelper2 = new THREE.BoxHelper(this.sphere2, 0xffffff);
  //this.sphereHelper2.update();
  scene.add(this.sphere2);
  // scene.add(this.sphereHelper2);
  //enemy 3
  this.sphere3 = new THREE.Mesh(
    new THREE.SphereGeometry(1));
  this.sphere3.position.set(-30, 8, 0);
  this.sphereBBox3 = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
  //this.sphereHelper3 = new THREE.BoxHelper(this.sphere3, 0xffffff);
  //this.sphereHelper3.update();
  scene.add(this.sphere3);
  //scene.add(this.sphereHelper3);

  //gun model imporing and attaching to camera (free asset)
  loader = new THREE.OBJLoader();
  loader.load('models/gun.obj', function(object) {
    camera.add(object);
    object.position.set(0, -0.2, -0.25);
    object.rotation.y = 135;
    object.rotation.z = 0;
    object.rotation.x = -180;
    object.scale.set(0.01, 0.01, 0.01);
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

var dt = 1 / 60;
//bullet
var ballShape = new CANNON.Sphere(0.2);
var ballGeometry = new THREE.SphereGeometry(ballShape.radius, 32, 32);
var shootDirection = new THREE.Vector3();
var shootVelo = 170;
var projector = new THREE.Projector();

function getShootDir(targetVec) {
  var vector = targetVec;
  targetVec.set(0, 0, 1);
  projector.unprojectVector(vector, camera);
  var ray = new THREE.Ray(sphereBody.position, vector.sub(sphereBody.position).normalize());
  targetVec.copy(ray.direction);
}

window.addEventListener("click", function(e) {
  if (controls.enabled == true) {
    //bullets themself
    var x = sphereBody.position.x;
    var y = sphereBody.position.y;
    var z = sphereBody.position.z;
    this.ballBody = new CANNON.Body({
      mass: 1
    });
    this.ballBody.addShape(ballShape);
    this.ballMesh = new THREE.Mesh(ballGeometry, material);
    this.bulletBBox = new THREE.Box3(new THREE.Vector3(1, 1, 1), new THREE.Vector3(1, 1, 1));
    world.addBody(this.ballBody);
    this.scene.add(this.ballMesh);
    this.ballMesh.castShadow = false;
    this.ballMesh.receiveShadow = false;
    balls.push(ballBody);
    ballMeshes.push(this.ballMesh);
    bulletBBoxes.push(this.bulletBBox);
    getShootDir(shootDirection);
    ballBody.velocity.set(shootDirection.x * shootVelo,
      shootDirection.y * shootVelo,
      shootDirection.z * shootVelo);
    // Move the ball outside the player sphere
    x += shootDirection.x * (sphereShape.radius * 1.02 + ballShape.radius);
    y += shootDirection.y * (sphereShape.radius * 1.02 + ballShape.radius);
    z += shootDirection.z * (sphereShape.radius * 1.02 + ballShape.radius);
    ballBody.position.set(x, y, z);
    this.ballMesh.position.set(x, y, z);
    this.bulletBBox.setFromObject(this.ballMesh);

    //helper for bboxes
    this.helper = new THREE.BoxHelper(this.ballMesh, 0xffffff);
    this.helper.update();
    scene.add(this.helper);
    scene.remove(this.helper);
  }
});

function animate() {
  //this.randomCreate = this.randomCreate + 1;
  requestAnimationFrame(animate);
  this.helper = new THREE.BoxHelper(this.ballMesh, 0xffffff);
  this.helper.update();
  //scene.add(this.helper);
  if (controls.enabled) {
    world.step(dt);
    // update bullet positions
    for (var i = 0; i < balls.length; i++) {
      ballMeshes[i].position.copy(balls[i].position);
      ballMeshes[i].quaternion.copy(balls[i].quaternion);
    }
    // Update bulletBBox positions   
    for (var i = 0; i < balls.length; i++) {
      //checking if bboxes are truly bound to their meshes (not needed for program)
      //console.log( bulletBBoxes[i].distanceToPoint(balls[i].position));
      //console.log( this.bulletBBox.distanceToPoint(ballMesh.position));
      //
      //check and update if a target is hit
      this.floorBBox.setFromObject(this.mesh);
      this.sphereBBox.setFromObject(this.sphere);
      this.sphereBBox2.setFromObject(this.sphere2);
      this.sphereBBox3.setFromObject(this.sphere3);
      this.bulletBBox.setFromObject(this.ballMesh);
      if (this.sphereBBox.intersectsBox(this.bulletBBox)) {
        scene.remove(this.sphere);
        scene.remove(this.sphereHelper);
        scene.remove(this.ballMesh);
        scene.remove(this.helper);
        world.remove(this.ballBody);
        this.score = this.score + 1;
        console.log("score = " + this.score);
        this.sphere = new THREE.Mesh(
          new THREE.SphereGeometry(1));
        this.RNGpos1 = Math.floor(Math.random() * 20) - 10;
        this.sphere.position.set(-30, 2, this.RNGpos1);
        this.sphereBBox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
        //this.sphereHelper = new THREE.BoxHelper(this.sphere, 0xffffff);
        //this.sphereHelper.update();
        scene.add(this.sphere);
        //scene.add(this.sphereHelper);
      }
      if (this.sphereBBox2.intersectsBox(this.bulletBBox)) {
        scene.remove(this.sphere2);
        scene.remove(this.sphereHelper2);
        scene.remove(this.ballMesh);
        scene.remove(this.helper);
        world.remove(this.ballBody);
        this.score = this.score + 1;
        console.log("score = " + this.score);
        this.sphere2 = new THREE.Mesh(
          new THREE.SphereGeometry(1));
        this.RNGpos2 = Math.floor(Math.random() * 20) - 10;
        this.sphere2.position.set(-30, 5, this.RNGpos2);
        this.sphereBBox2 = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
        //this.sphereHelper2 = new THREE.BoxHelper(this.sphere2, 0xffffff);
        //this.sphereHelper2.update();
        scene.add(this.sphere2);
        //scene.add(this.sphereHelper2)
      }
      if (this.sphereBBox3.intersectsBox(this.bulletBBox)) {
        scene.remove(this.sphere3);
        scene.remove(this.sphereHelper3);
        scene.remove(this.ballMesh);
        scene.remove(this.helper);
        world.remove(this.ballBody);
        this.score = this.score + 1;
        console.log("score = " + this.score);
        this.sphere3 = new THREE.Mesh(
          new THREE.SphereGeometry(1));
        this.RNGpos3 = Math.floor(Math.random() * 20) - 10;
        this.sphere3.position.set(-30, 8, this.RNGpos3);
        this.sphereBBox3 = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
        //this.sphereHelper3 = new THREE.BoxHelper(this.sphere3, 0xffffff);
        //this.sphereHelper3.update();
        scene.add(this.sphere3);
        //scene.add(this.sphereHelper3);
      }
      //remove bullets from world on impact with floor to save performance
      if (this.floorBBox.intersectsBox(this.bulletBBox)) {
        scene.remove(this.ballMesh);
        scene.remove(this.helper);
        world.remove(this.ballBody);
      }
    }
  }
  //console.log("score = " + this.score);
  controls.update(Date.now() - time);
  renderer.render(scene, camera);
  time = Date.now();
  scene.remove(this.helper);
}