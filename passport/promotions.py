"""Daily promotional challenge wheel catalogue, persistence, and coin ledger.

One spin per user per Dubai calendar day.
Daily Challenge Coins are kept strictly separate from Passport XP, stamps, and trip challenges.
"""
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo
import secrets
from typing import Any, Dict, List, Optional
from sqlalchemy import select, func
from .models import DailyPromoAssignment, DailyCoinLedger, DailyPromoSubmission, uid, utcnow

DUBAI_TZ = ZoneInfo("Asia/Dubai")

def aware(value: Optional[datetime]) -> Optional[datetime]:
    if not value:
        return None
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


PROMOTIONAL_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "game:sikka-run": {
        "id": "game:sikka-run",
        "version": "1.0",
        "kind": "game",
        "game_id": "sikka-run",
        "title": "Secret Sikka Run",
        "short_label": "Sikka Run",
        "subtitle": "Al Fahidi Arcade Runner",
        "icon": "🏃",
        "color1": "#B45309",
        "color2": "#78350F",
        "accent": "#F0B95F",
        "emirate": "Dubai",
        "reward_coins": 1,
        "difficulty": "Arcade Runner",
        "objective": "Complete a run through the historic sikkas of Al Fahidi and deliver a parcel or score at least 150 points.",
        "min_score": 150,
        "require_delivery": False,
    },
    "venue:boxing-al-quoz": {
        "id": "venue:boxing-al-quoz",
        "version": "1.0",
        "kind": "venue",
        "place_id": "al-quoz-arts",
        "title": "Al Quoz Boxing Ring",
        "short_label": "Boxing Ring",
        "subtitle": "Al Quoz Athletic District",
        "icon": "🥊",
        "color1": "#991B1B",
        "color2": "#7F1D1D",
        "accent": "#F87171",
        "emirate": "Dubai",
        "reward_coins": 1,
        "animation_key": "boxing",
        "location_name": "Warehouse Four & Al Quoz Boxing District",
        "objective": "Visit the athletic training club in Al Quoz, experience or observe a conditioning session, and capture a photo or attendance reflection.",
        "equivalent_task": {
            "title": "Boxing Mechanics & Ergonomics Reflection",
            "rubric": "Detail the hand-wrap safety protocol and foundational defensive stance covered in training, without physical sparring.",
        },
    },
    "game:landmark-puzzle": {
        "id": "game:landmark-puzzle",
        "version": "1.0",
        "kind": "game",
        "game_id": "landmark-puzzle",
        "title": "Piece by place",
        "short_label": "Landmark Jigsaw",
        "subtitle": "5 UAE Iconic Landmarks",
        "icon": "🧩",
        "color1": "#1E40AF",
        "color2": "#1E3A8A",
        "accent": "#60A5FA",
        "emirate": "Dubai",
        "reward_coins": 1,
        "difficulty": "Puzzle",
        "objective": "Assemble any landmark jigsaw puzzle to reveal UAE architectural heritage lore.",
        "min_score": 50,
    },
    "venue:dubai-bowling": {
        "id": "venue:dubai-bowling",
        "version": "1.0",
        "kind": "venue",
        "place_id": "dubai-bowling-centre",
        "title": "Al Quoz Bowling Challenge",
        "short_label": "Bowling Frame",
        "subtitle": "Dubai Bowling Centre",
        "icon": "🎳",
        "color1": "#047857",
        "color2": "#064E3B",
        "accent": "#34D399",
        "emirate": "Dubai",
        "reward_coins": 1,
        "animation_key": "bowling",
        "location_name": "Dubai Bowling Centre, Al Quoz 1",
        "objective": "Bowl a complete frame at Dubai Bowling Centre and submit a photo of the alley or your scorecard.",
        "equivalent_task": {
            "title": "Lane Physics & Ball Trajectory Study",
            "rubric": "Explain how lane oil patterns and ball core weight distribution affect ball trajectory and pin action.",
        },
    },
    "game:tourist-arcade": {
        "id": "game:tourist-arcade",
        "version": "1.0",
        "kind": "game",
        "game_id": "tourist-arcade",
        "title": "The Lost Compass",
        "short_label": "Lost Compass",
        "subtitle": "Heritage Quarter Expedition",
        "icon": "🧭",
        "color1": "#854D0E",
        "color2": "#713F12",
        "accent": "#FBBF24",
        "emirate": "Dubai",
        "reward_coins": 1,
        "difficulty": "Exploration",
        "objective": "Explore Old Dubai's historic alleys, navigate obstacles, and collect fragments to score at least 100 points.",
        "min_score": 100,
    },
    "venue:sunset-kite-beach": {
        "id": "venue:sunset-kite-beach",
        "version": "1.0",
        "kind": "venue",
        "place_id": "kite-beach",
        "title": "Kite Beach Sunset Watch",
        "short_label": "Coastal Sunset",
        "subtitle": "Jumeirah Shoreline",
        "icon": "🌅",
        "color1": "#C2410C",
        "color2": "#7C2D12",
        "accent": "#FB923C",
        "emirate": "Dubai",
        "reward_coins": 1,
        "animation_key": "sunset",
        "location_name": "Kite Beach Promenade, Jumeirah 3",
        "objective": "Watch the golden-hour coastal sunset along the Arabian Gulf and capture the horizon skyline.",
        "equivalent_task": {
            "title": "Coastal Microclimate Observation",
            "rubric": "Describe the diurnal sea-breeze transition and temperature gradient observed during Arabian Gulf dusk.",
        },
    },
    "game:ball-roll": {
        "id": "game:ball-roll",
        "version": "1.0",
        "kind": "game",
        "game_id": "ball-roll",
        "title": "Golden Roll",
        "short_label": "Golden Roll",
        "subtitle": "3D Physics Heritage Trail",
        "icon": "🪙",
        "color1": "#065F46",
        "color2": "#064E3B",
        "accent": "#10B981",
        "emirate": "Dubai",
        "reward_coins": 1,
        "difficulty": "3D Physics",
        "objective": "Roll through ancient heritage alleys, jump obstacles, and collect lore tokens to score at least 80 points.",
        "min_score": 80,
    },
    "venue:al-fahidi-heritage": {
        "id": "venue:al-fahidi-heritage",
        "version": "1.0",
        "kind": "venue",
        "place_id": "old-dubai-heritage",
        "title": "Al Fahidi Wind Towers",
        "short_label": "Wind Towers",
        "subtitle": "Historic Barjeel District",
        "icon": "🏰",
        "color1": "#4338CA",
        "color2": "#312E81",
        "accent": "#818CF8",
        "emirate": "Dubai",
        "reward_coins": 1,
        "animation_key": "heritage",
        "location_name": "Al Fahidi Historical Neighbourhood, Bur Dubai",
        "objective": "Walk the historic barjeel wind towers and capture a photo of the traditional coral-stone architecture.",
        "equivalent_task": {
            "title": "Traditional Passive Cooling Architecture Study",
            "rubric": "Detail the thermodynamic mechanism of four-sided barjeel towers in capturing coastal drafts and cooling courtyard houses.",
        },
    },
}

# Ordered templates for new draws. Existing assignments keep their frozen pool.
WHEEL_SECTOR_KEYS: List[str] = [
    "game:sikka-run",
    "venue:boxing-al-quoz",
    "game:landmark-puzzle",
    "venue:dubai-bowling",
    "venue:sunset-kite-beach",
    "game:ball-roll",
    "venue:al-fahidi-heritage",
]


def current_dubai_datetime(now: Optional[datetime] = None) -> datetime:
    base = now or datetime.now(timezone.utc)
    return base.astimezone(DUBAI_TZ)


def current_dubai_day(now: Optional[datetime] = None) -> str:
    return current_dubai_datetime(now).strftime("%Y-%m-%d")


def dubai_midnight_expiry(now: Optional[datetime] = None) -> datetime:
    """Returns the upcoming midnight in Dubai time converted to aware UTC."""
    dubai_now = current_dubai_datetime(now)
    tomorrow_date = dubai_now.date() + timedelta(days=1)
    midnight_dubai = datetime.combine(tomorrow_date, time.min, tzinfo=DUBAI_TZ)
    return midnight_dubai.astimezone(timezone.utc)


def remaining_seconds_today(now: Optional[datetime] = None) -> int:
    now_utc = aware(now or datetime.now(timezone.utc))
    expiry = dubai_midnight_expiry(now)
    diff = int((expiry - now_utc).total_seconds())
    return max(0, diff)


def build_wheel_pool(emirate: str = "Dubai") -> List[Dict[str, Any]]:
    pool = []
    for idx, key in enumerate(WHEEL_SECTOR_KEYS):
        tmpl = PROMOTIONAL_TEMPLATES[key]
        pool.append({
            "slot": idx,
            "template_id": tmpl["id"],
            "title": tmpl["title"],
            "short_label": tmpl["short_label"],
            "subtitle": tmpl["subtitle"],
            "kind": tmpl["kind"],
            "icon": tmpl["icon"],
            "color1": tmpl["color1"],
            "color2": tmpl["color2"],
            "accent": tmpl["accent"],
            "emirate": tmpl["emirate"],
            "reward_coins": tmpl["reward_coins"],
            "objective": tmpl["objective"],
            "animation_key": tmpl.get("animation_key"),
            "location_name": tmpl.get("location_name"),
            "place_id": tmpl.get("place_id"),
        })
    return pool


async def get_today_assignment(db, user_id: int, now: Optional[datetime] = None) -> Optional[DailyPromoAssignment]:
    day_str = current_dubai_day(now)
    query = select(DailyPromoAssignment).where(
        DailyPromoAssignment.user_id == user_id,
        DailyPromoAssignment.dubai_day == day_str,
    )
    assignment = await db.scalar(query)
    # Check if expired
    if assignment and assignment.state not in {"completed", "rejected"}:
        now_utc = aware(now or datetime.now(timezone.utc))
        if now_utc >= aware(assignment.expires_at):
            assignment.state = "expired"
            await db.flush()
    return assignment


async def spin_daily_wheel(db, user_id: int, emirate: str = "Dubai", now: Optional[datetime] = None) -> DailyPromoAssignment:
    """Server-side selection. Atomically draws or returns existing daily assignment."""
    existing = await get_today_assignment(db, user_id, now)
    if existing:
        return existing

    pool = build_wheel_pool(emirate)
    winning_slot = secrets.randbelow(len(pool))
    winner = pool[winning_slot]
    template = PROMOTIONAL_TEMPLATES[winner["template_id"]]

    now_utc = aware(now or datetime.now(timezone.utc))
    expires_at = dubai_midnight_expiry(now)

    assignment = DailyPromoAssignment(
        id=uid(),
        user_id=user_id,
        dubai_day=current_dubai_day(now),
        template_id=template["id"],
        template_version=template.get("version", "1.0"),
        kind=template["kind"],
        selected_slot=winning_slot,
        wheel_pool=pool,
        template_snapshot=template,
        state="drawn",
        coins_reward=template.get("reward_coins", 1),
        drawn_at=now_utc,
        expires_at=expires_at,
    )
    db.add(assignment)
    try:
        await db.flush()
    except Exception:
        # Concurrent spin caught by unique constraint (user_id, dubai_day)
        await db.rollback()
        existing = await get_today_assignment(db, user_id, now)
        if existing:
            return existing
        raise

    return assignment


async def accept_daily_assignment(db, assignment: DailyPromoAssignment, now: Optional[datetime] = None) -> DailyPromoAssignment:
    if assignment.state not in {"drawn"}:
        return assignment
    now_utc = aware(now or datetime.now(timezone.utc))
    if now_utc >= aware(assignment.expires_at):
        assignment.state = "expired"
        await db.flush()
        return assignment

    assignment.state = "accepted"
    assignment.accepted_at = now_utc
    await db.flush()
    return assignment


async def reject_daily_assignment(db, assignment: DailyPromoAssignment, now: Optional[datetime] = None) -> DailyPromoAssignment:
    if assignment.state in {"completed", "rejected"}:
        return assignment
    now_utc = aware(now or datetime.now(timezone.utc))
    if now_utc >= aware(assignment.expires_at):
        assignment.state = "expired"
        await db.flush()
        return assignment

    assignment.state = "rejected"
    assignment.rejected_at = now_utc
    await db.flush()
    return assignment


async def create_game_session(db, assignment: DailyPromoAssignment, now: Optional[datetime] = None) -> str:
    now_utc = aware(now or datetime.now(timezone.utc))
    if now_utc >= aware(assignment.expires_at):
        assignment.state = "expired"
        await db.flush()
        raise ValueError("Assignment has expired.")
    if assignment.state == "drawn":
        assignment.state = "in_progress"
        assignment.accepted_at = now_utc
    session_id = uid()
    assignment.game_session_id = session_id
    await db.flush()
    return session_id


async def award_coins_for_assignment(db, assignment: DailyPromoAssignment, reason: str, now: Optional[datetime] = None) -> int:
    """Durable transaction awarding coins once. Returns updated total balance."""
    # Check if already credited
    existing_ledger = await db.scalar(
        select(DailyCoinLedger).where(DailyCoinLedger.assignment_id == assignment.id)
    )
    if existing_ledger:
        return await get_daily_coin_balance(db, assignment.user_id)

    now_utc = aware(now or datetime.now(timezone.utc))
    assignment.state = "completed"
    assignment.completed_at = now_utc

    ledger_entry = DailyCoinLedger(
        id=uid(),
        user_id=assignment.user_id,
        assignment_id=assignment.id,
        amount=assignment.coins_reward,
        reason=reason,
        created_at=now_utc,
    )
    db.add(ledger_entry)
    await db.flush()
    return await get_daily_coin_balance(db, assignment.user_id)


async def get_daily_coin_balance(db, user_id: int) -> int:
    query = select(func.coalesce(func.sum(DailyCoinLedger.amount), 0)).where(DailyCoinLedger.user_id == user_id)
    total = await db.scalar(query)
    return int(total or 0)


async def get_daily_promo_history(db, user_id: int, limit: int = 30) -> List[Dict[str, Any]]:
    query = (
        select(DailyPromoAssignment)
        .where(DailyPromoAssignment.user_id == user_id)
        .order_by(DailyPromoAssignment.drawn_at.desc())
        .limit(limit)
    )
    records = list((await db.scalars(query)).all())
    # Fetch ledger credits
    assignment_ids = [r.id for r in records]
    ledger_items = {}
    if assignment_ids:
        l_query = select(DailyCoinLedger).where(DailyCoinLedger.assignment_id.in_(assignment_ids))
        for row in (await db.scalars(l_query)).all():
            ledger_items[row.assignment_id] = row.amount

    output = []
    for r in records:
        state = r.state
        if state in {'drawn', 'accepted', 'in_progress'} and aware(r.expires_at) <= utcnow():
            state = 'expired'
        output.append({
            "id": r.id,
            "dubai_day": r.dubai_day,
            "kind": r.kind,
            "state": state,
            "title": r.template_snapshot.get("title", "Daily Challenge"),
            "short_label": r.template_snapshot.get("short_label", "Challenge"),
            "icon": r.template_snapshot.get("icon", "🎡"),
            "coins_reward": r.coins_reward,
            "coins_earned": ledger_items.get(r.id, 0 if r.state != "completed" else r.coins_reward),
            "drawn_at": r.drawn_at.isoformat() if r.drawn_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
            "rejected_at": r.rejected_at.isoformat() if r.rejected_at else None,
        })
    return output


def assignment_view(assignment: Optional[DailyPromoAssignment], pool: Optional[List[Dict[str, Any]]] = None) -> Optional[Dict[str, Any]]:
    if not assignment:
        return None
    snapshot = assignment.template_snapshot or {}
    return {
        "id": assignment.id,
        "dubai_day": assignment.dubai_day,
        "kind": assignment.kind,
        "state": assignment.state,
        "selected_slot": assignment.selected_slot,
        "template_id": assignment.template_id,
        "title": snapshot.get("title"),
        "short_label": snapshot.get("short_label"),
        "subtitle": snapshot.get("subtitle"),
        "icon": snapshot.get("icon"),
        "color1": snapshot.get("color1"),
        "color2": snapshot.get("color2"),
        "accent": snapshot.get("accent"),
        "emirate": snapshot.get("emirate"),
        "reward_coins": assignment.coins_reward,
        "objective": snapshot.get("objective"),
        "game_id": snapshot.get("game_id"),
        "animation_key": snapshot.get("animation_key"),
        "location_name": snapshot.get("location_name"),
        "place_id": snapshot.get("place_id"),
        "equivalent_task": snapshot.get("equivalent_task"),
        "wheel_pool": assignment.wheel_pool or pool or [],
        "drawn_at": assignment.drawn_at.isoformat() if assignment.drawn_at else None,
        "accepted_at": assignment.accepted_at.isoformat() if assignment.accepted_at else None,
        "rejected_at": assignment.rejected_at.isoformat() if assignment.rejected_at else None,
        "completed_at": assignment.completed_at.isoformat() if assignment.completed_at else None,
        "expires_at": assignment.expires_at.isoformat() if assignment.expires_at else None,
    }
