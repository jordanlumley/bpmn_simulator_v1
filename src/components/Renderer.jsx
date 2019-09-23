import React from "react";
import * as THREE from "three";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { bpmnJson } from "../assets/json/latest.js";

const scaleFactor = 0.2;

var camera = null;

var scene = null;
var parentWrapper = null;

var taskGroup, planeGroup, eventGroup, gatewayGroup, edgeGroup, streetGroup = null;

var streetGltf, taskGltf;

var maxElemX, maxElemZ, minElemX, minElemZ = 0;

export default class Renderer extends React.Component {
    constructor(props) {
        super(props)

        this.createTask = this.createTask.bind(this);
        this.createEdge = this.createEdge.bind(this);
        this.createStartEvent = this.createStartEvent.bind(this);
        this.createEndEvent = this.createEndEvent.bind(this);
        this.createGateWay = this.createGateWay.bind(this);
        this.createStreet = this.createStreet.bind(this);
        this.initStreet = this.initStreet.bind(this);
        this.initTask = this.initTask.bind(this);

        var container = document.createElement('div');
        document.body.appendChild(container);

        taskGroup = new THREE.Group();
        planeGroup = new THREE.Group();
        eventGroup = new THREE.Group();
        edgeGroup = new THREE.Group();
        gatewayGroup = new THREE.Group();
        streetGroup = new THREE.Group();


        taskGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
        streetGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
        planeGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
        eventGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
        edgeGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
        gatewayGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);

        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 10, 10000);
        camera.position.set(200, 50, 200); // all components equal

        scene = new THREE.Scene();
        parentWrapper = new THREE.Group();
        parentWrapper.position.set(-100, 0, -100);

        scene.add(parentWrapper);
        var groundMaterial = new THREE.MeshPhongMaterial({
            color: 0x6C6C6C
        });
        var plane = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), groundMaterial);
        plane.rotation.x = -Math.PI / 2;
        plane.receiveShadow = true;
        parentWrapper.add(plane);

        // LIGHTS
        parentWrapper.add(new THREE.AmbientLight(0x666666));

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

        parentWrapper.add(light);

        var axesHelper = new THREE.AxesHelper(50);

        var size = 500;
        var divisions = 10;
        var gridHelper = new THREE.GridHelper(size, divisions);
        parentWrapper.add(gridHelper);

        parentWrapper.add(axesHelper);

        // RENDERER
        var webglRenderer = new THREE.WebGLRenderer({ antialias: true });
        webglRenderer.setSize(window.innerWidth, window.innerHeight);
        webglRenderer.shadowMapEnabled = true;
        webglRenderer.shadowMapSoft = true;
        webglRenderer.shadowMapType = THREE.PCFSoftShadowMap;

        var controls = new OrbitControls(camera, webglRenderer.domElement);

        container.appendChild(webglRenderer.domElement);
        // window.addEventListener('resize', onWindowResize, false);
        // parentWrapper.position.multiplyScalar(2);

        var threeRenderer = function () {
            requestAnimationFrame(threeRenderer);

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

                var vertix = { x: taskProps[0].Bounds._x, z: taskProps[0].Bounds._y, y: 0.09 };

                that.createTask(taskGltf, vertix, function (elem) {
                    taskGroup.add(elem);
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

            planeGroup.add(innerPlane);

            parentWrapper.add(planeGroup)
        });


        edges.map(function (edge) {
            that.createEdge(edge);
        });

        this.initStreet(function () {
            edgeGroup.children.map(function (edge, i) {
                edge.geometry.vertices.map(function (vertix) {
                    that.createStreet(streetGltf, vertix, function (elem) {
                        streetGroup.add(elem);
                    });
                });
            });
        });

        parentWrapper.add(eventGroup);
        parentWrapper.add(taskGroup);
        parentWrapper.add(edgeGroup);
        parentWrapper.add(streetGroup);
        parentWrapper.add(gatewayGroup);
    }

    createStartEvent(startEventProps, cb) {
        var geometry = new THREE.BoxGeometry(10, 10, 10);
        var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        var cube = new THREE.Mesh(geometry, material);
        cube.position.x = parseFloat(startEventProps[0].Bounds._x);
        cube.position.z = parseFloat(startEventProps[0].Bounds._y);
        eventGroup.add(cube);

        minElemX = parseFloat(cube.position.x);
        minElemZ = parseFloat(cube.position.z);
    }

    createEndEvent(endEventProps, cb) {
        var geometry = new THREE.BoxGeometry(10, 10, 10);
        var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        var cube = new THREE.Mesh(geometry, material);
        cube.position.x = parseFloat(endEventProps[0].Bounds._x);
        cube.position.z = parseFloat(endEventProps[0].Bounds._y);
        eventGroup.add(cube);

        maxElemX = parseFloat(cube.position.x);
        maxElemZ = parseFloat(cube.position.z);
    }

    createGateWay(gatewayProps, cb) {
        var geometry = new THREE.SphereGeometry(5, 32, 32);
        var material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        var sphere = new THREE.Mesh(geometry, material);
        sphere.position.x = parseFloat(gatewayProps[0].Bounds._x);
        sphere.position.z = parseFloat(gatewayProps[0].Bounds._y);
        gatewayGroup.add(sphere);
    }

    initTask(cb) {
        var loader = new GLTFLoader();

        loader.load('../assets/glb/task_hd.glb', function (gltf) {
            gltf.scene.traverse(function (node) {
                if (node instanceof THREE.Mesh) {
                    node.castShadow = true;
                    // node.scale.set(5, 5, 5);
                }
                gltf.scene.scale.set(5, 5, 5);
            });
            taskGltf = gltf.scene;

            cb();
        }, undefined, function (error) {
            console.error(error);
        });
    };

    createTask(elem, vertix, cb) {

        var x = parseFloat(vertix.x);
        var z = parseFloat(vertix.z);
        var y = parseFloat(vertix.y);
        elem.position.x = x;
        elem.position.y = y;
        elem.position.z = z;

        var cloned = elem.clone();

        cb(cloned);
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
        edgeGroup.add(line);
    }

    initStreet(cb) {
        var loader = new GLTFLoader();

        loader.load('../assets/glb/street.glb', function (gltf) {
            streetGltf = gltf.scene;

            cb();
        }, undefined, function (error) {
            console.error(error);
        });
    };

    createStreet(elem, vertix, cb) {
        var x = parseFloat(vertix.x);
        var z = parseFloat(vertix.z);
        var y = parseFloat(vertix.y);
        elem.position.x = x;
        elem.position.y = y;
        elem.position.z = z;

        var cloned = elem.clone();

        cb(cloned);
    };

    render() {
        return (
            <div style={{ textAlign: "center" }}>
                <button>Play Simulation</button>
            </div>
        );
    }
}


