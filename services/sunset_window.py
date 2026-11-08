"""Approximate NOAA solar-equation sunset window; not a weather/access guarantee."""
from datetime import date
from math import sin,cos,acos,pi,degrees,radians
def sunset_window(day,lat,lng):
    d=date.fromisoformat(day);n=d.timetuple().tm_yday
    gamma=2*pi/365*(n-1+6/24)
    equation=229.18*(0.000075+0.001868*cos(gamma)-0.032077*sin(gamma)-0.014615*cos(2*gamma)-0.040849*sin(2*gamma))
    decl=0.006918-0.399912*cos(gamma)+0.070257*sin(gamma)-0.006758*cos(2*gamma)+0.000907*sin(2*gamma)-0.002697*cos(3*gamma)+0.00148*sin(3*gamma)
    angle=degrees(acos(max(-1,min(1,(cos(radians(90.833))/(cos(radians(lat))*cos(decl))-sin(radians(lat))/cos(radians(lat))*sin(decl)/cos(decl))))))
    sunset=round(720-4*lng-equation+4*angle+240)
    def clock(minutes):return f'{(minutes//60)%24:02d}:{minutes%60:02d}'
    return {'date':day,'timezone':'Asia/Dubai','start':clock(sunset-25),'end':clock(sunset+10),'sunset':clock(sunset),'estimated':True,'note':'Approximate solar time. Confirm weather, access and viewpoint; remain on permitted land.'}
