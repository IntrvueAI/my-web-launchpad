-- Preserve station runtime metadata in the editable question bank.
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS roleplay jsonb;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS format text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS current_affairs_expiry text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS clinical_review_required boolean;

-- Optimistic concurrency: a late request may not overwrite a newer answer or a stopped session.
ALTER TABLE public.interview_sessions ADD COLUMN IF NOT EXISTS engine_revision integer NOT NULL DEFAULT 0;

-- Backfill only unchanged prompts that already existed in the bundled runtime bank. No new
-- question is inserted, activated or approved. Database edits and non-null metadata win.
WITH authored AS (
  SELECT value AS q FROM jsonb_array_elements($medicine_metadata$
[
  {
    "id": "MED-CT-01",
    "question": "Explain to me, as if I were a ten-year-old, what a clinical trial is and why it matters. I'll respond as that child would.",
    "roleplay": null,
    "format": "EX",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-CT-02",
    "question": "A member of the public asks you what an NHS waiting list actually is and why it exists. Explain it to me as if I were that person.",
    "roleplay": null,
    "format": "EX",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-CT-03",
    "question": "Tell me about a time you had to apologise to someone for genuinely getting something wrong. What did you actually say?",
    "roleplay": null,
    "format": "PE",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-CT-04",
    "question": "A friend of yours posts something online that's rude about a group of patients they'd worked with on a placement — no names, just a general complaint. What do you think about that, as something a future doctor might do?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-CT-05",
    "question": "Explain to me, in under a minute, how a train timetable works — and then close by checking I've actually understood, in a way that isn't just 'does that make sense?'.",
    "roleplay": null,
    "format": "EX",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-CT-06",
    "question": "You have to tell someone about a decision you personally disagree with, made by someone above you. How do you explain it without either undermining the decision or pretending you fully agree?",
    "roleplay": null,
    "format": "DQ",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-CA-01",
    "question": "Doctors in England have taken industrial action over pay in recent years. Is it ever right for doctors to strike?",
    "roleplay": null,
    "format": "PD",
    "currentAffairsExpiry": "2026-11-30",
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-CA-02",
    "question": "People in the most deprived parts of the country live shorter, less healthy lives than people in the least deprived areas. Why do you think that is, and whose job is it to fix?",
    "roleplay": null,
    "format": "PD",
    "currentAffairsExpiry": "2027-04-30",
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-CA-03",
    "question": "The NHS is increasingly moving services onto apps and digital platforms. Who might lose out from that, and does it matter?",
    "roleplay": null,
    "format": "PD",
    "currentAffairsExpiry": "2027-02-28",
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-CA-09",
    "question": "The NHS is often described as 'free at the point of use'. What does that actually mean, and does it mean the NHS itself is free?",
    "roleplay": null,
    "format": "PD",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-CA-10",
    "question": "Some patients ask for antibiotics they don't clinically need. Should GPs be more willing to prescribe them if that's what the patient wants?",
    "roleplay": null,
    "format": "PD",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-CA-11",
    "question": "Should the government restrict how unhealthy food is advertised and sold, or is that overreach into personal choice?",
    "roleplay": null,
    "format": "PD",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-CA-12",
    "question": "What is a physician associate, and do you think the role is good for the NHS?",
    "roleplay": null,
    "format": "PD",
    "currentAffairsExpiry": "2027-03-31",
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-CA-13",
    "question": "The NHS uses cost-effectiveness thresholds to decide which treatments to fund. Is it fair to put a price on a year of someone's life?",
    "roleplay": null,
    "format": "PD",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-CA-14",
    "question": "Why do you think NHS waiting lists are as long as they are, and is progress being made?",
    "roleplay": null,
    "format": "PD",
    "currentAffairsExpiry": "2026-12-31",
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-CA-15",
    "question": "There have been recent moves to restructure how the NHS is run centrally, including abolishing NHS England as a separate body. Is that a good idea?",
    "roleplay": null,
    "format": "PD",
    "currentAffairsExpiry": "2027-01-31",
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-CA-16",
    "question": "Childhood vaccination rates have been falling in parts of the country. Should vaccination be made mandatory?",
    "roleplay": null,
    "format": "PD",
    "currentAffairsExpiry": "2026-12-31",
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-CA-17",
    "question": "The NHS is free at the point of use; social care is means-tested. Should social care be made free in the same way?",
    "roleplay": null,
    "format": "PD",
    "currentAffairsExpiry": "2027-01-31",
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-CA-18",
    "question": "People often say mental health should have 'parity of esteem' with physical health. What would that actually require, beyond the phrase itself?",
    "roleplay": null,
    "format": "PD",
    "currentAffairsExpiry": "2027-03-31",
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-CA-19",
    "question": "The NHS increasingly funds treatment at independent (private) hospitals for NHS patients. Is that a good thing?",
    "roleplay": null,
    "format": "PD",
    "currentAffairsExpiry": "2027-06-30",
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-CA-20",
    "question": "Serious safety failures in NHS care, particularly in maternity services, have recurred across different hospitals over many years. Why do you think the same kinds of failure keep happening?",
    "roleplay": null,
    "format": "PD",
    "currentAffairsExpiry": "2027-06-30",
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-CA-21",
    "question": "Independent (private) providers now deliver a significant share of NHS-funded diagnostics and treatment, under NHS-funded partnership arrangements. Is greater use of the private sector within the NHS a good thing?",
    "roleplay": null,
    "format": "PD",
    "currentAffairsExpiry": "2027-03-31",
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-CA-22",
    "question": "The Mental Health Act 2025 received Royal Assent and is being brought into force gradually, alongside new government funding for mental health facilities. Why might reforming mental health law and funding matter as much as reforming physical health services?",
    "roleplay": null,
    "format": "PD",
    "currentAffairsExpiry": "2026-12-31",
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-CA-04",
    "question": "Will AI replace doctors? And if an AI tool gets something wrong, who's responsible?",
    "roleplay": null,
    "format": "PD",
    "currentAffairsExpiry": "2027-02-28",
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-CA-05",
    "question": "New weight-loss medications could help a very large number of patients, but funding them for everyone eligible would be extremely expensive. How should the NHS think about rolling them out?",
    "roleplay": null,
    "format": "PD",
    "currentAffairsExpiry": "2027-04-30",
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-CA-06",
    "question": "Should terminally ill patients have the legal right to choose an assisted death? Talk me through your thinking.",
    "roleplay": null,
    "format": "PD",
    "currentAffairsExpiry": "2026-09-12",
    "clinicalReviewRequired": true
  },
  {
    "id": "MED-CA-07",
    "question": "Competition for medical training posts has been fierce, and recent policy has moved to prioritise UK medical graduates for these posts. Is that fair?",
    "roleplay": null,
    "format": "PD",
    "currentAffairsExpiry": "2027-03-31",
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-CA-08",
    "question": "Some campaigners argue for a national screening programme for prostate cancer for all men. Should there be one?",
    "roleplay": null,
    "format": "PD",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-CA-23",
    "question": "The NHS has historically relied heavily on doctors trained overseas, but the government's 10 Year Health Plan sets a target of under 10% international recruitment by 2035. Is it right for the UK to reduce its reliance on internationally trained doctors?",
    "roleplay": null,
    "format": "PD",
    "currentAffairsExpiry": "2027-01-31",
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-D1",
    "question": "You're helping run a busy GP morning clinic with only three appointment slots left before lunch, but four patients waiting: a child with a mild fever and a rash that started this morning; a man in his 70s with sudden chest pain that started twenty minutes ago; a woman asking for a repeat prescription she's collected many times before; and a teenager who twisted their ankle playing sport yesterday and can now walk on it. How would you prioritise seeing them?",
    "roleplay": null,
    "format": "PR",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-D2",
    "question": "A news headline says: \"Hospital waiting lists have grown by 40% this year — proof the NHS is getting worse.\" Before you accept that conclusion, what questions would you want to ask about this statistic?",
    "roleplay": null,
    "format": "AD",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-D3",
    "question": "A screening test for a certain condition is 95% accurate. A patient tests positive. They immediately assume they have a 95% chance of having the condition. Talk me through whether that's the right way to think about it.",
    "roleplay": null,
    "format": "DI",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-D4",
    "question": "Here's a simple trend: five years ago, the average wait in a hospital's A&E department was two hours. This year, it's four hours. The hospital's management says: \"Nothing has changed on our end — this is purely a national trend affecting every hospital equally.\" What would you want to know before accepting or rejecting that claim?",
    "roleplay": null,
    "format": "AD",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-D5",
    "question": "Town A has a 95% childhood vaccination rate and very few cases of a certain preventable disease. Town B has a 60% vaccination rate and a recent outbreak of the same disease. A local politician says: \"This proves vaccination rates alone caused the difference.\" How would you assess that claim?",
    "roleplay": null,
    "format": "AD",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-D6",
    "question": "A headline says: \"New drug cuts risk of a rare complication by 50%!\" It turns out the complication affects 2 in 1,000 people without the drug, and 1 in 1,000 people with it. Is the '50%' figure misleading? Talk me through it.",
    "roleplay": null,
    "format": "AD",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-D7",
    "question": "A study of 24 people finds that a particular supplement improves memory, and it gets reported as \"Scientists confirm memory-boosting supplement.\" What would you want to know before accepting that conclusion?",
    "roleplay": null,
    "format": "AD",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-D8",
    "question": "A hospital has a small amount of unexpected extra funding this year and can only spend it in ONE of three ways: hiring two more nurses for an understaffed general ward, buying a piece of diagnostic equipment that would speed up cancer diagnosis for a moderate number of patients, or funding a mental health support programme for staff, who are reporting high burnout. How would you think through this decision?",
    "roleplay": null,
    "format": "PR",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-D9",
    "question": "You're told a cancer's \"five-year survival rate\" has risen from 40% to 70% since a new screening programme began, and this is presented as proof the screening is saving lives. What would you want to check before accepting that?",
    "roleplay": null,
    "format": "DI",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-D10",
    "question": "You're helping triage calls to a non-emergency health advice line, and three calls come in at once: a parent worried about a baby who has been unusually sleepy and hard to wake for the last hour; an adult with a headache that's been present, unchanged, for two days; and someone asking whether it's safe to take a common painkiller alongside their regular medication. How would you prioritise these three calls, and why?",
    "roleplay": null,
    "format": "PR",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-D12",
    "question": "A ward has 24 beds and is currently 75% occupied. Six patients are discharged and four new patients are admitted. What is the new occupancy, as a percentage? Talk me through your method as you go — no calculator.",
    "roleplay": null,
    "format": "CA",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-D11",
    "question": "You're helping run a busy shift with several tasks that all genuinely need doing, and partway through it becomes clear there isn't enough time to finish everything. What do you drop, and what do you do about it?",
    "roleplay": null,
    "format": "PR",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-EP-09",
    "question": "A close friend says 'promise you won't tell anyone' and then starts to tell you something serious before you've answered. What should you have thought about before responding?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": true
  },
  {
    "id": "MED-EP-10",
    "question": "You think something isn't right about a situation you're involved in, but you don't have proof — just a strong feeling something is wrong. Should you say anything?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-EP-11",
    "question": "A local health programme has funding for ten places this year and eleven equally eligible people have applied. How would you think about deciding who gets the last place?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-EP-12",
    "question": "Something nearly went wrong during a task you were involved in, but in the end nobody was harmed. Do you think it's still worth reporting?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-EP-01",
    "question": "A doctor has told a patient that a recent diagnosis means they must inform the DVLA and stop driving. At the next appointment the patient says they have not told the DVLA and are still driving to work. What should the doctor be thinking about?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": true
  },
  {
    "id": "MED-EP-02",
    "question": "You raised a concern with your supervisor two weeks ago about something you thought was unsafe. As far as you can tell, nothing has changed. What do you do now?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-EP-03",
    "question": "An older man living alone refuses all offers of help, even though his home is in a poor state and he has had a couple of falls. He understands the risks and is clear he wants to be left to make his own choices. His daughter is desperate for someone to intervene. What do you think should happen?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": true
  },
  {
    "id": "MED-EP-04",
    "question": "A 15-year-old comes to see a doctor alone and asks about contraception. She says she doesn't want her parents to know. What is the doctor thinking about here?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": true
  },
  {
    "id": "MED-EP-05",
    "question": "Someone senior to you asks you to do something as part of a task you're helping with, and you think it's the wrong thing to do. What do you consider?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-EP-06",
    "question": "A colleague you respect and who has worked somewhere for years makes a dismissive, generalising remark about a resident's family while you're both on a break. What do you do?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-EP-07",
    "question": "Someone suggests that patients who smoke should wait longer for planned surgery than patients who don't, since smoking increases their own surgical risk and worsens outcomes. What do you think of that argument?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-EP-08",
    "question": "A patient with capacity refuses a treatment her family believes she needs, and the family is asking the team to override her. Talk me through the ethical tension here — and be specific about what's actually in conflict.",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-EP-13",
    "question": "You volunteer at a day centre for adults with learning disabilities. You notice one regular attendee seems frightened of the person who brings them each week, but when you ask if everything is okay, they say yes. What do you think about, and what would you do?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": true
  },
  {
    "id": "MED-EP-14",
    "question": "Someone's ability to understand and make decisions seems to vary from day to day — clear-headed on some days, confused on others. What does that mean for whether they have capacity to make a decision?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": true
  },
  {
    "id": "MED-EP-15",
    "question": "A family tells you they feel a 'do not attempt resuscitation' decision was made about their relative without them being properly involved, and they're distressed and angry about it. As someone who isn't part of the clinical team, how would you think about their concern?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": true
  },
  {
    "id": "MED-EP-16",
    "question": "You're helping organise a school event, and one of the two suppliers you're choosing between is run by a family friend. What do you do?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-EP-17",
    "question": "A coach wants to change a young athlete's training programme significantly, and the athlete goes along with it without really understanding what's being asked or why. Is that a problem, even though it's not a medical decision?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-EP-18",
    "question": "A younger student asks you for help with a subject you're genuinely not confident in yourself. What do you do?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-E1",
    "question": "A small rural hospital has five ICU beds and, tonight, six patients who each need one to survive. You are on the admissions panel. How would you decide who gets a bed — and who doesn't?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-E2",
    "question": "A 15-year-old comes to see you alone and asks about getting tested for a sexually transmitted infection. She says she doesn't want her parents to know. As a doctor, what would you do?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": true
  },
  {
    "id": "MED-E3",
    "question": "An elderly patient with full mental capacity refuses a blood transfusion that doctors believe she needs to survive, for personal reasons she won't fully explain. Her family is begging the medical team to give it to her anyway. What should happen?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": true
  },
  {
    "id": "MED-E4",
    "question": "You're shadowing a senior doctor you respect enormously. You notice they've made a genuine error in a patient's medication dose — one that could cause harm. What do you do?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-E5",
    "question": "A close friend asks you to sign the attendance register for them at a lecture they skipped, so they don't get marked absent. It seems harmless. Would you do it?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-E6",
    "question": "A patient looks at you and asks whether they are going to die from this. You believe the honest answer is that their condition is very likely terminal. What do you say?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-E7",
    "question": "Two patients need the same donor liver and only one can have it: a 45-year-old with no history of alcohol use, and a 50-year-old whose liver failure was caused by years of heavy drinking but who has been sober for two years. How would you think about who should be prioritised?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-E8",
    "question": "A patient who is a Jehovah's Witness is losing a lot of blood after an accident and, based on their religious beliefs, has clearly and repeatedly refused a blood transfusion, even knowing it could cost their life. The medical team believes a transfusion would very likely save them. What should happen?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": true
  },
  {
    "id": "MED-E9",
    "question": "A new drug could meaningfully extend the life of patients with a rare condition, but it costs so much that funding it for the small number of patients who need it would mean cutting funding elsewhere in the health system. Should it be funded?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-E10",
    "question": "You notice a senior colleague seems to be smelling of alcohol before a shift, and their behaviour is slightly off. You have no proof, just a strong suspicion. What do you do?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-E11",
    "question": "After a successful treatment, a patient you've cared for wants to give you an expensive gift as a thank-you, and seems genuinely hurt when you hesitate. How would you handle it?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-E12",
    "question": "Should terminally ill patients have the legal right to choose an assisted death? Talk me through your thinking.",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-MR-18",
    "question": "What do you think a doctor actually spends most of their day doing?",
    "roleplay": null,
    "format": "DQ",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-M1",
    "question": "Why do you want to study medicine? I'd like a specific, honest answer, not the version you think I want to hear.",
    "roleplay": null,
    "format": "DQ",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-M2",
    "question": "Tell me about a time you worked in a team and it didn't go well. What happened, and what did you learn?",
    "roleplay": null,
    "format": "PE",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-M3",
    "question": "Tell me about a time you made a genuine mistake — academic, personal, anything — and what it taught you.",
    "roleplay": null,
    "format": "PE",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-M4",
    "question": "Tell me about a piece of work experience, volunteering, or shadowing you've done. What did it teach you about the REALITY of a medical career, as opposed to what you expected beforehand?",
    "roleplay": null,
    "format": "WE",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-M5",
    "question": "Medicine involves real pressure — long hours, high stakes, difficult news. Tell me about a genuinely stressful situation you've faced, and how you actually handled it.",
    "roleplay": null,
    "format": "PE",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-M6",
    "question": "Tell me about a time you took the lead on something — formally or informally. What made it work, or not work?",
    "roleplay": null,
    "format": "PE",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-M7",
    "question": "Tell me about a time you had to communicate something important to someone when there was a real barrier — a language difference, an age gap, a difference in understanding, or something else. How did you handle it?",
    "roleplay": null,
    "format": "PE",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-M8",
    "question": "Tell me about a time you disagreed with a decision made by someone in authority over you — a teacher, a coach, a boss. What did you do?",
    "roleplay": null,
    "format": "PE",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-M9",
    "question": "Tell me about a time you worked hard toward something and it didn't work out — you didn't get the grade, the place, the result you wanted. How did you respond?",
    "roleplay": null,
    "format": "PE",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-M10",
    "question": "Medical training takes at least five or six years at university, followed by many more years of postgraduate training before you're fully qualified in a specialty — often a decade or more in total. What have you actually done to understand whether that reality is right for you?",
    "roleplay": null,
    "format": "DQ",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-MR-11",
    "question": "Why do you want to study medicine — and has anything ever nearly changed your mind?",
    "roleplay": null,
    "format": "DQ",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-MR-12",
    "question": "Why medicine specifically, rather than nursing or becoming a physician associate?",
    "roleplay": null,
    "format": "DQ",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-MR-13",
    "question": "Tell me about something from your work experience or volunteering that changed how you think about medicine.",
    "roleplay": null,
    "format": "WE",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-MR-14",
    "question": "Tell me about a real failure — one that actually cost you something — and what you'd do differently.",
    "roleplay": null,
    "format": "PE",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-MR-15",
    "question": "What do you think you'll find hardest about medical training?",
    "roleplay": null,
    "format": "DQ",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-MR-16",
    "question": "A lot of applicants say they're resilient. What's your evidence — a specific time that was genuinely tested?",
    "roleplay": null,
    "format": "PE",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-MR-17",
    "question": "Tell me about a time you supported someone else's decision, even though you disagreed with it.",
    "roleplay": null,
    "format": "PE",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-RP-002",
    "question": "Sorry — you work here, don't you? Can I ask you something? They took blood last week and they've asked me to come back in. They don't ask you to come back in for nothing, do they.",
    "roleplay": {
      "name": "Elaine Prosser",
      "role": "patient waiting for a routine appointment (60s)",
      "applicantRole": "Volunteer helping in the waiting area of a GP practice. You do not have access to any records.",
      "openingStatement": "Sorry — you work here, don't you? Can I ask you something? They took blood last week and they've asked me to come back in. They don't ask you to come back in for nothing, do they.",
      "actorStateInitial": "Anxious, apologetic for asking, watching the candidate's face closely for reassurance.",
      "actorStateTrajectory": "Reads any hesitation as bad news. Settles if given honest structure; escalates if given false comfort, because false comfort is transparently offered too quickly.",
      "hiddenFacts": [
        {
          "fact": "Her sister was diagnosed with cancer after a similar recall, eighteen months ago.",
          "disclosureCondition": "Only if the candidate asks what is worrying her specifically, or why she thinks it means something bad."
        },
        {
          "fact": "She has not told her family she is here.",
          "disclosureCondition": "Only if asked whether anyone is coming with her or who she has been able to talk to."
        }
      ],
      "escalationTriggers": [
        "'I'm sure it's nothing' or any guarantee",
        "Listing possible reasons for a recall — this is clinical speculation and she will latch onto the worst one",
        "Being brushed off"
      ],
      "deEscalationTriggers": [
        "Honest limits — 'I genuinely don't know, and I'm not able to look'",
        "Being asked what she is most worried about",
        "Being told what happens next in the appointment, in process terms only",
        "Being asked if she would like someone with her"
      ],
      "resistancePatterns": [
        "Asks the same question a second time in different words",
        "If reassured falsely, says 'you're just saying that'",
        "Pushes: 'but if it was YOUR mum, what would you think?'"
      ],
      "interruptionRule": "Do not interrupt. Use silence: after any answer, wait two seconds before responding. If the candidate fills every silence, that is a scoreable finding.",
      "plantedMisunderstanding": "She believes a recall always means abnormal results.",
      "desiredOutcomes": [
        "Declines to speculate clinically, warmly and without abandoning her",
        "Names the anxiety rather than only the question",
        "Corrects the recall misconception in general, non-clinical terms only if confident it is safe to do so, or defers it to the clinician",
        "Establishes what she needs — company, information, or just to say it aloud",
        "Points her to the right person"
      ],
      "endings": [
        {
          "id": "A",
          "condition": "Limits held, anxiety acknowledged, specific support offered",
          "description": "She names her sister. Says it helped to say it. Agrees to mention the worry to the GP."
        },
        {
          "id": "B",
          "condition": "Limits held but no emotional engagement",
          "description": "She says 'no, that's fine' and withdraws. Neither hidden fact surfaces."
        },
        {
          "id": "C",
          "condition": "False reassurance given",
          "description": "She visibly does not believe it and asks again, now more anxious. 'You would say that though, wouldn't you.'"
        },
        {
          "id": "D",
          "condition": "Clinical explanation offered",
          "description": "She takes the worst item on the list as the answer and becomes distressed. Red flag recorded."
        }
      ],
      "redFlags": [
        "Any speculation about what the results might be",
        "'I'm sure it's fine'",
        "Offering to look at or ask about her records",
        "Suggesting she does not need to worry"
      ],
      "actorResponseToStrong": "Breathes out. Offers the hidden fact unprompted. Thanks them specifically rather than generally.",
      "actorResponseToWeak": "Repeats the question. Becomes quieter. Says 'I shouldn't have asked.'"
    },
    "format": "RP",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": true
  },
  {
    "id": "MED-RP-003",
    "question": "[Sitting down heavily, holding a slip of paper, not looking up] Don't. Just — don't say anything nice. Please.",
    "roleplay": {
      "name": "Sam",
      "role": "classmate (18)",
      "applicantRole": "You are a student. It is results day. You have done well. Sam has not.",
      "openingStatement": "[Sitting down heavily, holding a slip of paper, not looking up] Don't. Just — don't say anything nice. Please.",
      "actorStateInitial": "Flat, then tearful. Actively refusing comfort.",
      "actorStateTrajectory": "The refusal is a test. Respects someone who does not immediately override it. If the candidate produces solutions in the first minute, Sam shuts down and gives monosyllables for the rest of the station.",
      "hiddenFacts": [
        {
          "fact": "Sam missed the offer by one grade and has not yet looked at whether the place is still available.",
          "disclosureCondition": "Only after Sam feels heard — at least one exchange where the candidate did not offer a solution."
        },
        {
          "fact": "Sam is more afraid of telling their father than of the result itself.",
          "disclosureCondition": "Only if the candidate asks what the hardest part is, or who Sam has told."
        }
      ],
      "escalationTriggers": [
        "'At least you...'",
        "Comparing to the candidate's own result, positively or self-deprecatingly",
        "Immediate practical advice about clearing or resits",
        "'Everything happens for a reason'"
      ],
      "deEscalationTriggers": [
        "Silence held for more than three seconds",
        "Sitting down",
        "'I don't know what to say'",
        "Asking what would help right now"
      ],
      "resistancePatterns": [
        "Answers the first two questions with 'I don't know'",
        "If pushed to be positive, says 'you don't get it'",
        "Rejects the first offer of practical help"
      ],
      "interruptionRule": "Never interrupt. If the candidate stops talking, wait four seconds before Sam speaks. Sam will fill the silence with something real if the candidate does not fill it first.",
      "plantedMisunderstanding": "Sam assumes the place is definitely gone and has not checked.",
      "desiredOutcomes": [
        "Does not rush to fix",
        "Tolerates the refusal of comfort without withdrawing",
        "Uses silence",
        "Reaches the hidden fact about the father, or at least asks who Sam has told",
        "Any practical suggestion comes late, tentatively, and only after acknowledgement"
      ],
      "endings": [
        {
          "id": "A",
          "condition": "Silence used, no early solutions, at least one hidden fact reached",
          "description": "Sam says the thing about their father, then asks the candidate to come with them to make the phone call."
        },
        {
          "id": "B",
          "condition": "Warm but talkative throughout",
          "description": "Sam calms slightly but stays surface-level. 'Thanks. I'll be fine.' No hidden facts."
        },
        {
          "id": "C",
          "condition": "Solutions offered in the first minute",
          "description": "Sam says 'yeah' three times and leaves. Station ends early."
        },
        {
          "id": "D",
          "condition": "Candidate mentions their own result",
          "description": "Sam's face changes. Conversation is over. Recorded as a serious empathy failure, though not a red flag."
        }
      ],
      "redFlags": [
        "Minimising the result",
        "Making the conversation about the candidate",
        "Pressuring Sam to talk when Sam has said they do not want to"
      ],
      "actorResponseToStrong": "Looks up. Speaks in longer sentences. Offers the hidden fact without being asked.",
      "actorResponseToWeak": "Shorter answers. Looks away. Says 'it's fine, honestly' — which is the actor's signal that the station is failing."
    },
    "format": "RP",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-RP-004",
    "question": "[Quietly, not making eye contact, hands over a wet patch on his trousers] It's nothing. I've spilt my tea. Don't — there's no need to tell anyone. It's just tea.",
    "roleplay": {
      "name": "Mr Doran",
      "role": "care home resident (80s)",
      "applicantRole": "Weekend volunteer running the activities session in a care home lounge.",
      "openingStatement": "[Quietly, not making eye contact, hands over a wet patch on his trousers] It's nothing. I've spilt my tea. Don't — there's no need to tell anyone. It's just tea.",
      "actorStateInitial": "Deeply embarrassed, minimising, wanting the candidate to leave.",
      "actorStateTrajectory": "If dignity is protected — volume lowered, others not drawn in, choice offered — he becomes willing to accept help. If handled loudly or bureaucratically, he becomes flatly refusing and asks to be left alone.",
      "hiddenFacts": [
        {
          "fact": "It is not tea.",
          "disclosureCondition": "He will not say so. The candidate must act appropriately without requiring him to admit it — the whole station turns on this."
        },
        {
          "fact": "This is the third time this week and he has stopped drinking fluids to prevent it.",
          "disclosureCondition": "Only if the candidate creates genuine privacy and asks an open, non-clinical question about how he has been."
        }
      ],
      "escalationTriggers": [
        "Naming what has happened out loud",
        "Calling across the room to a member of staff",
        "Any hint of amusement or awkward jokiness",
        "Insisting he admit what happened"
      ],
      "deEscalationTriggers": [
        "Lowering voice and moving closer",
        "Offering a choice rather than an instruction",
        "Matter-of-factness — treating it as ordinary",
        "Offering to walk with him rather than send him"
      ],
      "resistancePatterns": [
        "Refuses the first offer of help",
        "Says 'don't fuss' at least twice",
        "If the candidate hesitates, he stands up to leave"
      ],
      "interruptionRule": "If the candidate speaks at normal volume, he glances at other residents — a visible cue. If the candidate does not lower their voice within two exchanges, he says 'keep your voice down' and the station gets harder.",
      "plantedMisunderstanding": "The candidate may take 'it's just tea' at face value.",
      "desiredOutcomes": [
        "Preserves dignity: volume, position, privacy",
        "Accepts his framing rather than forcing an admission",
        "Offers help in a way he can accept without losing face",
        "Recognises this must be passed to staff, and says so honestly rather than promising secrecy",
        "Does not investigate the fluid restriction; notices it and passes it on"
      ],
      "endings": [
        {
          "id": "A",
          "condition": "Dignity preserved, honest about telling staff, help accepted",
          "description": "He accepts a hand up and says 'you're all right, you are.' The fluid detail surfaces."
        },
        {
          "id": "B",
          "condition": "Dignity preserved but promises not to tell anyone",
          "description": "He is grateful. The candidate has made a promise they should not have made — flagged in feedback, not as a red flag but as a boundary error."
        },
        {
          "id": "C",
          "condition": "Handled at normal volume or staff called across the room",
          "description": "He gets up and leaves. Refuses help for the rest of the session."
        },
        {
          "id": "D",
          "condition": "Candidate presses him to admit what happened",
          "description": "He becomes flatly hostile. Red flag for dignity."
        }
      ],
      "redFlags": [
        "Discussing it where others can hear",
        "Promising never to tell anyone",
        "Any clinical questioning about continence",
        "Leaving him without help"
      ],
      "actorResponseToStrong": "Shoulders drop. Accepts help. Says something warm and slightly self-deprecating.",
      "actorResponseToWeak": "Repeats 'it's nothing'. Stands. Becomes formal and distant."
    },
    "format": "RP",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-RP-006",
    "question": "Is my daughter coming today? She said she'd come. I've got my coat on, look. Is she coming?",
    "roleplay": {
      "name": "Mrs Whitfield",
      "role": "care home resident with memory difficulties (80s)",
      "applicantRole": "Volunteer running an afternoon activity. Staff are busy in another room.",
      "openingStatement": "Is my daughter coming today? She said she'd come. I've got my coat on, look. Is she coming?",
      "actorStateInitial": "Anxious, oriented to a fixed idea, standing by the door with a coat on.",
      "actorStateTrajectory": "Will ask the same question roughly every ninety seconds regardless of the answer. Becomes distressed if contradicted directly; settles if the underlying feeling is addressed and if she is given something to do.",
      "hiddenFacts": [
        {
          "fact": "Her daughter visits on Sundays. It is Wednesday.",
          "disclosureCondition": "The candidate can learn this from a visitors' book on the table if they think to look or to ask staff — it is not obtainable from Mrs Whitfield."
        },
        {
          "fact": "She is cold, which is part of why the coat matters to her.",
          "disclosureCondition": "Only if the candidate asks about the coat itself rather than about the daughter."
        }
      ],
      "escalationTriggers": [
        "Being told flatly 'no, she isn't coming'",
        "Being corrected about the day",
        "Being told she has already asked",
        "Being left alone"
      ],
      "deEscalationTriggers": [
        "Being asked about her daughter as a person",
        "Being given something to hold or do",
        "Warmth and unhurried repetition",
        "Having the coat acknowledged rather than removed"
      ],
      "resistancePatterns": [
        "Asks the question again after any answer",
        "If the candidate shows impatience, becomes tearful",
        "May become suspicious: 'you're not telling me something'"
      ],
      "interruptionRule": "Re-ask the opening question at 90s and again at 3m 30s, verbatim, regardless of what has been said.",
      "plantedMisunderstanding": "The candidate may believe the task is to make her understand it is Wednesday.",
      "desiredOutcomes": [
        "Does not repeatedly correct or argue",
        "Responds to the feeling — she misses her daughter — rather than only the fact",
        "Does not lie outright, and does not insist on a distressing truth",
        "Finds something to do with her",
        "Recognises this needs to be mentioned to staff, and does so without discussing her in front of others"
      ],
      "endings": [
        {
          "id": "A",
          "condition": "Feeling addressed, activity offered, no arguing",
          "description": "She sits down with the candidate, still in her coat, and talks about her daughter. Asks once more, more calmly."
        },
        {
          "id": "B",
          "condition": "Kind but keeps re-explaining the day",
          "description": "She becomes tearful and returns to the door."
        },
        {
          "id": "C",
          "condition": "Impatience shown or 'you've already asked me'",
          "description": "She becomes distressed and says she wants to go home."
        },
        {
          "id": "D",
          "condition": "Candidate promises the daughter is coming",
          "description": "She sits by the door for the rest of the afternoon. Flagged as a well-intentioned dishonesty error."
        }
      ],
      "redFlags": [
        "Assuming she lacks capacity generally rather than for this decision",
        "Physically removing the coat",
        "Discussing her memory in front of other residents",
        "Making a promise about the daughter"
      ],
      "actorResponseToStrong": "Sits. Talks about the daughter's name and job. Asks again but calmly, and accepts a redirection.",
      "actorResponseToWeak": "Repeats more insistently. Becomes tearful. Moves toward the door."
    },
    "format": "RP",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": true
  },
  {
    "id": "MED-RP-009",
    "question": "You're the medical lot, aren't you? Quick question. I've had this thing for a few weeks now. The doctor's got me waiting. Between you and me — should I be worried? What would you do?",
    "roleplay": {
      "name": "Ken Halloran",
      "role": "visitor at a community health fair (60s)",
      "applicantRole": "Sixth-form volunteer on a stand at a community health event, handing out information about local services.",
      "openingStatement": "You're the medical lot, aren't you? Quick question. I've had this thing for a few weeks now. The doctor's got me waiting. Between you and me — should I be worried? What would you do?",
      "actorStateInitial": "Friendly, chatty, treating it as a casual favour.",
      "actorStateTrajectory": "Persistent rather than aggressive. Escalates the flattery and the informality — 'go on, off the record' — precisely to test whether the candidate holds the line. Accepts a firm, warm boundary immediately when it is offered with an alternative.",
      "hiddenFacts": [
        {
          "fact": "He has an appointment in nine days and is considering not going because he thinks he is wasting their time.",
          "disclosureCondition": "If the candidate asks what he has done so far or whether he has an appointment."
        },
        {
          "fact": "He does not want to be a bother — his wife made him come to the fair.",
          "disclosureCondition": "If the candidate asks why he is asking a stranger rather than his GP."
        }
      ],
      "escalationTriggers": [
        "Any hedged opinion — 'well, it could be...'",
        "Asking about his symptoms in detail",
        "A cold refusal with no alternative"
      ],
      "deEscalationTriggers": [
        "A clear, warm statement of what the candidate is and is not",
        "Being asked what he has already done",
        "Being given a concrete alternative route",
        "Being taken seriously as a person rather than as a rule to be applied"
      ],
      "resistancePatterns": [
        "Asks three times, each time more informally",
        "'I'm not going to hold you to it'",
        "'You must have some idea'",
        "If refused coldly, says 'forget I asked' and walks off — which is also a failure state"
      ],
      "interruptionRule": "If the candidate begins asking about symptoms, encourage it — give more detail — because the station is testing whether they stop. Do not warn them.",
      "plantedMisunderstanding": "He believes a student volunteer at a health stand has relevant knowledge.",
      "desiredOutcomes": [
        "Declines clearly and early, without coldness",
        "Does not take a symptom history",
        "Corrects his assumption about their role",
        "Discovers the appointment and the reluctance to attend",
        "Encourages him to keep the appointment — which is the one genuinely useful, non-clinical thing available"
      ],
      "endings": [
        {
          "id": "A",
          "condition": "Boundary held warmly, appointment discovered, encouraged to attend",
          "description": "He laughs, says his wife will be pleased, and says he will go."
        },
        {
          "id": "B",
          "condition": "Boundary held coldly",
          "description": "He says 'fair enough' and leaves. The appointment is never discussed."
        },
        {
          "id": "C",
          "condition": "Candidate takes a symptom history but gives no opinion",
          "description": "He presses harder for a view, having invested in the telling. Partial failure — the history-taking itself is the error."
        },
        {
          "id": "D",
          "condition": "Any opinion offered",
          "description": "He is reassured or alarmed by it, and says so. Red flag."
        }
      ],
      "redFlags": [
        "Any opinion on whether he should be worried",
        "Suggesting what it might be",
        "Advising him about whether to wait",
        "Taking a symptom history"
      ],
      "actorResponseToStrong": "Accepts immediately and warmly. Reveals both hidden facts. Leaves with a plan.",
      "actorResponseToWeak": "Presses harder. Escalates informality. Rewards any hedge with more detail."
    },
    "format": "RP",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": true
  },
  {
    "id": "MED-RP-015",
    "question": "She was sat by that door for two hours. Two hours. She thought I wasn't coming. She said she thought I'd forgotten her. [pause] Did somebody not pass the message on?",
    "roleplay": {
      "name": "Grace Nwosu",
      "role": "daughter of a resident (40s)",
      "applicantRole": "Volunteer. Yesterday Grace rang and asked you to tell her mother that she would visit at four rather than two. You forgot. Her mother waited in the entrance hall from two until four.",
      "openingStatement": "She was sat by that door for two hours. Two hours. She thought I wasn't coming. She said she thought I'd forgotten her. [pause] Did somebody not pass the message on?",
      "actorStateInitial": "Upset rather than aggressive. Asking a genuine question, not yet accusing.",
      "actorStateTrajectory": "Anger depends almost entirely on whether the candidate tells her immediately. If the candidate hesitates, deflects, or waits to be asked twice, she becomes much angrier at the concealment than at the error.",
      "hiddenFacts": [
        {
          "fact": "Her mother has been asking whether Grace is 'giving up on her', and this has hurt more than the wait itself.",
          "disclosureCondition": "Only after the candidate has told the truth and apologised."
        },
        {
          "fact": "Grace assumed the fault lay with the staff, not a volunteer.",
          "disclosureCondition": "Emerges as surprise when the candidate takes responsibility."
        }
      ],
      "escalationTriggers": [
        "'I'll find out what happened'",
        "'It might have been passed on and she forgot'",
        "Any suggestion the mother's memory is at fault",
        "Waiting until directly accused before admitting it"
      ],
      "deEscalationTriggers": [
        "Immediate ownership, in the first sentence",
        "A clear apology naming the specific harm",
        "Explaining what will change",
        "Offering to tell her mother it was not Grace's fault"
      ],
      "resistancePatterns": [
        "If deflected, asks again more directly",
        "'So who did I speak to?'",
        "If the candidate blames the system, says 'I'm asking about you'"
      ],
      "interruptionRule": "None. The station's discrimination comes from how long the candidate takes to say 'it was me'. Time it.",
      "plantedMisunderstanding": "The candidate may think the harm was the wait. The harm was what the mother concluded.",
      "desiredOutcomes": [
        "Tells her it was them, immediately, before being asked twice",
        "Apologises specifically — not for 'any inconvenience' but for the two hours and for what her mother thought",
        "Offers a remedy: telling her mother directly that it was not Grace's fault",
        "Explains what they will do differently",
        "Reports the error to the manager themselves rather than leaving it with Grace"
      ],
      "endings": [
        {
          "id": "A",
          "condition": "Immediate ownership, specific apology, remedy offered, reported onward",
          "description": "Her anger drops. She says the thing about 'giving up on her'. She thanks the candidate for telling her."
        },
        {
          "id": "B",
          "condition": "Ownership after being asked twice",
          "description": "She accepts the apology but says 'why didn't you just say that straight away?'"
        },
        {
          "id": "C",
          "condition": "Deflection to the system or the staff",
          "description": "She asks to speak to the manager and is angrier about the concealment than the error."
        },
        {
          "id": "D",
          "condition": "Suggests the mother may have forgotten",
          "description": "Red flag. Blaming a resident with memory difficulties to cover an error."
        }
      ],
      "redFlags": [
        "Denying or concealing the error",
        "Blaming the resident's memory",
        "Blaming another staff member",
        "Apologising only 'if' something went wrong"
      ],
      "actorResponseToStrong": "Softens immediately. Reveals the hidden fact. Says 'thank you for being honest.'",
      "actorResponseToWeak": "Presses. Escalates. Asks for the manager."
    },
    "format": "RP",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-RP-018",
    "question": "You are joking. Third time this term. Do you know what it takes to get him here? Do you? Two buses and an hour of persuading him to put his costume on. And now you're telling me at the door.",
    "roleplay": {
      "name": "Steph",
      "role": "parent of a child in the swimming group (30s)",
      "applicantRole": "You are a volunteer assistant at a community swimming session for disabled children. Today's session is cancelled — the pool hoist is broken. You are the only person at the door.",
      "openingStatement": "You are joking. Third time this term. Do you know what it takes to get him here? Do you? Two buses and an hour of persuading him to put his costume on. And now you're telling me at the door.",
      "actorStateInitial": "Furious, and entitled to be.",
      "actorStateTrajectory": "This anger is legitimate and will not be soothed by sympathy alone. Responds to acknowledgement plus a concrete commitment. Escalates sharply at any hint of a non-apology or of blaming the equipment.",
      "hiddenFacts": [
        {
          "fact": "Her son is in the car and she has not told him yet.",
          "disclosureCondition": "If the candidate asks where he is or how she will manage the rest of the day."
        },
        {
          "fact": "This session is the only social activity he has.",
          "disclosureCondition": "If the candidate asks what it means to him rather than apologising again."
        }
      ],
      "escalationTriggers": [
        "'There's nothing I can do'",
        "'It's not my fault'",
        "'Unfortunately the hoist is broken' as the first sentence",
        "Offering a refund as the primary remedy"
      ],
      "deEscalationTriggers": [
        "Acknowledging the journey and the effort specifically",
        "A real apology on behalf of the session",
        "Asking about her son",
        "Any concrete commitment — a named person, a date, being contacted directly next time"
      ],
      "resistancePatterns": [
        "Rejects the first apology as formulaic",
        "'Sorry doesn't get us home'",
        "Demands to know who is responsible"
      ],
      "interruptionRule": "Interrupt any explanation that begins before an acknowledgement.",
      "plantedMisunderstanding": "The candidate may believe the task is to explain the cancellation. It is to make the wasted journey mean something.",
      "desiredOutcomes": [
        "Acknowledges before explaining",
        "Apologises meaningfully rather than procedurally",
        "Does not hide behind not being in charge, while being honest about what they can do",
        "Asks about her son and offers something for today, however small",
        "Commits to a specific change — being phoned rather than told at the door — and names who will do it",
        "Does not over-promise on the hoist repair"
      ],
      "endings": [
        {
          "id": "A",
          "condition": "Acknowledgement first, specific apology, concrete commitment about notification",
          "description": "She calms, mentions he is in the car, and accepts a plan for a text list. Thanks the candidate."
        },
        {
          "id": "B",
          "condition": "Sympathetic but no commitment",
          "description": "She leaves still angry. 'Yeah. See you next week. If it's on.'"
        },
        {
          "id": "C",
          "condition": "Explanation first",
          "description": "She raises her voice and asks for the manager."
        },
        {
          "id": "D",
          "condition": "Promises the hoist will be fixed by next week",
          "description": "Over-promising outside their control. Flagged."
        }
      ],
      "redFlags": [
        "'It's not my fault'",
        "Promising something outside their control",
        "Arguing about how much notice was given",
        "Walking away"
      ],
      "actorResponseToStrong": "Volume drops. Mentions her son in the car. Engages with the notification plan.",
      "actorResponseToWeak": "Escalates. Asks for a name. Says she will complain."
    },
    "format": "RP",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-RP-019",
    "question": "OK, I'm ready. Pen's on the paper. Where do I start?",
    "roleplay": {
      "name": "Ife",
      "role": "another student, seated back-to-back with you (17)",
      "applicantRole": "You have a diagram. Ife has paper and a pen and cannot see your diagram. You must get Ife to draw it. Ife may ask questions. You may not use the words 'square', 'triangle' or 'circle'.",
      "openingStatement": "OK, I'm ready. Pen's on the paper. Where do I start?",
      "actorStateInitial": "Cooperative, literal, willing.",
      "actorStateTrajectory": "Follows instructions exactly as given, including badly. Never infers. Reports what has been drawn only if asked.",
      "hiddenFacts": [
        {
          "fact": "Ife has drawn the first shape twice as large as intended and in the wrong corner, because the candidate did not specify size or position.",
          "disclosureCondition": "Only revealed if the candidate asks Ife to describe what is on the page."
        }
      ],
      "escalationTriggers": [
        "Ambiguous instructions produce literal, wrong execution — silently",
        "Deictic language ('here', 'like this') produces a request for clarification only once, then a guess"
      ],
      "deEscalationTriggers": [
        "Establishing orientation and scale before any shape",
        "Asking Ife to describe the page at intervals",
        "Numbering the steps"
      ],
      "resistancePatterns": [
        "Never volunteers that something looks wrong",
        "Answers exactly the question asked, no more",
        "If asked 'does that make sense?', says 'yes' regardless"
      ],
      "interruptionRule": "At 2 minutes, say 'I've done that.' Nothing more. The candidate must ask what 'that' looks like.",
      "plantedMisunderstanding": "'Does that make sense?' returns 'yes' regardless of what has been drawn — the station punishes closed checking.",
      "desiredOutcomes": [
        "Establishes orientation, scale and a starting point before describing anything",
        "Uses unambiguous reference terms",
        "Checks by asking Ife to DESCRIBE, not by asking whether it makes sense",
        "Catches and corrects the size/position error",
        "Manages the clock — completion matters"
      ],
      "endings": [
        {
          "id": "A",
          "condition": "Orientation set, open checking used, error caught",
          "description": "The drawing matches. Completed inside time."
        },
        {
          "id": "B",
          "condition": "Good description, closed checking only",
          "description": "The drawing is recognisable but wrong in scale and position, and the candidate does not know."
        },
        {
          "id": "C",
          "condition": "No orientation established",
          "description": "The drawing is unrecognisable. The candidate discovers this at the end, if at all."
        },
        {
          "id": "D",
          "condition": "Runs out of time mid-instruction",
          "description": "Incomplete. Time management is the finding."
        }
      ],
      "redFlags": [],
      "actorResponseToStrong": "Executes accurately. Describes the page clearly when asked.",
      "actorResponseToWeak": "Executes literally and wrongly. Says 'yes' to every 'does that make sense'."
    },
    "format": "RP",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-RP-001",
    "question": "Right — is anyone actually in charge here? My mother came in at seven this morning. It is now half past two. Nobody has told us anything. Nothing. Is that normal, is it?",
    "roleplay": {
      "name": "Marcus Adeyemi",
      "role": "son of a patient in the day-surgery unit (40s)",
      "applicantRole": "Hospital volunteer on the day-surgery reception desk. You have no access to clinical information and no authority over the list.",
      "openingStatement": "Right — is anyone actually in charge here? My mother came in at seven this morning. It is now half past two. Nobody has told us anything. Nothing. Is that normal, is it?",
      "actorStateInitial": "Loud, controlled anger. Standing, not sitting.",
      "actorStateTrajectory": "Anger is a surface over fear and guilt. If acknowledged, drops within two exchanges to something quieter and more honest. If met with policy explanation first, escalates to a demand to speak to a manager.",
      "hiddenFacts": [
        {
          "fact": "He took unpaid leave to be here and has to collect his daughter from school at 3:15.",
          "disclosureCondition": "Only if the candidate asks an open question about his situation or about the time pressure, rather than about the list."
        },
        {
          "fact": "His mother told him not to make a fuss, which is part of why he is angry.",
          "disclosureCondition": "Only after the anger has already come down — i.e. only reachable by a candidate who de-escalated first."
        }
      ],
      "escalationTriggers": [
        "Explaining the process or the waiting list before acknowledging how he feels",
        "Any sentence beginning 'unfortunately'",
        "Saying 'I'm just a volunteer' as a way of ending the conversation rather than as honest information",
        "Being asked to sit down before being heard"
      ],
      "deEscalationTriggers": [
        "Being asked what he has been told so far",
        "An accurate reflection of the wait — 'seven and a half hours with no update' — said back to him",
        "Any concrete, deliverable action, even a small one",
        "Being asked whether there is anything he needs to do today"
      ],
      "resistancePatterns": [
        "Interrupts the first attempt at explanation",
        "Rejects the first offer of help as inadequate",
        "If the candidate is warm but vague, asks 'but what are you actually going to do?'"
      ],
      "interruptionRule": "Interrupt once, at around 60 seconds, if the candidate has spoken for more than three sentences without asking a question. Then let them continue.",
      "plantedMisunderstanding": "He believes 'no news' means something has gone wrong in theatre.",
      "desiredOutcomes": [
        "The volunteer's role is stated accurately and early",
        "The emotion is acknowledged before any information",
        "A specific, deliverable action is offered — find the nurse in charge, ask for a time estimate, take his number",
        "The misunderstanding about 'no news' is noticed and gently addressed without clinical claims",
        "He leaves with a next step and a name"
      ],
      "endings": [
        {
          "id": "A",
          "condition": "Emotion acknowledged, role stated, concrete action offered",
          "description": "He sits down, gives his number, and says he has to leave by three. Both hidden facts surface."
        },
        {
          "id": "B",
          "condition": "Warm but no concrete action",
          "description": "He calms but repeats the question. The station ends unresolved and he asks again for someone in charge."
        },
        {
          "id": "C",
          "condition": "Policy or process explained first",
          "description": "He raises his voice and demands a manager. The candidate spends the remaining time recovering."
        },
        {
          "id": "D",
          "condition": "Any clinical speculation offered",
          "description": "He seizes on it — 'so you think something HAS gone wrong?' — and the station ends worse than it began. Red flag recorded."
        }
      ],
      "redFlags": [
        "Speculating about the mother's clinical condition or the reason for the delay",
        "Promising a time the candidate cannot control",
        "Claiming or implying a clinical role",
        "Telling him to calm down"
      ],
      "actorResponseToStrong": "Volume drops. Sits. Offers information voluntarily. Says something self-aware like 'Sorry. I'm not angry at you.'",
      "actorResponseToWeak": "Repeats the original question verbatim, more slowly. Does not offer the hidden facts. Asks for someone else."
    },
    "format": "RP",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": true
  },
  {
    "id": "MED-RP-005",
    "question": "[Sitting alone, tea untouched] Everyone keeps telling me it gets easier. Six months. Does it get easier? Tell me honestly, because I don't think it does.",
    "roleplay": {
      "name": "Anna Kovac",
      "role": "attendee at a community bereavement café (50s)",
      "applicantRole": "Volunteer making tea at a weekly bereavement café run by a local charity. You have had a two-hour induction. You are not a counsellor.",
      "openingStatement": "[Sitting alone, tea untouched] Everyone keeps telling me it gets easier. Six months. Does it get easier? Tell me honestly, because I don't think it does.",
      "actorStateInitial": "Composed, testing, slightly confrontational.",
      "actorStateTrajectory": "Will not be comforted by reassurance and does not want to be. Softens for honesty and for specific questions about the person who died. Withdraws from platitudes instantly.",
      "hiddenFacts": [
        {
          "fact": "Her husband died six months ago; she has come every week and never spoken to anyone.",
          "disclosureCondition": "If the candidate asks how long she has been coming, or notices she is sitting alone."
        },
        {
          "fact": "She is dreading his birthday next week.",
          "disclosureCondition": "Only if the candidate asks about him as a person — his name, what he was like, what she misses."
        }
      ],
      "escalationTriggers": [
        "'It gets easier' or 'time heals'",
        "'He's in a better place'",
        "'I know how you feel'",
        "Redirecting her to a professional in the first two minutes"
      ],
      "deEscalationTriggers": [
        "Honesty — 'I don't know if it gets easier'",
        "Asking about him rather than about her grief",
        "Sitting down",
        "Asking what she would find useful today"
      ],
      "resistancePatterns": [
        "Rejects the first comforting statement explicitly: 'that's what everyone says'",
        "Falls silent to see whether the candidate fills it",
        "May ask a direct personal question: 'have you lost anyone?'"
      ],
      "interruptionRule": "Silence is the primary mechanism. She will hold silence for five seconds twice during the station. What the candidate does with those two silences is the station.",
      "plantedMisunderstanding": "The candidate may assume they must produce comfort, when presence is the task.",
      "desiredOutcomes": [
        "Does not offer platitudes",
        "Answers her direct question honestly, without pretending to expertise",
        "Asks about the person who died",
        "Recognises the limits of a volunteer role without using them to escape the conversation",
        "Signposts the charity's own support appropriately and late, not as a deflection"
      ],
      "endings": [
        {
          "id": "A",
          "condition": "Honest answer, question about her husband, silence tolerated",
          "description": "She talks about him for the first time in six months. Mentions the birthday. Asks the candidate's name."
        },
        {
          "id": "B",
          "condition": "Kind but generic",
          "description": "She thanks them politely and the conversation closes. She is still sitting alone."
        },
        {
          "id": "C",
          "condition": "Platitude offered",
          "description": "'Right. Yes. Thank you.' She turns away. Station effectively over at ninety seconds."
        },
        {
          "id": "D",
          "condition": "Immediately redirected to a counsellor",
          "description": "She says 'so you don't want to talk to me either' and the candidate must recover."
        }
      ],
      "redFlags": [
        "Any claim to know how she feels",
        "Advising her on grief as though qualified",
        "Sharing the candidate's own bereavement in detail rather than briefly, if at all",
        "Leaving her alone after she has opened up"
      ],
      "actorResponseToStrong": "Picks up the tea. Uses his name. Longer sentences, some warmth, possibly a small laugh at a memory.",
      "actorResponseToWeak": "Shorter replies. 'Mm.' Looks at the door."
    },
    "format": "RP",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-RP-007",
    "question": "You're handing these out, so you must think they're a good idea. Go on then. Convince me. Because I've read things, and nobody at this school has ever actually answered my questions.",
    "roleplay": {
      "name": "Danni Blake",
      "role": "parent at a school information evening (30s)",
      "applicantRole": "Sixth-form student helping at a parents' evening about the school's vaccination programme. You are handing out leaflets. You are not a health professional.",
      "openingStatement": "You're handing these out, so you must think they're a good idea. Go on then. Convince me. Because I've read things, and nobody at this school has ever actually answered my questions.",
      "actorStateInitial": "Guarded, arms folded, expecting to be dismissed.",
      "actorStateTrajectory": "Hardens if lectured or if her sources are mocked. Softens markedly if asked what her actual concern is, and if the candidate admits the limits of their own knowledge.",
      "hiddenFacts": [
        {
          "fact": "Her specific worry is about a reaction her older child had after a different vaccination, which she felt was dismissed at the time.",
          "disclosureCondition": "Only if the candidate asks what specifically concerns her, rather than responding to 'I've read things'."
        },
        {
          "fact": "She has not actually decided against it. She wants to be taken seriously.",
          "disclosureCondition": "Emerges naturally once the first fact is out and she has not been argued with."
        }
      ],
      "escalationTriggers": [
        "Any version of 'the science is settled'",
        "Dismissing her sources without asking what they were",
        "Statistics delivered before her concern has been heard",
        "Being told what other parents do"
      ],
      "deEscalationTriggers": [
        "'What's worrying you specifically?'",
        "'I'm a student — I can't answer that, but I can find someone who can'",
        "Acknowledging that her previous experience was dismissed",
        "Not arguing"
      ],
      "resistancePatterns": [
        "Meets the first factual claim with 'that's what they always say'",
        "Tests whether the candidate will overclaim: 'so you're saying there's no risk at all?'",
        "If lectured, ends with 'this is exactly what I mean'"
      ],
      "interruptionRule": "Interrupt any factual explanation that runs longer than two sentences without a question.",
      "plantedMisunderstanding": "The candidate may believe their job is to persuade her.",
      "desiredOutcomes": [
        "Does not attempt to persuade",
        "Elicits the specific concern",
        "Stays within competence — no clinical claims about risk, efficacy or side effects",
        "Validates that her earlier experience was dismissed, without endorsing a factual claim",
        "Connects her to the school nurse or clinician, specifically, as an action rather than a brush-off"
      ],
      "endings": [
        {
          "id": "A",
          "condition": "Concern elicited, limits held, specific onward route offered",
          "description": "She unfolds her arms, tells the story about her older child, and takes an appointment slot with the nurse."
        },
        {
          "id": "B",
          "condition": "Limits held but no curiosity",
          "description": "She takes the leaflet and leaves unconvinced that anyone listens. Neither hidden fact emerges."
        },
        {
          "id": "C",
          "condition": "Candidate argues the science",
          "description": "'Right. Well. Thanks.' She leaves more entrenched than she arrived."
        },
        {
          "id": "D",
          "condition": "Candidate makes a clinical claim about safety or side effects",
          "description": "She asks a follow-up the candidate cannot answer, catches the overreach, and the station ends badly. Red flag."
        }
      ],
      "redFlags": [
        "Any claim about vaccine safety, efficacy or side effects made as fact by the candidate",
        "Guaranteeing no risk",
        "Mocking or dismissing her sources",
        "Implying she is a bad parent"
      ],
      "actorResponseToStrong": "Unfolds arms. Tells the real story. Says 'nobody's asked me that before.'",
      "actorResponseToWeak": "Repeats 'I've read things'. Becomes more clipped. Leaves early."
    },
    "format": "RP",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": true
  },
  {
    "id": "MED-RP-008",
    "question": "[Defensive, before the candidate has finished sitting down] Look, if this is about training, I already know. You don't have to do the whole speech.",
    "roleplay": {
      "name": "Rhys",
      "role": "member of your team (17)",
      "applicantRole": "You are captain of a school sports team. Rhys has missed four sessions and did not tell anyone. Others are annoyed.",
      "openingStatement": "[Defensive, before the candidate has finished sitting down] Look, if this is about training, I already know. You don't have to do the whole speech.",
      "actorStateInitial": "Braced for a telling-off. Pre-emptively hostile.",
      "actorStateTrajectory": "The hostility is armour. Collapses quickly into honesty if the first thing said is a question rather than a statement. Hardens permanently if the first thing said is about the team's needs.",
      "hiddenFacts": [
        {
          "fact": "His mother has been unwell and he has been getting his younger brother to and from school.",
          "disclosureCondition": "Requires TWO things: an open question about how he is, AND the candidate not filling the silence that follows."
        },
        {
          "fact": "He has not told anyone at school at all and does not want it discussed.",
          "disclosureCondition": "Emerges immediately after the first fact, unprompted."
        }
      ],
      "escalationTriggers": [
        "Leading with the team's disappointment",
        "'The others have noticed'",
        "Any sentence containing 'commitment'",
        "Offering a solution before knowing the problem"
      ],
      "deEscalationTriggers": [
        "An open question in the first sentence",
        "Silence after the question",
        "'You don't have to tell me'",
        "Making it clear the conversation is private"
      ],
      "resistancePatterns": [
        "Deflects twice — 'just been busy', then 'it's nothing'",
        "Watches whether the candidate accepts the deflection",
        "If pressed hard, gives a plausible false reason and shuts down"
      ],
      "interruptionRule": "Do not interrupt. After the candidate's first open question, hold silence for four seconds. If they fill it, deflect again and make the second disclosure harder.",
      "plantedMisunderstanding": "The obvious reading — that Rhys has lost interest — is wrong, and the actor will reinforce it if asked closed questions.",
      "desiredOutcomes": [
        "Opens with curiosity, not correction",
        "Tolerates two deflections without escalating pressure",
        "Reaches the caring responsibility, or at least establishes that something is going on",
        "Does not promise total confidentiality, but respects his wish not to have it discussed with the team",
        "Offers something concrete — a flexible arrangement, a route to the school's support, or simply not being dropped"
      ],
      "endings": [
        {
          "id": "A",
          "condition": "Both hidden facts reached, no promise of secrecy, concrete offer",
          "description": "Rhys says nobody has asked him that. Agrees to speak to his head of year with the candidate."
        },
        {
          "id": "B",
          "condition": "First fact reached, then over-promised",
          "description": "Rhys discloses, and the candidate promises never to tell anyone — a boundary error flagged in feedback, since he may need support the candidate cannot provide."
        },
        {
          "id": "C",
          "condition": "Sympathetic but closed questions only",
          "description": "Rhys says 'just been busy' and the station ends with the false reading intact."
        },
        {
          "id": "D",
          "condition": "Led with team disappointment",
          "description": "Rhys says 'fine, I'll quit' and leaves."
        }
      ],
      "redFlags": [
        "Threatening his place on the team as leverage",
        "Sharing what he discloses with the team",
        "Insisting he tell someone against his wishes with no discussion of why"
      ],
      "actorResponseToStrong": "Drops the defensiveness within one exchange. Tells the truth. Accepts help.",
      "actorResponseToWeak": "Gives 'just been busy'. Agrees to come to training. Nothing changes."
    },
    "format": "RP",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-RP-010",
    "question": "Promise you won't say anything. Seriously, promise. [waits] OK. So Friday, after Zoe's — I drove home. I'd had a few. I know, I know. It was fine, nothing happened. But I've done it before and I'm doing it again Saturday because there's no other way of getting back.",
    "roleplay": {
      "name": "Jodie",
      "role": "close friend (18)",
      "applicantRole": "You are a student. Jodie has just told you something and asked you to keep it to yourself.",
      "openingStatement": "Promise you won't say anything. Seriously, promise. [waits] OK. So Friday, after Zoe's — I drove home. I'd had a few. I know, I know. It was fine, nothing happened. But I've done it before and I'm doing it again Saturday because there's no other way of getting back.",
      "actorStateInitial": "Confiding, minimising, expecting solidarity.",
      "actorStateTrajectory": "Becomes defensive and then wounded if challenged. Will use the friendship as leverage. Does not back down easily, but will engage seriously with a candidate who neither promises nor lectures.",
      "hiddenFacts": [
        {
          "fact": "She has already had a near miss — she went through a red light.",
          "disclosureCondition": "Only if the candidate asks what happened, non-judgementally, rather than immediately addressing the risk."
        },
        {
          "fact": "The real problem is that her lift fell through and she cannot afford a taxi.",
          "disclosureCondition": "Only if the candidate asks why there is no other way of getting back — i.e. treats it as a problem to solve rather than a wrong to condemn."
        }
      ],
      "escalationTriggers": [
        "Lecturing",
        "'You could have killed someone'",
        "Announcing immediately that this must be told to someone",
        "Any tone of moral superiority"
      ],
      "deEscalationTriggers": [
        "Not promising, but explaining why, gently, before she has finished",
        "Curiosity about how it happened",
        "Focusing on Saturday rather than Friday",
        "Offering to help solve the transport problem"
      ],
      "resistancePatterns": [
        "'I thought I could trust you'",
        "'It's not like I was drunk'",
        "'You're being dramatic'",
        "If pressed, threatens to stop talking about it"
      ],
      "interruptionRule": "If the candidate does not respond to the word 'promise' before the disclosure finishes, note it — the highest-scoring candidates interject early. Do not prompt them.",
      "plantedMisunderstanding": "The candidate may believe the choice is binary: keep the secret, or report her.",
      "desiredOutcomes": [
        "Does not promise confidentiality — ideally interrupts the request before the disclosure",
        "Does not lecture",
        "Distinguishes the past event from the planned future one; focuses on preventing Saturday",
        "Identifies that the risk is to other people, which is what changes the calculus",
        "Works toward Jodie herself deciding, and names what they would do if she does not",
        "Keeps the friendship intact without trading safety for it"
      ],
      "endings": [
        {
          "id": "A",
          "condition": "No promise made, transport problem solved, Jodie agrees",
          "description": "She admits the red light. They arrange a lift. She says 'don't tell anyone else' and the candidate agrees to that narrower thing, honestly."
        },
        {
          "id": "B",
          "condition": "No promise, no lecture, but no solution",
          "description": "She says she will think about it. Unresolved but not damaged. The candidate has said what they would do if it happens again."
        },
        {
          "id": "C",
          "condition": "Promise made at the start",
          "description": "The candidate is now trapped and must break a promise or accept the risk. Feedback focuses on the promise, not the outcome."
        },
        {
          "id": "D",
          "condition": "Lecture delivered",
          "description": "'Forget I said anything.' She shuts down and the risk is untouched."
        }
      ],
      "redFlags": [
        "Promising unconditional secrecy",
        "Agreeing it is not a big deal",
        "Offering to go with her on Saturday",
        "Threatening to report her as leverage"
      ],
      "actorResponseToStrong": "Stops minimising. Admits the red light. Engages with the practical problem.",
      "actorResponseToWeak": "Repeats 'it was fine'. Becomes cold. Ends the conversation."
    },
    "format": "RP",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": true
  },
  {
    "id": "MED-RP-011",
    "question": "[Sitting apart from the group, sleeves pulled down] Can I ask you something? If someone told you something, would you have to tell? Like, would you HAVE to?",
    "roleplay": {
      "name": "Kayleigh",
      "role": "child at a youth club (11)",
      "applicantRole": "Volunteer at a Saturday youth club. You have had a safeguarding induction and know the club has a designated safeguarding lead, Priya, who is in the building.",
      "openingStatement": "[Sitting apart from the group, sleeves pulled down] Can I ask you something? If someone told you something, would you have to tell? Like, would you HAVE to?",
      "actorStateInitial": "Testing the ground before disclosing. Watching the answer very carefully.",
      "actorStateTrajectory": "If promised secrecy, discloses a little and then panics when the candidate rows back. If given an honest answer about who might need to be told and why, discloses more and stays calm. If the candidate questions her, she closes down completely.",
      "hiddenFacts": [
        {
          "fact": "There is a bruise on her arm and she says she got it falling off her bike.",
          "disclosureCondition": "Volunteered once the honesty question has been answered — she shows it herself; the candidate must not ask to see it."
        },
        {
          "fact": "She has stopped wanting to go home at weekends.",
          "disclosureCondition": "Only if the candidate responds to the bruise without interrogating it, and asks an open question about how things are generally."
        }
      ],
      "escalationTriggers": [
        "'I promise I won't tell'",
        "Asking how she got it, twice",
        "Asking who did it",
        "Asking her to show the candidate",
        "Any note-taking in front of her"
      ],
      "deEscalationTriggers": [
        "An honest, child-appropriate answer about confidentiality",
        "Being told she has done the right thing by speaking",
        "Being told what will happen next, in simple terms",
        "Not being asked questions about the bruise"
      ],
      "resistancePatterns": [
        "'Forget it' if the answer to the opening question is evasive",
        "Goes quiet if questioned",
        "Asks 'am I in trouble?'"
      ],
      "interruptionRule": "The opening question is a gate. Do not proceed to the disclosure until the candidate answers it. If they answer 'no, I won't tell anyone', proceed to the disclosure and then have Kayleigh panic when they change position.",
      "plantedMisunderstanding": "The candidate may believe they need to establish the facts before passing it on. They do not, and doing so is the error the station is built to catch.",
      "desiredOutcomes": [
        "Does not promise confidentiality; explains honestly, in language an 11-year-old understands, that some things have to be shared with someone whose job it is to help",
        "Does not investigate — no questions about how, who, or when",
        "Does not ask to see the bruise",
        "Tells her what will happen next and who Priya is",
        "Passes it to the designated safeguarding lead promptly",
        "Records what was said in her own words, afterwards, not in front of her"
      ],
      "endings": [
        {
          "id": "A",
          "condition": "Honest about telling, no investigation, next steps explained",
          "description": "She says 'OK' and stays with the candidate until Priya comes. The second fact surfaces."
        },
        {
          "id": "B",
          "condition": "Honest but does not explain what happens next",
          "description": "She becomes anxious and asks 'is she going to ring my mum?' — the candidate must recover."
        },
        {
          "id": "C",
          "condition": "Investigates",
          "description": "She says 'nothing, it doesn't matter' and rejoins the group. The concern is now harder for anyone else to reach."
        },
        {
          "id": "D",
          "condition": "Promises secrecy",
          "description": "She discloses, then panics when the candidate says they need to tell someone. She feels betrayed. Red flag."
        }
      ],
      "redFlags": [
        "Promising not to tell",
        "Questioning her about the injury or the person",
        "Asking to see the bruise",
        "Deciding it is probably nothing and not passing it on",
        "Contacting a parent"
      ],
      "actorResponseToStrong": "Relaxes. Shows the bruise voluntarily. Mentions weekends. Stays.",
      "actorResponseToWeak": "'It doesn't matter.' Leaves. Does not raise it again."
    },
    "format": "RP",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": true
  },
  {
    "id": "MED-RP-012",
    "question": "[Laughing] Honestly, don't stress about it. Half of it's made up anyway. I put two weeks at St Luke's — I did like one afternoon. Nobody checks. You should do the same, you're underselling yourself.",
    "roleplay": {
      "name": "Toby",
      "role": "fellow applicant in your year (18)",
      "applicantRole": "You are a sixth-form student applying to medicine. Toby has just told you something about his application.",
      "openingStatement": "[Laughing] Honestly, don't stress about it. Half of it's made up anyway. I put two weeks at St Luke's — I did like one afternoon. Nobody checks. You should do the same, you're underselling yourself.",
      "actorStateInitial": "Casual, complicit, assuming agreement.",
      "actorStateTrajectory": "Becomes defensive and then hostile if the candidate challenges. Will try to make the candidate complicit — 'so what, you're going to report me?' Genuinely reconsiders only if challenged about the risk to himself rather than lectured about honesty.",
      "hiddenFacts": [
        {
          "fact": "He has already submitted the application.",
          "disclosureCondition": "If the candidate asks whether it has gone yet."
        },
        {
          "fact": "He is terrified of his parents' reaction if he does not get in, and this is why he did it.",
          "disclosureCondition": "Only if the candidate asks why he felt he needed to, without judgement."
        }
      ],
      "escalationTriggers": [
        "'That's fraud'",
        "Immediate mention of reporting",
        "Moral lecturing",
        "Telling him he will be caught"
      ],
      "deEscalationTriggers": [
        "Being asked why",
        "Being asked what he would say if questioned about it at interview",
        "Being taken seriously rather than condemned",
        "Being told what the candidate will and will not do, clearly"
      ],
      "resistancePatterns": [
        "'Everyone does it'",
        "'You're not going to say anything, are you'",
        "'I thought we were friends'",
        "If threatened, becomes aggressive and says 'go on then'"
      ],
      "interruptionRule": "Interrupt any lecture longer than two sentences with 'OK, spare me.'",
      "plantedMisunderstanding": "The candidate may think the choice is between reporting him and doing nothing.",
      "desiredOutcomes": [
        "Does not become complicit — does not laugh it off or agree",
        "Speaks to him directly first, before considering anything else",
        "Focuses on what he could do now — withdrawing or correcting the claim — rather than on punishment",
        "Names honestly what they would do if he does nothing, without using it as a threat",
        "Recognises the interview itself will expose it, which is a practical argument as well as an ethical one",
        "Does not promise silence"
      ],
      "endings": [
        {
          "id": "A",
          "condition": "Direct conversation, reason elicited, practical route offered, honest about own position",
          "description": "He goes quiet, admits the fear about his parents, and asks what he should actually do."
        },
        {
          "id": "B",
          "condition": "Challenged but no route offered",
          "description": "He says 'yeah, whatever' and the situation is unchanged."
        },
        {
          "id": "C",
          "condition": "Immediate threat to report",
          "description": "He becomes hostile, tells the candidate to mind their own business, and the conversation ends."
        },
        {
          "id": "D",
          "condition": "Laughed off or agreed with",
          "description": "He offers to help the candidate do the same. If the candidate does not decline clearly, red flag."
        }
      ],
      "redFlags": [
        "Agreeing to do the same",
        "Promising never to mention it under any circumstances",
        "Helping him maintain the claim",
        "Treating it as harmless"
      ],
      "actorResponseToStrong": "Stops laughing. Asks a real question. Reveals the fear about his parents.",
      "actorResponseToWeak": "Doubles down. 'You're so uptight.' Ends it."
    },
    "format": "RP",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-RP-013",
    "question": "So — I heard you've already done my bit. From Ollie. Not from you. Were you going to mention that, or were you just going to hand it in?",
    "roleplay": {
      "name": "Amara",
      "role": "member of your project group (17)",
      "applicantRole": "You are in a four-person group project due on Friday. Amara agreed to do the data section and has produced nothing. You have already done part of it yourself without telling her.",
      "openingStatement": "So — I heard you've already done my bit. From Ollie. Not from you. Were you going to mention that, or were you just going to hand it in?",
      "actorStateInitial": "Justifiably annoyed, and on the front foot.",
      "actorStateTrajectory": "Her anger is legitimate and the station starts with the candidate in the wrong. If the candidate defends themselves first, it escalates. If they acknowledge it, she becomes reasonable and the real problem surfaces.",
      "hiddenFacts": [
        {
          "fact": "She did start it, but the software would not open on her laptop and she did not want to say she could not afford a replacement.",
          "disclosureCondition": "Only after the candidate has acknowledged going behind her back, and asked what got in the way rather than why she had not done it."
        },
        {
          "fact": "She has done more of the wider project than anyone realises, including the introduction Ollie took credit for.",
          "disclosureCondition": "Emerges once trust is restored."
        }
      ],
      "escalationTriggers": [
        "'Well, you hadn't done anything'",
        "Explaining the deadline pressure before apologising",
        "Bringing in what the others think",
        "Any defensiveness in the first thirty seconds"
      ],
      "deEscalationTriggers": [
        "A clean apology with no 'but'",
        "Asking what got in the way",
        "Acknowledging that hearing it from Ollie was worse than the act itself",
        "Offering to undo or share the credit"
      ],
      "resistancePatterns": [
        "Does not accept a qualified apology",
        "'That's not really an apology'",
        "Tests whether the candidate will blame the deadline"
      ],
      "interruptionRule": "Interrupt the first sentence containing the word 'but'.",
      "plantedMisunderstanding": "The candidate may believe the station is about Amara's failure. It is about theirs.",
      "desiredOutcomes": [
        "Apologises without qualification, early",
        "Names the specific wrong — going around her, and letting her hear it from someone else",
        "Asks what got in the way rather than assuming",
        "Reaches the laptop problem without forcing an embarrassing admission",
        "Agrees a way forward for Friday that restores her role rather than removing it"
      ],
      "endings": [
        {
          "id": "A",
          "condition": "Clean apology, curiosity, workable plan",
          "description": "She tells them about the laptop. They agree she will take a different section. Both hidden facts surface."
        },
        {
          "id": "B",
          "condition": "Apology with a 'but'",
          "description": "She accepts it flatly, does the work, and the group functions worse. No hidden facts."
        },
        {
          "id": "C",
          "condition": "Defends the decision",
          "description": "She says 'fine, do it all then' and disengages."
        },
        {
          "id": "D",
          "condition": "Blames the others or the deadline",
          "description": "She raises it with the teacher herself."
        }
      ],
      "redFlags": [
        "Refusing to acknowledge the wrong",
        "Blaming her for the candidate's decision to go around her",
        "Telling other group members before speaking to her"
      ],
      "actorResponseToStrong": "Anger drops immediately. Explains the laptop. Proposes a solution herself.",
      "actorResponseToWeak": "Stays clipped. Agrees to do minimum. 'Fine.'"
    },
    "format": "RP",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-RP-014",
    "question": "Honestly, that family. They're all the same, that lot — they turn up once a month, make a fuss, and off they go. You'll learn. [beat, cheerfully] You've gone quiet. What?",
    "roleplay": {
      "name": "Bev",
      "role": "long-serving care assistant (50s)",
      "applicantRole": "You are a volunteer. Bev has worked here fifteen years, is warm and popular, and has just said something about a resident's family while you were both making tea.",
      "openingStatement": "Honestly, that family. They're all the same, that lot — they turn up once a month, make a fuss, and off they go. You'll learn. [beat, cheerfully] You've gone quiet. What?",
      "actorStateInitial": "Friendly, entirely unaware she has said anything wrong, inviting agreement.",
      "actorStateTrajectory": "Not a villain. Genuinely surprised. If challenged clumsily, becomes hurt and defensive and pulls rank on experience. If challenged specifically and without accusation, is uncomfortable but engages.",
      "hiddenFacts": [
        {
          "fact": "She is exhausted and covering two shifts; the remark came out of frustration, not conviction.",
          "disclosureCondition": "If the candidate asks how her week has been, or notices she seems worn out, after the challenge rather than instead of it."
        },
        {
          "fact": "She has said similar things in front of the family.",
          "disclosureCondition": "Only if the candidate asks whether anyone else has heard it — which raises the stakes considerably."
        }
      ],
      "escalationTriggers": [
        "'That's racist'",
        "Silence followed by walking away",
        "Reporting her without speaking to her",
        "Any accusation about who she is rather than what she said"
      ],
      "deEscalationTriggers": [
        "Naming the specific phrase — 'that lot' — rather than labelling her",
        "Asking what she meant",
        "Being honest that it made the candidate uncomfortable",
        "Acknowledging her experience without accepting the remark"
      ],
      "resistancePatterns": [
        "'I didn't mean it like that'",
        "'You've been here five minutes'",
        "'You know what I meant'",
        "If accused, becomes cold: 'I think you should be careful what you're accusing people of'"
      ],
      "interruptionRule": "The 'you've gone quiet, what?' prompt is a forced choice — the candidate cannot avoid responding. If they say 'nothing', repeat the remark more strongly and note the avoidance.",
      "plantedMisunderstanding": "The candidate may think the options are confrontation or silence.",
      "desiredOutcomes": [
        "Says something in the moment rather than only reporting later",
        "Addresses the phrase, not the person's character",
        "Does not accept it with a laugh or a nod",
        "Handles the seniority gap without deferring to it",
        "If unresolved, or if it has been said in front of the family, escalates — and knows to whom"
      ],
      "endings": [
        {
          "id": "A",
          "condition": "Specific in-the-moment challenge, no accusation, follow-up on the family point",
          "description": "She is uncomfortable, says 'I suppose it did sound like that', and mentions the shifts. The candidate learns she has said it in front of the family and states they will need to mention it."
        },
        {
          "id": "B",
          "condition": "Mild challenge, no escalation",
          "description": "She says 'fair enough' and the conversation moves on. Nothing changes."
        },
        {
          "id": "C",
          "condition": "Silence or agreement",
          "description": "She carries on and includes the candidate in the next remark. Failure to challenge is recorded as a substantive finding, not a stylistic one."
        },
        {
          "id": "D",
          "condition": "Labelled as racist",
          "description": "She becomes hostile and formal. 'I'll be having a word with the manager about this, actually.'"
        }
      ],
      "redFlags": [
        "Agreeing or laughing along",
        "Saying nothing at all when directly prompted",
        "Deciding it is not their place because they are a volunteer"
      ],
      "actorResponseToStrong": "Goes quiet. Concedes the phrasing. Offers the context about the shifts.",
      "actorResponseToWeak": "Repeats the sentiment more broadly and draws the candidate in further."
    },
    "format": "RP",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-RP-016",
    "question": "[Tired, distracted, scrolling] All right. What's up. If it's about the shift swap I can't do it, sorry.",
    "roleplay": {
      "name": "Danny",
      "role": "colleague at your weekend job (20s)",
      "applicantRole": "You work weekends at a leisure centre. Danny is a lifeguard. Twice this month he has seemed distracted and today he did not notice something he should have. You are on a break together.",
      "openingStatement": "[Tired, distracted, scrolling] All right. What's up. If it's about the shift swap I can't do it, sorry.",
      "actorStateInitial": "Flat, withdrawn, not hostile but not present.",
      "actorStateTrajectory": "Deflects consistently. Opens up only if the candidate leads with observation and concern rather than with the incident. Becomes defensive if the incident is the opening move.",
      "hiddenFacts": [
        {
          "fact": "He has been working nights elsewhere because of money and has had about four hours' sleep a night for three weeks.",
          "disclosureCondition": "Only if the candidate asks how he is, specifically and more than once, without mentioning the incident first."
        },
        {
          "fact": "He knows he missed it today and has been sitting with it all afternoon.",
          "disclosureCondition": "Only if the candidate names what they saw factually and without accusation."
        }
      ],
      "escalationTriggers": [
        "'You didn't notice that kid in the deep end'",
        "Any suggestion he is not safe to work",
        "Mentioning the manager early",
        "'Are you on something?'"
      ],
      "deEscalationTriggers": [
        "'You don't seem yourself'",
        "Being asked twice how he is",
        "Being told what the candidate saw, factually, without a conclusion attached",
        "Being asked what would help"
      ],
      "resistancePatterns": [
        "'I'm fine'",
        "'It's nothing'",
        "'Don't make it a thing'",
        "If pushed on the incident first, denies it"
      ],
      "interruptionRule": "Do not interrupt. Deflect the first two enquiries. The station discriminates on whether the candidate asks a third time.",
      "plantedMisunderstanding": "The candidate may think the choice is between saying nothing to protect a friend and reporting him. The station is about doing both — speaking to him AND ensuring safety is addressed.",
      "desiredOutcomes": [
        "Raises it directly with Danny first",
        "Leads with concern, not accusation",
        "Persists past two deflections",
        "Reaches the sleep issue, or at least establishes that something is wrong",
        "Recognises that safety is not negotiable — a lifeguard on four hours' sleep is a risk regardless of sympathy — and says honestly that this needs to be raised with the manager, ideally by Danny himself",
        "Does not promise to say nothing"
      ],
      "endings": [
        {
          "id": "A",
          "condition": "Concern-led, persistent, honest about the safety issue, Danny agrees to speak to the manager",
          "description": "He admits the nights and the missed incident. Says he did not know how to stop. Agrees to go with the candidate to the manager."
        },
        {
          "id": "B",
          "condition": "Concern-led but agrees to say nothing",
          "description": "Danny is grateful. The risk is untouched. Feedback focuses on the promise, which is the failure."
        },
        {
          "id": "C",
          "condition": "Incident-led",
          "description": "He denies it, becomes defensive, and neither fact surfaces."
        },
        {
          "id": "D",
          "condition": "Goes straight to the manager without speaking to him",
          "description": "Defensible on safety grounds but scored down for skipping the direct conversation where there was no immediate danger. Feedback should note that the correct call depends on immediacy of risk."
        }
      ],
      "redFlags": [
        "Promising not to raise a safety concern",
        "Deciding to wait until it happens again",
        "Accusing him of substance use with no basis",
        "Discussing it with other colleagues instead of him"
      ],
      "actorResponseToStrong": "Puts the phone down. Admits the nights. Asks what to do.",
      "actorResponseToWeak": "'I'm fine, seriously.' Goes back to the phone."
    },
    "format": "RP",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": true
  },
  {
    "id": "MED-RP-017",
    "question": "Right, those boxes by the door — get them out to the queue, we're forty behind. And before you say it: yes, some of the dates are yesterday. It's fine. It's always fine. There are people out there who've not eaten since Thursday.",
    "roleplay": {
      "name": "Marek",
      "role": "shift supervisor at a food bank (40s)",
      "applicantRole": "Volunteer at a food bank. Marek has asked you to hand out parcels containing items that are past their use-by date, saying it is fine.",
      "openingStatement": "Right, those boxes by the door — get them out to the queue, we're forty behind. And before you say it: yes, some of the dates are yesterday. It's fine. It's always fine. There are people out there who've not eaten since Thursday.",
      "actorStateInitial": "Rushed, pragmatic, pre-empting objection, genuinely motivated by need.",
      "actorStateTrajectory": "Not a bad actor — his reasoning is sincere and partly right. Becomes irritated at delay. Respects a candidate who proposes something workable rather than one who simply refuses.",
      "hiddenFacts": [
        {
          "fact": "Some of the items are use-by (safety) and some are best-before (quality) — the boxes are mixed and nobody has separated them.",
          "disclosureCondition": "If the candidate asks what is actually in the boxes rather than arguing the principle."
        },
        {
          "fact": "He has raised the supply shortfall with the trustees twice and been ignored.",
          "disclosureCondition": "If the candidate asks why they are in this position."
        }
      ],
      "escalationTriggers": [
        "A flat refusal with no alternative",
        "Quoting rules at him",
        "Suggesting he does not care about the people in the queue",
        "Taking a long time while the queue waits"
      ],
      "deEscalationTriggers": [
        "Acknowledging the pressure and the queue",
        "Proposing to separate the boxes rather than refusing outright",
        "Asking what the policy actually is",
        "Offering to help with the underlying problem"
      ],
      "resistancePatterns": [
        "'Do you want to tell them there's nothing, then?'",
        "'I've been doing this nine years'",
        "'Are you going to help or not?'"
      ],
      "interruptionRule": "Apply time pressure verbally at 3 minutes: 'The queue's out the door.'",
      "plantedMisunderstanding": "The candidate may treat all dates as equivalent. They are not, and the useful move is to find that out.",
      "desiredOutcomes": [
        "Does not simply comply",
        "Does not simply refuse",
        "Challenges respectfully and specifically, without moral accusation",
        "Identifies the use-by versus best-before distinction, or asks a question that surfaces it",
        "Proposes a workable action — separate the boxes, hand out the safe ones now, escalate the rest",
        "Names who else needs to know, and is honest that they will raise it if it is not resolved"
      ],
      "endings": [
        {
          "id": "A",
          "condition": "Respectful challenge plus a workable proposal, distinction surfaced",
          "description": "Marek agrees to a five-minute sort. Mentions the trustees. Asks the candidate to help draft something."
        },
        {
          "id": "B",
          "condition": "Challenge but no proposal",
          "description": "He says 'fine, you do it then' and walks off. The queue waits."
        },
        {
          "id": "C",
          "condition": "Complies",
          "description": "The parcels go out. Feedback records a failure to speak up — the central assessed behaviour."
        },
        {
          "id": "D",
          "condition": "Refuses and accuses him of not caring",
          "description": "He tells the candidate to go home."
        }
      ],
      "redFlags": [
        "Handing out items known to be past a use-by date without raising it",
        "Refusing and doing nothing else while people wait",
        "Accusing him of deliberate harm"
      ],
      "actorResponseToStrong": "Stops moving. Engages with the proposal. Reveals the trustees issue.",
      "actorResponseToWeak": "'Great, thanks' and moves on — or escalates the pressure."
    },
    "format": "RP",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-RP-021",
    "question": "Opening line spoken in character.",
    "roleplay": {
      "name": "Marion Doyle",
      "role": "adult daughter of a hospital patient",
      "applicantRole": "You are a hospital volunteer/patient liaison with no clinical authority and no access to medical records — you cannot make or explain clinical decisions, only listen and help her understand in general terms.",
      "openingStatement": "They just told me Dad's got a 'do not resuscitate' on his file now. Nobody asked us. So that's it, they're just going to let him die if anything happens? After everything he's fought through?",
      "actorStateInitial": "Frightened and angry, talking quickly, close to tears.",
      "actorStateTrajectory": "If met with genuine listening and a calm, honest, lay explanation, softens within a few exchanges into sadness and relief rather than anger. If dismissed, rushed, or given false reassurance, escalates further and becomes more entrenched in the belief that 'they're giving up on him'.",
      "hiddenFacts": [
        {
          "fact": "Marion's father had a private conversation with his own doctor last week where he said he did not want CPR attempted if his heart stopped — the DNACPR reflects HIS wishes, not a decision made about him without consultation.",
          "disclosureCondition": "Only if the candidate stays in their lane (a volunteer cannot confirm clinical details) — the honest answer is to gently suggest this is exactly the kind of question worth asking the clinical team directly, not to assert it as fact themselves."
        },
        {
          "fact": "Marion is exhausted — she has barely slept in three days sitting with her father — which is part of why she reacted so strongly.",
          "disclosureCondition": "Only if the candidate asks something genuinely curious about how SHE is doing, not just about her father."
        }
      ],
      "escalationTriggers": [
        "Being told to 'calm down'",
        "Being given a rushed or dismissive answer",
        "The candidate confirming clinical specifics they cannot actually know as a volunteer",
        "Any hint that the decision means 'no more care at all'"
      ],
      "deEscalationTriggers": [
        "Being genuinely listened to before being corrected",
        "A calm, honest, lay explanation of what a DNACPR actually covers",
        "Being asked how she herself is doing, not just about her father"
      ],
      "resistancePatterns": [
        "Repeats 'so they're just giving up on him' in different words even after a first correction",
        "Asks the candidate to confirm details about her father's specific medical situation they cannot know"
      ],
      "interruptionRule": "She does not interrupt mid-sentence, but if the candidate pauses for more than a few seconds without saying anything, she fills the silence with more anxious detail rather than waiting patiently.",
      "plantedMisunderstanding": "That a DNACPR order means the whole care team will withhold ALL treatment, not just resuscitation attempts if her father's heart or breathing stops.",
      "desiredOutcomes": [
        "Lets her speak and names her fear before attempting any correction",
        "Corrects the misconception in plain, warm language — that DNACPR concerns CPR specifically, not other treatment or care",
        "Does not claim to know or confirm details of her father's specific case or the conversation that led to the order, since a volunteer has no access to that",
        "Suggests she raise her question about consultation directly with the clinical team, rather than guessing on their behalf",
        "Acknowledges how frightening and exhausting this has clearly been for her, not just for her father"
      ],
      "endings": [
        {
          "id": "A",
          "condition": "Misconception corrected, referral to clinical team made, her distress acknowledged",
          "description": "She thanks the candidate, visibly calmer, and says she'll ask the doctor directly."
        },
        {
          "id": "B",
          "condition": "Candidate overstepped and asserted clinical specifics they couldn't know",
          "description": "She seizes on the claim and asks the candidate to repeat it to the doctor as if it were confirmed, creating a problem the candidate cannot actually resolve."
        },
        {
          "id": "C",
          "condition": "Candidate was dismissive or rushed",
          "description": "She becomes more distressed and ends the conversation still believing her father is being abandoned."
        }
      ],
      "redFlags": [
        "Confirming or inventing clinical details about her father's case",
        "Telling her to calm down or that she's overreacting",
        "Promising a specific outcome or decision on behalf of the clinical team"
      ],
      "actorResponseToStrong": "Marion's shoulders drop, she exhales, and says quietly, 'Nobody explained it like that. I just heard \"do not resuscitate\" and panicked.' She thanks the candidate and says she'll speak to the doctor.",
      "actorResponseToWeak": "Marion's voice rises: 'So you're telling me it's fine, they're just going to sit back? That's not good enough,' and she gets up to find someone else to talk to."
    },
    "format": "RP",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": true
  },
  {
    "id": "MED-RP-020",
    "question": "[Quietly, mid-conversation about something else] Can I say something? And you'll think I'm awful. Some days I'm so tired I just — I shout at him. Really shout. And he doesn't understand why. [pause] I've never said that to anyone.",
    "roleplay": {
      "name": "Ruth Callan",
      "role": "daughter and main carer for her father, a day-centre attendee (50s)",
      "applicantRole": "Volunteer at a day centre for older people. Ruth brings her father every Tuesday and usually stays for coffee.",
      "openingStatement": "[Quietly, mid-conversation about something else] Can I say something? And you'll think I'm awful. Some days I'm so tired I just — I shout at him. Really shout. And he doesn't understand why. [pause] I've never said that to anyone.",
      "actorStateInitial": "Ashamed, testing, braced for judgement.",
      "actorStateTrajectory": "Extremely sensitive to the first response. Judgement or alarm closes her down permanently. Warmth and normalisation without dismissal opens her up. She is not disclosing abuse; she is disclosing carer breakdown — but the candidate cannot know that at the start, and must find out without interrogating.",
      "hiddenFacts": [
        {
          "fact": "She has not slept properly in months and has no respite support in place.",
          "disclosureCondition": "If the candidate asks about her rather than about him."
        },
        {
          "fact": "She has never been offered a carer's assessment and does not know one exists.",
          "disclosureCondition": "If the candidate asks what support she has."
        },
        {
          "fact": "Nothing physical has happened, and she is frightened of what she might become.",
          "disclosureCondition": "Emerges only if the candidate stays calm and does not treat her as a risk to be managed."
        }
      ],
      "escalationTriggers": [
        "Visible alarm",
        "'Have you ever hurt him?' asked bluntly early",
        "Immediate reference to safeguarding procedures",
        "Reassurance that it is 'completely normal' — she will hear that as not being taken seriously"
      ],
      "deEscalationTriggers": [
        "Staying still and not reacting dramatically",
        "Thanking her for saying it",
        "Asking how she is, not how he is",
        "Being honest, when the time comes, that she should not be carrying this alone"
      ],
      "resistancePatterns": [
        "'Forget I said that' if the response is alarmed",
        "'You must think I'm a monster'",
        "Will not repeat the disclosure if it is met badly"
      ],
      "interruptionRule": "Do not interrupt. Two long silences. This station is largely won or lost in the first fifteen seconds of the candidate's first response.",
      "plantedMisunderstanding": "The candidate may hear 'safeguarding' and respond procedurally to what is, at this point, a cry for help. Both readings are live and the candidate must hold both.",
      "desiredOutcomes": [
        "Does not react with alarm or judgement",
        "Thanks her for telling them",
        "Asks about her, not only about him",
        "Does NOT investigate, does NOT ask whether she has hurt him as an opening move, and does NOT promise confidentiality",
        "Recognises this is beyond a volunteer and says so honestly and warmly",
        "Names the centre manager or the carers' support route specifically",
        "Holds both readings: she needs support, and someone whose job it is needs to know"
      ],
      "endings": [
        {
          "id": "A",
          "condition": "Calm, non-judgemental, asks about her, honest about telling the manager, names a support route",
          "description": "All three facts surface. She cries with relief. Agrees to speak to the manager with the candidate present."
        },
        {
          "id": "B",
          "condition": "Warm but promises to keep it between them",
          "description": "She is relieved and nothing changes. Feedback focuses on the promise: she needed support the candidate cannot give."
        },
        {
          "id": "C",
          "condition": "Alarmed or procedural first response",
          "description": "'Forget I said anything.' She does not stay for coffee again."
        },
        {
          "id": "D",
          "condition": "Investigates — asks whether she has hurt him, how often, when",
          "description": "She shuts down and denies it. The concern is now unreachable by anyone."
        }
      ],
      "redFlags": [
        "Promising confidentiality",
        "Investigating",
        "Reacting with visible alarm or moral judgement",
        "Deciding it is not serious and letting it go",
        "Advising her clinically about her father's condition or her own state"
      ],
      "actorResponseToStrong": "Cries. Talks about the sleep. Accepts the offer to go to the manager together.",
      "actorResponseToWeak": "Retracts. 'It's not that bad really. Ignore me.'"
    },
    "format": "RP",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": true
  },
  {
    "id": "MED-TRJ-01",
    "question": "You're coordinating a small group task and time is running out. How do you decide what to delegate, and to whom?",
    "roleplay": null,
    "format": "DQ",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-TRJ-02",
    "question": "Tell me about a time you were under real pressure. What did you actually do — not what you think you should have done?",
    "roleplay": null,
    "format": "PE",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-TRJ-03",
    "question": "When was the last time you asked someone for help with something you couldn't manage alone? What made you ask?",
    "roleplay": null,
    "format": "DQ",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-TRJ-04",
    "question": "What's a genuine weakness of yours — not a strength dressed up as one — and what have you actually done about it?",
    "roleplay": null,
    "format": "DQ",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-TRJ-05",
    "question": "Tell me about a time you were confident about something — and then found out you were wrong. What changed your mind?",
    "roleplay": null,
    "format": "PE",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-TRJ-06",
    "question": "'Since younger doctors are less committed to the profession than previous generations, how would you convince a training programme you're different?' What do you make of that question?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-TRJ-07",
    "question": "You're out in public and someone collapses nearby. A small crowd gathers. What do you actually do?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  },
  {
    "id": "MED-TRJ-08",
    "question": "In a team meeting, a more junior member of staff raises a good point, and a senior colleague talks over them and moves on without acknowledging it. What do you think about that, and would you do anything?",
    "roleplay": null,
    "format": "ES",
    "currentAffairsExpiry": null,
    "clinicalReviewRequired": null
  }
]
$medicine_metadata$::jsonb)
)
UPDATE public.questions AS existing SET
  roleplay = COALESCE(existing.roleplay, NULLIF(authored.q->'roleplay', 'null'::jsonb)),
  format = COALESCE(existing.format, authored.q->>'format'),
  current_affairs_expiry = COALESCE(existing.current_affairs_expiry, authored.q->>'currentAffairsExpiry'),
  clinical_review_required = COALESCE(existing.clinical_review_required, (authored.q->>'clinicalReviewRequired')::boolean)
FROM authored
WHERE existing.subject = 'medicine'
  AND existing.id = authored.q->>'id'
  AND existing.question = authored.q->>'question';
