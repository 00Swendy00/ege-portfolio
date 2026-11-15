import {createScene,THREE} from './sahne.mjs';
import {STLLoader} from './vendor/loaders/STLLoader.js';

const get = id => document.getElementById(id);
const report = get('status');
let view;
try { view = createScene(get('scene')); }
catch { report.textContent = '3D model açmak için WebGL destekli bir tarayıcı gerekli.'; }
if (view) startViewer(view);

function startViewer({scene,camera,renderer,frame,draw}) {
  const model = new THREE.Group();
  const markers = new THREE.Group();
  scene.add(model,markers);
  const center = new THREE.Vector3();
  let radius = 1, parts = [], points = [], measuring = false, generation = 0, activeWorker, stl;
  const palette = [0x68a7eb,0x50d4ca,0xebaa65,0x9b8bed];
  const partMaterial = color => new THREE.MeshStandardMaterial({color,metalness:.15,roughness:.65,side:THREE.DoubleSide});
  const format = number => new Intl.NumberFormat('tr-TR',{maximumSignificantDigits:6}).format(number);
  function dispose(object) {
    object.traverse(child => {
      child.geometry?.dispose();
      child.material?.dispose();
    });
  }
  function clearMarkers() {
    dispose(markers);
    markers.clear();
    points = [];
    get('distance').textContent = measuring ? 'Yüzey üzerinde iki nokta seç.' : '';
    draw();
  }
  function install(next,makeTree) {
    const bounds = new THREE.Box3();
    for (const mesh of next) bounds.expandByObject(mesh);
    if (bounds.isEmpty() || ![...bounds.min,...bounds.max].every(Number.isFinite)) throw new Error('Geçerli model boyutları bulunamadı.');
    dispose(model);
    model.clear();
    parts = next;
    model.add(...parts);
    bounds.getCenter(center);
    const size = bounds.getSize(new THREE.Vector3());
    radius = Math.max(.001,size.length()/2);
    const counts = parts.map(part => (part.geometry.index?.count || part.geometry.attributes.position.count)/3);
    get('bounds').textContent = size.toArray().map(format).join(' × ')+' mm · '+format(counts.reduce((a,b)=>a+b,0))+' üçgen';
    for (const [i,mesh] of parts.entries()) {
      mesh.userData.original = mesh.position.clone();
      const direction = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3()).sub(center);
      if (direction.lengthSq() < 1e-12) direction.set(Math.cos(i*2.4),.25,Math.sin(i*2.4));
      mesh.userData.direction = direction.normalize();
    }
    get('parts').replaceChildren();
    makeTree(get('parts'));
    get('explode').value = 0;
    get('explode').disabled = parts.length<2;
    clearMarkers();
    frame(center,radius);
  }
  function partToggle(container,index) {
    const mesh = parts[index];
    if (!mesh) return;
    const label = document.createElement('label');
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = true;
    check.onchange = () => { mesh.visible = check.checked; clearMarkers(); };
    label.append(check,' '+(mesh.name||'Parça '+(index+1)));
    container.append(label);
  }
  function stepModel({root,meshes}) {
    const next = meshes.map((data,i) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position',new THREE.BufferAttribute(data.positions,3));
      geo.setIndex(new THREE.BufferAttribute(data.indices,1));
      geo.computeVertexNormals();
      const color = Array.isArray(data.color) ? new THREE.Color(...data.color) : palette[i%palette.length];
      const mesh = new THREE.Mesh(geo,partMaterial(color));
      mesh.name = data.name;
      return mesh;
    });
    install(next,container => {
      const shown = new Set();
      function walk(node,level,parent) {
        if (!node || level>30) return;
        let target = parent;
        if (node.name && level) {
          const details = document.createElement('details');
          const title = document.createElement('summary');
          title.textContent = node.name;
          details.open = level<3;
          details.append(title);
          parent.append(details);
          target = details;
        }
        for (const index of node.meshes || []) {
          if (shown.has(index)) continue;
          shown.add(index);
          partToggle(target,index);
        }
        for (const child of node.children || []) walk(child,level+1,target);
      }
      walk(root,0,container);
      parts.forEach((_,index) => { if (!shown.has(index)) partToggle(container,index); });
    });
  }
  function stlModel(buffer) {
    const view = new DataView(buffer);
    if (view.byteLength<84) throw new Error('STL başlığı eksik.');
    const binary = 84+view.getUint32(80,true)*50===view.byteLength;
    if (binary && view.getUint32(80,true)>500000) throw new Error('STL en fazla 500.000 üçgen içerebilir.');
    if (!binary) {
      const prefix = new TextDecoder('latin1').decode(new Uint8Array(buffer,0,9));
      const offset = prefix.indexOf('solid');
      if (offset<0 || offset>4) throw new Error('STL başlığı veya üçgen tablosu geçersiz.');
      if (buffer.byteLength>12*1024*1024) throw new Error('ASCII STL sınırı 12 MB.');
    }
    const geo = new STLLoader().parse(buffer);
    const count = geo.getAttribute('position').count;
    if (count<3 || count%3 || count>1500000) {
      geo.dispose();
      throw new Error('STL boş, bozuk ya da üçgen sınırının üzerinde.');
    }
    const scale = Number(get('unit').value);
    geo.scale(scale,scale,scale);
    const mesh = new THREE.Mesh(geo,partMaterial(palette[0]));
    install([mesh],container=>partToggle(container,0));
  }
  function readSTEP(buffer) {
    const worker = new Worker(new URL('./model-worker.js',import.meta.url));
    return new Promise((resolve,reject) => {
      const timer = setTimeout(()=>finish(reject,new Error('STEP dönüşüm süresi aşıldı. Daha küçük bir model dene.')),25000);
      function finish(callback,value) {
        clearTimeout(timer);
        worker.terminate();
        if (activeWorker?.worker===worker) activeWorker = undefined;
        callback(value);
      }
      activeWorker = {worker,cancel:()=>finish(reject,new Error('İşlem iptal edildi.'))};
      worker.onerror = () => finish(reject,new Error('STEP motoru başlatılamadı.'));
      worker.onmessage = ({data}) => data.error ? finish(reject,new Error(data.error)) : finish(resolve,data);
      worker.postMessage({buffer},[buffer]);
    });
  }
  get('file').onchange = async ({target}) => {
    const file = target.files[0];
    target.value = '';
    if (!file) return;
    const ticket = ++generation;
    activeWorker?.cancel();
    report.textContent = 'Dosya işleniyor…';
    try {
      if (!/\.(stl|step|stp)$/i.test(file.name)) throw new Error('Bir STEP, STP veya STL dosyası seç.');
      if (file.size===0 || file.size>25*1024*1024) throw new Error('Dosya boş veya 25 MB sınırını aşıyor.');
      const buffer = await file.arrayBuffer();
      if (ticket!==generation) return;
      if (/\.stl$/i.test(file.name)) {
        stlModel(buffer);
        stl = buffer;
      } else {
        const prefix = new TextDecoder().decode(new Uint8Array(buffer,0,Math.min(100,buffer.byteLength))).trimStart();
        if (!prefix.startsWith('ISO-10303-21;')) throw new Error('STEP dosya başlığı geçersiz.');
        const contents = await readSTEP(buffer);
        if (ticket!==generation) return;
        stepModel(contents);
        stl = undefined;
      }
      report.textContent = file.name+' açıldı.';
    } catch (error) {
      if (ticket===generation) report.textContent = error.message;
    }
  };
  get('unit').onchange = () => { if (stl) stlModel(stl); };
  get('camera').onclick = () => frame(center,radius);
  get('explode').oninput = ({target}) => {
    for (const part of parts) part.position.copy(part.userData.original).addScaledVector(part.userData.direction,radius*target.valueAsNumber/140);
    clearMarkers();
  };
  get('measure').onclick = event => {
    measuring = !measuring;
    event.currentTarget.setAttribute('aria-pressed',String(measuring));
    clearMarkers();
  };
  const ray = new THREE.Raycaster();
  let down;
  renderer.domElement.addEventListener('pointerdown',event => { down = [event.clientX,event.clientY]; });
  renderer.domElement.addEventListener('pointerup',event => {
    if (!measuring || event.button!==0 || !down || Math.hypot(down[0]-event.clientX,down[1]-event.clientY)>5) return;
    const bounds = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((event.clientX-bounds.left)/bounds.width*2-1,1-(event.clientY-bounds.top)/bounds.height*2),camera);
    model.updateMatrixWorld(true);
    const hit = ray.intersectObjects(parts.filter(mesh=>mesh.visible),false)[0];
    if (!hit) return;
    if (points.length===2) clearMarkers();
    points.push(hit.point);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(radius*.011,12,10),new THREE.MeshBasicMaterial({color:0xffda68,depthTest:false}));
    dot.position.copy(hit.point);
    dot.renderOrder = 2;
    markers.add(dot);
    if (points.length===2) {
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xffda68,depthTest:false}));
      line.renderOrder = 1;
      markers.add(line);
      get('distance').textContent = 'Yaklaşık ağ mesafesi: '+format(points[0].distanceTo(points[1]))+' mm';
    } else get('distance').textContent = 'İkinci noktayı seç.';
    draw();
  });
  get('demo').onclick = () => {
    ++generation;
    activeWorker?.cancel();
    stl = undefined;
    const base = new THREE.Mesh(new THREE.BoxGeometry(100,12,64),partMaterial(palette[0]));
    base.name = 'Taban';
    const support = new THREE.Mesh(new THREE.BoxGeometry(20,44,48),partMaterial(palette[1]));
    support.name = 'Destek';
    support.position.set(-32,28,0);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(11,11,70,32),partMaterial(palette[2]));
    shaft.name = 'Mil';
    shaft.rotation.z = Math.PI/2;
    shaft.position.set(1,39,0);
    install([base,support,shaft],target=>parts.forEach((_,i)=>partToggle(target,i)));
    report.textContent = 'Örnek montaj açıldı.';
  };
  get('demo').click();
}
