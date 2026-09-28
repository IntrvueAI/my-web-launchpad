# Medicine MMI worked-answer library

## What changed

The previous Medicine library reused generic school, communication and scientific reasoning examples. `/medicine/examples` now presents 24 original medicine-specific MMI stations. The separate `/examples` page retains the two 11+ examples.

There are four stations in each category:

| Category                 | Scenarios                                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| Ethics & consent         | Relative requesting results; refusal of a test; consent to student involvement; scarce clinic appointment |
| Patient communication    | Clinic delay; language support; vaccination concern; fear of a blood test                                 |
| Professionalism & safety | Patient information in a photo; possible identity mismatch; dismissive behaviour; task beyond competence  |
| Motivation & reflection  | Why medicine; healthcare teamwork; a volunteering mistake; pressure and support                           |
| NHS & public health      | Lifestyle and access to care; online-only GP access; prevention budget; antibiotic expectations           |
| Health data & numeracy   | Absolute/relative risk; positive screening results; hospital case mix; appointment reminders              |

Every station includes a candidate brief, an explicit role, three assessed skills, an optional response structure, a worked opening response, three self-review points, a weak response with an improvement explanation, two follow-up challenges with suggested responses, and relevant official source links. Roleplays model dialogue addressed to the patient or relative. All four personal reflections are labelled fictional: students should substitute genuine experiences.

The four data exercises use explicitly fictional tables. Eight arithmetic checks distinguish absolute and relative changes, screening denominators and weighted hospital outcome rates. The responses discuss uncertainty and avoid deriving clinical recommendations from hypothetical counts.

## Practice experience

- Search and topic filters; mobile station selector and desktop station list.
- Bookmarkable `?station=<id>` links; filters also survive reload and browser history.
- Separate notes for each station, both follow-ups and self-review. Storage is local to this browser and separated by account (or guest); there is no cloud sync.
- Model responses and follow-up suggestions hidden until requested.
- Optional five-minute rehearsal clock, with pause, resume and reset. This does not connect an avatar or record speech. Five minutes is an editorial rehearsal setting, not a claim about every university's timing.
- Clear distinction between self-review and admissions scoring.
- Both Medicine colour schemes remain available.

## Editorial basis and limits

Sources were checked on 28 September 2026. The source registry in `src/data/medicine-mmi-examples.ts` links each station to the specific principles informing it.

- [Medical Schools Council: interviews](https://www.medschools.ac.uk/for-students/applying-to-medical-school/interviews/) informs the breadth of MMI attributes.
- [Birmingham: medicine interviews](https://www.birmingham.ac.uk/about/college-of-medicine-and-health/birmingham-medical-school/applying-to-medicine/medicine-interviews) supports applicant-level healthcare discussion, reflection, roleplay and numerical reasoning. Its stated admissions cycle is not presented as a universal or current-cycle timetable.
- GMC guidance informs consent, confidentiality, student supervision, safety, professional conduct and social media.
- NHS guidance informs access, interpreting, vaccination, screening, antibiotics and fair use of resources. The NHS Constitution source and England-specific policy scenarios are labelled accordingly.

These are original educational scenarios and responses, not leaked university stations, official marking schemes or clinically validated training. The source check and editorial review are not a claim of independent medical educator review. Students and volunteers are not instructed to diagnose, prescribe, assess capacity independently or perform untrained procedures. School formats differ; this library is specifically MMI practice and does not replace the Oxford/Cambridge academic pilots.

## Release boundary

This release changes the frontend worked-answer library and its feedback link. It does not add these 24 scenarios to the live Anam interview bank and requires no Supabase function or database migration. Historical admin journal entries are retained; the new entry describes this release separately.

Preview: `http://127.0.0.1:8092/medicine/examples` while the local preview is running.

Public route after publishing: `https://intrvue.ai/medicine/examples`. GitHub sync alone does not establish publication; the Lovable project needs **Publish → Update**. The preview address is local and cannot be shared as a public website.

## Verification

- Application regression suite: **247 tests passed** in 30 files, including 14 new content, calculation, storage, routing and timer checks.
- TypeScript and lint for the changed example modules passed.
- Browser checks exercised all 24 stations and 48 follow-up reveals, filters, bookmark reloads, drafts, saved self-review, calculation feedback, mobile navigation, both colour schemes and the separate 11+ library. No browser exceptions were recorded.
- No horizontal overflow at 1440, 390 or 320 pixels in the checked states. Six scoped accessibility checks across the Medicine and 11+ examples reported no WCAG A/AA violations. These checks also found and corrected an existing low-contrast 11+ answer button.
- The production build passed. The existing large-bundle advisory remains; it is not a build error.
- No live Anam call, payment, database write or Supabase deployment was needed for this frontend content release.
