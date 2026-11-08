import test from 'node:test';
import assert from 'node:assert/strict';
import archive from '../../data/heritage_archive.v1.json' with {type:'json'};
import {timeTravelPlace} from '../src/lib/timeTravelPlaces.mjs';

test('all eleven archive landmarks are eligible by identity and canonical name',()=>{
  assert.equal(Object.keys(archive).length,11);
  for(const [id,item] of Object.entries(archive)) {
    assert.equal(timeTravelPlace({place_id:id})?.id,id);
    assert.equal(timeTravelPlace({title:item.landmark_name})?.id,id);
  }
});
test('Saadiyat Beach and other unsupported trip stops have no Time Travel option',()=>{
  for(const title of ['Saadiyat Beach','Saadiyat Beach Event','Burj Khalifa','Dubai Mall','Al Fahidi Historical Neighbourhood','Lunch near Fujairah Fort','Sunset at Saadiyat Beach']) {
    assert.equal(timeTravelPlace({title}),null,title);
  }
  assert.equal(timeTravelPlace({place_id:'saadiyat-beach',title:'Saadiyat Beach'}),null);
  assert.equal(timeTravelPlace({place_id:'al-fahidi',title:'Al Fahidi Historical Neighbourhood'}),null);
  assert.equal(timeTravelPlace(null),null);
});
test('supported aliases and a visit prefix retain the exact archive identity',()=>{
  assert.equal(timeTravelPlace({place_id:'ajman-museum',title:'Ajman Museum'})?.id,'ajman_fort');
  assert.equal(timeTravelPlace({title:'Visit Qasr Al Hosn'})?.id,'qasr_al_hosn');
  assert.equal(timeTravelPlace({title:'Dubai Museum'})?.id,'al_fahidi');
});

test('new planning identities and server archive metadata open the matching landmark',()=>{
  for(const [place_id,id] of [['sharjah-fort','al_hisn'],['al-jahili-fort','al_jahili'],['al-bidya-mosque','al_badiyah']]) {
    assert.equal(timeTravelPlace({place_id})?.id,id);
  }
  assert.equal(timeTravelPlace({place_id:'al-fahidi',time_travel:{landmark_id:'al_fahidi'}})?.id,'al_fahidi');
});
