"""Versioned, dated itinerary contract. Metadata stays in existing JSON storage.

No date is inferred from created_at. Legacy reads do not mutate saved records.
"""
import json
from copy import deepcopy
from datetime import date as CalendarDate, timedelta
from typing import Literal
from uuid import NAMESPACE_URL, uuid5
from pydantic import BaseModel, ConfigDict, Field, model_validator
from domain.places import resolve_place


class Activity(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str
    title: str = "Activity"
    place_id: str | None = None
    product_id: str | None = None


class TripDay(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str
    day_number: int = Field(ge=1)
    date: CalendarDate | None = None
    theme: str = ""
    accessibility_notes: list[str] = Field(default_factory=list,max_length=60)
    activities: list[Activity] = Field(default_factory=list)


class Itinerary(BaseModel):
    model_config = ConfigDict(extra="allow")
    schema_version: Literal[2] = 2
    start_date: CalendarDate | None = None
    end_date: CalendarDate | None = None
    timezone: Literal["Asia/Dubai"] = "Asia/Dubai"
    status: Literal["draft", "active", "completed", "archived", "cancelled"] = "draft"
    revision: int = Field(default=1, ge=1)
    days: list[TripDay] = Field(default_factory=list)

    @model_validator(mode="after")
    def consistent(self):
        if self.end_date and not self.start_date:
            raise ValueError("start_date is required with end_date")
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date must not precede start_date")
        if self.status == "active" and not self.start_date:
            raise ValueError("Undated trips cannot be activated")
        numbers = [d.day_number for d in self.days]
        ids = [d.id for d in self.days] + [a.id for d in self.days for a in d.activities]
        if len(set(numbers)) != len(numbers) or len(set(ids)) != len(ids):
            raise ValueError("Day numbers and itinerary IDs must be unique")
        for day in self.days:
            expected = self.start_date + timedelta(days=day.day_number - 1) if self.start_date else None
            if self.end_date and expected and expected > self.end_date:
                raise ValueError("An itinerary day falls after end_date")
            if day.date and expected and day.date != expected:
                raise ValueError("Day date does not match trip start_date")
            day.date = expected  # Undated legacy plans remain unscheduled.
        return self


class TripBrief(BaseModel):
    model_config = ConfigDict(extra="forbid")
    start_date: CalendarDate | None = None
    end_date: CalendarDate | None = None
    origin: str | None = None
    travellers: int = Field(default=1, ge=1, le=50)
    flight_requirement: Literal["needed", "already_arranged", "not_needed", "unknown"] = "unknown"
    stay_requirement: Literal["needed", "already_arranged", "not_needed", "unknown"] = "unknown"
    must_visit: list[str] = Field(default_factory=list)
    optional_places: list[str] = Field(default_factory=list)
    preferences: dict = Field(default_factory=dict)
    challenges_enabled: bool = True

    @model_validator(mode="after")
    def dates(self):
        if self.end_date and (not self.start_date or self.end_date < self.start_date):
            raise ValueError("Provide a valid start_date/end_date range")
        return self


def normalise_itinerary(raw, *, trip_id="new", previous=None, locked_challenges=None, **metadata):
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except ValueError:
            raw = {"days": [{"theme": "Saved itinerary", "description": raw, "activities": []}]}
    result = deepcopy(raw if isinstance(raw, dict) else {"days": raw if isinstance(raw, list) else []})
    if "days" not in result:
        result["days"] = [dict(value, theme=value.get("theme", key)) for key, value in result.items()
                          if isinstance(value, dict) and "activities" in value]
    if previous:
        for key in ["start_date", "end_date", "timezone", "status", "revision", "traveller_support", "support_confirmations"]:
            if key not in result and key in previous:
                result[key] = previous[key]
    result.update({k: v for k, v in metadata.items() if v is not None})
    old_ids = {}
    for day in (previous or {}).get("days", []):
        for item in day.get("activities", []):
            key = (item.get("place_id"), item.get("title", item.get("name")))
            old_ids.setdefault(key, []).append(item.get("id"))
    days = []
    for index, original in enumerate(result.get("days", [])):
        if not isinstance(original, dict):
            continue
        day = deepcopy(original)
        old_day=next((d for d in (previous or {}).get('days',[]) if d.get('id')==day.get('id') or d.get('day_number')==day.get('day_number')),None)
        if old_day and 'accessibility_notes' not in day:day['accessibility_notes']=deepcopy(old_day.get('accessibility_notes',[]))
        if day.get("day_number") is None:
            day["day_number"] = index + 1
        if day.get("theme") is None:
            day["theme"] = ""
        if not day.get("id"):
            day["id"] = str(uuid5(NAMESPACE_URL, f"masar:{trip_id}:day:{day['day_number']}"))
        activities = []
        for j, original_item in enumerate(day.get("activities") or []):
            item = deepcopy(original_item if isinstance(original_item, dict) else {"title": str(original_item)})
            item["title"] = item.get("title") or item.get("name") or "Activity"
            found = resolve_place(item.get("place_id"))
            if found:
                item.update({k: v for k, v in found.items() if v is not None})
            key = (item.get("place_id"), item["title"])
            candidates = old_ids.get(key, [])
            prior = candidates.pop(0) if candidates else None
            if not item.get("id"):
                item["id"] = prior or str(uuid5(NAMESPACE_URL, f"masar:{trip_id}:{day['id']}:{j}:{item['title']}"))
            activities.append(item)
        day["activities"] = activities
        days.append(day)
    from domain.mall_challenges import distribute_mall_challenges
    days = distribute_mall_challenges(days, enabled=result.get("challenges_enabled", True), locked=locked_challenges)
    result.update(schema_version=2, days=days)
    return Itinerary.model_validate(result).model_dump(mode="json")
