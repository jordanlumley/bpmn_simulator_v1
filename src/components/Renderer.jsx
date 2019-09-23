import React from "react";
import * as THREE from "three";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { bpmnJson } from "../assets/json/latest";

const scaleFactor = 0.2;

var camera = null;

var taskGroup = null;
var planeGroup = null;
var eventGroup = null;
var gatewayGroup = null;
var edgeGroup = null;


var scene = null;
var parentWrapper = null;

var maxElemX = 0;
var maxElemZ = 0;
var minElemX = 0;
var minElemZ = 0;

export default class Renderer extends React.Component {
    constructor(props) {
        super(props)

        this.createTask = this.createTask.bind(this);
        this.createEdge = this.createEdge.bind(this);
        this.createStartEvent = this.createStartEvent.bind(this);
        this.createEndEvent = this.createEndEvent.bind(this);
        this.createGateWay = this.createGateWay.bind(this);

        var container = document.createElement('div');
        document.body.appendChild(container);

        taskGroup = new THREE.Group();
        planeGroup = new THREE.Group();
        eventGroup = new THREE.Group();
        edgeGroup = new THREE.Group();
        gatewayGroup = new THREE.Group();


        taskGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
        planeGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
        eventGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
        edgeGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
        gatewayGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);


        var aspect = window.innerWidth / window.innerHeight;
        var camera_d = 20;
        camera = new THREE.OrthographicCamera(- camera_d * aspect, camera_d * aspect, camera_d, - camera_d, 1, 100000);
        camera.position.set(2000, 2000, 2000); // all components equal


        scene = new THREE.Scene();
        parentWrapper = new THREE.Group();
        scene.add(parentWrapper);
        var groundMaterial = new THREE.MeshPhongMaterial({
            color: 0x6C6C6C
        });
        var plane = new THREE.Mesh(new THREE.PlaneGeometry(2500, 2500), groundMaterial);
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
        parentWrapper.position.set(-100, 0, -100);
        // parentWrapper.position.multiplyScalar(2);


        var threeRenderer = function () {
            requestAnimationFrame(threeRenderer);

            webglRenderer.render(scene, camera);
        }

        threeRenderer();
    }

    componentDidMount() {
        var that = this;

        var process = bpmnJson.definitions.process;
        var taskLength = process.task.length;
        var startEvent = process.startEvent;
        var endEvent = process.endEvent;
        var gateway = process.exclusiveGateway;


        var bpmnStartEventProps = bpmnJson.definitions.BPMNDiagram.BPMNPlane.BPMNShape;
        var startEventProps = bpmnStartEventProps.filter(function (shape) {
            return shape._bpmnElement === startEvent._id
        });

        that.createStartEvent(startEventProps);

        var bpmnEndEventProps = bpmnJson.definitions.BPMNDiagram.BPMNPlane.BPMNShape;
        var endEventProps = bpmnEndEventProps.filter(function (shape) {
            return shape._bpmnElement === endEvent._id
        });

        that.createEndEvent(endEventProps);

        gateway.map(function (g, i) {
            var bpmnGatewayProps = bpmnJson.definitions.BPMNDiagram.BPMNPlane.BPMNShape;
            var gatewayProps = bpmnGatewayProps.filter(function (shape) {
                return shape._bpmnElement === g._id
            });

            that.createGateWay(gatewayProps);

            that.createEdge(g);
        });

        process.task.map(function (task, i) {
            var bpmnTaskProps = bpmnJson.definitions.BPMNDiagram.BPMNPlane.BPMNShape;
            var taskProps = bpmnTaskProps.filter(function (shape) {
                return shape._bpmnElement === task._id
            });

            that.createTask(i, task, taskProps, function (index) {
                if (index >= taskLength - 1) {
                    parentWrapper.add(taskGroup);

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
                }
            });
        });

        parentWrapper.add(eventGroup);
        parentWrapper.add(edgeGroup);
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

    createTask(i, task, taskProps, cb) {
        var that = this;
        var loader = new GLTFLoader();

        loader.load('../assets/glb/task_hd.glb', function (gltf) {
            gltf.scene.traverse(function (node) {
                if (node instanceof THREE.Mesh) {
                    node.castShadow = true;
                    node.scale.set(5, 5, 5);
                }
            });

            // gltf.scene.rotation.y = -150;
            // gltf.scene.scale.set(.8, .8, .8);
            gltf.scene.position.x = parseFloat(taskProps[0].Bounds._x);
            gltf.scene.position.z = parseFloat(taskProps[0].Bounds._y);
            gltf.scene.position.y = .09;

            taskGroup.add(gltf.scene);

            that.createEdge(task);

            cb(i);
        }, undefined, function (error) {
            console.error(error);
        });
    };

    createEdge(elem) {
        var that = this;
        if (Array.isArray(elem.outgoing) && elem.outgoing.length > 1) {
            elem.outgoing.map(function (id) {
                elem.outgoing = [];
                elem.outgoing = id;
                that.createEdge(elem)
            });
        }
        else if (Array.isArray(elem.incoming) && elem.incoming.length > 1) {
            elem.incoming.map(function (id) {
                elem.incoming = [];
                elem.incoming = id;
                that.createEdge(elem)
            });
        } else {
            var bpmnEdgeProps = bpmnJson.definitions.BPMNDiagram.BPMNPlane.BPMNEdge;
            var edgeEndProps = bpmnEdgeProps.filter(function (edge) {
                return edge._bpmnElement === elem.outgoing
            });

            var edgeStartProps = bpmnEdgeProps.filter(function (edge) {
                return edge._bpmnElement === elem.incoming
            });

            var material = new THREE.LineBasicMaterial({
                color: 0x0000ff
            });


            var geometry = new THREE.Geometry();
            var vertices = [];
            var x1, x2, z1, z2;
            if (edgeStartProps.length > 0) {
                x1 = parseFloat(edgeStartProps[0].waypoint[0]._x);
                x2 = parseFloat(edgeStartProps[0].waypoint[1]._x);
                z1 = parseFloat(edgeStartProps[0].waypoint[0]._y);
                z2 = parseFloat(edgeStartProps[0].waypoint[1]._y);
                vertices.push(
                    new THREE.Vector3(x1, .2, z1),
                    new THREE.Vector3(x2, .2, z2)
                );
            }
            if (edgeEndProps.length > 0) {
                x1 = parseFloat(edgeEndProps[0].waypoint[0]._x);
                x2 = parseFloat(edgeEndProps[0].waypoint[1]._x);
                z1 = parseFloat(edgeEndProps[0].waypoint[0]._y);
                z2 = parseFloat(edgeEndProps[0].waypoint[1]._y);
                vertices.push(
                    new THREE.Vector3(x1, .2, z1),
                    new THREE.Vector3(x2, .2, z2)
                );
            }

            vertices.map(function (vertix) {
                geometry.vertices.push(vertix);
            })


            var line = new THREE.Line(geometry, material);
            edgeGroup.add(line);
        }
    }

    render() {
        return (
            <div style={{ textAlign: "center" }}>
                <button>Play Simulation</button>
            </div>
        );
    }
}


