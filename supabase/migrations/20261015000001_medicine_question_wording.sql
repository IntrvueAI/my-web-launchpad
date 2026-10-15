-- Reviewer wording fixes: every scenario states the candidate's role, and motivation questions are
-- open rather than leading. Each update applies only while the original wording is unchanged, so an
-- edit made in Admin > Questions is never overwritten and re-running this file changes nothing.

UPDATE public.questions SET
  question = $q$You are the GP running a busy morning clinic, with only three appointment slots left before lunch and four patients waiting: a child with a mild fever and a rash that started this morning; a man in his 70s with sudden chest pain that started twenty minutes ago; a woman asking for a repeat prescription she's collected many times before; and a teenager who twisted their ankle playing sport yesterday and can now walk on it. How would you prioritise seeing them?$q$,
  updated_at = now()
WHERE id = 'MED-D1' AND subject = 'medicine' AND question = $o$You're helping run a busy GP morning clinic with only three appointment slots left before lunch, but four patients waiting: a child with a mild fever and a rash that started this morning; a man in his 70s with sudden chest pain that started twenty minutes ago; a woman asking for a repeat prescription she's collected many times before; and a teenager who twisted their ankle playing sport yesterday and can now walk on it. How would you prioritise seeing them?$o$;

UPDATE public.questions SET
  question = $q$You are a GP. A 15-year-old comes to see you alone and asks about getting tested for a sexually transmitted infection. She says she doesn't want her parents to know. What would you do?$q$,
  updated_at = now()
WHERE id = 'MED-E2' AND subject = 'medicine' AND question = $o$A 15-year-old comes to see you alone and asks about getting tested for a sexually transmitted infection. She says she doesn't want her parents to know. As a doctor, what would you do?$o$;

UPDATE public.questions SET
  question = $q$You are a junior doctor on a hospital ward. A patient you have been looking after asks you directly whether they are going to die from their illness. The senior team believes the condition is very likely terminal, and nobody has discussed this with the patient yet. What do you say, and what would you do next?$q$,
  answer = $a$Discussion question — there is no single correct verdict. A strong answer is honest without giving false reassurance, responds to the question with compassion, explores what the patient already understands and how much they want to know, and recognises that a junior doctor should involve the senior team promptly so the patient has a proper, planned conversation rather than having their question avoided.$a$,
  rubric = $r${"strong": "Neither lies nor gives false reassurance; responds with compassion, explores the patient's understanding and wishes, and arranges a prompt, planned conversation with the senior team while acknowledging the patient's concern in the moment.", "developing": "Says they would be honest or would involve a senior, but shows little thought about how to respond to the patient in the moment.", "weak": "Gives false reassurance, avoids the question entirely, or delivers a terminal prognosis bluntly without involving the senior team or checking what the patient wants to know."}$r$::jsonb,
  updated_at = now()
WHERE id = 'MED-E6' AND subject = 'medicine' AND question = $o$A patient looks at you and asks whether they are going to die from this. You believe the honest answer is that their condition is very likely terminal. What do you say?$o$;

UPDATE public.questions SET
  question = $q$You are a junior doctor. Before a shift, you notice that a senior colleague seems to smell of alcohol and their behaviour is slightly off. You have no proof, just a strong suspicion. What do you do?$q$,
  updated_at = now()
WHERE id = 'MED-E10' AND subject = 'medicine' AND question = $o$You notice a senior colleague seems to be smelling of alcohol before a shift, and their behaviour is slightly off. You have no proof, just a strong suspicion. What do you do?$o$;

UPDATE public.questions SET
  question = $q$You are a junior doctor. After a successful treatment, a patient you've cared for wants to give you an expensive gift as a thank-you, and seems genuinely hurt when you hesitate. How would you handle it?$q$,
  updated_at = now()
WHERE id = 'MED-E11' AND subject = 'medicine' AND question = $o$After a successful treatment, a patient you've cared for wants to give you an expensive gift as a thank-you, and seems genuinely hurt when you hesitate. How would you handle it?$o$;

UPDATE public.questions SET
  question = $q$Why do you want to study medicine?$q$,
  updated_at = now()
WHERE id = 'MED-M1' AND subject = 'medicine' AND question = $o$Why do you want to study medicine? I'd like a specific, honest answer, not the version you think I want to hear.$o$;

UPDATE public.questions SET
  question = $q$Tell me about a piece of work experience, volunteering or shadowing you've done. What did it teach you about the reality of a medical career, compared with what you expected beforehand?$q$,
  updated_at = now()
WHERE id = 'MED-M4' AND subject = 'medicine' AND question = $o$Tell me about a piece of work experience, volunteering, or shadowing you've done. What did it teach you about the REALITY of a medical career, as opposed to what you expected beforehand?$o$;

UPDATE public.questions SET
  question = $q$Tell me about a stressful situation you've faced. How did you handle it, and what did you learn?$q$,
  updated_at = now()
WHERE id = 'MED-M5' AND subject = 'medicine' AND question = $o$Medicine involves real pressure — long hours, high stakes, difficult news. Tell me about a genuinely stressful situation you've faced, and how you actually handled it.$o$;

UPDATE public.questions SET
  question = $q$What have you done to find out what a career in medicine is really like, and what did you learn from it?$q$,
  answer = $a$No single correct answer. Assess whether the candidate describes specific, genuine steps they took to understand the career (for example talking to doctors or medical students, work experience, volunteering or reading), and reflects honestly on what they learned, including realities such as the length of training, rather than only the appeal of the job.$a$,
  rubric = $r${"strong": "Describes specific steps they took and what each taught them, including honest reflection on realities such as the length of training, and how this shaped their decision.", "developing": "Mentions some steps but stays general, or describes what they did with little reflection on what they learned.", "weak": "Gives a vague or rehearsed answer with no specific evidence of having explored the career."}$r$::jsonb,
  live_probes = $p$[{"probe": "What did you learn that you didn't expect?", "goodResponse": "Names something specific and genuine they did not anticipate, rather than only confirming what they already believed"}, {"probe": "Have you spoken to anyone currently going through training?", "goodResponse": "Describes a specific conversation or source of insight, rather than a vague general awareness"}]$p$::jsonb,
  updated_at = now()
WHERE id = 'MED-M10' AND subject = 'medicine' AND question = $o$Medical training takes at least five or six years at university, followed by many more years of postgraduate training before you're fully qualified in a specialty — often a decade or more in total. What have you actually done to understand whether that reality is right for you?$o$;
