import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {placeMarkerType,MARKER_TYPES} from '../src/lib/placeMarkerType.js';

test('catalogue sites get different markers while preserving explicit metadata',()=>{
 const cases=[['beach','Kite Beach','beach'],['museum','Louvre Abu Dhabi','museum'],['heritage','Al Bidya Mosque','mosque'],['mall','City Centre Mirdif','mall'],['nature','Jebel Jais','mountain'],['nature','Jubail Mangrove Park','nature'],['heritage','Dhayah Fort','heritage'],['heritage','Saleh Souq','souq'],['landmark','Al Zorah Marina 1','marina'],['heritage','Suwaidi Pearl Farm','pearl'],['attraction','Dreamland Aqua Park','attraction'],['landmark','Burj Khalifa','tower']];
 for(const [kind,title,expected] of cases){assert.equal(placeMarkerType({kind,title,category:'things-to-do'}),expected,title);assert.ok(MARKER_TYPES[expected].icon);}
 assert.equal(placeMarkerType({kind:'museum',title:'Beach collection'}),'museum');
 for(const category of ['restaurants','stays','events','guides'])assert.equal(placeMarkerType({title:'Grand Mosque View',category}),category);
 assert.equal(placeMarkerType(), 'landmark');
});

const boundary=JSON.parse(fs.readFileSync(new URL('../src/data/uae-boundary.json',import.meta.url)));
function inRing([x,y],ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [xi,yi]=ring[i],[xj,yj]=ring[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;}return inside;}
const contains=point=>boundary.geometry.coordinates.some(([outer,...holes])=>inRing(point,outer)&&!holes.some(hole=>inRing(point,hole)));
test('detailed UAE asset retains closed islands and enclave rings in lon-lat order',()=>{
 assert.equal(boundary.geometry.type,'MultiPolygon');assert.match(boundary.properties.source,/1:10m/);
 const rings=boundary.geometry.coordinates.flat(),coordinates=rings.flat();assert.ok(coordinates.length>750);assert.ok(boundary.geometry.coordinates.length>=10);
 for(const ring of rings)assert.deepEqual(ring[0],ring.at(-1));
 const xs=coordinates.map(p=>p[0]),ys=coordinates.map(p=>p[1]);assert.deepEqual(boundary.bbox,[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]);
 for(const point of [[55.3,25.2],[54.3773,24.4539],[55.45,25.3],[55.55,25.4],[55.6,25.5],[55.95,25.7],[56.3,25.1]])assert.ok(contains(point),`Emirate interior ${point}`);
 assert.equal(contains([56.25,26.2]),false,'Oman Musandam excluded');
 assert.equal(contains([56.324,25.28]),false,'Oman Madha enclave excluded');
 assert.equal(contains([56.274,25.269]),true,'UAE Nahwa enclave retained');
});
