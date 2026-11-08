'use client';
import {useI18n} from '@/i18n/LocaleProvider';
import {localizedSearch} from '@/i18n/messages.mjs';
import {Localized,LocalizedText} from '@/i18n/Localized';

import {useCallback,useMemo,useState,useSyncExternalStore} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowRight,Compass,Accessibility,Map as MapIcon,List,Search,SlidersHorizontal,MapPin,BookmarkPlus,Check} from 'lucide-react';
import JourneyShell from '@/components/layout/JourneyShell';
import MasarPageHeader from '@/components/layout/MasarPageHeader';
import NotificationBell from '@/components/notifications/NotificationBell';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import ExplorePlaceCard from '@/components/explore/ExplorePlaceCard';
import ExploreMap from '@/components/explore/ExploreMap';
import ExploreFilterModal from '@/components/explore/ExploreFilterModal';
import JourneyDialog from '@/components/ui/JourneyDialog';
import ResolvedShortlist from '@/components/explore/ResolvedShortlist';
import MasarSelect from '@/components/ui/MasarSelect';
import TodayJourneyWidget from '@/components/explore/TodayJourneyWidget';
import './explore-compact.css';
import {mergeCatalogue,cataloguePage} from '@/lib/attractionCatalogue';
import {useAttractionCatalogue} from '@/hooks/useAttractionCatalogue';
import {useTripDraft} from '@/hooks/useTripDraft';
import {setPriority,togglePlace} from '@/lib/tripDraft';
import {UAE_REGIONS,EXPLORE_CATEGORIES,EXPLORE_PLACES} from '@/data/exploreData';
const media='(min-width: 1100px)';
const subscribe=listener=>{const query=window.matchMedia(media);query.addEventListener('change',listener);return()=>query.removeEventListener('change',listener);};
const wideSnapshot=()=>window.matchMedia(media).matches;
const COLLECTION_ORDER=['things-to-do','restaurants','events','stays','locations','guides'];
const TITLES={restaurants:'A taste of somewhere new','things-to-do':'Things to do',stays:'Find your place to unwind',events:'Make an evening of it',locations:'Take the scenic route',guides:'A little local inspiration'};

function ExploreContent() {
  const {t}=useI18n();
  const router=useRouter();
  const catalogue=useAttractionCatalogue();
  const [pageState,setPageState]=useState({key:'',page:1});
  const allPlaces=useMemo(()=>mergeCatalogue(EXPLORE_PLACES,catalogue.items),[catalogue.items]);
  const {draft,update,storageError}=useTripDraft();
  const [region,setRegion]=useState(UAE_REGIONS[0]);
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('for-you');
  const [selected,setSelected]=useState(null);
  const [hovered,setHovered]=useState(null);
  const [viewport,setViewport]=useState({center:UAE_REGIONS[0].center,zoom:UAE_REGIONS[0].zoom});
  const [view,setView]=useState('list');
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [shortlistOpen,setShortlistOpen]=useState(false);
  const [filters,setFilters]=useState({priceTiers:[],minRating:0,tags:[]});
  const [notice,setNotice]=useState('');
  const [accessibilityFact,setAccessibilityFact]=useState('');
  const wide=useSyncExternalStore(subscribe,wideSnapshot,()=>false);
  const ids=useMemo(()=>new Set(draft.selections.map(p=>p.id)),[draft.selections]);
  const filterCount=filters.priceTiers.length+filters.tags.length+Number(filters.minRating>0);
  const places=useMemo(()=>allPlaces.filter(place=>{
    const matchesSearch=localizedSearch([place.title,place.description,place.neighborhood,place.cuisine,...place.tags],query,t);
    const fact=place.accessibility?.facts?.[accessibilityFact];
    if(accessibilityFact&&!(fact?.value===true&&['reported','confirmed'].includes(fact.status)))return false;
    return (region.id==='all'||place.emirate===region.id)&&(category==='for-you'||place.category===category)&&matchesSearch&&(!filters.priceTiers.length||filters.priceTiers.includes(place.priceTier))&&place.rating>=filters.minRating&&(!filters.tags.length||filters.tags.some(tag=>place.tags.includes(tag)));
  }),[allPlaces,region,category,query,filters,t,accessibilityFact]);
  const pageKey=JSON.stringify([region.id,category,query,filters,accessibilityFact]);
  const {page,count:pageCount,items:visiblePlaces}=cataloguePage(places,pageState.key===pageKey?pageState.page:1);
  const groups=visiblePlaces.reduce((groups,place)=>{(groups[place.category]||=[]).push(place);return groups;},{});
  const toggle=useCallback(place=>{
    const added=!ids.has(place.id);
    if(update(previous=>togglePlace(previous,place.id)))setNotice(`${place.title} ${added?'added to':'removed from'} your shortlist.`);
  },[ids,update]);
  function remove(id) {update(previous=>({...previous,savedAt:null,selections:previous.selections.filter(p=>p.id!==id)}));}
  function priority(id,value) {update(previous=>setPriority(previous,id,value));}
  const select=useCallback(place=>{setSelected(place);setViewport({center:[place.lat,place.lng],zoom:14});if(!wide)setView('map');},[wide]);
  function changeRegion(event) {const next=UAE_REGIONS.find(r=>r.id===event.target.value);setRegion(next);setSelected(null);setViewport({center:next.center,zoom:next.zoom});}
  const ask=useCallback(place=>router.push(`/chat?prompt=${encodeURIComponent(place.provider?`Resolve this shortlisted place reference with resolve_discovery_places: ${place.id}. Tell me whether it would suit my trip. Verify current visiting information.`:`Tell me about ${place.title} and whether it would suit my trip. Verify current visiting information.`)}`),[router]);
  const selectedCount=draft.selections.length;
  const required=draft.selections.filter(p=>p.priority==='must_visit').length;
  return <JourneyShell hideTopbar>
    <div className="journey-scroll explore-scroll">
      <div className="masar-topbar-frame">
        <Localized element={MasarPageHeader} attributes={["breadcrumbSection","title","subtitle","issueMotto"]}
          topbarOnly={true}
          breadcrumbSection="EXPLORE UAE"
          breadcrumbHref="/explore"
          title={null}
          subtitle={null}
          issueMotto={null}
          topRightActions={
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <NotificationBell />
              <Link href="/plan" className="journey-btn gold small" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span><LocalizedText message={"Trip brief"} /></span>
                <ArrowRight size={14} />
              </Link>
            </div>
          }
        />
      </div>
      <div className="explore-layout explore-layout--compact">
        <Localized element={"section"} attributes={["aria-label"]} className={`explore-feed ${!wide&&view==='map'?'mobile-hidden':''}`} aria-label="Discover places">
          <header className="explore-selection-heading">
            <span className="explore-selection-eyebrow"><i aria-hidden="true"/><LocalizedText>Your UAE, your way</LocalizedText></span>
            <h1><LocalizedText>Choose your</LocalizedText> <span><LocalizedText>must-visits.</LocalizedText></span></h1>
          </header>
          <TodayJourneyWidget />
          <div className="explore-search-row"><label className="explore-search"><Search size={17}/><Localized element={"input"} attributes={["aria-label","placeholder"]} aria-label="Search places" placeholder="A landmark, a flavour, a little adventure…" value={query} onChange={e=>setQuery(e.target.value)}/></label><Localized element={"button"} attributes={["aria-label"]} className="journey-btn subtle" onClick={()=>setFiltersOpen(true)} aria-label={`Filters${filterCount?`, ${filterCount} active`:''}`}><SlidersHorizontal size={16}/><LocalizedText>{filterCount||'Filters'}</LocalizedText></Localized></div>
          <div className="explore-toolbar">
            <div className="explore-select-row"><label><MapPin size={14}/><span className="sr-only"><LocalizedText message={"Emirate"} /></span><Localized element="select" attributes={["aria-label"]} value={region.id} onChange={changeRegion} aria-label="Emirate">{UAE_REGIONS.map(r=><option value={r.id} key={r.id}><LocalizedText>{r.label}</LocalizedText></option>)}</Localized></label></div>
            <div className="explore-access-compact"><Accessibility size={14} aria-hidden="true"/><MasarSelect aria-label="Filter by reported accessibility feature" value={accessibilityFact} onChange={setAccessibilityFact} options={[[ '', 'All access information'],['step_free_entrance','Reported step-free entrance'],['accessible_toilets','Reported accessible toilets'],['lift','Reported lift']]} compact className="explore-accessibility-select"/><span className="sr-only"><LocalizedText>Supplier and tourism reports need confirmation for your visit.</LocalizedText></span></div>
          </div>
          <Localized element={"div"} attributes={["aria-label"]} className="explore-categories" aria-label="Place categories">{EXPLORE_CATEGORIES.map(c=><button key={c.id} aria-pressed={category===c.id} className={category===c.id?'active':''} onClick={()=>setCategory(c.id)}>{c.id==='for-you'?<><Compass size={13}/><LocalizedText message={" Discover"} /></>:<LocalizedText>{c.label}</LocalizedText>}</button>)}</Localized>
          <div className="explore-mobile-switch"><button aria-pressed={view==='list'} onClick={()=>setView('list')}><List size={15}/><LocalizedText message={" Places"} /></button><button aria-pressed={view==='map'} onClick={()=>setView('map')}><MapIcon size={15}/><LocalizedText message={" Map"} /></button></div>
          {storageError&&<p className="journey-alert" role="alert">{storageError}</p>}
          {draft.unreadable&&<p className="journey-alert" role="alert"><LocalizedText message={"Your saved brief could not be read. "} /><button onClick={()=>update(()=>({...draft,selections:[],brief:{},unreadable:false}),{reset:true})}><LocalizedText message={"Reset unreadable brief"} /></button></p>}
          {catalogue.loading&&<p role="status"><LocalizedText message={"Loading destinations across the seven emirates…"} /></p>}
          {catalogue.error&&<p className="journey-alert" role="alert">{catalogue.error} <button onClick={catalogue.retry}><LocalizedText message={"Try loading destinations again"} /></button></p>}
          {(!places.length?<div className="journey-empty"><Search size={30}/><h2><LocalizedText message={"A different path, perhaps?"} /></h2><p><LocalizedText message={"Try another search or loosen your filters."} /></p><button className="journey-btn subtle" onClick={()=>{setAccessibilityFact('');setQuery('');setFilters({priceTiers:[],minRating:0,tags:[]});setCategory('for-you');setRegion(UAE_REGIONS[0]);}}><LocalizedText message={"Reset filters"} /></button></div>:
            Object.entries(groups).sort(([a],[b])=>COLLECTION_ORDER.indexOf(a)-COLLECTION_ORDER.indexOf(b)).map(([key,items],index)=><section key={key} className="explore-collection"><div className={`explore-collection-heading${index===0?' sr-only':''}`}><h2><LocalizedText>{TITLES[key]||'Discover more'}</LocalizedText></h2><span><LocalizedText message={"⟦0⟧ places"} values={[items.length]} /></span></div><div className="discovery-cards">{items.map(place=><ExplorePlaceCard key={place.id} place={place} isSelected={selected?.id===place.id} inShortlist={ids.has(place.id)} onSelect={select} onHover={setHovered} onToggleShortlist={toggle} onPlanTrip={ask}/>)}</div></section>))}
          {places.length>12&&<Localized element={"nav"} attributes={["aria-label"]} aria-label="Destination pages" className="catalogue-pagination"><button className="journey-btn subtle small" disabled={page===1} onClick={()=>setPageState({key:pageKey,page:page-1})}><LocalizedText message={"← Previous"} /></button><span><LocalizedText message={"Page ⟦0⟧ of ⟦1⟧ · ⟦2⟧ places"} values={[page,pageCount,places.length]} /></span><button className="journey-btn subtle small" disabled={page===pageCount} onClick={()=>setPageState({key:pageKey,page:page+1})}><LocalizedText message={"Next →"} /></button></Localized>}
        </Localized>
        {(wide||view==='map')&&<Localized element={"aside"} attributes={["aria-label"]} className="explore-map-column" aria-label="Destination map"><div className="explore-map-frame"><ExploreMap places={places} center={viewport.center} zoom={viewport.zoom} selectedPlace={selected} hoveredPlace={hovered} onSelectPlace={select} onPlanTrip={toggle} planLabel="Add / remove from shortlist"/></div>{selected&&<div className="explore-map-selection"><div><span className="journey-eyebrow"><LocalizedText message={"ON YOUR RADAR"} /></span><strong>{selected.title}</strong></div><button className="journey-btn gold small" onClick={()=>toggle(selected)}>{ids.has(selected.id)?<Check size={15}/>:<BookmarkPlus size={15}/>} <LocalizedText>{ids.has(selected.id)?'Added':'Add to trip'}</LocalizedText></button></div>}{!wide&&<button className="journey-btn subtle map-back" onClick={()=>setView('list')}><List size={15}/><LocalizedText message={" Back to places"} /></button>}</Localized>}
      </div>
    </div>
    <div className="draft-dock"><Localized element={"button"} attributes={["aria-label"]} className="draft-dock-summary" onClick={()=>setShortlistOpen(true)} aria-label={`Review shortlist, ${selectedCount} places`}><span className="draft-dock-icon"><BookmarkPlus size={20}/>{selectedCount>0&&<b>{selectedCount}</b>}</span><span><strong><LocalizedText>{selectedCount?`${selectedCount} ${selectedCount===1?'place':'places'} on your radar`:'Your next journey starts with a place'}</LocalizedText></strong><small><LocalizedText>{selectedCount?`${required} must visit · ${selectedCount-required} if time allows`:'Tap + to start your shortlist'}</LocalizedText></small></span></Localized><Link className="journey-btn gold" href="/plan"><LocalizedText>{selectedCount?'Curate my trip':'Start a trip'}</LocalizedText> <ArrowRight size={16}/></Link></div>
    <span className="sr-only" role="status" aria-live="polite"><LocalizedText>{notice}</LocalizedText></span>
    {shortlistOpen&&<Localized element={JourneyDialog} attributes={["title"]} title={selectedCount ? `Your shortlist (${selectedCount})` : "Your shortlist"} onClose={()=>setShortlistOpen(false)}><p className="journey-dialog-copy"><LocalizedText message={"Make a few must-visits. Leave a little room for discovery."} /></p><div className="journey-dialog-body"><ResolvedShortlist selections={draft.selections} onRemove={remove} onPriority={priority}/></div><div className="journey-dialog-footer"><span><LocalizedText message={"Saved on this device"} /></span><Link className="journey-btn gold" href="/plan"><LocalizedText message={"Shape my trip "} /><ArrowRight size={16}/></Link></div></Localized>}
    <ExploreFilterModal isOpen={filtersOpen} onClose={()=>setFiltersOpen(false)} filters={filters} onApplyFilters={setFilters} onResetFilters={()=>setFilters({priceTiers:[],minRating:0,tags:[]})}/>
  </JourneyShell>;
}
export default function ExplorePage(){return <ProtectedRoute><ExploreContent/></ProtectedRoute>;}
