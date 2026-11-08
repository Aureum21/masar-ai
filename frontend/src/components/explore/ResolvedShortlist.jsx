'use client';
import TripShortlist from './TripShortlist';
import {useResolvedPlaces} from '@/hooks/useResolvedPlaces';
export default function ResolvedShortlist(props) {
  const result=useResolvedPlaces(props.selections);
  return <TripShortlist {...props} places={result.places} resolving={result.loading} error={result.error} onRetry={result.retry}/>;
}
