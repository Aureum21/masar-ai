"""Demonstration reward spending, replay protection and owner isolation."""
import asyncio
import os
from unittest.mock import patch
import unittest
from tests import test_passport as fixture
from passport import coin_rewards as rewards
from passport.models import DailyPromoAssignment, DailyCoinLedger
from passport.promotions import current_dubai_day, dubai_midnight_expiry


class CoinRewardsAPI(unittest.IsolatedAsyncioTestCase):
    asyncSetUp = fixture.PassportTests.asyncSetUp
    asyncTearDown = fixture.PassportTests.asyncTearDown

    async def redeem(self, key='demo-request-0001', offer='yas-island-demo-ticket', cost=80):
        return await self.client.post(f'/coin-rewards/{offer}/redeem',json={'idempotency_key':key,'expected_coins':cost})

    async def test_demo_wallet_starts_with_200_and_includes_tickets_and_gift_cards(self):
        response=await self.client.get('/coin-rewards')
        self.assertEqual(response.status_code,200,response.text)
        data=response.json()
        self.assertEqual(data['balance'],200)
        self.assertEqual(data['earned_coins'],0)
        self.assertTrue(data['is_demo'])
        self.assertEqual({o['kind'] for o in data['offers']},{'ticket','gift_card'})
        self.assertTrue(all(o['is_demo'] and o['coins_cost']>0 for o in data['offers']))

    async def test_redemption_is_persisted_and_never_spends_earned_coins_or_xp(self):
        async with self.sessions() as db:
            db.add(DailyPromoAssignment(id='earned',user_id=1,dubai_day=current_dubai_day(),template_id='game:sikka-run',kind='game',selected_slot=0,wheel_pool=[],template_snapshot={},state='completed',coins_reward=5,expires_at=dubai_midnight_expiry()))
            await db.flush()
            db.add(DailyCoinLedger(id='credit',user_id=1,assignment_id='earned',amount=5,reason='Test earned coins'))
            await db.commit()
        response=await self.redeem()
        self.assertEqual(response.status_code,200,response.text)
        record=response.json()['redemption']
        self.assertTrue(record['code'].startswith('DEMO-'))
        self.assertEqual(record['state'],'issued')
        self.assertTrue(record['is_demo'])
        self.assertEqual(response.json()['balance'],120)
        reloaded=(await self.client.get('/coin-rewards')).json()
        self.assertEqual(reloaded['redemptions'][0]['id'],record['id'])
        self.assertEqual(reloaded['earned_coins'],5)
        self.assertEqual((await self.client.get('/daily-promotions/coins')).json()['balance'],5)
        self.assertEqual((await self.client.get('/summary')).json()['xp'],0)

    async def test_duplicate_request_is_idempotent_and_conflicting_key_is_rejected(self):
        first=await self.redeem()
        second=await self.redeem()
        self.assertEqual(first.json()['redemption']['id'],second.json()['redemption']['id'])
        self.assertEqual(second.json()['balance'],120)
        conflict=await self.redeem(offer='dubai-mall-gift-card',cost=50)
        self.assertEqual(conflict.status_code,409,conflict.text)
        self.assertEqual((await self.client.get('/coin-rewards')).json()['balance'],120)

    async def test_price_tampering_unknown_reward_and_client_extra_fields_fail(self):
        self.assertEqual((await self.redeem(cost=1)).status_code,409)
        self.assertEqual((await self.redeem(offer='unknown')).status_code,404)
        injected=await self.client.post('/coin-rewards/yas-island-demo-ticket/redeem',json={'idempotency_key':'extra-key-0001','expected_coins':80,'coins_cost':0,'user_id':2})
        self.assertEqual(injected.status_code,422)
        self.assertEqual((await self.client.get('/coin-rewards')).json()['balance'],200)

    async def test_concurrent_spending_cannot_overdraw_wallet(self):
        responses=await asyncio.gather(*(self.redeem(key=f'parallel-request-{i}') for i in range(3)))
        self.assertEqual(sorted(r.status_code for r in responses),[200,200,409])
        data=(await self.client.get('/coin-rewards')).json()
        self.assertEqual(data['balance'],40)
        self.assertEqual(len(data['redemptions']),2)

    async def test_demo_use_is_owner_scoped_idempotent_and_does_not_charge_again(self):
        record=(await self.redeem()).json()['redemption']
        path=f"/coin-redemptions/{record['id']}/demo-use"
        self.assertEqual((await self.client.post(path,headers={'X-Test-User':'2'})).status_code,404)
        for _ in range(2):
            result=await self.client.post(path)
            self.assertEqual(result.status_code,200,result.text)
            self.assertEqual(result.json()['redemption']['state'],'redeemed')
            self.assertEqual(result.json()['balance'],120)
            self.assertIsNotNone(result.json()['redemption']['used_at'])
        other=(await self.client.get('/coin-rewards',headers={'X-Test-User':'2'})).json()
        self.assertEqual(other['balance'],200)
        self.assertEqual(other['redemptions'],[])

    async def test_changed_prices_and_disabled_catalogue_do_not_charge(self):
        with patch.dict(os.environ,{'COIN_REWARD_COSTS':'{"yas-island-demo-ticket":90}'}):
            self.assertEqual((await self.redeem()).status_code,409)
            success=await self.redeem(cost=90)
            self.assertEqual(success.status_code,200,success.text)
        # A network retry survives a subsequent price change using its original key.
        self.assertEqual((await self.redeem(cost=90)).json()['balance'],110)
        with patch.dict(os.environ,{'COIN_REWARDS_ENABLED':'false'}):
            self.assertEqual((await self.redeem(key='disabled-request-0001')).status_code,409)
        with patch.dict(os.environ,{'COIN_REWARD_COSTS':'{"yas-island-demo-ticket":-1}'}):
            self.assertEqual((await self.client.get('/coin-rewards')).status_code,503)

    async def test_mall_gift_card_uses_its_own_server_cost_and_demo_code(self):
        response=await self.redeem(offer='dubai-mall-gift-card',cost=50)
        self.assertEqual(response.status_code,200,response.text)
        data=response.json()
        self.assertEqual(data['balance'],150)
        self.assertEqual(data['redemption']['offer']['kind'],'gift_card')
        self.assertEqual(data['redemption']['offer']['value_label'],'AED 50 sample gift card')
        self.assertTrue(data['redemption']['code'].startswith('DEMO-'))


class CoinRewardMigration(unittest.TestCase):
    def test_migration_creates_and_removes_demo_wallet_table(self):
        import importlib.util
        from pathlib import Path
        import sqlalchemy as sa
        from alembic.migration import MigrationContext
        from alembic.operations import Operations
        path=Path(__file__).resolve().parents[1]/'alembic/versions/20261101_coin_redemptions.py'
        spec=importlib.util.spec_from_file_location('coin_rewards_migration',path)
        module=importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        engine=sa.create_engine('sqlite://')
        with engine.begin() as connection:
            connection.execute(sa.text('CREATE TABLE users (id INTEGER PRIMARY KEY)'))
            with Operations.context(MigrationContext.configure(connection)):
                module.upgrade()
                self.assertIn('coin_redemptions',sa.inspect(connection).get_table_names())
                columns={c['name'] for c in sa.inspect(connection).get_columns('coin_redemptions')}
                self.assertTrue({'user_id','code','is_demo','coins_cost','idempotency_key'}<=columns)
                module.downgrade()
                self.assertNotIn('coin_redemptions',sa.inspect(connection).get_table_names())
        engine.dispose()
