AFRAME.registerComponent('raycaster-graphics', {

    schema:
    {
        beamRadius:   {type: 'float',  default: 0.003},
        beamLength:   {type: 'float',  default: 0.400},
        beamColor:    {type: 'color',  default: "white"},
        beamOpacity:  {type: 'float',  default: 0.50},
        beamImageSrc: {type: 'string', default: "#gradient"},
        cursorRadius: {type: 'float',  default: 0.020},
        cursorColor:  {type: 'color',  default: "white"}
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
        // these are used to set beam position/rotation in tick function
        this.currentBeamDirection = null;
        this.currentBeamOrigin    = null;
        this.vectorsEqual = function(v, w)
        {  return ((v.x == w.x) && (v.y == w.y) && (v.z == w.z));  }        
        this.beamEntity.setAttribute("material", "shader: flat; transparent: true; repeat: 2 1;");
        this.beamEntity.setAttribute("material", "src", this.data.beamImageSrc);
        this.beamEntity.setAttribute("material", "color", this.data.beamColor);
        this.beamEntity.setAttribute("material", "opacity", this.data.beamOpacity);
        this.el.appendChild(this.beamEntity);


        // draw a sphere with border to illustrate closest raycaster intersection point
        this.cursorEntity = document.createElement('a-entity');
        this.cursorEntity.setAttribute("id", "cursor-ball");
        // attach to scene
        document.querySelector('a-scene').appendChild(this.cursorEntity);

        this.cursorBorder = document.createElement('a-sphere');
        this.cursorBorder.setAttribute("radius", this.data.cursorRadius);
        this.cursorBorder.setAttribute("material", "shader: flat; color: black; side: back;");
        this.cursorBorder.setAttribute("overlay", "");
        this.cursorEntity.appendChild(this.cursorBorder);

        this.cursorCenter = document.createElement('a-sphere');
        this.cursorCenter.setAttribute("radius", this.data.cursorRadius * 0.80);
        this.cursorCenter.setAttribute("material", "shader: flat; side: front;");
        this.cursorCenter.setAttribute("material", "color", this.data.cursorColor);
        this.cursorCenter.setAttribute("overlay", "");
        this.cursorEntity.appendChild(this.cursorCenter);
    },

    tick: function () 
    {

        // calculate position and rotation of beam
        //  based on model-specific values that customize raycaster line;
        // this data may change when switching from browser to VR mode
        let raycasterConfig     = this.el.getAttribute("raycaster");
        let currentRayDirection = raycasterConfig.direction;
        let currentRayOrigin    = raycasterConfig.origin;

        if ( this.currentBeamDirection == null || this.currentBeamOrigin == null ||
            !this.vectorsEqual(this.currentBeamOrigin, currentRayOrigin) ||
            !this.vectorsEqual(this.currentBeamDirection, currentRayDirection) )
        {

            // align beam rotation with ray direction angle
            //  (beam is always only rotated around x-axis)
            let beamAngleX = 180 + Math.atan2(currentRayDirection.z, currentRayDirection.y) * 180/Math.PI;
            let rot = {x: beamAngleX, y: 0, z: 0};
            this.beamEntity.setAttribute("rotation", rot);
            this.currentBeamDirection = currentRayDirection;
            
            this.beamAngleX = beamAngleX;

            // align beam position with ray origin point
            //  and shift so beam cylinder end is at origin
            let angleRad = beamAngleX * Math.PI/180;
            let cylinderShift = this.data.beamLength / 2.05;
            let pos = { x: currentRayOrigin.x, 
                        y: currentRayOrigin.y - Math.cos(angleRad) * cylinderShift,
                        z: currentRayOrigin.z - Math.sin(angleRad) * cylinderShift };
            this.beamEntity.setAttribute("position", pos);
            this.currentBeamOrigin = currentRayOrigin;
        }


        // move cursor entity to point of intersection

        // Strange bug:
        // If raycaster is intersecting an element,
        //   and then raycaster also starts to intersect another element behind the first,
        //   the "intersections" array becomes empty.
        // This does not happen if second intersection is closer.

        // Hacky workaround: default raycaster sets far = 100;
        //  when there is an intersection, reduce far to current distance (plus epsilon)
        //  so it is not possible to suddenly intersect an object behind current intersect.
        // Also implements registering only one intersection at a time.

        if ( this.raycaster.intersectionDetail.intersections &&
             this.raycaster.intersectionDetail.intersections.length > 0)
        {
            this.cursorEntity.setAttribute("visible", true)

            let point = this.raycaster.intersectionDetail.intersections[0].point;

            let pos = this.cursorEntity.getAttribute("position");
            pos.x = point.x;
            pos.y = point.y;
            pos.z = point.z;
            this.cursorEntity.setAttribute("position", pos)

            // shorten raycaster
            let dist = this.raycaster.intersectionDetail.intersections[0].distance;
            this.el.setAttribute("raycaster", "far", dist + 0.1);
        }
        else
        {
            this.cursorEntity.setAttribute("visible", false)
            this.el.setAttribute("raycaster", "far", 100);
        }
    }
});

// The "overlay" component forces objects to render last,
//  so they not occluded by any part of an opaque objects.

// This is being used for the raycaster-graphics' cursor
//  so that it is always fully visible to the user
//  (more reliable that a billboarded texture).
AFRAME.registerComponent("overlay", {
    init: function () 
    {
        this.el.sceneEl.renderer.sortObjects = true;
        this.el.object3D.renderOrder = 100;
        this.el.components.material.material.depthTest = false;
    }
});

// make objects brighter when raycaster intersects them
AFRAME.registerComponent('raycaster-hover-glow', {
    init: function () 
    {
        let self = this;

        // this happens once, when intersection begins
        this.el.addEventListener("raycaster-intersected", function(event)
            { self.el.setAttribute("material", "emissive", "#444444"); } );

        // this happens once, when intersection ends
        this.el.addEventListener("raycaster-intersected-cleared", function(event)
            { self.el.setAttribute("material", "emissive", "#000000"); } );
    }
});
