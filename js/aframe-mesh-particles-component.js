// Copyright 2018 harlyq
// License MIT

(function() {

  const TIME_PARAM = 0 // [0].x
  const ID_PARAM = 1 // [0].y
  const RADIAL_PARAM = 2 // [0].z
  const DURATION_PARAM = 3 // [0].w
  const SPAWN_TYPE_PARAM = 4 // [1].x
  const SPAWN_DELTA_PARAM = 5 // [1].y
  const SEED_PARAM = 6 // [1].z
  const PARTICLE_COUNT_PARAM = 7 // [1].w
  const MIN_AGE_PARAM = 8 // [2].x
  const MAX_AGE_PARAM = 9 // [2].y
  const DIRECTION_PARAM = 10 // [2].z

  const RANDOM_REPEAT_COUNT = 131072; // random numbers will start repeating after this number of particles

  const degToRad = THREE.Math.degToRad

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

  // find the first THREE.Mesh that is this either this object or one of it's descendants
  const getNthMesh = (object3D, n, i = 1) => {
    if (!object3D) {
      return
    } else if (object3D instanceof THREE.Mesh && i++ == n) {
      return object3D
    }

    for (let child of object3D.children) {
      let mesh = getNthMesh(child, n, i)
      if (mesh) return mesh
    }
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

  AFRAME.registerComponent("mesh-particles", {
    schema: {
      enableInEditor: { default: false },
      entity: { type: "selector" },
      duration: { default: -1 },
      spawnType: { default: "continuous", oneOf: ["continuous", "burst"], parse: toLowerCase },
      spawnRate: { default: 10 },
      relative: { default: "local", oneOf: ["local", "world"], parse: toLowerCase },

      lifeTime: { default: "1" },
      position: { default: "0 0 0" },
      velocity: { default: "0 0 0" },
      acceleration: { default: "0 0 0" },
      radialType: { default: "circle", oneOf: ["circle", "sphere"], parse: toLowerCase },
      radialPosition: { default: "0" },
      radialVelocity: { default: "0" },
      radialAcceleration: { default: "0" },
      angularVelocity: { default: "0 0 0" },
      angularAcceleration: { default: "0 0 0" },
      scale: { default: "1" },
      color: { default: "white", parse: toLowerCase },
      rotation: { default: "0 0 0" },
      opacity: { default: "1" },

      enable: { default: true },
      direction: { default: "forward", oneOf: ["forward", "backward"], parse: toLowerCase },
      seed: { type: "float", default: -1 },
      overTimeSlots: { type: "int", default: 5 },
      frustumCulled: { default: true },
      geoName: { default: "mesh" },
      geoNumber: { type: "int", min: 1, default: 1 },
    },
    multiple: true,
    help: "https://github.com/harlyq/aframe-mesh-particles-component",

    init() {
      this.pauseTick = this.pauseTick.bind(this)
      this.onBeforeCompile = this.onBeforeCompile.bind(this)

      this.count = 0
      this.overTimeArrayLength = this.data.overTimeSlots*2 + 1 // each slot represents 2 glsl array elements pluse one element for the length info
      this.emitterTime = 0
      this.lifeTime = [1,1]
      this.useTransparent = false
      this.offset = [0,0,0,0,0,0]
      this.radialOffset = [0,0]
      this.velocity = [0,0,0,0,0,0]
      this.radialVelocity = [0,0]
      this.acceleration = [0,0,0,0,0,0]
      this.radialAcceleration = [0,0]
      this.angularVelocity = [0,0,0,0,0,0]
      this.angularAcceleration = [0,0,0,0,0,0]
      this.colorOverTime = new Float32Array(4*this.overTimeArrayLength).fill(0) // color is xyz and opacity is w
      this.rotationScaleOverTime = new Float32Array(4*this.overTimeArrayLength).fill(0) // xyz is rotation, w is scale
      this.params = new Float32Array(4*3).fill(0) // see _PARAM constants
      this.nextID = 0
      this.nextTime = 0
      this.relative = this.data.relative // cannot be changed at run-time
      this.paused = false
    },

    remove() {
      if (this.instancedMesh) {
        this.parentEl.removeObject3D(this.instancedMesh.name)
      } 
    },

    update(oldData) {
      const data = this.data
      let boundsDirty = false

      if (data.relative !== this.relative) {
        console.error("mesh-particles 'relative' cannot be changed at run-time")
      }

      if (data.overTimeSlots !== (this.overTimeArrayLength - 1)/2) {
        console.error("mesh-particles 'overTimeSlots' cannot be changed at run-time")
      }

      this.params[SPAWN_TYPE_PARAM] = data.spawnType === "burst" ? 0 : 1
      this.params[RADIAL_PARAM] = data.radialType === "circle" ? 0 : 1
      this.params[DIRECTION_PARAM] = data.direction === "forward" ? 0 : 1

      if (data.seed !== oldData.seed) {
        this.seed = data.seed
        this.params[SEED_PARAM] = data.seed >= 0 ? data.seed : Math.random()
      }

      if (this.instancedMesh && data.frustumCulled !== oldData.frustumCulled) {
        this.instancedMesh.frustumCulled = data.frustumCulled
      }

      if (data.position !== oldData.position || data.radialPosition !== oldData.radialPosition) {
        this.offset = parseVecRange(data.position, [0,0,0])
        this.radialOffset = parseVecRange(data.radialPosition, [0])
        boundsDirty = true
      }

      if (data.velocity !== oldData.velocity || data.radialVelocity !== oldData.radialVelocity) {
        this.velocity = parseVecRange(data.velocity, [0,0,0])
        this.radialVelocity = parseVecRange(data.radialVelocity, [0])
        boundsDirty = true
      }

      if (data.acceleration !== oldData.acceleration || data.radialAcceleration !== oldData.radialAcceleration) {
        this.acceleration = parseVecRange(data.acceleration, [0,0,0])
        this.radialAcceleration = parseVecRange(data.radialAcceleration, [0])
        boundsDirty = true
      }

      if (data.rotation !== oldData.rotation || data.scale !== oldData.scale) {
        this.updateRotationScaleOverTime()
      }

      if (data.color !== oldData.color || data.opacity !== oldData.opacity) {
        this.updateColorOverTime()
      }

      if (data.angularVelocity !== oldData.angularVelocity) {
        this.angularVelocity = parseVecRange(data.angularVelocity, [0,0,0]).map(degToRad)
      }

      if (data.angularAcceleration !== oldData.angularAcceleration) {
        this.angularAcceleration = parseVecRange(data.angularAcceleration, [0,0,0]).map(degToRad)
      }

      if (data.duration !== oldData.duration) {
        this.params[DURATION_PARAM] = data.duration
        this.emitterTime = 0 // if the duration is changed then restart the particles
      }

      if (data.spawnRate !== oldData.spawnRate || data.lifeTime !== oldData.lifeTime) {
        this.lifeTime = parseVecRange(data.lifeTime, [1])
        this.params[SPAWN_DELTA_PARAM] = 1/data.spawnRate
        this.count = Math.max(1, Math.ceil(this.lifeTime[1]*data.spawnRate))
        this.params[MIN_AGE_PARAM] = this.lifeTime[0]
        this.params[MAX_AGE_PARAM] = this.lifeTime[1]
        this.params[PARTICLE_COUNT_PARAM] = this.count
        this.updateAttributes()
      }

      if (data.enableInEditor !== oldData.enableInEditor) {
        this.enablePauseTick(data.enableInEditor)
      }

      if (boundsDirty && this.geometry) {
        this.updateBounds()
      }
    },

    tick(time, deltaTime) {
      if (deltaTime > 100) deltaTime = 100 // ignore long pauses
      const dt = deltaTime/1000 // dt is in seconds

      // for models it may take some time before the original mesh is available, so keep trying
      if (!this.instancedMesh) {
        this.waitingForMeshDebug = (this.waitingForMesh || 0) + deltaTime
        if (this.waitingFroMeshDebug > 2000) {
          this.waitingFroMeshDebug -= 600000
          console.error("mesh-particles missing mesh geometry")
        }

        this.createMesh()
      }

      if (this.shader) {
        this.emitterTime += dt
        this.params[TIME_PARAM] = this.emitterTime

        this.updateWorldTransform(this.emitterTime) // before we update emitterTime
      }
    },

    pause() {
      this.paused = true
      this.enablePauseTick(this.data.enableInEditor)
    },

    play() {
      this.paused = false
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

    createMesh() {
      const data = this.data

      // if there is no entity property then use the geo from our component
      let mesh = getNthMesh(data.entity ? data.entity.getObject3D(data.geoName) : this.el.getObject3D(data.geoName), data.geoNumber)

      if (!mesh || !mesh.geometry || !mesh.material) {
        return // mesh doesn't exist or not yet loaded
      }

      this.geometry = (new THREE.InstancedBufferGeometry()).copy(mesh.geometry)

      // If sourcing the particle from another entity, then bake that entities'
      // scale directly on the geo (i.e. any scale="..." applied to the entity will also be applied
      // to the particle)
      let entityScale = data.entity ? data.entity.object3D.scale : {x:1, y:1, z:1}
      this.geometry.scale(entityScale.x, entityScale.y, entityScale.z)

      this.updateAttributes()

      this.material = mesh.material.clone()
      this.wasOriginalMaterialTransparent = this.materialTransparent
      this.material.transparent = this.material.transparent || this.useTransparent

      this.material.defines = this.material.defines || {}
      this.material.defines.OVER_TIME_ARRAY_LENGTH = this.overTimeArrayLength
      this.material.defines.RANDOM_REPEAT_COUNT = RANDOM_REPEAT_COUNT

      // world relative particles use a set of new attributes, so only include the glsl code
      // if we are world relative
      if (this.relative === "world") {
        this.material.defines.WORLD_RELATIVE = true
      } else if (this.material.defines) {
        delete this.material.defines.WORLD_RELATIVE
      }

      this.material.onBeforeCompile = this.onBeforeCompile

      this.instancedMesh = new THREE.Mesh(this.geometry, this.material)
      this.instancedMesh.frustumCulled = data.frustumCulled

      if (!data.entity) {
        //mesh.visible = false // cannot just set the mesh because there may be multiple object3Ds under this geoname
        this.el.removeObject3D(data.geoName)
      }

      this.parentEl = this.relative === "world" ? this.el.sceneEl : this.el
      if (this.relative === "local") {
        this.instancedMesh.name = this.attrName
      } else if (this.el.id) { // world relative with id
        this.instancedMesh.name = this.el.id + "_" + this.attrName
      } else { // world relative, no id
        this.parentEl.meshParticleshUniqueID = (this.parentEl.meshParticleshUniqueID || 0) + 1
        this.instancedMesh.name = this.attrName + (this.parentEl.meshParticleshUniqueID > 1 ? this.parentEl.meshParticleshUniqueID.toString() : "")
      }
      // console.log(this.instancedMesh.name)

      this.parentEl.setObject3D(this.instancedMesh.name, this.instancedMesh)

      this.updateBounds()
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
        this.useTransparent = this.useTransparent || alpha < 1
      }

      if (this.material) {
        this.material.transparent = this.wasOriginalMaterialTransparent || this.useTransparent // material.needsUpdate = true???
      }
    },

    updateRotationScaleOverTime() {
      const maxSlots = this.data.overTimeSlots
      let rotation = parseVecRangeArray(this.data.rotation, [0,0,0])
      let scale = parseVecRangeArray(this.data.scale, [1])


      if (rotation.length/3 > maxSlots*2) rotation.length = maxSlots*2*3 // 3 numbers per rotation, 2 rotations per range
      if (scale.length > maxSlots*2) scale.length = maxSlots*2 // 2 scales per range

      // first vec4 contains the lengths of the rotation and scale vectors
      this.rotationScaleOverTime.fill(0)
      this.rotationScaleOverTime[0] = rotation.length/6
      this.rotationScaleOverTime[1] = scale.length/2

      // set k to 4 because the first vec4 of rotationScaleOverTime is use for the length params
      // update i by 3 becase rotation is 3 numbers per vector, and k by 4 because rotationScaleOverTime is 4 numbers per vector
      let n = rotation.length
      for (let i = 0, k = 4; i < n; i += 3, k += 4) {
        this.rotationScaleOverTime[k] = degToRad(rotation[i]) // glsl rotationScaleOverTime[1..].x
        this.rotationScaleOverTime[k+1] = degToRad(rotation[i+1]) // glsl rotationScaleOverTime[1..].y
        this.rotationScaleOverTime[k+2] = degToRad(rotation[i+2]) // glsl rotationScaleOverTime[1..].z
      }

      n = scale.length
      for (let i = 0, k = 4; i < n; i++, k += 4) {
        this.rotationScaleOverTime[k+3] = scale[i] // glsl rotationScaleOverTime[1..].w
      }
    },

    random() {
      if (this.seed >= 0) {
        this.seed = (1664525*this.seed + 1013904223) % 0xffffffff
        return this.seed/0xffffffff
      } else {
        return Math.random()
      }
    },

    randomNumber(min, max) {
      if (min === max) return min
      return this.random()*(max - min) + min
    },

    randomDir(out) {
      const theta = this.randomNumber(0, 2*Math.PI)
      const omega = this.data.radialType === "sphere" ? this.randomNumber(0, 2*Math.PI) : 0

      const rc = Math.cos(theta)
      out.x = Math.cos(omega) * rc
      out.y = Math.sin(theta)
      out.z = Math.sin(omega) * rc
    },

    randomVec3PlusRadial(vec3Range, wRange, dir, out) {
      const r = this.randomNumber(wRange[0], wRange[1])
      out.x = this.randomNumber(vec3Range[0], vec3Range[3]) + dir.x*r
      out.y = this.randomNumber(vec3Range[1], vec3Range[4]) + dir.y*r
      out.z = this.randomNumber(vec3Range[2], vec3Range[5]) + dir.z*r
    },

    randomVec3(vec3Range, out) {
      out.x = this.randomNumber(vec3Range[0], vec3Range[3])
      out.y = this.randomNumber(vec3Range[1], vec3Range[4])
      out.z = this.randomNumber(vec3Range[2], vec3Range[5])
    },

    updateAttributes() {
      if (this.geometry) {
        const n = this.count
        this.geometry.instanceCount = n

        let instanceIDs = new Float32Array(n)
        for (let i = 0; i  < n; i++) {
          instanceIDs[i] = i
        }

        this.geometry.setAttribute("instanceID", new THREE.InstancedBufferAttribute(instanceIDs, 1)) // gl_InstanceID is not supported, so make our own id
        this.geometry.setAttribute("instanceOffset", new THREE.InstancedBufferAttribute(new Float32Array(3*n).fill(0), 3))
        this.geometry.setAttribute("instanceVelocity", new THREE.InstancedBufferAttribute(new Float32Array(3*n).fill(0), 3))
        this.geometry.setAttribute("instanceAcceleration", new THREE.InstancedBufferAttribute(new Float32Array(3*n).fill(0), 3))
        this.geometry.setAttribute("instanceAngularVelocity", new THREE.InstancedBufferAttribute(new Float32Array(3*n).fill(0), 3))
        this.geometry.setAttribute("instanceAngularAcceleration", new THREE.InstancedBufferAttribute(new Float32Array(3*n).fill(0), 3))

        if (this.relative === "world") {
          this.geometry.setAttribute("instancePosition", new THREE.InstancedBufferAttribute(new Float32Array(3*n).fill(0), 3))
          this.geometry.setAttribute("instanceQuaternion", new THREE.InstancedBufferAttribute(new Float32Array(4*n).fill(0), 4))
        }
      }
    },

    updateBounds() {
      const data = this.data
      const maxAge = Math.max(this.lifeTime[0], this.lifeTime[1])
      const STRIDE = 3
      let extent = [new Array(STRIDE).fill(0), new Array(STRIDE).fill(0)] // extent[0] = min values, extent[1] = max values
      let radialExtent = [0,0]

      const calcExtent = (offset, velocity, acceleration, t, compareFn) => {
        let extent = offset + (velocity + 0.5 * acceleration * t) * t
        extent = compareFn(extent, offset)

        const turningPoint = -velocity/acceleration
        if (turningPoint > 0 && turningPoint < t) {
          extent = compare(extent, offset - 0.5*velocity*velocity/acceleration)
        }

        return extent
      }

      // Use offset, velocity and acceleration to determine the extents for the particles
      for (let j = 0; j < 2; j++) { // index for extent
        const compareFn = j === 0 ? Math.min: Math.max

        for (let i = 0; i < STRIDE; i++) { // 0 = x, 1 = y, 2 = z, 3 = radial
          const offset = compareFn(this.offset[i], this.offset[i + STRIDE])
          const velocity = compareFn(this.velocity[i], this.velocity[i + STRIDE])
          const acceleration = compareFn(this.acceleration[i], this.acceleration[i + STRIDE])

          extent[j][i] = calcExtent(offset, velocity, acceleration, maxAge, compareFn)
        }

        const radialOffset = compareFn(this.radialOffset[0], this.radialOffset[1])
        const radialVelocity = compareFn(this.radialVelocity[0], this.radialVelocity[1])
        const radialAcceleration = compareFn(this.radialAcceleration[0], this.radialAcceleration[1])

        radialExtent[j] = calcExtent(radialOffset, radialVelocity, radialAcceleration, maxAge, compareFn)
      }

      // apply the radial extents to the XYZ extents
      const maxRadial = Math.max(Math.abs(radialExtent[0]), Math.abs(radialExtent[1]))
      extent[0][0] -= maxRadial
      extent[0][1] -= maxRadial
      extent[0][2] -= data.radialType === "sphere" ? maxRadial : 0
      extent[1][0] += maxRadial
      extent[1][1] += maxRadial
      extent[1][2] += data.radialType === "sphere" ? maxRadial : 0

      // TODO consider particle size

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
    },

    updateWorldTransform: (function() {
      let position = new THREE.Vector3()
      let quaternion = new THREE.Quaternion()
      let scale = new THREE.Vector3()
      let dir = new THREE.Vector3()
      let offset = new THREE.Vector3()
      let velocity = new THREE.Vector3()
      let acceleration = new THREE.Vector3()
      let angularVelocity = new THREE.Vector3()
      let angularAcceleration = new THREE.Vector3()

      return function(emitterTime) {
        const data = this.data

        // the CPU provides the position, velocity, and acceleration parameters for each particle
        // (it is cheaper to do this on the CPU than the GPU because the values are set when 
        // the particles spawn)
        if (this.geometry) {
          const isWorldRelative = this.relative === "world"
          const spawnRate = this.data.spawnRate
          const isBurst = data.spawnType === "burst"
          const spawnDelta = isBurst ? 0 : 1/spawnRate // for burst particles spawn everything at once

          let instancePosition
          let instanceQuaternion
          let instanceID = this.geometry.getAttribute("instanceID")
          let instanceOffset = this.geometry.getAttribute("instanceOffset")
          let instanceVelocity = this.geometry.getAttribute("instanceVelocity")
          let instanceAcceleration = this.geometry.getAttribute("instanceAcceleration")
          let instanceAngularVelocity = this.geometry.getAttribute("instanceAngularVelocity")
          let instanceAngularAcceleration = this.geometry.getAttribute("instanceAngularAcceleration")

          if (isWorldRelative) {
            instancePosition = this.geometry.getAttribute("instancePosition")
            instanceQuaternion = this.geometry.getAttribute("instanceQuaternion")
            this.el.object3D.matrixWorld.decompose(position, quaternion, scale)

            this.geometry.boundingSphere.center.copy(position)
          }

          let startID = this.nextID
          let numSpawned = 0
          let id = startID

          // the nextTime represents the startTime for each particle, so while the nextTime
          // is less than this frame's time, keep emitting particles. Note, if the spawnRate is
          // low, we may have to wait several frames before a particle is emitted, but if the 
          // spawnRate is high we will emit several particles per frame
          while (this.nextTime <= emitterTime && numSpawned < this.count) {
            this.randomDir(dir)
            this.randomVec3PlusRadial(this.offset, this.radialOffset, dir, offset)
            this.randomVec3PlusRadial(this.velocity, this.radialVelocity, dir, velocity)
            this.randomVec3PlusRadial(this.acceleration, this.radialAcceleration, dir, acceleration)
            this.randomVec3(this.angularVelocity, angularVelocity)
            this.randomVec3(this.angularAcceleration, angularAcceleration)

            if (isWorldRelative) {
              instancePosition.setXYZ(id, position.x, position.y, position.z)
              instanceQuaternion.setXYZW(id, quaternion.x, quaternion.y, quaternion.z, quaternion.w)
            }

            id = this.nextID
            instanceID.setX(id, data.enable ? id : -1)
            instanceOffset.setXYZ(id, offset.x, offset.y, offset.z)
            instanceVelocity.setXYZ(id, velocity.x, velocity.y, velocity.z)
            instanceAcceleration.setXYZ(id, acceleration.x, acceleration.y, acceleration.z)
            instanceAngularVelocity.setXYZ(id, angularVelocity.x, angularVelocity.y, angularVelocity.z)
            instanceAngularAcceleration.setXYZ(id, angularAcceleration.x, angularAcceleration.y, angularAcceleration.z)

            numSpawned++
            this.nextTime += spawnDelta
            this.nextID = (this.nextID + 1) % this.count // wrap around to 0 if we'd emitted the last particle in our stack
          }

          if (numSpawned > 0) {
            this.params[ID_PARAM] = id

            if (isBurst) { // if we did burst emit, then wait for maxAge before emitting again
              this.nextTime += this.lifeTime[1]
            }

            // if the buffer was wrapped, we cannot send just the end and beginning of a buffer, so submit everything
            if (this.nextID < startID) { 
              startID = 0
              numSpawned = this.count
            }

            if (isWorldRelative) {
              instancePosition.updateRange.offset = startID
              instancePosition.updateRange.count = numSpawned
              instancePosition.needsUpdate = numSpawned > 0

              instanceQuaternion.updateRange.offset = startID
              instanceQuaternion.updateRange.count = numSpawned
              instanceQuaternion.needsUpdate = numSpawned > 0
            }

            instanceID.updateRange.offset = startID
            instanceID.updateRange.count = numSpawned
            instanceID.needsUpdate = numSpawned > 0

            instanceOffset.updateRange.offset = startID
            instanceOffset.updateRange.count = numSpawned
            instanceOffset.needsUpdate = numSpawned > 0

            instanceVelocity.updateRange.offset = startID
            instanceVelocity.updateRange.count = numSpawned
            instanceVelocity.needsUpdate = numSpawned > 0

            instanceAcceleration.updateRange.offset = startID
            instanceAcceleration.updateRange.count = numSpawned
            instanceAcceleration.needsUpdate = numSpawned > 0

            instanceAngularVelocity.updateRange.offset = startID
            instanceAngularVelocity.updateRange.count = numSpawned
            instanceAngularVelocity.needsUpdate = numSpawned > 0

            instanceAngularAcceleration.updateRange.offset = startID
            instanceAngularAcceleration.updateRange.count = numSpawned
            instanceAngularAcceleration.needsUpdate = numSpawned > 0
          }
        }
      }
    })(),

    onBeforeCompile(shader) {
      shader.uniforms.params = { value: this.params }
      shader.uniforms.colorOverTime = { value: this.colorOverTime }
      shader.uniforms.rotationScaleOverTime = { value: this.rotationScaleOverTime }

      // WARNING these shader replacements assume that the standard three.js shders are being used
      shader.vertexShader = shader.vertexShader.replace( "void main() {", MESH_PARTICLES_VERTEX_SHADER )
      
      shader.vertexShader = shader.vertexShader.replace( "#include <begin_vertex>", "" ) // transformed is calculated in MESH_PARTICLES_VERTEX_SHADER

      shader.fragmentShader = shader.fragmentShader.replace( "void main() {", `
        varying vec4 vInstanceColor;

        void main() {
      `)

      shader.fragmentShader = shader.fragmentShader.replace( "#include <color_fragment>", `
      #ifdef USE_COLOR
        diffuseColor.rgb *= vColor;
      #endif

        diffuseColor *= vInstanceColor;
      `)

      this.shader = shader
    },
  })

const MESH_PARTICLES_VERTEX_SHADER = `
attribute float instanceID;
attribute vec3 instanceOffset;
attribute vec3 instanceVelocity;
attribute vec3 instanceAcceleration;
attribute vec3 instanceAngularVelocity;
attribute vec3 instanceAngularAcceleration;

#if defined(WORLD_RELATIVE)
attribute vec3 instancePosition;
attribute vec4 instanceQuaternion;
#endif

uniform vec4 params[3];
uniform vec4 colorOverTime[OVER_TIME_ARRAY_LENGTH];
uniform vec4 rotationScaleOverTime[OVER_TIME_ARRAY_LENGTH];

varying vec4 vInstanceColor;

// each call to random will produce a different result by varying randI
float randI = 0.0;
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

float randFloatRange( const float range0, const float range1, const float seed )
{
  float lerps = random( seed );
  return mix( range0, range1, lerps );
}

// array lengths are stored in the first slot, followed by actual values from slot 1 onwards
// colors are packed min,max,min,max,min,max,...
// color is packed in xyz and opacity in w, and they may have different length arrays

vec4 calcColorOverTime( const float r, const float seed )
{
  vec3 color = vec3(1.0);
  float opacity = 1.0;
  int colorN = int( colorOverTime[0].x );
  int opacityN = int( colorOverTime[0].y );

  if ( colorN == 1 )
  {
    color = randVec3Range( colorOverTime[1].xyz, colorOverTime[2].xyz, seed );
  }
  else if ( colorN > 1 )
  {
    float ck = r * ( float( colorN ) - 1.0 );
    float ci = floor( ck );
    int i = int( ci )*2 + 1;
    vec3 sColor = randVec3Range( colorOverTime[i].xyz, colorOverTime[i + 1].xyz, seed );
    vec3 eColor = randVec3Range( colorOverTime[i + 2].xyz, colorOverTime[i + 3].xyz, seed );
    color = mix( sColor, eColor, ck - ci );
  }

  if ( opacityN == 1 )
  {
    opacity = randFloatRange( colorOverTime[1].w, colorOverTime[2].w, seed );
  }
  else if ( opacityN > 1 )
  {
    float ok = r * ( float( opacityN ) - 1.0 );
    float oi = floor( ok );
    int j = int( oi )*2 + 1;
    float sOpacity = randFloatRange( colorOverTime[j].w, colorOverTime[j + 1].w, seed );
    float eOpacity = randFloatRange( colorOverTime[j + 2].w, colorOverTime[j + 3].w, seed );
    opacity = mix( sOpacity, eOpacity, ok - oi );
  }

  return vec4( color, opacity );
}

// as per calcColorOverTime but euler rotation is packed in xyz and scale in w

vec4 calcRotationScaleOverTime( const float r, const float seed )
{
  vec3 rotation = vec3(0.);
  float scale = 1.0;
  int rotationN = int( rotationScaleOverTime[0].x );
  int scaleN = int( rotationScaleOverTime[0].y );

  if ( rotationN == 1 )
  {
    rotation = randVec3Range( rotationScaleOverTime[1].xyz, rotationScaleOverTime[2].xyz, seed );
  }
  else if ( rotationN > 1 )
  {
    float rk = r * ( float( rotationN ) - 1.0 );
    float ri = floor( rk );
    int i = int( ri )*2 + 1; // *2 because each range is 2 vectors, and +1 because the first vector is for the length info
    vec3 sRotation = randVec3Range( rotationScaleOverTime[i].xyz, rotationScaleOverTime[i + 1].xyz, seed );
    vec3 eRotation = randVec3Range( rotationScaleOverTime[i + 2].xyz, rotationScaleOverTime[i + 3].xyz, seed );
    rotation = mix( sRotation, eRotation, rk - ri );
  }

  if ( scaleN == 1 )
  {
    scale = randFloatRange( rotationScaleOverTime[1].w, rotationScaleOverTime[2].w, seed );
  }
  else if ( scaleN > 1 )
  {
    float sk = r * ( float( scaleN ) - 1.0 );
    float si = floor( sk );
    int j = int( si )*2 + 1; // *2 because each range is 2 vectors, and +1 because the first vector is for the length info
    float sScale = randFloatRange( rotationScaleOverTime[j].w, rotationScaleOverTime[j + 1].w, seed );
    float eScale = randFloatRange( rotationScaleOverTime[j + 2].w, rotationScaleOverTime[j + 3].w, seed );
    scale = mix( sScale, eScale, sk - si );
  }

  return vec4( rotation, scale );
}

// assumes euler order is YXZ (standard convention for AFrame)
vec4 eulerToQuaternion( const vec3 euler )
{
  // from https://github.com/mrdoob/three.js/blob/master/src/math/Quaternion.js

  vec3 c = cos( euler * 0.5 );
  vec3 s = sin( euler * 0.5 );

  return vec4(
    s.x * c.y * c.z + c.x * s.y * s.z,
    c.x * s.y * c.z - s.x * c.y * s.z,
    c.x * c.y * s.z - s.x * s.y * c.z,
    c.x * c.y * c.z + s.x * s.y * s.z
  );
}

vec3 applyQuaternion( const vec3 v, const vec4 q )
{
  return v + 2.0 * cross( q.xyz, cross( q.xyz, v ) + q.w * v );
}

void main() {
  float time = params[0].x;
  float ID0 = params[0].y;
  float radialType = params[0].z;
  float duration = params[0].w;
  float spawnType = params[1].x;
  float spawnDelta = params[1].y;
  float baseSeed = params[1].z;
  float instanceCount = params[1].w;
  float minAge = params[2].x;
  float maxAge = params[2].y;
  float loopTime = instanceCount * spawnDelta;
  float direction = params[2].z; // 0 is forward, 1 is backward
  float age = -1.0;
  float ageRatio = -1.0;
  float seed = 0.0;

  if (instanceID >= 0.0) {
    // particles are either emitted in a burst (spawnType == 0) or spread evenly
    // throughout 0..loopTime (spawnType == 1).  We calculate the ID of the last spawned particle ID0 
    // for this frame, any instance IDs after ID0 are assumed to belong to the previous loop

    float loop = floor( time / loopTime ) - spawnType * (instanceID > ID0 ? 1.0 : 0.0);
    float startTime = loop * loopTime + instanceID * spawnDelta * spawnType;
    age = startTime >= 0.0 ? time - startTime : -1.0; // if age is -1 we won't show the particle

    // we use the id as a seed for the randomizer, but because the IDs are fixed in 
    // the range 0..instanceCount we calculate a virtual ID by taking into account
    // the number of loops that have occurred (note, instanceIDs above ID0 are assumed 
    // to be in the previous loop).  We use the modoulo of the RANDOM_REPEAT_COUNT to
    // ensure that the virtualID doesn't exceed the floating point precision

    float virtualID = mod( instanceID + loop * instanceCount, float( RANDOM_REPEAT_COUNT ) );
    seed = mod(1664525.*virtualID*(baseSeed*11.) + 1013904223., 4294967296.)/4294967296.; // we don't have enough precision in 32-bit float, but results look ok

    float lifeTime = randFloatRange( minAge, maxAge, seed ); 

    // don't show particles that would be emitted after the duration
    if ( duration > 0.0 && time - age >= duration ) 
    {
      age = -1.0;
    }
    else
    {
      age = age + direction * ( loopTime - 2.0 * age );
    }

    // the ageRatio will be used for the lerps on over-time attributes
    ageRatio = age/lifeTime;
  }

vec3 transformed = vec3(0.0);
vInstanceColor = vec4(1.0);

if ( ageRatio >= 0.0 && ageRatio <= 1.0 ) 
{
  vec4 rotScale = calcRotationScaleOverTime( ageRatio, seed );
  vec4 rotationQuaternion = eulerToQuaternion( rotScale.xyz );

  transformed = rotScale.w * position.xyz;
  transformed = applyQuaternion( transformed, rotationQuaternion );

  vec3 velocity = ( instanceVelocity + 0.5 * instanceAcceleration * age );
  vec3 rotationalVelocity = ( instanceAngularVelocity + 0.5 * instanceAngularAcceleration * age );
  vec4 angularQuaternion = eulerToQuaternion( rotationalVelocity * age );

  transformed += applyQuaternion( instanceOffset + velocity * age, angularQuaternion );

#if defined(WORLD_RELATIVE)

  transformed += 2.0 * cross( instanceQuaternion.xyz, cross( instanceQuaternion.xyz, transformed ) + instanceQuaternion.w * transformed );
  transformed += instancePosition;

#endif

  vInstanceColor = calcColorOverTime( ageRatio, seed ); // rgba format
}`

})()

