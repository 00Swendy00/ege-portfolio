import {createGround,createScene,THREE} from './sahne.mjs?v=2';
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
  const ground = createGround(scene);
  const center = new THREE.Vector3();
  let radius = 1, parts = [], points = [], measuring = false, generation = 0, activeWorker, stl;
  const palette = [0x9a98c7,0x70a7bb,0xb3a0d6,0xc5a490];
  const partMaterial = (color,metalness=.24,roughness=.46) => new THREE.MeshStandardMaterial({color,metalness,roughness,side:THREE.DoubleSide});
  const format = number => new Intl.NumberFormat(window.SiteI18n?.getLanguage()==='en'?'en-US':'tr-TR',{maximumSignificantDigits:6}).format(number);
  let dimensions;
  function showDimensions(){
    if(dimensions)get('bounds').textContent=dimensions.size.map(format).join(' × ')+' mm · '+format(dimensions.triangles)+' üçgen';
  }
  document.addEventListener('site:languagechange',()=>{
    showDimensions();
    if(points.length===2)get('distance').textContent='Yaklaşık ağ mesafesi: '+format(points[0].distanceTo(points[1]))+' mm';
  });
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
    let triangles = 0;
    model.traverse(({geometry}) => {
      if (geometry) triangles += (geometry.index?.count || geometry.attributes.position.count)/3;
    });
    dimensions={size:size.toArray(),triangles};
    showDimensions();
    ground(center.x,bounds.min.y-radius*.015,center.z,radius*5.3);
    for (const [i,mesh] of parts.entries()) {
      mesh.userData.original = mesh.position.clone();
      const direction = mesh.userData.explodeDirection ?? new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3()).sub(center);
      if (direction.lengthSq() < 1e-12) direction.set(Math.cos(i*2.4),.25,Math.sin(i*2.4));
      mesh.userData.direction = direction.normalize();
    }
    get('parts').replaceChildren();
    makeTree(get('parts'));
    get('part-count').textContent = parts.length;
    get('explode').value = 0;
    get('explode-value').textContent = '0%';
    get('explode').disabled = parts.length<2;
    clearMarkers();
    frame(center,radius);
  }
  function partToggle(container,index) {
    const mesh = parts[index];
    if (!mesh) return;
    const label = document.createElement('label');
    label.className = 'part-row';
    const check = document.createElement('input');
    const swatch = document.createElement('span');
    swatch.className = 'part-swatch';
    swatch.setAttribute('aria-hidden','true');
    const color = mesh.material?.color ?? mesh.children[0]?.material?.color;
    swatch.style.setProperty('--swatch','#'+(color?.getHexString() ?? 'a5b1c9'));
    const name = document.createElement('span');
    name.textContent = mesh.name || 'Parça '+(index+1);
    check.type = 'checkbox';
    check.checked = true;
    check.onchange = () => { mesh.visible = check.checked; clearMarkers(); };
    label.append(swatch,name,check);
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
  function showStatus(message,state='') {
    report.dataset.state = state;
    report.textContent = message;
  }
  async function openFile(file) {
    if (!file) return;
    const ticket = ++generation;
    activeWorker?.cancel();
    showStatus('Dosya işleniyor…');
    try {
      if (!/\.(stl|step|stp)$/i.test(file.name)) throw new Error('Bir STEP, STP veya STL dosyası seç.');
      if (file.size===0 || file.size>25*1024*1024) throw new Error('Dosya boş veya 25 MB sınırını aşıyor.');
      const buffer = await file.arrayBuffer();
      if (ticket!==generation) return;
      if (/\.stl$/i.test(file.name)) {
        stlModel(buffer);
        stl = buffer;
        get('format').textContent = 'STL';
      } else {
        const prefix = new TextDecoder().decode(new Uint8Array(buffer,0,Math.min(100,buffer.byteLength))).trimStart();
        if (!prefix.startsWith('ISO-10303-21;')) throw new Error('STEP dosya başlığı geçersiz.');
        const contents = await readSTEP(buffer);
        if (ticket!==generation) return;
        stepModel(contents);
        stl = undefined;
        get('format').textContent = 'STEP';
      }
      showStatus(file.name+' açıldı.','success');
    } catch (error) {
      if (ticket===generation) showStatus(error.message,'error');
    }
  }
  get('file').onchange = ({target}) => {
    const file = target.files[0];
    target.value = '';
    openFile(file);
  };
  const drop = get('drop-model');
  drop.onclick = () => get('file').click();
  drop.ondragover = event => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    drop.dataset.dragging = '';
  };
  drop.ondragleave = event => {
    if (!drop.contains(event.relatedTarget)) delete drop.dataset.dragging;
  };
  drop.ondrop = event => {
    event.preventDefault();
    delete drop.dataset.dragging;
    openFile(event.dataTransfer.files[0]);
  };
  get('unit').onchange = () => { if (stl) stlModel(stl); };
  get('camera').onclick = () => frame(center,radius);
  get('explode').oninput = ({target}) => {
    get('explode-value').textContent = target.value+'%';
    for (const part of parts) part.position.copy(part.userData.original).addScaledVector(part.userData.direction,radius*target.valueAsNumber/140);
    clearMarkers();
  };
  get('measure').onclick = event => {
    measuring = !measuring;
    get('scene').toggleAttribute('data-measuring',measuring);
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
    const hit = ray.intersectObjects(parts.filter(mesh=>mesh.visible),true)[0];
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
    install(bearingAssembly(),target=>parts.forEach((_,i)=>partToggle(target,i)));
    get('format').textContent = 'Örnek';
    showStatus('Rulman yatağı montajı');
  };
  get('demo').click();
}

function bearingAssembly() {
  const profile = (points) => new THREE.Shape(points.map(([x,y])=>new THREE.Vector2(x,y)));
  const hole = (x,y,r) => {
    const path = new THREE.Path();
    path.absarc(x,y,r,0,Math.PI*2,true);
    return path;
  };
  const extrude = (shape,depth) => new THREE.ExtrudeGeometry(shape,{
    depth, curveSegments:32, bevelEnabled:true, bevelSize:1.4, bevelThickness:1.4, bevelSegments:3,
  });
  const finish = (color,metalness) => new THREE.MeshStandardMaterial({color,metalness,roughness:.38});
  const steel = finish(0xaab8ce,.42);
  const anodized = finish(0x787aa5,.32);
  const housing = finish(0xb0a9de,.28);
  const sealMaterial = finish(0x283244,.3);
  function named(name,direction) {
    const group = new THREE.Group();
    group.name = name;
    group.userData.explodeDirection = new THREE.Vector3(...direction);
    return group;
  }
  function add(group,geometry,material,x=0,y=0,z=0) {
    const mesh = new THREE.Mesh(geometry,material);
    mesh.position.set(x,y,z);
    group.add(mesh);
    return mesh;
  }
  const base = named('Montaj plakası',[0,-1,0]);
  const plate = profile([[-65,-33],[-58,-40],[58,-40],[65,-33],[65,33],[58,40],[-58,40],[-65,33]]);
  const fasteners = named('Bağlantı elemanları',[1,.2,-.2]);
  for (const x of [-50,50]) for (const z of [-27,27]) {
    plate.holes.push(hole(x,z,6.5));
    add(fasteners,new THREE.CylinderGeometry(9,9,2,40),steel,x,11.1,z);
    add(fasteners,new THREE.CylinderGeometry(6.6,6.6,5,6),sealMaterial,x,14.5,z);
  }
  add(base,extrude(plate,8),anodized,0,1.5).rotation.x = -Math.PI/2;
  const support = named('Rulman gövdesi',[-1,.65,0]);
  const bracket = new THREE.Shape();
  bracket.moveTo(-48,12);
  bracket.lineTo(48,12);
  bracket.lineTo(48,22);
  bracket.lineTo(32,29);
  bracket.lineTo(32,53);
  bracket.bezierCurveTo(32,94,-32,94,-32,53);
  bracket.lineTo(-32,29);
  bracket.lineTo(-48,22);
  bracket.lineTo(-48,12);
  bracket.holes.push(hole(0,52,20));
  add(support,extrude(bracket,31),housing,0,0,-15.5);
  const bearing = named('Rulman ve conta',[0,.75,-1]);
  for (const z of [-19,19]) {
    add(bearing,new THREE.TorusGeometry(18.6,2.1,12,64),steel,0,52,z);
    add(bearing,new THREE.TorusGeometry(15.1,1.6,12,64),sealMaterial,0,52,z);
  }
  const shaft = named('Yivli mil',[0,.25,1]);
  add(shaft,new THREE.CylinderGeometry(13.6,13.6,64,64),steel,0,52,0).rotation.x = Math.PI/2;
  for (const side of [-1,1]) {
    add(shaft,new THREE.CylinderGeometry(12.6,12.6,3,64),sealMaterial,0,52,side*33.5).rotation.x = Math.PI/2;
    add(shaft,new THREE.CylinderGeometry(13.6,13.6,4,64),steel,0,52,side*37).rotation.x = Math.PI/2;
  }
  return [base,support,bearing,shaft,fasteners];
}
