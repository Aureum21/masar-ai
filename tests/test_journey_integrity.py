import unittest
from datetime import datetime
from types import SimpleNamespace
from zoneinfo import ZoneInfo
from passport.notifications import due_reminders
from domain.trip_edits import validate_edit
from fastapi import HTTPException

class JourneyIntegrity(unittest.TestCase):
    def trip(self,status='active',start='2026-11-01'):
        return SimpleNamespace(id=1,itinerary_data={'status':status,'start_date':start,'days':[{'day_number':1,'activities':[{'id':'a','title':'Museum of the Future','time':'10:00'}]}]})
    def test_no_future_or_draft_reminders(self):
        now=datetime(2026,10,26,15,tzinfo=ZoneInfo('Asia/Dubai'))
        self.assertEqual(due_reminders(self.trip(),now),[])
        self.assertEqual(due_reminders(self.trip('draft','2026-10-26'),now),[])
    def test_reminders_appear_when_due_only(self):
        early=datetime(2026,11,1,6,tzinfo=ZoneInfo('Asia/Dubai'))
        self.assertEqual(due_reminders(self.trip(),early),[])
        morning=early.replace(hour=8)
        self.assertEqual(len(due_reminders(self.trip(),morning)),1)
        self.assertEqual(len(due_reminders(self.trip(),morning.replace(hour=9,minute=45))),2)
    def test_booked_stop_and_event_cannot_move(self):
        previous={'days':[{'day_number':1,'date':'2026-11-01','activities':[{'id':'a','title':'Fixed stop','booking_ref':'confirmed-reference'}]}]}
        with self.assertRaises(HTTPException):validate_edit(previous,{'days':[{'day_number':2,'date':'2026-11-02','activities':previous['days'][0]['activities']}]})
        with self.assertRaises(HTTPException):validate_edit({'days':[]},{'days':[{'day_number':1,'date':'2026-11-01','activities':[{'id':'a','event_date':'2026-11-02'}]}]})
    def test_overlapping_times_rejected(self):
        with self.assertRaises(HTTPException):validate_edit({'days':[]},{'days':[{'activities':[{'id':'a','start_time':'10:00','end_time':'11:00'},{'id':'b','start_time':'10:30','end_time':'11:30'}]}]})

    def test_next_day_early_activity_reminder_crosses_midnight(self):
        trip=self.trip()
        trip.itinerary_data['days'][0]['activities'][0]['time']='00:15'
        now=datetime(2026,10,31,23,50,tzinfo=ZoneInfo('Asia/Dubai'))
        notices=due_reminders(trip,now)
        self.assertEqual(len(notices),1)
        self.assertEqual(notices[0]['scheduledFor'],'2026-10-31T23:45:00+04:00')
