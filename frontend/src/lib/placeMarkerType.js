/** Prefer semantic site metadata; keep live providers' category icons intact. */
export const MARKER_TYPES={
 beach:{label:'Beach',icon:'Waves',color:'#38BDF8',bg:'#0E171E'},
 museum:{label:'Museum',icon:'Landmark',color:'#C4A2FF',bg:'#171122'},
 mosque:{label:'Mosque',icon:'MoonStar',color:'#67DDB6',bg:'#0D1D18'},
 mall:{label:'Shopping mall',icon:'ShoppingBag',color:'#F0ABFC',bg:'#201021'},
 mountain:{label:'Mountain',icon:'Mountain',color:'#B4C996',bg:'#161C12'},
 nature:{label:'Nature',icon:'Trees',color:'#5DD6A0',bg:'#0D1D16'},
 heritage:{label:'Heritage',icon:'Castle',color:'#E5B779',bg:'#20180F'},
 souq:{label:'Souq',icon:'Store',color:'#F3BE82',bg:'#20170F'},
 marina:{label:'Marina',icon:'Anchor',color:'#67CDE5',bg:'#0D1A20'},
 pearl:{label:'Pearl farm',icon:'Shell',color:'#F5D6A5',bg:'#201C14'},
 attraction:{label:'Attraction',icon:'FerrisWheel',color:'#FB94A8',bg:'#201219'},
 tower:{label:'Architecture',icon:'Building2',color:'#FBBF24',bg:'#171610'},
 landmark:{label:'Landmark',icon:'Camera',color:'#FBBF24',bg:'#171610'},
 restaurants:{label:'Restaurant',icon:'Utensils',color:'#F59E0B',bg:'#18140E'},
 stays:{label:'Hotel',icon:'Hotel',color:'#10B981',bg:'#0D1714'},
 events:{label:'Event',icon:'Ticket',color:'#F43F5E',bg:'#1A0E13'},
 locations:{label:'Location',icon:'MapPin',color:'#38BDF8',bg:'#0E171E'},
 guides:{label:'Guide',icon:'BookOpen',color:'#A855F7',bg:'#160E1C'},
 airport:{label:'Airport Kiosk',icon:'Plane',color:'#10B981',bg:'#0D1D18'}
};

export function placeMarkerType(place={}){
 if(place.type==='airport'||place.kind==='airport')return 'airport';
 const category=place.category;
 if(['restaurants','stays','events','guides'].includes(category))return category;
 const kind=String(place.siteType||place.kind||'').toLowerCase();
 // Specific metadata takes priority over display names.
 if(['beach','museum','mosque','mall','mountain','souq','marina','pearl','airport'].includes(kind))return kind;
 const name=`${place.id||''} ${place.title||''} ${place.name||''}`.toLowerCase().replaceAll('-',' ');
 if(/\bairport\b|\bkiosk\b/.test(name))return 'airport';
 if(/\bmosque\b|\bmasjid\b/.test(name))return 'mosque';
 if(/\bmuseum\b|\blouvre\b/.test(name))return 'museum';
 if(/\bmall\b|\bshopping centre\b|\bshopping center\b/.test(name))return 'mall';
 if(/\bbeach(?:es)?\b/.test(name))return 'beach';
 if(/\bjebel\b|\bmountain\b/.test(name))return 'mountain';
 if(/\bsou[qk]\b|\bsouks\b/.test(name))return 'souq';
 if(/\bmarina\b/.test(name))return 'marina';
 if(/\bpearl farm\b/.test(name))return 'pearl';
 if(kind==='nature')return 'nature';
 if(kind==='heritage'||/\bfort\b|\bcastle\b|\bal fahidi\b/.test(name))return 'heritage';
 if(kind==='attraction')return 'attraction';
 if(/\bburj\b|\btower\b/.test(name))return 'tower';
 if(category==='locations')return 'locations';
 return 'landmark';
}
