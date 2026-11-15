const samePose = (a,b) => a.every((angle,i) => Math.abs(angle-b[i]) < .05);

export function playbackSteps(current,poses,home) {
  // A single pose is often recorded while the arm is already at that pose.
  if (poses.length === 1 && samePose(current,poses[0]) && !samePose(current,home)) {
    return [{pose:home},{pose:poses[0],index:0}];
  }
  const steps = [];
  poses.forEach((pose,index) => {
    const previous = steps.at(-1)?.pose ?? current;
    if (!samePose(previous,pose)) steps.push({pose,index});
  });
  return steps;
}
