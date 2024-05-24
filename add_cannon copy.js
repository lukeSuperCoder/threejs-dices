import * as CANNON from "cannon-es";
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
camera.position.z = 80;
camera.position.y = 50;
camera.position.x = 50;


// CANNON.World创建物理世界对象
const world = new CANNON.World();
// 设置物理世界重力加速度
world.gravity.set(0, -1000, 0); //重力加速度： 单位：m/s²
// world.gravity.set(0, -50, 0);


// 物理球体
const sphereMaterial = new CANNON.Material()//碰撞体材质
const bodyShape = new CANNON.Sphere(10); // 球体
const body = new CANNON.Body({
    mass: 0.3, // 碰撞体质量0.3kg
    position: new CANNON.Vec3(0, 1, 0), // 位置
    shape: bodyShape,
    material: sphereMaterial
});

//物理正方体
const boxShape = new CANNON.Box(new CANNON.Vec3(10, 10, 10));
const bodyBox = new CANNON.Body({
    mass: 0.3, // 碰撞体质量0.3kg
    position: new CANNON.Vec3(0, 1, 0), // 位置
    shape: boxShape,
    material: sphereMaterial
});

body.position.y = 50;
bodyBox.position.set(50,50,0);
// world.addBody(bodyBox);
// world.addBody(body);

//gltf模型
const loader = new GLTFLoader();
var meshModel = null;
var bodyModel = null;
loader.setPath( './assets/model/');
loader.load('dice.glb', async function ( gltf ) {
        // 骨骼辅助显示
        const skeletonHelper = new THREE.SkeletonHelper(gltf.scene);
        scene.add(skeletonHelper);
        meshModel = gltf.scene;//获取箱子网格模型
        meshModel.position.set(100,50,0);
        // meshModel.scale.set(10,10,10);
        scene.add(meshModel);
        //包围盒计算
        const box3 = new THREE.Box3();
        box3.expandByObject(meshModel);//计算模型包围盒
        const size = new THREE.Vector3();
        box3.getSize(size);//包围盒计算箱子的尺寸
        //物理对应模型
        // 物理箱子
        bodyModel = new CANNON.Body({
            mass: 0.3, // 碰撞体质量0.3kg
            position: new CANNON.Vec3(100,50,0), // 位置
            shape: new CANNON.Box(new CANNON.Vec3(size.x/2, size.y/2, size.z/2)),
            material: sphereMaterial
        });
        // bodyModel.quaternion.setFromEuler(Math.PI / 3, Math.PI / 3, Math.PI / 3);

        // world.addBody(bodyModel);
})




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

// 改变平面默认的方向，法线默认沿着z轴，旋转到平面向上朝着y方向
//旋转规律类似threejs 平面
body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
bodyBox.quaternion.setFromEuler(Math.PI / 3, Math.PI / 3, Math.PI / 3);


const contactMaterial = new CANNON.ContactMaterial(groundMaterial, sphereMaterial, {
    restitution: 0.7, //反弹恢复系数
})

//光源设置
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(100, 60, 50);
scene.add(directionalLight);
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

// 网格小球
const geometry = new THREE.SphereGeometry(10);
const material = new THREE.MeshLambertMaterial({
    color: 0xff0000,
});
const mesh = new THREE.Mesh(geometry, material);
mesh.name = 'Sphere';
mesh.position.y = 50;
scene.add(mesh);

//网格盒子
const boxGeometry = new THREE.BoxGeometry(10, 10, 10);
const meshBox = new THREE.Mesh(boxGeometry, material);
meshBox.name = 'Box';
meshBox.position.set(50,50,0);
meshBox.rotation.set(Math.PI / 3, Math.PI / 3, Math.PI / 3);
scene.add(meshBox);


// 网格地面
const planeGeometry = new THREE.PlaneGeometry(500, 500);
const texture = new THREE.TextureLoader().load('./assets/model/textures/brick_diffuse.jpg');
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
texture.repeat.set(3, 3);
const planeMaterial = new THREE.MeshLambertMaterial({
    color:0x777777,
    map: texture,
});
const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
planeMesh.rotateX(-Math.PI / 2);
scene.add(planeMesh);


// 把关联的材质添加到物理世界中
world.addContactMaterial(contactMaterial)



var controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // 允许阻尼效果
controls.dampingFactor = 0.25; // 阻尼系数

// 添加一个辅助网格地面
const gridHelper = new THREE.GridHelper(300, 25, 0x004444, 0x004444);
scene.add(gridHelper);

//利用射线 Raycaster实现(鼠标点击选中模型)
renderer.domElement.addEventListener('click', function (event) {
    // .offsetY、.offsetX以canvas画布左上角为坐标原点,单位px
    const px = event.offsetX;
    const py = event.offsetY;
    //屏幕坐标px、py转WebGL标准设备坐标x、y
    //width、height表示canvas画布宽高度
    const x = (px / window.innerWidth) * 2 - 1;
    const y = -(py / window.innerHeight) * 2 + 1;
    //创建一个射线投射器`Raycaster`
    const raycaster = new THREE.Raycaster();
    //.setFromCamera()计算射线投射器`Raycaster`的射线属性.ray
    // 形象点说就是在点击位置创建一条射线，射线穿过的模型代表选中
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    //.intersectObjects([mesh1, mesh2, mesh3])对参数中的网格模型对象进行射线交叉计算
    // 未选中对象返回空数组[],选中一个对象，数组1个元素，选中两个对象，数组两个元素
    const intersects = raycaster.intersectObjects([mesh,meshBox,meshModel]);
    console.log("射线器返回的对象", intersects);
    // intersects.length大于0说明，说明选中了模型
    if (intersects.length > 0) {
        if(intersects[0].object.name === "Sphere") {
            body.position.y = 50;//点击按钮，body回到下落的初始位置
            // 选中模型的第一个模型，开始下落
            world.addBody(body);
        } else if(intersects[0].object.name === "Box") {
            bodyBox.position.y = 50;//点击按钮，body回到下落的初始位置
            // 选中模型的第一个模型，开始下落
            world.addBody(bodyBox);
        }  else{
            bodyModel.position.y = 50;//点击按钮，body回到下落的初始位置
            // 选中模型的第一个模型，开始下落
            world.addBody(bodyModel);
        } 
        
    }
})
const audio = new Audio('./assets/model/video/peng.mp3');
body.addEventListener('collide', (event) => {
    // console.log('碰撞事件', event);
    const contact = event.contact;
    //获得沿法线的冲击速度
    const ImpactV = contact.getImpactVelocityAlongNormal();
    // console.log('ImpactV', ImpactV/350);
    // 碰撞越狠，声音越大
    //4.5比ImpactV最大值吕略微大一点，这样音量范围0~1
    audio.volume = ImpactV / 350;
    audio.currentTime = 0;
    audio.play();
})

function render() {
    world.step(1/60);//更新物理计算
    mesh.position.copy(body.position);  //渲染循环中，同步物理球body与网格球mesh的位置
    meshBox.position.copy(bodyBox.position);  //渲染循环中，同步物理球body与网格球mesh的位置
    meshBox.quaternion.copy(bodyBox.quaternion);   //同步姿态角度
    if(meshModel && bodyModel) {
        meshModel.position.copy(bodyModel.position);  //渲染循环中，同步物理球body与网格球mesh的位置
        meshModel.quaternion.copy(bodyModel.quaternion);   //同步姿态角度
    }
    requestAnimationFrame(render);
    renderer.render(scene, camera);
}
render();
