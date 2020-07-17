"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrbitControls = void 0;
var THREE = require("three");
var STATE = {
    NONE: -1,
    ROTATE: 0,
    DOLLY: 1,
    PAN: 2,
    TOUCH_ROTATE: 3,
    TOUCH_PAN: 4,
    TOUCH_DOLLY_PAN: 5,
    TOUCH_DOLLY_ROTATE: 6
};
var CHANGE_EVENT = { type: 'change' };
var START_EVENT = { type: 'start' };
var END_EVENT = { type: 'end' };
var EPS = 0.000001;
/**
* @author qiao / https://github.com/qiao
* @author mrdoob / http://mrdoob.com
* @author alteredq / http://alteredqualia.com/
* @author WestLangley / http://github.com/WestLangley
* @author erich666 / http://erichaines.com
* @author nicolaspanel / http://github.com/nicolaspanel
*
* This set of controls performs orbiting, dollying (zooming), and panning.
* Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
*    Orbit - left mouse / touch: one finger move
*    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
*    Pan - right mouse, or arrow keys / touch: three finger swipe
*/
var OrbitControls = /** @class */ (function (_super) {
    __extends(OrbitControls, _super);
    function OrbitControls(object, domElement) {
        var _this = this;
        if (domElement === undefined)
            console.warn('THREE.OrbitControls: The second parameter "domElement" is now mandatory.');
        if (domElement === document)
            console.error('THREE.OrbitControls: "document" should not be used as the target "domElement". Please use "renderer.domElement" instead.');
        _this = _super.call(this) || this;
        _this.object = object;
        _this.domElement = (domElement !== undefined) ? domElement : document;
        // Set to false to disable this control
        _this.enabled = true;
        // "target" sets the location of focus, where the object orbits around
        _this.target = new THREE.Vector3();
        // How far you can dolly in and out ( PerspectiveCamera only )
        _this.minDistance = 0;
        _this.maxDistance = Infinity;
        // How far you can zoom in and out ( OrthographicCamera only )
        _this.minZoom = 0;
        _this.maxZoom = Infinity;
        // How far you can orbit vertically, upper and lower limits.
        // Range is 0 to Math.PI radians.
        _this.minPolarAngle = 0; // radians
        _this.maxPolarAngle = Math.PI; // radians
        // How far you can orbit horizontally, upper and lower limits.
        // If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
        _this.minAzimuthAngle = -Infinity; // radians
        _this.maxAzimuthAngle = Infinity; // radians
        // Set to true to enable damping (inertia)
        // If damping is enabled, you must call controls.update() in your animation loop
        _this.enableDamping = false;
        _this.dampingFactor = 0.25;
        // This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
        // Set to false to disable zooming
        _this.enableZoom = true;
        _this.zoomSpeed = 1.0;
        // Set to false to disable rotating
        _this.enableRotate = true;
        _this.rotateSpeed = 1.0;
        // Set to false to disable panning
        _this.enablePan = true;
        _this.panSpeed = 1.0;
        _this.screenSpacePanning = true; // if false, pan orthogonal to world-space direction camera.up
        _this.keyPanSpeed = 7.0; // pixels moved per arrow key push
        // Set to true to automatically rotate around the target
        // If auto-rotate is enabled, you must call controls.update() in your animation loop
        _this.autoRotate = false;
        _this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60
        // Set to false to disable use of the keys
        _this.enableKeys = true;
        // The four arrow keys
        _this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };
        // Mouse buttons
        _this.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
        // Touch fingers
        _this.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
        // for reset
        _this.target0 = _this.target.clone();
        _this.position0 = _this.object.position.clone();
        _this.zoom0 = _this.object.zoom;
        // for update speedup
        _this.updateOffset = new THREE.Vector3();
        // so camera.up is the orbit axis
        _this.updateQuat = new THREE.Quaternion().setFromUnitVectors(object.up, new THREE.Vector3(0, 1, 0));
        _this.updateQuatInverse = _this.updateQuat.clone().inverse();
        _this.updateLastPosition = new THREE.Vector3();
        _this.updateLastQuaternion = new THREE.Quaternion();
        _this.state = STATE.NONE;
        _this.scale = 1;
        // current position in spherical coordinates
        _this.spherical = new THREE.Spherical();
        _this.sphericalDelta = new THREE.Spherical();
        _this.panOffset = new THREE.Vector3();
        _this.zoomChanged = false;
        _this.rotateStart = new THREE.Vector2();
        _this.rotateEnd = new THREE.Vector2();
        _this.rotateDelta = new THREE.Vector2();
        _this.panStart = new THREE.Vector2();
        _this.panEnd = new THREE.Vector2();
        _this.panDelta = new THREE.Vector2();
        _this.dollyStart = new THREE.Vector2();
        _this.dollyEnd = new THREE.Vector2();
        _this.dollyDelta = new THREE.Vector2();
        _this.panLeftV = new THREE.Vector3();
        _this.panUpV = new THREE.Vector3();
        _this.panInternalOffset = new THREE.Vector3();
        // event handlers - FSM: listen for events and reset state
        _this.onMouseDown = function (event) {
            if (_this.enabled === false)
                return;
            // Prevent the browser from scrolling.
            event.preventDefault();
            // Manually set the focus since calling preventDefault above
            // prevents the browser from setting it automatically.
            _this.domElement.focus ? _this.domElement.focus() : window.focus();
            var mouseAction;
            switch (event.button) {
                case 0:
                    mouseAction = _this.mouseButtons.LEFT;
                    break;
                case 1:
                    mouseAction = _this.mouseButtons.MIDDLE;
                    break;
                case 2:
                    mouseAction = _this.mouseButtons.RIGHT;
                    break;
                default:
                    mouseAction = -1;
            }
            switch (mouseAction) {
                case THREE.MOUSE.DOLLY:
                    if (_this.enableZoom === false)
                        return;
                    _this.handleMouseDownDolly(event);
                    _this.state = STATE.DOLLY;
                    break;
                case THREE.MOUSE.ROTATE:
                    if (event.ctrlKey || event.metaKey || event.shiftKey) {
                        if (_this.enablePan === false)
                            return;
                        _this.handleMouseDownPan(event);
                        _this.state = STATE.PAN;
                    }
                    else {
                        if (_this.enableRotate === false)
                            return;
                        _this.handleMouseDownRotate(event);
                        _this.state = STATE.ROTATE;
                    }
                    break;
                case THREE.MOUSE.PAN:
                    if (event.ctrlKey || event.metaKey || event.shiftKey) {
                        if (_this.enableRotate === false)
                            return;
                        _this.handleMouseDownRotate(event);
                        _this.state = STATE.ROTATE;
                    }
                    else {
                        if (_this.enablePan === false)
                            return;
                        _this.handleMouseDownPan(event);
                        _this.state = STATE.PAN;
                    }
                    break;
                default:
                    _this.state = STATE.NONE;
            }
            if (_this.state !== STATE.NONE) {
                _this.domElement.ownerDocument.addEventListener('mousemove', _this.onMouseMove, false);
                _this.domElement.ownerDocument.addEventListener('mouseup', _this.onMouseUp, false);
                _this.dispatchEvent(START_EVENT);
            }
        };
        _this.onMouseMove = function (event) {
            if (_this.enabled === false)
                return;
            event.preventDefault();
            switch (_this.state) {
                case STATE.ROTATE:
                    if (_this.enableRotate === false)
                        return;
                    _this.handleMouseMoveRotate(event);
                    break;
                case STATE.DOLLY:
                    if (_this.enableZoom === false)
                        return;
                    _this.handleMouseMoveDolly(event);
                    break;
                case STATE.PAN:
                    if (_this.enablePan === false)
                        return;
                    _this.handleMouseMovePan(event);
                    break;
            }
        };
        _this.onMouseUp = function (event) {
            if (_this.enabled === false)
                return;
            _this.handleMouseUp();
            document.removeEventListener('mousemove', _this.onMouseMove, false);
            document.removeEventListener('mouseup', _this.onMouseUp, false);
            _this.dispatchEvent(END_EVENT);
            _this.state = STATE.NONE;
        };
        _this.onMouseWheel = function (event) {
            if (_this.enabled === false || _this.enableZoom === false || (_this.state !== STATE.NONE && _this.state !== STATE.ROTATE))
                return;
            event.preventDefault();
            event.stopPropagation();
            _this.dispatchEvent(START_EVENT);
            _this.handleMouseWheel(event);
            _this.dispatchEvent(END_EVENT);
        };
        _this.onKeyDown = function (event) {
            if (_this.enabled === false || _this.enableKeys === false || _this.enablePan === false)
                return;
            _this.handleKeyDown(event);
        };
        _this.onTouchStart = function (event) {
            if (_this.enabled === false)
                return;
            event.preventDefault(); // prevent scrolling
            switch (event.touches.length) {
                case 1:
                    switch (_this.touches.ONE) {
                        case THREE.TOUCH.ROTATE:
                            if (_this.enableRotate === false)
                                return;
                            _this.handleTouchStartRotate(event);
                            _this.state = STATE.TOUCH_ROTATE;
                            break;
                        case THREE.TOUCH.PAN:
                            if (_this.enablePan === false)
                                return;
                            _this.handleTouchStartPan(event);
                            _this.state = STATE.TOUCH_PAN;
                            break;
                        default:
                            _this.state = STATE.NONE;
                    }
                    break;
                case 2:
                    switch (_this.touches.TWO) {
                        case THREE.TOUCH.DOLLY_PAN:
                            if (_this.enableZoom === false && _this.enablePan === false)
                                return;
                            _this.handleTouchStartDollyPan(event);
                            _this.state = STATE.TOUCH_DOLLY_PAN;
                            break;
                        case THREE.TOUCH.DOLLY_ROTATE:
                            if (_this.enableZoom === false && _this.enableRotate === false)
                                return;
                            _this.handleTouchStartDollyRotate(event);
                            _this.state = STATE.TOUCH_DOLLY_ROTATE;
                            break;
                        default:
                            _this.state = STATE.NONE;
                    }
                    break;
                default:
                    _this.state = STATE.NONE;
            }
            if (_this.state !== STATE.NONE) {
                _this.dispatchEvent(START_EVENT);
            }
        };
        _this.onTouchMove = function (event) {
            if (_this.enabled === false)
                return;
            event.preventDefault(); // prevent scrolling
            event.stopPropagation();
            switch (_this.state) {
                case STATE.TOUCH_ROTATE:
                    if (_this.enableRotate === false)
                        return;
                    _this.handleTouchMoveRotate(event);
                    _this.update();
                    break;
                case STATE.TOUCH_PAN:
                    if (_this.enablePan === false)
                        return;
                    _this.handleTouchMovePan(event);
                    _this.update();
                    break;
                case STATE.TOUCH_DOLLY_PAN:
                    if (_this.enableZoom === false && _this.enablePan === false)
                        return;
                    _this.handleTouchMoveDollyPan(event);
                    _this.update();
                    break;
                case STATE.TOUCH_DOLLY_ROTATE:
                    if (_this.enableZoom === false && _this.enableRotate === false)
                        return;
                    _this.handleTouchMoveDollyRotate(event);
                    _this.update();
                    break;
                default:
                    _this.state = STATE.NONE;
            }
        };
        _this.onTouchEnd = function (event) {
            if (_this.enabled === false)
                return;
            _this.dispatchEvent(END_EVENT);
            _this.state = STATE.NONE;
        };
        _this.onContextMenu = function (event) {
            if (_this.enabled === false)
                return;
            event.preventDefault();
        };
        _this.domElement.addEventListener('contextmenu', _this.onContextMenu, false);
        _this.domElement.addEventListener('mousedown', _this.onMouseDown, false);
        _this.domElement.addEventListener('wheel', _this.onMouseWheel, false);
        _this.domElement.addEventListener('touchstart', _this.onTouchStart, false);
        _this.domElement.addEventListener('touchend', _this.onTouchEnd, false);
        _this.domElement.addEventListener('touchmove', _this.onTouchMove, false);
        _this.domElement.addEventListener('keydown', _this.onKeyDown, false);
        // force an update at start
        _this.update();
        return _this;
    }
    OrbitControls.prototype.getPolarAngle = function () {
        return this.spherical.phi;
    };
    OrbitControls.prototype.getAzimuthalAngle = function () {
        return this.spherical.theta;
    };
    OrbitControls.prototype.saveState = function () {
        this.target0.copy(this.target);
        this.position0.copy(this.object.position);
        this.zoom0 = this.object.zoom;
    };
    OrbitControls.prototype.reset = function () {
        this.target.copy(this.target0);
        this.object.position.copy(this.position0);
        this.object.zoom = this.zoom0;
        this.object.updateProjectionMatrix();
        this.dispatchEvent(CHANGE_EVENT);
        this.update();
        this.state = STATE.NONE;
    };
    OrbitControls.prototype.update = function () {
        // var offset = new THREE.Vector3();
        // // so camera.up is the orbit axis
        // var quat = new THREE.Quaternion().setFromUnitVectors(this.object.up, new THREE.Vector3(0, 1, 0));
        // var quatInverse = quat.clone().inverse();
        // var lastPosition = new THREE.Vector3();
        // var lastQuaternion = new THREE.Quaternion();
        var twoPI = 2 * Math.PI;
        var position = this.object.position;
        this.updateOffset.copy(position).sub(this.target);
        // rotate offset to "y-axis-is-up" space
        this.updateOffset.applyQuaternion(this.updateQuat);
        // angle from z-axis around y-axis
        this.spherical.setFromVector3(this.updateOffset);
        if (this.autoRotate && this.state === STATE.NONE) {
            this.rotateLeft(this.getAutoRotationAngle());
        }
        if (this.enableDamping) {
            this.spherical.theta += this.sphericalDelta.theta * this.dampingFactor;
            this.spherical.phi += this.sphericalDelta.phi * this.dampingFactor;
        }
        else {
            this.spherical.theta += this.sphericalDelta.theta;
            this.spherical.phi += this.sphericalDelta.phi;
        }
        // restrict theta to be between desired limits
        var min = this.minAzimuthAngle;
        var max = this.maxAzimuthAngle;
        if (isFinite(min) && isFinite(max)) {
            if (min < -Math.PI)
                min += twoPI;
            else if (min > Math.PI)
                min -= twoPI;
            if (max < -Math.PI)
                max += twoPI;
            else if (max > Math.PI)
                max -= twoPI;
            if (min < max) {
                this.spherical.theta = Math.max(min, Math.min(max, this.spherical.theta));
            }
            else {
                this.spherical.theta = (this.spherical.theta > (min + max) / 2) ?
                    Math.max(min, this.spherical.theta) :
                    Math.min(max, this.spherical.theta);
            }
        }
        // restrict phi to be between desired limits
        this.spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.spherical.phi));
        this.spherical.makeSafe();
        this.spherical.radius *= this.scale;
        // restrict radius to be between desired limits
        this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));
        // move target to panned location
        if (this.enableDamping === true) {
            this.target.addScaledVector(this.panOffset, this.dampingFactor);
        }
        else {
            this.target.add(this.panOffset);
        }
        this.updateOffset.setFromSpherical(this.spherical);
        // rotate offset back to "camera-up-vector-is-up" space
        this.updateOffset.applyQuaternion(this.updateQuatInverse);
        position.copy(this.target).add(this.updateOffset);
        this.object.lookAt(this.target);
        if (this.enableDamping === true) {
            this.sphericalDelta.theta *= (1 - this.dampingFactor);
            this.sphericalDelta.phi *= (1 - this.dampingFactor);
            this.panOffset.multiplyScalar(1 - this.dampingFactor);
        }
        else {
            this.sphericalDelta.set(0, 0, 0);
            this.panOffset.set(0, 0, 0);
        }
        this.scale = 1;
        // update condition is:
        // min(camera displacement, camera rotation in radians)^2 > EPS
        // using small-angle approximation cos(x/2) = 1 - x^2 / 8
        if (this.zoomChanged ||
            this.updateLastPosition.distanceToSquared(this.object.position) > EPS ||
            8 * (1 - this.updateLastQuaternion.dot(this.object.quaternion)) > EPS) {
            this.dispatchEvent(CHANGE_EVENT);
            this.updateLastPosition.copy(this.object.position);
            this.updateLastQuaternion.copy(this.object.quaternion);
            this.zoomChanged = false;
            return true;
        }
        return false;
    };
    OrbitControls.prototype.dispose = function () {
        this.domElement.removeEventListener('contextmenu', this.onContextMenu, false);
        this.domElement.removeEventListener('mousedown', this.onMouseDown, false);
        this.domElement.removeEventListener('wheel', this.onMouseWheel, false);
        this.domElement.removeEventListener('touchstart', this.onTouchStart, false);
        this.domElement.removeEventListener('touchend', this.onTouchEnd, false);
        this.domElement.removeEventListener('touchmove', this.onTouchMove, false);
        document.removeEventListener('mousemove', this.onMouseMove, false);
        document.removeEventListener('mouseup', this.onMouseUp, false);
        this.domElement.removeEventListener('keydown', this.onKeyDown, false);
        //this.dispatchEvent( { type: 'dispose' } ); // should this be added here?
    };
    OrbitControls.prototype.getAutoRotationAngle = function () {
        return 2 * Math.PI / 60 / 60 * this.autoRotateSpeed;
    };
    OrbitControls.prototype.getZoomScale = function () {
        return Math.pow(0.95, this.zoomSpeed);
    };
    OrbitControls.prototype.rotateLeft = function (angle) {
        this.sphericalDelta.theta -= angle;
    };
    OrbitControls.prototype.rotateUp = function (angle) {
        this.sphericalDelta.phi -= angle;
    };
    OrbitControls.prototype.panLeft = function (distance, objectMatrix) {
        this.panLeftV.setFromMatrixColumn(objectMatrix, 0); // get X column of objectMatrix
        this.panLeftV.multiplyScalar(-distance);
        this.panOffset.add(this.panLeftV);
    };
    OrbitControls.prototype.panUp = function (distance, objectMatrix) {
        if (this.screenSpacePanning === true) {
            this.panUpV.setFromMatrixColumn(objectMatrix, 1);
        }
        else {
            this.panUpV.setFromMatrixColumn(objectMatrix, 0);
            this.panUpV.crossVectors(this.object.up, this.panUpV);
        }
        this.panUpV.multiplyScalar(distance);
        this.panOffset.add(this.panUpV);
    };
    // deltaX and deltaY are in pixels; right and down are positive
    OrbitControls.prototype.pan = function (deltaX, deltaY) {
        var element = this.domElement === document ? this.domElement.body : this.domElement;
        if (this._checkPerspectiveCamera(this.object)) {
            // perspective
            var position = this.object.position;
            this.panInternalOffset.copy(position).sub(this.target);
            var targetDistance = this.panInternalOffset.length();
            // half of the fov is center to top of screen
            targetDistance *= Math.tan((this.object.fov / 2) * Math.PI / 180.0);
            // we actually don't use screenWidth, since perspective camera is fixed to screen height
            this.panLeft(2 * deltaX * targetDistance / element.clientHeight, this.object.matrix);
            this.panUp(2 * deltaY * targetDistance / element.clientHeight, this.object.matrix);
        }
        else if (this._checkOrthographicCamera(this.object)) {
            // orthographic
            this.panLeft(deltaX * (this.object.right - this.object.left) / this.object.zoom / element.clientWidth, this.object.matrix);
            this.panUp(deltaY * (this.object.top - this.object.bottom) / this.object.zoom / element.clientHeight, this.object.matrix);
        }
        else {
            // camera neither orthographic nor perspective
            console.warn('WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.');
            this.enablePan = false;
        }
    };
    OrbitControls.prototype.dollyOut = function (dollyScale) {
        if (this.object.isPerspectiveCamera) {
            this.scale /= dollyScale;
        }
        else if (this.object.isOrthographicCamera) {
            this.object.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.object.zoom * dollyScale));
            this.object.updateProjectionMatrix();
            this.zoomChanged = true;
        }
        else {
            console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
            this.enableZoom = false;
        }
    };
    OrbitControls.prototype.dollyIn = function (dollyScale) {
        if (this.object.isPerspectiveCamera) {
            this.scale *= dollyScale;
        }
        else if (this.object.isOrthographicCamera) {
            this.object.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.object.zoom / dollyScale));
            this.object.updateProjectionMatrix();
            this.zoomChanged = true;
        }
        else {
            console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
            this.enableZoom = false;
        }
    };
    OrbitControls.prototype.handleMouseDownRotate = function (event) {
        this.rotateStart.set(event.clientX, event.clientY);
    };
    OrbitControls.prototype.handleMouseDownDolly = function (event) {
        this.dollyStart.set(event.clientX, event.clientY);
    };
    OrbitControls.prototype.handleMouseDownPan = function (event) {
        this.panStart.set(event.clientX, event.clientY);
    };
    OrbitControls.prototype.handleMouseMoveRotate = function (event) {
        this.rotateEnd.set(event.clientX, event.clientY);
        this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart).multiplyScalar(this.rotateSpeed);
        var element = this.domElement;
        this.rotateLeft(2 * Math.PI * this.rotateDelta.x / element.clientHeight); // yes, height
        this.rotateUp(2 * Math.PI * this.rotateDelta.y / element.clientHeight);
        this.rotateStart.copy(this.rotateEnd);
        this.update();
    };
    OrbitControls.prototype.handleMouseMoveDolly = function (event) {
        this.dollyEnd.set(event.clientX, event.clientY);
        this.dollyDelta.subVectors(this.dollyEnd, this.dollyStart);
        if (this.dollyDelta.y > 0) {
            this.dollyOut(this.getZoomScale());
        }
        else if (this.dollyDelta.y < 0) {
            this.dollyIn(this.getZoomScale());
        }
        this.dollyStart.copy(this.dollyEnd);
        this.update();
    };
    OrbitControls.prototype.handleMouseMovePan = function (event) {
        this.panEnd.set(event.clientX, event.clientY);
        this.panDelta.subVectors(this.panEnd, this.panStart).multiplyScalar(this.panSpeed);
        this.pan(this.panDelta.x, this.panDelta.y);
        this.panStart.copy(this.panEnd);
        this.update();
    };
    OrbitControls.prototype.handleMouseUp = function ( /*event*/) {
        // no-op
    };
    OrbitControls.prototype.handleMouseWheel = function (event) {
        if (event.deltaY < 0) {
            this.dollyIn(this.getZoomScale());
        }
        else if (event.deltaY > 0) {
            this.dollyOut(this.getZoomScale());
        }
        this.update();
    };
    OrbitControls.prototype.handleKeyDown = function (event) {
        var needsUpdate = false;
        switch (event.keyCode) {
            case this.keys.UP:
                this.pan(0, this.keyPanSpeed);
                needsUpdate = true;
                break;
            case this.keys.BOTTOM:
                this.pan(0, -this.keyPanSpeed);
                needsUpdate = true;
                break;
            case this.keys.LEFT:
                this.pan(this.keyPanSpeed, 0);
                needsUpdate = true;
                break;
            case this.keys.RIGHT:
                this.pan(-this.keyPanSpeed, 0);
                needsUpdate = true;
                break;
        }
        if (needsUpdate) {
            // prevent the browser from scrolling on cursor keys
            event.preventDefault();
            this.update();
        }
    };
    OrbitControls.prototype.handleTouchStartRotate = function (event) {
        if (event.touches.length == 1) {
            this.rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);
        }
        else {
            var x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
            var y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
            this.rotateStart.set(x, y);
        }
    };
    OrbitControls.prototype.handleTouchStartPan = function (event) {
        if (event.touches.length == 1) {
            this.panStart.set(event.touches[0].pageX, event.touches[0].pageY);
        }
        else {
            var x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
            var y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
            this.panStart.set(x, y);
        }
    };
    OrbitControls.prototype.handleTouchStartDolly = function (event) {
        var dx = event.touches[0].pageX - event.touches[1].pageX;
        var dy = event.touches[0].pageY - event.touches[1].pageY;
        var distance = Math.sqrt(dx * dx + dy * dy);
        this.dollyStart.set(0, distance);
    };
    OrbitControls.prototype.handleTouchStartDollyPan = function (event) {
        if (this.enableZoom)
            this.handleTouchStartDolly(event);
        if (this.enablePan)
            this.handleTouchStartPan(event);
    };
    OrbitControls.prototype.handleTouchStartDollyRotate = function (event) {
        if (this.enableZoom)
            this.handleTouchStartDolly(event);
        if (this.enableRotate)
            this.handleTouchStartRotate(event);
    };
    OrbitControls.prototype.handleTouchMoveRotate = function (event) {
        if (event.touches.length == 1) {
            this.rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
        }
        else {
            var x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
            var y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
            this.rotateEnd.set(x, y);
        }
        this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart).multiplyScalar(this.rotateSpeed);
        var element = this.domElement;
        this.rotateLeft(2 * Math.PI * this.rotateDelta.x / element.clientHeight); // yes, height
        this.rotateUp(2 * Math.PI * this.rotateDelta.y / element.clientHeight);
        this.rotateStart.copy(this.rotateEnd);
    };
    OrbitControls.prototype.handleTouchMovePan = function (event) {
        if (event.touches.length == 1) {
            this.panEnd.set(event.touches[0].pageX, event.touches[0].pageY);
        }
        else {
            var x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
            var y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
            this.panEnd.set(x, y);
        }
        this.panDelta.subVectors(this.panEnd, this.panStart).multiplyScalar(this.panSpeed);
        this.pan(this.panDelta.x, this.panDelta.y);
        this.panStart.copy(this.panEnd);
    };
    OrbitControls.prototype.handleTouchMoveDolly = function (event) {
        var dx = event.touches[0].pageX - event.touches[1].pageX;
        var dy = event.touches[0].pageY - event.touches[1].pageY;
        var distance = Math.sqrt(dx * dx + dy * dy);
        this.dollyEnd.set(0, distance);
        this.dollyDelta.set(0, Math.pow(this.dollyEnd.y / this.dollyStart.y, this.zoomSpeed));
        this.dollyOut(this.dollyDelta.y);
        this.dollyStart.copy(this.dollyEnd);
    };
    OrbitControls.prototype.handleTouchMoveDollyPan = function (event) {
        if (this.enableZoom)
            this.handleTouchMoveDolly(event);
        if (this.enablePan)
            this.handleTouchMovePan(event);
    };
    OrbitControls.prototype.handleTouchMoveDollyRotate = function (event) {
        if (this.enableZoom)
            this.handleTouchMoveDolly(event);
        if (this.enableRotate)
            this.handleTouchMoveRotate(event);
    };
    OrbitControls.prototype.handleTouchEnd = function ( /*event*/) {
        // no-op
    };
    /**
     * TS typeguard. Checks whether the provided camera is PerspectiveCamera.
     * If the check passes (returns true) the passed camera will have the type THREE.PerspectiveCamera in the if branch where the check was performed.
     * @param camera Object to be checked.
     */
    OrbitControls.prototype._checkPerspectiveCamera = function (camera) {
        return camera.isPerspectiveCamera || camera.type == "PerspectiveCamera";
    };
    /**
     * TS typeguard. Checks whether the provided camera is OrthographicCamera.
     * If the check passes (returns true) the passed camera will have the type THREE.OrthographicCamera in the if branch where the check was performed.
     * @param camera Object to be checked.
     */
    OrbitControls.prototype._checkOrthographicCamera = function (camera) {
        return camera.isOrthographicCamera || camera.type == "OrthographicCamera";
    };
    return OrbitControls;
}(THREE.EventDispatcher));
exports.OrbitControls = OrbitControls;
