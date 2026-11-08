"""Validated, owner-saved trip choices and deterministic research eligibility."""
from datetime import date,datetime,timezone
import json
from pathlib import Path
from typing import Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from services.discovery import IDENTITY

from domain.attractions import BY_ID
KNOWN_PLACES=set(json.loads((Path(__file__).with_name('explore_ids.json')).read_text()))|set(BY_ID)
Requirement=Literal['unknown','needed','already_arranged','not_needed']

SUPPORT_NEEDS={'step_free','wheelchair_room','short_walks','frequent_rests','low_sensory','captions','screen_reader'}


class TravellerSupport(BaseModel):
    model_config=ConfigDict(extra='forbid')
    traveller: int = Field(ge=1,le=50,strict=True)
    needs: list[Literal['step_free','wheelchair_room','short_walks','frequent_rests','low_sensory','captions','screen_reader']] = Field(default_factory=list,max_length=7)
    essential: list[Literal['step_free','wheelchair_room','short_walks','frequent_rests','low_sensory','captions','screen_reader']] = Field(default_factory=list,max_length=7)
    max_walk_m: int | None = Field(default=None,ge=10,le=20000,strict=True)
    rest_every_minutes: int | None = Field(default=None,ge=10,le=240,strict=True)
    rest_minutes: int | None = Field(default=None,ge=5,le=120,strict=True)

    @model_validator(mode='after')
    def essential_are_needs(self):
        if not set(self.essential)<=set(self.needs):raise ValueError('Essential support must be selected as a need.')
        self.needs=list(dict.fromkeys(self.needs))
        self.essential=list(dict.fromkeys(self.essential))
        return self


class Selection(BaseModel):
    model_config=ConfigDict(extra='forbid')
    id: str = Field(min_length=1,max_length=220)
    priority: Literal['must_visit','optional']='must_visit'

    @field_validator('id')
    @classmethod
    def known_identity(cls,value):
        if value not in KNOWN_PLACES and not IDENTITY.fullmatch(value):
            raise ValueError('Choose a registered place or provider place reference.')
        return value


class BriefDetails(BaseModel):
    model_config=ConfigDict(extra='forbid')
    start_date: date | None=None
    end_date: date | None=None
    origin: str = Field(default='',max_length=160)
    travellers: int = Field(default=1,ge=1,le=50)
    party_type: str = Field(default='Solo',max_length=60)
    budget_tier: str = Field(default='Standard',max_length=60)
    preferred_pace: str = Field(default='Balanced',max_length=60)
    interests: list[str] = Field(default_factory=list,max_length=24)
    accessibility_needs: list[str] = Field(default_factory=list,max_length=24)
    traveller_support: list[TravellerSupport] = Field(default_factory=list,max_length=50)
    dietary_restrictions: list[str] = Field(default_factory=list,max_length=24)
    flight_requirement: Requirement='unknown'
    stay_requirement: Requirement='unknown'
    flight_selection: Literal['user','masar']='user'
    stay_selection: Literal['user','masar']='user'
    challenges_enabled: bool=True
    custom_notes: str = Field(default='',max_length=2000)

    @field_validator('start_date','end_date',mode='before')
    @classmethod
    def empty_date(cls,value):
        return None if value=='' else value

    @field_validator('interests','accessibility_needs','dietary_restrictions')
    @classmethod
    def bounded_preferences(cls,values):
        if any(len(value)>100 for value in values):raise ValueError('Preference text is too long.')
        return list(dict.fromkeys(values))

    @model_validator(mode='after')
    def ordered_dates(self):
        if self.end_date and (not self.start_date or self.end_date<self.start_date):
            raise ValueError('Choose valid arrival and departure dates.')
        numbers=[item.traveller for item in self.traveller_support]
        if len(numbers)!=len(set(numbers)) or any(number>self.travellers for number in numbers):
            raise ValueError('Assign support needs to each traveller only once.')
        return self


class PlanningDraft(BaseModel):
    model_config=ConfigDict(extra='forbid')
    version: Literal[1]=1
    id: UUID | None=None
    selections: list[Selection] = Field(default_factory=list,max_length=30)
    brief: BriefDetails = Field(default_factory=BriefDetails)

    @model_validator(mode='after')
    def unique_places(self):
        ids=[p.id for p in self.selections]
        if len(set(ids))!=len(ids):raise ValueError('A place may only appear once in your shortlist.')
        return self


class SaveBrief(BaseModel):
    model_config=ConfigDict(extra='forbid')
    expected_revision: int = Field(ge=0)
    draft: PlanningDraft


def research_policy(draft, *, today=None):
    draft=PlanningDraft.model_validate(draft)
    details=draft.brief
    missing=[]
    today=today or datetime.now(timezone.utc).date()
    if details.start_date and details.start_date<today:missing.append({'field':'start_date','message':'Arrival is in the past. Choose today or a future date before searching for flights or stays.'})
    if not details.start_date:missing.append({'field':'start_date','message':'Choose your arrival date.'})
    if not details.end_date:missing.append({'field':'end_date','message':'Choose your departure date.'})
    if details.stay_requirement=='needed' and details.start_date and details.end_date and details.start_date==details.end_date:missing.append({'field':'end_date','message':'Choose at least one overnight stay when requesting accommodation.'})
    if details.flight_requirement=='unknown':missing.append({'field':'flight_requirement','message':'Do you need MASAR to find flights, are they already arranged, or are they not needed?'})
    if details.stay_requirement=='unknown':missing.append({'field':'stay_requirement','message':'Do you need MASAR to find accommodation, is it already arranged, or is it not needed?'})
    if details.flight_requirement=='needed' and not details.origin.strip():missing.append({'field':'origin','message':'Which city or airport will you travel from?'})
    eligible=['event_agent','logistics_agent']
    if details.stay_requirement=='needed':eligible.append('accommodation_agent')
    if details.flight_requirement=='needed':eligible.append('flight_agent')
    return {'ready':not missing,'missing':missing,'workers':eligible if not missing else [],
            'excluded_workers':[w for w in ['flight_agent','accommodation_agent'] if w not in eligible],
            'mode':'recommendations_only'}


def structured_routing(state):
    """No model can decide to search flights/hotels contrary to an explicit brief."""
    draft=state.get('trip_brief')
    if not draft:return None
    from langchain_core.messages import AIMessage
    policy=research_policy(draft)
    if not policy['ready']:
        question='Before I research your trip, '+ ' '.join(item['message'] for item in policy['missing'])
        return {'messages':[AIMessage(content=question)],'next_worker':'NEED_USER_INPUT','user_input_needed':True,'itinerary_complete':False,'status_updates':['A few travel details need your choice first.']}
    if state.get('trip_planner_result'):
        saved=state.get('saved_trip_id')
        return {'messages':[AIMessage(content=state['trip_planner_result'])],'next_worker':'DONE','user_input_needed':not bool(saved),'itinerary_complete':bool(saved)}
    from domain.accessibility import support_instructions
    instructions='Use this validated Trip Brief: '+json.dumps(draft,ensure_ascii=False)+'. Research recommendations only. Never prebook, book, pay or send email. Unknown opening hours, prices or availability must be labelled. Preserve every selected identity and must-visit priority. Do not invent challenge eligibility.'+support_instructions(draft['brief'])
    return {'next_worker':'parallel_dispatch','parallel_workers':(['event_agent','logistics_agent'] if state.get('planning_context') else policy['workers']),'feedback_on_work':instructions,
            'user_input_needed':False,'itinerary_complete':False,'status_updates':['Researching the services your trip actually needs.']}


def saved_trip_identity(content):
    try:
        value=json.loads(content) if isinstance(content,str) else content
        identity=value.get('trip_id') if isinstance(value,dict) and value.get('status')=='success' else None
        return identity if type(identity) is int and identity>0 else None
    except (TypeError,ValueError):
        return None
