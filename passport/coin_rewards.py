"""Demonstration catalogue and wallet, separate from earned coins and real vouchers."""
import json
import os
from fastapi import HTTPException
from sqlalchemy import select, func
from .models import CoinRedemption, utcnow, uid

STARTING_COINS = 200
CATALOGUE = [
    {'id':'yas-island-demo-ticket','kind':'ticket','title':'Yas Island day out',
     'location':'Abu Dhabi · Yas Island','description':'Picture a day of island adventures with a sample attraction pass.',
     'value_label':'Sample attraction admission','coins_cost':80,'image':None,
     'terms':'Demo only. This sample does not include admission to any Yas Island attraction. Real attractions have separate tickets, availability and entry conditions.'},
    {'id':'dubai-frame-ticket','kind':'ticket','title':'Dubai Frame',
     'location':'Dubai · Zabeel Park','description':'Try redeeming a sample pass for a new view of Dubai.',
     'value_label':'1 demo admission pass','coins_cost':35,'image':'/attraction-photos/dubai-frame.webp',
     'terms':'Demo only. This pass cannot be used for entry, reservations or purchases.'},
    {'id':'dubai-mall-gift-card','kind':'gift_card','title':'Dubai Mall gift card',
     'location':'Dubai · Downtown','description':'A sample mall gift card for trying the reward wallet.',
     'value_label':'AED 50 sample gift card','coins_cost':50,'image':None,
     'terms':'Demo only. No stored value, merchant acceptance or mall partnership. This sample cannot be used for purchases.'},
    {'id':'emirates-mall-gift-card','kind':'gift_card','title':'Mall of the Emirates gift card',
     'location':'Dubai · Al Barsha','description':'Explore how a UAE mall gift card appears in your rewards.',
     'value_label':'AED 50 sample gift card','coins_cost':50,'image':None,
     'terms':'Demo only. No stored value, merchant acceptance or mall partnership. This sample cannot be used for purchases.'}
]


def catalogue():
    try:
        prices = json.loads(os.getenv('COIN_REWARD_COSTS', '{}'))
        if not isinstance(prices, dict) or any(type(v) is not int or not 1 <= v <= 100000 for v in prices.values()):
            raise ValueError()
    except (ValueError, TypeError):
        raise HTTPException(503, 'Reward prices are being updated. Please try again later.')
    enabled = os.getenv('COIN_REWARDS_ENABLED', 'true').lower() == 'true'
    return [dict(item, coins_cost=prices.get(item['id'], item['coins_cost']), available=enabled, is_demo=True) for item in CATALOGUE]


async def balance(db, user_id):
    spent = await db.scalar(select(func.coalesce(func.sum(CoinRedemption.coins_cost), 0)).where(
        CoinRedemption.user_id==user_id, CoinRedemption.is_demo.is_(True)))
    return STARTING_COINS - int(spent or 0)


def view(record):
    return {'id':record.id,'offer_id':record.offer_id,'coins_cost':record.coins_cost,
            'state':record.state,'offer':record.snapshot,'created_at':record.created_at.isoformat(),
            'used_at':record.used_at.isoformat() if record.used_at else None,
            'code':record.code,'is_demo':record.is_demo}


async def history(db, user_id):
    records=(await db.scalars(select(CoinRedemption).where(CoinRedemption.user_id==user_id, CoinRedemption.is_demo.is_(True)).order_by(CoinRedemption.created_at.desc()))).all()
    return [view(row) for row in records]


async def redeem(db, user_id, offer_id, key, expected_cost):
    # The router's Passport session locks the user for this entire transaction.
    existing=await db.scalar(select(CoinRedemption).where(CoinRedemption.user_id==user_id,CoinRedemption.idempotency_key==key))
    if existing:
        if existing.offer_id!=offer_id or existing.coins_cost!=expected_cost:
            raise HTTPException(409,'This request reference was already used for a different reward or price.')
        return existing
    offer=next((item for item in catalogue() if item['id']==offer_id),None)
    if not offer:
        raise HTTPException(404,'Reward not found.')
    if not offer['available']:
        raise HTTPException(409,'Demo redemptions are temporarily paused.')
    if offer['coins_cost']!=expected_cost:
        raise HTTPException(409,'The coin price has changed. Refresh the rewards and confirm the new price.')
    if await balance(db,user_id)<offer['coins_cost']:
        raise HTTPException(409,'You do not have enough demo coins for this reward.')
    record=CoinRedemption(id=uid(),user_id=user_id,offer_id=offer_id,idempotency_key=key,
                          coins_cost=offer['coins_cost'],snapshot=offer,state='issued',is_demo=True,code='DEMO-'+uid()[:16].upper())
    db.add(record)
    await db.flush()
    return record


async def use_demo(db,user_id,redemption_id):
    record=await db.scalar(select(CoinRedemption).where(CoinRedemption.user_id==user_id,CoinRedemption.id==redemption_id,CoinRedemption.is_demo.is_(True)))
    if not record:
        raise HTTPException(404,'Demo reward not found.')
    if record.state=='redeemed':
        return record
    if record.state!='issued':
        raise HTTPException(409,'This reward is not available.')
    record.state='redeemed'
    record.used_at=utcnow()
    await db.flush()
    return record
