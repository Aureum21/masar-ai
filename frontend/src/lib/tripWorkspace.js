/**
 * Utilities for the editable Trip Workspace.
 * Handles revision-safe immutability, activity reordering, cross-day moves,
 * day-lightening, challenge recognition, and budget synthesis.
 */

export const APPROVED_LANDMARK_CHALLENGES = [
  { id: 'heritage:burj', landmark: 'burj', name: 'Burj Khalifa' },
  { id: 'heritage:future', landmark: 'future', name: 'Museum of the Future' },
  { id: 'heritage:mosque', landmark: 'mosque', name: 'Sheikh Zayed Grand Mosque' }
];

// Catalogue-listed bowling venues can be recognized on legacy plans missing challenge metadata.
export const CATALOGUE_BOWLING_PLACES=["city-centre-mirdif", "dubai-festival-city-mall", "palm-jumeirah-mall"];


// Conditional previews are not scheduled tasks and cannot award or accept evidence.
export const CATALOGUE_BOXING_CANDIDATES=['dubai-festival-city-mall','palm-jumeirah-mall'];
export function conditionalBoxingPreview(activity) {
  if(!CATALOGUE_BOXING_CANDIDATES.includes(activity?.place_id)||activity.challenge?.key==='boxing')return null;
  return {id:'boxing-preview:'+activity.place_id,type:'boxing',landmark:'boxing',animationKey:'boxing',name:'Boxing Challenge · conditional preview',activityId:activity.id,previewOnly:true};
}
export function isLandmarkChallenge(activity) {
  if(!activity)return null;
  const task=activity.challenge|| (CATALOGUE_BOWLING_PLACES.includes(activity.place_id)?{key:'bowling',place_id:activity.place_id,animation_key:'bowling'}:null);
  if(task&&['boxing','bowling','sunset-seeker'].includes(task.key)&&task.place_id===activity.place_id){
    const names={boxing:'Boxing Challenge',bowling:'Bowling Challenge','sunset-seeker':'Sunset Seeker'};
    return {id:task.key+':'+activity.place_id,landmark:task.key,type:task.key,animationKey:task.animation_key,name:names[task.key],activityId:activity.id,sunsetWindow:task.sunset_window,availability:task.availability};
  }
  const title=(activity.title || activity.name || '').toLowerCase();
  const pid=(activity.place_id || activity.product_id || '').toLowerCase();
  const aliases={'burj-khalifa-sky':'burj-khalifa','burj-khalifa-observation':'burj-khalifa','grand-mosque':'sheikh-zayed-grand-mosque','sheikh-zayed-mosque':'sheikh-zayed-grand-mosque'};
  const canonical=aliases[pid] || pid;
  const candidates=[['dubai-frame','frame','Dubai Frame'],['museum-of-the-future','future','Museum of the Future'],['burj-khalifa','burj','Burj Khalifa'],['sheikh-zayed-grand-mosque','mosque','Sheikh Zayed Grand Mosque']];
  const found=pid?candidates.find(c=>c[0]===canonical):candidates.find(c=>title.includes(c[2].toLowerCase()));
  return found?{id:'heritage:'+found[1],landmark:found[1],name:found[2],activityId:activity.id,type:'heritage-detective',animationAvailable:found[1]!=='frame'}:null;
}

export function reorderActivities(days, dayIndex, fromIndex, toIndex) {
  if (!Array.isArray(days) || !days[dayIndex]) return days;
  const day = days[dayIndex];
  const list = [...(day.activities || [])];
  if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) {
    return days;
  }
  const [moved] = list.splice(fromIndex, 1);
  list.splice(toIndex, 0, moved);

  return days.map((d, idx) => (idx === dayIndex ? { ...d, activities: list.map(clearFlexibleTime) } : d));
}

export function moveActivityToDay(days, sourceDayIndex, activityIndex, targetDayIndex) {
  if (!Array.isArray(days) || !days[sourceDayIndex] || !days[targetDayIndex]) return days;
  if (sourceDayIndex === targetDayIndex) return days;

  const sourceList = [...(days[sourceDayIndex].activities || [])];
  if (activityIndex < 0 || activityIndex >= sourceList.length) return days;

  const [moved] = sourceList.splice(activityIndex, 1);
  const targetList = [...(days[targetDayIndex].activities || []), clearFlexibleTime(moved)];

  return days.map((d, idx) => {
    if (idx === sourceDayIndex) return { ...d, activities: sourceList };
    if (idx === targetDayIndex) return { ...d, activities: targetList };
    return d;
  });
}

export function removeActivity(days, dayIndex, activityIndex) {
  if (!Array.isArray(days) || !days[dayIndex]) return days;
  const list = [...(days[dayIndex].activities || [])];
  if (activityIndex < 0 || activityIndex >= list.length) return days;

  list.splice(activityIndex, 1);
  return days.map((d, idx) => (idx === dayIndex ? { ...d, activities: list } : d));
}

export function updateActivityStatus(days, dayIndex, activityIndex, newStatus) {
  if (!Array.isArray(days) || !days[dayIndex]) return days;
  const list = [...(days[dayIndex].activities || [])];
  if (activityIndex < 0 || activityIndex >= list.length) return days;

  list[activityIndex] = { ...list[activityIndex], status: newStatus };
  return days.map((d, idx) => (idx === dayIndex ? { ...d, activities: list } : d));
}

export function makeDayLighter(days, dayIndex) {
  if (!Array.isArray(days) || !days[dayIndex]) return { days, movedCount: 0, message: 'No changes needed.' };
  const currentDay = days[dayIndex];
  const acts = currentDay.activities || [];
  if (acts.length <= 2) {
    return { days, movedCount: 0, message: 'This day is already relaxed with 2 or fewer activities.' };
  }

  let targetIdx = -1;
  for (let i=acts.length-1;i>=0;i--) {
    const item=acts[i];
    if(!isLandmarkChallenge(item) && !item.must_visit && item.priority!=='must_visit' && !item.selection_id && !isProtectedActivity(item)) {targetIdx=i;break;}
  }
  if(targetIdx<0)return {days,movedCount:0,message:'All remaining stops are required, challenges or fixed commitments. Choose an explicit change instead.'};

  // If a next day exists, move it to the next day
  if (dayIndex + 1 < days.length) {
    const updatedDays = moveActivityToDay(days, dayIndex, targetIdx, dayIndex + 1);
    const movedTitle = acts[targetIdx].title || 'Activity';
    return {
      days: updatedDays,
      movedCount: 1,
      message: `Moved "${movedTitle}" to Day ${dayIndex + 2} to make Day ${dayIndex + 1} lighter.`
    };
  }

  // If it's the last day, remove it with a clear note
  const removedTitle = acts[targetIdx].title || 'Activity';
  const updatedDays = removeActivity(days, dayIndex, targetIdx);
  return {
    days: updatedDays,
    movedCount: 1,
    message: `Lightened Day ${dayIndex + 1} by removing "${removedTitle}".`
  };
}

export function computeTripBudget(days, featuredHotel = null) {
  let estimatedTotal = 0;
  let confirmedTotal = 0;
  let itemCount = 0;

  if (Array.isArray(days)) {
    for (const d of days) {
      for (const a of d.activities || []) {
        const cost = typeof a.cost === 'number' ? a.cost : parseFloat(a.cost) || 0;
        if (cost > 0) {
          estimatedTotal += cost;
          itemCount++;

        }
      }
    }
  }

  if (featuredHotel) {
    const hotelPrice = parseFloat(featuredHotel.price || featuredHotel.final_price) || 0;
    if (hotelPrice > 0) {
      estimatedTotal += hotelPrice;

    }
  }

  return {
    estimatedTotal: Math.round(estimatedTotal),
    confirmedTotal: Math.round(confirmedTotal),
    itemCount
  };
}

export function isProtectedActivity(item) {
  return Boolean(item.booking_ref || ['confirmed','hold'].includes(item.booking_status) || ['pending','accepted'].includes(item.evidence_status) || item.event_date);
}
export function clearFlexibleTime(item) {
  if(isProtectedActivity(item))return item;
  const next={...item,time:'Flexible · review schedule',needs_schedule_review:true};
  for(const key of ['start_time','end_time','travel_minutes_from_previous','scheduled_at'])delete next[key];
  return next;
}

export function tripHasConfirmedBooking(trip) {
  return Boolean(trip?.reservations?.some(b=>b.source==='provider' && b.status==='CONFIRMED' && b.environment==='live' && String(b.trip_id)===String(trip.id)));
}
