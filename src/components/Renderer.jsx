import React from "react";
import * as THREE from "three";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { bpmnJson } from "../assets/json/latest.js";

const scaleFactor = 0.2;
var webglRenderer;
var camera;

var scene;
var parentWrapper;

// var taskGroup, planeGroup, eventGroup, gatewayGroup, edgeGroup, streetGroup;

var subPlaneBBox;

var streetGltf, taskGltf;

var maxElemX, maxElemZ, minElemX, minElemZ = 0;

var raycaster;

var mouse;

export default class Renderer extends React.Component {
    constructor(props) {
        super(props)

        this.createGeneric = this.createGeneric.bind(this);
        this.createEdge = this.createEdge.bind(this);
        this.createStartEvent = this.createStartEvent.bind(this);
        this.createEndEvent = this.createEndEvent.bind(this);
        this.createGateWay = this.createGateWay.bind(this);
        this.initStreet = this.initStreet.bind(this);
        this.initTask = this.initTask.bind(this);
        this.findUpParent = this.findUpParent.bind(this);
        this.onClick = this.onClick.bind(this);

        var container = document.createElement('div');
        document.body.appendChild(container);

        mouse = new THREE.Vector2();
        raycaster = new THREE.Raycaster();

        // taskGroup = new THREE.Group();
        // planeGroup = new THREE.Group();
        // eventGroup = new THREE.Group();
        // edgeGroup = new THREE.Group();
        // gatewayGroup = new THREE.Group();
        // streetGroup = new THREE.Group();

        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 10, 10000);
        camera.position.set(200, 50, 200); // all components equal

        scene = new THREE.Scene();
        parentWrapper = new THREE.Group();

        var groundMaterial = new THREE.MeshPhongMaterial({
            color: 0x6C6C6C
        });
        var plane = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), groundMaterial);
        plane.rotation.x = -Math.PI / 2;
        plane.receiveShadow = true;
        scene.add(plane);

        // LIGHTS
        scene.add(new THREE.AmbientLight(0x666666));

        var light;

        light = new THREE.DirectionalLight(0xdfebff, 1.75);
        light.position.set(500, 500, 200);
        light.position.multiplyScalar(1.3);

        light.castShadow = true;

        light.shadowMapWidth = 1500;
        light.shadowMapHeight = 1500;

        var light_d = 200;

        light.shadowCameraLeft = -light_d;
        light.shadowCameraRight = light_d;
        light.shadowCameraTop = light_d;
        light.shadowCameraBottom = -light_d;

        light.shadowCameraFar = 5000;
        light.shadowDarkness = 0.2;

        var helper = new THREE.DirectionalLightHelper(light, 5);

        scene.add(light);

        var axesHelper = new THREE.AxesHelper(50);

        var size = 500;
        var divisions = 10;
        var gridHelper = new THREE.GridHelper(size, divisions);
        scene.add(gridHelper);

        scene.add(axesHelper);

        // RENDERER
        webglRenderer = new THREE.WebGLRenderer({ antialias: true });
        webglRenderer.setSize(window.innerWidth, window.innerHeight);
        webglRenderer.shadowMapEnabled = true;
        webglRenderer.shadowMapSoft = true;
        webglRenderer.shadowMapType = THREE.PCFSoftShadowMap;
        webglRenderer.domElement.addEventListener("click", this.onClick, true);

        var controls = new OrbitControls(camera, webglRenderer.domElement);

        container.appendChild(webglRenderer.domElement);


        // window.addEventListener('resize', onWindowResize, false);
        // parentWrapper.position.multiplyScalar(2);
        // var bbox = new THREE.Box3().setFromObject(parentWrapper);

        scene.add(parentWrapper);


        var threeRenderer = function () {
            requestAnimationFrame(threeRenderer);

            parentWrapper.position.z = -(minElemZ);
            parentWrapper.position.x = -(maxElemX / 2);

            camera.lookAt(scene.position)
            webglRenderer.render(scene, camera);
        }

        threeRenderer();
    }

    componentDidMount() {
        var that = this;

        var process = bpmnJson.definitions.process;
        var startEvent = process.startEvent;
        var endEvent = process.endEvent;
        var gateway = process.exclusiveGateway;
        var edges = bpmnJson.definitions.BPMNDiagram.BPMNPlane.BPMNEdge;


        var bpmnStartEventProps = bpmnJson.definitions.BPMNDiagram.BPMNPlane.BPMNShape;
        var startEventProps = bpmnStartEventProps.filter(function (shape) {
            return shape._bpmnElement === startEvent._id
        });

        this.createStartEvent(startEventProps);

        var bpmnEndEventProps = bpmnJson.definitions.BPMNDiagram.BPMNPlane.BPMNShape;
        var endEventProps = bpmnEndEventProps.filter(function (shape) {
            return shape._bpmnElement === endEvent._id
        });

        this.createEndEvent(endEventProps);

        gateway.map(function (g, i) {
            var bpmnGatewayProps = bpmnJson.definitions.BPMNDiagram.BPMNPlane.BPMNShape;
            var gatewayProps = bpmnGatewayProps.filter(function (shape) {
                return shape._bpmnElement === g._id
            });

            that.createGateWay(gatewayProps);
        });

        this.initTask(function () {
            process.task.map(function (task) {
                var bpmnTaskProps = bpmnJson.definitions.BPMNDiagram.BPMNPlane.BPMNShape;
                var taskProps = bpmnTaskProps.filter(function (shape) {
                    return shape._bpmnElement === task._id
                });

                var props = { ...task, ...taskProps[0] };
                that.createGeneric(taskGltf, props, function (elem) {
                    parentWrapper.add(elem);
                });
            });

            var borderMaterial = new THREE.MeshPhongMaterial({
                color: 0x99999
            });
            var innerPlane = new THREE.Mesh(new THREE.PlaneGeometry(maxElemX, maxElemZ), borderMaterial);
            innerPlane.rotation.x = -Math.PI / 2;
            innerPlane.position.y = .1;
            innerPlane.position.x = ((maxElemX + minElemX) / 2);
            innerPlane.position.z = minElemZ;
            innerPlane.receiveShadow = true;

            subPlaneBBox = new THREE.Box3().setFromObject(innerPlane)

            parentWrapper.add(innerPlane);

            // parentWrapper.add(planeGroup)
        });


        edges.map(function (edge) {
            that.createEdge(edge);
        });

        // this.initStreet(function () {
        //     edgeGroup.children.map(function (edge, i) {
        //         edge.geometry.vertices.map(function (vertix) {
        //             that.createStreet(streetGltf, vertix, function (elem) {
        //                 streetGroup.add(elem);
        //             });
        //         });
        //     });
        // });

        // parentWrapper.add(eventGroup);
        // parentWrapper.add(taskGroup);
        // parentWrapper.add(edgeGroup);
        // parentWrapper.add(streetGroup);
        // parentWrapper.add(gatewayGroup);
    }

    createStartEvent(startEventProps) {
        var loader = new GLTFLoader();

        loader.load('../assets/glb/start.glb', function (gltf) {
            gltf.scene.scale.set(5, 5, 5);
            gltf.scene.position.x = parseFloat(startEventProps[0].Bounds._x);
            gltf.scene.position.z = parseFloat(startEventProps[0].Bounds._y);
            parentWrapper.add(gltf.scene);

            minElemX = parseFloat(gltf.scene.position.x);
            minElemZ = parseFloat(gltf.scene.position.z);
        }, undefined, function (error) {
            console.error(error);
        });

        // var geometry = new THREE.BoxGeometry(10, 10, 10);
        // var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        // var cube = new THREE.Mesh(geometry, material);

    }

    createEndEvent(endEventProps) {

        var loader = new GLTFLoader();

        loader.load('../assets/glb/end.glb', function (gltf) {
            gltf.scene.scale.set(5, 5, 5);
            gltf.scene.position.x = parseFloat(endEventProps[0].Bounds._x);
            gltf.scene.position.z = parseFloat(endEventProps[0].Bounds._y);
            parentWrapper.add(gltf.scene);

            maxElemX = parseFloat(gltf.scene.position.x);
            maxElemZ = parseFloat(gltf.scene.position.z);
        }, undefined, function (error) {
            console.error(error);
        });
    }

    createGateWay(gatewayProps, cb) {
        var geometry = new THREE.SphereGeometry(5, 32, 32);
        var material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        var sphere = new THREE.Mesh(geometry, material);
        sphere.position.x = parseFloat(gatewayProps[0].Bounds._x);
        sphere.position.z = parseFloat(gatewayProps[0].Bounds._y);
        sphere.scale.set(5, 5, 5);
        parentWrapper.add(sphere);
    }

    initTask(cb) {
        var loader = new GLTFLoader();

        loader.load('../assets/glb/task_hd.glb', function (gltf) {
            gltf.scene.traverse(function (node) {
                if (node instanceof THREE.Mesh) {
                    node.castShadow = true;
                    // node.scale.set(5, 5, 5);
                }
                gltf.scene.rotation.y = -150;
                gltf.scene.scale.set(5, 5, 5);
            });

            // gltf.scene.rotation.y = -150;
            taskGltf = gltf;

            cb();
        }, undefined, function (error) {
            console.error(error);
        });
    };

    createEdge(elem) {
        var geometry = new THREE.Geometry();
        var vertices = [];

        elem.waypoint.map(function (waypoint) {
            var x = parseFloat(waypoint._x);
            var z = parseFloat(waypoint._y);
            vertices.push(
                new THREE.Vector3(x, .2, z)
            );
        });

        vertices.map(function (vertix) {
            geometry.vertices.push(vertix);
        });

        var material = new THREE.LineBasicMaterial({
            color: 0x0000ff
        });

        var line = new THREE.Line(geometry, material);
        parentWrapper.add(line);
    }

    initStreet(cb) {
        var loader = new GLTFLoader();

        loader.load('../assets/glb/street.glb', function (gltf) {
            // gltf.scene.scale.set(5, 5, 5);
            gltf.scene.rotation.y = 190;
            streetGltf = gltf.scene;

            cb();
        }, undefined, function (error) {
            console.error(error);
        });
    };

    createGeneric(elem, props, cb) {

        var vertix = { x: parseFloat(props.Bounds._x), z: parseFloat(props.Bounds._y), y: 0.09 };

        var x = parseFloat(vertix.x + parseFloat(props.Bounds._width / 2));
        var z = parseFloat(vertix.z + parseFloat(props.Bounds._height / 2));
        var y = parseFloat(vertix.y);
        elem.scene.position.x = x;
        elem.scene.position.y = y;
        elem.scene.position.z = z;

        elem.scene.userData = {
            type: 'root',
            props: props
        }

        var cloned = elem.scene.clone();

        cb(cloned);
    }

    onClick(e) {
        e.preventDefault();
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        var intersects = raycaster.intersectObjects(parentWrapper.children, true);
        for (var i = 0; i < intersects.length; i++) {
            var rootElement = this.findUpParent(intersects[i].object, 'root');

            if (rootElement && !rootElement.userData.props.contextMenuOpened) {
                var geometry = new THREE.BoxGeometry(100, 100, 1);
                var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
                var cube = new THREE.Mesh(geometry, material);
                cube.position.x = parseFloat(rootElement.userData.props.Bounds._x);
                cube.position.z = parseFloat(rootElement.userData.props.Bounds._y);
                cube.position.y = 100;
                cube.rotation.y = -150;
                cube.userData = {
                    contextMenu: 'adsf'
                }

                rootElement.userData.props.contextMenuOpened = true;
                parentWrapper.add(cube);
                return;
            }
        }
    }

    findUpParent(obj, tag) {
        while (obj.parent) {
            obj = obj.parent;
            if (obj.userData) {
                if (obj.userData.type === tag)
                    return obj;
            }
        }
        return null;
    }

    render() {
        return (
            <div style={{ textAlign: "center" }}>
                <button>Play Simulation</button>
            </div>
        );
    }
}


