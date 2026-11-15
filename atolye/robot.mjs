import {createGround,createScene,THREE} from './sahne.mjs?v=2';
import {baseHeight,forward,inverse,lengths,limits} from './kinematik.mjs';

const get = id => document.getElementById(id);
const status = get('status');
const timelineStatus = get('timeline-status');
let view;
try { view = createScene(get('scene')); }
catch { status.textContent = '3D görünüm için WebGL destekli bir tarayıcı gerekli. Açı ve konum hesapları kullanılabilir.'; }
const material = (color,metalness=.27,roughness=.43) => new THREE.MeshStandardMaterial({color,metalness,roughness});
const dark = material(0x202631,.48);
const steel = material(0x818f9e,.56);
const orange = material(0xfc8544,.17);
const amber = material(0xd95525,.23);
const light = new THREE.MeshBasicMaterial({color:0xffcc91,toneMapped:false});
const yaw = new THREE.Group(), shoulder = new THREE.Group(), elbow = new THREE.Group();
function mesh(group,geometry,finish,x,y,z) {
  const object = new THREE.Mesh(geometry,finish);
  object.position.set(x,y,z);
  group.add(object);
  return object;
}
function collar(top,bottom,height,y,finish) {
  return mesh(yaw,new THREE.CylinderGeometry(top,bottom,height,56),finish,0,y,0);
}
collar(73,77,12,6,dark);
collar(59,66,9,16,steel);
collar(44,54,40,40,orange);
collar(45,45,6,61,amber);
collar(28,38,17,70,dark);
for (let i=0;i<8;i++) {
  const angle = i*Math.PI/4;
  mesh(yaw,new THREE.CylinderGeometry(4.2,4.2,4,6),steel,66*Math.cos(angle),13,66*Math.sin(angle));
}
shoulder.position.y = baseHeight;
elbow.position.x = lengths[0];
yaw.add(shoulder);
shoulder.add(elbow);
function profile(group,points,depth,finish,bevel=3) {
  const shape = new THREE.Shape(points.map(([x,y])=>new THREE.Vector2(x,y)));
  const geometry = new THREE.ExtrudeGeometry(shape,{
    depth, bevelEnabled:true, bevelThickness:bevel, bevelSize:bevel, bevelSegments:3, steps:1,
  });
  geometry.translate(0,0,-depth/2);
  return mesh(group,geometry,finish,0,0,0);
}
function link(group,length,width) {
  profile(group,[[3,-width],[length*.68,-width*.63],[length-10,-width*.38],[length-10,width*.38],[length*.74,width*.43],[32,width],[3,width]],31,orange);
  profile(group,[[22,-width*.31],[length*.74,-width*.19],[length*.78,0],[length*.34,width*.28],[32,width*.36]],37,amber,1);
  const axle = (radius,depth,z,finish) => {
    mesh(group,new THREE.CylinderGeometry(radius,radius,depth,44),finish,0,0,z).rotation.x = Math.PI/2;
  };
  axle(width+4,47,0,dark);
  for (const side of [-1,1]) {
    axle(width*.74,7,side*25,steel);
    axle(width*.56,5,side*30,orange);
    axle(width*.22,2,side*33,dark);
  }
  for (let i=0;i<4;i++) {
    mesh(group,new THREE.BoxGeometry(7,2,1),light,length*.50+i*10,0,20);
  }
}
link(shoulder,lengths[0],27);
link(elbow,lengths[1]-18,20);
mesh(elbow,new THREE.BoxGeometry(22,25,27),dark,lengths[1]-20,0,0);
for (const side of [-1,1]) {
  mesh(elbow,new THREE.BoxGeometry(23,5,9),steel,lengths[1]-5,side*13,0);
  mesh(elbow,new THREE.BoxGeometry(6,9,9),dark,lengths[1]+4,side*10,0);
}
mesh(elbow,new THREE.SphereGeometry(3.7,18,14),light,lengths[1],0,0);
if (view) {
  createGround(view.scene)(60,-.8,0,1080);
  view.scene.add(yaw,new THREE.AxesHelper(105));
}
const focus = new THREE.Vector3(104,112,0);
for (const [id,direction] of Object.entries({camera:[.72,.57,1.38],front:[0,0,1],top:[0,1,.0001]})) {
  get(id).onclick = () => view?.frame(focus,223,direction);
}
get('camera').click();

let angles = [0,49,-69], poses = [], animation;
const axisValues = get('position').querySelectorAll('dd');
const sliders = ['Taban','Omuz','Dirsek'].map((name,i) => {
  const label = document.createElement('label');
  label.className = 'joint-row';
  const value = document.createElement('output');
  const heading = document.createElement('span');
  heading.className = 'joint-head';
  const title = document.createElement('span');
  const badge = document.createElement('span');
  badge.className = 'tag';
  badge.textContent = 'J'+(i+1);
  title.append(badge,name);
  heading.append(title,value);
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = -limits[i];
  slider.max = limits[i];
  slider.step = .1;
  slider.oninput = () => {
    stop();
    angles[i] = slider.valueAsNumber;
    update();
  };
  slider.setAttribute('aria-label',name+' açısı');
  label.append(heading,slider);
  get('joints').append(label);
  return {slider,value};
});
function update() {
  const [a,b,c] = angles.map(THREE.MathUtils.degToRad);
  yaw.rotation.y = a;
  shoulder.rotation.z = b;
  elbow.rotation.z = c;
  sliders.forEach(({slider,value},i) => {
    slider.value = angles[i];
    value.textContent = angles[i].toFixed(1)+'°';
  });
  forward(angles).forEach((number,i) => { axisValues[i].textContent = number.toFixed(1); });
  view?.draw();
}
function stop() {
  cancelAnimationFrame(animation);
  animation = undefined;
  get('stop').disabled = true;
  get('poses').querySelector('[aria-current]')?.removeAttribute('aria-current');
}
function report(element,message,state='') {
  element.dataset.state = state;
  element.textContent = message;
}
function updateTimeline() {
  get('pose-count').textContent = poses.length;
  get('play').disabled = get('clear').disabled = !poses.length;
}
get('target').onsubmit = event => {
  event.preventDefault();
  stop();
  const target = ['x','y','z'].map(axis=>event.currentTarget.elements.namedItem(axis).valueAsNumber);
  const pose = inverse(target,angles);
  if (!pose) { report(status,'Hedef, kolun çalışma hacmi veya eklem sınırları dışında.','error'); return; }
  angles = pose;
  update();
  report(status,'Hedefe ulaşıldı.','success');
};
get('record').onclick = () => {
  if (poses.length===30) { report(timelineStatus,'En fazla 30 poz eklenebilir.','error'); return; }
  poses.push([...angles]);
  const li = document.createElement('li');
  li.textContent = String(poses.length).padStart(2,'0')+'  ·  '+angles.map(angle=>angle.toFixed(1)+'°').join(' / ');
  get('poses').append(li);
  updateTimeline();
};
get('clear').onclick = () => {
  stop();
  poses = [];
  get('poses').replaceChildren();
  updateTimeline();
  report(timelineStatus,'Dizi temizlendi.');
};
get('stop').onclick = () => { stop(); report(timelineStatus,'Hareket durduruldu.'); };
get('play').onclick = () => {
  stop();
  if (!poses.length) return;
  const route = [[...angles],...poses];
  const start = performance.now();
  const entries = get('poses').children;
  let active = -1;
  get('stop').disabled = false;
  report(timelineStatus,'Hareket oynatılıyor.');
  function step(now) {
    const elapsed = (now-start)/900;
    const index = Math.min(route.length-2,Math.floor(elapsed));
    if (index !== active) {
      entries[active]?.removeAttribute('aria-current');
      entries[index]?.setAttribute('aria-current','step');
      active = index;
    }
    const t = Math.min(1,elapsed-index);
    const smooth = t*t*(3-2*t);
    angles = route[index].map((angle,i)=>angle+(route[index+1][i]-angle)*smooth);
    update();
    if (elapsed < route.length-1) animation = requestAnimationFrame(step);
    else { stop(); report(timelineStatus,'Hareket tamamlandı.','success'); }
  }
  animation = requestAnimationFrame(step);
};
update();
updateTimeline();
get('stop').disabled = true;
