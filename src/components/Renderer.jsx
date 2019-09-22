import React from "react";
import * as THREE from "three";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { bpmnJson } from "../assets/json/latest";

// import { config } from "../phaser/config/config"

// import taskImg from "../assets/sprites/task/task_3d.png"
// import taskSpriteSheet from "../assets/sprites/task/spritesheet.png"

// import { bpmnJson } from "../assets/xml/latest";

let camera = null;
let group = null;
let scene = null;

export default class Renderer extends React.Component {
    constructor(props) {
        super(props)

        this.createTask = this.createTask.bind(this);

        var container = document.createElement('div');
        document.body.appendChild(container);

        group = new THREE.Group();

        var aspect = window.innerWidth / window.innerHeight;
        var d = 20;
        camera = new THREE.OrthographicCamera(- d * aspect, d * aspect, d, - d, 1, 1000);
        camera.position.set(200, 200, 200); // all components equal


        scene = new THREE.Scene();

        var groundMaterial = new THREE.MeshPhongMaterial({
            color: 0x6C6C6C
        });
        var plane = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1500), groundMaterial);
        plane.rotation.x = -Math.PI / 2;
        plane.receiveShadow = true;

        scene.add(plane);

        // LIGHTS
        scene.add(new THREE.AmbientLight(0x666666));

        var light;

        light = new THREE.DirectionalLight(0xdfebff, 1.75);
        light.position.set(100, 200, 100);
        light.position.multiplyScalar(1.3);

        light.castShadow = true;

        light.shadowMapWidth = 1000;
        light.shadowMapHeight = 1000;

        var d = 200;

        light.shadowCameraLeft = -d;
        light.shadowCameraRight = d;
        light.shadowCameraTop = d;
        light.shadowCameraBottom = -d;

        light.shadowCameraFar = 1000;
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
        var webglRenderer = new THREE.WebGLRenderer({ antialias: true });
        webglRenderer.setSize(window.innerWidth, window.innerHeight);
        webglRenderer.shadowMapEnabled = true;
        webglRenderer.shadowMapSoft = true;
        webglRenderer.shadowMapType = THREE.PCFSoftShadowMap;

        var controls = new OrbitControls(camera, webglRenderer.domElement);

        //controls.update() must be called after any manual changes to the camera's transform
        container.appendChild(webglRenderer.domElement);
        // window.addEventListener('resize', onWindowResize, false);

        var threeRenderer = function () {
            requestAnimationFrame(threeRenderer);

            camera.lookAt(scene.position); // or the origin
            webglRenderer.render(scene, camera);
        }

        threeRenderer();
    }

    componentDidMount() {
        var that = this;


        bpmnJson.definitions.process.task.map(function (task, i) {
            var bpmnShape = bpmnJson.definitions.BPMNDiagram.BPMNPlane.BPMNShape;
            var taskProps = bpmnShape.filter(function (shape) {
                return shape._bpmnElement == task._id
            })

            that.createTask(i, task, scene, taskProps)
        });

        scene.add(group);
    }

    createTask(i, task, taskShape, taskProps) {
        var loader = new GLTFLoader();

        loader.load('../assets/glb/task.glb', function (gltf) {
            gltf.scene.traverse(function (node) {
                if (node instanceof THREE.Mesh) {
                    node.castShadow = true;
                    node.scale.set(.1, .1, .1)
                }
            });

            gltf.scene.scale.set(.5, .5, .5)
            gltf.scene.rotation.y = -150;
            gltf.scene.position.x = taskProps[0].Bounds._x / 8;
            gltf.scene.position.z = taskProps[0].Bounds._y / 8;

            group.add(gltf.scene);
        }, undefined, function (error) {
            console.error(error);
        });
    };


    render() {
        return (
            <div style={{ textAlign: "center" }}>
                asadf
            </div>
        );
    }
}
