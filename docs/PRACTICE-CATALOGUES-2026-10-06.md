# Separate 11+ and Medicine practice

## Product change

- The main 11+ practice picker shows school interviews, maths, logic, current affairs and the school demo. Medicine choices and its category are excluded.
- Medicine offers `medicine-mmi-practice` (the general six-station MMI) and four mini interviews: ethics, communication, motivation and data.
- The Medicine dashboard, classic picker, landing page, guest trials and Medicine admin launch page use the current offer. University research pages launch the general MMI. The solo studio no longer asks pupils to pick a university-specific preparation mode.
- Leeds/Manchester variants and Oxford/Cambridge/Imperial pilots are retired from new practice choices. Their definitions, existing feedback labels, history filters and engine compatibility remain available for saved assessments and existing sessions.
- General Medicine formats no longer inherit Leeds-specific provenance metadata. The seven-minute mini-session budget is unchanged: one minute reading, up to five minutes answering, plus introduction/closing allowance. Copy is consistent across the picker and private trials.
- The 11+ and Medicine interview engines, question bank and account/credit system are unchanged. No Supabase deployment or migration is needed.

## Validation

348 application tests passed, including seven new checks for catalogue separation, retired-history compatibility, current Medicine choices and university-page launch destinations. Type checking and production build passed.

A browser check used a temporary real account on both product hosts and a real private guest trial. It verified the 11+ picker, four mini choices, single full MMI, setup screens, landing links and guest labels at 320, 390 and 1,440 pixels. There were no browser exceptions or horizontal overflow. No live interview was started during this catalogue check; temporary test accounts and invitations were removed.

Publish the frontend update in Lovable after the GitHub `main` sync.
