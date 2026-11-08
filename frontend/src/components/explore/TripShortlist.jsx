'use client';

import {Localized,LocalizedText} from '@/i18n/Localized';



import Link from 'next/link';

import Image from 'next/image';

import {useState} from 'react';

import {availablePlaceImage,placeImageSources} from '@/lib/placeImages';

import {ArrowRight,MapPin,X,Star,Clock} from 'lucide-react';

import {EXPLORE_PLACES} from '@/data/exploreData';



function ShortlistPhoto({place}) {

  const [failed,setFailed]=useState([]);

  const src=availablePlaceImage(place,failed);

  return src ? (

    <Image

      unoptimized

      src={src}

      alt={place?.title || ''}

      width={68}

      height={74}

      loading="lazy"

      className="shortlist-photo-img"

      onError={()=>setFailed(previous=>[...previous,src])}

    />

  ) : (

    <span className="shortlist-photo-fallback" aria-hidden="true">

      <MapPin size={22}/>

    </span>

  );

}



export default function TripShortlist({

  selections,

  onRemove,

  onPriority,

  compact = false,

  places = EXPLORE_PLACES,

  resolving = false,

  error = '',

  onRetry

}) {

  if (!selections.length) {

    return (

      <div className="journey-empty">

        <MapPin size={32}/>

        <h3><LocalizedText message={"Make room for a little wonder."} /></h3>

        <p><LocalizedText message={"Add the places that catch your eye. MASAR can help connect the dots."} /></p>

        <Link href="/explore" className="journey-text-link">

          <LocalizedText message={"Explore places "} /><ArrowRight size={15}/>

        </Link>

      </div>

    );

  }



  return (

    <>

      {error && (

        <p className="journey-alert" role="status">

          <LocalizedText>{error}</LocalizedText>{' '}

          {onRetry && (

            <button type="button" className="journey-text-link" onClick={onRetry}>

              <LocalizedText message={"Try again"} />

            </button>

          )}

        </p>

      )}

      <ul className={`trip-shortlist ${compact ? 'compact' : ''}`}>

        {selections.map(item => {

          const place = places.find(p => p.id === item.id);

          const isMust = item.priority === 'must_visit';



          return (

            <li key={item.id} className="shortlist-card">

              <ShortlistPhoto key={JSON.stringify(placeImageSources(place))} place={place}/>



              <div className="shortlist-place-info">

                <strong>

                  <LocalizedText>{place?.title || (resolving ? 'Loading saved place…' : 'Saved place needs checking')}</LocalizedText>

                </strong>

                <span>

                  <LocalizedText>{place?.neighborhood || (resolving ? 'Refreshing visiting details…' : error || 'Try refreshing or remove this place to continue')}</LocalizedText>

                </span>



                {place?.provider && (

                  <a

                    className={place.provider === 'google' ? 'google-maps-credit' : 'discovery-source'}

                    href={place.sourceUrl}

                    target="_blank"

                    rel="noopener noreferrer"

                    translate="no"

                  >

                    {place.sourceLabel}

                  </a>

                )}



                {place?.attribution?.map((credit, index) => (

                  <small className="discovery-third-party shortlist-attribution" key={index}>

                    {credit.url ? (

                      <a href={credit.url} target="_blank" rel="noopener noreferrer">

                        <LocalizedText>{credit.label}</LocalizedText>

                      </a>

                    ) : (

                      credit.label

                    )}

                  </small>

                ))}



                <div className="shortlist-priority-toggle">

                  <button

                    type="button"

                    role="switch"

                    aria-checked={isMust}

                    className={`shortlist-priority-pill ${isMust ? 'is-must' : 'is-optional'}`}

                    onClick={() => onPriority(item.id, isMust ? 'optional' : 'must_visit')}

                    title={`Click to mark as ${isMust ? 'If time allows' : 'Must visit'}`}

                  >

                    {isMust ? (

                      <Star size={11} fill="#FBBF24" color="#FBBF24" />

                    ) : (

                      <Clock size={11} color="#94A3B8" />

                    )}

                    <span><LocalizedText>{isMust ? 'Must visit' : 'If time allows'}</LocalizedText></span>

                  </button>



                  <select

                    className="sr-only"

                    value={item.priority}

                    onChange={e => onPriority(item.id, e.target.value)}

                    aria-label={`Priority for ${place?.title || item.id}`}

                  >

                    <option value="must_visit">Must visit</option>

                    <option value="optional">If time allows</option>

                  </select>

                </div>

              </div>



              <Localized element={"button"} attributes={["aria-label"]}

                type="button"

                className="shortlist-remove-btn"

                onClick={() => onRemove(item.id)}

                aria-label={`Remove ${place?.title || item.id}`}

                title="Remove from shortlist"

              >

                <X size={15}/>

              </Localized>

            </li>

          );

        })}

      </ul>

    </>

  );

}
