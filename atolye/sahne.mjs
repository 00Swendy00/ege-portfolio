import * as THREE from './vendor/three.module.min.js';
import {OrbitControls} from './vendor/controls/OrbitControls.js';

export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.domElement.setAttribute('aria-label','Etkileşimli 3D sahne');
  container.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42,1,.1,1e6);
  const controls = new OrbitControls(camera,renderer.domElement);
  const ambient = new THREE.HemisphereLight(0xf2eeff,0x3c4355,2);
  const key = new THREE.DirectionalLight(0xffe7d8,3.4);
  const rim = new THREE.DirectionalLight(0xb0c8ff,1.9);
  key.position.set(2,5,3);
  rim.position.set(-3,2,-4);
  scene.add(ambient,key,rim);
  let pending = false;
  function draw() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      renderer.render(scene,camera);
    });
  }
  controls.addEventListener('change',draw);
  new ResizeObserver(() => {
    const width = container.clientWidth, height = container.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width,height,false);
    camera.aspect = width/height;
    camera.updateProjectionMatrix();
    draw();
  }).observe(container);
  function frame(center,radius,direction = [1,.68,1.32]) {
    if (container.clientHeight) camera.aspect = container.clientWidth/container.clientHeight;
    const angle = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*Math.min(1,camera.aspect));
    const distance = radius/Math.sin(angle)*1.1;
    controls.target.copy(center);
    camera.position.copy(center).addScaledVector(new THREE.Vector3(...direction).normalize(),distance);
    camera.near = Math.max(radius/5000,.0000001);
    camera.far = Math.max(radius*100,distance*10);
    camera.updateProjectionMatrix();
    controls.minDistance = radius*.08;
    controls.maxDistance = distance*12;
    controls.update();
    draw();
  }
  return {scene,camera,renderer,draw,frame};
}

export function createGround(scene) {
  const grid = new THREE.GridHelper(1,32,0x66738b,0x66738b);
  grid.material.transparent = true;
  grid.material.opacity = .20;
  grid.material.depthWrite = false;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d');
  const ink = context.createRadialGradient(32,32,0,32,32,32);
  ink.addColorStop(0,'rgba(1,2,6,.88)');
  ink.addColorStop(.44,'rgba(1,2,6,.52)');
  ink.addColorStop(1,'rgba(1,2,6,0)');
  context.fillStyle = ink;
  context.fillRect(0,0,64,64);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1,1), new THREE.MeshBasicMaterial({
    map:new THREE.CanvasTexture(canvas), transparent:true, depthWrite:false, toneMapped:false,
  }));
  shadow.rotation.x = -Math.PI/2;
  shadow.renderOrder = -1;
  scene.add(shadow,grid);
  return (x,y,z,span) => {
    grid.position.set(x,y,z);
    grid.scale.setScalar(span);
    shadow.position.set(x,y+span*.0005,z);
    shadow.scale.set(span*.43,span*.43,1);
  };
}

export {THREE};
