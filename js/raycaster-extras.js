/**
 *   raycaster-extras:
 *   - draws a fading beam along raycaster direction
 *   - beam color changes while pressing right trigger or right grip
 *   - draws a cursor marker at first raycaster intersection point
 */

AFRAME.registerComponent('raycaster-extras', {

    schema:
    {
        controllerListenerId:  {type: 'string',  default: "#controller-data"},

        beamRadius:   {type: 'float',  default: 0.003},
        beamLength:   {type: 'float',  default: 0.400},
        beamColor:    {type: 'color',  default: "white"},
        beamOpacity:  {type: 'float',  default: 0.50},
        beamImageSrc: {type: 'string', default: "#gradient"},
        cursorRadius: {type: 'float',  default: 0.020},
        cursorColor:  {type: 'color',  default: "white"},
    },

    init: function () 
    {
        // disable default raycaster line
        this.raycaster = this.el.components["raycaster"];
        this.raycaster.data.showLine = false; 
        this.raycaster.data.lineOpacity = 0.0; 


        // draw light beam: thin textured cylinder along raycaster direction
        this.beamEntity = document.createElement("a-cylinder");
        this.beamEntity.setAttribute("radius", this.data.beamRadius);
        this.beamEntity.setAttribute("height", this.data.beamLength);
        this.beamEntity.setAttribute("segments-height", 1);
        this.beamEntity.setAttribute("segments-radial", 6);
        
        // these are used to set beam position/rotation in tick function
        this.currentBeamDirection = null;
        this.currentBeamOrigin    = null;
        this.vectorsEqual = function(v, w)
        {  return ((v.x == w.x) && (v.y == w.y) && (v.z == w.z));  }        
        this.beamEntity.setAttribute("material", "shader: flat; transparent: true; repeat: 2 1;");
        this.beamEntity.setAttribute("material", "src", this.data.beamImageSrc);
        this.beamEntity.setAttribute("material", "color", this.data.beamColor);
        this.beamEntity.setAttribute("material", "opacity", this.data.beamOpacity);
        this.beamColorDefault = new THREE.Color(this.data.beamColor);
        this.beamColorActive  = new THREE.Color("cyan");
        this.el.appendChild(this.beamEntity);


        // draw a sphere with border to illustrate closest raycaster intersection point
        this.cursorEntity = document.createElement('a-entity');
        this.cursorEntity.setAttribute("id", "cursor-ball");
        // attach to scene
        document.querySelector('a-scene').appendChild(this.cursorEntity);

        this.cursorBorder = document.createElement('a-sphere');
        this.cursorBorder.setAttribute("radius", this.data.cursorRadius);
        this.cursorBorder.setAttribute("segments-height", 4); // default: 18
        this.cursorBorder.setAttribute("segments-width", 8);  // default: 36
        this.cursorBorder.setAttribute("material", "shader: flat; color: black; side: back;");
        this.cursorBorder.setAttribute("overlay", "");
        this.cursorEntity.appendChild(this.cursorBorder);

        this.cursorCenter = document.createElement('a-sphere');
        this.cursorCenter.setAttribute("radius", this.data.cursorRadius * 0.80);
        this.cursorCenter.setAttribute("segments-height", 4); // default: 18
        this.cursorCenter.setAttribute("segments-width", 8);  // default: 36
        this.cursorCenter.setAttribute("material", "shader: flat; side: front;");
        this.cursorCenter.setAttribute("material", "color", this.data.cursorColor);
        this.cursorCenter.setAttribute("overlay", "");
        this.cursorEntity.appendChild(this.cursorCenter);

        this.controllerData = document.querySelector(this.data.controllerListenerId).components["controller-listener"];

        this.intersectionPoint = null;
        this.focusedElement = null;
        this.grabbedElement = null;

        // calculate translation vector for moving grabbed object along beam
        this.tempVector  = new THREE.Vector3();
        this.tempVector1 = new THREE.Vector3();
        this.tempVector2 = new THREE.Vector3();
        // use when moving grabbed object along raycaster beam
        this.clock = new THREE.Clock();
        this.moveSpeed = 1;

        this.raycasterConfig = null;

    },

    tick: function () 
    {
        this.deltaTime = this.clock.getDelta();

        // change color of beam when interacting with trigger or grip button ==================================

        if ( this.controllerData.rightTrigger.pressing || this.controllerData.rightGrip.pressing )
            this.beamEntity.object3D.children[0].material.color = this.beamColorActive; // setAttribute("material", "color", "cyan");
        else
            this.beamEntity.object3D.children[0].material.color = this.beamColorDefault; // setAttribute("material", "color", this.data.beamColor);

        // calculate position and rotation of beam ============================================================

        // based on model-specific values that customize raycaster line;
        // note: this data may change when switching from browser to VR mode, so need to keep checking in tick()
        if (this.raycasterConfig == null)
            this.raycasterConfig = this.el.getAttribute("raycaster");

        this.currentRayDirection = this.raycasterConfig.direction;
        this.currentRayOrigin    = this.raycasterConfig.origin;

        if ( this.currentBeamDirection == null || this.currentBeamOrigin == null ||
            !this.vectorsEqual(this.currentBeamOrigin, this.currentRayOrigin) ||
            !this.vectorsEqual(this.currentBeamDirection, this.currentRayDirection) )
        {

            // align beam rotation with ray direction angle
            //  (beam is always only rotated around x-axis)
            this.beamAngleX = 180 + Math.atan2(this.currentRayDirection.z, this.currentRayDirection.y) * 180/Math.PI;
            this.rot = {x: this.beamAngleX, y: 0, z: 0};
            this.beamEntity.setAttribute("rotation", this.rot);
            this.currentBeamDirection = this.currentRayDirection;
            
            // align beam position with ray origin point
            //  and shift so beam cylinder end is at origin
            this.angleRad = this.beamAngleX * Math.PI/180;
            this.cylinderShift = this.data.beamLength / 2.05;
            this.pos = { x: this.currentRayOrigin.x, 
                         y: this.currentRayOrigin.y - Math.cos(this.angleRad) * this.cylinderShift,
                         z: this.currentRayOrigin.z - Math.sin(this.angleRad) * this.cylinderShift };
            this.beamEntity.setAttribute("position", this.pos);
            this.currentBeamOrigin = this.currentRayOrigin;
        }

        // update which element has focus ===================================================================
        
        if (this.raycaster.intersectionDetail.intersections && 
            this.raycaster.intersectionDetail.intersections.length > 0 )
        {
            this.focusedElement = this.raycaster.intersectionDetail.els[0];
            this.intersectionPoint = this.raycaster.intersectionDetail.intersections[0].point;
        }
        else
        {
            this.focusedElement = null;
            this.intersectionPoint = null;
        }

        // move cursor entity to point of intersection ======================================================

        // Strange bug:
        // If raycaster is intersecting an element,
        //   and then raycaster also starts to intersect another element behind the first,
        //   the "intersections" array becomes empty.
        // This does not happen if second intersection is closer.

        // Hacky workaround: default raycaster sets far = 100;
        //  when there is an intersection, reduce far to current distance (plus epsilon)
        //  so it is not possible to suddenly intersect an object behind current intersect.
        // Also implements registering only one intersection at a time.

        if ( this.focusedElement != null )
        {
            this.cursorEntity.object3D.visible = true;

            this.cursorEntity.object3D.position.set(
                this.intersectionPoint.x, 
                this.intersectionPoint.y, 
                this.intersectionPoint.z );

            // shorten raycaster
            let dist = this.raycaster.intersectionDetail.intersections[0].distance;
            this.raycaster.raycaster.far = dist + 0.1;
            // equivalent to: this.el.setAttribute("raycaster", "far", dist + 0.1);
        }
        else
        {
            this.cursorEntity.object3D.visible = false;
            this.raycaster.raycaster.far = 12;
            // equivalent to: this.el.setAttribute("raycaster", "far", 12);
        }

        // grab element =====================================================================================


        if ( this.controllerData.rightGrip.pressed &&
             this.focusedElement != null && this.grabbedElement == null )
        {
            // if it can be grabbed...
            if ( this.focusedElement.components["raycaster-target"] &&
                 this.focusedElement.components["raycaster-target"].data.canGrab )
            {
                // Attach grabbed entity to this object (controller).
                // Note: not changing the A-Frame DOM tree, because this is temporary
                //   and will be added back to the scene when dropped.
                this.el.object3D.attach( this.focusedElement.object3D );

                // raycaster-graphics keeps setting cursorEntity visible true,
                //  so force cursor hidden by making setting children visibility to false
                //  why? easier to focus on object without cursor in the way.
                this.cursorCenter.object3D.visible = false;
                this.cursorBorder.object3D.visible = false;

                // turn off emission (set by raycaster-hover-glow)
                this.focusedElement.setAttribute("material", "emissive", "#000000");

                // focused element is now also the grabbed element
                this.grabbedElement = this.focusedElement;
                this.grabbedElement.components["raycaster-target"].isGrabbed = true;

                // emit an event
                this.grabbedElement.emit( "raycaster-grabbed", {el: this.grabbedElement} );
            }

        }

        // perform actions on grabbed element ===============================================================


        if ( this.grabbedElement != null )
        {
            // pushing/pulling grabbed object ---------------------------------------------------------------
            if ( this.controllerData.rightAxisY != 0 )
            {
                // do all calculations in world coordinates
                this.el.object3D.getWorldPosition(this.tempVector1);
                this.cursorEntity.object3D.getWorldPosition(this.tempVector2);

                // find distance from grabbed object to controller
                this.tempVector.subVectors( this.tempVector2, this.tempVector1 );
                let distance = this.tempVector.length();

                // if not pulling entity that is too close, then okay to move it
                if ( !(this.controllerData.rightAxisY > 0 && distance < 0.05) )
                {
                    this.moveDistance = 2 * this.moveSpeed * this.deltaTime * this.controllerData.rightAxisY;
                    // move faster if pressing trigger at same time
                    this.moveDistance *= (1 + 1 * this.controllerData.rightTrigger.value);

                    this.tempVector.setLength(this.moveDistance);


                    // temporarily attach element back to root scene
                    this.grabbedElement.sceneEl.object3D.attach( this.grabbedElement.object3D );
                    // translate
                    this.grabbedElement.object3D.position.sub( this.tempVector );
                    // reattach to controller
                    this.el.object3D.attach( this.grabbedElement.object3D );


                    // repeat and move (animate) texture of beam entity
                    let material = this.beamEntity.getAttribute("material");
                    material.repeat.x = 2;
                    material.repeat.y = 30;
                    material.offset.y -= 10 * this.moveDistance;
                    this.beamEntity.setAttribute("material", material);
                    
                }
            }
            else // if not pushing/pulling, revert beam graphics to solid line ------------------------------
            {
                let material = this.beamEntity.getAttribute("material");
                material.repeat.x = 2;
                material.repeat.y = 1;
                material.offset.y = 0.001; // weird bug when setting to 0; does not change
                this.beamEntity.setAttribute("material", material);
            }

            // drop grabbed element -------------------------------------------------------------------------
            if ( this.controllerData.rightGrip.released )
            {
                // attach element back to root scene
                this.grabbedElement.sceneEl.object3D.attach( this.grabbedElement.object3D );

                // revert previous changes
                let material = this.beamEntity.getAttribute("material");
                material.repeat.x = 2;
                material.repeat.y = 1;
                material.offset.y = 0.001;
                this.beamEntity.setAttribute("material", material);

                this.cursorCenter.object3D.visible = true;
                this.cursorBorder.object3D.visible = true;

                this.grabbedElement.components["raycaster-target"].isGrabbed = false;
                
                if ( this.grabbedElement.components["raycaster-target"].data.glowOnHover )
                     this.grabbedElement.setAttribute("material", "emissive", "#444444");

                // emit an event
                this.grabbedElement.emit( "raycaster-released", {el: this.grabbedElement} );

                this.grabbedElement = null;
            }

        }

        // ==================================================================================================

    }
});



// The "overlay" component forces objects to render last,
//  so they not occluded by any part of an opaque objects.

// This is being used for the raycaster-graphics' cursor
//  so that it is always fully visible to the user
//  (more reliable than just a billboarded texture).
AFRAME.registerComponent("overlay", {
    init: function () 
    {
        this.el.sceneEl.renderer.sortObjects = true;
        this.el.object3D.renderOrder = 100;
        this.el.components.material.material.depthTest = false;
    }
});


// set a variable to indicate when object has focus (targeted by raycaster)
// optional: make objects brighter when raycaster intersects them
AFRAME.registerComponent('raycaster-target', {
    
    schema:
    {
        glowOnHover: {type: 'boolean', default: true},
        canGrab:     {type: 'boolean', default: false},
    },

    init: function () 
    {
        // assumes that raycaster's object parameter includes class "raycaster-target"
        //   in order to register intersections of ray with this object
        this.el.classList.add("raycaster-target");

        this.hasFocus  = false;
        this.isGrabbed = false;

        let self = this;

        // this happens once, when intersection begins
        this.el.addEventListener("raycaster-intersected", function(event)
            { 
                self.hasFocus = true;
                if (self.data.glowOnHover)
                    self.el.setAttribute("material", "emissive", "#444444"); 
            } 
        );

        // this happens once, when intersection ends
        this.el.addEventListener("raycaster-intersected-cleared", function(event)
            { 
                self.hasFocus = false;
                if (self.data.glowOnHover)
                    self.el.setAttribute("material", "emissive", "#000000"); 
            } 
        );
    }
});
