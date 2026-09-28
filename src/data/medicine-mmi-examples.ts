export const MMI_TOPICS = [
  "Ethics & consent",
  "Patient communication",
  "Professionalism & safety",
  "Motivation & reflection",
  "NHS & public health",
  "Health data & numeracy",
] as const;
export type MMITopic = (typeof MMI_TOPICS)[number];
export interface MMIExample {
  id: string;
  topic: MMITopic;
  title: string;
  format: "Discussion" | "Roleplay" | "Reflection" | "Data interpretation";
  role: string;
  question: string;
  assesses: string[];
  approach: string[];
  answer: string;
  why: string[];
  weakAnswer: string;
  upgrade: string;
  followUps: { question: string; response: string }[];
  sources: MMISourceId[];
  personal?: boolean;
  data?: { caption: string; columns: string[]; rows: (string | number)[][] };
  calculations?: {
    label: string;
    unit: string;
    expected: number;
    tolerance: number;
    working: string;
    hint: string;
  }[];
}
export const MMI_SOURCES = {
  interviews: {
    title: "Medical Schools Council · interview preparation",
    url: "https://www.medschools.ac.uk/for-students/applying-to-medical-school/interviews/",
    supports: "The MMI format and the range of attributes assessed.",
  },
  birmingham: {
    title: "University of Birmingham · MMI station skills",
    url: "https://www.birmingham.ac.uk/about/college-of-medicine-and-health/birmingham-medical-school/applying-to-medicine/medicine-interviews",
    supports:
      "Healthcare discussion, roleplay, reflection and applicant-level data tasks. Station timings on this page refer to the stated admissions cycle.",
  },
  consent: {
    title: "GMC · decision making and consent",
    url: "https://www.gmc-uk.org/professional-standards/the-professional-standards/decision-making-and-consent",
    supports:
      "Listening, supporting understanding and involving patients in decisions.",
  },
  confidentiality: {
    title: "GMC · confidentiality",
    url: "https://www.gmc-uk.org/professional-standards/the-professional-standards/confidentiality",
    supports:
      "Protecting patient information and considering the basis for sharing it.",
  },
  safety: {
    title: "GMC · patient safety on student placements",
    url: "https://www.gmc-uk.org/education/standards-guidance-and-curricula/guidance/undergraduate-clinical-placements/guidance-on-undergraduate-clinical-placements/patient-safety",
    supports:
      "Student supervision, limits of competence, concerns and consent to student involvement.",
  },
  professionalism: {
    title: "GMC · good medical practice",
    url: "https://www.gmc-uk.org/professional-standards/the-professional-standards/good-medical-practice",
    supports:
      "Patient-centred care, teamwork, honesty and professional responsibilities.",
  },
  social: {
    title: "GMC · private life and social media",
    url: "https://www.gmc-uk.org/education/standards-guidance-and-curricula/guidance/student-professionalism-and-ftp/private-life-and-social-media",
    supports:
      "Identifiability and professionalism when discussing placement experiences online.",
  },
  nhs: {
    title: "NHS Constitution for England",
    url: "https://www.gov.uk/government/publications/the-nhs-constitution-for-england/the-nhs-constitution-for-england",
    supports:
      "NHS principles, fairness, patient involvement and responsible use of resources in England.",
  },
  interpreting: {
    title: "NHS England · interpreting and translation",
    url: "https://www.england.nhs.uk/interpreting/",
    supports: "Access to language support in primary care.",
  },
  access: {
    title: "NHS England · GP access language guide",
    url: "https://www.england.nhs.uk/gp/gp-access-language-guide/",
    supports:
      "Explaining online, telephone and in-person routes to GP services.",
  },
  vaccination: {
    title: "NHS · vaccination benefits and safety",
    url: "https://www.nhs.uk/vaccinations/why-vaccination-is-important-and-the-safest-way-to-protect-yourself/",
    supports:
      "Reliable vaccination information and discussion of benefits and risks.",
  },
  screening: {
    title: "NHS · screening results and limitations",
    url: "https://www.nhs.uk/tests-and-treatments/nhs-screening/",
    supports:
      "Screening, diagnostic follow-up, false positives and false negatives.",
  },
  antibiotics: {
    title: "NHS · antibiotics",
    url: "https://www.nhs.uk/medicines/antibiotics/",
    supports:
      "Appropriate antibiotic use, viral infections, side effects and resistance.",
  },
} as const;
export type MMISourceId = keyof typeof MMI_SOURCES;
export const MMI_SOURCE_CHECKED = "2026-09-28";

// Original educational scenarios. Sources support principles, not these fictional cases,
// numerical results, worked wording or a claimed university mark scheme.
export const MEDICINE_MMI_EXAMPLES: MMIExample[] = [
  {
    id: "mmi-relative-results",
    topic: "Ethics & consent",
    title: "A relative asks for a patient’s results",
    format: "Discussion",
    role: "You are a medical student observing on a hospital ward. You do not provide clinical updates independently.",
    question:
      "A patient’s adult daughter stops you in a corridor: “Mum will not tell me what the scan showed. I am her daughter — surely you can tell me?” The patient is awake and able to discuss who receives information. How would you respond?",
    assesses: ["Confidentiality", "Empathy", "Appropriate escalation"],
    approach: [
      "Acknowledge the daughter’s worry without revealing information.",
      "Clarify the patient’s wishes through the supervising team.",
      "Offer help that respects both people’s needs.",
    ],
    answer:
      "I would acknowledge that waiting for information about her mother is worrying, and avoid discussing the scan in a corridor. I would explain that being a relative does not automatically give someone access to a patient’s results. I would not confirm or interpret the result myself. I would offer to ask the supervising clinician to speak with her mother about what she wants shared and with whom. With the patient’s agreement, the team could arrange a conversation together. If her mother does not want the result shared, I would respect that while still listening to the daughter’s concerns and passing relevant information to the team. If a new safety concern arose, I would seek senior advice rather than make a disclosure decision on my own.",
    why: [
      "I acknowledged the relative’s distress without disclosing the result.",
      "I made the patient’s preferences central and avoided promising absolute secrecy in every circumstance.",
      "I identified a practical next step within a student’s role.",
    ],
    weakAnswer: "She is the next of kin, so I would tell her the result.",
    upgrade:
      "A relationship label is not enough. Check the patient’s wishes, stay within your role and help arrange an appropriate conversation.",
    followUps: [
      {
        question:
          "The daughter says she needs the information to organise care at home. Does that change your response?",
        response:
          "It makes her concern relevant and worth exploring, but does not remove the patient’s choice. Ask the team to discuss what practical information the patient agrees can be shared; the whole medical history may not be needed.",
      },
      {
        question:
          "Can you listen to the daughter if the patient has not agreed to disclosure?",
        response:
          "Yes: receiving a concern is different from revealing a result. Explain that you can listen and pass important concerns to the clinical team without confirming confidential details.",
      },
    ],
    sources: ["confidentiality", "safety"],
  },
  {
    id: "mmi-refusal-test",
    topic: "Ethics & consent",
    title: "A patient refuses a recommended test",
    format: "Discussion",
    role: "You are a medical student with a supervising clinician in an outpatient clinic.",
    question:
      "An adult patient declines a test the clinician has recommended. A team member says, “They are making the wrong decision, so we should just persuade them until they agree.” Discuss how the team should approach this.",
    assesses: ["Autonomy", "Informed choice", "Balanced ethical reasoning"],
    approach: [
      "Find out what matters to the patient and why they are declining.",
      "Support an informed, voluntary decision; do not equate disagreement with incapacity.",
      "Explain the student’s limits and a suitable next step.",
    ],
    answer:
      "I would first explore the patient’s concerns: fear, a previous experience, practical difficulties or different priorities might explain the refusal. The clinician should discuss the purpose, likely benefits, important risks, alternatives and the option of not having the test in a way the patient understands. I would check whether communication support or more time would help. Wanting to benefit someone does not justify pressuring them into agreement. If the patient has capacity for this decision and is making an informed, voluntary choice, that refusal should be respected. Disagreeing with the recommendation is not by itself evidence of incapacity. As a student I would ask my supervisor to address any genuine capacity concerns and agree documentation, follow-up and advice about when to seek further help.",
    why: [
      "I explored the person’s reasons before trying to change their view.",
      "I balanced benefit and harm with voluntary, informed choice.",
      "I distinguished refusal from a capacity assessment and involved the responsible clinician.",
    ],
    weakAnswer: "Doctors know best, so the patient should have the test.",
    upgrade:
      "Explain why the recommendation matters, then show how a patient is supported to make their own decision.",
    followUps: [
      {
        question: "What if declining the test could lead to serious harm?",
        response:
          "The seriousness makes a careful discussion and senior involvement especially important. It does not automatically cancel a capacitous adult’s informed refusal. I would not invent an emergency exception to avoid listening.",
      },
      {
        question:
          "The patient cannot explain the leaflet back in English. Do they lack capacity?",
        response:
          "Not necessarily. A language barrier is a reason to provide appropriate communication support. The clinician should assess understanding after that support, rather than treating unfamiliarity with English as incapacity.",
      },
    ],
    sources: ["consent", "safety"],
  },
  {
    id: "mmi-student-consent",
    topic: "Ethics & consent",
    title: "The patient does not want you in the room",
    format: "Discussion",
    role: "You are a first-year medical student attending a teaching clinic.",
    question:
      "A patient looks uncomfortable and says they would prefer you not to observe their consultation. You need placement experience and the clinic is running late. What would you do, and why?",
    assesses: [
      "Patient dignity",
      "Consent to teaching",
      "Professional judgement",
    ],
    approach: [
      "Recognise that the patient can decline student involvement.",
      "Respond without guilt, pressure or making care conditional.",
      "Arrange another learning opportunity through your supervisor.",
    ],
    answer:
      "I would thank the patient for saying what they are comfortable with and leave promptly. I would make clear that their care should not be affected by that choice. My need to learn does not entitle me to be present in someone’s consultation, and the clinic being busy does not turn consent into a formality. I would speak to my supervisor outside the room about another appropriate learning opportunity. Afterwards I would reflect on whether we introduced me clearly and gave the patient a real chance to decline. I would not ask them repeatedly, treat their preference as a personal criticism or expect them to explain sensitive reasons in front of me.",
    why: [
      "I respected the patient’s choice immediately.",
      "I addressed the tension between training needs and patient dignity.",
      "I found a proportionate learning solution without penalising the patient.",
    ],
    weakAnswer:
      "I would explain that students have to learn somehow and ask them to reconsider.",
    upgrade:
      "Learning matters, but permission must be freely given. Accept the refusal and discuss alternatives away from the patient.",
    followUps: [
      {
        question:
          "Your supervisor tells you to stay because it is a teaching hospital. What then?",
        response:
          "I would politely point out that the patient has declined my presence and step out. If the issue continues, I would seek guidance through the placement’s student support or concerns route.",
      },
      {
        question: "Can the patient change their mind after initially agreeing?",
        response:
          "Yes. Permission is not a one-off ticket for the whole encounter. I would respond to a change in preference and let the responsible clinician clarify what the patient is comfortable with.",
      },
    ],
    sources: ["safety", "consent"],
  },
  {
    id: "mmi-clinic-allocation",
    topic: "Ethics & consent",
    title: "Who should get a scarce clinic appointment?",
    format: "Discussion",
    role: "You are discussing a fictional NHS service in England with an MMI interviewer; you are not allocating real appointments.",
    question:
      "A specialist service has one early appointment left. One patient has waited longer; another may deteriorate more quickly; a third offers to make a large donation. What should guide the decision?",
    assesses: [
      "Fair allocation",
      "Competing interests",
      "Recognising missing information",
    ],
    approach: [
      "Separate clinical urgency from social influence.",
      "Ask for the information and agreed criteria needed to compare need.",
      "Explain a transparent process and what happens to those who wait.",
    ],
    answer:
      "I would not choose from those descriptions alone. A suitably qualified clinician needs to assess urgency, the likely consequences of delay and whether an earlier appointment would change the outcome. Waiting time matters, particularly where need is otherwise comparable, but it should not automatically override a greater risk of harm. A donation or personal influence should not buy priority within this NHS allocation decision. I would use agreed, consistently applied criteria, consider access needs and check for alternatives such as another clinic. The people who wait still need clear communication and a route to reassessment if their situation changes. A defensible decision explains both its criteria and its uncertainty rather than claiming there is an obviously more deserving person.",
    why: [
      "I prioritised relevant need rather than wealth or social worth.",
      "I explained how to balance urgency and waiting time instead of selecting from insufficient facts.",
      "I considered communication and reassessment for patients who are not selected.",
    ],
    weakAnswer: "The donor could fund more care, so they should go first.",
    upgrade:
      "Discuss resources without allowing a personal payment to determine access to this appointment. Use clinical need and a fair process.",
    followUps: [
      {
        question:
          "Both patients have the same urgency and expected benefit. What then?",
        response:
          "Use the service’s transparent tie-breaking policy, such as waiting time where appropriate, rather than inventing personal judgements about whose life matters more.",
      },
      {
        question: "What would you say to the patient who has waited longest?",
        response:
          "Acknowledge the impact, explain the process without disclosing another patient’s details, and offer a clear next step and route for reviewing a change in need.",
      },
    ],
    sources: ["nhs", "birmingham"],
  },
  {
    id: "mmi-clinic-delay",
    topic: "Patient communication",
    title: "An angry patient in the waiting room",
    format: "Roleplay",
    role: "You are a hospital volunteer. You can contact reception or a nurse, but cannot prioritise patients or promise appointment times.",
    question:
      "A patient has waited 70 minutes and says: “Nobody has told me anything. I have taken time off work and this is ridiculous.” Speak directly to the patient.",
    assesses: ["Listening", "De-escalation", "Realistic action"],
    approach: [
      "Acknowledge the specific impact and invite the concern.",
      "Check immediate needs without trying to assess symptoms yourself.",
      "Offer a concrete update through the right member of staff.",
    ],
    answer:
      "I am sorry you have been waiting so long without an update. Taking time away from work and not knowing what is happening is frustrating. What is worrying you most about the delay? [Listen.] Have I understood that you are concerned about missing your shift as well as your appointment? I am a volunteer, so I cannot move you ahead or give you a reliable waiting time myself. With your agreement, I can speak to reception and ask for an update, then come back and tell you what they can confirm. If you are feeling unwell or your symptoms have changed while waiting, I can get a nurse now. Would you like me to do that first?",
    why: [
      "I spoke to the patient directly and reflected the impact on them.",
      "I checked for an immediate concern without diagnosing or independently triaging.",
      "I offered an achievable action and avoided an invented waiting time.",
    ],
    weakAnswer: "Calm down. Everyone is waiting and you will be seen soon.",
    upgrade:
      "Acknowledge the particular frustration and offer an update you can actually obtain. Do not make an unsupported promise.",
    followUps: [
      {
        question:
          "Patient: “You said you would help. Why can’t you put me first?”",
        response:
          "I can help you get information and make sure staff hear your concern. I cannot change the clinical order. I can ask the person managing the clinic to speak with you about what happens next.",
      },
      {
        question: "Patient: “I feel worse than when I arrived.”",
        response:
          "Thank you for telling me. I will get a nurse now so someone qualified can assess you. I would promptly alert clinical staff rather than continue the discussion about waiting times.",
      },
    ],
    sources: ["safety", "birmingham"],
  },
  {
    id: "mmi-language-support",
    topic: "Patient communication",
    title: "Helping a patient who needs an interpreter",
    format: "Roleplay",
    role: "You are a medical student in a GP clinic. A supervising clinician is available.",
    question:
      "A patient has limited English and appears unsure about the plan. Their adult son answers every question for them and says: “Just tell me. I will explain later.” Speak to the patient and son about how to help.",
    assesses: ["Inclusive communication", "Patient involvement", "Privacy"],
    approach: [
      "Address the patient and ask what support they prefer.",
      "Explain why accurate, confidential interpretation matters.",
      "Ask the clinician to arrange appropriate language support.",
    ],
    answer:
      "Thank you for helping your parent get here. I want to make sure they can ask their own questions and that we understand what matters to them. [Address the patient in short sentences; ask the clinician for language support to establish their preferences.] Would you prefer an interpreter? A professional interpreter can help us understand each other accurately. Your son can still be involved if that is what you want. Would you also like time to talk privately? [With appropriate interpretation available, check the patient’s wishes and invite their questions.] What would you most like the clinician to explain? We can ask them to go through the plan again. Afterwards, could you tell us what you understand the next step to be, so we can check we have explained it clearly?",
    why: [
      "I kept the patient at the centre while treating the relative respectfully.",
      "I offered appropriate interpretation and a chance for privacy.",
      "I checked understanding rather than relying on agreement or fluent English.",
    ],
    weakAnswer:
      "It is quicker to let the son explain everything, so that is fine.",
    upgrade:
      "Efficiency must not replace the patient’s own involvement. Explore their wishes and arrange accurate communication support.",
    followUps: [
      {
        question: "The patient wants their son to stay. Must he leave?",
        response:
          "No automatic exclusion is needed. Respect the patient’s preference while the clinician checks whether professional interpretation and an opportunity to speak privately are also needed.",
      },
      {
        question: "There is no face-to-face interpreter available today.",
        response:
          "Ask the clinical team about approved telephone or video interpretation and the urgency of the appointment. Do not independently decide to delay urgent care or use an unapproved tool for confidential clinical details.",
      },
    ],
    sources: ["interpreting", "consent"],
  },
  {
    id: "mmi-vaccine-concern",
    topic: "Patient communication",
    title: "A parent is worried about vaccination",
    format: "Roleplay",
    role: "You are a student helping at a health information event, with a nurse available for individual medical questions.",
    question:
      "A parent says: “I saw a video saying vaccines can harm children. I do not trust people telling me not to worry.” Open a conversation with them. You are not deciding their child’s treatment.",
    assesses: [
      "Empathy without endorsing misinformation",
      "Explaining evidence",
      "Recognising limits",
    ],
    approach: [
      "Ask what they saw and what worries them most.",
      "Give balanced, accessible information without claiming zero risk.",
      "Offer reliable information and a conversation with the nurse.",
    ],
    answer:
      "You want to make a safe choice for your child, and it sounds as though that video left you worried. What did it say that concerned you most? [Listen and summarise.] Would it help to look together at information from the NHS? Vaccines help protect against infections, and they can have side effects; I would not tell you any medical intervention has no risk. The important comparison is the benefits and risks of the particular vaccine and the infection it prevents. I cannot assess your child’s medical history here. I can help you write down your questions and ask the nurse to talk through them with you. What would you most like them to explain?",
    why: [
      "I explored the concern before offering facts and avoided ridicule.",
      "I did not reinforce the misleading claim or promise complete safety.",
      "I directed individual suitability questions to a qualified professional.",
    ],
    weakAnswer: "That video is stupid. Vaccines are completely safe.",
    upgrade:
      "Respect the person, examine the claim and explain that benefits and risks need a reliable, specific comparison.",
    followUps: [
      {
        question:
          "Parent: “My friend’s child became ill after a vaccine. Isn’t that proof?”",
        response:
          "That sounds frightening. Something happening afterwards is important to investigate, but timing alone cannot establish the cause. The nurse can discuss that concern, known side effects and what information would help assess it.",
      },
      {
        question: "Parent: “Can you guarantee my child will be all right?”",
        response:
          "I cannot honestly guarantee that. I can help you get a clear explanation of the expected benefits, known risks and any reasons your child might need individual advice.",
      },
    ],
    sources: ["vaccination", "consent"],
  },
  {
    id: "mmi-needle-anxiety",
    topic: "Patient communication",
    title: "A patient is frightened of a blood test",
    format: "Roleplay",
    role: "You are a clinic volunteer. A trained practitioner will carry out any blood test.",
    question:
      "A patient waiting for a blood test says quietly: “I feel silly, but I am terrified of needles. Last time I nearly fainted. I might just leave.” Respond directly to them.",
    assesses: [
      "Compassion",
      "Listening for relevant information",
      "Supporting choice",
    ],
    approach: [
      "Make it safe to express the fear.",
      "Ask what happened previously and what support they would like.",
      "Pass the concern to the practitioner without giving procedural advice yourself.",
    ],
    answer:
      "You do not need to apologise for feeling frightened. Thank you for telling me about nearly fainting last time. What part of the experience worries you most? [Listen and reflect their concern without assuming its cause.] What helped you feel more comfortable last time, if anything? I am a volunteer, so I cannot advise you on the procedure, but I can ask the practitioner to speak with you before anything happens. With your permission, I can explain what you have told me so you do not have to repeat it in front of everyone. They can explain the test and discuss ways to support you. You should have a chance to ask questions and make a decision without being rushed. Would you like me to ask them to come over?",
    why: [
      "I acknowledged fear without minimising it or treating the patient as childish.",
      "I noticed a relevant previous experience and offered to tell the practitioner.",
      "I supported an informed choice and did not give unqualified procedural advice.",
    ],
    weakAnswer:
      "It is only a tiny needle. Be brave and it will be over quickly.",
    upgrade:
      "The size of a needle does not tell you how the patient feels. Ask, listen and involve the practitioner in a support plan.",
    followUps: [
      {
        question: "Patient: “Please don’t tell anyone. It is embarrassing.”",
        response:
          "I understand. Would you be comfortable if we quietly told just the practitioner that you felt faint last time? It may help them support you safely. I would avoid announcing it to the room.",
      },
      {
        question: "Patient: “I am leaving now.”",
        response:
          "I would not block them or pressure them. I would offer to get the practitioner to discuss the implications and alternatives before they decide, and let staff know what is happening.",
      },
    ],
    sources: ["consent", "safety"],
  },
  {
    id: "mmi-social-post",
    topic: "Professionalism & safety",
    title: "A placement photo reveals patient information",
    format: "Discussion",
    role: "You are a medical student. Another student has posted a ward selfie in a group chat.",
    question:
      "You notice a patient’s name and a visible part of a clinical whiteboard in the background of the photo. Your friend says the group is private and asks you not to make a fuss. What do you do?",
    assesses: [
      "Confidentiality in practice",
      "Proportionate action",
      "Honesty with colleagues",
    ],
    approach: [
      "Limit further exposure without redistributing the image.",
      "Explain the concern to the student and seek the appropriate supervisor’s help.",
      "Follow the placement’s information incident process and learn from it.",
    ],
    answer:
      "I would act promptly because a private group chat does not make patient information safe to share. I would ask my friend to stop sharing the image and remove the post where possible, while avoiding forwarding or taking extra copies of it myself. I would explain the specific information that could identify a patient. I would inform the placement supervisor or the relevant information governance contact and follow their instructions about reporting and preserving any evidence appropriately. Removing a post does not establish that the exposure has been resolved. I would describe what I observed factually, rather than accuse my friend of intending harm. I would also reflect on how the group can avoid photographing clinical areas or discussing identifiable patients in future.",
    why: [
      "I identified an actual confidentiality concern even in a private group.",
      "I limited further sharing and sought the right incident response.",
      "I balanced support for a colleague with responsibility to the patient.",
    ],
    weakAnswer:
      "I would screenshot it and send it to everyone so they know what happened.",
    upgrade:
      "Do not widen the disclosure in the process of reporting it. Explain the facts through the appropriate confidential route.",
    followUps: [
      {
        question:
          "Your friend deletes the post immediately. Is that the end of it?",
        response:
          "It is a useful first action, but the image may already have been seen or copied. I would still ask the appropriate supervisor how the incident should be handled and recorded.",
      },
      {
        question:
          "No patient name is visible, but the face, ward and diagnosis are.",
        response:
          "A name is not the only way to identify someone. The combination may still identify the patient, so I would take the same concern seriously.",
      },
    ],
    sources: ["social", "confidentiality"],
  },
  {
    id: "mmi-identity-concern",
    topic: "Professionalism & safety",
    title: "You notice a possible patient identity mix-up",
    format: "Discussion",
    role: "You are a supervised medical student observing a ward procedure. You are not performing it.",
    question:
      "Just before a procedure begins, you notice that the name on the paperwork appears different from the name the patient gave. A senior staff member is in a hurry. What would you do?",
    assesses: ["Speaking up", "Patient safety", "Working within competence"],
    approach: [
      "Raise the specific concern before the procedure continues.",
      "Ask a qualified team member to check identity using the local process.",
      "Follow up and report facts if the concern is dismissed.",
    ],
    answer:
      "I would speak up immediately and clearly: “Could we pause and check the patient details? The name on this form appears different from the name the patient gave.” I could be mistaken, but checking is safer than staying silent because someone is senior or busy. I would ask the supervising clinician or nurse to verify the details using the appropriate process. I would not alter the paperwork, assume which name is correct or try to solve the clinical issue myself. If the concern were dismissed and the risk remained, I would promptly escalate to another responsible senior member of staff. Afterwards, I would follow the placement’s reporting process and reflect on how the mismatch arose, keeping the account factual and confidential.",
    why: [
      "I acted before a potential harm rather than waiting until afterwards.",
      "I used a clear observation and a request to check, not an accusation.",
      "I recognised uncertainty without letting hierarchy stop me from escalating.",
    ],
    weakAnswer:
      "I am only a student, so I would wait until the procedure is finished and mention it later.",
    upgrade:
      "Being a student limits what you can perform, not your ability to raise an immediate safety concern.",
    followUps: [
      {
        question: "The senior clinician says, “We have already checked.”",
        response:
          "I would calmly repeat the specific discrepancy and ask them to reconcile it before proceeding. If the risk remains unresolved, I would use the immediate local escalation route.",
      },
      {
        question:
          "It turns out there is a harmless explanation. Have you wasted everyone’s time?",
        response:
          "A respectful check based on a genuine discrepancy was still appropriate. I would thank the team for clarifying it and learn the explanation without becoming reluctant to speak up next time.",
      },
    ],
    sources: ["safety", "professionalism"],
  },
  {
    id: "mmi-dismissive-comment",
    topic: "Professionalism & safety",
    title: "A patient’s pain is dismissed",
    format: "Discussion",
    role: "You are a medical student observing in clinic. You cannot assess or prescribe independently.",
    question:
      "After a patient describes persistent pain, a staff member makes a dismissive comment about “people like that always exaggerating”. The patient hears it and becomes quiet. What concerns you and how would you respond?",
    assesses: [
      "Respect and dignity",
      "Recognising bias",
      "Constructive escalation",
    ],
    approach: [
      "Notice the effect on the patient and possible impact on care.",
      "Support the patient being heard and involve the supervisor.",
      "Raise the behaviour through a proportionate, factual process.",
    ],
    answer:
      "The comment risks undermining the patient’s dignity and may influence how seriously their symptoms are considered. I would not infer the diagnosis, but I would want their concerns to be heard and assessed fairly. In the moment I could acknowledge that they seem upset and ask whether they would like help speaking with the clinician. I would alert my supervisor to the specific comment and its effect, particularly if I thought it was affecting care. When appropriate, I would raise the behaviour respectfully with the colleague or through the placement’s concerns route, rather than simply gossip about it afterwards. Seniority or workload may help explain the situation but does not make dismissive treatment acceptable. I would keep the report factual and ask how the patient can be supported now.",
    why: [
      "I linked the behaviour to patient dignity and the fairness of care.",
      "I did not diagnose the patient or assume a colleague’s motives.",
      "I combined immediate support with a proportionate way to raise the concern.",
    ],
    weakAnswer:
      "They are more experienced than me, so they probably know the patient is exaggerating.",
    upgrade:
      "Experience does not justify stereotyping. Focus on what was said, how it affected the encounter and how to restore fair care.",
    followUps: [
      {
        question:
          "What if the patient says they do not want a formal complaint?",
        response:
          "Respect their preference about making a complaint and explain other support options. A continuing safety or professional concern may still need appropriate escalation; I would seek advice and explain what I can and cannot promise.",
      },
      {
        question:
          "How could you raise the issue without humiliating the colleague?",
        response:
          "Where safe and appropriate, choose a private conversation, describe the words and observed effect, and ask for their perspective. Avoid labelling their character; keep the focus on the patient and future behaviour.",
      },
    ],
    sources: ["professionalism", "safety"],
  },
  {
    id: "mmi-outside-competence",
    topic: "Professionalism & safety",
    title: "Asked to do something you have not been trained for",
    format: "Discussion",
    role: "You are an early-year medical student who has not been trained or signed off to take blood.",
    question:
      "A busy team member asks you to take a blood sample alone, saying, “You watched it yesterday; everyone has to start somewhere.” The patient is waiting. How would you respond?",
    assesses: [
      "Limits of competence",
      "Assertiveness",
      "Responsibility under pressure",
    ],
    approach: [
      "State your limit clearly and respectfully.",
      "Help find a suitably qualified person without abandoning the patient.",
      "Arrange supervised learning later through the appropriate process.",
    ],
    answer:
      "I would say that I have not been trained to perform this safely and cannot take the sample alone. Watching a procedure is not the same as being competent to carry it out. I would offer to help locate an appropriately qualified staff member and explain any delay to the patient through the team, without blaming the person who asked. I am keen to learn, so I would ask about proper training and supervised practice at an appropriate time, with the patient’s consent. If I continued to be pressured to act beyond my competence, I would seek help from my placement supervisor and raise the concern through the local process. I would not attempt the procedure to avoid looking unhelpful or claim confidence I do not have.",
    why: [
      "I prioritised safety over appearing capable or pleasing a senior colleague.",
      "I offered practical help while staying within my role.",
      "I showed willingness to learn through appropriate supervision.",
    ],
    weakAnswer: "I would try once and ask for help if it went wrong.",
    upgrade:
      "The boundary needs to be set before an untrained attempt, not after harm or distress.",
    followUps: [
      {
        question:
          "The patient says they are happy for you to try. Is that enough?",
        response:
          "Their willingness does not create competence or appropriate supervision. I would still decline the unsupervised task and find someone qualified.",
      },
      {
        question: "The team says you are letting them down.",
        response:
          "I would acknowledge the pressure and repeat the safety concern without becoming defensive. I can assist within my competence, but I would ask the supervisor to arrange a safe alternative.",
      },
    ],
    sources: ["safety", "professionalism"],
  },
  {
    id: "mmi-why-medicine",
    topic: "Motivation & reflection",
    title: "Why medicine, with evidence",
    format: "Reflection",
    personal: true,
    role: "You are an applicant answering about your own motivation. The response below uses a fictional experience as an illustration.",
    question:
      "Why do you want to become a doctor? Explain what you have learned about the work, what attracts you to it and which demands you have considered.",
    assesses: [
      "Informed motivation",
      "Specific reflection",
      "Realistic understanding of medicine",
    ],
    approach: [
      "Choose an experience you can discuss honestly and specifically.",
      "Connect it to the work and responsibilities of a doctor.",
      "Acknowledge a demand or uncertainty and how you explored it.",
    ],
    answer:
      "During a GP observation session, I saw a doctor explore why a patient was struggling with a treatment plan rather than assume they were unwilling to follow it. The patient’s work pattern changed what was practical. That interested me because the doctor had to combine scientific knowledge with listening and a decision the patient could actually use. I am drawn to learning how to assess a problem, weigh evidence and take responsibility for decisions within a team. I also noticed that uncertainty did not disappear by the end of the appointment: the doctor explained what to watch for and arranged review. Reading and speaking with healthcare staff has helped me recognise the workload and emotional demands. I want to keep testing that understanding, rather than assume one positive experience shows the whole career.",
    why: [
      "I connected a concrete observation to a reason for choosing medicine.",
      "I described responsibilities and uncertainty, not just an interest in science.",
      "I acknowledged the limits of my experience and a need to keep learning.",
    ],
    weakAnswer:
      "I love science, want to help people and have always wanted to be a doctor.",
    upgrade:
      "Those interests can begin an answer. Add a truthful observation, what it changed in your understanding and why that combination fits medicine.",
    followUps: [
      {
        question:
          "Could those motivations also lead you into nursing or another healthcare profession?",
        response:
          "Yes, many values and skills are shared. Explain the particular responsibilities you have explored and why they fit you, while recognising the expertise and overlapping roles of other professions. Do not claim doctors alone think scientifically or make decisions.",
      },
      {
        question: "What if you have not had a hospital or GP placement?",
        response:
          "Use genuine caring, volunteering, employment, reading or accessible observation resources. Explain what they taught you and what they cannot show you. Do not invent clinical access or treat prestigious experience as the point.",
      },
    ],
    sources: ["interviews", "birmingham"],
  },
  {
    id: "mmi-team-care",
    topic: "Motivation & reflection",
    title: "What makes a healthcare team work?",
    format: "Reflection",
    personal: true,
    role: "You are an applicant reflecting on teamwork. This worked response describes a fictional observation.",
    question:
      "What have you learned about teamwork in healthcare, and how would you contribute as a medical student? Use an example you can explain in detail.",
    assesses: [
      "Insight into healthcare teams",
      "Respect for other roles",
      "Specific personal contribution",
    ],
    approach: [
      "Describe what different people contributed to one patient’s care.",
      "Explain how information was shared or a disagreement resolved.",
      "Identify a behaviour you can take into medical school.",
    ],
    answer:
      "In a discharge-planning discussion I observed, the question was not only whether a patient’s condition had improved. A nurse raised concerns about managing day-to-day care, a physiotherapist discussed mobility and an occupational therapist highlighted the home environment. The patient explained which support was actually available. I had initially imagined discharge as mainly a doctor’s decision; the discussion showed how incomplete that would be without other expertise and the patient’s perspective. As a student, I would contribute by preparing, listening, being reliable about tasks I can do and checking that important information reaches the right person. I would ask when I do not understand a role rather than assume a hierarchy tells me whose view matters. Good teamwork includes respectful challenge, not simply agreeing with the most senior person.",
    why: [
      "I identified specific contributions rather than listing professions.",
      "I included the patient and explained a change in my understanding.",
      "I named realistic student behaviours and the value of speaking up.",
    ],
    weakAnswer: "Doctors lead and everyone else follows their instructions.",
    upgrade:
      "Explain how different forms of expertise improve a patient’s care and how a team handles questions and disagreement.",
    followUps: [
      {
        question:
          "What if two professionals disagree about whether discharge is safe?",
        response:
          "Clarify the evidence and concern each person is raising, involve the patient and bring the issue to the responsible decision-maker. Do not describe compromise for its own sake if a safety concern remains unresolved.",
      },
      {
        question:
          "Give a teamwork example from your own life if you have not observed a clinical team.",
        response:
          "Describe a real situation, your role and an outcome, then explain how the lesson might transfer to healthcare. Be explicit that a school, work or community example is an analogy, not clinical experience.",
      },
    ],
    sources: ["professionalism", "birmingham"],
  },
  {
    id: "mmi-volunteering-mistake",
    topic: "Motivation & reflection",
    title: "Learning from a mistake while supporting others",
    format: "Reflection",
    personal: true,
    role: "You are an applicant. The worked answer is a fictional care-home volunteering reflection, not an experience to claim as your own.",
    question:
      "Tell us about a mistake you made when someone was relying on you. What did you do afterwards, and what would you take from it into medicine?",
    assesses: ["Honesty", "Reflection", "Behaviour change"],
    approach: [
      "Name your own mistake and its effect.",
      "Explain the repair rather than defending your intention.",
      "Show a specific change and how you checked it helped.",
    ],
    answer:
      "While volunteering at a care home, I agreed to help with a reading activity but failed to check a change in my availability. I told the coordinator too late to arrange a replacement, and a resident who expected the activity was disappointed. I apologised without blaming my timetable and asked the coordinator how I could help put it right. I then started confirming commitments in writing, keeping one calendar and notifying the coordinator as soon as a clash appeared. Over the following weeks I kept the agreed visits and checked that the new arrangement was useful. It taught me that reliability is part of caring, even when a task seems small. In medicine I would want to bring that habit of communicating early, while recognising that clinical mistakes require the appropriate safety and reporting processes as well.",
    why: [
      "I took responsibility and described an effect on another person.",
      "I gave a practical repair and evidence of a changed habit.",
      "I connected the lesson to healthcare without equating a missed activity with a clinical incident.",
    ],
    weakAnswer: "I am a perfectionist, so my mistake is caring too much.",
    upgrade:
      "Use a real, proportionate example with a consequence and a change in behaviour. Reflection is not a disguised compliment.",
    followUps: [
      {
        question:
          "How do you know you improved, rather than just intended to improve?",
        response:
          "Point to a concrete follow-up: keeping subsequent commitments, checking with the coordinator or noticing fewer missed handovers. Avoid claiming that one new habit means you will never make another mistake.",
      },
      {
        question:
          "What if admitting the mistake might make you look unreliable?",
        response:
          "That discomfort is part of taking responsibility. Concealing it would make repair and learning harder. Explain the facts, address the effect and show how you are changing.",
      },
    ],
    sources: ["professionalism", "interviews"],
  },
  {
    id: "mmi-pressure-support",
    topic: "Motivation & reflection",
    title: "Handling pressure without pretending to be invulnerable",
    format: "Reflection",
    personal: true,
    role: "You are an applicant discussing your own coping strategies and understanding of medical training. The example is fictional.",
    question:
      "Medicine can involve sustained pressure and emotionally difficult situations. Tell us how you have handled pressure and when you would seek support.",
    assesses: [
      "Self-awareness",
      "Sustainable coping",
      "Appropriate help-seeking",
    ],
    approach: [
      "Use a specific example with an observable warning sign.",
      "Describe what you changed and who helped.",
      "Connect the lesson to safe, sustainable medical training.",
    ],
    answer:
      "When exams overlapped with a regular community volunteering commitment, I started sleeping less and missed details in tasks I normally managed well. I initially tried to solve it by working later, which made the problem worse. I spoke with a tutor and the volunteer coordinator, made a realistic plan and reduced a commitment temporarily rather than let people down without warning. Asking for help did not remove my responsibilities; it helped me meet them more reliably. Medical training will bring pressures I have not yet experienced, so I would pay attention to changes in my functioning, use the school’s support routes and speak to a supervisor early if I was struggling on placement. I would not wait for a concern to affect patient care before seeking help.",
    why: [
      "I identified a specific warning sign rather than saying I never feel stress.",
      "I explained an action, support and a lesson from the experience.",
      "I recognised that my current coping strategies may need to develop during medical training.",
    ],
    weakAnswer: "I work well under any pressure, so I would just push through.",
    upgrade:
      "Reliability includes recognising limits. Explain how you notice difficulty, adapt and involve appropriate support.",
    followUps: [
      {
        question: "Does needing help mean someone is not suited to medicine?",
        response:
          "No. Appropriate help-seeking can protect both the person and patients. The important issues are insight, accessing support and managing responsibilities safely, not pretending to be unaffected.",
      },
      {
        question:
          "A fellow student seems overwhelmed and asks you to keep it secret.",
        response:
          "Listen and encourage them to use appropriate support. Do not promise secrecy if there is a serious safety concern. If worried, seek timely advice through the medical school or placement route, sharing only what is necessary.",
      },
    ],
    sources: ["safety", "interviews"],
  },
  {
    id: "mmi-lifestyle-care",
    topic: "NHS & public health",
    title: "Should lifestyle affect access to NHS treatment?",
    format: "Discussion",
    role: "You are discussing a fictional NHS policy proposal in England with an MMI interviewer.",
    question:
      "Someone argues that people with smoking-related illness should receive lower priority because they have “caused their own problems”. How would you evaluate that proposal?",
    assesses: [
      "Fairness",
      "Understanding health inequalities",
      "Balanced policy discussion",
    ],
    approach: [
      "Separate blame from clinically relevant factors.",
      "Consider addiction, circumstances, access and consequences of the policy.",
      "Offer a fairer approach that still uses resources responsibly.",
    ],
    answer:
      "I would distinguish allocating care according to clinical need from judging whether someone deserves help. Smoking can affect health and treatment outcomes, so a clinician may need to discuss it when assessing benefit, risk and support. That is different from punishment. Addiction, deprivation, stress and access to support complicate the idea that a health problem is simply a freely chosen consequence. A blame-based rule could also deter people from seeking care and would be difficult to apply consistently across many behaviours. I would favour transparent clinical criteria, evidence-based support to stop smoking and attention to barriers to accessing that support. Limited resources are a real concern, but decisions should explain expected benefit and fairness rather than place a moral value on the patient.",
    why: [
      "I separated clinical relevance from blame or social worth.",
      "I recognised structural factors without denying that behaviour can affect health.",
      "I proposed a practical alternative and acknowledged limited resources.",
    ],
    weakAnswer:
      "They made their choice, so other patients deserve treatment more.",
    upgrade:
      "Consider the purpose and effects of the rule. Explain need, benefit, risk and support instead of assuming illness establishes fault.",
    followUps: [
      {
        question: "What if smoking changes the risk of a particular procedure?",
        response:
          "That may be clinically relevant and should be assessed by the responsible team using evidence and consistent criteria. A discussion of risk reduction is different from excluding someone because they are considered blameworthy.",
      },
      {
        question: "Why spend money on prevention as well as treatment?",
        response:
          "Prevention can reduce future illness and improve quality of life, while treatment addresses people who need care now. Explain the evidence, opportunity costs and how support reaches those facing the greatest barriers.",
      },
    ],
    sources: ["nhs", "professionalism"],
  },
  {
    id: "mmi-digital-access",
    topic: "NHS & public health",
    title: "An online-only GP booking system",
    format: "Discussion",
    role: "You are advising on a fictional GP service improvement proposal in England.",
    question:
      "A GP practice proposes moving all appointment requests online to reduce telephone queues. Who might benefit, who might struggle and what would a fairer plan look like?",
    assesses: [
      "Health inequalities",
      "Evaluating trade-offs",
      "Practical service design",
    ],
    approach: [
      "Identify benefits without assuming everyone has the same access.",
      "Name concrete barriers and ask affected patients about them.",
      "Propose alternatives and measures of success beyond speed.",
    ],
    answer:
      "Online requests could help people who cannot wait on the phone during working hours and may make some information easier to organise. But an online-only system could exclude patients without reliable internet, a suitable device, digital confidence, accessible software or privacy at home. Language and disability needs also matter; age alone is not a reliable guide to someone’s ability. I would involve patients who face these barriers before changing the service, retain usable telephone and in-person routes and offer support for people who want to use the online option. I would compare access and outcomes across groups, not just count how many online forms were submitted. A faster average response could still conceal a service becoming harder to reach for patients with greater need.",
    why: [
      "I described both benefits and specific barriers without stereotyping.",
      "I offered practical alternative routes and patient involvement.",
      "I proposed checking who gains or loses, not just the average speed.",
    ],
    weakAnswer:
      "Everyone has a smartphone now, so this is obviously more efficient.",
    upgrade:
      "Access to a device does not guarantee the ability, connectivity or privacy needed to use it for healthcare.",
    followUps: [
      {
        question:
          "Keeping several routes open costs more. How would you justify that?",
        response:
          "Compare the full costs and benefits, including missed care and staff time spent resolving access failures. Test the design with affected patients and target support; do not treat exclusion as a free efficiency saving.",
      },
      {
        question: "What would you measure after introducing the system?",
        response:
          "Time to appropriate help, unsuccessful attempts to contact the practice, patient experience and variation between groups. Use accessible feedback methods so people excluded online can still be heard.",
      },
    ],
    sources: ["access", "nhs"],
  },
  {
    id: "mmi-prevention-budget",
    topic: "NHS & public health",
    title: "Prevention or another treatment clinic?",
    format: "Discussion",
    role: "You are discussing a fictional local NHS funding decision. No real budget or outcome figures are implied.",
    question:
      "A local service can fund either extra appointments for people already unwell or an outreach programme intended to prevent future illness. How should the decision be made?",
    assesses: [
      "Opportunity cost",
      "Population health",
      "Reasoning under uncertainty",
    ],
    approach: [
      "Ask about the size, timing and certainty of benefit from each option.",
      "Consider unmet need and who can actually access the benefits.",
      "Explain a transparent choice, evaluation and the cost of the option not chosen.",
    ],
    answer:
      "I would want to know what health problems each option addresses, who would benefit, the likely scale and timing of benefit, and the strength of the evidence. Extra appointments may reduce current harm, while effective prevention may avoid future illness; neither is automatically more valuable in every setting. I would also ask whether the outreach reaches people currently underserved and whether the clinic has the staff and follow-up services needed to use extra capacity well. The decision has an opportunity cost: funding one option means losing the benefits of the other. I would involve patients and public health expertise, consider whether a smaller evaluated programme or a mixed approach is feasible, and explain the choice openly. Any proposal needs a plan for checking outcomes and revisiting the decision.",
    why: [
      "I considered present and future patients rather than relying on a slogan.",
      "I asked about evidence, implementation and distribution of benefit.",
      "I explained opportunity cost and an evaluation plan.",
    ],
    weakAnswer: "Prevention is always cheaper, so it should always come first.",
    upgrade:
      "Whether an intervention is effective, affordable and fair depends on the evidence and setting. Avoid assuming all prevention programmes save money.",
    followUps: [
      {
        question:
          "The prevention benefits may not appear for ten years. Does that rule it out?",
        response:
          "No, but the time horizon and uncertainty must be made explicit alongside current unmet need. Discuss how to value longer-term benefit and whether short-term indicators can show whether the programme is reaching people.",
      },
      {
        question:
          "What if the option with the largest total benefit mainly helps affluent patients?",
        response:
          "Examine whether the access pattern can be changed and how each option affects inequalities. Total benefit is important, but a fair decision should also consider who receives it and whose needs remain unmet.",
      },
    ],
    sources: ["nhs", "birmingham"],
  },
  {
    id: "mmi-antibiotic-demand",
    topic: "NHS & public health",
    title: "Antibiotics, patient expectations and resistance",
    format: "Discussion",
    role: "You are an applicant discussing a consultation. A qualified clinician has assessed the fictional patient and explained that antibiotics are not indicated.",
    question:
      "The patient insists on antibiotics and says they will complain unless they receive them. Discuss the responsibilities of the clinician, including the patient’s needs and the wider public health issue.",
    assesses: [
      "Balancing individual and public interests",
      "Evidence-based care",
      "Communication under pressure",
    ],
    approach: [
      "Explore the worry or expectation behind the request.",
      "Explain appropriate use, potential harm and resistance without shaming.",
      "Offer a useful care plan and clear review advice through the clinician.",
    ],
    answer:
      "I would not treat the request as simply a difficult patient: they may be worried about worsening illness, time off work or a previous experience. The clinician should explain the assessment and why an antibiotic is unlikely to help in this case, while discussing appropriate symptom support and when to seek review. Antibiotics treat some bacterial infections, not viral infections, and unnecessary use can cause side effects and contribute to resistance. Avoiding an unhelpful prescription protects both this patient and others, but a lecture about society is not a substitute for listening to their concern. A complaint threat should not determine a clinical prescription. The patient can question the decision or use the complaints process; the clinician should remain respectful, offer a clear plan and reconsider if new clinical information changes the assessment.",
    why: [
      "I took the patient’s concern seriously without equating satisfaction with receiving a prescription.",
      "I connected appropriate use to both individual harms and resistance.",
      "I included a care plan, review and openness to new information.",
    ],
    weakAnswer: "Give them the antibiotics this once to avoid a complaint.",
    upgrade:
      "A prescription needs a clinical justification. Explain a useful alternative plan and address the worry driving the request.",
    followUps: [
      {
        question:
          "Does respecting autonomy mean providing whichever treatment the patient requests?",
        response:
          "Patients should be involved in choices and can refuse treatment. That does not mean a clinician must provide a treatment they judge clinically inappropriate. Explore the request and explain the reasonable options.",
      },
      {
        question: "The patient says their symptoms are getting worse.",
        response:
          "That is new information for the clinician to assess, not a reason to dismiss them as demanding. The plan should be reviewed according to the clinical assessment rather than either automatically prescribing or automatically refusing.",
      },
    ],
    sources: ["antibiotics", "consent"],
  },
  {
    id: "mmi-absolute-risk",
    topic: "Health data & numeracy",
    title: "“It halves the risk”: what does that mean?",
    format: "Data interpretation",
    role: "You are an applicant interpreting a fictional study. No knowledge of a named disease or treatment is required.",
    question:
      "In two equal groups followed for one year, 20 of 1,000 people without a treatment had a particular health event, compared with 10 of 1,000 receiving it. Calculate the absolute and relative risk reductions, then explain the result clearly to a patient. Is this enough to recommend the treatment?",
    assesses: ["Numeracy", "Communicating risk", "Limits of evidence"],
    approach: [
      "Calculate the event rate in each group using the same denominator and period.",
      "Distinguish percentage points from relative percentage change.",
      "Ask about harms, study quality and the patient before recommending anything.",
    ],
    data: {
      caption: "Fictional study · one-year follow-up",
      columns: ["Group", "People", "Health events"],
      rows: [
        ["Without treatment", 1000, 20],
        ["With treatment", 1000, 10],
      ],
    },
    calculations: [
      {
        label: "Absolute risk reduction",
        unit: "percentage points",
        expected: 1,
        tolerance: 0.001,
        working:
          "20/1,000 = 2%; 10/1,000 = 1%. The difference is 1 percentage point.",
        hint: "Subtract the two event percentages. Keep this separate from the relative change.",
      },
      {
        label: "Relative risk reduction",
        unit: "%",
        expected: 50,
        tolerance: 0.01,
        working: "(2% − 1%) ÷ 2% × 100 = 50%.",
        hint: "Divide the fall in risk by the original risk, not by the size of the whole study.",
      },
    ],
    answer:
      "The event rate is 2% without treatment and 1% with treatment over one year. That is an absolute reduction of one percentage point and a relative reduction of 50%. I would explain it as: “In these study groups, about two people out of every hundred had the event without treatment, compared with one out of a hundred with it over a year.” Saying only that risk was halved could make the benefit sound larger than the absolute numbers suggest. I would also ask about side effects, costs, how the groups were allocated, uncertainty in the estimates and whether the participants resemble the patient. These counts alone do not establish what caused the difference or whether the balance of benefit and harm suits a particular person.",
    why: [
      "I used the correct denominator and time period.",
      "I distinguished a 1-percentage-point reduction from a 50% relative reduction.",
      "I explained the result without turning it into an unsupported treatment recommendation.",
    ],
    weakAnswer:
      "The treatment helps 50 out of every 100 people, so everyone should take it.",
    upgrade:
      "A 50% relative reduction is not a 50-percentage-point benefit. Use natural frequencies and discuss the missing evidence.",
    followUps: [
      {
        question:
          "Using these point estimates, how many people would need treatment for one fewer event over a year?",
        response:
          "The absolute reduction is 0.01, so 1 ÷ 0.01 = 100. That is an estimate based on this difference; it would require a valid causal comparison to interpret as a treatment benefit and does not describe harms.",
      },
      {
        question: "How would you check a patient understood your explanation?",
        response:
          "Invite them to explain what they take the numbers to mean, using the same group size and time period. Ask what matters most to them, rather than only asking whether it makes sense.",
      },
    ],
    sources: ["consent", "birmingham"],
  },
  {
    id: "mmi-screening-result",
    topic: "Health data & numeracy",
    title: "Does a positive screening result mean disease?",
    format: "Data interpretation",
    role: "You are interpreting a fictional screening study, not diagnosing an individual patient.",
    question:
      "The table shows screening results for 1,000 people whose true condition status is known for this exercise. How many screened positive? Of those, what percentage actually had the condition? Explain why a positive screening result needs careful follow-up.",
    assesses: [
      "Choosing the denominator",
      "Screening versus diagnosis",
      "Communicating uncertainty",
    ],
    approach: [
      "Add all positive results, including false positives.",
      "Divide true positives by all positives, not by everyone with the condition.",
      "Explain further assessment without false alarm or reassurance.",
    ],
    data: {
      caption: "Fictional screening study · 1,000 participants",
      columns: [
        "Actual condition status",
        "Screen positive",
        "Screen negative",
      ],
      rows: [
        ["Condition present", 40, 10],
        ["Condition absent", 95, 855],
      ],
    },
    calculations: [
      {
        label: "Total positive screening results",
        unit: "people",
        expected: 135,
        tolerance: 0,
        working:
          "40 true positives + 95 false positives = 135 positive results.",
        hint: "Count both rows in the positive-results column.",
      },
      {
        label: "Positive results with the condition",
        unit: "% (one decimal place)",
        expected: (40 / 135) * 100,
        tolerance: 0.06,
        working: "40 ÷ 135 × 100 ≈ 29.6%.",
        hint: "The denominator is everyone who screened positive, not just those who have the condition.",
      },
    ],
    answer:
      "There are 135 positive results: 40 among people with the condition and 95 among people without it. Of those who screened positive, 40 divided by 135 is about 29.6%, or roughly three in ten, who actually have the condition in this fictional study. A positive screen therefore does not establish a diagnosis. I would explain that screening identifies people who may need further assessment, and the appropriate clinical team would discuss the follow-up tests. I would also avoid saying a negative result guarantees someone is well: the table includes ten people with the condition who screened negative. These numbers describe this study population; the chance that a positive result represents disease can change in a different population.",
    why: [
      "I counted all positive results before calculating the percentage.",
      "I distinguished the result of screening from a confirmed diagnosis.",
      "I recognised false negatives and the limits of applying the study to another population.",
    ],
    weakAnswer:
      "It found 40 of the 50 cases, so a positive result means an 80% chance of disease.",
    upgrade:
      "That calculation describes how many existing cases were detected. The question asks how many positive results are true positives: 40 out of 135.",
    followUps: [
      {
        question:
          "How would the chance after a positive result change if the condition were much rarer, with the same test performance?",
        response:
          "Generally it would fall: there would be fewer true cases among those tested, while false positives could form a larger share of positive results. Explain the reasoning rather than assuming test accuracy alone fixes that chance.",
      },
      {
        question:
          "Someone has symptoms despite a negative screening result. What would you say?",
        response:
          "A negative screen does not rule out every problem. They should discuss their symptoms with a qualified clinician; I would not reassure them solely from these hypothetical screening numbers.",
      },
    ],
    sources: ["screening", "birmingham"],
  },
  {
    id: "mmi-hospital-comparison",
    topic: "Health data & numeracy",
    title: "Which hospital looks safer?",
    format: "Data interpretation",
    role: "You are assessing fictional hospital outcome data. The risk groups are provided; no clinical classification knowledge is needed.",
    question:
      "Hospital B has a higher overall death rate. Does that establish it gives worse care? Calculate the overall rates from the table and consider how the mix of patients affects the comparison. All outcomes use the same follow-up period.",
    assesses: ["Critical appraisal", "Case mix", "Avoiding overclaiming"],
    approach: [
      "Add the cases and deaths within each hospital before calculating rates.",
      "Compare like risk groups, not only the combined totals.",
      "Ask about data quality and other differences before attributing outcomes to care.",
    ],
    data: {
      caption: "Fictional hospital data · same follow-up period",
      columns: ["Hospital / risk group", "Patients", "Deaths"],
      rows: [
        ["A · lower risk", 1800, 18],
        ["A · higher risk", 200, 20],
        ["B · lower risk", 200, 2],
        ["B · higher risk", 800, 64],
      ],
    },
    calculations: [
      {
        label: "Hospital A overall death rate",
        unit: "%",
        expected: 1.9,
        tolerance: 0.01,
        working: "(18 + 20) ÷ (1,800 + 200) × 100 = 1.9%.",
        hint: "Add A’s two groups. Do not take an unweighted average of their percentages.",
      },
      {
        label: "Hospital B overall death rate",
        unit: "%",
        expected: 6.6,
        tolerance: 0.01,
        working: "(2 + 64) ÷ (200 + 800) × 100 = 6.6%.",
        hint: "Use B’s total deaths divided by B’s total patients.",
      },
    ],
    answer:
      "Hospital A has 38 deaths among 2,000 patients, or 1.9%. Hospital B has 66 among 1,000, or 6.6%. However, 80% of B’s patients are in the higher-risk group, compared with 10% at A. Within the lower-risk group both rates are 1%; within the higher-risk group A’s rate is 10% and B’s is 8%. So the crude totals do not establish that B provides worse care. They are strongly affected by the mix of patients. I would want to know how risk was classified, whether reporting is comparable, the uncertainty around the estimates and whether there are other relevant differences. These figures also do not by themselves prove that B’s care causes better outcomes; they tell us why a fairer comparison is needed.",
    why: [
      "I calculated weighted overall rates from counts.",
      "I used within-group comparisons to explain the misleading crude comparison.",
      "I avoided claiming the data proves either hospital causes better outcomes.",
    ],
    weakAnswer:
      "B has more than three times A’s death rate, so patients should avoid B.",
    upgrade:
      "Check the case mix before attributing the difference to quality of care. Counts, denominators and comparable groups all matter.",
    followUps: [
      {
        question:
          "What is the main problem with comparing the two headline percentages?",
        response:
          "The hospitals treat different proportions of higher-risk patients. The same headline measure combines different populations, so a difference can reflect case mix rather than a difference in care.",
      },
      {
        question: "Would risk adjustment settle every question about quality?",
        response:
          "No. It depends on which factors were measured and how well they were recorded. Patient experience, complications and other outcomes may also matter, and observational comparisons retain uncertainty.",
      },
    ],
    sources: ["birmingham"],
  },
  {
    id: "mmi-appointment-reminders",
    topic: "Health data & numeracy",
    title: "Did text reminders reduce missed appointments?",
    format: "Data interpretation",
    role: "You are evaluating a fictional GP service improvement. This is a reasoning exercise, not a report of an NHS study.",
    question:
      "A practice introduced text reminders. Missed appointments fell from 20 out of 100 appointments in one month to 12 out of 100 the next. Calculate the absolute and relative reductions. Can the practice conclude that the reminders caused the improvement?",
    assesses: [
      "Absolute versus relative change",
      "Causation",
      "Equity in service evaluation",
    ],
    approach: [
      "State the observed change accurately.",
      "Consider other changes and a fair comparison.",
      "Check who receives the reminders and what happens to patients who do not.",
    ],
    data: {
      caption: "Fictional GP appointment audit · different months",
      columns: ["Period", "Appointments", "Missed appointments"],
      rows: [
        ["Before reminders", 100, 20],
        ["After reminders", 100, 12],
      ],
    },
    calculations: [
      {
        label: "Absolute reduction in missed appointment rate",
        unit: "percentage points",
        expected: 8,
        tolerance: 0.01,
        working: "20% − 12% = 8 percentage points.",
        hint: "Subtract the two rates; a relative percentage uses a different calculation.",
      },
      {
        label: "Relative reduction in missed appointment rate",
        unit: "%",
        expected: 40,
        tolerance: 0.01,
        working: "(20 − 12) ÷ 20 × 100 = 40%.",
        hint: "Compare the fall of 8 with the original rate of 20.",
      },
    ],
    answer:
      "The missed appointment rate fell from 20% to 12%, an absolute reduction of eight percentage points and a relative reduction of 40%. That is promising, but a comparison of two months does not show the reminders caused the change. The patient mix, appointment types, holidays or other service changes might differ, and random variation is possible. I would look at more periods and, if feasible, a comparable group or a well-designed phased evaluation. I would also check whether reminders reached the right people, whether patients could easily cancel or rearrange and whether those without a working mobile number were disadvantaged. Success should include better access and fewer wasted appointments, not only a headline percentage.",
    why: [
      "I separated the absolute and relative reductions correctly.",
      "I distinguished an observed improvement from a causal conclusion.",
      "I included access, implementation and a way to evaluate the change.",
    ],
    weakAnswer:
      "Attendance improved by 40%, which proves the texts work for everyone.",
    upgrade:
      "It is the missed-appointment rate that fell by 40% relative to its starting point. Causation and benefit for every group need separate evidence.",
    followUps: [
      {
        question:
          "What if the patients receiving texts were younger than those who did not?",
        response:
          "That creates a comparability problem. Other differences may explain attendance patterns. Examine those differences and use a design or analysis that addresses them rather than crediting the messages alone.",
      },
      {
        question: "Could reminders ever create a confidentiality problem?",
        response:
          "Yes: a shared phone, outdated number or unnecessarily detailed message could reveal information. Ask about consent and contact preferences, keep messages appropriate and follow the service’s information governance process.",
      },
    ],
    sources: ["birmingham", "confidentiality", "access"],
  },
];
