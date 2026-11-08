"""Additive tables: existing users, trips, and itinerary tools remain compatible."""
from datetime import datetime, timezone
import uuid

from sqlalchemy import Boolean, CheckConstraint, Column, Date, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from database import Base


def uid():
    return uuid.uuid4().hex


def utcnow():
    return datetime.now(timezone.utc)


class PassportTrip(Base):
    __tablename__ = "passport_trips"
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    start_date = Column(Date)
    end_date = Column(Date)
    timezone = Column(String(100), nullable=False, default="Asia/Dubai")
    challenges_enabled = Column(Boolean, nullable=False, default=False)
    is_demo = Column(Boolean, nullable=False, default=False)
    demo_key = Column(String(50))
    interests = Column(JSON, nullable=False, default=list)
    pace = Column(String(20), nullable=False, default="balanced")
    __table_args__ = (UniqueConstraint("user_id", "demo_key", name="uq_passport_user_demo"),)


class PassportActivity(Base):
    __tablename__ = "passport_activities"
    id = Column(String(32), primary_key=True, default=uid)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True)
    fingerprint = Column(String(64), nullable=False)
    day_number = Column(Integer, nullable=False)
    title = Column(Text, nullable=False)
    location = Column(Text, nullable=False)
    active = Column(Boolean, nullable=False, default=True)


class Challenge(Base):
    __tablename__ = "passport_challenges"
    id = Column(String(32), primary_key=True, default=uid)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True)
    activity_id = Column(String(32), ForeignKey("passport_activities.id", ondelete="CASCADE"), nullable=False)
    template_key = Column(String(80), nullable=False)
    state = Column(String(20), nullable=False, default="available")
    # Reviewed template snapshot; no generated prose can create award rules.
    payload = Column(JSON, nullable=False)
    prerequisite_id = Column(String(32))
    choice = Column(String(80))
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    __table_args__ = (UniqueConstraint("activity_id", "template_key", name="uq_passport_activity_template"),)


class Submission(Base):
    __tablename__ = "passport_submissions"
    id = Column(String(32), primary_key=True, default=uid)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    challenge_id = Column(String(32), ForeignKey("passport_challenges.id", ondelete="CASCADE"), nullable=False, index=True)
    idempotency_key = Column(String(100), nullable=False)
    request_hash = Column(String(64), nullable=False)
    evidence_type = Column(String(20), nullable=False)
    text = Column(Text, nullable=False, default="")
    choice = Column(String(80))
    image_name = Column(String(80))
    image_type = Column(String(30))
    image_storage = Column(JSON)
    status = Column(String(20), nullable=False)
    feedback = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    reviewed_at = Column(DateTime(timezone=True))
    verification = Column(JSON)
    __table_args__ = (UniqueConstraint("user_id", "idempotency_key", name="uq_passport_submission_replay"),)


class Award(Base):
    __tablename__ = "passport_awards"
    id = Column(String(32), primary_key=True, default=uid)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    # Snapshots survive itinerary/trip deletion; source identifiers are retained.
    trip_id = Column(Integer, nullable=False)
    challenge_id = Column(String(32), nullable=False, unique=True)
    submission_id = Column(String(32), nullable=False, unique=True)
    xp = Column(Integer, nullable=False)
    is_demo = Column(Boolean, nullable=False)
    stamp = Column(JSON, nullable=False)
    earned_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)


class PassportBadge(Base):
    __tablename__ = "passport_badges"
    id = Column(String(32), primary_key=True, default=uid)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    badge_key = Column(String(60), nullable=False)
    is_demo = Column(Boolean, nullable=False)
    earned_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    __table_args__ = (UniqueConstraint("user_id", "badge_key", "is_demo", name="uq_passport_badge"),)


class PassportEvent(Base):
    __tablename__ = "passport_events"
    id = Column(String(32), primary_key=True, default=uid)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    trip_id = Column(Integer)
    type = Column(String(50), nullable=False)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    is_demo = Column(Boolean, nullable=False, default=False)
    source_key = Column(String(120), nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)


class Voucher(Base):
    __tablename__ = "passport_vouchers"
    id = Column(String(32), primary_key=True, default=uid)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    offer_id = Column(String(80), nullable=False)
    idempotency_key = Column(String(100), nullable=False)
    code = Column(String(60), nullable=False, unique=True)
    state = Column(String(20), nullable=False, default="issued")
    snapshot = Column(JSON, nullable=False)
    is_demo = Column(Boolean, nullable=False)
    issued_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    redeemed_at = Column(DateTime(timezone=True))
    __table_args__ = (
        UniqueConstraint("user_id", "offer_id", name="uq_passport_offer_claim"),
        UniqueConstraint("user_id", "idempotency_key", name="uq_passport_claim_replay"),
    )


class EvidenceCheck(Base):
    __tablename__ = "passport_evidence_checks"
    submission_id = Column(String(32), ForeignKey("passport_submissions.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    state = Column(String(20), nullable=False, default="queued", index=True)
    image_sha = Column(String(64), nullable=False, index=True)
    image_phash = Column(String(16), nullable=False)
    token = Column(String(32))
    lease_until = Column(DateTime(timezone=True))
    attempts = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)


class EvidenceUse(Base):
    __tablename__ = "passport_evidence_uses"
    image_sha = Column(String(64), primary_key=True)
    submission_id = Column(String(32), nullable=False, unique=True)
    # Receipts survive deleted evidence/trips so reused photographs cannot earn twice.
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)


class EvidencePhotoUse(Base):
    """One receipt per source photograph, including each contact-sheet tile."""
    __tablename__ = 'passport_evidence_photo_uses'
    image_sha = Column(String(64), primary_key=True)
    submission_id = Column(String(32), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)


class EvidenceDeletion(Base):
    """No source FK: cleanup survives trip/submission/account deletion."""
    __tablename__ = 'passport_evidence_deletions'
    id = Column(String(32), primary_key=True, default=uid)
    storage = Column(JSON, nullable=False)
    attempts = Column(Integer, nullable=False, default=0)
    last_error = Column(String(80))
    retry_at = Column(DateTime(timezone=True), nullable=False, default=utcnow, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)


class DailyPromoAssignment(Base):
    """Daily promotional challenge drawn from the promotional wheel."""
    __tablename__ = 'daily_promo_assignments'
    id = Column(String(32), primary_key=True, default=uid)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    dubai_day = Column(String(10), nullable=False, index=True)
    template_id = Column(String(50), nullable=False)
    template_version = Column(String(20), nullable=False, default='1.0')
    kind = Column(String(20), nullable=False)  # 'game' | 'venue'
    selected_slot = Column(Integer, nullable=False)
    wheel_pool = Column(JSON, nullable=False)
    template_snapshot = Column(JSON, nullable=False)
    state = Column(String(20), nullable=False, default='drawn')  # 'drawn','accepted','rejected','in_progress','completed','expired'
    game_session_id = Column(String(32))
    coins_reward = Column(Integer, nullable=False, default=1)
    drawn_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    accepted_at = Column(DateTime(timezone=True))
    rejected_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    __table_args__ = (UniqueConstraint('user_id', 'dubai_day', name='uq_user_daily_promo'),)


class DailyCoinLedger(Base):
    """Single source of truth for Daily Challenge Coins balance."""
    __tablename__ = 'daily_coin_ledger'
    id = Column(String(32), primary_key=True, default=uid)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    assignment_id = Column(String(32), ForeignKey('daily_promo_assignments.id', ondelete='CASCADE'), nullable=False, unique=True)
    amount = Column(Integer, nullable=False, default=1)
    reason = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)


class DailyPromoSubmission(Base):
    """Evidence submission for venue promotional challenges."""
    __tablename__ = 'daily_promo_submissions'
    id = Column(String(32), primary_key=True, default=uid)
    assignment_id = Column(String(32), ForeignKey('daily_promo_assignments.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    idempotency_key = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False, default='pending')  # 'pending','approved','rejected'
    evidence_type = Column(String(20), nullable=False)  # 'photo','reflection'
    text = Column(Text, nullable=False, default='')
    image_name = Column(String(180))
    image_storage = Column(JSON)
    feedback = Column(Text, nullable=False, default='')
    submitted_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    reviewed_at = Column(DateTime(timezone=True))
    __table_args__ = (UniqueConstraint('assignment_id', 'idempotency_key', name='uq_daily_promo_sub_replay'),)


class CoinRedemption(Base):
    """An owner-scoped demo reward. Earned coins and Passport XP are untouched."""
    __tablename__ = 'coin_redemptions'
    id = Column(String(32), primary_key=True, default=uid)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    offer_id = Column(String(80), nullable=False)
    idempotency_key = Column(String(100), nullable=False)
    coins_cost = Column(Integer, nullable=False)
    state = Column(String(20), nullable=False, default='issued')
    snapshot = Column(JSON, nullable=False)
    code = Column(String(60), nullable=False, unique=True)
    is_demo = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    used_at = Column(DateTime(timezone=True))
    __table_args__ = (UniqueConstraint('user_id', 'idempotency_key', name='uq_coin_redemption_replay'),
                      CheckConstraint('coins_cost > 0', name='ck_coin_redemption_positive'),
                      CheckConstraint("state IN ('issued','redeemed')", name='ck_coin_redemption_state'))
