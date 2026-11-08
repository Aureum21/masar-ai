"""Account-owned inbox, materialized when due. No browser-local scheduling."""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import json
from sqlalchemy import select
from .models import PassportEvent, uid
from .service import extract_days
from .catalogue import heritage_for

def due_reminders(trip, now=None):
    now = (now or datetime.now(ZoneInfo('Asia/Dubai'))).astimezone(ZoneInfo('Asia/Dubai'))
    days, data = extract_days(trip.itinerary_data)
    if not isinstance(data, dict) or data.get('status') not in {'active','completed'} or not data.get('start_date'):
        return []
    from datetime import date
    start = date.fromisoformat(data['start_date'])
    output=[]
    for index, day in enumerate(days):
        target = start + timedelta(days=day.get('day_number',index+1)-1)
        if target > now.date()+timedelta(days=1) or target < now.date()-timedelta(days=7):
            continue
        base=f'/trips/{trip.id}?day={index}'
        def add(kind, identity, title, message, clock, link=base):
            due=clock if isinstance(clock,datetime) else datetime.combine(target,clock,ZoneInfo('Asia/Dubai'))
            if now >= due:
                output.append({'key':f'notice:{trip.id}:{target}:{identity}:{due:%H%M}','tripId':trip.id,'type':kind,'title':title,'message':message,'deepLink':link,'scheduledFor':due.isoformat(),'icon':'🏆' if kind=='landmark_quest' else '📍'})
        from datetime import time
        add('morning_plan','morning',f'Day {index+1}: '+day.get('theme','Your journey'),'Your daily plan is ready.',time(7))
        main_challenge = next((a.get('id') for a in day.get('activities',[]) if heritage_for(a)), None)
        for j, activity in enumerate(day.get('activities',[])):
            clock=None
            raw=activity.get('start_time') or activity.get('time','')
            for fmt in ('%H:%M','%I:%M %p'):
                try:
                    clock=datetime.strptime(raw,fmt).time(); break
                except (ValueError,TypeError):pass
            if clock is None:
                continue
            event_time=datetime.combine(target,clock,ZoneInfo('Asia/Dubai'))
            clock=event_time-timedelta(minutes=30)
            challenge=heritage_for(activity) if activity.get('id')==main_challenge else None
            add('landmark_quest' if challenge else 'upcoming_activity',activity.get('id',str(j)),activity.get('title','Upcoming stop'),f'Scheduled for {event_time:%H:%M} GST.',clock,base+('&preview='+challenge['landmark'] if challenge else '&activity='+str(j)))
    return output

async def inbox(db, user_id, trips, now=None):
    from .promotions import current_dubai_day, get_today_assignment
    trip_ids={trip.id for trip in trips}
    due={n['key']:n for trip in trips for n in due_reminders(trip,now)}

    today_str = current_dubai_day(now)
    promo_key = f'notice:daily_promo:{user_id}:{today_str}'
    today_assignment = await get_today_assignment(db, user_id, now)

    if today_assignment is None:
        due[promo_key] = {
            'key': promo_key,
            'tripId': None,
            'type': 'daily_promotion',
            'title': 'Daily Promotional Wheel',
            'message': 'Spin today’s challenge wheel to reveal a game or venue challenge and earn Daily Challenge Coins.',
            'deepLink': None,
            'action': 'spin',
            'scheduledFor': (now or datetime.now(ZoneInfo('Asia/Dubai'))).isoformat(),
            'icon': '🎡',
            'persistent': True,
        }
    elif today_assignment.state in {'drawn', 'accepted', 'in_progress'}:
        title = today_assignment.template_snapshot.get('title', 'Today’s Quest')
        due[promo_key] = {
            'key': promo_key,
            'tripId': None,
            'type': 'daily_promotion',
            'title': f'Daily Challenge: {title}',
            'message': f'Complete today’s {today_assignment.kind} challenge before midnight Dubai to earn {today_assignment.coins_reward} Coin.',
            'deepLink': None,
            'action': 'resume',
            'scheduledFor': (now or datetime.now(ZoneInfo('Asia/Dubai'))).isoformat(),
            'icon': today_assignment.template_snapshot.get('icon', '🎡'),
            'persistent': True,
        }
    elif today_assignment.state == 'completed':
        due[promo_key] = {
            'key': promo_key,
            'tripId': None,
            'type': 'daily_promotion',
            'title': 'Daily Challenge Complete',
            'message': f'You earned {today_assignment.coins_reward} Daily Challenge Coin today. Check back tomorrow at midnight Dubai!',
            'deepLink': None,
            'action': 'view',
            'scheduledFor': (now or datetime.now(ZoneInfo('Asia/Dubai'))).isoformat(),
            'icon': '🪙',
            'persistent': True,
        }

    stored=list((await db.scalars(select(PassportEvent).where(PassportEvent.user_id==user_id,PassportEvent.type=='notification'))).all())
    by_key={e.source_key:e for e in stored}
    # Rescheduling, removal and cancellation invalidate the old reminder immediately.
    for event in stored:
        if event.source_key not in due and (not json.loads(event.description).get('persistent') or (event.trip_id is not None and event.trip_id not in trip_ids)):
            await db.delete(event)
    for key, value in due.items():
        event=by_key.get(key)
        previous=json.loads(event.description) if event else {}
        payload=dict(value,read=previous.get('read',False),dismissed=previous.get('dismissed',False))
        if event:
            event.description=json.dumps(payload)
        else:
            event=PassportEvent(id=uid(),user_id=user_id,trip_id=value['tripId'],type='notification',title=value['title'],description=json.dumps(payload),is_demo=False,source_key=key)
            db.add(event)
    await db.flush()
    current=list((await db.scalars(select(PassportEvent).where(PassportEvent.user_id==user_id,PassportEvent.type=='notification').order_by(PassportEvent.created_at.desc()))).all())
    return [dict(json.loads(e.description),id=e.id,createdAt=e.created_at.isoformat()) for e in current if not json.loads(e.description).get('dismissed')]
