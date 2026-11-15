import {test} from 'node:test';
import assert from 'node:assert/strict';
import {solve} from '../atolye/devre.mjs';
import {forward,inverse,limits} from '../atolye/kinematik.mjs';

const source = {id:'p1',type:'source',value:5};
const resistor = {id:'p2',type:'resistor',value:220};
const led = {id:'p3',type:'led',value:2};
const series = [['p1a','p2a'],['p2b','p3a'],['p3b','p1b']];

test('DC solver matches the series LED model and cuts off reverse current', () => {
  const readings = solve([source,resistor,led],series);
  assert.ok(Math.abs(readings[2].amps-3/230)<1e-8);
  assert.ok(Math.abs(readings[1].volts+readings[2].volts-5)<1e-8);
  const reverse = [['p1a','p2a'],['p2b','p3b'],['p3a','p1b']];
  assert.ok(Math.abs(solve([source,resistor,led],reverse)[2].amps)<1e-8);
});

test('DC solver rejects a shorted source and handles parallel resistors', () => {
  assert.throws(()=>solve([source],[['p1a','p1b']]),/kısa devre/);
  const readings = solve([source,resistor,{...resistor,id:'p3'}],[
    ['p1a','p2a'],['p2a','p3a'],['p1b','p2b'],['p2b','p3b'],
  ]);
  assert.ok(Math.abs(readings[0].amps-10/220)<1e-8);
});

test('Inverse kinematics reproduces reachable positions within joint limits', () => {
  assert.deepEqual(forward([0,0,0]),[380,80,-0]);
  for (const angles of [[30,55,-100],[-150,115,65],[90,-70,85],[90,90,0],[0,0,0]]) {
    const target = forward(angles);
    const solution = inverse(target,[0,10,20]);
    assert.ok(solution?.every((angle,i)=>Math.abs(angle)<=limits[i]));
    assert.ok(Math.hypot(...forward(solution).map((n,i)=>n-target[i]))<.001);
  }
  assert.equal(inverse([900,0,0],[0,0,0]),null);
});
