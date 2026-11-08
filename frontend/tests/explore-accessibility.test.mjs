import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import * as presentation from '../src/components/explore/accessibilityPresentation.mjs';
import {loadComponent} from './helpers/loadComponent.mjs';
import {renderLocalizedMarkup} from './helpers/renderLocalized.mjs';

const fact=value=>({value,status:'reported',source:'Venue',source_url:'https://example.com/access',last_checked:'2026-10-30'});

test('reported access stays distinct from missing, unsourced and unsafe evidence',()=>{
  const result=presentation.accessPresentation({facts:{step_free_entrance:fact(true),lift:{value:true,status:'reported'},accessible_toilets:{...fact(true),source_url:'javascript:alert(1)'},quiet_times:{...fact('Morning'),status:'unknown'}}});
  assert.deepEqual(result.reported.map(f=>f.key),['step_free_entrance']);
  assert.ok(result.unknown.some(f=>f.key==='lift'));
  assert.ok(result.unknown.some(f=>f.key==='accessible_toilets'));
});

test('known access barriers are prioritized ahead of positive chips',()=>{
  const result=presentation.accessPresentation({facts:{lift:fact(true),accessible_toilets:fact(true),step_free_entrance:fact(false)}});
  assert.equal(result.reported[0].key,'step_free_entrance');
  assert.equal(result.reported[0].value,false);
});

test('cards summarize reports without expanding long notes or repeated unknown rows',()=>{
  const Component=loadComponent('components/explore/ExploreAccessibility',{'./accessibilityPresentation.mjs':presentation}).default;
  const markup=renderLocalizedMarkup(React.createElement(Component,{title:'Venue',evidence:{facts:{step_free_entrance:{...fact(true),note:'A long arrival note reserved for the detail panel.'}}}}));
  assert.match(markup,/Step-free entry/);
  assert.match(markup,/View access details/);
  assert.match(markup,/aria-haspopup="dialog"/);
  assert.doesNotMatch(markup,/A long arrival note|<details|Unknown/);
  const empty=renderLocalizedMarkup(React.createElement(Component,{title:'Venue'}));
  assert.match(empty,/not yet reported/);
  assert.match(empty,/What to check/);
  assert.doesNotMatch(empty,/Step-free entry/);
});
