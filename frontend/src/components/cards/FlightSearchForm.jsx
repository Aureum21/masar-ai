import {Localized,LocalizedText} from '@/i18n/Localized';

import React, { useState } from 'react';

import { PlaneTakeoff, PlaneLanding, Users, Search } from 'lucide-react';

import MasarDatePicker from '@/components/ui/MasarDatePicker';

import MasarSelect from '@/components/ui/MasarSelect';



const CABIN_OPTIONS = [

  ['economy', 'Economy'],

  ['premium_economy', 'Premium Economy'],

  ['business', 'Business'],

  ['first', 'First Class']

];



export default function FlightSearchForm({ onSearch, initialOrigin = '', initialDestination = '' }) {

  const [origin, setOrigin] = useState(initialOrigin);

  const [destination, setDestination] = useState(initialDestination);

  const [date, setDate] = useState('');

  const [passengers, setPassengers] = useState(1);

  const [cabin, setCabin] = useState('economy');



  const handleSubmit = (e) => {

    e.preventDefault();

    if (!origin || !destination || !date) return;

    onSearch({ origin, destination, date, passengers, cabin });

  };



  return (

    <div style={{

      background: 'linear-gradient(145deg, var(--color-surface), #0a0b0e)',

      border: '1px solid var(--color-border-hover)',

      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',

      borderRadius: '16px',

      padding: '24px',

      marginTop: '16px',

      maxWidth: '500px',

      color: 'var(--color-text-primary)'

    }}>

      <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent-gold)' }}>

        <PlaneTakeoff size={20} /><LocalizedText message={"Find Your Flight"} /></h3>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>



        <div style={{ display: 'flex', gap: '16px' }}>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>

            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)' }}><LocalizedText message={"From (City or Airport)"} /></label>

            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0 12px', transition: 'border-color 0.2s' }}>

              <PlaneTakeoff size={16} color="var(--color-text-muted)" />

              <Localized element={"input"} attributes={["placeholder"]}

                required

                placeholder="e.g. Rome or LHR"

                value={origin}

                onChange={e => setOrigin(e.target.value)}

                style={{ background: 'transparent', border: 'none', color: '#fff', padding: '10px 8px', width: '100%', outline: 'none', fontSize: '14px' }}

              />

            </div>

          </div>



          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>

            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)' }}><LocalizedText message={"To (City or Airport)"} /></label>

            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0 12px' }}>

              <PlaneLanding size={16} color="var(--color-text-muted)" />

              <Localized element={"input"} attributes={["placeholder"]}

                required

                placeholder="e.g. Dubai or DXB"

                value={destination}

                onChange={e => setDestination(e.target.value)}

                style={{ background: 'transparent', border: 'none', color: '#fff', padding: '10px 8px', width: '100%', outline: 'none', fontSize: '14px' }}

              />

            </div>

          </div>

        </div>



        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>

          <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)' }}><LocalizedText message={"Departure Date"} /></label>

          <MasarDatePicker

            label="Departure Date"

            value={date}

            onChange={setDate}

            placeholder="Select departure date"

            min={new Date().toISOString().split('T')[0]}

            aria-label="Departure Date"

          />

        </div>



        <div style={{ display: 'flex', gap: '16px' }}>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>

            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)' }}><LocalizedText message={"Passengers"} /></label>

            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0 12px' }}>

              <Users size={16} color="var(--color-text-muted)" />

              <input

                required

                type="number"

                min="1"

                max="9"

                value={passengers}

                onChange={e => setPassengers(e.target.value)}

                style={{ background: 'transparent', border: 'none', color: '#fff', padding: '10px 8px', width: '100%', outline: 'none', fontSize: '14px' }}

              />

            </div>

          </div>



          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>

            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)' }}><LocalizedText message={"Cabin Class"} /></label>

            <MasarSelect

              label="Cabin Class"

              value={cabin}

              onChange={setCabin}

              options={CABIN_OPTIONS}

              aria-label="Cabin Class"

            />

          </div>

        </div>



        <button

          type="submit"

          style={{

            background: 'linear-gradient(90deg, var(--color-accent), var(--color-accent-hover))',

            color: '#111',

            border: 'none',

            borderRadius: '8px',

            padding: '12px',

            marginTop: '12px',

            fontWeight: 700,

            fontSize: '15px',

            cursor: 'pointer',

            display: 'flex',

            justifyContent: 'center',

            alignItems: 'center',

            gap: '8px',

            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',

            transition: 'all 0.2s ease',

            textTransform: 'uppercase',

            letterSpacing: '0.05em'

          }}

          onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.6)'; }}

          onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(245, 158, 11, 0.4)'; }}

        >

          <Search size={18} /><LocalizedText message={" Search Flights"} /></button>

      </form>

    </div>

  );

}
