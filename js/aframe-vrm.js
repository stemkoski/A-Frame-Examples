(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
  var __require = (x) => {
    if (typeof require !== "undefined")
      return require(x);
    throw new Error('Dynamic require of "' + x + '" is not supported');
  };
  var __reExport = (target, module, desc) => {
    if (module && typeof module === "object" || typeof module === "function") {
      for (let key of __getOwnPropNames(module))
        if (!__hasOwnProp.call(target, key) && key !== "default")
          __defProp(target, key, { get: () => module[key], enumerable: !(desc = __getOwnPropDesc(module, key)) || desc.enumerable });
    }
    return target;
  };
  var __toModule = (module) => {
    return __reExport(__markAsModule(__defProp(module != null ? __create(__getProtoOf(module)) : {}, "default", module && module.__esModule && "default" in module ? { get: () => module.default, enumerable: true } : { value: module, enumerable: true })), module);
  };

  // src/vrm/lookat.ts
  var VRMLookAt = class {
    constructor(initCtx) {
      this.target = null;
      this.angleLimit = 60 * Math.PI / 180;
      this._identQ = new THREE.Quaternion();
      this._zV = new THREE.Vector3(0, 0, -1);
      this._tmpQ0 = new THREE.Quaternion();
      this._tmpV0 = new THREE.Vector3();
      this._bone = initCtx.nodes[initCtx.vrm.firstPerson.firstPersonBone];
    }
    update(t) {
      let target = this.target;
      let bone = this._bone;
      if (target == null || bone == null) {
        return;
      }
      let targetDirection = bone.worldToLocal(this._tmpV0.setFromMatrixPosition(target.matrixWorld)).normalize();
      let rot = this._tmpQ0.setFromUnitVectors(this._zV, targetDirection);
      let boneLimit = this.angleLimit;
      let speedFactor = 0.08;
      let angle = 2 * Math.acos(rot.w);
      if (angle > boneLimit * 1.5) {
        rot = this._identQ;
        speedFactor = 0.04;
      } else if (angle > boneLimit) {
        rot.setFromAxisAngle(this._tmpV0.set(rot.x, rot.y, rot.z).normalize(), boneLimit);
      }
      bone.quaternion.slerp(rot, speedFactor);
    }
  };

  // src/vrm/blendshape.ts
  var VRMBlendShapeUtil = class {
    constructor(avatar) {
      this._currentShape = {};
      this._avatar = avatar;
    }
    setBlendShapeWeight(name, value) {
      this._currentShape[name] = value;
      if (value == 0) {
        delete this._currentShape[name];
      }
      this._updateBlendShape();
    }
    getBlendShapeWeight(name) {
      return this._currentShape[name] || 0;
    }
    resetBlendShape() {
      this._currentShape = {};
      this._updateBlendShape();
    }
    startBlink(blinkInterval) {
      if (this.animatedMorph) {
        return;
      }
      this.animatedMorph = {
        name: "BLINK",
        times: [0, blinkInterval - 0.2, blinkInterval - 0.1, blinkInterval],
        values: [0, 0, 1, 0]
      };
      this._updateBlendShape();
    }
    stopBlink() {
      this.animatedMorph = null;
      this._updateBlendShape();
    }
    _updateBlendShape() {
      let addWeights = (data, name, weights) => {
        let blend = this._avatar.blendShapes[name];
        blend && blend.binds.forEach((bind) => {
          let tname = bind.target.name;
          let values = data[tname] || (data[tname] = new Array(bind.target.morphTargetInfluences.length * weights.length).fill(0));
          for (let t = 0; t < weights.length; t++) {
            let i = t * bind.target.morphTargetInfluences.length + bind.index;
            values[i] += Math.max(bind.weight * weights[t], values[i]);
          }
        });
      };
      let times = [0], trackdata = {};
      if (this.animatedMorph) {
        times = this.animatedMorph.times;
        addWeights(trackdata, this.animatedMorph.name, this.animatedMorph.values);
      }
      for (let [name, value] of Object.entries(this._currentShape)) {
        if (this._avatar.blendShapes[name]) {
          addWeights(trackdata, name, new Array(times.length).fill(value));
        }
      }
      let tracks = Object.entries(trackdata).map(([tname, values]) => new THREE.NumberKeyframeTrack(tname + ".morphTargetInfluences", times, values));
      let nextAction = null;
      if (tracks.length > 0) {
        let clip = new THREE.AnimationClip("morph", void 0, tracks);
        nextAction = this._avatar.mixer.clipAction(clip).setEffectiveWeight(1).play();
      }
      this.morphAction && this.morphAction.stop();
      this.morphAction = nextAction;
    }
  };

  // src/vrm/firstperson.ts
  var FirstPersonMeshUtil = class {
    constructor(initCtx) {
      this._firstPersonBone = initCtx.nodes[initCtx.vrm.firstPerson.firstPersonBone];
      this._annotatedMeshes = initCtx.vrm.firstPerson.meshAnnotations.map((ma) => ({ flag: ma.firstPersonFlag, mesh: initCtx.meshes[ma.mesh] }));
    }
    setFirstPerson(firstPerson) {
      this._annotatedMeshes.forEach((a) => {
        if (a.flag == "ThirdPersonOnly") {
          a.mesh.visible = !firstPerson;
        } else if (a.flag == "FirstPersonOnly") {
          a.mesh.visible = firstPerson;
        } else if (a.flag == "Auto" && this._firstPersonBone) {
          if (firstPerson) {
            this._genFirstPersonMesh(a.mesh);
          } else {
            this._resetFirstPersonMesh(a.mesh);
          }
        }
      });
    }
    _genFirstPersonMesh(mesh) {
      mesh.children.forEach((c) => this._genFirstPersonMesh(c));
      if (!mesh.isSkinnedMesh) {
        return;
      }
      let firstPersonBones = {};
      this._firstPersonBone.traverse((b) => {
        firstPersonBones[b.uuid] = true;
      });
      let skeletonBones = mesh.skeleton.bones;
      let skinIndex = mesh.geometry.attributes.skinIndex;
      let skinWeight = mesh.geometry.attributes.skinWeight;
      let index = mesh.geometry.index;
      let vertexErase = [];
      let vcount = 0, fcount = 0;
      for (let i = 0; i < skinIndex.array.length; i++) {
        let b = skinIndex.array[i];
        if (skinWeight.array[i] > 0 && firstPersonBones[skeletonBones[b].uuid]) {
          if (!vertexErase[i / skinIndex.itemSize | 0]) {
            vcount++;
            vertexErase[i / skinIndex.itemSize | 0] = true;
          }
        }
      }
      let trinagleErase = [];
      for (let i = 0; i < index.count; i++) {
        if (vertexErase[index.array[i]] && !trinagleErase[i / 3 | 0]) {
          trinagleErase[i / 3 | 0] = true;
          fcount++;
        }
      }
      if (fcount == 0) {
        return;
      } else if (fcount * 3 == index.count) {
        mesh.visible = false;
        return;
      }
    }
    _resetFirstPersonMesh(mesh) {
      mesh.children.forEach((c) => this._resetFirstPersonMesh(c));
      mesh.visible = true;
    }
  };

  // src/vrm/avatar.ts
  var VRMLoader = class {
    constructor(gltfLoader) {
      this.gltfLoader = gltfLoader || new THREE.GLTFLoader(THREE.DefaultLoadingManager);
    }
    async load(url, moduleSpecs = []) {
      return new Promise((resolve, reject) => {
        this.gltfLoader.load(url, async (gltf) => {
          resolve(await new VRMAvatar(gltf).init(gltf, moduleSpecs));
        }, void 0, reject);
      });
    }
  };
  var VRMAvatar = class {
    constructor(gltf) {
      this.bones = {};
      this.blendShapes = {};
      this.modules = {};
      this.meta = {};
      this.firstPersonBone = null;
      this._firstPersonMeshUtil = null;
      this.boneConstraints = {
        "head": { type: "ball", limit: 60 * Math.PI / 180, twistAxis: new THREE.Vector3(0, 1, 0), twistLimit: 60 * Math.PI / 180 },
        "neck": { type: "ball", limit: 30 * Math.PI / 180, twistAxis: new THREE.Vector3(0, 1, 0), twistLimit: 10 * Math.PI / 180 },
        "leftUpperLeg": { type: "ball", limit: 170 * Math.PI / 180, twistAxis: new THREE.Vector3(0, -1, 0), twistLimit: Math.PI / 2 },
        "rightUpperLeg": { type: "ball", limit: 170 * Math.PI / 180, twistAxis: new THREE.Vector3(0, -1, 0), twistLimit: Math.PI / 2 },
        "leftLowerLeg": { type: "hinge", axis: new THREE.Vector3(1, 0, 0), min: -170 * Math.PI / 180, max: 0 * Math.PI / 180 },
        "rightLowerLeg": { type: "hinge", axis: new THREE.Vector3(1, 0, 0), min: -170 * Math.PI / 180, max: 0 * Math.PI / 180 }
      };
      this.model = gltf.scene;
      this.mixer = new THREE.AnimationMixer(this.model);
      this.isVRM = (gltf.userData.gltfExtensions || {}).VRM != null;
      this.animations = gltf.animations || [];
      this._blendShapeUtil = new VRMBlendShapeUtil(this);
    }
    async init(gltf, moduleSpecs) {
      if (!this.isVRM) {
        return this;
      }
      let vrmExt = gltf.userData.gltfExtensions.VRM;
      let bones = this.bones;
      let nodes = await gltf.parser.getDependencies("node");
      let meshes = await gltf.parser.getDependencies("mesh");
      let initCtx = { nodes, meshes, vrm: vrmExt, gltf };
      this.meta = vrmExt.meta;
      Object.values(vrmExt.humanoid.humanBones).forEach((humanBone) => {
        bones[humanBone.bone] = nodes[humanBone.node];
      });
      if (vrmExt.firstPerson) {
        if (vrmExt.firstPerson.firstPersonBone) {
          this.firstPersonBone = nodes[vrmExt.firstPerson.firstPersonBone];
          this.modules.lookat = new VRMLookAt(initCtx);
        }
        if (vrmExt.firstPerson.meshAnnotations) {
          this._firstPersonMeshUtil = new FirstPersonMeshUtil(initCtx);
        }
      }
      this.model.skeleton = new THREE.Skeleton(Object.values(bones));
      this._fixBoundingBox();
      if (vrmExt.blendShapeMaster) {
        this._initBlendShapes(initCtx);
      }
      for (let spec of moduleSpecs) {
        let mod = spec.instantiate(this, initCtx);
        if (mod) {
          this.modules[spec.name] = mod;
        }
      }
      return this;
    }
    _initBlendShapes(ctx) {
      this.blendShapes = (ctx.vrm.blendShapeMaster.blendShapeGroups || []).reduce((blendShapes, bg) => {
        let binds = bg.binds.flatMap((bind) => {
          let meshObj = ctx.meshes[bind.mesh];
          return (meshObj.isSkinnedMesh ? [meshObj] : meshObj.children.filter((obj) => obj.isSkinnedMesh)).map((obj) => ({ target: obj, index: bind.index, weight: bind.weight / 100 }));
        });
        blendShapes[(bg.presetName || bg.name).toUpperCase()] = { name: bg.name, binds };
        return blendShapes;
      }, {});
    }
    _fixBoundingBox() {
      let bones = this.bones;
      if (!bones.hips) {
        return;
      }
      let tmpV = new THREE.Vector3();
      let center = bones.hips.getWorldPosition(tmpV).clone();
      this.model.traverse((obj) => {
        let mesh = obj;
        if (mesh.isSkinnedMesh) {
          let pos = mesh.getWorldPosition(tmpV).sub(center).multiplyScalar(-1);
          let r = pos.clone().sub(mesh.geometry.boundingSphere.center).length() + mesh.geometry.boundingSphere.radius;
          mesh.geometry.boundingSphere.center.copy(pos);
          mesh.geometry.boundingSphere.radius = r;
          mesh.geometry.boundingBox.min.set(pos.x - r, pos.y - r, pos.z - r);
          mesh.geometry.boundingBox.max.set(pos.x + r, pos.y + r, pos.z + r);
        }
      });
    }
    update(timeDelta) {
      this.mixer.update(timeDelta);
      for (let m of Object.values(this.modules)) {
        m.update(timeDelta);
      }
    }
    setModule(name, module) {
      this.removeModule(name);
      this.modules[name] = module;
    }
    removeModule(name) {
      let module = this.modules[name];
      module && module.dispose && module.dispose();
      delete this.modules[name];
    }
    dispose() {
      for (let m of Object.keys(this.modules)) {
        this.removeModule(m);
      }
      this.model.traverse((obj) => {
        var _a;
        let mesh = obj;
        if (mesh.isMesh) {
          mesh.geometry.dispose();
          (_a = mesh.material.map) == null ? void 0 : _a.dispose();
        }
        obj.skeleton && obj.skeleton.dispose();
      });
    }
    get lookAtTarget() {
      let lookat = this.modules.lookat;
      return lookat ? lookat.target : null;
    }
    set lookAtTarget(v) {
      let lookat = this.modules.lookat;
      if (lookat) {
        lookat.target = v;
      }
    }
    setBlendShapeWeight(name, value) {
      this._blendShapeUtil.setBlendShapeWeight(name, value);
    }
    getBlendShapeWeight(name) {
      return this._blendShapeUtil.getBlendShapeWeight(name);
    }
    resetBlendShape() {
      this._blendShapeUtil.resetBlendShape();
    }
    startBlink(blinkInterval) {
      this._blendShapeUtil.startBlink(blinkInterval);
    }
    stopBlink() {
      this._blendShapeUtil.stopBlink();
    }
    getPose(exportMorph) {
      let poseData = {
        bones: Object.keys(this.bones).map((name) => ({ name, q: this.bones[name].quaternion.toArray() }))
      };
      if (exportMorph) {
        poseData.blendShape = Object.keys(this.blendShapes).map((name) => ({ name, value: this.getBlendShapeWeight(name) }));
      }
      return poseData;
    }
    setPose(pose) {
      if (pose.bones) {
        for (let boneParam of pose.bones) {
          if (this.bones[boneParam.name]) {
            this.bones[boneParam.name].quaternion.fromArray(boneParam.q);
          }
        }
      }
      if (pose.blendShape) {
        for (let morph of pose.blendShape) {
          this.setBlendShapeWeight(morph.name, morph.value);
        }
      }
    }
    restPose() {
      for (let b of Object.values(this.bones)) {
        b.quaternion.set(0, 0, 0, 1);
      }
    }
    setFirstPerson(firstPerson) {
      if (this._firstPersonMeshUtil) {
        this._firstPersonMeshUtil.setFirstPerson(firstPerson);
      }
    }
  };

  // src/utils/physics-cannon.ts
  var VRMPhysicsCannonJS = class {
    constructor(initctx) {
      this.collisionGroup = 2;
      this.enable = false;
      this.binds = [];
      this.fixedBinds = [];
      this.bodies = [];
      this.constraints = [];
      this._tmpQ0 = new THREE.Quaternion();
      this._tmpV0 = new THREE.Vector3();
      this._tmpV1 = new THREE.Vector3();
      this.world = null;
      this.internalWorld = false;
      this.springBoneSystem = this._springBoneSystem();
      this._init(initctx);
    }
    _init(initctx) {
      if (!initctx.vrm.secondaryAnimation) {
        return;
      }
      let nodes = initctx.nodes;
      let secondaryAnimation = initctx.vrm.secondaryAnimation;
      let allColliderGroupsMask = 0;
      let colliderMarginFactor = 0.9;
      (secondaryAnimation.colliderGroups || []).forEach((cc, i) => {
        let node = nodes[cc.node];
        for (let collider of cc.colliders) {
          let body = new CANNON.Body({ mass: 0, collisionFilterGroup: 1 << this.collisionGroup + i + 1, collisionFilterMask: -1 });
          body.addShape(new CANNON.Sphere(collider.radius * colliderMarginFactor), collider.offset);
          this.bodies.push(body);
          this.fixedBinds.push([node, body]);
          allColliderGroupsMask |= body.collisionFilterGroup;
        }
      });
      for (let bg of secondaryAnimation.boneGroups || []) {
        let gravity = new CANNON.Vec3().copy(bg.gravityDir || { x: 0, y: -1, z: 0 }).scale(bg.gravityPower || 0);
        let radius = bg.hitRadius || 0.05;
        let collisionFilterMask = ~(this.collisionGroup | allColliderGroupsMask);
        for (let g of bg.colliderGroups || []) {
          collisionFilterMask |= 1 << this.collisionGroup + g + 1;
        }
        for (let b of bg.bones) {
          let root = new CANNON.Body({ mass: 0, collisionFilterGroup: 0, collisionFilterMask: 0 });
          root.position.copy(nodes[b].parent.getWorldPosition(this._tmpV0));
          this.bodies.push(root);
          this.fixedBinds.push([nodes[b].parent, root]);
          let add = (parentBody, node) => {
            let c = node.getWorldPosition(this._tmpV0);
            let wpos = c.clone();
            let n = node.children.length + 1;
            if (node.children.length > 0) {
              node.children.forEach((n2) => {
                c.add(n2.getWorldPosition(this._tmpV1));
              });
            } else {
              c.add(node.parent.getWorldPosition(this._tmpV1).sub(c).normalize().multiplyScalar(-0.1).add(c));
              n = 2;
            }
            c.multiplyScalar(1 / n);
            let body = new CANNON.Body({
              mass: 0.5,
              linearDamping: Math.max(bg.dragForce || 0, 1e-4),
              angularDamping: Math.max(bg.dragForce || 0, 1e-4),
              collisionFilterGroup: this.collisionGroup,
              collisionFilterMask,
              position: new CANNON.Vec3().copy(c)
            });
            body.addShape(new CANNON.Sphere(radius));
            this.bodies.push(body);
            let o = new CANNON.Vec3().copy(this._tmpV1.copy(wpos).sub(c));
            let d = new CANNON.Vec3().copy(wpos.sub(parentBody.position));
            let joint = new CANNON.PointToPointConstraint(body, o, parentBody, d);
            this.constraints.push(joint);
            let l = body.position.distanceTo(parentBody.position);
            this.binds.push([node, body]);
            this.springBoneSystem.objects.push({ body, parentBody, force: gravity, boneGroup: bg, size: radius, distanceToParent: l });
            node.children.forEach((n2) => n2.isBone && add(body, n2));
          };
          add(root, nodes[b]);
        }
      }
    }
    _springBoneSystem() {
      let _q0 = new CANNON.Quaternion();
      let _q1 = new CANNON.Quaternion();
      let _v0 = new CANNON.Vec3();
      return {
        world: null,
        objects: [],
        update() {
          let g = this.world.gravity, dt = this.world.dt;
          let avlimit = 0.1;
          let stiffnessScale = 1600;
          for (let b of this.objects) {
            let body = b.body, parent = b.parentBody;
            let f = body.force, m = body.mass, g2 = b.force;
            f.x += m * (-g.x + g2.x);
            f.y += m * (-g.y + g2.y);
            f.z += m * (-g.z + g2.z);
            let d = body.position.distanceTo(parent.position);
            if (Math.abs(d - b.distanceToParent) > 0.01 && d > 0) {
              parent.position.lerp(body.position, b.distanceToParent / d, body.position);
            }
            let av = body.angularVelocity.length();
            if (av > avlimit) {
              body.angularVelocity.scale(avlimit / av, body.angularVelocity);
            }
            let approxInertia = b.size * b.size * m;
            let rot = body.quaternion.mult(parent.quaternion.inverse(_q0), _q1);
            let [axis, angle] = rot.toAxisAngle(_v0);
            angle = angle - Math.PI * 2 * Math.floor((angle + Math.PI) / (Math.PI * 2));
            let tf = angle * b.boneGroup.stiffiness * stiffnessScale;
            if (Math.abs(tf) > Math.abs(angle / dt / dt * 0.5)) {
              tf = angle / dt / dt * 0.5;
            }
            let af = axis.scale(-tf * approxInertia, axis);
            body.torque.vadd(af, body.torque);
          }
        }
      };
    }
    attach(world) {
      this.detach();
      this.internalWorld = world == null;
      this.world = world || new CANNON.World();
      this.springBoneSystem.world = this.world;
      this.world.subsystems.push(this.springBoneSystem);
      this.bodies.forEach((b) => this.world.addBody(b));
      this.constraints.forEach((c) => this.world.addConstraint(c));
      this.reset();
      this.enable = true;
      this.world.bodies.forEach((b) => {
        if (b.collisionFilterGroup == 1 && b.collisionFilterMask == 1) {
          b.collisionFilterMask = -1;
        }
      });
    }
    detach() {
      if (!this.world) {
        return;
      }
      this.world.subsystems = this.world.subsystems.filter((s) => s != this.springBoneSystem);
      this.world.constraints = this.world.constraints.filter((c) => !this.constraints.includes(c));
      this.world.bodies = this.world.bodies.filter((b) => !this.bodies.includes(b));
      this.world = null;
      this.enable = false;
    }
    reset() {
      this.fixedBinds.forEach(([node, body]) => {
        node.updateWorldMatrix(true, false);
        body.position.copy(node.getWorldPosition(this._tmpV0));
        body.quaternion.copy(node.parent.getWorldQuaternion(this._tmpQ0));
      });
      this.binds.forEach(([node, body]) => {
        node.updateWorldMatrix(true, false);
        body.position.copy(node.getWorldPosition(this._tmpV0));
        body.quaternion.copy(node.getWorldQuaternion(this._tmpQ0));
      });
    }
    update(timeDelta) {
      if (!this.enable) {
        return;
      }
      this.fixedBinds.forEach(([node, body]) => {
        body.position.copy(node.getWorldPosition(this._tmpV0));
        body.quaternion.copy(node.getWorldQuaternion(this._tmpQ0));
      });
      if (this.internalWorld) {
        this.world.step(1 / 60, timeDelta);
      }
      this.binds.forEach(([node, body]) => {
        node.quaternion.copy(body.quaternion).premultiply(node.parent.getWorldQuaternion(this._tmpQ0).invert());
      });
    }
    dispose() {
      this.detach();
    }
  };

  // src/utils/simpleik.ts
  var IKNode = class {
    constructor(position, constraint, userData) {
      this.quaternion = new THREE.Quaternion();
      this.worldMatrix = new THREE.Matrix4();
      this.worldPosition = new THREE.Vector3();
      this.position = position;
      this.constraint = constraint;
      this.userData = userData;
    }
  };
  var IKSolver = class {
    constructor() {
      this.iterationLimit = 50;
      this.thresholdSq = 1e-4;
      this._iv = new THREE.Vector3(1, 1, 1);
      this._tmpV0 = new THREE.Vector3();
      this._tmpV1 = new THREE.Vector3();
      this._tmpV2 = new THREE.Vector3();
      this._tmpQ0 = new THREE.Quaternion();
      this._tmpQ1 = new THREE.Quaternion();
    }
    _updateChain(bones, parentMat) {
      for (let bone of bones) {
        bone.worldMatrix.compose(bone.position, bone.quaternion, this._iv).premultiply(parentMat);
        bone.worldPosition.setFromMatrixPosition(bone.worldMatrix);
        parentMat = bone.worldMatrix;
      }
    }
    solve(bones, target, boneSpaceMat) {
      this._updateChain(bones, boneSpaceMat);
      let endPosition = bones[bones.length - 1].worldPosition;
      let startDistance = endPosition.distanceToSquared(target);
      let targetDir = this._tmpV2;
      let endDir = this._tmpV1;
      let rotation = this._tmpQ1;
      for (let i = 0; i < this.iterationLimit; i++) {
        if (endPosition.distanceToSquared(target) < this.thresholdSq) {
          break;
        }
        let currentTarget = this._tmpV0.copy(target);
        for (let j = bones.length - 2; j >= 0; j--) {
          let bone = bones[j];
          let endPos = bones[j + 1].position;
          bone.worldMatrix.decompose(this._tmpV1, this._tmpQ0, this._tmpV2);
          targetDir.copy(currentTarget).sub(this._tmpV1).applyQuaternion(rotation.copy(this._tmpQ0).invert()).normalize();
          endDir.copy(endPos).normalize();
          rotation.setFromUnitVectors(endDir, targetDir);
          bone.quaternion.multiply(rotation);
          let v = endDir.copy(endPos).applyQuaternion(this._tmpQ0.multiply(rotation));
          if (bone.constraint) {
            rotation.copy(bone.quaternion).invert();
            if (bone.constraint.apply(bone)) {
              rotation.premultiply(bone.quaternion);
              v.copy(endPos).applyQuaternion(this._tmpQ0.multiply(rotation));
            }
          }
          currentTarget.sub(v);
        }
        this._updateChain(bones, boneSpaceMat);
      }
      return endPosition.distanceToSquared(target) < startDistance;
    }
  };

  // src/utils/vmd.ts
  var VMDLoaderWrapper = class {
    constructor() {
      this.boneMapping = [
        { "bone": "hips", "nodeNames": ["\u30BB\u30F3\u30BF\u30FC", "center"] },
        { "bone": "spine", "nodeNames": ["\u4E0A\u534A\u8EAB", "upper body"] },
        { "bone": "chest", "nodeNames": ["\u4E0A\u534A\u8EAB2", "upper body2"] },
        { "bone": "neck", "nodeNames": ["\u9996", "neck"] },
        { "bone": "head", "nodeNames": ["\u982D", "head"] },
        { "bone": "leftShoulder", "nodeNames": ["\u5DE6\u80A9", "shoulder_L"] },
        { "bone": "leftUpperArm", "nodeNames": ["\u5DE6\u8155", "arm_L"] },
        { "bone": "leftLowerArm", "nodeNames": ["\u5DE6\u3072\u3058", "elbow_L"] },
        { "bone": "leftHand", "nodeNames": ["\u5DE6\u624B\u9996", "wrist_L"] },
        { "bone": "rightShoulder", "nodeNames": ["\u53F3\u80A9", "shoulder_R"] },
        { "bone": "rightUpperArm", "nodeNames": ["\u53F3\u8155", "arm_R"] },
        { "bone": "rightLowerArm", "nodeNames": ["\u53F3\u3072\u3058", "elbow_R"] },
        { "bone": "rightHand", "nodeNames": ["\u53F3\u624B\u9996", "wrist_R"] },
        { "bone": "leftUpperLeg", "nodeNames": ["\u5DE6\u8DB3", "leg_L"] },
        { "bone": "leftLowerLeg", "nodeNames": ["\u5DE6\u3072\u3056", "knee_L"] },
        { "bone": "leftFoot", "nodeNames": ["\u5DE6\u8DB3\u9996", "ankle_L"] },
        { "bone": "leftToes", "nodeNames": ["\u5DE6\u3064\u307E\u5148", "L toe"] },
        { "bone": "rightUpperLeg", "nodeNames": ["\u53F3\u8DB3", "leg_R"] },
        { "bone": "rightLowerLeg", "nodeNames": ["\u53F3\u3072\u3056", "knee_R"] },
        { "bone": "rightFoot", "nodeNames": ["\u53F3\u8DB3\u9996", "ankle_R"] },
        { "bone": "rightToes", "nodeNames": ["\u53F3\u3064\u307E\u5148", "R toe"] },
        { "bone": "leftEye", "nodeNames": ["\u5DE6\u76EE", "eye_L"] },
        { "bone": "rightEye", "nodeNames": ["\u53F3\u76EE", "eye_R"] },
        { "bone": "leftThumbProximal", "nodeNames": ["\u5DE6\u89AA\u6307\uFF10", "thumb0_L"] },
        { "bone": "leftThumbIntermediate", "nodeNames": ["\u5DE6\u89AA\u6307\uFF11", "thumb1_L"] },
        { "bone": "leftThumbDistal", "nodeNames": ["\u5DE6\u89AA\u6307\uFF12", "thumb2_L"] },
        { "bone": "leftIndexProximal", "nodeNames": ["\u5DE6\u4EBA\u6307\uFF11", "fore1_L"] },
        { "bone": "leftIndexIntermediate", "nodeNames": ["\u5DE6\u4EBA\u6307\uFF12", "fore2_L"] },
        { "bone": "leftIndexDistal", "nodeNames": ["\u5DE6\u4EBA\u6307\uFF13", "fore3_L"] },
        { "bone": "leftMiddleProximal", "nodeNames": ["\u5DE6\u4E2D\u6307\uFF11", "middle1_L"] },
        { "bone": "leftMiddleIntermediate", "nodeNames": ["\u5DE6\u4E2D\u6307\uFF12", "middle2_L"] },
        { "bone": "leftMiddleDistal", "nodeNames": ["\u5DE6\u4E2D\u6307\uFF13", "middle3_L"] },
        { "bone": "leftRingProximal", "nodeNames": ["\u5DE6\u85AC\u6307\uFF11", "third1_L"] },
        { "bone": "leftRingIntermediate", "nodeNames": ["\u5DE6\u85AC\u6307\uFF12", "third2_L"] },
        { "bone": "leftRingDistal", "nodeNames": ["\u5DE6\u85AC\u6307\uFF13", "third3_L"] },
        { "bone": "leftLittleProximal", "nodeNames": ["\u5DE6\u5C0F\u6307\uFF11", "little1_L"] },
        { "bone": "leftLittleIntermediate", "nodeNames": ["\u5DE6\u5C0F\u6307\uFF12", "little2_L"] },
        { "bone": "leftLittleDistal", "nodeNames": ["\u5DE6\u5C0F\u6307\uFF13", "little3_L"] },
        { "bone": "rightThumbProximal", "nodeNames": ["\u53F3\u89AA\u6307\uFF10", "thumb0_R"] },
        { "bone": "rightThumbIntermediate", "nodeNames": ["\u53F3\u89AA\u6307\uFF11", "thumb1_R"] },
        { "bone": "rightThumbDistal", "nodeNames": ["\u53F3\u89AA\u6307\uFF12", "thumb2_R"] },
        { "bone": "rightIndexProximal", "nodeNames": ["\u53F3\u4EBA\u6307\uFF11", "fore1_R"] },
        { "bone": "rightIndexIntermediate", "nodeNames": ["\u53F3\u4EBA\u6307\uFF12", "fore2_R"] },
        { "bone": "rightIndexDistal", "nodeNames": ["\u53F3\u4EBA\u6307\uFF13", "fore3_R"] },
        { "bone": "rightMiddleProximal", "nodeNames": ["\u53F3\u4E2D\u6307\uFF11", "middle1_R"] },
        { "bone": "rightMiddleIntermediate", "nodeNames": ["\u53F3\u4E2D\u6307\uFF12", "middle2_R"] },
        { "bone": "rightMiddleDistal", "nodeNames": ["\u53F3\u4E2D\u6307\uFF13", "middle3_R"] },
        { "bone": "rightRingProximal", "nodeNames": ["\u53F3\u85AC\u6307\uFF11", "third1_R"] },
        { "bone": "rightRingIntermediate", "nodeNames": ["\u53F3\u85AC\u6307\uFF12", "third2_R"] },
        { "bone": "rightRingDistal", "nodeNames": ["\u53F3\u85AC\u6307\uFF13", "third3_R"] },
        { "bone": "rightLittleProximal", "nodeNames": ["\u53F3\u5C0F\u6307\uFF11", "little1_R"] },
        { "bone": "rightLittleIntermediate", "nodeNames": ["\u53F3\u5C0F\u6307\uFF12", "little2_R"] },
        { "bone": "rightLittleDistal", "nodeNames": ["\u53F3\u5C0F\u6307\uFF13", "little3_R"] }
      ];
      this.blendShapeMap = {
        "A": "\u3042",
        "I": "\u3044",
        "U": "\u3046",
        "E": "\u3048",
        "O": "\u304A",
        "BLINK": "\u307E\u3070\u305F\u304D"
      };
      this.rotationOffsets = {
        "leftUpperArm": -38 * THREE.MathUtils.DEG2RAD,
        "rightUpperArm": 38 * THREE.MathUtils.DEG2RAD
      };
      this.ikConfigs = [
        { target: "\u5DE6\u8DB3\uFF29\uFF2B", bones: [`leftFoot`, "leftLowerLeg", "leftUpperLeg"] },
        { target: "\u53F3\u8DB3\uFF29\uFF2B", bones: [`rightFoot`, "rightLowerLeg", "rightUpperLeg"] },
        { target: "\u5DE6\u3064\u307E\u5148\uFF29\uFF2B", parent: 0, bones: [`leftToes`, `leftFoot`] },
        { target: "\u53F3\u3064\u307E\u5148\uFF29\uFF2B", parent: 1, bones: [`rightToes`, `rightFoot`] }
      ];
      this.boneConstraints = {
        "leftLowerLeg": { min: new THREE.Vector3(-175 * Math.PI / 180, 0, 0), max: new THREE.Vector3(0, 0, 0) },
        "rightLowerLeg": { min: new THREE.Vector3(-175 * Math.PI / 180, 0, 0), max: new THREE.Vector3(0, 0, 0) },
        "leftUpperLeg": { min: new THREE.Vector3(-Math.PI / 2, -Math.PI / 2, -Math.PI / 2), max: new THREE.Vector3(Math.PI, Math.PI / 2, Math.PI / 2) },
        "rightUpperLeg": { min: new THREE.Vector3(-Math.PI / 2, -Math.PI / 2, -Math.PI / 2), max: new THREE.Vector3(Math.PI, Math.PI / 2, Math.PI / 2) }
      };
    }
    async load(url, vrm, options) {
      // let { MMDLoader } = await import("https://threejs.org/examples/jsm/loaders/MMDLoader.js");
      // let { CCDIKSolver } = await import("https://threejs.org/examples/jsm/animation/CCDIKSolver.js");
      let loader = new MMDLoader();
      let nameMap = {};
      for (let m of this.boneMapping) {
        let boneObj = vrm.bones[m.bone];
        if (boneObj) {
          for (let name of m.nodeNames) {
            nameMap[name] = boneObj.name;
          }
        }
      }
      let rotationOffsets = {};
      let boneTransforms = {};
      for (let [name, r] of Object.entries(this.rotationOffsets)) {
        let boneObj = vrm.bones[name];
        if (boneObj) {
          rotationOffsets[boneObj.name] = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), r);
          boneObj.traverse((o) => {
            boneTransforms[o.name] = [Math.cos(r), Math.sin(r)];
          });
        }
      }
      let morphTargetDictionary = {};
      for (let [name, morph] of Object.entries(this.blendShapeMap)) {
        let b = vrm.blendShapes[name];
        if (b) {
          morphTargetDictionary[morph] = name;
        }
      }
      vrm.model.morphTargetDictionary = morphTargetDictionary;
      let scale = 0.08;
      let rotY = (p, t) => {
        [p[0], p[2]] = [
          p[0] * t[0] - p[2] * t[1],
          p[0] * t[1] + p[2] * t[0]
        ];
      };
      let rotZ = (p, t) => {
        [p[0], p[1]] = [
          p[0] * t[0] - p[1] * t[1],
          p[0] * t[1] + p[1] * t[0]
        ];
      };
      let rot = new THREE.Quaternion();
      let rot2 = new THREE.Quaternion();
      return await new Promise((resolve, reject) => {
        loader.loadVMD(url, async (vmd) => {
          let lowerBody = vmd.motions.filter((m) => m.boneName == "\u4E0B\u534A\u8EAB");
          if (lowerBody.length) {
            lowerBody.sort((a, b) => a.frameNum - b.frameNum);
            let update = (target, inv) => {
              target.sort((a, b) => a.frameNum - b.frameNum);
              let i = 0;
              for (let m of target) {
                while (i < lowerBody.length - 1 && m.frameNum > lowerBody[i].frameNum) {
                  i++;
                }
                let r = rot2.fromArray(lowerBody[i].rotation);
                if (i > 0 && m.frameNum < lowerBody[i].frameNum) {
                  let t = (m.frameNum - lowerBody[i - 1].frameNum) / (lowerBody[i].frameNum - lowerBody[i - 1].frameNum);
                  r.slerp(rot.fromArray(lowerBody[i - 1].rotation), 1 - t);
                }
                if (inv)
                  r.invert();
                m.rotation = rot.fromArray(m.rotation).multiply(r).toArray();
              }
            };
            update(vmd.motions.filter((m) => m.boneName == "\u30BB\u30F3\u30BF\u30FC"), false);
            update(vmd.motions.filter((m) => m.boneName == "\u4E0A\u534A\u8EAB"), true);
            lowerBody.forEach((m) => m.rotation = [0, 0, 0, 1]);
          }
          for (let m of vmd.motions) {
            if (nameMap[m.boneName]) {
              m.boneName = nameMap[m.boneName];
            }
            let r = rotationOffsets[m.boneName];
            if (r) {
              m.rotation = rot.fromArray(m.rotation).premultiply(r).toArray();
            }
            m.position[0] *= scale;
            m.position[1] *= scale;
            m.position[2] *= scale;
            rotY(m.position, [-1, 0]);
            rotY(m.rotation, [-1, 0]);
            let t = boneTransforms[m.boneName];
            if (t) {
              rotZ(m.position, t);
              rotZ(m.rotation, t);
            }
          }
          if (options.enableIK) {
            let skeletonBones = vrm.model.skeleton.bones;
            let getTargetBone = (config) => {
              let targetIndex = skeletonBones.findIndex((b) => b.name == config.target);
              if (targetIndex >= 0) {
                return targetIndex;
              }
              let parentObj = config.parent != null ? skeletonBones[getTargetBone(this.ikConfigs[config.parent])] : vrm.model;
              let dummyBone = new THREE.Bone();
              dummyBone.name = config.target;
              skeletonBones.push(dummyBone);
              parentObj.add(dummyBone);
              parentObj.updateMatrixWorld();
              let initPos = vrm.bones[config.bones[0]].getWorldPosition(new THREE.Vector3());
              dummyBone.position.copy(initPos.applyMatrix4(parentObj.matrixWorld.clone().invert()));
              return skeletonBones.length - 1;
            };
            let iks = [];
            for (let config of this.ikConfigs) {
              if (vmd.motions.find((m) => m.boneName == config.target) == void 0) {
                continue;
              }
              let boneIndex = (name) => skeletonBones.findIndex((b) => b == vrm.bones[name]);
              let effectorIndex = boneIndex(config.bones[0]);
              if (effectorIndex < 0) {
                continue;
              }
              let links = [];
              config.bones.slice(1).forEach((name) => {
                let index = boneIndex(name);
                if (index >= 0) {
                  let link = { index };
                  let constraint = this.boneConstraints[name];
                  if (constraint) {
                    link.rotationMax = constraint.max;
                    link.rotationMin = constraint.min;
                  }
                  links.push(link);
                }
              });
              let ik = {
                target: getTargetBone(config),
                effector: effectorIndex,
                links,
                maxAngle: 1,
                iteration: 4
              };
              iks.push(ik);
            }
            if (iks.length > 0) {
              console.log(iks);
              let ikSolver = new CCDIKSolver(vrm.model, iks);
              vrm.setModule("MMDIK", { update: (t) => ikSolver.update() });
            }
          }
          let clip = loader.animationBuilder.build(vmd, vrm.model);
          clip.tracks.forEach((tr) => {
            let m = tr.name.match(/.morphTargetInfluences\[(\w+)\]/);
            if (m) {
              let b = vrm.blendShapes[m[1]];
              if (b && b.binds.length > 0) {
                tr.name = b.binds[0].target.uuid + ".morphTargetInfluences[" + b.binds[0].index + "]";
              }
            }
          });
          resolve(clip);
        }, () => {
        }, reject);
      });
    }
  };

  // src/utils/bvh.ts
  var BVHLoaderWrapper = class {
    async load(url, avatar, options) {
      // let { BVHLoader } = await import("https://threejs.org/examples/jsm/loaders/BVHLoader.js");
      return await new Promise((resolve, reject) => {
        new BVHLoader().load(url, (result) => {
          if (options.convertBone) {
            this.fixTrackName(result.clip, avatar);
          }
          result.clip.tracks = result.clip.tracks.filter((t) => !t.name.match(/position/) || t.name.match(avatar.bones.hips.name));
          resolve(result.clip);
        });
      });
    }
    convertBoneName(name) {
      name = name.replace("Spin1", "Spin");
      name = name.replace("Chest1", "Chest");
      name = name.replace("Chest2", "UpperChest");
      name = name.replace("UpLeg", "UpperLeg");
      name = name.replace("LeftLeg", "LeftLowerLeg");
      name = name.replace("RightLeg", "RightLowerLeg");
      name = name.replace("ForeArm", "UpperArm");
      name = name.replace("LeftArm", "LeftLowerArm");
      name = name.replace("RightArm", "RightLowerArm");
      name = name.replace("Collar", "Shoulder");
      name = name.replace("Elbow", "LowerArm");
      name = name.replace("Wrist", "Hand");
      name = name.replace("LeftHip", "LeftUpperLeg");
      name = name.replace("RightHip", "RightUpperLeg");
      name = name.replace("Knee", "LowerLeg");
      name = name.replace("Ankle", "Foot");
      return name.charAt(0).toLowerCase() + name.slice(1);
    }
    fixTrackName(clip, avatar) {
      clip.tracks.forEach((t) => {
        t.name = t.name.replace(/bones\[(\w+)\]/, (m, name) => {
          let bone = avatar.bones[this.convertBoneName(name)];
          return "bones[" + (bone != null ? bone.name : "NODE_NOT_FOUND") + "]";
        });
        t.name = t.name.replace("ToeBase", "Foot");
        if (t.name.match(/quaternion/)) {
          t.values = t.values.map((v, i) => i % 2 === 0 ? -v : v);
        }
        if (t.name.match(/position/)) {
          t.values = t.values.map((v, i) => (i % 3 === 1 ? v : -v) * 0.09);
        }
      });
      clip.tracks = clip.tracks.filter((t) => !t.name.match(/NODE_NOT_FOUND/));
    }
  };

  // src/aframe-vrm.js
  AFRAME.registerComponent("vrm", {
    schema: {
      src: { default: "" },
      firstPerson: { default: false },
      blink: { default: true },
      blinkInterval: { default: 5 },
      lookAt: { type: "selector" },
      enablePhysics: { default: false }
    },
    init() {
      this.avatar = null;
    },
    update(oldData) {
      if (this.data.src !== oldData.src) {
        this.remove();
        this._loadAvatar();
      }
      this._updateAvatar();
    },
    tick(time, timeDelta) {
      if (!this.avatar) {
        this.pause();
        return;
      }
      this.avatar.update(timeDelta / 1e3);
    },
    remove() {
      if (this.avatar) {
        this.el.removeObject3D("avatar");
        this.avatar.dispose();
      }
    },
    async _loadAvatar() {
      let el = this.el;
      let url = this.data.src;
      if (!url) {
        return;
      }
      try {
        let moduleSpecs = [];
        if (globalThis.CANNON) {
          moduleSpecs.push({ name: "physics", instantiate: (a, ctx) => new VRMPhysicsCannonJS(ctx) });
        }
        let avatar = await new VRMLoader().load(url, moduleSpecs);
        if (url != this.data.src) {
          avatar.dispose();
          return;
        }
        this.avatar = avatar;
        el.setObject3D("avatar", avatar.model);
        this._updateAvatar();
        this.play();
        el.emit("model-loaded", { format: "vrm", model: avatar.model, avatar }, false);
      } catch (e) {
        el.emit("model-error", { format: "vrm", src: url, cause: e }, false);
      }
    },
    _updateAvatar() {
      if (!this.avatar) {
        return;
      }
      let data = this.data;
      this.avatar.setFirstPerson(data.firstPerson);
      if (data.lookAt) {
        if (data.lookAt.tagName == "A-CAMERA") {
          this.avatar.lookAtTarget = this.el.sceneEl.camera;
        } else {
          this.avatar.lookAtTarget = data.lookAt.object3D;
        }
      } else {
        this.avatar.lookAtTarget = null;
      }
      if (data.blink) {
        this.avatar.startBlink(data.blinkInterval);
      } else {
        this.avatar.stopBlink();
      }
      let physics = this.avatar.modules.physics;
      if (physics) {
        if (data.enablePhysics && physics.world == null) {
          let engine = this.el.sceneEl.systems.physics;
          physics.attach(engine && engine.driver && engine.driver.world);
        }
        physics.enable = data.enablePhysics;
      }
    }
  });
  AFRAME.registerComponent("vrm-anim", {
    schema: {
      src: { default: "" },
      format: { default: "" },
      loop: { default: true },
      enableIK: { default: true },
      convertBone: { default: true }
    },
    init() {
      this.avatar = null;
      if (this.el.components.vrm && this.el.components.vrm.avatar) {
        this.avatar = this.el.components.vrm.avatar;
      }
      this.onVrmLoaded = (ev) => {
        this.avatar = ev.detail.avatar;
        if (this.data.src != "") {
          this._loadClip(this.data.src);
        } else if (this.avatar.animations.length > 0) {
          this.playClip(this.avatar.animations[0]);
        } else {
          this.playTestMotion();
        }
      };
      this.el.addEventListener("model-loaded", this.onVrmLoaded);
    },
    update(oldData) {
      if (oldData.src != this.data.src && this.avatar) {
        this._loadClip(this.data.src);
      }
    },
    async _loadClip(url) {
      this.stopAnimation();
      this.avatar.restPose();
      if (url === "") {
        return;
      }
      let loop = this.data.loop ? THREE.LoopRepeat : THREE.LoopOnce;
      let format = this.data.format || (url.toLowerCase().endsWith(".bvh") ? "bvh" : "");
      let loader = format == "bvh" ? new BVHLoaderWrapper() : new VMDLoaderWrapper();
      let clip = await loader.load(url, this.avatar, this.data);
      if (!this.avatar) {
        return;
      }
      this.playClip(clip);
    },
    stopAnimation() {
      if (this.animation) {
        this.animation.stop();
        this.avatar.mixer.uncacheClip(this.clip);
        this.avatar.removeModule("MMDIK");
        this.animation = null;
      }
    },
    playTestMotion() {
      let q = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x * Math.PI / 180, y * Math.PI / 180, z * Math.PI / 180));
      let tracks = {
        leftUpperArm: {
          keys: [
            { rot: q(0, 0, 65), time: 0 },
            { rot: q(0, 0, 63), time: 1 },
            { rot: q(0, 0, 65), time: 2 }
          ]
        },
        rightUpperArm: {
          keys: [
            { rot: q(0, 0, -65), time: 0 },
            { rot: q(0, 0, -60), time: 1 },
            { rot: q(0, 0, -65), time: 2 }
          ]
        },
        spine: {
          keys: [
            { rot: q(0, 2, 0), time: 0 },
            { rot: q(2, 0, -2), time: 1 },
            { rot: q(2, -2, 0), time: 2 },
            { rot: q(0, 0, 2), time: 3 },
            { rot: q(0, 2, 0), time: 4 }
          ]
        }
      };
      let clip = THREE.AnimationClip.parseAnimation({
        name: "testAnimation",
        hierarchy: Object.values(tracks)
      }, Object.keys(tracks).map((k) => this.avatar.bones[k] || { name: k }));
      this.playClip(clip);
    },
    playClip(clip) {
      let loop = this.data.loop ? THREE.LoopRepeat : THREE.LoopOnce;
      this.stopAnimation();
      this.clip = clip;
      this.avatar.mixer.setTime(0);
      this.animation = this.avatar.mixer.clipAction(clip).setLoop(loop).setEffectiveWeight(1).play();
      this.animation.clampWhenFinished = true;
    },
    remove() {
      this.el.removeEventListener("model-loaded", this.onVrmLoaded);
      this.stopAnimation();
      this.avatar = null;
    }
  });
  AFRAME.registerComponent("vrm-skeleton", {
    schema: {
      physicsOffset: { type: "vec3", default: { x: 0, y: 0, z: 0 } }
    },
    init() {
      this.physicsBodies = [];
      this.sceneObj = this.el.sceneEl.object3D;
      if (this.el.components.vrm && this.el.components.vrm.avatar) {
        this._onAvatarUpdated(this.el.components.vrm.avatar);
      }
      this.onVrmLoaded = (ev) => this._onAvatarUpdated(ev.detail.avatar);
      this.el.addEventListener("model-loaded", this.onVrmLoaded);
    },
    _onAvatarUpdated(avatar) {
      if (this.helper) {
        this.sceneObj.remove(this.helper);
      }
      this.helper = new THREE.SkeletonHelper(avatar.model);
      this.sceneObj.add(this.helper);
      this._updatePhysicsBody(avatar);
    },
    _updatePhysicsBody(avatar) {
      this._clearPhysicsBody();
      let physics = avatar.modules.physics;
      if (!physics || !physics.world) {
        return;
      }
      let geometry = new THREE.SphereGeometry(1, 6, 3);
      let material = new THREE.MeshBasicMaterial({ color: new THREE.Color("red"), wireframe: true, depthTest: false });
      physics.bodies.forEach((body) => {
        let obj = new THREE.Group();
        body.shapes.forEach((shape, i) => {
          let sphere = new THREE.Mesh(geometry, material);
          sphere.position.copy(body.shapeOffsets[i]);
          sphere.scale.multiplyScalar(shape.boundingSphereRadius || 0.01);
          obj.add(sphere);
        });
        this.sceneObj.add(obj);
        this.physicsBodies.push([body, obj]);
      });
    },
    _clearPhysicsBody() {
      this.physicsBodies.forEach(([body, obj]) => obj.parent.remove(obj));
      this.physicsBodies = [];
    },
    tick() {
      this.physicsBodies.forEach(([body, obj]) => {
        obj.position.copy(body.position).add(this.data.physicsOffset);
        obj.quaternion.copy(body.quaternion);
      });
    },
    remove() {
      this.el.removeEventListener("model-loaded", this.onVrmLoaded);
      this._clearPhysicsBody();
      if (this.helper) {
        this.sceneObj.remove(this.helper);
      }
    }
  });
  AFRAME.registerComponent("vrm-poser", {
    schema: {
      color: { default: "#00ff00" },
      enableConstraints: { default: true }
    },
    init() {
      this.binds = [];
      this._tmpV0 = new THREE.Vector3();
      this._tmpV1 = new THREE.Vector3();
      this._tmpQ0 = new THREE.Quaternion();
      this._tmpQ1 = new THREE.Quaternion();
      this._tmpM0 = new THREE.Matrix4();
      if (this.el.components.vrm && this.el.components.vrm.avatar) {
        this._onAvatarUpdated(this.el.components.vrm.avatar);
      }
      this.onVrmLoaded = (ev) => this._onAvatarUpdated(ev.detail.avatar);
      this.el.addEventListener("model-loaded", this.onVrmLoaded);
    },
    remove() {
      this.el.removeEventListener("model-loaded", this.onVrmLoaded);
      this._removeHandles();
    },
    getPoseData(exportMorph) {
      if (!this.avatar) {
        return;
      }
      return this.avatar.getPose(exportMorph);
    },
    setPoseData(pose) {
      if (!this.avatar) {
        return;
      }
      this.avatar.setPose(pose);
      this._updateHandlePosition();
    },
    _onAvatarUpdated(avatar) {
      this._removeHandles();
      this.avatar = avatar;
      let geometry = new THREE.BoxGeometry(1, 1, 1);
      let material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(this.data.color),
        transparent: true,
        opacity: 0.4,
        depthTest: false
      });
      let _v0 = this._tmpV0, _v1 = this._tmpV1, _m = this._tmpM0, _q = this._tmpQ0;
      let rootNode = avatar.bones["hips"];
      let boneNameByUUID = {};
      for (let name of Object.keys(avatar.bones)) {
        let bone = avatar.bones[name];
        let isRoot = bone == rootNode;
        let cube = new THREE.Mesh(geometry, material);
        let targetEl = document.createElement("a-entity");
        targetEl.classList.add("collidable");
        targetEl.setAttribute("xy-drag-control", {});
        targetEl.setObject3D("handle", cube);
        let targetObject = targetEl.object3D;
        let minDist = bone.children.reduce((d, b) => Math.min(d, b.position.length()), bone.position.length());
        targetObject.scale.multiplyScalar(Math.max(Math.min(minDist / 2, 0.05), 0.01));
        boneNameByUUID[bone.uuid] = name;
        targetEl.addEventListener("mousedown", (ev) => {
          this.el.emit("vrm-poser-select", { name, node: bone });
        });
        let parentBone = bone.parent;
        while (!boneNameByUUID[parentBone.uuid] && parentBone.parent && parentBone.parent.isBone) {
          parentBone = parentBone.parent;
        }
        targetEl.addEventListener("xy-drag", (ev) => {
          if (isRoot) {
            let d = targetObject.parent.worldToLocal(bone.getWorldPosition(_v0)).sub(targetObject.position);
            avatar.model.position.sub(d);
          }
          parentBone.updateMatrixWorld(false);
          targetObject.updateMatrixWorld(false);
          _m.getInverse(parentBone.matrixWorld).multiply(targetObject.matrixWorld).decompose(_v1, _q, _v0);
          bone.quaternion.copy(this._applyConstraintQ(name, _q));
          _q.setFromUnitVectors(_v0.copy(bone.position).normalize(), _v1.normalize());
          if (parentBone.children.length == 1) {
            parentBone.quaternion.multiply(_q);
            this._applyConstraintQ(boneNameByUUID[parentBone.uuid], parentBone.quaternion);
          }
          this._updateHandlePosition(isRoot ? null : bone);
        });
        targetEl.addEventListener("xy-dragend", (ev) => {
          this._updateHandlePosition();
          console.log(parentBone.name, name);
        });
        this.el.appendChild(targetEl);
        this.binds.push([bone, targetObject]);
      }
      this._updateHandlePosition();
    },
    _applyConstraintQ(name, q) {
      if (!this.data.enableConstraints) {
        return q;
      }
      let _q = this._tmpQ1, _v = this._tmpV0;
      let constraint = this.avatar.boneConstraints[name];
      if (constraint && constraint.type == "ball") {
        let angle = 2 * Math.acos(q.w);
        if (constraint.twistAxis) {
          let tangle = angle * Math.acos(q.w) * _v.copy(q).normalize().dot(constraint.twistAxis);
          tangle = this._normalizeAngle(tangle);
          if (Math.abs(tangle) > constraint.twistLimit) {
            let e = tangle < 0 ? tangle + constraint.twistLimit : tangle - constraint.twistLimit;
            q.multiply(_q.setFromAxisAngle(constraint.twistAxis, -e));
            angle = 2 * Math.acos(q.w);
          }
        }
        if (Math.abs(this._normalizeAngle(angle)) > constraint.limit) {
          q.setFromAxisAngle(_v.copy(q).normalize(), constraint.limit);
        }
      } else if (constraint && constraint.type == "hinge") {
        let m = (constraint.min + constraint.max) / 2;
        let angle = 2 * Math.acos(q.w) * _v.copy(q).normalize().dot(constraint.axis);
        angle = THREE.MathUtils.clamp(this._normalizeAngle(angle - m), constraint.min - m, constraint.max - m);
        q.setFromAxisAngle(constraint.axis, angle + m);
      }
      return q;
    },
    _normalizeAngle(angle) {
      return angle - Math.PI * 2 * Math.floor((angle + Math.PI) / (Math.PI * 2));
    },
    _removeHandles() {
      this.binds.forEach(([b, t]) => {
        this.el.removeChild(t.el);
        let obj = t.el.getObject3D("handle");
        if (obj) {
          obj.material.dispose();
          obj.geometry.dispose();
        }
        t.el.destroy();
      });
      this.binds = [];
    },
    _updateHandlePosition(skipNode) {
      let _v = this._tmpV0;
      let container = this.el.object3D;
      container.updateMatrixWorld(false);
      let base = container.matrixWorld.clone().invert();
      this.binds.forEach(([node, target]) => {
        let pos = node == skipNode ? _v : target.position;
        node.updateMatrixWorld(false);
        target.matrix.copy(node.matrixWorld).premultiply(base).decompose(pos, target.quaternion, _v);
      });
    }
  });
  AFRAME.registerComponent("vrm-mimic", {
    schema: {
      leftHandTarget: { type: "selector", default: "" },
      leftHandOffsetPosition: { type: "vec3" },
      leftHandOffsetRotation: { type: "vec3", default: { x: 0, y: -Math.PI / 2, z: 0 } },
      rightHandTarget: { type: "selector", default: "" },
      rightHandOffsetPosition: { type: "vec3" },
      rightHandOffsetRotation: { type: "vec3", default: { x: 0, y: Math.PI / 2, z: 0 } },
      leftLegTarget: { type: "selector", default: "" },
      rightLegTarget: { type: "selector", default: "" },
      headTarget: { type: "selector", default: "" },
      avatarOffset: { type: "vec3", default: { x: 0, y: 0, z: 0 } }
    },
    init() {
      this._tmpV0 = new THREE.Vector3();
      this._tmpV1 = new THREE.Vector3();
      this._tmpQ0 = new THREE.Quaternion();
      this._tmpQ1 = new THREE.Quaternion();
      this._tmpM0 = new THREE.Matrix4();
      this.targetEls = [];
      if (this.el.components.vrm && this.el.components.vrm.avatar) {
        this._onAvatarUpdated(this.el.components.vrm.avatar);
      }
      this.onVrmLoaded = (ev) => this._onAvatarUpdated(ev.detail.avatar);
      this.el.addEventListener("model-loaded", this.onVrmLoaded);
    },
    update() {
      if (this.data.headTarget) {
        if (this.data.headTarget.tagName == "A-CAMERA") {
          this.headTarget = this.el.sceneEl.camera;
        } else {
          this.headTarget = this.data.headTarget.object3D;
        }
      } else {
        this.headTarget = null;
      }
      this.rightHandOffset = new THREE.Matrix4().compose(this.data.rightHandOffsetPosition, new THREE.Quaternion().setFromEuler(new THREE.Euler().setFromVector3(this.data.rightHandOffsetRotation)), new THREE.Vector3(1, 1, 1));
      this.leftHandOffset = new THREE.Matrix4().compose(this.data.leftHandOffsetPosition, new THREE.Quaternion().setFromEuler(new THREE.Euler().setFromVector3(this.data.leftHandOffsetRotation)), new THREE.Vector3(1, 1, 1));
    },
    _onAvatarUpdated(avatar) {
      this.avatar = avatar;
      for (let el of this.targetEls) {
        this.el.removeChild(el);
      }
      this.targetEls = [];
      this.update();
      this.startAvatarIK_simpleIK(avatar);
    },
    startAvatarIK_simpleIK(avatar) {
      let solver = new IKSolver();
      this.qbinds = [];
      let setupIkChain = (boneNames, targetEl, offset) => {
        if (targetEl == null) {
          targetEl = document.createElement("a-box");
          targetEl.classList.add("collidable");
          targetEl.setAttribute("xy-drag-control", {});
          targetEl.setAttribute("geometry", { width: 0.05, depth: 0.05, height: 0.05 });
          targetEl.setAttribute("material", { color: "blue", depthTest: false, transparent: true, opacity: 0.4 });
          this.el.appendChild(targetEl);
          this.targetEls.push(targetEl);
        }
        let pos = (b, p) => p.worldToLocal(b.getWorldPosition(new THREE.Vector3()));
        boneNames = boneNames.filter((name) => avatar.bones[name]);
        let boneList = boneNames.map((name) => avatar.bones[name]);
        let bones = boneList.map((b, i) => {
          let position = i == 0 ? b.position : pos(b, boneList[i - 1]);
          let constraintConf = avatar.boneConstraints[boneNames[i]];
          let constraint = constraintConf ? {
            apply: (ikbone) => {
              return this._applyConstraintQ(constraintConf, ikbone.quaternion);
            }
          } : null;
          return new IKNode(position, constraint, b);
        });
        this.qbinds.push([boneList[boneList.length - 1], targetEl.object3D, offset]);
        return { root: boneList[0], ikbones: bones, bones: boneList, target: targetEl.object3D };
      };
      this.chains = [
        setupIkChain(["leftUpperArm", "leftLowerArm", "leftHand"], this.data.leftHandTarget, this.leftHandOffset),
        setupIkChain(["rightUpperArm", "rightLowerArm", "rightHand"], this.data.rightHandTarget, this.rightHandOffset),
        setupIkChain(["leftUpperLeg", "leftLowerLeg", "leftFoot"], this.data.leftLegTarget),
        setupIkChain(["rightUpperLeg", "rightLowerLeg", "rightFoot"], this.data.rightLegTarget)
      ];
      this.simpleIK = solver;
    },
    _applyConstraintQ(constraint, q) {
      let _q = this._tmpQ1, _v = this._tmpV0, fixed = false;
      ;
      if (constraint && constraint.type == "ball") {
        let angle = 2 * Math.acos(q.w);
        if (constraint.twistAxis) {
          let tangle = angle * Math.acos(q.w) * _v.copy(q).normalize().dot(constraint.twistAxis);
          tangle = this._normalizeAngle(tangle);
          if (Math.abs(tangle) > constraint.twistLimit) {
            let e = tangle < 0 ? tangle + constraint.twistLimit : tangle - constraint.twistLimit;
            q.multiply(_q.setFromAxisAngle(constraint.twistAxis, -e));
            angle = 2 * Math.acos(q.w);
            fixed = true;
          }
        }
        if (Math.abs(this._normalizeAngle(angle)) > constraint.limit) {
          q.setFromAxisAngle(_v.copy(q).normalize(), constraint.limit);
          fixed = true;
        }
      } else if (constraint && constraint.type == "hinge") {
        let m = (constraint.min + constraint.max) / 2;
        let dot = _v.copy(q).normalize().dot(constraint.axis);
        let angle = 2 * Math.acos(q.w) * dot;
        angle = THREE.MathUtils.clamp(this._normalizeAngle(angle - m), constraint.min - m, constraint.max - m);
        q.setFromAxisAngle(constraint.axis, angle + m);
        fixed = true;
      }
      return fixed;
    },
    _normalizeAngle(angle) {
      return angle - Math.PI * 2 * Math.floor((angle + Math.PI) / (Math.PI * 2));
    },
    tick(time, timeDelta) {
      if (!this.avatar) {
        return;
      }
      if (this.headTarget) {
        let position = this._tmpV0;
        let headRot = this._tmpQ0;
        this.headTarget.matrixWorld.decompose(position, headRot, this._tmpV1);
        position.y = 0;
        this.avatar.model.position.copy(position.add(this.data.avatarOffset));
        let head = this.avatar.firstPersonBone;
        if (head) {
          let r = this._tmpQ1.setFromRotationMatrix(head.parent.matrixWorld).invert();
          head.quaternion.copy(headRot.premultiply(r));
        }
      }
      if (this.simpleIK) {
        let pm = this.el.object3D.matrixWorld.clone().invert();
        for (let chain of this.chains) {
          let baseMat = chain.root.parent.matrixWorld.clone().premultiply(pm);
          if (this.simpleIK.solve(chain.ikbones, chain.target.position, baseMat) || true) {
            chain.ikbones.forEach((ikbone, i) => {
              if (i == chain.ikbones.length - 1)
                return;
              let a = ikbone.userData.quaternion.angleTo(ikbone.quaternion);
              if (a > 0.2) {
                ikbone.userData.quaternion.slerp(ikbone.quaternion, 0.2 / a);
              } else {
                ikbone.userData.quaternion.copy(ikbone.quaternion);
              }
            });
          }
        }
        this.qbinds.forEach(([bone, t, offset]) => {
          let m = offset ? t.matrixWorld.clone().multiply(offset) : t.matrixWorld;
          let r = this._tmpQ0.setFromRotationMatrix(bone.parent.matrixWorld).invert();
          bone.quaternion.copy(this._tmpQ1.setFromRotationMatrix(m).premultiply(r));
        });
      }
    },
    remove() {
      this.el.removeEventListener("model-loaded", this.onVrmLoaded);
      for (let el of this.targetEls) {
        this.el.removeChild(el);
      }
    }
  });
})();
//# sourceMappingURL=aframe-vrm.js.map
