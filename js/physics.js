// This is a modification of the physics/PhysX libraries
//   from the VARTISTE project @ https://vartiste.xyz/ 
//   by Zachary Capalbo https://github.com/zach-capalbo/vartiste
// with the goal of creating a simplified standalone codebase.

// original documentation: https://vartiste.xyz/docs.html#physics.js

// in this version: removed "dual-wielding"-related and "breakable" components.

// ======================================================================

// patching in Pool functions

var poolSize = 0

function sysPool(name, type) {
    if (this.system._pool[name]) return this.system._pool[name]
    this.system._pool[name] = new type()
    // console.log("SysPooling", type.name)
    return this.system._pool[name]
}

function pool(name, type) {
    if (this._pool[name]) return this._pool[name]
    this._pool[name] = new type()
    // console.log("Pooling", type.name)
    return this._pool[name]
}

class Pool {
  static init(where, {useSystem = false} = {}) {
    if (useSystem)
    {
      if (!where.system) {
        console.error("No system for system pool", where.attrName)
      }
      if (!where.system._pool) where.system._pool = {};

      where.pool = sysPool;
    }
    else
    {
      where._pool = {}
      where.pool = pool;
    }
  }
}

// ==================================================================================================

// patching in required Util functions from VARTISTE

Util = {}

Pool.init(Util);

// Copies `matrix` into `obj`'s (a `THREE.Object3D`) `matrix`, and decomposes
// it to `obj`'s position, rotation, and scale
Util.applyMatrix = function(matrix, obj) {
  obj.matrix.copy(matrix)
  matrix.decompose(obj.position, obj.rotation, obj.scale)
}

Util.traverseCondition = function(obj3D, condition, fn) 
{
  if (!condition(obj3D)) return;

  fn(obj3D)
  for (let c of obj3D.children)
  {
    this.traverseCondition(c, condition, fn)
  }
}

Util.positionObject3DAtTarget = function(obj, target, {scale, transformOffset, transformRoot} = {}) 
{
  if (typeof transformRoot === 'undefined') transformRoot = obj.parent

  target.updateMatrixWorld()
  let destMat = this.pool('dest', THREE.Matrix4)
  destMat.copy(target.matrixWorld)

  if (transformOffset) {
    let transformMat = this.pool('transformMat', THREE.Matrix4)
    transformMat.makeTranslation(transformOffset.x, transformOffset.y, transformOffset.z)
    destMat.multiply(transformMat)
  }

  if (scale) {
    let scaleVect = this.pool('scale', THREE.Vector3)
    scaleVect.setFromMatrixScale(destMat)
    scaleVect.set(scale.x / scaleVect.x, scale.y / scaleVect.y, scale.z / scaleVect.z)
    destMat.scale(scaleVect)
  }

  let invMat = this.pool('inv', THREE.Matrix4)

  transformRoot.updateMatrixWorld()
  invMat.copy(transformRoot.matrixWorld).invert()
  destMat.premultiply(invMat)

  Util.applyMatrix(destMat, obj)
}

// untested functions

// Executes function `fn` when `entity` has finished loading, or immediately
// if it has already loaded. `entity` may be a single `a-entity` element, or
// an array of `a-entity` elements. If `fn` is not provided, it will return a
// `Promise` that will resolve when `entity` is loaded (or immediately if
// `entity` is already loaded).
Util.whenLoaded = function(entity, fn) {
  if (Array.isArray(entity) && fn) return whenLoadedAll(entity, fn)
  if (Array.isArray(entity)) return awaitLoadingAll(entity)
  if (fn) return whenLoadedSingle(entity, fn)
  return awaitLoadingSingle(entity)
}

function whenLoadedSingle(entity, fn) {
  if (entity.hasLoaded)
  {
    fn()
  }
  else
  {
    entity.addEventListener('loaded', fn)
  }
}

function whenLoadedAll(entities, fn) {
  let allLoaded = entities.map(() => false)
  for (let i = 0; i < entities.length; ++i)
  {
    let ii = i
    let entity = entities[ii]
    whenLoadedSingle(entity, () => {
      allLoaded[ii] = true
      if (allLoaded.every(t => t)) fn()
    })
  }
}

function awaitLoadingSingle(entity) {
  return new Promise((r, e) => whenLoadedSingle(entity, r))
}

async function awaitLoadingAll(entities) {
  for (let entity of entities)
  {
    await awaitLoadingSingle(entity)
  }
}

Util.whenComponentInitialized = function(el, component, fn) {
  if (el && el.components[component] && el.components[component].initialized) {
    return Promise.resolve(fn ? fn() : undefined)
  }

  return new Promise((r, e) => {
    if (el && el.components[component] && el.components[component].initialized) {
      return Promise.resolve(fn ? fn() : undefined)
    }

    let listener = (e) => {
      if (e.detail.name === component) {
        el.removeEventListener('componentinitialized', listener);
        if (fn) fn();
        r();
      }
    };
    el.addEventListener('componentinitialized', listener)
  })
}

// ========================================================================================

// Extra utility functions for dealing with PhysX

const PhysXUtil = {
    // Gets the world position transform of the given object3D in PhysX format
    object3DPhysXTransform: (() => {
      let pos = new THREE.Vector3();
      let quat = new THREE.Quaternion();
      return function (obj) {
        obj.getWorldPosition(pos);
        obj.getWorldQuaternion(quat);

        return {
          translation: {
            x: pos.x,
            y: pos.y,
            z: pos.z,
          },
          rotation: {
            w: quat.w, // PhysX uses WXYZ quaternions,
            x: quat.x,
            y: quat.y,
            z: quat.z,
          },
        }
      }
    })(),

  // Converts a THREE.Matrix4 into a PhysX transform
  matrixToTransform: (() => {
      let pos = new THREE.Vector3();
      let quat = new THREE.Quaternion();
      let scale = new THREE.Vector3();
      let scaleInv = new THREE.Matrix4();
      let mat2 = new THREE.Matrix4();
      return function (matrix) {
        matrix.decompose(pos, quat, scale);

        return {
          translation: {
            x: pos.x,
            y: pos.y,
            z: pos.z,
          },
          rotation: {
            w: quat.w, // PhysX uses WXYZ quaternions,
            x: quat.x,
            y: quat.y,
            z: quat.z,
          },
        }
      }
    })(),

  // Converts an arry of layer numbers to an integer bitmask
  layersToMask: (() => {
    let layers = new THREE.Layers();
    return function(layerArray) {
      layers.disableAll();
      for (let layer of layerArray)
      {
          layers.enable(parseInt(layer));
      }
      return layers.mask;
    };
  })(),

  axisArrayToEnums: function(axes) {
    let enumAxes = []
    for (let axis of axes)
    {
      if (axis === 'swing') {
        enumAxes.push(PhysX.PxD6Axis.eSWING1)
        enumAxes.push(PhysX.PxD6Axis.eSWING2)
        continue
      }
      let enumKey = `e${axis.toUpperCase()}`
      if (!(enumKey in PhysX.PxD6Axis))
      {
        console.warn(`Unknown axis ${axis} (PxD6Axis::${enumKey})`)
      }
      enumAxes.push(PhysX.PxD6Axis[enumKey])
    }
    return enumAxes;
  }
};

let PhysX

// Implements the a physics system using an emscripten compiled PhysX engine.
//
//
// If `autoLoad` is `true`, or when you call `startPhysX`, the `physx` system will
// automatically load and initialize the physics system with reasonable defaults
// and a ground plane. All you have to do is add [`physx-body`](#physx-body) to
// the bodies that you want to be part of the simulation. The system will take
// try to take care of things like collision meshes, position updates, etc
// automatically.  The simplest physics scene looks something like:
//
//```
// <a-scene physx="autoLoad: true">
//  <a-assets><a-asset-item id="#mymodel" src="..."></a-asset-item></a-assets>
//
//  <a-box physx-body="type: static" color="green" position="0 0 -3"></a-box>
//  <a-sphere physx-body="type: dynamic" position="0.4 2 -3" color="blue"></a-sphere>
//  <a-entity physx-body="type: dynamic" position="0 5 -3" gltf-model="#mymodel"></a-entity>
// </a-scene>
//```
//
// If you want a little more control over how things behave, you can set the
// [`physx-material`](#physx-material) component on the objects in your
// simulation, or use [`physx-joint`s](#physx-joint),
// [`physx-constraint`s](#physx-constraint) and [`physx-driver`s](#physx-driver)
// to add some complexity to your scene.
//
// If you need more low-level control, the PhysX bindings are exposed through
// the `PhysX` property of the system. So for instance, if you wanted to make
// use of the [`PxCapsuleGeometry`](https://gameworksdocs.nvidia.com/PhysX/4.1/documentation/physxapi/files/classPxCapsuleGeometry.html)
// in your own component, you would call:
//
//```
//    let myGeometry = new this.el.sceneEl.PhysX.PxCapsuleGeometry(1.0, 2.0)
//```
//
// The system uses [my fork](https://github.com/zach-capalbo/PhysX) of PhysX, built using the [Docker Wrapper](https://github.com/ashconnell/physx-js). To see what's exposed to JavaScript, see [PxWebBindings.cpp](https://github.com/zach-capalbo/PhysX/blob/emscripten_wip/physx/source/physxwebbindings/src/PxWebBindings.cpp)
//
// For a complete example of how to use this, you can see the
// [aframe-vartiste-toolkit Physics
// Playground](https://glitch.com/edit/#!/fascinated-hip-period?path=index.html)
//
// It is also helpful to refer to the [NVIDIA PhysX
// documentation](https://gameworksdocs.nvidia.com/PhysX/4.0/documentation/PhysXGuide/Manual/Index.html)
AFRAME.registerSystem('physx', {
  schema: {
    // Amount of time to wait after loading before starting the physics. Can be
    // useful if there is still some things loading or initializing elsewhere in
    // the scene
    delay: {default: 5000},

    // Throttle for running the physics simulation. On complex scenes, you can
    // increase this to avoid dropping video frames
    throttle: {default: 10},

    // If true, the PhysX will automatically be loaded and started. If false,
    // you will have to call `startPhysX()` manually to load and start the
    // physics engine
    autoLoad: {default: false},

    // Simulation speed multiplier. Increase or decrease to speed up or slow
    // down simulation time
    speed: {default: 1.0},

    // URL for the PhysX WASM bundle. If blank, it will be auto-located based on
    // the VARTISTE toolkit include path
    wasmUrl: {default: ""},

    // If true, sets up a default scene with a ground plane and bounding
    // cylinder.
    useDefaultScene: {default: true},

    // NYI
    wrapBounds: {default: false},

    // Which collision layers the ground belongs to
    groundCollisionLayers: {default: [2]},

    // Which collision layers will collide with the ground
    groundCollisionMask: {default: [1,2,3,4]},

    // Global gravity vector
    gravity: {type: 'vec3', default: {x: 0, y: -9.8, z: 0}},
  },
  init() {
    this.PhysXUtil = PhysXUtil;

    this.objects = new Map();
    this.shapeMap = new Map();
    this.jointMap = new Map();
    this.boundaryShapes = new Set();
    this.worldHelper = new THREE.Object3D();
    this.el.object3D.add(this.worldHelper);
    this.tock = AFRAME.utils.throttleTick(this.tock, this.data.throttle, this)
    this.collisionObject = {thisShape: null, otherShape:null, points: [], impulses: [], otherComponent: null};

    let defaultTarget = document.createElement('a-entity')
    this.el.append(defaultTarget)
    this.defaultTarget = defaultTarget

    this.initializePhysX = new Promise((r, e) => {
      this.fulfillPhysXPromise = r;
    })

    this.el.addEventListener('inspectortoggle', (e) => {
      console.log("Inspector toggle", e)
      if (e.detail === true)
      {
          this.running = false
      }
    })
  },
  findWasm() {
    if (this.data.wasmUrl) return this.data.wasmUrl;

    let path = require('./wasm/physx.release.wasm');
    if (window.VARTISTE_TOOLKIT_URL) {
      return `${window.VARTISTE_TOOLKIT_URL}/${path}`
    }

    return path
  },
  // Loads PhysX and starts the simulation
  async startPhysX() {
    this.running = true;
    let self = this;
    let resolveInitialized;
    let initialized = new Promise((r, e) => resolveInitialized = r)
    PhysX = PHYSX({
        locateFile(path) {
          if (path.endsWith('.wasm')) {
            return self.findWasm()
          }
          return path
        },
        onRuntimeInitialized() {
          resolveInitialized();
        }
      });
    if (PhysX instanceof Promise) PhysX = await PhysX;
    this.PhysX = PhysX;
    await initialized;
    self.startPhysXScene()
    self.physXInitialized = true
    self.fulfillPhysXPromise()
    self.el.emit('physx-started', {})
  },
  startPhysXScene() {
    console.info("Starting PhysX scene")
    const foundation = PhysX.PxCreateFoundation(
      PhysX.PX_PHYSICS_VERSION,
      new PhysX.PxDefaultAllocator(),
      new PhysX.PxDefaultErrorCallback()
    );
    this.foundation = foundation
    const physxSimulationCallbackInstance = PhysX.PxSimulationEventCallback.implement({
      onContactBegin: (shape0, shape1, points, impulses) => {
        let c0 = this.shapeMap.get(shape0.$$.ptr)
        let c1 = this.shapeMap.get(shape1.$$.ptr)

        if (c1 === c0) return;

        if (c0 && c0.data.emitCollisionEvents) {
          this.collisionObject.thisShape = shape0
          this.collisionObject.otherShape = shape1
          this.collisionObject.points = points
          this.collisionObject.impulses = impulses
          this.collisionObject.otherComponent = c1
          c0.el.emit('contactbegin', this.collisionObject)
        }

        if (c1 && c1.data.emitCollisionEvents) {
          this.collisionObject.thisShape = shape1
          this.collisionObject.otherShape = shape0
          this.collisionObject.points = points
          this.collisionObject.impulses = impulses
          this.collisionObject.otherComponent = c0
          c1.el.emit('contactbegin', this.collisionObject)
        }
      },
      onContactEnd: (shape0, shape1) => {
          let c0 = this.shapeMap.get(shape0.$$.ptr)
          let c1 = this.shapeMap.get(shape1.$$.ptr)

          if (c1 === c0) return;

        if (c0 && c0.data.emitCollisionEvents) {
          this.collisionObject.thisShape = shape0
          this.collisionObject.otherShape = shape1
          this.collisionObject.points = null
          this.collisionObject.impulses = null
          this.collisionObject.otherComponent = c1
          c0.el.emit('contactend', this.collisionObject)
        }

        if (c1 && c1.data.emitCollisionEvents) {
          this.collisionObject.thisShape = shape1
          this.collisionObject.otherShape = shape0
          this.collisionObject.points = null
          this.collisionObject.impulses = null
          this.collisionObject.otherComponent = c0
          c1.el.emit('contactend', this.collisionObject)
        }
      },
      onContactPersist: () => {},
      onTriggerBegin: () => {},
      onTriggerEnd: () => {},
      onConstraintBreak: (joint) => {
        let component = this.jointMap.get(joint.$$.ptr);

        if (!component) return;

        component.el.emit('constraintbreak', {})
      },
    });
    let tolerance = new PhysX.PxTolerancesScale();
    // tolerance.length /= 10;
    // console.log("Tolerances", tolerance.length, tolerance.speed);
    this.physics = PhysX.PxCreatePhysics(
      PhysX.PX_PHYSICS_VERSION,
      foundation,
      tolerance,
      false,
      null
    )
    PhysX.PxInitExtensions(this.physics, null);

    this.cooking = PhysX.PxCreateCooking(
      PhysX.PX_PHYSICS_VERSION,
      foundation,
      new PhysX.PxCookingParams(tolerance)
    )

    const sceneDesc = PhysX.getDefaultSceneDesc(
      this.physics.getTolerancesScale(),
      0,
      physxSimulationCallbackInstance
    )
    this.scene = this.physics.createScene(sceneDesc)

    this.setupDefaultEnvironment()
  },
  setupDefaultEnvironment() {
    this.defaultActorFlags = new PhysX.PxShapeFlags(
      PhysX.PxShapeFlag.eSCENE_QUERY_SHAPE.value |
        PhysX.PxShapeFlag.eSIMULATION_SHAPE.value
    )
    this.defaultFilterData = new PhysX.PxFilterData(PhysXUtil.layersToMask(this.data.groundCollisionLayers), PhysXUtil.layersToMask(this.data.groundCollisionMask), 0, 0);

    this.scene.setGravity(this.data.gravity)

    if (this.data.useDefaultScene)
    {
      this.createGroundPlane()
      this.createBoundingCylinder()
    }


    this.defaultTarget.setAttribute('physx-body', 'type', 'static')

  },
  createGroundPlane() {
    let geometry = new PhysX.PxPlaneGeometry();
    // let geometry = new PhysX.PxBoxGeometry(10, 1, 10);
    let material = this.physics.createMaterial(0.8, 0.8, 0.1);

    const shape = this.physics.createShape(geometry, material, false, this.defaultActorFlags)
    shape.setQueryFilterData(this.defaultFilterData)
    shape.setSimulationFilterData(this.defaultFilterData)
        const transform = {
      translation: {
        x: 0,
        y: 0,
        z: -5,
      },
      rotation: {
        w: 0.707107, // PhysX uses WXYZ quaternions,
        x: 0,
        y: 0,
        z: 0.707107,
      },
    }
    let body = this.physics.createRigidStatic(transform)
    body.attachShape(shape)
    this.scene.addActor(body, null)
    this.ground = body
    this.rigidBody = body
  },
  createBoundingCylinder() {
    const numPlanes = 16
    let geometry = new PhysX.PxPlaneGeometry();
    let material = this.physics.createMaterial(0.1, 0.1, 0.8);
    let spherical = new THREE.Spherical();
    spherical.radius = 30;
    let quat = new THREE.Quaternion();
    let pos = new THREE.Vector3;
    let euler = new THREE.Euler();

    for (let i = 0; i < numPlanes; ++i)
    {
      spherical.theta = i * 2.0 * Math.PI / numPlanes;
      pos.setFromSphericalCoords(spherical.radius, spherical.theta, spherical.phi)
      pos.x = - pos.y
      pos.y = 0;
      euler.set(0, spherical.theta, 0);
      quat.setFromEuler(euler)

      const shape = this.physics.createShape(geometry, material, false, this.defaultActorFlags)
      shape.setQueryFilterData(this.defaultFilterData)
      shape.setSimulationFilterData(this.defaultFilterData)
      const transform = {
        translation: {
          x: pos.x,
          y: pos.y,
          z: pos.z,
        },
        rotation: {
          w: quat.w, // PhysX uses WXYZ quaternions,
          x: quat.x,
          y: quat.y,
          z: quat.z,
        },
      }
      this.boundaryShapes.add(shape.$$.ptr)
      let body = this.physics.createRigidStatic(transform)
      body.attachShape(shape)
      this.scene.addActor(body, null)
    }
  },
  async registerComponentBody(component, {type}) {
    await this.initializePhysX;

    // const shape = this.physics.createShape(geometry, material, false, flags)
    const transform = PhysXUtil.object3DPhysXTransform(component.el.object3D);

    let body
    if (type === 'dynamic' || type === 'kinematic')
    {
      body = this.physics.createRigidDynamic(transform)

      // body.setRigidBodyFlag(PhysX.PxRigidBodyFlag.eENABLE_CCD, true);
      // body.setMaxContactImpulse(1e2);
    }
    else
    {
      body = this.physics.createRigidStatic(transform)
    }

    let attemptToUseDensity = true;
    let seenAnyDensity = false;
    let densities = new PhysX.VectorPxReal()
    for (let shape of component.createShapes(this.physics, this.defaultActorFlags))
    {
      body.attachShape(shape)

      if (isFinite(shape.density))
      {
        seenAnyDensity = true
        densities.push_back(shape.density)
      }
      else
      {
        attemptToUseDensity = false

        if (seenAnyDensity)
        {
          console.warn("Densities not set for all shapes. Will use total mass instead.", component.el)
        }
      }
    }
    if (type === 'dynamic' || type === 'kinematic') {
      if (attemptToUseDensity && seenAnyDensity)
      {
        console.log("Setting density vector", densities)
        body.updateMassAndInertia(densities)
      }
      else {
        body.setMassAndUpdateInertia(component.data.mass)
      }
    }
    densities.delete()
    this.scene.addActor(body, null)
    this.objects.set(component.el.object3D, body)
    component.rigidBody = body
  },
  registerShape(shape, component) {
    this.shapeMap.set(shape.$$.ptr, component);
  },
  registerJoint(joint, component) {
    this.jointMap.set(joint.$$.ptr, component);
  },
  removeBody(component) {
    let body = component.rigidBody
    this.objects.delete(component.el.object3D)
    body.release()
  },
  tock(t, dt) {
    if (t < this.data.delay) return
    if (!this.physXInitialized && this.data.autoLoad && !this.running) this.startPhysX()
    if (!this.physXInitialized) return
    if (!this.running) return

    this.scene.simulate(THREE.Math.clamp(dt * this.data.speed / 1000, 0, 0.03 * this.data.speed), true)
    this.scene.fetchResults(true)

    for (let [obj, body] of this.objects)
    {
        const transform = body.getGlobalPose()
        this.worldHelper.position.copy(transform.translation);
        this.worldHelper.quaternion.copy(transform.rotation);
        obj.getWorldScale(this.worldHelper.scale)
        Util.positionObject3DAtTarget(obj, this.worldHelper);
    }
  }
})

// Controls physics properties for individual shapes or rigid bodies. You can
// set this either on an entity with the `phyx-body` component, or on a shape or
// model contained in an entity with the `physx-body` component. If it's set on
// a `physx-body`, it will be the default material for all shapes in that body.
// If it's set on an element containing geometry or a model, it will be the
// material used for that shape only.
//
// For instance, in the following scene fragment:
//```
// <a-entity id="bodyA" physx-body physx-material="staticFriction: 0.5">
//   <a-box id="shape1" physx-material="staticFriction: 1.0"></a-box>
//   <a-sphere id="shape2"></a-sphere>
// </a-entity>
// <a-cone id="bodyB" physx-body></a-cone>
//```
//
// `shape1`, which is part of the `bodyA` rigid body, will have static friction
// of 1.0, since it has a material set on it. `shape2`, which is also part of
// the `bodyA` rigid body, will have a static friction of 0.5, since that is
// the body default. `bodyB` will have the component default of 0.2, since it is
// a separate body.
AFRAME.registerComponent('physx-material', {
  schema: {
    // Static friction
    staticFriction: {default: 0.2},
    // Dynamic friction
    dynamicFriction: {default: 0.2},
    // Restitution, or "bounciness"
    restitution: {default: 0.2},

    // Density for the shape. If densities are specified for _all_ shapes in a
    // rigid body, then the rigid body's mass properties will be automatically
    // calculated based on the different densities. However, if density
    // information is not specified for every shape, then the mass defined in
    // the overarching [`physx-body`](#physx-body) will be used instead.
    density: {type: 'number', default: NaN},

    // Which collision layers this shape is present on
    collisionLayers: {default: [1], type: 'array'},
    // Array containing all layers that this shape should collide with
    collidesWithLayers: {default: [1,2,3,4], type: 'array'},

    // If `collisionGroup` is greater than 0, this shape will *not* collide with
    // any other shape with the same `collisionGroup` value
    collisionGroup: {default: 0},

    // If >= 0, this will set the PhysX contact offset, indicating how far away
    // from the shape simulation contact events should begin.
    contactOffset: {default: -1.0},

    // If >= 0, this will set the PhysX rest offset
    restOffset: {default: -1.0},
  }
})

// Turns an entity into a PhysX rigid body. This is the main component for
// creating physics objects.
//
// **Types**
//
// There are 3 types of supported rigid bodies. The type can be set by using the
// `type` proeprty, but once initialized cannot be changed.
//
// - `dynamic` objects are objects that will have physics simulated on them. The
//   entity's world position, scale, and rotation will be used as the starting
//   condition for the simulation, however once the simulation starts the
//   entity's position and rotation will be replaced each frame with the results
//   of the simulation.
// - `static` objects are objects that cannot move. They cab be used to create
//   collidable objects for `dynamic` objects, or for anchor points for joints.
// - `kinematic` objects are objects that can be moved programmatically, but
//   will not be moved by the simulation. They can however, interact with and
//   collide with dynamic objects. Each frame, the entity's `object3D` will be
//   used to set the position and rotation for the simulation object.
//
// **Shapes**
//
// When the component is initialized, and on the `object3dset` event, all
// visible meshes that are descendents of this entity will have shapes created
// for them. Each individual mesh will have its own convex hull automatically
// generated for it. This means you can have reasonably accurate collision
// meshes both from building up shapes with a-frame geometry primitives, and
// from importing 3D models.
//
// Visible meshes can be excluded from this shape generation process by setting
// the `physx-no-collision` attribute on the corresponding `a-entity` element.
// Invisible meshes can be included into this shape generation process by
// settingt the `physx-hidden-collision` attribute on the corresponding
// `a-entity` element. This can be especially useful when using an external tool
// (like [Blender V-HACD](https://github.com/andyp123/blender_vhacd)) to create
// a low-poly convex collision mesh for a high-poly or concave mesh. This leads
// to this pattern for such cases:
//
// ```
//    <a-entity physx-body="type: dynamic">
//      <a-entity gltf-model="HighPolyOrConcaveURL.gltf" physx-no-collision=""></a-entity>
//      <a-entity gltf-model="LowPolyConvexURL.gltf" physx-hidden-collision="" visible="false"></a-entity>
//    </a-entity>
// ```
//
// Note, in such cases that if you are setting material properties on individual
// shapes, then the property should go on the collision mesh entity
//
// **Use with the [Manipulator](#manipulator) component**
//
// If a dynamic entity is grabbed by the [Manipulator](#manipulator) component,
// it will temporarily become a kinematic object. This means that collisions
// will no longer impede its movement, and it will track the manipulator
// exactly, (subject to any manipulator constraints, such as
// [`manipulator-weight`](#manipulator-weight)). If you would rather have the
// object remain dynamic, you will need to [redirect the grab](#redirect-grab)
// to a `physx-joint` instead, or even easier, use the
// [`dual-wieldable`](#dual-wieldable) component.
//
// As soon as the dynamic object is released, it will revert back to a dynamic
// object. Objects with the type `kinematic` will remain kinematic.
//
// Static objects should not be moved. If a static object can be the target of a
// manipulator grab (or any other kind of movement), it should be `kinematic`
// instead.
AFRAME.registerComponent('physx-body', {
  dependencies: ['physx-material'],
  schema: {
    // **[dynamic, static, kinematic]** Type of the rigid body to create
    type: {default: 'dynamic', oneOf: ['dynamic', 'static', 'kinematic']},

    // Total mass of the body
    mass: {default: 1.0},

    // If > 0, will set the rigid body's angular damping
    angularDamping: {default: 0.0},

    // If > 0, will set the rigid body's linear damping
    linearDamping: {default: 0.0},

    // If set to `true`, it will emit `contactbegin` and `contactend` events
    // when collisions occur
    emitCollisionEvents: {default: false},

    // If set to `true`, the object will receive extra attention by the
    // simulation engine (at a performance cost).
    highPrecision: {default: false},

    shapeOffset: {type: 'vec3', default: {x: 0, y: 0, z: 0}}
  },
  events: {
    stateadded: function(e) {
      if (e.detail === 'grabbed') {
        this.rigidBody.setRigidBodyFlag(PhysX.PxRigidBodyFlag.eKINEMATIC, true)
      }
    },
    stateremoved: function(e) {
      if (e.detail === 'grabbed') {
        if (this.floating) {
          this.rigidBody.setLinearVelocity({x: 0, y: 0, z: 0}, true)
        }
        if (this.data.type !== 'kinematic')
        {
          this.rigidBody.setRigidBodyFlag(PhysX.PxRigidBodyFlag.eKINEMATIC, false)
        }
      }
    },
    'bbuttonup': function(e) {
      this.toggleGravity()
    },
    componentchanged: function(e) {
      if (e.name === 'physx-material')
      {
        this.el.emit('object3dset', {})
      }
    },
    object3dset: function(e) {
      if (this.rigidBody) {
        for (let shape of this.shapes)
        {
            this.rigidBody.detachShape(shape, false)
        }

        let attemptToUseDensity = true;
        let seenAnyDensity = false;
        let densities = new PhysX.VectorPxReal()
        let component = this
        let type = this.data.type
        let body = this.rigidBody
        for (let shape of component.createShapes(this.system.physics, this.system.defaultActorFlags))
        {
          body.attachShape(shape)

          if (isFinite(shape.density))
          {
            seenAnyDensity = true
            densities.push_back(shape.density)
          }
          else
          {
            attemptToUseDensity = false

            if (seenAnyDensity)
            {
              console.warn("Densities not set for all shapes. Will use total mass instead.", component.el)
            }
          }
        }
        if (type === 'dynamic' || type === 'kinematic') {
          if (attemptToUseDensity && seenAnyDensity)
          {
            console.log("Setting density vector", densities)
            body.updateMassAndInertia(densities)
          }
          else {
            body.setMassAndUpdateInertia(component.data.mass)
          }
        }
      }
    },
    contactbegin: function(e) {
      // console.log("Collision", e.detail.points)
    }
  },
  init() {
    this.system = this.el.sceneEl.systems.physx
    this.physxRegisteredPromise = this.system.registerComponentBody(this, {type: this.data.type})
    this.el.setAttribute('grab-options', 'scalable', false)

    this.kinematicMove = this.kinematicMove.bind(this)
    if (this.el.sceneEl.systems['button-caster'])
    {
      this.el.sceneEl.systems['button-caster'].install(['bbutton'])
    }

    this.physxRegisteredPromise.then(() => this.update())
  },
  update(oldData) {
    if (!this.rigidBody) return;

    if (this.data.type === 'dynamic')
    {
      this.rigidBody.setAngularDamping(this.data.angularDamping)
      this.rigidBody.setLinearDamping(this.data.linearDamping)
      this.rigidBody.setRigidBodyFlag(PhysX.PxRigidBodyFlag.eKINEMATIC, false)
      if (this.data.highPrecision)
      {
        this.rigidBody.setSolverIterationCounts(4, 2);
        this.rigidBody.setRigidBodyFlag(PhysX.PxRigidBodyFlag.eENABLE_CCD, true)
      }
    }

    if (!oldData || this.data.mass !== oldData.mass) this.el.emit('object3dset', {})
  },
  remove() {
    this.system.removeBody(this)
  },
  createGeometry(o) {
    if (o.el.hasAttribute('geometry'))
    {
      let geometry = o.el.getAttribute('geometry');
      switch(geometry.primitive)
      {
        case 'sphere':
          return new PhysX.PxSphereGeometry(geometry.radius * this.el.object3D.scale.x * 0.98)
        case 'box':
          return new PhysX.PxBoxGeometry(geometry.width / 2, geometry.height / 2, geometry.depth / 2)
        default:
          return this.createConvexMeshGeometry(o.el.getObject3D('mesh'));
      }
    }
  },
  createConvexMeshGeometry(mesh, rootAncestor) {
    let vectors = new PhysX.PxVec3Vector()

    let g = mesh.geometry.attributes.position
    if (!g) return;
    if (g.count < 3) return;
    if (g.itemSize != 3) return;
    let t = new THREE.Vector3;

    if (rootAncestor)
    {
      let matrix = new THREE.Matrix4();
      mesh.updateMatrix();
      matrix.copy(mesh.matrix)
      let ancestor = mesh.parent;
      while(ancestor && ancestor !== rootAncestor)
      {
          ancestor.updateMatrix();
          matrix.premultiply(ancestor.matrix);
          ancestor = ancestor.parent;
      }
      for (let i = 0; i < g.count; ++i) {
        t.fromBufferAttribute(g, i)
        t.applyMatrix4(matrix);
        vectors.push_back(Object.assign({}, t));
      }
    }
    else
    {
      for (let i = 0; i < g.count; ++i) {
        t.fromBufferAttribute(g, i)
        vectors.push_back(Object.assign({}, t));
      }
    }

    let worldScale = new THREE.Vector3;
    let worldBasis = (rootAncestor || mesh);
    worldBasis.updateMatrixWorld();
    worldBasis.getWorldScale(worldScale);
    let convexMesh = this.system.cooking.createConvexMesh(vectors, this.system.physics)
    return new PhysX.PxConvexMeshGeometry(convexMesh, new PhysX.PxMeshScale({x: worldScale.x, y: worldScale.y, z: worldScale.z}, {w: 1, x: 0, y: 0, z: 0}), new PhysX.PxConvexMeshGeometryFlags(PhysX.PxConvexMeshGeometryFlag.eTIGHT_BOUNDS.value))
  },
  createShape(physics, geometry, materialData)
  {
    let material = physics.createMaterial(materialData.staticFriction, materialData.dynamicFriction, materialData.restitution);
    let shape = physics.createShape(geometry, material, false, this.system.defaultActorFlags)
    shape.setQueryFilterData(new PhysX.PxFilterData(PhysXUtil.layersToMask(materialData.collisionLayers), PhysXUtil.layersToMask(materialData.collidesWithLayers), materialData.collisionGroup, 0))
    shape.setSimulationFilterData(new PhysX.PxFilterData(PhysXUtil.layersToMask(materialData.collisionLayers), PhysXUtil.layersToMask(materialData.collidesWithLayers), materialData.collisionGroup, 0))

    if (materialData.contactOffset >= 0.0)
    {
      shape.setContactOffset(materialData.contactOffset)
    }
    if (materialData.restOffset >= 0.0)
    {
      shape.setRestOffset(materialData.restOffset)
    }

    shape.density = materialData.density;
    this.system.registerShape(shape, this)

    return shape;
  },
  createShapes(physics) {
    if (this.el.hasAttribute('geometry'))
    {
      let geometry = this.createGeometry(this.el.object3D);
      if (!geometry) return;
      let materialData = this.el.components['physx-material'].data
      this.shapes = [this.createShape(physics, geometry, materialData)];

      return this.shapes;
    }

    let shapes = []
    Util.traverseCondition(this.el.object3D,
      o => {
        if (o.el && o.el.hasAttribute("physx-no-collision")) return false;
        if (o.el && !o.el.object3D.visible && !o.el.hasAttribute("physx-hidden-collision")) return false;
        if (!o.visible && o.el && !o.el.hasAttribute("physx-hidden-collision")) return false;
        if (o.userData && o.userData.vartisteUI) return false;
        return true
      },
      o => {
      if (o.geometry) {
        let geometry;
        if (false && o.el && o.el.hasAttribute('geometry'))
        {
          geometry = this.createGeometry(o);
        }
        else
        {
          geometry = this.createConvexMeshGeometry(o, this.el.object3D);
        }
        if (!geometry) {
          console.warn("Couldn't create geometry", o)
          return;
        }

        let material, materialData;
        if (o.el && o.el.hasAttribute('physx-material'))
        {
          materialData = o.el.getAttribute('physx-material')
        }
        else
        {
            materialData = this.el.components['physx-material'].data
        }
        let shape = this.createShape(physics, geometry, materialData)

        // shape.setLocalPose({translation: this.data.shapeOffset, rotation: {w: 1, x: 0, y: 0, z: 0}})

        shapes.push(shape)
      }
    });

    this.shapes = shapes

    return shapes
  },
  // Turns gravity on and off
  toggleGravity() {
    this.rigidBody.setActorFlag(PhysX.PxActorFlag.eDISABLE_GRAVITY, !this.floating)
    this.floating = !this.floating
  },
  resetBodyPose() {
    this.rigidBody.setGlobalPose(PhysXUtil.object3DPhysXTransform(this.el.object3D), true)
  },
  kinematicMove() {
    this.rigidBody.setKinematicTarget(PhysXUtil.object3DPhysXTransform(this.el.object3D))
  },
  tock(t, dt) {
    if (this.rigidBody && this.data.type === 'kinematic' && !this.setKinematic)
    {
      this.rigidBody.setRigidBodyFlag(PhysX.PxRigidBodyFlag.eKINEMATIC, true)
      this.setKinematic = true
    }
    if (this.rigidBody && (this.data.type === 'kinematic' || this.el.is("grabbed"))) {
      // this.el.object3D.scale.set(1,1,1)
      this.kinematicMove()
    }
  }
})

// Creates a driver which exerts force to return the joint to the specified
// (currently only the initial) position with the given velocity
// characteristics.
//
// This can only be used on an entity with a `physx-joint` component. Currently
// only supports **D6** joint type. E.g.
//
//```
// <a-box physx-body>
//    <a-entity position="0.2 0.3 0.4" rotation="0 90 0"
//              physx-joint="type: D6; target: #other-body"
//              physx-joint-driver="axes: swing, twist; stiffness: 30; angularVelocity: 3 3 0">
//    </a-entity>
// </a-box>
//```
AFRAME.registerComponent('physx-joint-driver', {
  dependencies: ['physx-joint'],
  multiple: true,
  schema: {
    // Which axes the joint should operate on. Should be some combination of `x`, `y`, `z`, `twist`, `swing`
    axes: {type: 'array', default: []},

    // How stiff the drive should be
    stiffness: {default: 1.0},

    // Damping to apply to the drive
    damping: {default: 1.0},

    // Maximum amount of force used to get to the target position
    forceLimit: {default: 3.4028234663852885981170418348452e+38},

    // If true, will operate directly on body acceleration rather than on force
    useAcceleration: {default: true},

    // Target linear velocity relative to the joint
    linearVelocity: {type: 'vec3', default: {x: 0, y: 0, z: 0}},

    // Targget angular velocity relative to the joint
    angularVelocity: {type: 'vec3', default: {x: 0, y: 0, z: 0}},

    // If true, will automatically lock axes which are not being driven
    lockOtherAxes: {default: false},

    // If true SLERP rotation mode. If false, will use SWING mode.
    slerpRotation: {default: true},
  },
  events: {
    'physx-jointcreated': function(e) {
      this.setJointDriver()
    }
  },
  init() {
    this.el.setAttribute('phsyx-custom-constraint', "")
  },
  setJointDriver() {
    if (!this.enumAxes) this.update();
    if (this.el.components['physx-joint'].data.type !== 'D6') {
      console.warn("Only D6 joint drivers supported at the moment")
      return;
    }

    let PhysX = this.el.sceneEl.systems.physx.PhysX;
    this.joint = this.el.components['physx-joint'].joint

    if (this.data.lockOtherAxes)
    {
      this.joint.setMotion(PhysX.PxD6Axis.eX, PhysX.PxD6Motion.eLOCKED)
      this.joint.setMotion(PhysX.PxD6Axis.eY, PhysX.PxD6Motion.eLOCKED)
      this.joint.setMotion(PhysX.PxD6Axis.eZ, PhysX.PxD6Motion.eLOCKED)
      this.joint.setMotion(PhysX.PxD6Axis.eSWING1, PhysX.PxD6Motion.eLOCKED)
      this.joint.setMotion(PhysX.PxD6Axis.eSWING2, PhysX.PxD6Motion.eLOCKED)
      this.joint.setMotion(PhysX.PxD6Axis.eTWIST, PhysX.PxD6Motion.eLOCKED)
    }

    for (let enumKey of this.enumAxes)
    {
      this.joint.setMotion(enumKey, PhysX.PxD6Motion.eFREE)
    }

    let drive = new PhysX.PxD6JointDrive;
    drive.stiffness = this.data.stiffness;
    drive.damping = this.data.damping;
    drive.forceLimit = this.data.forceLimit;
    drive.setAccelerationFlag(this.data.useAcceleration);

    for (let axis of this.driveAxes)
    {
      this.joint.setDrive(axis, drive);
    }

    console.log("Setting joint driver", this.driveAxes, this.enumAxes)

    this.joint.setDrivePosition({translation: {x: 0, y: 0, z: 0}, rotation: {w: 1, x: 0, y: 0, z: 0}}, true)

    this.joint.setDriveVelocity(this.data.linearVelocity, this.data.angularVelocity, true);
  },
  update(oldData) {
    if (!PhysX) return;

    this.enumAxes = []
    for (let axis of this.data.axes)
    {
      if (axis === 'swing') {
        this.enumAxes.push(PhysX.PxD6Axis.eSWING1)
        this.enumAxes.push(PhysX.PxD6Axis.eSWING2)
        continue
      }
      let enumKey = `e${axis.toUpperCase()}`
      if (!(enumKey in PhysX.PxD6Axis))
      {
        console.warn(`Unknown axis ${axis} (PxD6Axis::${enumKey})`)
      }
      this.enumAxes.push(PhysX.PxD6Axis[enumKey])
    }

    this.driveAxes = []

    for (let axis of this.data.axes)
    {
      if (axis === 'swing') {
        if (this.data.slerpRotation)
        {
          this.driveAxes.push(PhysX.PxD6Drive.eSLERP)
        }
        else
        {
          this.driveAxes.push(PhysX.PxD6Drive.eSWING)
        }
        continue
      }

      if (axis === 'twist' && this.data.slerpRotation) {
        this.driveAxes.push(PhysX.PxD6Drive.eSLERP)
        continue;
      }

      let enumKey = `e${axis.toUpperCase()}`
      if (!(enumKey in PhysX.PxD6Drive))
      {
        console.warn(`Unknown axis ${axis} (PxD6Axis::${enumKey})`)
      }
      this.driveAxes.push(PhysX.PxD6Drive[enumKey])
    }
  }
})

// Adds a constraint to a [`physx-joint`](#physx-joint). Currently only **D6**
// joints are supported.
//
// Can only be used on an entity with the `physx-joint` component. You can set
// multiple constraints per joint. Note that in order to specify attributes of
// individual axes, you will need to use multiple constraints. For instance:
//
//```
// <a-box physx-body>
//   <a-entity physx-joint="type: D6"
//             physx-joint-constraint__xz="constrainedAxes: x,z; linearLimit: -1 20"
//             physx-joint-constraint__y="constrainedAxes: y; linearLimit: 0 3; stiffness: 3"
//             physx-joint-constraint__rotation="lockedAxes: twist; swing"></a-entity>
// </a-box>
//```
//
// In the above example, the box will be able to move from -1 to 20 in both the
// x and z direction. It will be able to move from 0 to 3 in the y direction,
// but this will be a soft constraint, subject to spring forces if the box goes
// past in the y direction. All rotation will be locked. (Note that since no
// target is specified, it will use the scene default target, effectively
// jointed to joint's initial position in the world)
AFRAME.registerComponent('physx-joint-constraint', {
  multiple: true,
  schema: {
    // Which axes are explicitly locked by this constraint and can't be moved at all.
    // Should be some combination of `x`, `y`, `z`, `twist`, `swing`
    lockedAxes: {type: 'array', default: []},

    // Which axes are constrained by this constraint. These axes can be moved within the set limits.
    // Should be some combination of `x`, `y`, `z`, `twist`, `swing`
    constrainedAxes: {type: 'array', default: []},

    // Which axes are explicitly freed by this constraint. These axes will not obey any limits set here.
    // Should be some combination of `x`, `y`, `z`, `twist`, `swing`
    freeAxes: {type: 'array', default: []},

    // Limit on linear movement. Only affects `x`, `y`, and `z` axes.
    // First vector component is the minimum allowed position
    linearLimit: {type: 'vec2'},

    // Two angles specifying a cone in which the joint is allowed to swing, like
    // a pendulum.
    limitCone: {type: 'vec2'},

    // Minimum and maximum angles that the joint is allowed to twist
    twistLimit: {type: 'vec2'},

    // Spring damping for soft constraints
    damping: {default: 0.0},
    // Spring restitution for soft constraints
    restitution: {default: 0.0},
    // If greater than 0, will make this joint a soft constraint, and use a
    // spring force model
    stiffness: {default: 0.0},
  },
  events: {
    'physx-jointcreated': function(e) {
      this.setJointConstraint()
    }
  },
  init() {
    this.el.setAttribute('phsyx-custom-constraint', "")
  },
  setJointConstraint() {
    if (this.el.components['physx-joint'].data.type !== 'D6') {
      console.warn("Only D6 joint constraints supported at the moment")
      return;
    }

    if (!this.constrainedAxes) this.update();

    let joint = this.el.components['physx-joint'].joint;

    let llimit = () => {
      let l = new PhysX.PxJointLinearLimitPair(new PhysX.PxTolerancesScale(), this.data.linearLimit.x, this.data.linearLimit.y);
      l.siffness = this.data.stiffness;
      l.damping = this.data.damping;
      l.restitution = this.data.restitution;
      return l
    }

    for (let axis of this.freeAxes)
    {
      joint.setMotion(axis, PhysX.PxD6Motion.eFREE)
    }

    for (let axis of this.lockedAxes)
    {
      joint.setMotion(axis, PhysX.PxD6Motion.eLOCKED)
    }

    for (let axis of this.constrainedAxes)
    {
      if (axis === PhysX.PxD6Axis.eX || axis === PhysX.PxD6Axis.eY || axis === PhysX.PxD6Axis.eZ)
      {
        joint.setMotion(axis, PhysX.PxD6Motion.eLIMITED)
        joint.setLinearLimit(axis, llimit())
        continue;
      }

      if (axis === PhysX.eTWIST)
      {
        joint.setMotion(PhysX.PxD6Axis.eTWIST, PhysX.PxD6Motion.eLIMITED)
        let pair = new PhysX.PxJointAngularLimitPair(this.data.limitTwist.x, this.data.limitTwist.y)
        pair.stiffness = this.data.stiffness
        pair.damping = this.data.damping
        pair.restitution = this.data.restitution
        joint.setTwistLimit(pair)
        continue;
      }

      joint.setMotion(axis, PhysX.PxD6Motion.eLIMITED)
      let cone = new PhysX.PxJointLimitCone(this.data.limitCone.x, this.data.limitCone.y)
      cone.damping = this.data.damping
      cone.stiffness = this.data.stiffness
      cone.restitution = this.data.restitution
      joint.setSwingLimit(cone)
    }
  },
  update(oldData) {
    if (!PhysX) return;

    this.constrainedAxes = PhysXUtil.axisArrayToEnums(this.data.constrainedAxes)
    this.lockedAxes = PhysXUtil.axisArrayToEnums(this.data.lockedAxes)
    this.freeAxes = PhysXUtil.axisArrayToEnums(this.data.freeAxes)
  }
})

// Creates a PhysX joint between an ancestor rigid body and a target rigid body.
//
// The physx-joint is designed to be used either on or within an entity with the
// `physx-body` component. For instance:
//
// ```
// <a-entity physx-body="type: dynamic">
//   <a-entity physx-joint="target: #other-body" position="1 0 0"></a-entity>
// </a-entity>
// ```
//
// The position and rotation of the `physx-joint` will be used to create the
// corresponding PhysX joint object. Multiple joints can be created on a body,
// and multiple joints can target a body.
//
// **Stapler Example**
//
// Here's a simplified version of the stapler from the [physics playground demo]()
//
//```
// <a-entity id="stapler">
//   <a-entity id="stapler-top" physx-body="type: dynamic" class="grab-root">
//     <a-entity class="clickable" propogate-grab="" gltf-part-plus="src: #asset-stapler; part: Top"></a-entity>
//     <a-entity physx-joint="target: #stapler-bottom; type: Revolute; collideWithTarget: true" position="0 0.0254418 -3.7280"></a-entity>
//   </a-entity>
//   <a-entity id="stapler-bottom" gltf-part-plus="src: #asset-stapler; part: Bottom" physx-body="type: dynamic"></a-entity>
// </a-entity>
//```
//
// Notice the joint is created between the top part of the stapler (which
// contains the joint) and the bottom part of the stapler at the position of the
// `physx-joint` component's entitiy. This will be the pivot point for the
// stapler's rotation.
//
// ![Stapler with joint highlighted](./static/images/staplerjoint.png)
AFRAME.registerComponent('physx-joint', {
  multiple: true,
  schema: {
    // Rigid body joint type to use. See the [NVIDIA PhysX joint
    // documentation](https://gameworksdocs.nvidia.com/PhysX/4.0/documentation/PhysXGuide/Manual/Joints.html)
    // for details on each type
    type: {default: "Spherical", oneOf: ["Fixed", "Spherical", "Distance", "Revolute", "Prismatic", "D6"]},

    // Target object. If specified, must be an entity having the `physx-body`
    // component. If no target is specified, a scene default target will be
    // used, essentially joining the joint to its initial position in the world.
    target: {type: 'selector'},

    // Force needed to break the constraint. First component is the linear force, second component is angular force. Set both components are >= 0
    breakForce: {type: 'vec2', default: {x: -1, y: -1}},

    // If true, removes the entity containing this component when the joint is
    // broken.
    removeElOnBreak: {default: false},

    // If false, collision will be disabled between the rigid body containing
    // the joint and the target rigid body.
    collideWithTarget: {default: false},

    // When used with a D6 type, sets up a "soft" fixed joint. E.g., for grabbing things
    softFixed: {default: false},
  },
  events: {
    constraintbreak: function(e) {
      if (this.data.removeElOnBreak) {
        this.el.remove()
      }
    }
  },
  init() {
    this.system = this.el.sceneEl.systems.physx

    let parentEl = this.el

    while (parentEl && !parentEl.hasAttribute('physx-body'))
    {
        parentEl = parentEl.parentEl
    }

    if (!parentEl) {
      console.warn("physx-joint must be used within a physx-body")
      return;
    }

    this.bodyEl = parentEl

    this.worldHelper = new THREE.Object3D;
    this.worldHelperParent = new THREE.Object3D;
    this.el.sceneEl.object3D.add(this.worldHelperParent);
    this.targetScale = new THREE.Vector3(1,1,1)
    this.worldHelperParent.add(this.worldHelper)

    if (!this.data.target) {
      this.data.target = this.system.defaultTarget
    }


    Util.whenLoaded([this.el, this.bodyEl, this.data.target], () => {
      this.createJoint()
    })
  },
  remove() {
    if (this.joint) {
      this.joint.release();
      this.joint = null;
      this.bodyEl.components['physx-body'].rigidBody.wakeUp()
      if (this.data.target.components['physx-body'].rigidBody.wakeUp) this.data.target.components['physx-body'].rigidBody.wakeUp()
    }
  },
  update() {
    if (!this.joint) return;

    if (this.data.breakForce.x >= 0 && this.data.breakForce.y >= 0)
    {
        this.joint.setBreakForce(this.data.breakForce.x, this.data.breakForce.y);
    }

    this.joint.setConstraintFlag(PhysX.PxConstraintFlag.eCOLLISION_ENABLED, this.data.collideWithTarget)

    if (this.el.hasAttribute('phsyx-custom-constraint')) return;

    switch (this.data.type)
    {
      case 'D6':
      {
        if (this.data.softFixed)
        {
          this.joint.setMotion(PhysX.PxD6Axis.eX, PhysX.PxD6Motion.eFREE)
          this.joint.setMotion(PhysX.PxD6Axis.eY, PhysX.PxD6Motion.eFREE)
          this.joint.setMotion(PhysX.PxD6Axis.eZ, PhysX.PxD6Motion.eFREE)
          this.joint.setMotion(PhysX.PxD6Axis.eSWING1, PhysX.PxD6Motion.eFREE)
          this.joint.setMotion(PhysX.PxD6Axis.eSWING2, PhysX.PxD6Motion.eFREE)
          this.joint.setMotion(PhysX.PxD6Axis.eTWIST, PhysX.PxD6Motion.eFREE)

          let drive = new PhysX.PxD6JointDrive;
          drive.stiffness = 1000;
          drive.damping = 500;
          drive.forceLimit = 1000;
          drive.setAccelerationFlag(false);
          this.joint.setDrive(PhysX.PxD6Drive.eX, drive);
          this.joint.setDrive(PhysX.PxD6Drive.eY, drive);
          this.joint.setDrive(PhysX.PxD6Drive.eZ, drive);
          // this.joint.setDrive(PhysX.PxD6Drive.eSWING, drive);
          // this.joint.setDrive(PhysX.PxD6Drive.eTWIST, drive);
          this.joint.setDrive(PhysX.PxD6Drive.eSLERP, drive);
          this.joint.setDrivePosition({translation: {x: 0, y: 0, z: 0}, rotation: {w: 1, x: 0, y: 0, z: 0}}, true)
          this.joint.setDriveVelocity({x: 0.0, y: 0.0, z: 0.0}, {x: 0, y: 0, z: 0}, true);
        }
      }
      break;
    }
  },
  getTransform(el) {
    Util.positionObject3DAtTarget(this.worldHelperParent, el.object3D, {scale: this.targetScale})

    Util.positionObject3DAtTarget(this.worldHelper, this.el.object3D, {scale: this.targetScale});

    let transform = PhysXUtil.matrixToTransform(this.worldHelper.matrix);

    return transform;
  },
  async createJoint() {
    await Util.whenComponentInitialized(this.bodyEl, 'physx-body')
    await Util.whenComponentInitialized(this.data.target, 'physx-body')
    await this.bodyEl.components['physx-body'].physxRegisteredPromise;
    await this.data.target.components['physx-body'].physxRegisteredPromise;

    if (this.joint) {
      this.joint.release();
      this.joint = null;
    }

    let thisTransform = this.getTransform(this.bodyEl);
    let targetTransform = this.getTransform(this.data.target);

    this.joint = PhysX[`Px${this.data.type}JointCreate`](this.system.physics,
                                                         this.bodyEl.components['physx-body'].rigidBody, thisTransform,
                                                         this.data.target.components['physx-body'].rigidBody, targetTransform,
                                                        )
    this.system.registerJoint(this.joint, this)
    this.update();
    this.el.emit('physx-jointcreated', this.joint)
  }
})


AFRAME.registerSystem('physx-contact-event', {
  init() {
    this.worldHelper = new THREE.Object3D;
    this.el.sceneEl.object3D.add(this.worldHelper)
  }
})

// Emits a `contactevent` event when a collision meets the threshold.  This
// should be set on an entity with the `physx-body` component. The event detail
// will contain these fields:
// - `impulse`: The summed impulse of at all contact points
// - `contact`: The originating contact event
AFRAME.registerComponent('physx-contact-event', {
  dependencies: ['physx-body'],
  schema: {
  // Minimum total impulse threshold to emit the event
  impulseThreshold: {default: 0.01},

  // NYI
  maxDistance: {default: 10.0},
  // NYI
  maxDuration: {default: 5.0},

  // Delay after start of scene before emitting events. Useful to avoid a
  // zillion events as objects initially settle on the ground
  startDelay: {default: 6000},

  // If `true`, the event detail will include a `positionWorld` property which contains the weighted averaged location
  // of all contact points. Contact points are weighted by impulse amplitude.
  positionAtContact: {default: false},
  },
  events: {
    contactbegin: function(e) {
      if (this.el.sceneEl.time < this.data.startDelay) return
      let thisWorld = this.eventDetail.positionWorld;
      let cameraWorld = this.pool('cameraWorld', THREE.Vector3);

      let impulses = e.detail.impulses
      let impulseSum = 0
      for (let i = 0; i < impulses.size(); ++i)
      {
        impulseSum += impulses.get(i)
      }

      if (impulseSum < this.data.impulseThreshold) return;

      thisWorld.set(0, 0, 0)
      let impulse = 0.0;
      if (this.data.positionAtContact)
      {
        for (let i = 0; i < impulses.size(); ++i)
        {
          impulse = impulses.get(i);
          let position = e.detail.points.get(i);
          thisWorld.x += position.x * impulse;
          thisWorld.y += position.y * impulse;
          thisWorld.z += position.z * impulse;
        }
        thisWorld.multiplyScalar(1.0 / impulseSum)
        this.system.worldHelper.position.copy(thisWorld)
        Util.positionObject3DAtTarget(this.localHelper, this.system.worldHelper)
        this.eventDetail.position.copy(this.localHelper.position)
      }
      else
      {
        thisWorld.set(0, 0, 0)
        this.eventDetail.position.set(0, 0, 0)
      }

      this.eventDetail.impulse = impulseSum
      this.eventDetail.contact = e.detail

      this.el.emit('contactevent', this.eventDetail)
    }
  },
  init() {
    VARTISTE.Pool.init(this)

    this.eventDetail = {
      impulse: 0.0,
      positionWorld: new THREE.Vector3(),
      position: new THREE.Vector3(),
      contact: null,
    }

    if (this.data.debug) {
      let vis = document.createElement('a-entity')
      vis.setAttribute('geometry', 'primitive: sphere; radius: 0.1')
      vis.setAttribute('physx-no-collision', '')
    }

    this.localHelper = new THREE.Object3D();
    this.el.object3D.add(this.localHelper)

    this.el.setAttribute('physx-body', 'emitCollisionEvents', true)
  },
  remove() {
    this.el.object3D.remove(this.localHelper)
  }
})

// Plays a sound when a `physx-body` has a collision.
AFRAME.registerComponent('physx-contact-sound', {
  dependencies: ['physx-contact-event'],
  schema: {
    // Sound file location or asset
    src: {type: 'string'},

    // Minimum total impulse to play the sound
    impulseThreshold: {default: 0.01},

    // NYI
    maxDistance: {default: 10.0},
    // NYI
    maxDuration: {default: 5.0},

    // Delay after start of scene before playing sounds. Useful to avoid a
    // zillion sounds playing as objects initially settle on the ground
    startDelay: {default: 6000},

    // If `true`, the sound will be positioned at the weighted averaged location
    // of all contact points. Contact points are weighted by impulse amplitude.
    // If `false`, the sound will be positioned at the entity's origin.
    positionAtContact: {default: false},
  },
  events: {
    contactevent: function(e) {
      if (this.data.positionAtContact)
      {
        this.sound.object3D.position.copy(e.detail.position)
      }

      this.sound.components.sound.stopSound();
      this.sound.components.sound.playSound();
    },
  },
  init() {
    let sound = document.createElement('a-entity')
    this.el.append(sound)
    sound.setAttribute('sound', {src: this.data.src})
    this.sound = sound

    this.el.setAttribute('physx-body', 'emitCollisionEvents', true)
  },
  update(oldData) {
    this.el.setAttribute('physx-contact-event', this.data)
  }
})

// Creates A-Frame entities from gltf custom properties.
//
// **WARNING** do not use this component with untrusted gltf models, since it
// will let the model access arbitrary components.
//
// Should be set on an entity with the `gltf-model` component. Once the model is
// loaded, this will traverse the object tree, and any objects containing user
// data key `a-entity` will be turned into separate sub-entities. The user data
// value for `a-entity` will be set as the attributes.
//
// For instance, say you export a model with the following kind of structure
// from Blender (remembering to check "Include → Custom Properties"!):
//
//```
//    - Empty1
//      Custom Properties:
//        name: a-entity
//        value: physx-body="type: dynamic"
//      Children:
//        - Mesh1
//          Custom Properties:
//             name: a-entity
//             value: physx-material="density: 30" class="clickable"
//          Children:
//            - Mesh2
//        - Mesh3
//           Custom Properties:
//             name: a-entity
//             value: physx-material="density: 100" physx-contact-sound="src: #boom"
//```
//
// ![Screenshot showing the structure in Blender](./static/images/blenderentities.png)
//
// This will turn into the following HTML (with `setId` set to `true`):
//
//```
// <a-entity id="Empty1" physx-body="type: dynamic"> <!-- getObject3D('mesh') returns Empty1 with no children -->
//    <a-entity id="Mesh1" physx-material="density: 30" class="clickable"></a-entity> <!-- getObject3D('mesh') returns Mesh1 with Mesh2 as a child-->
//    <a-entity id="Mesh3" physx-material="density: 100" physx-contact-sound="src: #boom"></a-entity> <!-- getObject3D('mesh') returns Mesh3 with no child-->
// </a-entity>
//```
//
// **Experimental Blender Plugin**
//
// ![Screenshot showing experimental blender plugin](./static/images/blenderplugin.png)
//
// I've written a small plugin for [Blender](https://www.blender.org/) which can
// automatically set up a lot of the common properties for use in this physics
// system. _Note that it is super experimental and under development. Make a
// backup before using._
//
// **Download Blender Plugin:** <a id="blender-plugin-link">vartiste_toolkit_entity_helper.zip (v0.2.0)</a>
//
// **GLB Viewer**
//
// You can test your `gltf-entities` enabled glb files locally by dragging and
// dropping them into this [web viewer](https://fascinated-hip-period.glitch.me/viewer.html)
AFRAME.registerComponent('gltf-entities', {
  dependencies: ['gltf-model'],
  schema: {
    // If true, will set created element's id based on the gltf object name
    setId: {default: false},
    // If `setId` is true, this will be prepended to the gltf object name when setting the element id
    idPrefix: {default: ""},

    // Automatically make entities clickable and propogate the grab (for use with [`manipulator`](#manipulator))
    autoPropogateGrab: {default: true},

    // Array of attribute names that should be copied from this entitiy to any new created entitity
    copyAttributes: {type: 'array'},

    // A list of names of attributes that are allowed to be set. Ignored if empty.
    allowedAttributes: {type: 'array'},
  },
  events: {
    'model-loaded': function(e) {
      this.setupEntities()
    }
  },
  init() {},
  setupEntities() {
    let root = this.el.getObject3D('mesh')
    if (!root) return;

    this.setupObject(root, this.el)
  },
  setupObject(obj3d, currentRootEl)
  {
    if (obj3d.userData['a-entity']) {
      let el = document.createElement('a-entity')
      let attrs = obj3d.userData['a-entity']

      // sanitize
      el.innerHTML = attrs
      el.innerHTML = `<a-entity ${el.innerText}></a-entity>`

      el = el.children[0]

      if (this.data.allowedAttributes.length)
      {
        for (let attr of el.attributes)
        {
          if (!this.data.allowedAttributes.includes(attr.name))
          {
            el.removeAttribute(attr.name)
          }
        }
      }

      if (this.data.setId && obj3d.name)
      {
        el.id = `${this.data.idPrefix}${obj3d.name}`
      }

      for (let attribute of this.data.copyAttributes)
      {
        if (this.el.hasAttribute(attribute))
        {
          el.setAttribute(attribute, this.el.getAttribute(attribute))
        }
      }

      if (this.data.autoPropogateGrab && this.el.classList.contains("clickable"))
      {
        el.setAttribute('propogate-grab', "")
        el.classList.add("clickable")
      }

      currentRootEl.append(el)
      Util.whenLoaded(el, () => {
        el.setObject3D('mesh', obj3d)
        obj3d.updateMatrix()
        Util.applyMatrix(obj3d.matrix, el.object3D)
        obj3d.matrix.identity()
        Util.applyMatrix(obj3d.matrix, obj3d)
      })
      currentRootEl = el
    }

    for (let child of obj3d.children)
    {
      this.setupObject(child, currentRootEl)
    }
  }
})

