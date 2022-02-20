// attach this to the raycaster element,
//   use it to grab any object with classes "raycaster-target" and "grabbable"
AFRAME.registerComponent("raycaster-controller-grabber", {
    init: function () 
    {
        this.grabbedElement = null;

        this.rightController = document.querySelector("#right-controller-entity");

        this.tempVector = new THREE.Vector3();

        // use when moving grabbed object along raycaster beam
        this.clock = new THREE.Clock();
        this.moveSpeed = 1; // units per second
    },

    tick: function()
    {
        let deltaTime = this.clock.getDelta();

        this.raycaster = this.el.components["raycaster"];
        this.rightData = this.rightController.components["controller-listener"];
        this.raycasterGraphics = this.el.components["raycaster-graphics"];

        if ( this.rightData.grip.pressed &&
             this.raycaster.intersectionDetail.intersections &&
             this.raycaster.intersectionDetail.intersections.length > 0 &&
             this.grabbedElement == null )
        {
            // get the intersected entity
            let entity = this.raycaster.intersectionDetail.els[0];
            
            // if it has the "grabbable" class, then
            if ( entity.classList.contains("grabbable") )
            {
                // Attach grabbed entity to this object (controller).
                // Note: not changing the A-Frame DOM tree, because this is temporary
                //   and will be added back to the scene when dropped.
                this.el.object3D.attach( entity.object3D );

                // change appearance setting (set by raycaster-graphics)
                this.raycasterGraphics.beamEntity.setAttribute("material", "color", "cyan");

                // raycaster-graphics keeps setting cursorEntity visible true,
                //  so force cursor hidden by making setting children visibility to false
                this.raycasterGraphics.cursorCenter.setAttribute("visible", false);
                this.raycasterGraphics.cursorBorder.setAttribute("visible", false);

                // turn off emission (set by raycaster-hover-glow)
                entity.setAttribute("material", "emissive", "#000000");

                // set grabbed element
                this.grabbedElement = entity;
            }

        }

        // perform actions while element is grabbed
        if ( this.grabbedElement != null )
        {
            // pushing/pulling grabbed object
            if ( this.rightData.axisY != 0 )
            {
                // grab point is already in world coordinates
                let point = this.raycasterGraphics.cursorEntity.getAttribute("position");
                // convert controller position to world coordinates also
                this.el.object3D.getWorldPosition(this.tempVector);

                // find distance from grabbed object to controller
                let dx = point.x - this.tempVector.x;
                let dy = point.y - this.tempVector.y;
                let dz = point.z - this.tempVector.z;
                let distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

                // if not pulling entity that is too close, then okay to move it
                if ( !(this.rightData.axisY > 0 && distance < 0.05) )
                {
                    // move grabbed object along raycaster beam
                    let angle = this.raycasterGraphics.beamAngleX;
                    let moveDistance = this.moveSpeed * deltaTime * this.rightData.axisY;
                    let moveY = Math.sin(angle) * moveDistance;
                    let moveZ = Math.cos(angle) * moveDistance;
                                  
                    let grabbedPos = this.grabbedElement.getAttribute("position");
                    grabbedPos.y += moveY;
                    grabbedPos.z += moveZ;
                    this.grabbedElement.setAttribute("position", grabbedPos);

                    // repeat and move (animate) texture of beam entity
                    let material = this.raycasterGraphics.beamEntity.getAttribute("material");
                    material.repeat.x = 2;
                    material.repeat.y = 30;
                    material.offset.y -= 10 * moveDistance;
                    this.raycasterGraphics.beamEntity.setAttribute("material", material);
                }
            }
            else // if not pushing/pulling, revert beam graphics to solid line
            {
                let material = this.raycasterGraphics.beamEntity.getAttribute("material");
                material.repeat.x = 2;
                material.repeat.y = 1;
                material.offset.y = 0.001; // weird bug when setting to 0; does not change
                this.raycasterGraphics.beamEntity.setAttribute("material", material);
            }

            if ( this.rightData.grip.released )
            {
                // attach element back to root scene
                // document.querySelector('a-scene').appendChild(this.grabbedElement);
                this.grabbedElement.sceneEl.object3D.attach( this.grabbedElement.object3D );

                // revert previous changes
                let material = this.raycasterGraphics.beamEntity.getAttribute("material");
                material.repeat.x = 2;
                material.repeat.y = 1;
                material.offset.y = 0.001;
                this.raycasterGraphics.beamEntity.setAttribute("material", material);

                this.raycasterGraphics.beamEntity.setAttribute("material", "color", "white");
                this.raycasterGraphics.cursorCenter.setAttribute("visible", true);
                this.raycasterGraphics.cursorBorder.setAttribute("visible", true);
                this.grabbedElement.setAttribute("material", "emissive", "#444444");

                this.grabbedElement = null;
            }

        } // end of "grabbedElement"

    } // end of function tick()

});
