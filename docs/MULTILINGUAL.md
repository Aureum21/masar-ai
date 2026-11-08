# English, Arabic and Hindi

Implemented on `integration/optimization-features`. English remains the default.
Use the language selector in the application header, sidebar or authentication
screens. Arabic uses Modern Standard Arabic, right-to-left layout and Arabic
digits. Hindi uses Devanagari and Indian number formatting.

## Architecture and data boundaries

- `LocaleProvider` supplies React context, locally stored dictionaries, localized
  dates/numbers and the language selector. No translation service runs in the app.
- The public `masar_locale` cookie preserves the choice for one year. Root layout
  reads it on the server, setting HTML `lang`, `dir` and metadata before hydration.
  Local storage synchronizes open tabs. Changing language retains component state
  and entered form values; it does not navigate or rewrite URLs.
- Reading the locale cookie makes the routes request-rendered instead of globally
  static. This is deliberate: the initial HTML matches the chosen language. Only
  the selected dictionary is sent with the page; other dictionaries load on demand.
- Dictionary indexes are shared immutable data. Caches containing rendered text
  remain local to each translator instance, not shared across users/requests.
- `Localized` translates presentational attributes without an extra DOM wrapper.
  IDs, event handlers, refs, input values, option values, API payloads, currency codes
  and canonical date keys pass through unchanged. Native form validation has local
  messages and updates when the language changes.
- `LocalizedText` translates copy and typed interpolation slots. Personal names and
  references can be marked `preserveValues`. Mixed-direction Arabic values are
  isolated. Backend records and existing user-authored/third-party content are not
  bulk-translated or rewritten.
- Localized search includes original and translated curated metadata. Arabic
  diacritics and alef variants are normalized for search; Hindi vowel signs remain.
- Calendar keys and booking/evidence deadlines retain their existing timezone and
  canonical formats. Display formatting follows the locale without changing amounts.
- New chat requests include a constrained `locale`. The orchestrator and workers
  receive language guidance while tool names, provider enums, references and prices
  remain unchanged. Missing trip details are clarified with local static copy.

## Scope

The language system covers the landing and authentication flows, onboarding and
preferences, shared navigation, Explore, planning and chat, trip/calendar/booking
interfaces, Passport/rewards/challenges, receipts, Time Travel and Scan & Discover.
It also bridges same-origin vanilla-JS game controls and standalone experience
frames. Those imperative DOM trees have their own observer; React-owned application
DOM is never scanned or rewritten. Canvas label drawing uses the same dictionary.
Proper names, provider content, technical identifiers and credit/attribution text
can remain in their original language.

Arabic/Devanagari fonts are self-hosted through Fontsource. Standalone experiences
use the included font subsets and original licenses in `public/fonts/masar-languages`.
Language selection does not require a database migration or account schema change.

## Translation provenance and review

The catalog contains 3,762 source entries across interface copy, curated descriptions,
game text and deterministic error messages. Drafts were generated on this computer
using downloaded Argos-format English→Arabic 1.0 and English→Hindi 1.1 models with
CTranslate2/SentencePiece. No source text, credentials or user records were sent to
OpenAI or another translation service. The app does not require those model weights
or Python translation dependencies at runtime.

`reviewed.json` records 560 explicit reviewed translations plus matching case variants,
including navigation, authentication, booking actions, privacy/consent, receipt/VAT
qualifications, reward separation, camera messages and common counts. These override
machine drafts. Remaining long-form copy is offline-generated draft copy: fluent
Arabic/Hindi editorial sign-off is still required before a public release. UI tests
and dictionary parity are not evidence of native-speaker linguistic approval.

Browser review identified currency corruption in offline drafts. All curated Explore
prices were reviewed. Runtime checks reject changed currency codes or numeric tokens;
43 Arabic and 10 Hindi entries remain in English pending review, listed in
`src/i18n/draft-review.json`. This conservative fallback also protects standalone
experiences. Reviewed non-monetary counts may use natural number words. Regeneration
must pass the catalog tests before use; never accept altered amounts as translation.

## Maintenance without an API

1. Add new English copy to `src/i18n/locales/en.json` and its Arabic/Hindi entries.
2. Use `LocalizedText` or `Localized` at the rendering boundary. Keep canonical
   values separate from labels. Do not translate user messages or provider DTOs.
3. Put reviewed wording in `src/i18n/reviewed.json` to protect it from regeneration.
4. For optional local drafts, install `tools/requirements-translation.txt` in a
   separate environment and supply previously downloaded/extracted Argos models:

   ```powershell
   python tools/translate_ui_offline.py --models-dir C:/path/to/extracted-models
   ```

   This tool makes no network calls. It only drafts missing messages, preserves
   reviewed entries, and reports failures instead of silently dropping placeholders.
5. Run `node --test frontend/tests/localization.test.mjs` and the frontend build.
   Keep placeholder multisets identical across languages and preserve currency,
   file-format, reference and route tokens. Check all plural/count contexts.

## Validation

- Automated tests cover catalog completeness, interpolation, invalid locales,
  XSS-safe React text, protected names/values, RTL directions, date/timezone and
  numeric formatting, technical codes, translated search and English plural suffixes.
- English regression tests retain the original booking/payment assertions and
  use the real locale provider around rendered cards.
- Backend tests validate optional/constrained chat locales, language instructions
  that preserve tool/booking semantics, and provider-free planning clarification.
- Browser checks cover Arabic/Hindi sign-in rendering, reload persistence, retaining
  entered form data and representative signed-in/phone interfaces.
- Physical camera operation and native-speaker editorial certification are separate
  acceptance steps. No configured application DB migration or paid provider call
  was needed for this work.
