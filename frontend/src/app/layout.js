import './globals.css';
import {AccessibilityProvider} from '@/context/AccessibilityContext';
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import {cookies} from 'next/headers';
import {LocaleProvider} from '@/i18n/LocaleProvider';
import {loadDictionary} from '@/i18n/loadDictionary';
import {validLocale,LOCALE_INFO,createTranslator} from '@/i18n/messages.mjs';
import '@/i18n/locale.css';

const metadata = {
  title: 'Masar AI — Your UAE Travel Companion',
  description: 'An AI-powered travel concierge for the UAE. Find hotels, plan trips, discover events, and navigate transit across Dubai, Abu Dhabi, and beyond.',
  icons: {
    icon: '/MasarAiLogo.png',
    apple: '/MasarAiLogo.png',
  },
};

export async function generateMetadata() {
  const locale=validLocale((await cookies()).get('masar_locale')?.value);
  const t=createTranslator(locale,await loadDictionary(locale));
  return {...metadata,title:t(metadata.title),description:t(metadata.description)};
}

export default async function RootLayout({ children }) {
  const locale=validLocale((await cookies()).get('masar_locale')?.value);
  const dictionary=await loadDictionary(locale);
  return (
    <html lang={locale} dir={LOCALE_INFO[locale].dir}>
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://server.arcgisonline.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://server.arcgisonline.com" />
      </head>
      <body>
        <LocaleProvider initialLocale={locale} initialDictionary={dictionary}>
          <ThemeProvider>
            <AuthProvider><AccessibilityProvider>{children}</AccessibilityProvider></AuthProvider>
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
