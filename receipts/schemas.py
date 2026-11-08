from datetime import date
from decimal import Decimal
from typing import Literal
from pydantic import BaseModel,Field,ConfigDict,field_validator

Category=Literal['retail','electronics','fashion','hotel','dining','services','mixed','unknown']
class ReceiptFields(BaseModel):
    model_config=ConfigDict(extra='ignore')
    merchant_name:str|None=Field(default=None,max_length=250)
    purchase_date:date|None=None
    currency:str|None=Field(default=None,pattern=r'^[A-Z]{3}$')
    total_amount:Decimal|None=Field(default=None,ge=0,max_digits=12,decimal_places=2)
    vat_amount:Decimal|None=Field(default=None,ge=0,max_digits=12,decimal_places=2)
    category:Category|None=None
    is_service:bool|None=Field(default=None,strict=True)
    has_planet_tag:bool|None=Field(default=None,strict=True)
    trn:str|None=Field(default=None,max_length=50)
    planet_tag_number:str|None=Field(default=None,max_length=100)
    is_refund_candidate:bool|None=None
    candidate_reason:str|None=Field(default=None,max_length=500)

    @field_validator('total_amount','vat_amount',mode='before')
    @classmethod
    def actual_number(cls,value):
        if isinstance(value,bool):raise ValueError('Enter an amount, not a boolean.')
        return value

class ReceiptEdit(ReceiptFields):
    expected_revision:int=Field(ge=1)

class RevisionRequest(BaseModel):
    model_config=ConfigDict(extra='forbid')
    expected_revision:int=Field(ge=1)

class TripLink(RevisionRequest):
    trip_id:int|None=Field(default=None,ge=1)
