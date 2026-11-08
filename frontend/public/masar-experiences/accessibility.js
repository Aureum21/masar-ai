/** Accessible host bridge for optional demonstrations. No award or submission actions. */
export function connectPreviewKeys({toggle,reset}) {
  const handler=event=>{
    if(event.key==='Escape'&&window.parent!==window){
      event.preventDefault();window.parent.postMessage({type:'masar-preview-close'},location.origin);return;
    }
    if(event.target?.closest?.('button,input,textarea,select,a'))return;
    if(event.code==='Space'){event.preventDefault();toggle();}
    if(event.key.toLowerCase()==='r'){event.preventDefault();reset();}
  };
  window.addEventListener('keydown',handler);
  window.addEventListener('pagehide',()=>window.removeEventListener('keydown',handler),{once:true});
}
