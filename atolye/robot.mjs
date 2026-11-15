import {createScene,THREE} from './sahne.mjs';
import {baseHeight,forward,inverse,lengths,limits} from './kinematik.mjs';

const get = id => document.getElementById(id);
const status = get('status');
let view;
try { view = createScene(get('scene')); }
catch { status.textContent = '3D görünüm için WebGL destekli bir tarayıcı gerekli. Açı ve konum hesapları kullanılabilir.'; }
const material = color => new THREE.MeshStandardMaterial({color,metalness:.22,roughness:.55});
const dark = material(0x45627f), cyan = material(0x38bdef), blue = material(0x647cf4);
const yaw = new THREE.Group(), shoulder = new THREE.Group(), elbow = new THREE.Group();
const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(66,78,baseHeight,32),dark);
pedestal.position.y = baseHeight/2;
shoulder.position.y = baseHeight;
elbow.position.x = lengths[0];
yaw.add(pedestal,shoulder);
shoulder.add(elbow);
function link(group,length,finish) {
  const beam = new THREE.Mesh(new THREE.BoxGeometry(length,30,34),finish);
  beam.position.x = length/2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(25,25,50,24),dark);
  hub.rotation.x = Math.PI/2;
  group.add(beam,hub);
}
link(shoulder,lengths[0],cyan);
link(elbow,lengths[1],blue);
const tip = new THREE.Mesh(new THREE.SphereGeometry(13,16,12),material(0xffd975));
tip.position.x = lengths[1];
elbow.add(tip);
view?.scene.add(yaw,new THREE.GridHelper(1200,24,0x528fae,0x233c52),new THREE.AxesHelper(140));
get('camera').onclick = () => view?.frame(new THREE.Vector3(40,165,0),350);
get('camera').click();

let angles = [0,32,-48], poses = [], animation;
const sliders = ['Taban','Omuz','Dirsek'].map((name,i) => {
  const label = document.createElement('label');
  const value = document.createElement('output');
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
  label.append(name+' ',value,slider);
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
  get('position').textContent = forward(angles).map((number,i)=>'XYZ'[i]+' '+number.toFixed(1)).join(' · ')+' mm';
  view?.draw();
}
function stop() {
  cancelAnimationFrame(animation);
  animation = undefined;
}
get('target').onsubmit = event => {
  event.preventDefault();
  stop();
  const target = ['x','y','z'].map(axis=>event.currentTarget.elements.namedItem(axis).valueAsNumber);
  const pose = inverse(target,angles);
  if (!pose) { status.textContent = 'Hedef, kolun çalışma hacmi veya eklem sınırları dışında.'; return; }
  angles = pose;
  update();
  status.textContent = 'Hedefe ulaşıldı.';
};
get('record').onclick = () => {
  if (poses.length===30) { status.textContent = 'En fazla 30 poz eklenebilir.'; return; }
  poses.push([...angles]);
  const li = document.createElement('li');
  li.textContent = angles.map(angle=>angle.toFixed(1)+'°').join(' / ');
  get('poses').append(li);
};
get('clear').onclick = () => {
  stop(); poses = []; get('poses').replaceChildren(); status.textContent = 'Dizi temizlendi.';
};
get('stop').onclick = () => { stop(); status.textContent = 'Hareket durduruldu.'; };
get('play').onclick = () => {
  stop();
  if (!poses.length) { status.textContent = 'Önce bir poz ekle.'; return; }
  const route = [[...angles],...poses];
  const start = performance.now();
  status.textContent = 'Hareket oynatılıyor.';
  function step(now) {
    const elapsed = (now-start)/900;
    const index = Math.min(route.length-2,Math.floor(elapsed));
    const t = Math.min(1,elapsed-index);
    const smooth = t*t*(3-2*t);
    angles = route[index].map((angle,i)=>angle+(route[index+1][i]-angle)*smooth);
    update();
    if (elapsed < route.length-1) animation = requestAnimationFrame(step);
    else { animation = undefined; status.textContent = 'Hareket tamamlandı.'; }
  }
  animation = requestAnimationFrame(step);
};
update();
