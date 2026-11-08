import TripDraftView from '@/components/planning/TripDraftView';
export default async function Page({params}) {
  const {tripId}=await params;
  return <TripDraftView id={tripId}/>;
}
