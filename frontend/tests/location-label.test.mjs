import assert from 'node:assert/strict';
import {test} from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {locationLabel} from '../src/lib/locationLabel.js';

test('coordinate locations safely render in itinerary and route summaries',()=>{
  const location={lat:25.197197,lng:55.274376};
  const original=structuredClone(location);
  const markup=renderToStaticMarkup(React.createElement('span',null,locationLabel(location)));
  assert.match(markup,/25.1972°.*, 55.2744°/);
  assert.deepEqual(location,original,'presentation preserves original coordinates');
});
test('named locations and legacy string addresses stay readable',()=>{
  assert.equal(locationLabel(' Downtown Dubai '),'Downtown Dubai');
  assert.equal(locationLabel({name:'Burj Khalifa',lat:25.2,lng:55.3}),'Burj Khalifa');
  assert.equal(locationLabel({formatted_address:'Dubai Marina'}),'Dubai Marina');
  assert.equal(locationLabel({latitude:'24.4',longitude:'54.5'}),'24.4000°, 54.5000°');
  assert.equal(locationLabel({lat:0,lng:0}),'0.0000°, 0.0000°');
});
test('incomplete or invalid coordinates use an honest text fallback',()=>{
  for(const value of [null,undefined,{},[],{lat:25},{lat:200,lng:50},{lat:'',lng:0},{lat:NaN,lng:55},{address:{lat:25,lng:55}}]){
    assert.equal(locationLabel(value,'UAE destination'),'UAE destination');
  }
});
