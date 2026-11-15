let occt;
self.onmessage = async ({data:{buffer}}) => {
  try {
    if (!occt) {
      importScripts('./vendor/occt-import-js.js');
      occt = await occtimportjs({locateFile: path => new URL('./vendor/'+path,self.location.href).href});
    }
    const model = occt.ReadStepFile(new Uint8Array(buffer),{
      linearUnit:'millimeter',
      linearDeflectionType:'bounding_box_ratio',
      linearDeflection:.001,
      angularDeflection:.35
    });
    if (!model.success || !model.meshes.length) throw new Error('STEP dosyasında görüntülenebilir geometri bulunamadı.');
    let triangles = 0;
    for (const mesh of model.meshes) {
      triangles += mesh.index.array.length/3;
      if (triangles>500000 || model.meshes.length>500) throw new Error('Model sahne sınırını aşıyor. Daha küçük bir dışa aktarım kullan.');
    }
    const transfer = [];
    const meshes = model.meshes.map(mesh => {
      const positions = Float32Array.from(mesh.attributes.position.array);
      const indices = Uint32Array.from(mesh.index.array);
      transfer.push(positions.buffer,indices.buffer);
      return {name:mesh.name,color:mesh.color,positions,indices};
    });
    self.postMessage({root:model.root,meshes},transfer);
  } catch (error) {
    self.postMessage({error:error.message || 'STEP dönüşümü başarısız.'});
  }
};
