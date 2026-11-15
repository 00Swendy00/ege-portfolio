export const lengths = [210,170];
export const baseHeight = 80;
export const limits = [180,135,155];
const radians = Math.PI/180;

export function forward(angles) {
  const [yaw,shoulder,elbow] = angles.map(angle=>angle*radians);
  const [a,b] = lengths;
  const radius = a*Math.cos(shoulder)+b*Math.cos(shoulder+elbow);
  return [radius*Math.cos(yaw),baseHeight+a*Math.sin(shoulder)+b*Math.sin(shoulder+elbow),-radius*Math.sin(yaw)];
}

export function inverse([x,y,z],current) {
  const [a,b] = lengths;
  const dy = y-baseHeight;
  const r = Math.hypot(x,z);
  const cosine = (r*r+dy*dy-a*a-b*b)/(2*a*b);
  if (cosine < -1-1e-9 || cosine > 1+1e-9) return null;
  const bend = Math.acos(Math.max(-1,Math.min(1,cosine)));
  const normal = value => ((value+180)%360+360)%360-180;
  const candidates = [];
  for (const side of [1,-1]) {
    const yaw = r < 1e-9 ? current[0] : normal(Math.atan2(-z,x)/radians+(side===-1?180:0));
    for (const elbow of [bend,-bend]) {
      const shoulder = Math.atan2(dy,side*r)-Math.atan2(b*Math.sin(elbow),a+b*Math.cos(elbow));
      const pose = [yaw,normal(shoulder/radians),elbow/radians];
      if (pose.every((angle,i)=>Math.abs(angle)<=limits[i])) candidates.push(pose);
    }
  }
  const cost = pose => pose.reduce((sum,angle,i)=>sum+(angle-current[i])**2,0);
  return candidates.sort((a,b)=>cost(a)-cost(b))[0] || null;
}
