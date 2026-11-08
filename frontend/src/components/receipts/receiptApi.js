'use client';
import {apiRequest,apiUrl,errorMessage} from '@/lib/api';
export const INTRO_VERSION='receipt-private-v3';
export const ACTIVE_STATES=new Set(['uploading','queued','running']);
export const EDIT_FIELDS=['merchant_name','purchase_date','currency','total_amount','vat_amount','category','is_service','has_planet_tag'];
export const request=(token,path='',options={})=>apiRequest('/api/v1/receipts'+path,{token,...options});
export const jsonBody=(body)=>({headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
export async function privateImage(token,receipt,signal){
  if(receipt.is_demo&&receipt.image_url?.startsWith('/receipt-samples/'))return {url:receipt.image_url,release:()=>{}};
  if(!/^[a-f0-9]{32}$/.test(receipt.id))throw new Error('Invalid receipt image reference.');
  const response=await fetch(apiUrl(`/api/v1/receipts/${receipt.id}/image`),{headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal});
  if(!response.ok)throw new Error(errorMessage(await response.json().catch(()=>null),'Original receipt unavailable.'));
  const blob=await response.blob();const url=URL.createObjectURL(blob);
  return {url,blob,release:()=>URL.revokeObjectURL(url)};
}
