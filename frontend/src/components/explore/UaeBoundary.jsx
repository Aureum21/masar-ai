'use client';
import {memo} from 'react';
import {GeoJSON,Pane} from 'react-leaflet';
import boundary from '@/data/uae-boundary.json';

const [west,south,east,north]=boundary.bbox;
export const UAE_BOUNDS=[[south,west],[north,east]];
const layers=[
  {color:'#e9aa32',weight:6,opacity:.09,fill:false,className:'uae-boundary-halo'},
  {color:'#f3ba48',weight:3,opacity:.22,fill:false,className:'uae-boundary-bloom'},
  {color:'#ffd274',weight:1.15,opacity:.9,fill:true,fillColor:'#dca332',fillOpacity:.015,className:'uae-boundary-edge'}
];

/** Geographic vector overlay; never captures map drags, marker clicks or taps. */
export default memo(function UaeBoundary() {
  return <Pane name="uae-boundary" style={{zIndex:350,pointerEvents:'none'}}>
    {layers.map((style,index)=><GeoJSON key={index} data={boundary} interactive={false} smoothFactor={0} bubblingMouseEvents={false} pathOptions={style} attribution={index===2?'Outline: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth</a>':undefined}/>)}
  </Pane>;
});
