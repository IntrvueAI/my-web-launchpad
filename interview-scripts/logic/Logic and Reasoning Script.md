# 11+ Interview: Logic & Reasoning — Scoring & Feedback Script
*Top Independent School Level — Spoken Interview Format*
*Version 3.0 — Model-Answer & Scoring Scripts*

---

## How to use this document

This is the **engine script** that sits behind each logic and reasoning question. The earlier version told the interviewer what to ask. This version tells the model how to **judge the answer and write the feedback**.

For every question you will find six parts:

1. **The question** — read verbatim, exactly as written between the quotation marks.
2. **Model reasoning path** — what a top candidate's *thinking* looks like, narrated step by step. This is the gold standard you score against. It is a description of a *process*, not a single correct answer.
3. **Scoring rubric** — three bands (**Strong / Developing / Weak**) defined by observable reasoning behaviours, plus a final-answer note. Match the transcript to the band whose description it most resembles.
4. **Common mistakes** — the specific wrong turns to watch for, and what each one reveals.
5. **Live probes** — the exact follow-up lines the interviewer should use mid-conversation, and what a good response to each probe looks like.
6. **Hints if stuck** — a three-step ladder for a child who has genuinely stalled, from a gentle nudge to a near-reveal. See the rules below.

---

## How hints work (and how they affect the score)

When a child stalls — goes quiet, says "I don't know," or circles without progress — offer hints **one at a time, in order, only as needed.** Give the child a moment to work with each hint before offering the next. Never read out two hints at once, and never read the final answer aloud, even at Hint 3.

- **Hint 1** is a gentle nudge — a reminder of where to point their attention.
- **Hint 2** is firmer — it names the technique or the key fact.
- **Hint 3** is a near-reveal — it walks them to the doorstep, but still leaves the last step for them.

**How hints affect banding:**
- Needing a hint is **not** a failure. How a child *uses* a hint is itself prime evidence of **adaptability** — one of the five qualities. A child who takes Hint 1 and immediately runs with it is showing exactly what we want.
- Solving after **Hint 1** sits comfortably in **Strong/Developing**; after **Hint 2**, usually **Developing**; needing **Hint 3** and then engaging well is still a credit-worthy **Developing** — note in feedback that they "got there with support."
- What lowers the band is not *taking* a hint but failing to *use* it: hearing Hint 2 and repeating the same stuck answer, or disengaging.
- Always record **how many hints** were given for each question. The hint count is a key signal in the final profile — and a child's *trajectory* once helped often matters more than whether they needed help at all.

---

## The golden rule of scoring

**Reasoning beats the right answer. Every time.**

A child who reaches the wrong conclusion but reasons out loud, tests cases, notices their own errors, and adapts when challenged scores **higher** than a child who states the correct answer with no working. The correct answer with no reasoning is worth very little; we cannot tell whether it was understood or guessed.

When you score, weight the evidence roughly like this:

- **~70% — Process.** Did they think aloud? Did they structure the problem? Did they test possibilities, notice contradictions, and respond to challenge? This is the heart of the score.
- **~20% — Adaptability.** When given a probe or a counterexample, did they update their thinking, or dig in / shut down?
- **~10% — Final answer.** Correct is a bonus, not the basis. For open questions (odd-one-out, definitions, paradoxes) there is no single answer to credit at all.

If a child goes **silent and then produces a perfect answer**, that is a *Developing* performance at best until you have probed the reasoning — a silent correct answer is unscored reasoning. Always probe before banding.

---

## The five qualities, and where each is tested

Every question primarily exercises one or two of these. The rubric for each question is tuned to its primary skill.

- **Logic** — following a chain of reasoning to a sound conclusion.
- **Verbal Reasoning** — manipulating language, analogy, and concepts precisely.
- **Thinking Aloud** — narrating the thought process rather than going silent.
- **Adaptability** — adjusting approach when challenged or stuck.
- **Lateral Thinking** — stepping outside the first assumption.

---

## The three bands (general definitions)

These apply across all questions; each question below sharpens them with specific behaviours.

**Strong** — Thinks aloud unprompted. Structures the problem (tests cases, names relationships, separates what is known from what is assumed). Notices their own errors or the trap in the question. Responds to probes by genuinely updating, not just agreeing. Often, but not always, reaches a sound conclusion.

**Developing** — Engages and offers reasoning, but needs prompting to externalise it or to see structure. May reach a sensible answer by instinct without being able to justify it, or may get partway and stall. Responds to probes but does not always integrate them fully. The raw material is there; it needs drawing out.

**Weak** — Guesses or asserts without reasoning. Goes silent and stays silent. Treats the question as having one fixed answer to be retrieved rather than worked out. When challenged, repeats the same answer, abandons the problem, or becomes flustered rather than adapting.

---

## Feedback the model should generate

After the interview, for each question, the model should write **two or three sentences** of feedback that:

1. Name **one specific reasoning strength** actually observed (quote or paraphrase the child's words).
2. Name **one specific thing to develop**, framed as a next step ("next time, try saying your thinking out loud before settling on an answer").
3. Stay **warm, concrete, and process-focused.** Never reduce a child to their final answer. Never say only "correct" or "incorrect."

Avoid generic praise ("good job"). Tie every comment to something the transcript actually shows.

---

## SECTION A — Deductive Logic

*Questions with definite correct answers, reached by formal chains of reasoning. Here the process to reward is **case-testing and proof by contradiction**: "suppose X… that leads to a contradiction… so not-X."*

---

### A1 — Knights and Knaves

> "On an island, every inhabitant is either a knight, who always tells the truth, or a knave, who always lies. You meet two people: Alex and Beth. Alex says: 'At least one of us is a knave.' What can you work out about each of them?"

**Final answer:** Alex is a knight; Beth is a knave.

**Model reasoning path (the gold standard):**
A top candidate treats Alex's status as a fork and tests both branches aloud.
1. *"Suppose Alex is a knave."* Then everything he says is false, so "at least one of us is a knave" is false — meaning **nobody** is a knave. But Alex is a knave, so that's a contradiction. The branch collapses.
2. *"So Alex must be a knight."* A knight tells the truth, so "at least one of us is a knave" is genuinely true.
3. Alex is the knight, so the knave referred to must be **Beth**.

The marker of real skill is step 1 — *deliberately assuming the thing you want to disprove and watching it break.* That is proof by contradiction, and a child who reaches for it instinctively is reasoning at a high level.

**Scoring rubric:**

- **Strong** — Explicitly tests at least one assumption ("if he's a knave then…") and follows it to the contradiction. Narrates the fork. Reaches Alex = knight, Beth = knave with justification, or gets the structure right even if they fumble the final label.
- **Developing** — Senses that Alex is probably telling the truth and lands near the answer, but justifies it by feel ("he just seems honest") rather than by ruling out the alternative. Can often be walked to the contradiction with one nudge.
- **Weak** — Guesses both roles with no test of either case, or treats "at least one is a knave" as obviously meaning both are knaves. Cannot engage with the self-referential setup even after prompting.

**Common mistakes:**
- Reading "at least one of us is a knave" as "**both** are knaves." Watch for this; it derails the whole chain.
- Concluding Alex is the knave because he "accused" someone — confusing the *content* of the claim with the *truth-status* of the speaker.
- Stopping at "Alex is a knight" without working out Beth.

**Live probes:**
- If stuck: *"What happens if we just suppose Alex is a knave — does that hold together?"* (Good response: they spot the contradiction.)
- To extend a strong child: *"What if Alex had said 'We are both knights' instead?"* (This is consistent only if both are knights — a knave couldn't truthfully be flagged. Reward them for re-running the case test, not for the label.)

**Hints if stuck:**
1. *"Each person is either a knight or a knave. Why not just suppose Alex is one of them and see what follows?"*
2. *"Try 'Alex is a knave.' If he's a knave, everything he says is false — so is his sentence true or false?"*
3. *"If 'at least one of us is a knave' were false, that would mean nobody is a knave. But we just supposed Alex is one. Does that fit?"*

---

### A2 — The Four Cards

> "There are four cards on a table. Each one has a letter on one side and a number on the other. The cards you can see show **E, K, 4, and 7**. Now, the rule is this: if a card has a vowel on one side, it has an even number on the other side. So here's my question — which cards would you need to turn over to check the rule is being followed? And just as importantly: which ones wouldn't you bother turning over?"

**Final answer:** E and 7.

**Model reasoning path:**
A strong candidate checks each card against *what could break the rule*, not what merely looks related.
1. **E (vowel)** — could break the rule if the back is odd. Must turn. ✓
2. **K (consonant)** — the rule says nothing about consonants. Irrelevant.
3. **4 (even)** — the rule is "vowel → even," **not** "even → vowel." Whatever is on the back, the rule can't be broken. The famous trap.
4. **7 (odd)** — if a vowel is on the back, that's a vowel with an odd number: a direct violation. Must turn. ✓

The decisive move is realising the rule is a one-way implication. A child who says *"the rule doesn't claim even numbers must have vowels"* has grasped the core idea.

**Scoring rubric:**

- **Strong** — Reasons from "what could falsify the rule." Rejects 4 *with a reason* (one-way implication) and identifies 7, ideally unprompted. Even getting 7 after the single hint below, with a clean explanation, is strong.
- **Developing** — Picks E and 4 (the intuitive pair) but, when asked what 7 could hide, sees the violation and revises. The revision is what earns the band — they can use new information.
- **Weak** — Picks E and 4 and defends 4 even after prompting, or turns all four "to be safe" with no sense of which checks matter. No grasp that the rule is directional.

**Common mistakes:**
- Choosing **4** because it feels relevant — the single most common error, made by most adults too.
- Missing **7** entirely because an odd number "has nothing to do with vowels" — they forget the *back* could be a vowel.
- Confirming the rule rather than trying to break it (turning cards that could only confirm).

**Live probes:**
- *"What would happen if the 7 had a vowel on the back?"* (The intended unlock for the 7 card.)
- *"Does the rule say anything about what's on the back of an even number?"* (Dislodges the 4-card trap.)

**Hints if stuck:**
1. *"The rule only makes a promise about vowels. Go card by card — which ones could hide something that breaks that promise?"*
2. *"For each card ask: 'could what's on the BACK of this one break the rule?' Try it on the 7."*
3. *"What if the 7 had a vowel on its back? And remember — the rule never says even numbers must have vowels."*

---

### A3 — The Logic Chain

> "I'm going to give you three facts, so listen carefully. First: everyone in the science club enjoys experiments. Second: some of the science club members also play in the school orchestra. And third: Priya plays in the orchestra, but she's not in the science club. So from just those facts — can you tell me whether Priya enjoys experiments? Talk me through how you work it out."

**Final answer:** No — we cannot tell.

**Model reasoning path:**
1. The only fact about who enjoys experiments is fact one: it applies to *science club members*.
2. Priya is explicitly **not** a science club member, so fact one says nothing about her.
3. The orchestra link (fact two) is an *association*, not a rule that transfers the property. Sharing an activity with experiment-lovers doesn't make Priya one.
4. Therefore the honest answer is "we can't tell" — she might or might not; we have no information either way.

The hallmark is the child holding **three** options in mind — "yes," "no," and "can't tell" — and choosing the third deliberately.

**Scoring rubric:**

- **Strong** — Arrives at "can't tell" *and* explains that the rule only covers science club members, so it can't reach Priya. Distinguishes "we don't know she does" from "we know she doesn't."
- **Developing** — Leans toward "can't tell" or hesitates productively ("well, she's not in the club, so… maybe?") but doesn't cleanly articulate why the orchestra link is irrelevant. The instinct is right; the justification is loose.
- **Weak** — Confidently says "yes" (because of the orchestra overlap) or "no" (she's not in the club, so she *can't* enjoy experiments) — both treat the absence of information as if it were information.

**Common mistakes:**
- "Yes — she's in the orchestra with science-club people who like experiments." Confuses association with implication. The classic error.
- "No — she's not in the science club, so she doesn't enjoy experiments." Treats "not a member" as proof of not enjoying experiments (denying the antecedent).
- Not noticing that "can't tell" is even an available answer.

**Live probes:**
- *"Is there anything in these three facts that tells us about people who are NOT in the science club?"* (Leads to "no, there isn't.")
- *"What extra fact would you need to be certain either way?"* (Tests whether they understand exactly what's missing.)

**Hints if stuck:**
1. *"Which of the three facts is actually about Priya?"*
2. *"The first fact only tells us about science club members. Is Priya one of them?"*
3. *"If the only rule about experiments covers club members, and Priya isn't a member — can you honestly say yes, no, or neither?"*

---

### A4 — The Three Hats

> "Three children — Alice, Ben, and Clara — are sitting in a row, all facing the front. A teacher pops a hat on each of their heads, and these hats come from a box holding three red hats and two blue ones. Now, because of where they're sitting: the child at the back can see both of the hats in front of them; the child in the middle can only see the hat of the child right at the front; and the child at the front can't see any hats at all. So the teacher turns to the child at the back and asks, 'Do you know what colour your own hat is?' And the child at the back says, 'No.' Then the teacher asks the middle child, 'Now do you know what colour your hat is?' And the middle child says, 'Yes.' So here's the puzzle — what colour is the middle child's hat?"

**Final answer:** Red.

**Model reasoning path:**
1. The back child would only *know* their own colour if they saw **two blue hats** in front (only two blue hats exist, so two blues would force their own to be red). They said "no," so the two front hats are **not both blue**.
2. The middle child overhears this and now knows: "Clara (front) and I are not both blue."
3. The middle child looks at Clara. *If Clara were blue,* then for the pair not to be "both blue," the middle child's own hat must be red — so they can answer "yes."
4. They *did* answer "yes," which fits the case where Clara is blue and the middle hat is red. (If Clara were red, the back child's "no" would leave the middle child unable to decide — so "yes" rules that out.)
5. Therefore the middle child's hat is **red**.

This is the hardest deductive question. **Do not expect a full solution.** The thing to reward is the child grasping that *one person's answer is information for the next person.*

**Scoring rubric:**

- **Strong** — Understands that the back child's "no" carries information ("the front two aren't both blue") and uses it to reason about the middle hat — even if they need help finishing. Full correct solution is exceptional, not required.
- **Developing** — Grasps that the back child saying "no" must *mean* something, and that the middle child is using it, but can't fully chain it to a colour. Engages with the two-blue-hats constraint when pointed at it.
- **Weak** — Treats each child in isolation, ignores that "no" is a clue, or guesses a colour with no reference to what the back child could see. Gives up immediately without engaging the constraint.

**Common mistakes:**
- Forgetting there are only **two** blue hats — the entire deduction hinges on scarcity.
- Thinking the back child's "no" tells us nothing.
- Trying to solve it purely from the middle child's own view without using the overheard answer.

**Live probes:**
- *"What would the back child need to see in order to say YES?"* (Unlocks the two-blue-hats insight.)
- *"The back child said no. What does that tell the middle child about the two hats at the front?"*

**Hints if stuck:**
1. *"Start with the child at the back. What would they need to see in front of them to be sure of their own hat?"*
2. *"There are only two blue hats. So if the back child saw two blue hats, what must their own be? They said 'no' — so what does that rule out?"*
3. *"The front two hats aren't both blue. Now sit in the middle seat, looking at the front hat — if that front hat is blue, what must yours be?"*

---

### A5 — The Liar's Paradox

> "Imagine someone says to you: 'I always tell lies.' Can this statement be true? Can it be false? What's going on?"

**Final answer:** It's a paradox — no consistent truth value can be assigned.

**Model reasoning path:**
1. *Suppose it's true.* Then the speaker always lies, so this very statement is a lie — making it false. Contradiction.
2. *Suppose it's false.* Then the speaker doesn't always lie, so sometimes tells the truth — and this could be one of those truths, making it true. Contradiction.
3. Both doors lead back on themselves: the statement **refers to itself** and undermines whichever value you try to give it. That self-reference is the engine of the paradox.

There is **no resolution to find.** The whole point is whether the child can sit with an unresolvable loop and *articulate why* it won't resolve.

**Scoring rubric:**

- **Strong** — Tests both "true" and "false" and shows each collapses. Names or describes the self-referential loop ("the sentence is talking about itself"). Comfortable concluding it can't be either — enjoys the puzzle rather than demanding an answer.
- **Developing** — Spots one side of the contradiction ("if it's true, then he's lying, so it's false") but doesn't close the loop on the other side until prompted. Senses something is "weird" without naming self-reference.
- **Weak** — Flatly decides "it's false, liars can't tell the truth" and won't budge when pushed, or insists there must be a normal answer. Treats it as a trick with a hidden solution.

**Common mistakes:**
- "It must be false" — stopping at the first contradiction without checking what "false" then implies.
- Trying to resolve it ("maybe he was joking") rather than recognising the structural loop.
- Frustration read as failure — note: confusion is fine here; *whether they can describe the loop* is what matters.

**Live probes:**
- *"If it's false, then the person doesn't always lie — so could THIS be the one time they're telling the truth?"* (Reveals the loop's second half.)
- *"Have you noticed the sentence is talking about itself? Does that change anything?"*

**Hints if stuck:**
1. *"Try assuming the sentence is true. If it's true, what kind of person is saying it — and does that fit with what they said?"*
2. *"Now try the opposite — assume it's false. If they don't always lie, could this sentence be one of their rare true ones?"*
3. *"Notice the sentence describes the person who's saying it. Each time you pick true or false, it flips. Maybe it can't settle at all — can you say why?"*

---

### A6 — The Odd One Out (Animals)

> "Which is the odd one out: **dog, cat, whale, bat, snake**? I want you to give me as many different answers as you can, each with a different reason."

**Valid answers (any well-defended choice counts):**
- **Snake** — only reptile; only one with no limbs.
- **Whale** — only one living exclusively in water; can't survive on land.
- **Bat** — only one capable of sustained flight.
- **Dog** — only one routinely domesticated as a working animal; only canid.
- **Cat** — only obligate carnivore; domestication angle.

**Model reasoning path:**
A strong candidate doesn't hunt for *the* answer — they realise the task is to **generate multiple lenses** and switch deliberately between them: taxonomy, habitat, locomotion, diet, relationship to humans. The quality is in naming a *principle* ("by where they live…", "by how they move…") rather than a one-off observation.

**Scoring rubric:**

- **Strong** — Offers several answers unprompted, each on a *different principle*, and names the principle each time. Finds at least one creative/unexpected distinction and defends it.
- **Developing** — Gives one solid answer with a clear reason, and can produce a second when asked, but tends to stay on one type of distinction (e.g. only biological categories). Needs the "different lens" prompt to shift.
- **Weak** — Gives a single answer and stops, or offers reasons that aren't really distinguishing ("snake, because I don't like snakes"). Can't articulate a principle behind the choice.

**Common mistakes:**
- Treating it as having one right answer and defending only that.
- Confusing a personal/aesthetic reason ("scary") with a categorical principle.
- Repeating the same lens with different animals rather than genuinely shifting the lens.

**Live probes:**
- *"Can you think of a reason a completely different animal could be the odd one out?"* (Forces a lens-shift.)
- *"What's the rule you're using to decide that one?"* (Pushes observation → principle.)

**Hints if stuck:**
1. *"There's no single right answer here — just pick any one animal and tell me a reason it's different."*
2. *"Think of different ways to sort them: where they live, how they move about, what they eat."*
3. *"You've got one reason — now change the rule completely. Could a totally different animal be the odd one out for a totally different reason?"*

---

## SECTION B — Lateral Thinking Scenarios

*Puzzles where the obvious interpretation is wrong. Here the process to reward is **surfacing and dismantling an assumption** — out loud. The child may ask yes/no questions or reason aloud; the answer matters far less than watching them question their first reading. For these, score the **quality of the questions they ask**, not the speed of the solution.*

---

### B1 — The Surgeon

> "A boy is badly injured in a road accident and is rushed to hospital. The surgeon looks at him on the operating table and says: 'I cannot operate on this child — he is my son.' But the boy's father died in the accident. How is this possible?"

**Final answer:** The surgeon is the boy's mother. (Also valid: a second father in a same-sex family, a stepfather/adoptive father — any answer that breaks the "surgeon = male" assumption.)

**Model reasoning path:**
The puzzle works by exploiting an unstated assumption that the surgeon is a man. A strong candidate either spots it fast *or* — more valuably — notices **what they were assuming**: "I kept picturing the surgeon as a man." The real prize is self-awareness about the assumption, not the speed of the answer.

**Scoring rubric:**

- **Strong** — Solves it and can name the assumption they (or most people) make, *or* doesn't solve it instantly but explicitly interrogates "what am I taking for granted about the surgeon?" Reflective about their own thinking.
- **Developing** — Gets there with the single nudge below and, when asked, recognises the gender assumption. Engaged but doesn't reach for self-examination on their own.
- **Weak** — Proposes only literal escapes ("the father came back to life," "it's a ghost") and, even after the nudge, can't locate the assumption. Treats the contradiction as a plot hole rather than a clue.

**Common mistakes:**
- Insisting the father "wasn't really dead" — refusing the premise instead of questioning the assumption.
- Reaching the answer but missing the lesson (no awareness of *why* it was hard).

**Live probes:**
- *"What assumptions are you making about the surgeon?"* (Primary unlock.)
- After a correct answer: *"Why do you think that was hard to see at first?"* (Converts a right answer into evidence of insight.)

**Hints if stuck:**
1. *"Read it again — is there something you're picturing in your head that the puzzle never actually told you?"*
2. *"What are you assuming about the surgeon?"*
3. *"Does a surgeon have to be a man?"*

---

### B2 — The Man in the Lift

> "A man lives on the 10th floor of a tall block of flats. Every morning he takes the lift all the way down to the ground floor and heads off to work. When he comes home in the evening, here's the strange thing: on rainy days he takes the lift all the way back up to the 10th floor — but on dry days, he only takes it up to the 7th floor, and then walks up the last three flights of stairs. He's not doing it for exercise, and he's not stopping to see a friend. So why does he do it?"

**Final answer:** He is too short to reach the button for the 10th floor; he can only reach the 7th. On rainy days he has an umbrella, which he uses to press the higher button. (Accept equivalents: a child, a wheelchair user — anything that explains a height/reach difference plus the umbrella variable.)

**Model reasoning path:**
1. Notice the genuine puzzle is the **asymmetry**: down is always fine, up depends on weather.
2. Ask what is physically different on a rainy day → he carries an umbrella.
3. Connect the umbrella to the lift buttons → reach. The constraint is his height, not his preference.

The key is shifting from *psychological* explanations ("he likes the walk") to *physical* ones (he can't reach), prompted by the rain clue.

**Scoring rubric:**

- **Strong** — Zeroes in on what changes between wet and dry days (the umbrella) and links it to a physical constraint. Asks probing yes/no questions ("Is something different about him on rainy days?"). May well solve it unaided.
- **Developing** — Explores plausible angles and, given the "what's different on a rainy day?" prompt, follows the umbrella thread to the answer. Reasoning is sound once aimed.
- **Weak** — Offers only behaviour/preference explanations and doesn't use the rain detail as a clue even when pointed at it. Doesn't generate testable questions.

**Common mistakes:**
- Fixating on exercise or laziness despite being told it isn't exercise.
- Ignoring the rain as decorative rather than central.
- Not asking *why the difference is weather-dependent.*

**Live probes:**
- *"What's different about him, or about what he's carrying, on a rainy day compared to a dry day?"*
- *"Is there a reason he might not be able to press the button himself on a dry day?"*

**Hints if stuck:**
1. *"The real puzzle is why going DOWN is always fine, but going UP depends on the weather. What changes with the weather?"*
2. *"What does he carry on a rainy day that he doesn't carry on a dry one?"*
3. *"Think about the buttons in the lift and how tall he is. How could an umbrella help him reach a higher one?"*

---

### B3 — The Poisoned Coffee

> "Two men sit down at a café and order the same drink: iced coffee. The drinks arrive at the same time. The first man gulps his down quickly. The second man sips his slowly. Shortly after, the second man is taken to hospital — he had been poisoned. The poison was definitely in both drinks. Why did the first man survive?"

**Final answer:** The poison was in the **ice**. The fast drinker finished before the ice melted and released the poison; the slow sipper gave the ice time to melt.

**Model reasoning path:**
1. Both drinks were poisoned, yet only the slow drinker fell ill — so the difference must be **time**, not dose.
2. Ask what about an iced drink changes over time → the ice melts.
3. Separate "the drink" from "the ice": if the poison is frozen in the ice, only melting releases it.

The decisive move is realising the drink is **not uniform** — it has a component (ice) that changes with time.

**Scoring rubric:**

- **Strong** — Locks onto the only variable that differs (speed → time) and reasons that the drink must change over time, landing on the ice. Asks sharp questions ("Were the drinks exactly identical?").
- **Developing** — Notices the speed difference is the clue and, prompted to think about how the drink changes over time, reaches the ice. Right track, needs a nudge to the mechanism.
- **Weak** — Attributes survival to body size, tolerance, or "he was lucky," ignoring that the only stated difference is drinking speed. Doesn't treat the drink as having parts.

**Common mistakes:**
- Explaining it by the men ("one was bigger/stronger") rather than the drink.
- Assuming the drink is a uniform liquid — missing the ice entirely.
- Forgetting the prompt says *both* drinks were poisoned (so it isn't "one wasn't poisoned").

**Live probes:**
- *"The only difference is how fast they drank. So what might change about the drink while it sits?"*
- *"Were the two drinks identical in every single part?"* (Steers toward the ice.)

**Hints if stuck:**
1. *"The only difference is how fast they drank. So the clue is about time — what happens to a drink over time?"*
2. *"What part of an iced coffee changes if you leave it sitting for a while?"*
3. *"Where could the poison be hiding so it only spreads into the drink once the ice melts?"*

---

### B4 — The Parachute

> "A man is found dead in the middle of a large, open field. He's wearing a backpack. There are no footprints anywhere in the field, and there's no one else around. How did he die?"

**Final answer:** His parachute failed to open — the "backpack" is an unopened parachute. He fell from above, which is why there are no footprints.

**Model reasoning path:**
1. Treat the **no footprints** as the load-bearing clue: he didn't walk in.
2. If he didn't arrive horizontally, he arrived **vertically** — from above.
3. Combine "from above" + "backpack" → parachute. The backpack isn't luggage; it's the failed equipment.

The leap is allowing **vertical** movement into a scenario the mind defaults to picturing horizontally.

**Scoring rubric:**

- **Strong** — Uses "no footprints" to rule out walking and reasons toward arrival from above; connects the backpack to a parachute. Probes the backpack's contents ("Is there something in the backpack?").
- **Developing** — Recognises the no-footprints clue is important and, prompted to think about how *else* he could have got there, reaches the falling/parachute idea. Sound once the vertical angle is suggested.
- **Weak** — Keeps him walking into the field (despite no footprints) or invents unrelated causes, never questioning *how he arrived.* Ignores the backpack as a clue.

**Common mistakes:**
- Picturing only horizontal arrival and missing the "from above" possibility.
- Treating the backpack as irrelevant background detail.
- Not registering that "no footprints" actively rules something out.

**Live probes:**
- *"What does the absence of footprints tell you about how he got there?"*
- *"What might be in the backpack?"* (Nudges parachute.)

**Hints if stuck:**
1. *"What's the strangest thing about the scene? Look hard at the footprints."*
2. *"No footprints means he didn't walk in. So how else could he have got to the middle of the field?"*
3. *"If he came down from above, what might that backpack on his back really be?"*

---

### B5 — The Rope Bridge

> "Four people need to cross a narrow rope bridge in the dark. The bridge can only hold two people at a time, and they've got just one torch between them — and nobody can cross without it. The thing is, they all walk at different speeds: one of them takes 1 minute to cross, one takes 2 minutes, one takes 5 minutes, and the slowest takes 10 minutes. And when two cross together, they can only go as fast as the slower of the two. So — what's the quickest time in which all four can get across?"

**Final answer:** 17 minutes.

**Optimal schedule:**
1. 1 & 2 cross → 2 min elapsed.
2. 1 returns with torch → 3 min.
3. 5 & 10 cross → 13 min.
4. 2 returns with torch → 15 min.
5. 1 & 2 cross → 17 min.

**Model reasoning path:**
1. Try the obvious method — fastest person ferries everyone — and get **19 minutes** (1+2, 1 back, 1+5, 1 back, 1+10 = 2+1+5+1+10).
2. Ask *"can I do better?"* — the crucial adaptive move.
3. Spot that the **10-minute person is the expensive one**, and you only want to pay that cost **once**. So the two slow people (5 and 10) should cross **together**, paying 10 once instead of 5 and 10 separately.
4. Arrange fast people (1 and 2) to shuttle the torch around that single expensive crossing → 17.

What's being tested is **systematic experimentation and the willingness to improve a working-but-suboptimal answer** — not whether they nail 17 first try.

**Scoring rubric:**

- **Strong** — Finds a working solution (often 19), recognises it might not be optimal, and searches for improvement by identifying the 10-minute person as the cost to minimise. Reaches 17, or gets very close with clear reasoning about pairing the slow walkers.
- **Developing** — Produces a valid crossing that gets everyone across (e.g. 19) and explains it clearly, but treats it as "done" until asked whether it can be faster; with the prompt, begins to experiment.
- **Weak** — Loses track of the constraints (torch must come back, only two at a time), proposes impossible crossings, or fixes on one attempt with no checking. No sense of a cost to minimise.

**Common mistakes:**
- Forgetting the torch must be carried **back** each time (someone has to return).
- Sending the two slowest separately, paying the 10-minute cost twice.
- Declaring 19 the answer without testing whether it can be beaten.

**Live probes:**
- *"You've got a way that works — can you find a faster one?"* (Tests adaptability directly.)
- *"Which person is the most 'expensive' to move, and how often are you paying that cost?"*

**Hints if stuck:**
1. *"First just find any order that gets all four across, and add up the time — don't worry if it's not the fastest yet."*
2. *"Remember someone has to carry the torch back each time. Which person costs you the most every time they cross?"*
3. *"What if the two slowest people crossed together — could that mean you only pay the 10-minute cost once instead of twice?"*

---

### B6 — The Empty Hospital Room

> "A woman walks into a hospital room and sees a man lying in a bed connected to various machines. She walks over, switches off one of the machines, and walks out. Soon afterwards, the man in the bed dies. The woman is not arrested, charged, or even questioned by the police. Why not?"

**Final answer (multiple valid):** The switched-off machine didn't cause the death — e.g. she's a nurse/doctor turning off a device that was no longer needed, or she turned off something irrelevant (a TV, a lamp) and he died of natural causes. The key is breaking the assumed link "machine off → man died."

**Model reasoning path:**
1. Resist the assumption that switching off the machine **caused** the death — the puzzle plants a false cause.
2. Question both threads: was she **authorised** (clinical staff), and was the machine even **relevant** to his survival (maybe it was a TV)?
3. The broader the questioning across *authority* and *causation*, the stronger the thinking.

This question specifically tests **causation vs. correlation**: two events near in time aren't necessarily cause and effect.

**Scoring rubric:**

- **Strong** — Questions whether the machine caused the death at all, not just whether she had permission. Generates more than one explanation across both legal and causal angles. Explicitly separates "after" from "because of."
- **Developing** — Offers a sensible single explanation (usually "she's a nurse / she had permission") and, when prompted for another reason, can find a second. On the right lines but initially narrow.
- **Weak** — Assumes she's guilty and only searches for how she "got away with it," never questioning whether she caused the death. Can't move off the causal assumption even when prompted.

**Common mistakes:**
- Assuming guilt and hunting only for a loophole.
- Locking onto a single explanation and stopping.
- Treating "the man died soon after" as proof the machine caused it (post hoc reasoning).

**Live probes:**
- *"Did switching off the machine definitely cause his death?"* (Targets causation directly.)
- *"Is there any other reason she might not even be questioned?"* (Pushes for breadth.)

**Hints if stuck:**
1. *"Does switching off the machine definitely mean she caused his death? Are you sure those two things are linked?"*
2. *"Who in a hospital is allowed to switch off a machine? And what if that machine wasn't keeping him alive at all?"*
3. *"Try two separate ideas: maybe she's a nurse doing her job — or maybe the machine she switched off was just a TV."*

---

## SECTION C — Verbal & Conceptual Reasoning

*Questions about language, analogy, and ideas. Here the process to reward is **precision and flexibility with words** — naming relationships, iterating definitions under challenge, and reaching across domains. The instruction "explain why" is doing the real work; the filled-in blank is almost incidental.*

---

### C1 — Define a Simple Word

> "Can you define the word 'chair' for me? Try to be precise enough that your definition would include every chair — and exclude everything that isn't a chair."

**There is no perfect answer.** Every first attempt fails to some counterexample — that's by design.
- "Something you sit on" → so is the floor, a horse, a wall.
- "A seat with four legs" → some chairs have three legs, or one pedestal.
- "A seat with a back" → stools and benches complicate this.
- "Furniture for one person with a back" → what about a throne, a car seat, a beanbag, a sofa?

**Model reasoning path:**
A strong candidate **expects** to be challenged and treats each counterexample as fuel: offer a definition → hear "but what about X?" → refine to exclude X → repeat. They're playing the game of carving the concept tighter, and they stay cheerful while doing it. The skill is *iteration under challenge*, not landing a flawless definition (there isn't one).

**Scoring rubric:**

- **Strong** — Gives a definition, *recognises themselves or accepts* that a counterexample breaks it, and **refines** — ideally several rounds. Stays curious and flexible as it gets harder. May reflect that the task seems impossible and wonder why.
- **Developing** — Produces a reasonable definition and can patch it once or twice when handed a counterexample, but tends to add features ad hoc rather than rethinking. Engaged but a bit rigid.
- **Weak** — Gives one definition and defends it as obviously correct, or becomes frustrated/shuts down when it's challenged. Treats counterexamples as unfair rather than informative.

**Common mistakes:**
- Believing the first definition is complete and resisting counterexamples.
- Getting frustrated that "you keep changing it" — missing that refinement *is* the task.
- Defining by example ("like the one I'm sitting on") rather than by properties.

**Live probes (offer counterexamples in escalating order):**
- *"You can sit on the floor — is the floor a chair?"*
- *"What about a stool with no back? A sofa? A throne?"*
- To close with a strong child: *"Philosophers have tried for centuries and never agreed. Why do you think it's so hard?"*

**Hints if stuck:**
1. *"Just give me a first try — it doesn't have to be perfect, we'll improve it together."*
2. *"You said a chair is [their words]. But [a stool / the floor / a sofa] fits that too and isn't a chair — can you add something to rule it out?"*
3. *"Each time I find an exception, just tweak your definition to exclude it. The fixing is the whole game — keep going."*

---

### C2 — Word Analogies

*Choose one or several, escalating. For every answer, the scored thing is whether they can **name the relationship**, not just fill the blank.*

*(Read the blanks aloud as a spoken "what?" — never as a silent gap — and give the child a beat to fill it in.)*

**Level 1:** "Here's one to finish: pen is to author as scalpel is to… what? And once you've got it, tell me the link you used." → **Surgeon/doctor.** Relationship: a professional's primary tool.
**Level 2:** "Try this one: library is to books as gallery is to… what? And how about — orchestra is to instruments as bouquet is to… what?" → **paintings/artworks**; **flowers.** Relationship: a place/form and the collection it holds.
**Level 3:** "Finish this for me: hot is to lukewarm as freezing is to… what?" → **cold/chilly.** Relationship: an extreme and its milder counterpart.
**Level 4:** "Here's a trickier one: author is to novel as composer is to… what?" → **symphony.** Then flip it round: "A composer makes a symphony — so in the same way, what does a sculptor make?" → **statue/sculpture.** Relationship: a creator and their primary created work.

**Model reasoning path:**
A strong candidate fills the blank *and immediately states the rule*: "tool a professional uses," "creator and their work." When they hit a harder one, they reason from the named rule rather than from vibe. The explanation is the evidence of reasoning; the word alone could be pattern-matching.

**Scoring rubric:**

- **Strong** — Completes analogies *and* articulates the underlying relationship in words, unprompted. Handles Level 3–4 abstraction and can run the relationship in reverse.
- **Developing** — Fills blanks correctly but reaches for the relationship only when asked, and describes it loosely ("they go together"). Right answers, fuzzy rationale.
- **Weak** — Guesses words, sometimes plausibly, but can't say *why* — "it just sounded right" — and can't transfer the rule to a harder item.

**Common mistakes:**
- Filling the blank by association ("scalpel… hospital") instead of matching the *relationship* (tool → user).
- Naming a relationship that doesn't actually fit both halves.
- Treating "I just knew it" as sufficient.

**Live probes:**
- After *every* answer: *"What's the relationship you used there?"*
- *"Can you say the rule in a way that works for both pairs?"*

**Hints if stuck:**
1. *"Look at the first two words — what's the link between them?"*
2. *"Say it as a sentence: 'a pen is the tool an author uses, so a scalpel is the tool a ___ uses.'"*
3. *"Name the relationship out loud first — once you've got the rule, the missing word falls out."*

---

### C3 — The Odd One Out (Conceptual)

> "Which is the odd one out: **painting, sculpture, symphony, novel, poem**? Give me as many different answers as you can, each with a completely different reason."

**Valid answers (any well-defended choice):**
- **Symphony** — exists only in time; can't be held or displayed; needs performance.
- **Sculpture** — the only three-dimensional form.
- **Painting** — the only purely visual form, not performed or read.
- **Novel** — prose, not verse/notation/visual; the only one too long for one sitting.
- **Poem** — short enough to memorise whole; sound matters as much as meaning.

**Model reasoning path:**
As with A6, the task is **lens-switching**, but the lenses are conceptual: dimension, medium, time, length, how it's experienced. A strong child generates several, each on a distinct principle, and is *surprised and pleased* to keep finding more.

**Scoring rubric:**

- **Strong** — Several answers on genuinely different principles, each named. Finds an unexpected angle (e.g. "the symphony is the only one that doesn't exist until someone performs it") and defends it.
- **Developing** — One strong answer, a second when prompted, but lenses stay close together (e.g. all about physical form). Needs "which would you pick next?" to broaden.
- **Weak** — One answer then stops, or reasons that don't distinguish ("poem, because poems are boring"). No principle behind the pick.

**Common mistakes:**
- Treating it as one-right-answer.
- Personal taste masquerading as a categorical reason.
- Re-using one lens dressed up as different reasons.

**Live probes:**
- *"If that were the odd one out, which would you choose next, and why?"*
- *"What's the underlying idea behind that choice?"*

**Hints if stuck:**
1. *"There's no single right answer — pick any one and give me a reason it's the odd one."*
2. *"Think about different angles: which one you can touch, which takes time to experience, which is read versus performed."*
3. *"You've found one — now switch the rule entirely and find a different odd one out for a different reason."*

---

### C4 — The Rule About Rules

> "Here's a claim for you: 'Every rule has an exception.' Is that claim itself a rule? And if it is — does it have an exception? Have a think out loud."

**What happens:** If "every rule has an exception" is itself a rule, it must have an exception — i.e. there exists *some* rule with no exception. But that makes "every rule has an exception" false. The claim, applied to itself, undermines itself. No clean resolution.

**Model reasoning path:**
1. Ask whether the claim counts as a rule (it's a general statement, so arguably yes).
2. Apply it to itself: if it's a rule, it has an exception → there's a rule without an exception → the claim is false.
3. Recognise the **self-reference**: the statement bites its own tail. Sit with the loop rather than forcing an answer.

Like A5, this tests whether a child can reason carefully about something **genuinely unresolvable** — and ideally enjoy it.

**Scoring rubric:**

- **Strong** — Spots the self-referential trap and walks the contradiction through. Comfortable concluding it can't cleanly resolve. May bring up borderline cases (do maths facts like "2+2=4" count as exceptionless rules?).
- **Developing** — Engages, senses something circular, and gets partway ("if it has an exception, then some rule doesn't… wait") but needs prompting to close the loop. Curious if a little tangled.
- **Weak** — Answers "yes it has an exception" or "no it doesn't" flatly with no awareness of the loop, or dismisses it as a silly word game. Won't engage the self-reference even when pointed at it.

**Common mistakes:**
- Not noticing the claim refers to itself.
- Demanding a tidy yes/no and missing the paradox.
- Confusing "exception to a rule" with "exception to this sentence."

**Live probes:**
- *"If this rule has an exception, what would that exception have to be — and what does that do to the claim?"*
- *"Can you think of any rule that definitely has no exceptions?"* (Opens the maths-rules thread.)

**Hints if stuck:**
1. *"Treat the sentence itself as a rule. Now apply it to itself — does this rule have an exception?"*
2. *"If this rule DOES have an exception, that means some rule somewhere has none. What does that do to the claim?"*
3. *"Notice it's a rule talking about all rules — including itself. Can it ever be cleanly true or false?"*

---

### C5 — The Word with Many Meanings

> "Give me three completely different meanings of the word **sharp**. They must be genuinely different — not just different contexts for the same basic meaning."

**Valid meanings:** cutting edge (*sharp knife*); mentally quick (*sharp mind*); musical pitch raised a semitone (*F sharp*); cold/biting (*sharp wind*); clear/well-defined (*sharp image*); stylishly dressed (*looking sharp*); sudden/abrupt (*a sharp turn*).

**Model reasoning path:**
A strong candidate first **checks that meanings are genuinely distinct**, not the same idea in two settings — "a sharp knife" and "a sharp point" are the same core meaning. They then reach **across domains** (physical → mental → musical → weather), which is the real signal of lexical range.

**Scoring rubric:**

- **Strong** — Three (or more) genuinely distinct senses spanning different domains, with a clear grasp of *why* they're different. Reaches for a non-obvious one (musical, sartorial) spontaneously.
- **Developing** — Produces a couple of clearly different meanings but a third that's really a repeat of the first in a new context; can fix it when the distinction is explained.
- **Weak** — Lists near-duplicates ("sharp knife, sharp scissors, sharp sword") and doesn't see they're one meaning. Stuck in a single domain.

**Common mistakes:**
- Confusing *different contexts* with *different meanings*.
- Staying entirely in the "physically cutting" domain.
- Inventing a meaning that isn't really used.

**Live probes:**
- *"Is 'a sharp knife' and 'a sharp point' really two different meanings, or the same idea twice?"*
- *"Can you use two different meanings of 'sharp' in one sentence that still makes sense?"* (e.g. "The sharp detective spotted the sharp knife.")

**Hints if stuck:**
1. *"Picture 'sharp' in totally different places — a kitchen, someone's mind, a piece of music."*
2. *"A sharp knife and a sharp pencil are really the same meaning. Can you find one that has nothing to do with cutting?"*
3. *"What does 'sharp' mean in music? And what do we mean if we call a person sharp?"*

---

### C6 — What Comes Next?

> "Here's a little sequence of words for you: Monday, March, Morning. What could come next? See if you can give me more than one possible answer, and tell me the rule behind each one."

**Possible rules (each supports different "next" words):**
- All begin with **M** → *Minute, Monsoon, Marble…*
- All are **units/divisions of time** → *Minute, Moment…*
- The units are **getting shorter** (month → day → part-of-day) → *Minute, Second…*
- All are **"first" of their category** (Monday = first weekday; March = first Roman month; Morning = first part of day) → *Midnight, May, Mercury…*

**Model reasoning path:**
A strong candidate finds one rule, then **deliberately looks for another**, realising several patterns fit the same three words. The most impressive response keeps going — first the easy "all start with M," then the subtler "they're all units of time," then "they're each the *first* of something." This tests **creative hypothesis generation**.

**Scoring rubric:**

- **Strong** — Multiple distinct rules, each with a valid "next" word, and visible delight in finding more than one. Reaches at least one non-obvious pattern (units of time / "firsts"), not just the initial letter.
- **Developing** — Finds the "all start with M" rule and, when asked for another, can find a second with support. Doesn't spontaneously look past the first pattern.
- **Weak** — Offers one word with a thin or no rule, or a "next" that fits no stated pattern. Doesn't treat it as having multiple possible structures.

**Common mistakes:**
- Stopping at the first rule (usually the M).
- Giving a next word without stating the rule behind it.
- Picking a word that breaks their own stated rule.

**Live probes:**
- *"That's one rule — is there a completely different rule that also fits these three words?"*
- *"What do Monday, March, and Morning each have in common beyond the letter they start with?"*

**Hints if stuck:**
1. *"What's one thing all three words share? Start with the easiest thing you notice."*
2. *"Now look past the first letter — what KIND of words are they? What do Monday, March and Morning all measure?"*
3. *"Are they all bits of time? Or is each one the 'first' of something? Each idea gives you a different next word."*

---

## SECTION D — Language Logic & Word Puzzles

*Questions combining precise reasoning with language. Most have a definite answer or a bounded set. Here the process to reward is **systematic working** — finding the most constraining clue first, testing cases methodically, and keeping track. A neat answer reached by guesswork scores below a sound method that stalls.*

---

### D1 — The Logic Grid

> "Three friends — Alice, Ben, and Clara — each have a favourite animal and a favourite sport. The animals are cat, dog, and rabbit, and the sports are swimming, tennis, and cycling. I'll give you five clues, so see if you can keep track. Clue one: Alice doesn't like cats. Clue two: whoever likes dogs also likes swimming. Clue three: Ben likes tennis. Clue four: Clara doesn't like rabbits. And clue five: Alice doesn't like cycling. So — can you work out which animal and which sport each of them likes?"

**Final answer:** Alice — dog, swimming. Ben — rabbit, tennis. Clara — cat, cycling.

**Model reasoning path (the disciplined route):**
1. Start with the **most constraining clue**: clue 3 fixes Ben = tennis.
2. Chain it: Ben plays tennis → Ben doesn't swim → (clue 2, dog-lover swims) Ben isn't the dog-lover.
3. Alice: not cycling (clue 5), and tennis is taken by Ben → Alice swims.
4. Alice swims → (clue 2) Alice likes dogs. Consistent with clue 1 (not cats). ✓
5. Clara: not rabbits (clue 4), dogs taken → Clara likes cats. Ben gets rabbit.
6. Sports left: Clara gets cycling.

The signal of strong reasoning is **clue selection** — beginning with the clue that pins something down, then propagating, rather than hopping around at random.

**Scoring rubric:**

- **Strong** — Works systematically: identifies a high-constraint clue to start, chains consequences, and keeps a running track (aloud or "in my head, Ben's tennis, so…"). Reaches the full solution, or a near-complete one with sound steps.
- **Developing** — Engages clue by clue and makes correct local deductions but jumps around, loses the thread, or needs "which clue is most definite?" to get organised. The logic is sound in pieces.
- **Weak** — Guesses assignments and checks them haphazardly, or can't link clue 2 and clue 3. No method for keeping track; contradictions go unnoticed.

**Common mistakes:**
- Not using clue 2 as a *link* (dog ↔ swimming) and treating animals and sports as separate puzzles.
- Forgetting to carry a deduction forward (e.g. establishing Alice swims but not using it for her animal).
- Random clue order leading to dead ends.

**Live probes:**
- *"Which clue gives you the most definite information to start with?"* (Steers to clue 3.)
- *"You know the dog-lover swims — who have you already shown does NOT swim?"*

**Hints if stuck:**
1. *"Which clue gives you something for certain straight away, with no working needed?"*
2. *"Start from 'Ben likes tennis.' If Ben plays tennis, he doesn't swim — so can Ben be the dog-lover?"*
3. *"Keep a little table going. Once you fix one person's sport, it squeezes what the others can have — work outward from there."*

---

### D2 — Who Broke the Window?

> "A classroom window gets broken, and four children are asked who did it. Alice says, 'It was Ben.' Ben says, 'It wasn't me.' Clara says, 'It wasn't Alice.' And Dan says, 'It was Ben.' Now, exactly one of those four children is lying. So — who broke the window?"

**Final answer:** Ben broke it, and Ben is the liar.

**Model reasoning path:**
1. Test each suspect and **count the liars** their guilt would create:
   - Ben did it → Alice true, Ben false, Clara true, Dan true = **1 liar.** ✓
   - Alice did it → Alice false, Ben true, Clara false, Dan false = 3 liars. ✗
   - Clara did it → Alice false, Ben true, Clara true, Dan false = 2 liars. ✗
   - Dan did it → Alice false, Ben true, Clara true, Dan false = 2 liars. ✗
2. Only "Ben did it" yields exactly one liar.
3. **Shortcut a strong child may spot:** Alice and Dan say the same thing, so they're always both true or both false together — if they lie, that's already two liars, which is too many. So Alice and Dan are telling the truth → it was Ben.

The skill is **methodical case-testing against a constraint** ("exactly one liar"), ideally with the efficiency insight about Alice/Dan.

**Scoring rubric:**

- **Strong** — Tests suspects systematically, counts liars against the "exactly one" rule, and reaches Ben. Bonus for noticing the Alice/Dan shortcut and using it to cut the work.
- **Developing** — Understands they should test possibilities and counts correctly for some, but doesn't try all four cleanly or needs reminding of the "exactly one liar" constraint. Right method, incomplete execution.
- **Weak** — Guesses based on who "sounds guilty," ignores the counting constraint, or can't handle two people saying the same thing. No systematic testing.

**Common mistakes:**
- Forgetting to check the answer against *exactly one* liar (settling for "at least one").
- Missing that Alice and Dan are logically locked together.
- Picking Ben for the wrong reason (because two people accused him) rather than via the liar count.

**Live probes:**
- *"Let's test one suspect at a time — if Alice did it, how many of them would be lying?"*
- *"Notice Alice and Dan say the same thing. What does that tell you about them?"*

**Hints if stuck:**
1. *"Try assuming each child did it, one at a time, and count how many statements become lies."*
2. *"Only one person is lying. So you're hunting for the suspect that makes exactly ONE statement false."*
3. *"Look at Alice and Dan — they say the same thing, so they're both true or both lying together. If they both lie, that's already two liars — too many."*

---

### D3 — Exactly One Statement is True

> "I'm going to read you four statements, and exactly one of them is true — your job is to tell me which. Statement A says: exactly one of these four statements is false. Statement B says: exactly two of them are false. Statement C says: exactly three of them are false. And statement D says: all four of them are false. So — which one is the true one?"

**Final answer:** C.

**Model reasoning path:**
1. Translate the premise: if **exactly one** statement is true, then **exactly three** are false.
2. Which statement *says* "exactly three are false"? That's **C** — so C would be the true one, and that's self-consistent.
3. Sanity-check the others as the lone truth: A says one is false (would mean three true — contradicts "only one true"); B says two false (would mean two true — contradiction); D says four false (would mean none true, including itself — contradiction). Only C survives.

The skill is connecting the **premise** ("exactly one true") to its arithmetic consequence ("exactly three false") and finding the statement that asserts exactly that.

**Scoring rubric:**

- **Strong** — Reasons "one true means three false, and C says three false, so C" — fast, from the self-referential structure. Can show why A/B/D each contradict themselves as the sole truth.
- **Developing** — Gets there by testing statements one at a time (often needs to be walked through A collapsing first), then applies the method to the rest. Sound once the testing method is modelled.
- **Weak** — Picks a statement with no test of consistency, or can't see that "exactly one true" fixes the number of false ones. Doesn't engage the self-reference.

**Common mistakes:**
- Not converting "exactly one true" into "exactly three false."
- Checking each statement's wording in isolation without testing it *as the unique true one*.
- Picking D because "most false" feels dramatic.

**Live probes:**
- *"If exactly one statement is true, how many are false?"* (Bridge to C.)
- *"Suppose A were the true one — would that hold together?"* (Models the collapse method.)

**Hints if stuck:**
1. *"If exactly one statement is true, then how many of the four are false?"*
2. *"Now find the statement that claims that exact number of false ones."*
3. *"Test it — does that statement being the only true one stay consistent? Try A as the true one and watch it fall apart, then do the same with the rest."*

---

### D4 — The Mislabelled Boxes

> "There are three boxes in front of you. One holds only apples, one holds only oranges, and one holds a mixture of both. All three are labelled — but here's the catch: every single label is wrong. The labels say 'Apples', 'Oranges', and 'Mixed'. Now, you're allowed to reach into just one box and pull out a single piece of fruit, without peeking inside first. Which box would you pick — and what could you work out from what you pull out?"

**Final answer:** Pick from the box labelled **"Mixed."**

**Model reasoning path:**
1. Use the fact that **every label is wrong** as the key lever.
2. The "Mixed" box therefore *isn't* mixed — it's all apples or all oranges. So one fruit reveals its true contents completely.
3. Say you draw an apple → "Mixed" box is really **Apples**.
4. Now propagate: the "Apples" box can't be apples (label wrong) and can't be mixed (just identified) → it's **Oranges**. The "Oranges" box must be the **Mixed** one.
5. One draw resolves all three — because you started from the *most constrained* box.

The insight is choosing the box with the **fewest possibilities** ("Mixed" can only be one of two pure types), which makes a single draw decisive.

**Scoring rubric:**

- **Strong** — Chooses "Mixed" *and* explains why the all-wrong-labels rule makes that box only two possibilities, then shows how one fruit cascades to identify all three. Can say why the other boxes wouldn't work as the pick.
- **Developing** — Picks "Mixed" by good instinct, or reasons partway, but can't fully explain the cascade to all three boxes until prompted. Right choice, incomplete justification.
- **Weak** — Picks "Apples" or "Oranges," or "Mixed" with no reason, and can't trace what one fruit would tell them. Doesn't use the "all labels wrong" constraint.

**Common mistakes:**
- Picking the "Apples" or "Oranges" box, which leaves two boxes ambiguous.
- Forgetting that **all** labels are wrong (treating some as possibly right).
- Stopping at "it's apples" without deducing the other two boxes.

**Live probes:**
- *"Since every label is wrong, what can the box labelled 'Mixed' NOT contain?"* (Unlocks the choice.)
- *"You pulled out an apple from 'Mixed.' What must the other two boxes be?"*

**Hints if stuck:**
1. *"Use the fact that EVERY label is wrong. Which box's label can you be most sure about?"*
2. *"The box labelled 'Mixed' can't actually be mixed — so it must be all of one fruit. What does that mean for your one pick?"*
3. *"Pick from the 'Mixed' box. Once you see that one fruit, the wrong labels force the other two boxes — try tracing it through."*

---

### D5 — What's the Connection?

> "I'm going to give you three little analogies. For each one, fill in the missing word — and then tell me what the connection is. Here's the first: puppy is to dog as foal is to… what? Number two: author is to novel as composer is to… what? And the third one: map is to country as recipe is to… what?"

**Answers:** horse; symphony (or music); meal (or dish).

**Relationships:**
- Puppy/foal → a young animal and the adult it becomes.
- Author/composer → a creator and the work they produce.
- Map/recipe → **the interesting one**: a *representation* of something that is not the thing itself. A map represents a country; a recipe describes a meal.

**Model reasoning path:**
The first two are warm-ups — easy, concrete relationships. A strong candidate sails through them while *naming* the rule, then meets the third and recognises it's a **different kind** of relationship: not "young→adult" or "maker→made," but "representation→reality." Articulating "a recipe tells you how to make a meal but isn't the meal" is the high-water mark.

**Scoring rubric:**

- **Strong** — All three answers with clearly named relationships, *and* recognises that the third is abstract (representation vs. the real thing). Can extend it to fresh examples (map/territory, score/music, blueprint/building) or invent their own analogy.
- **Developing** — Gets the answers and the first two relationships clearly, but describes the third only loosely ("they're connected") until prompted to think about representation. Solid on the concrete, hazy on the abstract.
- **Weak** — Fills blanks (perhaps correctly) but can't articulate any relationship, or forces the third into the same mould as the first two ("a recipe grows into a meal"). No grasp of representation.

**Common mistakes:**
- Treating the map/recipe pair as the same type as the warm-ups.
- Filling blanks without explaining the link.
- Missing that map and recipe are *instructions/representations*, not the things themselves.

**Live probes:**
- *"What's the difference between a map and a country?"* (Surfaces representation vs. reality.)
- *"Can you make up your own analogy — one nobody else would think of?"* (Tests whether they own the structure, not just the answers.)

**Hints if stuck:**
1. *"For each pair, say the link out loud as a full sentence."*
2. *"The third pair is different from the first two — a map isn't a country. So what IS a map, compared to a country?"*
3. *"A map stands for a country; a recipe stands for a meal. What's the missing word, and what's the shared relationship?"*

---

### D6 — The Hidden Rule

> "I'm going to read you some words that are in a special group, and some that aren't — and your job is to work out the rule. So, these words are in the group: knife, write, pneumonia, gnome, wrap. And these words are not in the group: king, right, planet, garden, rope. Have a think — what's the rule?"

**Final answer:** Every "in" word begins with a **silent letter** (written but not pronounced): K‑nife, W‑rite, P‑neumonia, G‑nome, W‑rap. The "not in" words begin with fully pronounced letters.

**Model reasoning path:**
1. The decisive move is **saying the words aloud** — the rule is invisible on the page and audible only in speech.
2. Notice each "in" word starts with a letter you don't hear → "the first letter is silent."
3. Confirm against the "not in" list: those first letters *are* pronounced.

The single best diagnostic is *whether the child sounds the words out.* A child reasoning silently will likely miss it; a child who mutters the words and lights up has used exactly the right method.

**Scoring rubric:**

- **Strong** — Tests by pronouncing the words, identifies the silent-first-letter rule, and verifies it against both lists. Can supply a fresh example (KNEEL, WRIST, PSALM, GNAT).
- **Developing** — Notices something about the spellings or starts sounding words out and, with a small nudge ("try saying them"), reaches the rule. On the right method once prompted to use sound.
- **Weak** — Hunts only at the visual/letter level (e.g. "they have odd letters"), doesn't try pronouncing them, and can't find the rule even when nudged toward sound.

**Common mistakes:**
- Reading silently and never testing by ear.
- Spotting that the words "look unusual" without isolating the silent first letter.
- Proposing a rule that fits the "in" list but not the "not in" list (not checking both).

**Live probes:**
- *"Try saying each word out loud — slowly. Notice anything about the first sound?"*
- *"How would you describe the rule to someone who hadn't noticed it?"*

**Hints if stuck:**
1. *"Try saying each word out loud, nice and slowly."*
2. *"Listen to the very first sound of each one. Is every letter you can see actually being spoken?"*
3. *"In KNIFE, do you say the K? Check the start of each word the same way — what do the 'in' words share?"*

---

### D7 — The Broken Sequence

> "I'm going to give you a little sequence of words — listen carefully: once, twice, thrice. What comes next?"

**Final answer:** There is no standard English word for "four times." The pattern breaks — you simply say "four times."

**Model reasoning path:**
1. Read the pattern: once = one time, twice = two, thrice = three.
2. Reach for the next term and **discover the gap** — there's no common word for four times.
3. The strong response isn't frustration but **curiosity**: the clean pattern just stopped; *why?* A child who invents "frice" or "quadrice" is showing lovely creativity, as long as they know it isn't a real word.

This tests verbal reasoning *and* adaptability — meeting a pattern that fails and staying intellectually engaged rather than insisting it must continue.

**Scoring rubric:**

- **Strong** — Recognises there's no standard word and engages with *why* (these words are old and once-common; usage dropped off after three). On the follow-up, finds other English patterns that break (goose/geese but moose/moose; sing/sang/sung but bring/brought). Genuinely curious.
- **Developing** — Either confidently coins a word ("frice") or realises something's off, and with prompting sees that the pattern has no standard continuation. Engaged but doesn't probe why on their own.
- **Weak** — Insists on a "correct" next word and treats the gap as their own failure, or disengages. Doesn't entertain that a pattern can simply stop.

**Common mistakes:**
- Assuming there *must* be a word and getting stuck hunting for it.
- Coining a word but believing it's genuinely standard.
- Not recognising the broader phenomenon of patterns breaking in language.

**Live probes:**
- *"Is there a real, everyday English word for four times? What do we actually say?"*
- *"Can you think of other patterns in English that seem neat but then stop?"* (e.g. goose→geese, moose→moose.)

**Hints if stuck:**
1. *"Once means one time, twice means two times, thrice means three times. So what about four times?"*
2. *"Is there a normal, everyday English word for 'four times'? What do we actually say instead?"*
3. *"It's completely fine if the pattern just runs out — why do you think English has 'once' and 'twice' but nothing past 'thrice'?"*

---

## End-of-interview synthesis

After all questions, the model produces an **overall profile** — not an average of right answers, but a picture of *how this child thinks*. Summarise across the five qualities, citing the questions where each showed up:

- **Logic** — strongest evidence usually in A1–A4, D1–D4. Did they test cases and build sound chains?
- **Verbal Reasoning** — C1, C2, C5, D5. Precision and flexibility with words and relationships.
- **Thinking Aloud** — *every* question. Did they narrate, or go silent? This is the single most important cross-cutting signal.
- **Adaptability** — best seen where probes were used (B5, C1, D7) and on any question they initially got wrong. Did challenge improve their thinking?
- **Lateral Thinking** — Section B, plus the open odd-one-out questions (A6, C3). Could they step outside the first reading?

**Recommended overall shape (per child):**
1. A two-to-three sentence **narrative** of their thinking style ("Tends to leap to an answer, then justifies it well when asked — strongest when thinking aloud, less confident sitting with open-ended puzzles").
2. **Two genuine strengths**, each tied to a specific moment in the transcript.
3. **One or two growth areas**, framed as next steps, never as deficits.
4. A note on **trajectory under challenge** — did they get better or worse when pushed? This is often the most predictive signal of all.

**Scoring discipline — reminders for the model:**
- Never score from the final answer alone. A correct answer with no visible reasoning is *weak evidence*, not strong.
- Reward the child who reasons wrongly but openly over the one who is right but silent.
- Credit **self-correction** heavily — noticing one's own error mid-stream is a top-tier signal.
- For open questions (A6, C3, C6, and the definition/paradox items), there is **no answer to mark correct** — score only the process.
- Treat probes as part of the test: how a child *responds to a nudge* is data, not a rescue that invalidates the score.

---

## Quick Reference

| # | Question | Section | Difficulty | Primary skill | Process to reward most |
|---|----------|---------|------------|---------------|------------------------|
| A1 | Knights and Knaves | Deductive | ★★★ | Proof by contradiction | Testing both cases aloud |
| A2 | The Four Cards | Deductive | ★★★★ | Logical implication | Reasoning from "what could break the rule" |
| A3 | The Logic Chain | Deductive | ★★★ | Valid inference | Choosing "can't tell" deliberately |
| A4 | The Three Hats | Deductive | ★★★★ | Iterative deduction | Using one person's answer as a clue |
| A5 | The Liar's Paradox | Deductive | ★★★★ | Self-reference | Sitting with an unresolvable loop |
| A6 | Odd One Out (animals) | Deductive | ★★ | Multiple-lens thinking | Switching lens and naming the principle |
| B1 | The Surgeon | Lateral | ★★ | Challenging assumptions | Naming the assumption made |
| B2 | The Man in the Lift | Lateral | ★★★ | Physical reasoning | Shifting from preference to physical cause |
| B3 | The Poisoned Coffee | Lateral | ★★★ | Material properties | Separating "the drink" from "the ice" |
| B4 | The Parachute | Lateral | ★★★ | Spatial/directional | Allowing vertical movement |
| B5 | The Rope Bridge | Lateral | ★★★★ | Optimisation | Improving a working-but-slow answer |
| B6 | The Hospital Room | Lateral | ★★★ | Causation vs. correlation | Questioning whether the act caused death |
| C1 | Define "Chair" | Verbal | ★★★ | Precise definition | Iterating under counterexample |
| C2 | Word Analogies | Verbal | ★★–★★★★ | Relational reasoning | Naming the relationship, not just the word |
| C3 | Odd One Out (arts) | Verbal | ★★★ | Conceptual categorisation | Generating multiple conceptual lenses |
| C4 | The Rule About Rules | Verbal | ★★★★ | Self-reference | Spotting the self-undermining loop |
| C5 | Multiple Meanings | Verbal | ★★ | Lexical range | Distinguishing meanings from contexts |
| C6 | What Comes Next? | Verbal | ★★★ | Pattern generation | Finding several different rules |
| D1 | Logic Grid | Language | ★★★ | Systematic deduction | Starting from the most constraining clue |
| D2 | Who Broke the Window? | Language | ★★★ | Case-testing | Counting liars against the constraint |
| D3 | One Statement is True | Language | ★★★★ | Self-referential logic | Converting "one true" to "three false" |
| D4 | Mislabelled Boxes | Language | ★★★ | Constraint reasoning | Picking the most constrained box |
| D5 | What's the Connection? | Language | ★ | Analogy | Naming representation vs. reality |
| D6 | The Hidden Rule | Language | ★★★ | Pattern discovery / phonics | Saying the words aloud to test |
| D7 | The Broken Sequence | Language | ★★★ | Linguistic adaptability | Staying curious when the pattern breaks |

---

*Version 3.0 — Logic & Reasoning Model-Answer & Scoring Scripts*

