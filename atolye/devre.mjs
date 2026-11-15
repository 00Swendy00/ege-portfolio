export const catalog = {
  source: { label: 'DC kaynak', unit: 'V', value: 5, min: 0, max: 48 },
  resistor: { label: 'Direnç', unit: 'Ω', value: 220, min: 0.1, max: 1e8 },
  led: { label: 'LED', unit: 'Vf', value: 2, min: 0.5, max: 5 },
  switch: { label: 'Anahtar', value: 1, min: 0, max: 1 },
};

export function solve(parts, wires) {
  const sources = parts.filter(part => part.type === 'source');
  if (sources.length !== 1) throw new Error('Çözüm için bir DC kaynak ekle.');
  const source = sources[0];
  const pins = new Map(parts.flatMap(part => ['a','b'].map(pin => [part.id + pin, part.id + pin])));
  const root = pin => {
    while (pins.get(pin) !== pin) pin = pins.get(pin);
    return pin;
  };
  for (const [a,b] of wires) pins.set(root(a),root(b));
  const positive = root(source.id + 'a');
  const ground = root(source.id + 'b');
  if (positive === ground) throw new Error('Kaynağın iki ucu kısa devre.');
  const node = [...new Set([...pins.keys()].map(root))].filter(pin => pin !== ground);
  const index = new Map(node.map((pin, i) => [pin, i]));
  const n = node.length;
  const ledOn = new Set();
  const voltage = pin => pin === ground ? 0 : solution[index.get(pin)];
  const branch = part => {
    if (part.type === 'resistor') return [1 / part.value, 0];
    if (part.type === 'switch') return [part.value ? 100 : 0, 0];
    return ledOn.has(part.id) ? [0.1, part.value] : [0, 0];
  };
  const passive = parts.filter(part => part !== source);
  let solution;
  for (let iteration = 0; iteration < 40; iteration++) {
    // One extra unknown represents the ideal voltage source current.
    const matrix = Array.from({length:n+1}, () => new Float64Array(n+2));
    for (let i=0;i<n;i++) matrix[i][i] = 1e-10;
    for (const part of passive) {
      const a = index.get(root(part.id + 'a'));
      const b = index.get(root(part.id + 'b'));
      const [g, offset] = branch(part);
      if (a !== undefined) { matrix[a][a] += g; matrix[a][n+1] += g*offset; }
      if (b !== undefined) { matrix[b][b] += g; matrix[b][n+1] -= g*offset; }
      if (a !== undefined && b !== undefined) { matrix[a][b] -= g; matrix[b][a] -= g; }
    }
    matrix[index.get(positive)][n] = 1;
    matrix[n][index.get(positive)] = 1;
    matrix[n][n+1] = source.value;
    for (let col=0;col<=n;col++) {
      let pivot = col;
      for (let row=col+1;row<=n;row++) if (Math.abs(matrix[row][col]) > Math.abs(matrix[pivot][col])) pivot = row;
      [matrix[pivot],matrix[col]] = [matrix[col],matrix[pivot]];
      const divisor = matrix[col][col];
      for (let k=col;k<=n+1;k++) matrix[col][k] /= divisor;
      for (let row=0;row<=n;row++) {
        if (row === col) continue;
        const factor = matrix[row][col];
        for (let k=col;k<=n+1;k++) matrix[row][k] -= factor*matrix[col][k];
      }
    }
    solution = matrix.map(row => row[n+1]);
    const delta = part => voltage(root(part.id+'a')) - voltage(root(part.id+'b'));
    const changed = passive.filter(part => part.type === 'led' && (delta(part) > part.value + 1e-8) !== ledOn.has(part.id));
    if (!changed.length) return parts.map(part => {
      const [g,offset] = part === source ? [0,0] : branch(part);
      return { id:part.id, volts:delta(part), amps:part === source ? -solution[n] : g*(delta(part)-offset) };
    });
    for (const part of changed) {
      if (ledOn.has(part.id)) ledOn.delete(part.id);
      else ledOn.add(part.id);
    }
  }
  throw new Error('LED modeli bu devrede yakınsamadı.');
}
