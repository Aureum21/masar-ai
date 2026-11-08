import unittest
from domain.mall_challenges import distribute_mall_challenges


def mall(pid='palm-jumeirah-mall', identity='a'):
    return {'id': identity, 'place_id': pid, 'title': 'Mall visit'}


class MallChallengeChecks(unittest.TestCase):
    def test_single_eligible_mall_prefers_conditional_boxing(self):
        original=[{'day_number':1,'activities':[mall()]}]
        result=distribute_mall_challenges(original)
        self.assertEqual(result[0]['activities'][0]['challenge']['key'],'boxing')
        self.assertIn('Confirm',result[0]['activities'][0]['challenge']['availability'])
        self.assertNotIn('challenge',original[0]['activities'][0])

    def test_multiple_mall_days_alternate_and_are_idempotent(self):
        days=[{'day_number':i+1,'activities':[mall(identity=str(i))]} for i in range(4)]
        result=distribute_mall_challenges(days)
        self.assertEqual([d['activities'][0]['challenge']['key'] for d in result],['boxing','bowling','boxing','bowling'])
        self.assertEqual(distribute_mall_challenges(result),result)

    def test_existing_planner_tasks_and_one_per_day_are_preserved(self):
        explicit={'key':'bowling','place_id':'palm-jumeirah-mall'}
        days=[{'day_number':1,'activities':[dict(mall(),challenge=explicit),mall(identity='b')]},{'day_number':2,'activities':[mall(identity='c')]}]
        result=distribute_mall_challenges(days)
        self.assertEqual(result[0]['activities'][0]['challenge'],explicit)
        self.assertNotIn('challenge',result[0]['activities'][1])
        self.assertEqual(result[1]['activities'][0]['challenge']['key'],'boxing')

    def test_bowling_only_venue_never_gets_boxing(self):
        result=distribute_mall_challenges([{'day_number':1,'activities':[mall('city-centre-mirdif')]}])
        self.assertEqual(result[0]['activities'][0]['challenge']['key'],'bowling')
        self.assertNotIn('challenge',distribute_mall_challenges([{'activities':[mall('unknown-mall')]}])[0]['activities'][0])

    def test_disabled_and_other_challenges_are_respected(self):
        days=[{'activities':[mall()]}]
        self.assertEqual(distribute_mall_challenges(days,False),days)
        days[0]['activities'].append({'id':'b','challenge':{'key':'heritage-detective'}})
        self.assertNotIn('challenge',distribute_mall_challenges(days)[0]['activities'][0])

    def test_protected_existing_task_wins_over_new_defaults(self):
        saved={'key':'bowling','place_id':'palm-jumeirah-mall'}
        result=distribute_mall_challenges([{'day_number':1,'activities':[mall()]}],locked={'a':saved})
        self.assertEqual(result[0]['activities'][0]['challenge'],saved)


if __name__=='__main__':unittest.main()
