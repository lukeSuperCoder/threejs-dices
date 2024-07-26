import * as CANNON from "cannon-es";
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 实例化一个gui对象
// const gui = new GUI();
// //改变交互界面style属性
// gui.domElement.style.right = '0px';
// gui.domElement.style.width = '300px';

const option = {
    z: -24,
    x: -36,
    y: -17,
    z1: 1,
    x1: 1,
    y1: 1,
}
// //gui控制参数
// const folder_position = gui.addFolder('速度方向');
// folder_position.add(option, 'z', -100, 100);
// folder_position.add(option, 'x', -100, 100);
// folder_position.add(option, 'y', -100, 100);
// const folder_rotation = gui.addFolder('角度');
// folder_rotation.add(option, 'z1', -10, 10).step(0.1);
// folder_rotation.add(option, 'x1', -10, 10).step(0.1);
// folder_rotation.add(option, 'y1', -10, 10).step(0.1);

// CANNON.World创建物理世界对象
const world = new CANNON.World();
// 设置物理世界重力加速度
// world.gravity.set(0, -1000, 0); //重力加速度： 单位：m/s²
world.gravity.set(0, -100, 0);




//网格球体（gltf模型）
const loader = new GLTFLoader();
const gltf = await loader.loadAsync('./assets/model/dice_model.glb');

const meshModel = gltf.scene;//获取箱子网格模型
meshModel.position.set(50,30,50);
meshModel.scale.set(5,5,5);
scene.add(meshModel);
const meshModelCopy = meshModel.clone();
scene.add(meshModelCopy);

//包围盒计算
const box3 = new THREE.Box3();
box3.expandByObject(meshModel);//计算模型包围盒
const size = new THREE.Vector3();
box3.getSize(size);//包围盒计算箱子的尺寸

// 物理球体
const sphereMaterial = new CANNON.Material()//碰撞体材质
// 物理箱子
const bodyModel = new CANNON.Body({
    mass: 0.3, // 碰撞体质量0.3kg
    position: new CANNON.Vec3(50,30,50), // 位置
    shape: new CANNON.Box(new CANNON.Vec3(size.x/2, size.y/2, size.z/2)),
    material: sphereMaterial
});

const bodyModelCopy = new CANNON.Body({
    mass: 0.3, // 碰撞体质量0.3kg
    position: new CANNON.Vec3(50,30,50), // 位置
    shape: new CANNON.Box(new CANNON.Vec3(size.x/2, size.y/2, size.z/2)),
    material: sphereMaterial
});

// 骨骼辅助显示
const skeletonHelper = new THREE.SkeletonHelper(meshModel);
scene.add(skeletonHelper);

// world.addBody(bodyModel);

//添加空气墙
// Create air walls
const wallShape = new CANNON.Box(new CANNON.Vec3(100, 100, 0.1));
    
const wall1 = new CANNON.Body({ mass: 0 });
wall1.addShape(wallShape);
wall1.position.set(0, 100, -100); // Back wall
world.addBody(wall1);

const wall2 = new CANNON.Body({ mass: 0 });
wall2.addShape(wallShape);
wall2.position.set(0, 100, 100); // Front wall
world.addBody(wall2);

const wall3 = new CANNON.Body({ mass: 0 });
wall3.addShape(wallShape);
wall3.quaternion.setFromEuler(0, Math.PI / 2, 0); // Rotate for side walls
wall3.position.set(100, 100, 0); // Right wall
world.addBody(wall3);

const wall4 = new CANNON.Body({ mass: 0 });
wall4.addShape(wallShape);
wall4.quaternion.setFromEuler(0, Math.PI / 2, 0); // Rotate for side walls
wall4.position.set(-100, 100, 0); // Left wall
world.addBody(wall4);

camera.position.set(42,85,21)
camera.lookAt(0,10,0);

// 物理地面
const groundMaterial = new CANNON.Material()
const groundBody = new CANNON.Body({
    mass: 0, // 质量为0，始终保持静止，不会受到力碰撞或加速度影响
    shape: new CANNON.Plane(),
    material: groundMaterial,
});
// 改变平面默认的方向，法线默认沿着z轴，旋转到平面向上朝着y方向
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);//旋转规律类似threejs 平面
world.addBody(groundBody)

//设置物理世界参数
const contactMaterial = new CANNON.ContactMaterial(groundMaterial, sphereMaterial, {
    restitution: 0.5, //反弹恢复系数
})
// 把关联的材质添加到物理世界中
world.addContactMaterial(contactMaterial)

//光源设置
const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(20, 100, 10);
scene.add(directionalLight);


// 网格地面
const planeGeometry = new THREE.PlaneGeometry(1000, 1000);
const texture = new THREE.TextureLoader().load('./assets/textures/hardwood2_diffuse.jpg');
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
texture.repeat.set(10, 10);
const planeMaterial = new THREE.MeshLambertMaterial({
    // color:0x777777,
    map: texture,
});
const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
planeMesh.rotateX(-Math.PI / 2);
scene.add(planeMesh);

// 添加一个辅助网格地面
// const gridHelper = new THREE.GridHelper(50, 50, 0x004444, 0x004444);
// scene.add(gridHelper);


var controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // 允许阻尼效果
controls.dampingFactor = 0.25; // 阻尼系数

let start_throw = false;
renderer.domElement.addEventListener('click', function (event) {
    start_throw = true;
    clearPoints();
    const randomEuler = Math.random()*3;
    const randomEuler2 = Math.random()*10;
    bodyModel.quaternion.setFromEuler(Math.PI / randomEuler, Math.PI / randomEuler, Math.PI / randomEuler);
    bodyModelCopy.quaternion.setFromEuler(Math.PI / randomEuler2, Math.PI / randomEuler2, Math.PI / randomEuler2);
    bodyModel.position.set(0,50,0);//点击按钮，body回到下落的初始位置
    bodyModelCopy.position.set(20,50,0);//点击按钮，body回到下落的初始位置
    // 为物体设置初始速度（用以产生抛物线效果）
    bodyModel.velocity.set(option.x,option.y,option.z); // x, y, z 方向上的速度
    bodyModelCopy.velocity.set(option.x,option.y,option.z); // x, y, z 方向上的速度
    // 选中模型的第一个模型，开始下落
    world.addBody(bodyModel);
    world.addBody(bodyModelCopy);
})
const audio = new Audio('./assets/audio/peng.mp3');
bodyModel.addEventListener('collide', (event) => {
    const contact = event.contact;
    //获得沿法线的冲击速度
    const ImpactV = contact.getImpactVelocityAlongNormal();
    // 碰撞越狠，声音越大
    if(ImpactV/35>1) {
        audio.volume = 1;
    } else {
        audio.volume = ImpactV/35>0?ImpactV/35:0;
    }
    audio.currentTime = 0;
    audio.play();
})

//判断物体是否停止运动
function isBodyStopped(body, linearVelocityThreshold = 0.1, angularVelocityThreshold = 0.1) {
    // 获取物体的线性速度和角速度
    const linearVelocityMagnitude = body.velocity.length();
    const angularVelocityMagnitude = body.angularVelocity.length();

    // 判断速度是否低于设定的阈值
    return linearVelocityMagnitude < linearVelocityThreshold && angularVelocityMagnitude < angularVelocityThreshold;
}

function showPoints() {
    let res = getUpperFace(meshModel) + getUpperFace(meshModelCopy);
    let point = document.getElementById("points");
    point.innerHTML = `点数：${res}`
}

//相机跟随物体移动
function locateView() {
    camera.position.x = meshModel.position.x;
    camera.position.y = meshModel.position.y + 30;
    camera.position.z = meshModel.position.z + 20;
    camera.lookAt(meshModel.position)
}

function clearPoints() {
    let point = document.getElementById("points");
    point.innerHTML = ``
}
//获取朝上面的点数
function getUpperFace(mesh) {
    // 定义每个面的局部法线向量（手动定义）
    const localNormals = [
        new THREE.Vector3(0, 1, 0),  // 面1
        new THREE.Vector3(0, 0, -1),  // 面2
        new THREE.Vector3(-1, 0, 0), // 面3
        new THREE.Vector3(1, 0, 0),  // 面4
        new THREE.Vector3(0, 0, 1),  // 面5
        new THREE.Vector3(0, -1, 0), // 面6
    ];
    
    let maxDot = -Infinity;
    let faceValue = 0;
    for (let i = 0; i < localNormals.length; i++) {
        // 将局部法线向量转化为世界空间
        const worldNormal = localNormals[i].clone().applyQuaternion(mesh.quaternion);
    
        // 与全局上方向的点积
        const dot = worldNormal.dot(new THREE.Vector3(0, 1, 0));
    
        // 检查点积，找到最大值
        if (dot > maxDot) {
            maxDot = dot;
            faceValue = i + 1; // 面的点数即为索引加1
        }
    }
    
    return faceValue;
}
function render() {
    world.step(1/60);//更新物理计算
    meshModel.position.copy(bodyModel.position);  //渲染循环中，同步物理球body与网格球mesh的位置
    meshModel.quaternion.copy(bodyModel.quaternion);   //同步姿态角度
    meshModelCopy.position.copy(bodyModelCopy.position);  //渲染循环中，同步物理球body与网格球mesh的位置
    meshModelCopy.quaternion.copy(bodyModelCopy.quaternion);   //同步姿态角度
    // locateView();   //相机跟随物体移动
    requestAnimationFrame(render);
    renderer.render(scene, camera);
    if (isBodyStopped(bodyModel)&&start_throw) {
        showPoints();   //停止运动后，显示点数
        start_throw = false;
    }
}
render();
