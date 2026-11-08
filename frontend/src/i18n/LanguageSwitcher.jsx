'use client';

import {Languages} from 'lucide-react';

import {LOCALES,LOCALE_INFO} from './messages.mjs';

import {useI18n} from './LocaleProvider';

import MasarSelect from '@/components/ui/MasarSelect';



export default function LanguageSwitcher({className=''}) {

  const {locale,t,changeLocale,pending,error}=useI18n();

  const options = LOCALES.map(value => [value, LOCALE_INFO[value].name]);



  return <div className={`language-switcher ${className}`}>

    <Languages size={15} aria-hidden="true" className="language-switcher-icon"/>

    <MasarSelect

      aria-label={t('Interface language')}

      value={locale}

      disabled={pending}

      onChange={val => changeLocale(val)}

      options={options}

      compact={true}

      className="language-select-dropdown"

    />

    {pending&&<span className="sr-only" role="status">{t('Changing language…')}</span>}

    {error&&<span className="language-error" role="alert">{t('Language could not be loaded. Please try again.')}</span>}

  </div>;

}
