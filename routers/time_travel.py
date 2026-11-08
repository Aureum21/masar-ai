"""Authenticated Time Travel browsing; optional recognition never awards XP."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, ConfigDict, model_validator
import auth
from services.time_travel import catalogue, archive, recognize

router=APIRouter(prefix='/api/v1/time-travel',tags=['time-travel'])

class DetectionRequest(BaseModel):
    model_config=ConfigDict(extra='forbid')
    sample_id: str | None=Field(default=None,min_length=1,max_length=80)
    image_base64: str | None=Field(default=None,min_length=1,max_length=7_000_000)

    @model_validator(mode='after')
    def one_input(self):
        if (self.sample_id is None) == (self.image_base64 is None):
            raise ValueError('Choose an archive OR send one image.')
        return self

@router.get('/landmarks')
async def landmarks(user=Depends(auth.get_current_user)):
    return {'landmarks':[{k:v for k,v in archive(key).items() if k!='timeline'} for key in catalogue()]}

@router.get('/archive/{landmark_id}')
async def get_archive(landmark_id: str,user=Depends(auth.get_current_user)):
    return archive(landmark_id)

@router.post('/detect')
async def detect(body:DetectionRequest,user=Depends(auth.get_current_user)):
    if body.sample_id is not None:
        return archive(body.sample_id)
    return await recognize(body.image_base64,user.id)
