# Medicine interview conversation repair — 1 October 2026

## Confirmed problem

A review of 21 recent Medicine sessions found 14 with persisted engine conversations. The reported swimming-pool transcript was present, and two other recent full mocks showed the same failure with a different roleplay. Private session identifiers and candidate transcripts are deliberately excluded from this note.

The full MMI used the general school-interview prompt, including a hobby warm-up and a 25-word response rule. Several paths into a new question could speak `roleplay.openingStatement` alone. The candidate therefore heard an angry character before being told the situation, their role, or who the character was. Full mocks also omitted the written candidate brief from the response sent to the browser.

A separate live-test finding was that provider rate limits could be converted into a generic “take your time” reply after a candidate had already answered. This made a failed model request look like an irrelevant interviewer response.

## Repair plan implemented

1. Give Medicine its own interviewer instructions and start full MMIs with an authored Medicine motivation or reflection task.
2. Make the server introduce each new station, including the complete public situation, candidate role and actor identity, before any actor dialogue. Apply this to normal transitions, old warm-up sessions, timer expiry, skips and model failures.
3. Keep the first answer in the same station for a relevant follow-up. Give full MMI discussions up to eight substantive turns; focused and academic modes retain their own limits.
4. Treat task-clarification requests as requests for missing context. Repeat the public brief without replaying the angry opening or adding a scored answer turn.
5. Show the public brief throughout Medicine interviews, including when the transcript is hidden. Include that context in saved assessment evidence.
6. Retry temporary provider failures within a deadline, respecting `Retry-After`. If a Medicine answer still has no generated reply, return a retryable error without committing the turn. The existing client retries the same identifier and answer. Feedback failures retain the transcript and never manufacture a score.

## Conversation contract

- A full mock begins with a relevant Medicine task, not a generic school/hobby icebreaker.
- Follow-ups respond to the candidate's last answer. Neutral probing tests reasoning without forcing disagreement or demanding clinical expertise.
- A station change explicitly ends the previous station and introduces the next. A short relevant acknowledgement may precede the bridge; an actor's anger cannot carry into the next scenario.
- A roleplay actor responds in character after the brief. Private facts, scoring guidance and model answers remain server-side.
- Skips, time limits, clarification and platform failures are not themselves evidence of poor performance.
- Oxford/Cambridge retain their academic interview instructions and planned exercises; their public briefs and clarification handling use the same protections.

Manchester's [published interview guidance](https://www.bmh.manchester.ac.uk/study/medicine/interviews/interview/) describes short independent conversations assessing reasoning, communication and personal qualities. These exercises are original practice material, not official university questions or a claim to reproduce an official sequence.

## Verification

- 283 application tests and 123 backend tests pass, including the reported sequence, all published roleplay briefs, premature transitions, clarification, hidden-data boundaries and provider failures.
- TypeScript, Deno checks for both changed functions, and the production build pass.
- Live deployed Medicine checks cover Manchester and Leeds openings, the exact legacy pool-roleplay sequence, clarification, a substantive actor response, the next-station bridge and saved feedback containing the full brief.
- A real Anam guest session connected, accepted a typed answer and saved feedback. The candidate brief was checked on desktop, at phone width and with the transcript hidden; no browser runtime errors were observed.
- An ordinary 11+ test verified credit consumption, interview start, an answer, Anam token creation and saved school feedback.
- Temporary test accounts and trial invitations were removed after each run. No real candidate records were edited.

These checks establish the observed behavior and deterministic transition safeguards. Free-form model replies still require ongoing quality review; a passing suite does not guarantee every future conversation.

## Release

`interview-brain` and `generate-interview-feedback` are deployed to the existing Supabase project. No database migration is required. The spoken conversation fix applies immediately to new backend turns. Publish the synced Lovable frontend to show the updated candidate-brief presentation, including focus mode.
