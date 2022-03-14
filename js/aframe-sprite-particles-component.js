// Copyright 2018 harlyq
// License MIT

(function() {

  const TIME_PARAM = 0 // [0].x
  const ID_PARAM = 1 // [0].y
  const RADIAL_X_PARAM = 2 // [0].z
  const DURATION_PARAM = 3 // [0].w
  const SPAWN_TYPE_PARAM = 4 // [1].x
  const SPAWN_RATE_PARAM = 5 // [1].y
  const SEED_PARAM = 6 // [1].z
  const VERTEX_COUNT_PARAM = 7 // [1].w
  const PARTICLE_SIZE_PARAM =  8 // [2].x
  const USE_PERSPECTIVE_PARAM = 9 // [2].y
  const DIRECTION_PARAM = 10 // [2].z
  const DRAG_PARAM = 11 // [2].w
  const TRAIL_INTERVAL_PARAM = 12 // [3].x
  const PARTICLE_COUNT_PARAM = 13 // [3].y
  const TRAIL_COUNT_PARAM = 14 // [3].z
  const SCREEN_DEPTH_OFFSET_PARAM = 15 // [3].w
  const RIBBON_WIDTH_PARAM = 16 // [4].x
  const RIBBON_UV_MULTIPLIER_PARAM = 17 // [4].y
  const RIBBON_UV_TYPE_PARAM = 18 // [4].z
  const RADIAL_Y_PARAM = 19 // [4].w
  const PARAMS_LENGTH = 5 // 0..4

  const MODEL_MESH = "mesh"
  const VERTS_PER_RIBBON = 2

  const RANDOM_REPEAT_COUNT = 131072 // random numbers will start repeating after this number of particles

  const degToRad = THREE.Math.degToRad

  const ATTR_TO_DEFINES = {
    acceleration: "USE_PARTICLE_ACCELERATION",
    angularAcceleration: "USE_PARTICLE_ANGULAR_ACCELERATION",
    angularVelocity: "USE_PARTICLE_ANGULAR_VELOCITY",
    color: "USE_PARTICLE_COLOR",
    textureFrame: "USE_PARTICLE_FRAMES",
    textureCount: "USE_PARTICLE_FRAMES",
    textureLoop: "USE_PARTICLE_FRAMES",
    position: "USE_PARTICLE_OFFSET",
    opacity: "USE_PARTICLE_OPACITY",
    radialAcceleration: "USE_PARTICLE_RADIAL_ACCELERATION",
    radialPosition: "USE_PARTICLE_RADIAL_OFFSET",
    radialVelocity: "USE_PARTICLE_RADIAL_VELOCITY",
    scale: "USE_PARTICLE_SCALE",
    velocity: "USE_PARTICLE_VELOCITY",
    orbitalVelocity: "USE_PARTICLE_ORBITAL",
    orbitalAcceleration: "USE_PARTICLE_ORBITAL",
    drag: "USE_PARTICLE_DRAG",
    destinationWeight: "USE_PARTICLE_DESTINATION",
    screenDepthOffset: "USE_PARTICLE_SCREEN_DEPTH_OFFSET",
    source: "USE_PARTICLE_SOURCE",
    model: "USE_PARTICLE_SOURCE",
  }

  const UV_TYPE_STRINGS = ["overtime", "interval"]
  const PARTICLE_ORDER_STRINGS = ["newest", "oldest", "original"]
  const AXES_NAMES = ["x", "y", "z"]

  // Bring all sub-array elements into a single array e.g. [[1,2],[[3],4],5] => [1,2,3,4,5]
  const flattenDeep = arr1 => arr1.reduce((acc, val) => Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), [])

  // Convert a vector range string into an array of elements. def defines the default elements for each vector
  const parseVecRange = (str, def) => {
    let parts = str.split("..").map(a => a.trim().split(" ").map(b => {
      const num = Number(b)
      return isNaN(num) ? undefined : num
    }))
    if (parts.length === 1) parts[1] = parts[0] // if there is no second part then copy the first part
    parts.length = 2
    return flattenDeep( parts.map(a => def.map((x,i) => typeof a[i] === "undefined" ? x : a[i])) )
  }

  // parse a ("," separated) list of vector range elements
  const parseVecRangeArray = (str, def) => {
    return flattenDeep( str.split(",").map(a => parseVecRange(a, def)) )
  }

  // parse a ("," separated) list of color range elements
  const parseColorRangeArray = (str) => {
    return flattenDeep( str.split(",").map(a => { 
      let parts = a.split("..")
      if (parts.length === 1) parts[1] = parts[0] // if there is no second part then copy the first part
      parts.length = 2
      return parts.map(b => new THREE.Color(b.trim())) 
    }) )
  }

  const toLowerCase = x => x.toLowerCase()

  // console.assert(AFRAME.utils.deepEqual(parseVecRange("", [1,2,3]), [1,2,3,1,2,3]))
  // console.assert(AFRAME.utils.deepEqual(parseVecRange("5", [1,2,3]), [5,2,3,5,2,3]))
  // console.assert(AFRAME.utils.deepEqual(parseVecRange("5 6", [1,2,3]), [5,6,3,5,6,3]))
  // console.assert(AFRAME.utils.deepEqual(parseVecRange("5 6 7 8", [1,2,3]), [5,6,7,5,6,7]))
  // console.assert(AFRAME.utils.deepEqual(parseVecRange("8 9..10", [1,2,3]), [8,9,3,10,2,3]))
  // console.assert(AFRAME.utils.deepEqual(parseVecRange("..5 6 7", [1,2,3]), [1,2,3,5,6,7]))
  // console.assert(AFRAME.utils.deepEqual(parseVecRange("2 3 4..5 6 7", [1,2,3]), [2,3,4,5,6,7]))
  // console.assert(AFRAME.utils.deepEqual(parseVecRange("5 6 7..", [1,2,3]), [5,6,7,1,2,3]))

  // console.assert(AFRAME.utils.deepEqual(parseVecRangeArray("5 6 7..,9..10 11 12", [1,2,3]), [5,6,7,1,2,3,9,2,3,10,11,12]))
  // console.assert(AFRAME.utils.deepEqual(parseVecRangeArray("1,2,,,3", [10]), [1,1,2,2,10,10,10,10,3,3]))

  // console.assert(AFRAME.utils.deepEqual(parseColorRangeArray("black..red,blue,,#ff0..#00ffaa").map(a => a.getHexString()), ["000000","ff0000","0000ff","0000ff","ffffff","ffffff","ffff00","00ffaa"]))

  let WHITE_TEXTURE = new THREE.DataTexture(new Uint8Array(4).fill(255), 1, 1, THREE.RGBAFormat)
  WHITE_TEXTURE.needsUpdate = true

  const BLENDING_MAP = {
    "none": THREE.NoBlending,
    "normal": THREE.NormalBlending,
    "additive": THREE.AdditiveBlending,
    "subtractive": THREE.SubtractiveBlending,
    "multiply": THREE.MultiplyBlending,
  }

  const SIDE_MAP = {
    "double": THREE.DoubleSide,
    "front": THREE.FrontSide,
    "back": THREE.BackSide,
  }

  AFRAME.registerComponent("sprite-particles", {
    schema: {
      enableInEditor: { default: false },
      texture: { type: "map" },
      delay: { default: 0 },
      duration: { default: -1 },
      spawnType: { default: "continuous", oneOf: ["continuous", "burst"], parse: toLowerCase },
      spawnRate: { default: 10 },
      source: { type: "selector" },
      textureFrame: { type: "vec2", default: {x: 1, y: 1} },
      textureCount: { type: "int", default: 0 },
      textureLoop: { default: 1 },
      randomizeFrames: { default: false },
      trailInterval: { default: 0 },
      trailLifeTime: { default: "0" },
      trailType: { default: "particle", oneOf: ["particle", "ribbon", "ribbon3d"] },
      ribbonWidth: { default: 1, },
      ribbonShape: { default: "flat", oneOf: ["flat", "taperin", "taperout", "taper"], parse: toLowerCase },
      ribbonUVType: { default: "overtime", oneOf: UV_TYPE_STRINGS, parse: toLowerCase },
      emitterColor: { type: "color" },

      lifeTime: { default: "1" },
      position: { default: "0 0 0" },
      velocity: { default: "0 0 0" },
      acceleration: { default: "0 0 0" },
      radialType: { default: "circle", oneOf: ["circle", "sphere", "circlexy", "circlexz"], parse: toLowerCase },
      radialPosition: { default: "0" },
      radialVelocity: { default: "0" },
      radialAcceleration: { default: "0" },
      angularVelocity: { default: "0 0 0" },
      angularAcceleration: { default: "0 0 0" },
      orbitalVelocity: { default: "0" },
      orbitalAcceleration: { default: "0" },
      scale: { default: "1" },
      color: { default: "white", parse: toLowerCase },
      rotation: { default: "0" }, // if rotating textureFrames important to have enough space so overlapping parts of frames are blank (circle of sqrt(2) around the center of the frame will be viewable while rotating)
      opacity: { default: "1" },
      velocityScale: { default: 0 },
      velocityScaleMinMax: { type: "vec2", default: {x: 0, y: 3} },
      drag: { default: 0 },
      destination: { type: "selector" },
      destinationOffset: { default: "0 0 0" },
      destinationWeight: { default: "0" },

      enable: { default: true },
      emitterTime: { default: 0 },
      model: { type: "selector" },
      modelFill: { default: "triangle", oneOf: ["triangle", "edge", "vertex"], parse: toLowerCase },
      direction: { default: "forward", oneOf: ["forward", "backward"], parse: toLowerCase },
      particleOrder: { default: "original", oneOf: PARTICLE_ORDER_STRINGS },
      ribbonUVMultiplier: { default: 1 },
      materialSide: { default: "front", oneOf: ["double", "front", "back"], parse: toLowerCase },
      screenDepthOffset: { default: 0 },
      alphaTest: { default: 0 },
      fog: { default: true },
      depthWrite: { default: false },
      depthTest: { default: true },
      blending: { default: "normal", oneOf: ["none", "normal", "additive", "subtractive", "multiply"], parse: toLowerCase },
      transparent: { default: true },
      particleSize: { default: 100 },
      usePerspective: { default: true },
      seed: { type: "number", default: -1 },
      overTimeSlots: { type: "int", default: 5 },
      frustumCulled: { default: true },
      editorObject: { default: true },
    },
    multiple: true,
    help: "https://github.com/harlyq/aframe-sprite-particles-component",

    init() {
      this.pauseTick = this.pauseTick.bind(this)
      this.handleObject3DSet = this.handleObject3DSet.bind(this)

      this.count = 0
      this.trailCount = 0
      this.overTimeArrayLength = 0
      this.emitterTime = 0
      this.delayTime = 0
      this.lifeTime = [1,1]
      this.trailLifeTime = [0,0] // if 0, then use this.lifeTime

      // this.useTransparent = false
      this.textureFrames = new Float32Array(4) // xy is TextureFrame, z is TextureCount, w is TextureLoop
      this.offset = new Float32Array(2*4).fill(0) // xyz is position, w is radialPosition
      this.velocity = new Float32Array(2*4).fill(0) // xyz is velocity, w is radialVelocity
      this.acceleration = new Float32Array(2*4).fill(0) // xyz is acceleration, w is radialAcceleration
      this.angularVelocity = new Float32Array(2*4).fill(0) // xyz is angularVelocity, w is lifeTime
      this.angularAcceleration = new Float32Array(2*4).fill(0) // xyz is angularAcceleration
      this.orbital = new Float32Array(2*2).fill(0) // x is orbitalVelocity, y is orbitalAcceleration
      this.colorOverTime // color is xyz and opacity is w. created in update()
      this.rotationScaleOverTime // x is rotation, y is scale. created in update()
      this.params = new Float32Array(5*4).fill(0) // see ..._PARAM constants
      this.velocityScale = new Float32Array(3).fill(0) // x is velocityScale, y is velocityScaleMinMax.x and z is velocityScaleMinMax.y
      this.emitterColor = new THREE.Vector3() // use vec3 for color
      this.destination = new Float32Array(2*4).fill(0) // range value, xyz is destinationEntity.position + destinationOffset, w is destinationWeight
      this.destinationOffset // parsed value for destinationOffset, this will be blended into destination
      this.destinationWeight // parsed value for destinationWeight
      this.nextID = 0
      this.nextTime = 0
      this.numDisabled = 0
      this.numEnabled = 0
      this.startDisabled = !this.data.enable // if we start disabled then the tick is disabled, until the component is enabled
      this.manageIDs = false

      this.params[ID_PARAM] = -1 // unmanaged IDs
    },

    remove() {
      if (this.mesh) {
        this.el.removeObject3D(this.mesh.name)
      }
      if (data.model) {
        data.model.removeEventListener("object3dset", this.handleObject3DSet)
      }
    },

    update(oldData) {
      const data = this.data
      
      let boundsDirty = data.particleSize !== oldData.particleSize
      let overTimeDirty = false

      // can only change overTimeSlots while paused, as it will rebuild the shader (see updateDefines())
      if (data.overTimeSlots !== oldData.overTimeSlots && !this.isPlaying) {
        this.overTimeArrayLength = this.data.overTimeSlots*2 + 1 // each slot represents 2 glsl array elements pluse one element for the length info
        this.colorOverTime = new Float32Array(4*this.overTimeArrayLength).fill(0) // color is xyz and opacity is w
        this.rotationScaleOverTime = new Float32Array(2*this.overTimeArrayLength).fill(0) // x is rotation, y is scale
        overTimeDirty = true
      }

      this.params[PARTICLE_SIZE_PARAM] = data.particleSize
      this.params[USE_PERSPECTIVE_PARAM] = data.usePerspective ? 1 : 0
      this.params[DIRECTION_PARAM] = data.direction === "forward" ? 0 : 1
      this.params[DRAG_PARAM] = THREE.Math.clamp(data.drag, 0, 1)
      this.params[SCREEN_DEPTH_OFFSET_PARAM] = data.screenDepthOffset*1e-5
      this.params[RIBBON_WIDTH_PARAM] = data.ribbonWidth
      this.params[RIBBON_UV_MULTIPLIER_PARAM] = data.ribbonUVMultiplier

      this.textureFrames[0] = data.textureFrame.x
      this.textureFrames[1] = data.textureFrame.y
      this.textureFrames[2] = data.textureCount > 0 ? data.textureCount : data.textureFrame.x * data.textureFrame.y
      this.textureFrames[3] = data.textureLoop

      this.velocityScale[0] = data.velocityScale
      this.velocityScale[1] = data.velocityScaleMinMax.x
      this.velocityScale[2] = data.velocityScaleMinMax.y

      if (this.material) {
        this.material.alphaTest = data.alphaTest
        this.material.depthTest = data.depthTest
        this.material.depthWrite = data.depthWrite
        this.material.blending = BLENDING_MAP[data.blending]
        this.material.fog = data.fog
      }

      if (data.seed !== oldData.seed) {
        this.seed = data.seed
        this.params[SEED_PARAM] = data.seed >= 0 ? data.seed : Math.random()
      }

      if (data.ribbonUVType !== oldData.ribbonUVType) {
        this.params[RIBBON_UV_TYPE_PARAM] = UV_TYPE_STRINGS.indexOf(data.ribbonUVType) === -1 ? 0 : UV_TYPE_STRINGS.indexOf(data.ribbonUVType)
      }

      if (data.radialType !== oldData.radialType) {
        this.params[RADIAL_X_PARAM] = ["sphere", "circlexy", "circle"].includes(data.radialType) ? 1 : 0
        this.params[RADIAL_Y_PARAM] = ["sphere", "circlexz"].includes(data.radialType) ? 1 : 0
      }

      if (this.mesh && data.frustumCulled !== oldData.frustumCulled) {
        this.mesh.frustumCulled = data.frustumCulled
      }

      if (data.emitterColor !== oldData.emitterColor) {
        const col = new THREE.Color(data.emitterColor)
        this.emitterColor.set(col.r, col.g, col.b)
      }

      if (data.position !== oldData.position || data.radialPosition !== oldData.radialPosition) {
        this.updateVec4XYZRange(data.position, "offset")
        this.updateVec4WRange(data.radialPosition, [0], "offset")
        boundsDirty = true
      }

      if (data.velocity !== oldData.velocity || data.radialVelocity !== oldData.radialVelocity) {
        this.updateVec4XYZRange(data.velocity, "velocity")
        this.updateVec4WRange(data.radialVelocity, [0], "velocity")
        boundsDirty = true
      }

      if (data.acceleration !== oldData.acceleration || data.radialAcceleration !== oldData.radialAcceleration) {
        this.updateVec4XYZRange(data.acceleration, "acceleration")
        this.updateVec4WRange(data.radialAcceleration, [0], "acceleration")
        boundsDirty = true
      }

      if (data.rotation !== oldData.rotation || data.scale !== oldData.scale || overTimeDirty) {
        this.updateRotationScaleOverTime()
        boundsDirty = true
      }

      if (data.color !== oldData.color || data.opacity !== oldData.opacity || overTimeDirty) {
        this.updateColorOverTime()
      }

      if (data.lifeTime !== oldData.lifeTime) {
        this.lifeTime = this.updateVec4WRange(data.lifeTime, [1], "angularVelocity")
      }

      if (data.angularVelocity !== oldData.angularVelocity) {
        this.updateAngularVec4XYZRange(data.angularVelocity, "angularVelocity")
      }

      if (data.trailLifeTime !== oldData.trailLifeTime) {
        // if trailLifeTime is 0 then use the lifeTime values, and always ensure that trailLifeTime never exceeds the lifeTime
        this.trailLifeTime = parseVecRange(data.trailLifeTime, [0]).map((x,i) => x > 0 ? x : this.lifeTime[i])
        this["angularAcceleration"][3] = this.trailLifeTime[0] // angularAcceleration[0].w
        this["angularAcceleration"][7] = this.trailLifeTime[1] // angularAcceleration[1].w
      }

      if (data.angularAcceleration !== oldData.angularAcceleration) {
        this.updateAngularVec4XYZRange(data.angularAcceleration, "angularAcceleration")
      }

      if (data.orbitalVelocity !== oldData.orbitalVelocity) {
        this.updateAngularVec2PartRange(data.orbitalVelocity, [0], "orbital", 0) // x part
      }

      if (data.orbitalAcceleration !== oldData.orbitalAcceleration) {
        this.updateAngularVec2PartRange(data.orbitalAcceleration, [0], "orbital", 1) // y part
      }

      if (data.destinationOffset !== oldData.destinationOffset) {
        this.destinationOffset = this.updateVec4XYZRange(data.destinationOffset, "destination")
      }

      if (data.destinationWeight !== oldData.destinationWeight) {
        this.destinationWeight = this.updateVec4WRange(data.destinationWeight, [0], "destination")
      }

      if (data.duration !== oldData.duration || data.delay !== oldData.delay || data.emitterTime !== oldData.emitterTime) {
        // restart the particles
        this.params[DURATION_PARAM] = data.duration
        this.emitterTime = data.emitterTime
        this.delayTime = data.delay
      }

      if (data.spawnType !== oldData.spawnType || data.spawnRate !== oldData.spawnRate || data.lifeTime !== oldData.lifeTime || data.trailInterval !== oldData.trailInterval) {
        const maxParticleLifeTime = this.lifeTime[1]
        const maxTrailLifeTime = data.trailInterval > 0 ? this.trailLifeTime[1] : 0
        const maxAge = maxParticleLifeTime + maxTrailLifeTime
        const particleCount = Math.max( 1, Math.ceil(maxAge*data.spawnRate) )
        this.trailCount = 1 + ( data.trailInterval > 0 ? Math.ceil( Math.min(maxTrailLifeTime, maxParticleLifeTime)/data.trailInterval ) : 0 ) // +1 because the trail includes the lead particle

        if (this.isRibbon()) { 
          this.trailCount++ // short ribbons will need an extra vert so they can bend around an interval, but why the extra vert for long ribbons?
          this.count = particleCount * this.trailCount * VERTS_PER_RIBBON
        } else {
          this.count = particleCount * this.trailCount
        }

        this.params[SPAWN_TYPE_PARAM] = data.spawnType === "burst" ? 0 : 1
        this.params[SPAWN_RATE_PARAM] = data.spawnRate
        this.params[VERTEX_COUNT_PARAM] = this.count
        this.params[PARTICLE_COUNT_PARAM] = particleCount
        this.params[TRAIL_INTERVAL_PARAM] = data.trailInterval
        this.params[TRAIL_COUNT_PARAM] = this.trailCount
        this.updateAttributes()
      }

      if (data.enableInEditor !== oldData.enableInEditor) {
        this.enablePauseTick(data.enableInEditor)
      }

      if (data.enable && this.startDisabled) {
        this.startDisabled = false
      }

      if (data.model !== oldData.model && data.model && "getObject3D" in data.model) {
        if (oldData.model) { oldData.model.removeEventListener("object3dset", this.handleObject3DSet) }
        this.updateModelMesh(data.model.getObject3D(MODEL_MESH))
        if (data.model) { data.model.addEventListener("object3dset", this.handleObject3DSet) }
      }

      if (data.particleOrder !== "original" && data.source) {
        console.warn(`changing particleOrder to 'original' (was '${data.particleOrder}'), because particles use a source`)
      }

      if (!this.mesh) {
        this.createMesh()
      } else {
        this.updateDefines()
      }

      if (data.materialSide !== oldData.materialSide) {
        this.material.side = SIDE_MAP[data.materialSide]
      }

      if (boundsDirty) {
        this.updateBounds() // call after createMesh()
      }

      if (this.paused && data.editorObject !== oldData.editorObject) {
        this.enableEditorObject(data.editorObject)
      }

      // for managedIDs the CPU defines the ID - and we want to avoid this if at all possible
      // once managed, always managed
      this.manageIDs = this.manageIDs || !data.enable || data.source || typeof this.el.getDOMAttribute(this.attrName).enable !== "undefined" || data.model || data.delay > 0

      // call loadTexture() after createMesh() to ensure that the material is available to accept the texture
      if (data.texture !== oldData.texture) {
        this.loadTexture(data.texture)
      }
    },

    tick(time, deltaTime) {
      const data = this.data

      if (this.startDisabled) { return }

      if (deltaTime > 100) deltaTime = 100 // ignore long pauses
      const dt = deltaTime/1000 // dt is in seconds

      if (data.enable) { this.delayTime -= dt }
      if (this.delayTime >= 0) { return }

      if (!data.model || this.modelVertices) {
        this.emitterTime += dt
        this.params[TIME_PARAM] = this.emitterTime
  
        if (this.geometry && this.manageIDs) {
          this.updateWorldTransform(this.emitterTime)
        } else {
          this.params[ID_PARAM] = -1
        }

        if (data.destination && data.destination.object3D && (this.destinationWeight[0] > 0 || this.destinationWeight[1] > 0)) {
          this.updateDestinationEntity()
        }
      }
    },

    pause() {
      this.paused = true
      this.enablePauseTick(this.data.enableInEditor)
      this.enableEditorObject(this.data.editorObject)
    },

    play() {
      this.paused = false
      this.enableEditorObject(false)
      this.enablePauseTick(false)
    },

    enablePauseTick(enable) {
      if (enable) {
        this.pauseRAF = requestAnimationFrame(this.pauseTick)
      } else {
        cancelAnimationFrame(this.pauseRAF)
      }
    },

    pauseTick() {
      this.tick(0, 16) // time is not used
      this.enablePauseTick(true)
    },

    handleObject3DSet(event) {
      if (event.target === this.data.model && event.detail.type === MODEL_MESH) {
        this.updateModelMesh(this.data.model.getObject3D(MODEL_MESH))
      }
    },

    loadTexture(filename) {
      if (filename) {
        let materialSystem = this.el.sceneEl.systems["material"]
        materialSystem.loadTexture(filename, {src: filename}, (texture) => {
          if (this.isRibbon()) {
            texture.wrapS = THREE.RepeatWrapping // needed by ribbonUVMultipler
          }
          this.material.uniforms.map.value = texture          
        })
      } else {
        this.material.uniforms.map.value = WHITE_TEXTURE
      }
    },

    isRibbon() {
      return this.data.trailInterval > 0 && this.data.trailType !== "particle"
    },

    createMesh() {
      const data = this.data

      this.geometry = new THREE.BufferGeometry()

      this.updateAttributes()

      this.material = new THREE.ShaderMaterial({
        uniforms: {
          map: { type: "t", value: WHITE_TEXTURE },
          textureFrames: { value: this.textureFrames },

          params: { value: this.params },
          offset: { value: this.offset },
          velocity: { value: this.velocity },
          acceleration: { value: this.acceleration },
          angularVelocity: { value: this.angularVelocity },
          angularAcceleration: { value: this.angularAcceleration },
          orbital: { value: this.orbital },
          colorOverTime: { value: this.colorOverTime },
          rotationScaleOverTime: { value: this.rotationScaleOverTime },
          velocityScale: { value: this.velocityScale },
          emitterColor: { value: this.emitterColor },
          destination: { value: this.destination },

          fogDensity: { value: 0.00025 },
          fogNear: { value: 1 },
          fogFar: { value: 2000 },
          fogColor: { value: new THREE.Color( 0xffffff ) }
        },

        fragmentShader: particleFragmentShader,
        vertexShader: particleVertexShader,

        transparent: data.transparent,
        alphaTest: data.alphaTest,
        blending: BLENDING_MAP[data.blending],
        fog: data.fog,
        depthWrite: data.depthWrite,
        depthTest: data.depthTest,
        defines: {}, // updated in updateDefines()
      })

      this.updateDefines()

      if (this.isRibbon()) {
        // // this.material.side = THREE.DoubleSide
        // this.material.side = THREE.FrontSide
        this.mesh = new THREE.Mesh(this.geometry, [this.material]) // geometry groups need an array of materials
        // this.mesh.drawMode = THREE.TriangleStripDrawMode
      } else {
        this.mesh = new THREE.Points(this.geometry, this.material)
      }

      this.mesh.frustumCulled = data.frustumCulled
      this.mesh.name = this.attrName
      this.material.name = this.mesh.name
      this.el.setObject3D(this.mesh.name, this.mesh)
    },

    updateColorOverTime() {
      let color = parseColorRangeArray(this.data.color)
      let opacity = parseVecRangeArray(this.data.opacity, [1])

      const maxSlots = this.data.overTimeSlots
      if (color.length > maxSlots*2) color.length = maxSlots*2
      if (opacity.length > maxSlots*2) opacity.length = maxSlots*2

      this.colorOverTime.fill(0)

      // first colorOverTime block contains length information
      // divide by 2 because each array contains min and max values
      this.colorOverTime[0] = color.length/2  // glsl colorOverTime[0].x
      this.colorOverTime[1] = opacity.length/2 // glsl colorOverTime[0].y

      // set k to 4 because the first vec4 of colorOverTime is use for the length params
      let n = color.length
      for (let i = 0, k = 4; i < n; i++, k += 4) {
        let col = color[i]
        this.colorOverTime[k] = col.r // glsl colorOverTime[1..].x
        this.colorOverTime[k+1] = col.g // glsl colorOverTime[1..].y
        this.colorOverTime[k+2] = col.b // glsl colorOverTime[1..].z
      }

      n = opacity.length
      for (let i = 0, k = 4; i < n; i++, k += 4) {
        let alpha = opacity[i]
        this.colorOverTime[k+3] = alpha // glsl colorOverTime[1..].w
        // this.useTransparent = this.useTransparent || alpha < 1
      }
    },

    updateRotationScaleOverTime() {
      const maxSlots = this.data.overTimeSlots
      let rotation = parseVecRangeArray(this.data.rotation, [0])
      let scale = parseVecRangeArray(this.data.scale, [1])


      if (rotation.length > maxSlots*2) rotation.length = maxSlots*2 // 2 rotations per range
      if (scale.length > maxSlots*2) scale.length = maxSlots*2 // 2 scales per range

      // first vec4 contains the lengths of the rotation and scale vectors
      this.rotationScaleOverTime.fill(0)
      this.rotationScaleOverTime[0] = rotation.length/2
      this.rotationScaleOverTime[1] = scale.length/2

      // set k to 2 because the first vec2 of rotationScaleOverTime is use for the length params
      // update i by 1 becase rotation is 1 numbers per vector, and k by 2 because rotationScaleOverTime is 2 numbers per vector
      let n = rotation.length
      for (let i = 0, k = 2; i < n; i ++, k += 2) {
        this.rotationScaleOverTime[k] = degToRad(rotation[i]) // glsl rotationScaleOverTime[1..].x
      }

      n = scale.length
      for (let i = 0, k = 2; i < n; i++, k += 2) {
        this.rotationScaleOverTime[k+1] = scale[i] // glsl rotationScaleOverTime[1..].y
      }
    },

    updateVec4XYZRange(vecData, uniformAttr) {
      const vecRange = parseVecRange(vecData, [0,0,0])
      for (let i = 0, j = 0; i < vecRange.length; ) {
        this[uniformAttr][j++] = vecRange[i++] // x
        this[uniformAttr][j++] = vecRange[i++] // y
        this[uniformAttr][j++] = vecRange[i++] // z
        j++ // skip the w
      }
      return vecRange
    },

    updateAngularVec4XYZRange(vecData, uniformAttr) {
      const vecRange = parseVecRange(vecData, [0,0,0])
      for (let i = 0, j = 0; i < vecRange.length; ) {
        this[uniformAttr][j++] = degToRad(vecRange[i++]) // x
        this[uniformAttr][j++] = degToRad(vecRange[i++]) // y
        this[uniformAttr][j++] = degToRad(vecRange[i++]) // z
        j++ // skip the w
      }
    },

    updateAngularVec2PartRange(vecData, def, uniformAttr, part) {
      const vecRange = parseVecRange(vecData, def)
      this[uniformAttr][part] = degToRad(vecRange[0])
      this[uniformAttr][part + 2] = degToRad(vecRange[1])
    },

    // update just the w component
    updateVec4WRange(floatData, def, uniformAttr) {
      let floatRange = parseVecRange(floatData, def)
      this[uniformAttr][3] = floatRange[0] // floatData value is packed into the 4th part of each vec4
      this[uniformAttr][7] = floatRange[1]

      return floatRange
    },

    updateBounds() {
      const data = this.data
      let maxAge = Math.max(this.lifeTime[0], this.lifeTime[1])
      const STRIDE = 4
      let extent = [new Array(STRIDE), new Array(STRIDE)] // extent[0] = min values, extent[1] = max values

      if (data.drag > 0) {
        maxAge = maxAge*(1 - .5*data.drag)
      }

      // Use offset, velocity and acceleration to determine the extents for the particles
      for (let j = 0; j < 2; j++) { // index for extent
        const compare = j === 0 ? Math.min: Math.max

        for (let i = 0; i < STRIDE; i++) { // 0 = x, 1 = y, 2 = z, 3 = radial
          const offset = compare(this.offset[i], this.offset[i + STRIDE])
          const velocity = compare(this.velocity[i], this.velocity[i + STRIDE])
          const acceleration = compare(this.acceleration[i], this.acceleration[i + STRIDE])
  
          // extent at time tmax
          extent[j][i] = offset + (velocity + 0.5 * acceleration * maxAge) * maxAge
  
          // extent at time t0
          extent[j][i] = compare(extent[j][i], offset)
  
          // extent at turning point
          const turningPoint = -velocity/acceleration
          if (turningPoint > 0 && turningPoint < maxAge) {
            extent[j][i] = compare(extent[j][i], offset - 0.5*velocity*velocity/acceleration)
          }
        }
      }

      // include the bounds the base model
      if (this.modelBounds) {
        extent[0][0] += this.modelBounds.min.x
        extent[0][1] += this.modelBounds.min.y
        extent[0][2] += this.modelBounds.min.z
        extent[1][0] += this.modelBounds.max.x
        extent[1][1] += this.modelBounds.max.y
        extent[1][2] += this.modelBounds.max.z
     }

      // apply the radial extents to the XYZ extents
      const domAttrs = this.el.getDOMAttribute(this.attrName)
      const maxScale = this.rotationScaleOverTime.reduce((max, x, i) => (i & 1) ? Math.max(max, x) : max, 0) // scale is every second number
      const maxRadial = Math.max(Math.abs(extent[0][3]), Math.abs(extent[1][3])) + data.particleSize*0.00045*maxScale
      const isSphere = data.radialType === "sphere" || domAttrs.angularVelocity || domAttrs.angularAcceleration || domAttrs.orbitalVelocity || domAttrs.orbitalAcceleration

      extent[0][0] -= maxRadial
      extent[0][1] -= maxRadial
      extent[0][2] -= isSphere ? maxRadial : 0
      extent[1][0] += maxRadial
      extent[1][1] += maxRadial
      extent[1][2] += isSphere ? maxRadial : 0

      // discard the radial element
      extent[0].length = 3
      extent[0].length = 3

      // TODO include destination

      const maxR = Math.max(...extent[0].map(Math.abs), ...extent[1].map(Math.abs))
      if (!this.geometry.boundingSphere) {
        this.geometry.boundingSphere = new THREE.Sphere()
      }
      this.geometry.boundingSphere.radius = maxR

      if (!this.geometry.boundingBox) {
        this.geometry.boundingBox = new THREE.Box3()
      }
      this.geometry.boundingBox.min.set(...extent[0])
      this.geometry.boundingBox.max.set(...extent[1])

      const existingMesh = this.el.getObject3D("mesh")

      // update any bounding boxes to the new bounds
      if (existingMesh && existingMesh.isParticlesEditorObject) {
        this.enableEditorObject(true)
      }
    },

    updateDestinationEntity: (function() {
      let dest = new THREE.Vector3()
      let selfPos = new THREE.Vector3()

      return function updateDestinationEntity() {
        const data = this.data

        data.destination.object3D.getWorldPosition(dest)
        this.el.object3D.getWorldPosition(selfPos)
        dest.sub(selfPos)

        // this.destination is a vec4, this.destinationOffset is a vec3
        for (let i = 0, n = AXES_NAMES.length; i < n; i++) {
          this.destination[i] = dest[AXES_NAMES[i]] + this.destinationOffset[i] // min part of range
          this.destination[i + 4] = dest[AXES_NAMES[i]] + this.destinationOffset[i + 3] // max part of range
        }
      }
    })(),

    enableEditorObject(enable) {
      const existingMesh = this.el.getObject3D("mesh")

      if (enable && (!existingMesh || existingMesh.isParticlesEditorObject)) {
        const BOX_SIZE = 0.25
        const maxBound = new THREE.Vector3(BOX_SIZE, BOX_SIZE, BOX_SIZE).max(this.geometry.boundingBox.max)
        const minBound = new THREE.Vector3(-BOX_SIZE, -BOX_SIZE, -BOX_SIZE).min(this.geometry.boundingBox.min)
        let box3 = new THREE.Box3(minBound, maxBound)
        let box3Mesh = new THREE.Box3Helper(box3, 0x808000)
        box3Mesh.isParticlesEditorObject = true
        box3Mesh.visible = false
        this.el.setObject3D("mesh", box3Mesh) // the inspector puts a bounding box around the "mesh" object
      } else if (!enable && existingMesh && existingMesh.isParticlesEditorObject) {
        this.el.removeObject3D("mesh")
      }
    },

    updateAttributes() {
      if (this.geometry) {
        const n = this.count

        let vertexIDs = new Float32Array(n)
        if (this.startDisabled || this.data.delay > 0 || this.data.model) {
          vertexIDs.fill(-1)

          this.numEnabled = 0
          this.numDisabled = n  
        } else {
          for (let i = 0; i < n; i++) {
            vertexIDs[i] = i
          }

          this.numEnabled = n
          this.numDisabled = 0
        }

        this.geometry.setAttribute("vertexID", new THREE.Float32BufferAttribute(vertexIDs, 1)) // gl_VertexID is not supported, so make our own id
        this.geometry.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(n*3).fill(0), 3))

        if (this.data.source) {
          this.geometry.setAttribute("quaternion", new THREE.Float32BufferAttribute(new Float32Array(n*4).fill(0), 4))
        }

        // the ribbons are presented as triangle strips, so each vert pairs with it's two previous verts to
        // form a triangle.  To ensure each particle ribbon is not connected to other ribbons we place each
        // one in a group containing only the verts for that ribbon
        if (this.isRibbon()) {
          this.geometry.clearGroups()

          const m = this.trailCount * VERTS_PER_RIBBON
          for (let i = 0; i < n; i += m) {
            this.geometry.addGroup(i, m, 0)
          }
        }
      }
    },

    // to get the fastest shader possible we remove unused glsl code via #if defined(USE_...) clauses,
    // with each clause matching to one or more component attributes. updateDefines() maps each 
    // attribute to its equivalent USE_... define, and determines if any defines have changed.
    // If a define has changed and we are playing we generate an error, otherwise (i.e. in the Inspector)
    // we update the material and rebuild the shader program
    updateDefines() {
      const data = this.data
      const domAttrs = Object.keys(this.el.getDOMAttribute(this.attrName))
      const domDefines = domAttrs.map(a => ATTR_TO_DEFINES[a]).filter(b => b)

      let defines = {
        PARAMS_LENGTH,
        OVER_TIME_ARRAY_LENGTH: this.overTimeArrayLength,
        RANDOM_REPEAT_COUNT,
        USE_MAP: true,
      }
      for (key of domDefines) {
        defines[key] = true
      }

      if (data.velocityScale > 0) {
        defines.USE_PARTICLE_VELOCITY_SCALE = true
      }

      if (data.trailInterval > 0) {
        if (this.isRibbon()) {
          if (data.trailType === "ribbon") {
            defines.USE_RIBBON_TRAILS = true
          } else {
            defines.USE_RIBBON_3D_TRAILS = true
          }
        }
        else {
          defines.USE_PARTICLE_TRAILS = true
        }
      }

      if (data.randomizeFrames) {
        defines.USE_PARTICLE_RANDOMIZE_FRAMES = true
      }

      if (domAttrs.includes("rotation")) {
        if (this.isRibbon()) {
          defines.USE_RIBBON_ROTATION = true
        } else {
          defines.USE_PARTICLE_ROTATION = true
        }
      }

      let ribbonShapeFunction = "1."
      if (data.ribbonShape === "taperout") {
        ribbonShapeFunction = "1. - p"
      } else if (data.ribbonShape === "taperin") {
        ribbonShapeFunction = "p"
      } else if (data.ribbonShape === "taper") {
        ribbonShapeFunction = "2. * ( p < .5 ? p : 1. - p )"
      } else if (data.ribbonShape[0] === "=") {
        ribbonShapeFunction = data.ribbonShape.slice(1)
      }
      defines.RIBBON_SHAPE_FUNCTION = ribbonShapeFunction

      if (data.source) {
        defines.PARTICLE_ORDER = 2
      } else {
        defines.PARTICLE_ORDER = PARTICLE_ORDER_STRINGS.indexOf(data.particleOrder)
      }
      defines.PARTICLE_TRAIL_ORDER = PARTICLE_ORDER_STRINGS.indexOf(data.particleOrder)

      const extraDefines = Object.keys(defines).filter(b => this.material.defines[b] !== defines[b])

      if (extraDefines.length > 0) {
        if (this.isPlaying) {
          const extraAttrs = domAttrs.filter(a => {
            const b = ATTR_TO_DEFINES[a]
            return b && !this.material.defines[b]
          })
          console.error(`cannot add attributes (${extraAttrs.join(",")}) at run-time`)
        } else {
          this.material.defines = defines
          this.material.needsUpdate = true
        }
      }
    },

    updateModelMesh(mesh) {
      if (!mesh) { return }

      this.modelBounds = new THREE.Box3()
      this.modelVertices
      let offset = 0
      let numFloats = 0
      let stage = 0

      const parseModel = (obj3D) => {
        if (!obj3D.geometry) { return }

        let positions = obj3D.geometry.getAttribute("position")
        if (positions && positions.itemSize !== 3) { return } // some text geometry uses 2D positions 

        if (stage == 0) {
          numFloats += positions.array.length
        } else {
          this.modelVertices.set(positions.array, offset)
          offset += positions.array.length
        }
      }

      stage = 0
      mesh.traverse(parseModel)

      if (numFloats > 0) {
        stage = 1
        this.modelVertices = new Float32Array(numFloats)
        mesh.traverse(parseModel)

        applyScale(this.modelVertices, mesh.el.object3D.scale)

        this.modelBounds.setFromArray(this.modelVertices)
        this.updateBounds()
      }
    },

    updateWorldTransform: (function() {
      let position = new THREE.Vector3()
      let quaternion = new THREE.Quaternion()
      let scale = new THREE.Vector3()
      let modelPosition = new THREE.Vector3()
      let m4 = new THREE.Matrix4()

      return function(emitterTime) {
        const data = this.data
        const n = this.count

        // for particles using a source the CPU sets the instancePosition and instanceQuaternion
        // of the new particles to the current object3D position/orientation, and tells the GPU
        // the ID of last emitted particle (this.params[ID_PARAM])
        const spawnRate = this.data.spawnRate
        const isBurst = data.spawnType === "burst"
        const spawnDelta = isBurst ? 0 : 1/spawnRate // for burst particles spawn everything at once
        const isEnableDisable = data.enable ? this.numEnabled < n : this.numDisabled < n
        const hasSource = data.source && data.source.object3D != null
        const isUsingModel = this.modelVertices && this.modelVertices.length
        const isRibbon = this.isRibbon()
        const isIDUnique = isUsingModel || hasSource

        let particleVertexID = this.geometry.getAttribute("vertexID")
        let particlePosition = this.geometry.getAttribute("position")
        let particleQuaternion = this.geometry.getAttribute("quaternion")

        if (hasSource) {
          this.el.object3D.updateMatrixWorld()
          data.source.object3D.updateMatrixWorld()

          // get source matrix in our local space
          m4.copy( this.el.object3D.matrixWorld ).invert();
          m4.multiply(data.source.object3D.matrixWorld)
          m4.decompose(position, quaternion, scale)
          this.geometry.boundingSphere.center.copy(position)
        }

        let startIndex = this.nextID % n
        let numSpawned = 0 // number of particles and/or trails
        let index = startIndex
        let id = this.nextID

        modelFillFn = randomPointInTriangle
        switch (data.modelFill) {
          case "edge": modelFillFn = randomPointOnTriangleEdge; break
          case "vertex": modelFillFn = randomVertex; break
        }

        // the nextTime represents the startTime for each particle, so while the nextTime
        // is less than this frame's time, keep emitting particles. Note, if the spawnRate is
        // low, we may have to wait several frames before a particle is emitted, but if the 
        // spawnRate is high we will emit several particles per frame
        while (this.nextTime < emitterTime && numSpawned < this.count) {

          if (isUsingModel) {
            modelFillFn(this.modelVertices, modelPosition)
          }

          // for each particle, update all of its trails. if there are no trails, then
          // trailcount is 1
          for (let particleVert = 0, particleVertCount = isRibbon ? VERTS_PER_RIBBON : 1; particleVert < particleVertCount; particleVert++ ) {
            for (let trail = 0; trail < this.trailCount; trail++) {
              id = this.nextID

              if (isUsingModel) {
                particlePosition.setXYZ(index, modelPosition.x, modelPosition.y, modelPosition.z)
              }
    
              if (hasSource) {
                particlePosition.setXYZ(index, position.x, position.y, position.z)
                particleQuaternion.setXYZW(index, quaternion.x, quaternion.y, quaternion.z, quaternion.w)
              }
    
              particleVertexID.setX(index, data.enable ? id : -1) // id is unique and is tied to position and quaternion
    
              if (isEnableDisable) {
                // if we're enabled then increase the number of enabled and reset the number disabled, once we 
                // reach this.numEnabled === n, all IDs would have been set and isEnableDisable will switch to false.
                // vice versa if we are disabled. these numbers represent the number of consecutive enables or disables.
                this.numEnabled = data.enable ? this.numEnabled + 1 : 0
                this.numDisabled = data.enable ? 0 : this.numDisabled + 1
              }  

              index = (index + 1) % n
              numSpawned++

              if (isIDUnique) {
                this.nextID++
              } else {
                this.nextID = index // wrap around to 0 if we'd emitted the last particle in our stack
              }
            }
          }

          this.nextTime += spawnDelta
        }

        if (numSpawned > 0) {
          const trailVertCount = this.trailCount * (isRibbon ? VERTS_PER_RIBBON : 1)
          this.params[ID_PARAM] = Math.floor(id/trailVertCount) // particle ID

          if (isBurst) { // if we did burst emit, then wait for maxAge before emitting again
            this.nextTime += this.lifeTime[1]
            if (data.trailInterval > 0) { 
              this.nextTime += this.trailLifeTime[1]
            }
          }

          // if the buffer was wrapped, we cannot send just the end and beginning of a buffer, so submit everything
          if (index < startIndex) {
            startIndex = 0
            numSpawned = this.count
          }

          if (hasSource || isUsingModel) {
            particlePosition.updateRange.offset = startIndex
            particlePosition.updateRange.count = numSpawned
            particlePosition.needsUpdate = true
          }

          if (hasSource) {
            particleQuaternion.updateRange.offset = startIndex
            particleQuaternion.updateRange.count = numSpawned
            particleQuaternion.needsUpdate = true
          }

          // if (changeIDs) {
            particleVertexID.updateRange.offset = startIndex
            particleVertexID.updateRange.count = numSpawned
            particleVertexID.needsUpdate = true
          // }

          // this will cause a glitch in the appearance as we reset the IDs to prevent them from overflowing
          this.nextID = this.nextID % RANDOM_REPEAT_COUNT
        }
      }
    })(),
  })

  const applyScale = (vertices, scale) => {
    if (scale.x !== 1 && scale.y !== 1 && scale.z !== 1) {
      for (let i = 0, n = vertices.length; i < n; i+=3) {
        vertices[i] *= scale.x
        vertices[i+1] *= scale.y
        vertices[i+2] *= scale.z
      }
    }
  }

  const randomPointInTriangle = (function() {
    let v1 = new THREE.Vector3()
    let v2 = new THREE.Vector3()

    // see http://mathworld.wolfram.com/TrianglePointPicking.html
    return function randomPointInTriangle(vertices, pos) {
      // assume each set of 3 vertices (each vertex has 3 floats) is a triangle
      let triangleOffset = Math.floor(Math.random()*vertices.length/9)*9
      v1.fromArray(vertices, triangleOffset)
      v2.fromArray(vertices, triangleOffset + 3)
      pos.fromArray(vertices, triangleOffset + 6)

      let r1, r2
      do {
        r1 = Math.random()
        r2 = Math.random()
      } while (r1 + r2 > 1) // discard points outside of the triangle

      v2.sub(v1).multiplyScalar(r1)
      pos.sub(v1).multiplyScalar(r2).add(v2).add(v1)
    }  
  })()

  const randomPointOnTriangleEdge = (function() {
    let v1 = new THREE.Vector3()
    let v2 = new THREE.Vector3()
    let v3 = new THREE.Vector3()

    return function randomPointOnTriangleEdge(vertices, pos) {
      // assume each set of 3 vertices (each vertex has 3 floats) is a triangle
      let triangleOffset = Math.floor(Math.random()*vertices.length/9)*9
      v1.fromArray(vertices, triangleOffset)
      v2.fromArray(vertices, triangleOffset + 3)
      v3.fromArray(vertices, triangleOffset + 6)
      r1 = Math.random()
      if (r1 > 2/3) {
        pos.copy(v1).sub(v3).multiplyScalar(r1*3 - 2).add(v3)
      } else if (r1 > 1/3) {
        pos.copy(v3).sub(v2).multiplyScalar(r1*3 - 1).add(v2)
      } else {
        pos.copy(v2).sub(v1).multiplyScalar(r1*3).add(v1)
      }
    }  
  })()

  function randomVertex(vertices, pos) {
    let index = Math.floor(Math.random()*vertices.length/3)*3
    pos.fromArray(vertices, index)
  }

  // based upon https://github.com/mrdoob/three.js/blob/master/src/renderers/shaders/ShaderLib/points_vert.glsl
  const particleVertexShader = `
#include <common>
// #include <color_pars_vertex>
#include <fog_pars_vertex>
// #include <morphtarget_pars_vertex>
// #include <logdepthbuf_pars_vertex>
// #include <clipping_planes_pars_vertex>

attribute float vertexID;

#if defined(USE_PARTICLE_SOURCE)
attribute vec4 quaternion;
#endif

uniform vec4 params[PARAMS_LENGTH];
uniform vec4 offset[2];
uniform vec4 velocity[2];
uniform vec4 acceleration[2];
uniform vec4 angularVelocity[2];
uniform vec4 angularAcceleration[2];
uniform vec2 orbital[2];
uniform vec4 colorOverTime[OVER_TIME_ARRAY_LENGTH];
uniform vec2 rotationScaleOverTime[OVER_TIME_ARRAY_LENGTH];
uniform vec4 textureFrames;
uniform vec3 velocityScale;
uniform vec4 destination[2];

varying vec4 vParticleColor;
varying vec2 vCosSinRotation;
varying vec2 vUv;
varying float vOverTimeRatio;
varying float vFrame;

float VERTS_PER_RIBBON = 2.;

// alternative random algorithm, used for the initial seed.  Provides a better
// result than using rand()
float pseudoRandom( const float seed )
{
  return mod( 1664525.*seed + 1013904223., 4294967296. )/4294967296.; // we don't have enough precision in 32-bit float, but results look ok
}

// each call to random will produce a different result by varying randI
float randI = 0.;
float random( const float seed )
{
  randI += 0.001;
  return rand( vec2( seed, randI ));
}

vec3 randVec3Range( const vec3 range0, const vec3 range1, const float seed )
{
  vec3 lerps = vec3( random( seed ), random( seed ), random( seed ) );
  return mix( range0, range1, lerps );
}

vec2 randVec2Range( const vec2 range0, const vec2 range1, const float seed )
{
  vec2 lerps = vec2( random( seed ), random( seed ) );
  return mix( range0, range1, lerps );
}

float randFloatRange( const float range0, const float range1, const float seed )
{
  float lerps = random( seed );
  return mix( range0, range1, lerps );
}

// theta.x is the angle in XY, theta.y is the angle in XZ
vec3 radialToVec3( const float r, const vec2 theta )
{
  vec2 cosTheta = cos(theta);
  vec2 sinTheta = sin(theta);
  float rc = r * cosTheta.x;
  float x = rc * cosTheta.y;
  float y = r * sinTheta.x;
  float z = rc * sinTheta.y;
  return vec3( x, y, z );
}

// array lengths are stored in the first slot, followed by actual values from slot 1 onwards
// colors are packed min,max,min,max,min,max,...
// color is packed in xyz and opacity in w, and they may have different length arrays

vec4 calcColorOverTime( const float r, const float seed )
{
  vec3 color = vec3(1.);
  float opacity = 1.;

#if defined(USE_PARTICLE_COLOR)
  int colorN = int( colorOverTime[0].x );
  if ( colorN == 1 )
  {
    color = randVec3Range( colorOverTime[1].xyz, colorOverTime[2].xyz, seed );
  }
  else if ( colorN > 1 )
  {
    float ck = r * ( float( colorN ) - 1. );
    float ci = floor( ck );
    int i = int( ci )*2 + 1;
    vec3 sColor = randVec3Range( colorOverTime[i].xyz, colorOverTime[i + 1].xyz, seed );
    vec3 eColor = randVec3Range( colorOverTime[i + 2].xyz, colorOverTime[i + 3].xyz, seed );
    color = mix( sColor, eColor, ck - ci );
  }
#endif

#if defined(USE_PARTICLE_OPACITY)
  int opacityN = int( colorOverTime[0].y );
  if ( opacityN == 1 )
  {
    opacity = randFloatRange( colorOverTime[1].w, colorOverTime[2].w, seed );
  }
  else if ( opacityN > 1 )
  {
    float ok = r * ( float( opacityN ) - 1. );
    float oi = floor( ok );
    int j = int( oi )*2 + 1;
    float sOpacity = randFloatRange( colorOverTime[j].w, colorOverTime[j + 1].w, seed );
    float eOpacity = randFloatRange( colorOverTime[j + 2].w, colorOverTime[j + 3].w, seed );
    opacity = mix( sOpacity, eOpacity, ok - oi );
  }
#endif

  return vec4( color, opacity );
}

// as per calcColorOverTime but euler rotation is packed in xyz and scale in w

vec2 calcRotationScaleOverTime( const float r, const float seed )
{
  float rotation = 0.;
  float scale = 1.;

#if defined(USE_PARTICLE_ROTATION) || defined(USE_RIBBON_ROTATION)
  int rotationN = int( rotationScaleOverTime[0].x );
  if ( rotationN == 1 )
  {
    rotation = randFloatRange( rotationScaleOverTime[1].x, rotationScaleOverTime[2].x, seed );
  }
  else if ( rotationN > 1 )
  {
    float rk = r * ( float( rotationN ) - 1. );
    float ri = floor( rk );
    int i = int( ri )*2 + 1; // *2 because each range is 2 vectors, and +1 because the first vector is for the length info
    float sRotation = randFloatRange( rotationScaleOverTime[i].x, rotationScaleOverTime[i + 1].x, seed );
    float eRotation = randFloatRange( rotationScaleOverTime[i + 2].x, rotationScaleOverTime[i + 3].x, seed );
    rotation = mix( sRotation, eRotation, rk - ri );
  }
#endif

#if defined(USE_PARTICLE_SCALE)
  int scaleN = int( rotationScaleOverTime[0].y );
  if ( scaleN == 1 )
  {
    scale = randFloatRange( rotationScaleOverTime[1].y, rotationScaleOverTime[2].y, seed );
  }
  else if ( scaleN > 1 )
  {
    float sk = r * ( float( scaleN ) - 1. );
    float si = floor( sk );
    int j = int( si )*2 + 1; // *2 because each range is 2 vectors, and +1 because the first vector is for the length info
    float sScale = randFloatRange( rotationScaleOverTime[j].y, rotationScaleOverTime[j + 1].y, seed );
    float eScale = randFloatRange( rotationScaleOverTime[j + 2].y, rotationScaleOverTime[j + 3].y, seed );
    scale = mix( sScale, eScale, sk - si );
  }
#endif

  return vec2( rotation, scale );
}

// assumes euler order is YXZ (standard convention for AFrame)
vec4 eulerToQuaternion( const vec3 euler )
{
  // from https://github.com/mrdoob/three.js/blob/master/src/math/Quaternion.js

  vec3 c = cos( euler * .5 );
  vec3 s = sin( euler * .5 );

  return vec4(
    s.x * c.y * c.z + c.x * s.y * s.z,
    c.x * s.y * c.z - s.x * c.y * s.z,
    c.x * c.y * s.z - s.x * s.y * c.z,
    c.x * c.y * c.z + s.x * s.y * s.z
  );
}

// from http://www.euclideanspace.com/maths/geometry/rotations/conversions/angleToQuaternion/index.htm
vec4 axisAngleToQuaternion( const vec3 axis, const float angle ) 
{
  return vec4( axis * sin( angle*.5 ), cos( angle*.5 ) );
}

vec3 applyQuaternion( const vec3 v, const vec4 q )
{
  return v + 2. * cross( q.xyz, cross( q.xyz, v ) + q.w * v );
}

vec3 displacement( const vec3 v, const vec3 a, const float t )
{
  return (v + 0.5 * a * t) * t;
}

float displacement1D( const float v, const float a, const float t )
{
  return (v + 0.5 * a * t) * t;
}

float ribbonShape( const float p )
{
  return RIBBON_SHAPE_FUNCTION;
}

vec3 particleMotion( const vec3 p, const vec3 v, const vec3 a, const vec3 av, const vec3 aa, const vec3 axis, const float ov, const float oa, const vec3 dest, const float weight, const float t )
{
  vec3 pos = p + displacement(v, a, t);

#if defined(USE_PARTICLE_ANGULAR_VELOCITY) || defined(USE_PARTICLE_ANGULAR_ACCELERATION)
  pos = applyQuaternion( pos, eulerToQuaternion( displacement(av, aa, t) ) );
#endif

#if defined(USE_PARTICLE_ORBITAL)
  pos = applyQuaternion( pos, axisAngleToQuaternion( axis, displacement1D(ov, oa, t) ) );
#endif

#if defined(USE_PARTICLE_SOURCE)
  pos = applyQuaternion( pos, quaternion );
#endif

pos += position;

#if defined(USE_PARTICLE_DESTINATION)
  pos = mix( pos, dest, weight );
#endif

  return pos;
}

vec2 toScreen( const vec4 clipSpacePos )
{
  return clipSpacePos.xy / clipSpacePos.w;
}

void main() {

  float time = params[0].x;
  float cpuID = params[0].y;
  float radialTypeX = params[0].z;
  float radialTypeY = params[4].w;
  float duration = params[0].w;
  float spawnType = params[1].x;
  float spawnRate = params[1].y;
  float baseSeed = params[1].z;
  float vertexCount = params[1].w;
  float direction = params[2].z; // 0 is forward, 1 is backward  
  float trailInterval = params[3].x;
  float particleCount = params[3].y;
  float trailCount = params[3].z;
  float maxParticleLifeTime = angularVelocity[1].w; // lifeTime packed into w component of angularVelocity
  float maxTrailLifeTime = angularAcceleration[1].w; // trailLifeTime packed into angularAcceleration.w
  float particleLoopTime = particleCount / spawnRate;
  float motionAge = -1.; // used to determine the age for particle movement

#if defined(USE_PARTICLE_TRAILS) || defined(USE_RIBBON_TRAILS) || defined(USE_RIBBON_3D_TRAILS)
  float maxAge = maxParticleLifeTime + maxTrailLifeTime;
#else
  float maxAge = maxParticleLifeTime;
#endif

  // the CPU manages IDs if it sets the position or disables particles, otherwise cpuID is -1
  float particleID0 = cpuID > -EPSILON ? cpuID : floor( mod( time, particleLoopTime ) * spawnRate ); // this will lose precision eventually

  vOverTimeRatio = -1.; // the vOverTimeRatio will be used for the lerps on over-time attributes

  // particles are either emitted in a burst (spawnType == 0) or spread evenly
  // throughout 0..particleLoopTime (spawnType == 1).  We calculate the ID of the last spawned particle particleID0 
  // for this frame, any vertex IDs after particleID0 are assumed to belong to the previous loop

  // vertex 0 = trail0 of particle0, vertex 1 = trail1 of particle0, ..., vertex k = trail0 of particle1, ...
#if defined(USE_RIBBON_TRAILS) || defined(USE_RIBBON_3D_TRAILS)
  float rawParticleID = floor( vertexID / VERTS_PER_RIBBON / trailCount );
#else
  float rawParticleID = floor( vertexID / trailCount );
#endif

  float particleLoop = floor( time / particleLoopTime );

#if defined(USE_PARTICLE_SOURCE)
  // find particleID relative to the last loop
  float particleID = rawParticleID - floor( particleID0 / particleCount ) * particleCount;
#else // defined(USE_PARTICLE_SOURCE)

#if PARTICLE_ORDER == 0
  float particleID = particleID0 - (particleCount - 1. - rawParticleID); // newest last
#elif PARTICLE_ORDER == 1
  float particleID = particleID0 - rawParticleID; // oldest last
#else
  float particleID = rawParticleID > particleID0 ? rawParticleID - particleCount : rawParticleID; // cyclic (original)
#endif

#endif // defined(USE_PARTICLE_SOURCE)

  // for burst mode we use the rawParticleID, because the concept of particleID0 is irrelevant
  particleID = mix( rawParticleID, particleID, spawnType ); 

  float particleStartTime = particleLoop * particleLoopTime + particleID / spawnRate * spawnType;

  // we use the id as a seed for the randomizer, but because the IDs are fixed in 
  // the range 0..particleCount we calculate a virtual ID by taking into account
  // the number of loops that have occurred (note, particles from the previous 
  // loop will have a negative particleID). We use the modoulo of the RANDOM_REPEAT_COUNT 
  // to ensure that the virtualID doesn't exceed the floating point precision

  float virtualID = mod( particleID + particleLoop * particleCount, float( RANDOM_REPEAT_COUNT ) );
  float seed = pseudoRandom( virtualID*baseSeed*110. );

  float particleLifeTime = randFloatRange( angularVelocity[0].w, angularVelocity[1].w, seed );

  float particleAge = time - particleStartTime;
  particleAge = particleAge + direction * ( particleLoopTime - 2. * particleAge );

  // don't show particles that would be emitted after the duration
  if ( duration > 0. && time - particleAge >= duration ) 
  {
    particleAge = -1.;
  } 

  // always calculate the trailLifeTime, even if we don't use it, so the particles
  // with the same seed give consistent results
  float trailLifeTime = randFloatRange( angularAcceleration[0].w, angularAcceleration[1].w, seed );

#if defined(USE_PARTICLE_TRAILS)

  // +1 beceause we show both the lead particle and the first trail at the start
  // we cap the particleAge to ensure it never goes past the particleLifeTime
  float cappedParticleAge = min( particleLifeTime - trailInterval, particleAge );
  float trailID0 = floor( cappedParticleAge / trailInterval ) + 1.;
  float rawTrailID = mod( vertexID, trailCount );

#if PARTICLE_TRAIL_ORDER == 0
  float trailID = trailID0 - ( trailCount - 1. - rawTrailID ); // newest last
#elif PARTICLE_TRAIL_ORDER == 1
  float trailID = trailID0 - rawTrailID; // oldest last
#else
  float trailID = floor( trailID0 / trailCount ) * trailCount;
  trailID += rawTrailID > mod( trailID0, trailCount ) ? rawTrailID - trailCount : rawTrailID; // cyclic (original)
#endif

  float trailStartAge = trailID * trailInterval;
  
  if (particleAge > -EPSILON && trailStartAge > -EPSILON && trailStartAge < particleLifeTime + EPSILON)
  {
    if (particleAge < trailStartAge)
    {
      motionAge = particleAge;
      vOverTimeRatio = 0.;
    }
    else if (particleAge < trailStartAge + trailLifeTime)
    {
      motionAge = trailStartAge;
      vOverTimeRatio = (particleAge - trailStartAge)/trailLifeTime;
    }
  }

#elif defined(USE_RIBBON_TRAILS) || defined(USE_RIBBON_3D_TRAILS)

  // +1 to the trailID0 because the ribbon needs two elements to start
  // we cap the particleAge to ensure it never goes past the particleLifeTime
  float cappedParticleAge = min( particleLifeTime - trailInterval, particleAge );
  float trailID0 = floor( cappedParticleAge / trailInterval ) + 1.;
  float rawTrailID = floor( mod( vertexID / VERTS_PER_RIBBON, trailCount ) );
  float trailID = max( 0., trailID0 - ( trailCount - 1. - rawTrailID ) ); // newest last

  float trailStartAge = trailID * trailInterval;

  if (particleAge > -EPSILON && trailStartAge > -EPSILON && trailStartAge < particleLifeTime + EPSILON)
  {
    // motionAge will typically be the trailStartAge, but the lead particle will be the 
    // cappedParticleAge, and the last particle will be the particleAge - trailLifeTime

    motionAge = min( cappedParticleAge, max( particleAge - trailLifeTime, trailStartAge ) );
    vOverTimeRatio = ( particleAge - motionAge ) / trailLifeTime;
  }
  else
  {
    motionAge = particleLifeTime;
    vOverTimeRatio = 1.0;
  }

#else // defined(USE_PARTICLE_TRAILS) || defined(USE_RIBBON_TRAILS) || defined(USE_RIBBON_3D_TRAILS)

  motionAge = particleAge;
  vOverTimeRatio = particleAge/particleLifeTime;

#endif // defined(USE_PARTICLE_TRAILS) || defined(USE_RIBBON_TRAILS) || defined(USE_RIBBON_3D_TRAILS)

  // these checks were around large blocks of code above, but this caused instability
  // in some of the particle systems, so instead we do all of the work, then cancel 
  // it out here
  if ( particleStartTime < 0. || vertexID < 0. )
  {
    vOverTimeRatio = -1.;
  }

#if defined(USE_PARTICLE_DRAG)
  // simulate drag by blending the motionAge to (1-.5*drag)*particleLifeTime
  float drag = params[2].w;
  motionAge = mix( .5*drag*vOverTimeRatio, 1. - .5*drag, vOverTimeRatio ) * particleLifeTime;
#endif

  vec3 p = vec3(0.); // position
  vec3 v = vec3(0.); // velocity
  vec3 a = vec3(0.); // acceleration
  vec3 av = vec3(0.); // angular velocity
  vec3 aa = vec3(0.); // angular acceleration
  vec3 axis = vec3( 1., 0., 0. ); // axis of orbital motion
  float ov = 0.; // orbital velocity
  float oa = 0.; // orbital acceleration
  vec3 dest = vec3(0.); // destination position
  float destWeight = 0.; // destination weighting

#if defined(USE_PARTICLE_OFFSET)
  p = randVec3Range( offset[0].xyz, offset[1].xyz, seed );
#endif

#if defined(USE_PARTICLE_VELOCITY)
  v = randVec3Range( velocity[0].xyz, velocity[1].xyz, seed );
#endif

#if defined(USE_PARTICLE_ACCELERATION)
  a = randVec3Range( acceleration[0].xyz, acceleration[1].xyz, seed );
#endif

#if defined(USE_PARTICLE_RADIAL_OFFSET) || defined(USE_PARTICLE_RADIAL_VELOCITY) || defined(USE_PARTICLE_RADIAL_ACCELERATION)
  vec2 ANGLE_RANGE[2];
  vec2 radialDir = vec2( radialTypeX, radialTypeY );
  ANGLE_RANGE[0] = vec2( 0., 0. ) * radialDir;
  ANGLE_RANGE[1] = vec2( 2.*PI, 2.*PI ) * radialDir;

  vec2 theta = randVec2Range( ANGLE_RANGE[0], ANGLE_RANGE[1], seed );
#endif

#if defined(USE_PARTICLE_RADIAL_OFFSET)
  float pr = randFloatRange( offset[0].w, offset[1].w, seed );
  vec3 p2 = radialToVec3( pr, theta );
  p += p2;
#endif

#if defined(USE_PARTICLE_RADIAL_VELOCITY)
  float vr = randFloatRange( velocity[0].w, velocity[1].w, seed );
  vec3 v2 = radialToVec3( vr, theta );
  v += v2;
#endif

#if defined(USE_PARTICLE_RADIAL_ACCELERATION)
  float ar = randFloatRange( acceleration[0].w, acceleration[1].w, seed );
  vec3 a2 = radialToVec3( ar, theta );
  a += a2;
#endif

#if defined(USE_PARTICLE_ANGULAR_VELOCITY)
  av = randVec3Range( angularVelocity[0].xyz, angularVelocity[1].xyz, seed );
#endif

#if defined(USE_PARTICLE_ANGULAR_ACCELERATION)
  aa = randVec3Range( angularAcceleration[0].xyz, angularAcceleration[1].xyz, seed );
#endif

#if defined(USE_PARTICLE_ORBITAL)
  if ( length(p) > EPSILON ) {
    ov = randFloatRange( orbital[0].x, orbital[1].x, seed );
    float oa = randFloatRange( orbital[0].y, orbital[1].y, seed );
    float angle = displacement1D(ov, oa, motionAge);

    vec3 randomOribit = vec3( random( seed ), random( seed ), random( seed ) ); // should never equal p or 0,0,0
    axis = normalize( cross( normalize( p ), normalize( randomOribit ) ) );
  }
#endif

#if defined(USE_PARTICLE_DESTINATION)
  destWeight = randFloatRange( destination[0].w, destination[1].w, seed );
  dest = randVec3Range( destination[0].xyz, destination[1].xyz, seed );
#endif

  vec3 transformed = particleMotion( p, v, a, av, aa, axis, ov, oa, dest, motionAge/particleLifeTime*destWeight, motionAge );

  vec2 rotScale = calcRotationScaleOverTime( vOverTimeRatio, seed );
  float particleScale = rotScale.y;
  float c = cos( rotScale.x );
  float s = sin( rotScale.x );

  vParticleColor = calcColorOverTime( vOverTimeRatio, seed ); // rgba format

#if defined(USE_PARTICLE_VELOCITY_SCALE)
  // We repeat all of the displacement calculations at motionAge + a small amount (velocityScaleDelta).
  // We convert the current position and the future position in screen space and determine
  // the screen space velocity. VelocityScaleDelta is reasonably small to give better
  // results for the angular and orbital displacement, and when drag is applied the effective
  // velocity will tend to 0 as the vOverTimeRatio increases

  float velocityScaleDelta = .02;

#if defined(USE_PARTICLE_DRAG)
  float futureT = motionAge + velocityScaleDelta*mix(1., 1. - drag, vOverTimeRatio);
#else
  float futureT = motionAge + velocityScaleDelta;
#endif

  vec4 pos2D = projectionMatrix * modelViewMatrix * vec4( transformed, 1. );

  // use min(1) to ensure the particle stops at the destination position
  vec3 transformedFuture = particleMotion( p, v, a, av, aa, axis, ov, oa, dest, min( 1., futureT/particleLifeTime )*destWeight, futureT );

  vec4 pos2DFuture = projectionMatrix * modelViewMatrix * vec4( transformedFuture, 1. );

  vec2 screen = pos2DFuture.xy / pos2DFuture.z - pos2D.xy / pos2D.z; // TODO divide by 0?
  screen /= velocityScaleDelta; // gives screen units per second

  float lenScreen = length( screen );
  vec2 sinCos = vec2(screen.x, screen.y)/max( EPSILON, lenScreen); // 0 degrees is y == 1, x == 0
  float c2 = c*sinCos.y + s*sinCos.x; // cos(a-b)
  float s2 = s*sinCos.y - c*sinCos.x; // sin(a-b)

  // replace rotation with our new rotation
  c = c2;
  s = s2;

  // rescale the particle length by the z depth, because perspective will be applied later
  float screenScale = clamp( lenScreen * pos2D.z * velocityScale.x, velocityScale.y, velocityScale.z );

  particleScale *= screenScale;

#endif // defined(USE_PARTICLE_VELOCITY_SCALE)

  vCosSinRotation = vec2( c, s );

  // #include <color_vertex>
  // #include <begin_vertex> replaced by code above
  // #include <morphtarget_vertex>
  // #include <project_vertex> replaced below

#if defined(USE_RIBBON_3D_TRAILS)
  float ribbonID = mod( vertexID, VERTS_PER_RIBBON );
  
  {
    float nextT = motionAge + trailInterval;
    float ribbonWidth = params[4].x * ribbonShape( vOverTimeRatio );

    vec3 nextPosition = particleMotion( p, v, a, av, aa, axis, ov, oa, dest, min( 1., nextT/particleLifeTime )*destWeight, nextT );
    vec3 dir = nextPosition - transformed;
    float dirLen = length( dir );

    vec3 normal = dir;
    vec3 up = vec3( 0., c, -s ); // rotation in YZ
    if ( dirLen > EPSILON && abs( dot( dir, up ) ) < dirLen * 0.99 ) {
      normal = normalize( cross( up, dir ) );
    }

    transformed += ribbonWidth * normal * ( 0.5 - ribbonID );  // +normal for ribbonID 0, -normal for ribbonID 1
  }
#endif

  vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );
  gl_Position = projectionMatrix * mvPosition;

  float usePerspective = params[2].y;

#if defined(USE_RIBBON_TRAILS)
  float ribbonID = mod( vertexID, VERTS_PER_RIBBON );
  
  {
    mat4 m = projectionMatrix * modelViewMatrix;
    vec2 curr = toScreen( gl_Position );

    float nextT = motionAge + trailInterval;
    vec3 nextPosition = particleMotion( p, v, a, av, aa, axis, ov, oa, dest, min( 1., nextT/particleLifeTime )*destWeight, nextT );
    vec2 next2D = toScreen( m * vec4( nextPosition, 1. ) ) - curr;

    vec2 dir = normalize( next2D );
    vec2 normal = vec2( -dir.y, dir.x );

    float ribbonWidth = params[4].x * ribbonShape( vOverTimeRatio );
    float halfWidth = .5 * ribbonWidth * mix( 1., 1. / - mvPosition.z, usePerspective );
  
    gl_Position.xy += halfWidth * normal * ( 1. - ribbonID * 2. ); // +normal for ribbonID 0, -normal for ribbonID 1
  }
#endif

#if defined(USE_PARTICLE_SCREEN_DEPTH_OFFSET)
  float screenDepthOffset = params[3].w;

#if defined(USE_PARTICLE_TRAILS) || defined(USE_RIBBON_TRAILS) || defined(USE_RIBBON_3D_TRAILS)
  // multiply trailCount by 2 because trailID ranges from [-trailCount, trailCount]
  gl_Position.z -= (particleID*trailCount*2. + trailID - trailID0)*gl_Position.w*screenDepthOffset/vertexCount;
#else
  gl_Position.z -= particleID*gl_Position.w*screenDepthOffset/vertexCount;
#endif

#endif // defined(USE_PARTICLE_SCREEN_DEPTH_OFFSET)

// vFrame is an int, but we must pass it as a float, so add .5 now and floor() in the
// fragment shader to ensure there is no rounding error
#if defined(USE_PARTICLE_RANDOMIZE_FRAMES)
  vFrame = floor ( random( seed ) * textureFrames.z ) + .5;
#else
  float textureCount = textureFrames.z;
  float textureLoop = textureFrames.w;

  vFrame = floor( mod( vOverTimeRatio * textureCount * textureLoop, textureCount ) ) + .5;
#endif

#if !defined(USE_RIBBON_TRAILS) && !defined(USE_RIBBON_3D_TRAILS)
  float particleSize = params[2].x;

  gl_PointSize = particleSize * particleScale * mix( 1., 1. / - mvPosition.z, usePerspective );
#endif

  // #include <logdepthbuf_vertex>
  // #include <clipping_planes_vertex>
  // #include <worldpos_vertex>
  #include <fog_vertex>

#if defined(USE_RIBBON_TRAILS) || defined(USE_RIBBON_3D_TRAILS)
  float ribbonUVMultiplier = params[4].y;
  float ribbonUVType = params[4].z;

  vUv = vec2( mix( 1. - vOverTimeRatio, motionAge/trailInterval, ribbonUVType ) * ribbonUVMultiplier, 1. - ribbonID );
#endif
}`

  // based upon https://github.com/mrdoob/three.js/blob/master/src/renderers/shaders/ShaderLib/points_frag.glsl
  const particleFragmentShader = `
#include <common>
#include <packing>
// #include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <fog_pars_fragment>
// #include <logdepthbuf_pars_fragment>
// #include <clipping_planes_pars_fragment>

uniform vec4 textureFrames;
uniform vec3 emitterColor;

varying vec4 vParticleColor;
varying vec2 vCosSinRotation;
varying vec2 vUv;
varying float vOverTimeRatio;
varying float vFrame;

void main() {
  if ( vOverTimeRatio < 0. || vOverTimeRatio > 1. ) {
    discard;
  }

  #include <clipping_planes_fragment>

  vec3 outgoingLight = vec3( 0. );
  vec4 diffuseColor = vec4( emitterColor, 1. );
  mat3 uvTransform = mat3( 1. );

#if defined(USE_PARTICLE_ROTATION) || defined(USE_PARTICLE_FRAMES) || defined(USE_PARTICLE_VELOCITY_SCALE)
  {
    vec2 invTextureFrame = 1. / textureFrames.xy;
    float textureCount = textureFrames.z;
    float textureLoop = textureFrames.w;

    float frame = floor(vFrame);
    float c = vCosSinRotation.x;
    float s = vCosSinRotation.y;
    float tx = mod( frame, textureFrames.x ) * invTextureFrame.x;
    float ty = (textureFrames.y - 1. - floor( frame * invTextureFrame.x )) * invTextureFrame.y; // assumes textures are flipped on y
    float sx = invTextureFrame.x;
    float sy = invTextureFrame.y;
    float cx = tx + invTextureFrame.x * .5;
    float cy = ty + invTextureFrame.y * .5;
  
    uvTransform[0][0] = sx * c;
    uvTransform[0][1] = -sx * s;
    uvTransform[1][0] = sy * s;
    uvTransform[1][1] = sy * c;
    uvTransform[2][0] = c * tx + s * ty - ( c * cx + s * cy ) + cx;
    uvTransform[2][1] = -s * tx + c * ty - ( -s * cx + c * cy ) + cy;
  }
#endif // defined(USE_PARTICLE_ROTATION) || defined(USE_PARTICLE_FRAMES) || defined(USE_PARTICLE_VELOCITY_SCALE)

  // #include <logdepthbuf_fragment>
  // #include <map_particle_fragment>
  // #include <color_fragment>

#ifdef USE_MAP

#if defined(USE_RIBBON_TRAILS) || defined(USE_RIBBON_3D_TRAILS)
  vec2 uv = ( uvTransform * vec3( vUv, 1. ) ).xy;
#else
  vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1. ) ).xy;
#endif

  vec4 mapTexel = texture2D( map, uv );
  // diffuseColor *= mapTexelToLinear( mapTexel );
  diffuseColor *= mapTexel;
#endif // USE_MAP

  #ifdef USE_ALPHATEST
    if ( diffuseColor.a < 0.1 ) discard;
  #endif

  diffuseColor *= vParticleColor;
  outgoingLight = diffuseColor.rgb;

  gl_FragColor = diffuseColor;

  // #include <premultiplied_alpha_fragment>
  // #include <tonemapping_fragment>
  // #include <encodings_fragment>
  #include <fog_fragment>
}`

})()
