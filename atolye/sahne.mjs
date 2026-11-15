import * as THREE from './vendor/three.module.min.js';
import {OrbitControls} from './vendor/controls/OrbitControls.js';

export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
  renderer.domElement.setAttribute('aria-label','Etkileşimli 3D sahne');
  container.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1422);
  const camera = new THREE.PerspectiveCamera(42,1,.1,1e6);
  const controls = new OrbitControls(camera,renderer.domElement);
  const ambient = new THREE.HemisphereLight(0xe5f6ff,0x65788b,2);
  const key = new THREE.DirectionalLight(0xffffff,2.5);
  key.position.set(2,4,3);
  scene.add(ambient,key);
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
  function frame(center,radius) {
    const angle = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*Math.min(1,camera.aspect));
    const distance = radius/Math.sin(angle)*1.1;
    controls.target.copy(center);
    camera.position.copy(center).addScaledVector(new THREE.Vector3(1,.7,1.25).normalize(),distance);
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

export {THREE};
