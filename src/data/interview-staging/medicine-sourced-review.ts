/** Publicly published examples, paraphrased for editorial review. Never a runtime question bank. */
export const REVIEW_BATCH = {
  id: "medicine-sources-2026-10-02",
  title: "Published Medicine interview examples",
  checkedAt: "2026-10-02",
  description:
    "24 proposals from universities, the NHS and medical organisations. Review the wording and source before approving a question for a future release.",
};

export interface QuestionSource {
  id: string;
  publisher: string;
  title: string;
  url: string;
  access: "full" | "indexed";
  note: string;
}

export const QUESTION_SOURCES: QuestionSource[] = [
  {
    id: "rcs",
    publisher: "Royal College of Surgeons of England",
    title: "Medical School Interview Questions",
    url: "https://www.rcseng.ac.uk/careers-in-surgery/careers-support/applying-to-medical-school/interview-questions/",
    access: "full",
    note: "Public preparation examples, not a school-specific past paper. This batch uses the questions, not the page’s older admissions or healthcare-system claims.",
  },
  {
    id: "nhs",
    publisher: "NHS Health Careers",
    title: "Interviews for medical school",
    url: "https://www.healthcareers.nhs.uk/printpdf/873",
    access: "indexed",
    note: "Question text verified in the official search index. Direct retrieval was unavailable. These are preparation examples; current policy is not established by this source.",
  },
  {
    id: "msc-mock",
    publisher: "Medical Schools Council",
    title: "How to run a mock MMI",
    url: "https://www.medschools.ac.uk/wp-content/uploads/2025/05/how-to-run-a-mock-mmi.pdf",
    access: "full",
    note: "Public mock-station guide by Olivia Eguiguren Wray, linked from the MSC website. Older teaching resource; timings and clinical guidance are not treated as current admission rules.",
  },
  {
    id: "msc-leaflet",
    publisher: "Medical Schools Council",
    title: "Interviews — Test yourself",
    url: "https://www.medschools.ac.uk/media/2773/interviews.pdf",
    access: "indexed",
    note: "Three publicly indexed preparation prompts. The leaflet also contains historical pandemic advice, which is excluded from this batch.",
  },
  {
    id: "qub",
    publisher: "Queen’s University Belfast",
    title: "Medicine — sample MMI stations",
    url: "https://www.qub.ac.uk/schools/mdbs/Study/Medicine/HowtoApply/MMIs/",
    access: "indexed",
    note: "Official indexed text includes the complete sample scenarios. Direct page returned 403. These are published examples, not confidential current stations.",
  },
  {
    id: "oxford",
    publisher: "University of Oxford",
    title: "Sample interview questions — Medicine",
    url: "https://www.ox.ac.uk/admissions/undergraduate/applying/guide-for-applicants/interviews/sample_questions",
    access: "full",
    note: "Medicine examples attributed to Andrew King and Chris Norbury. Academic discussion, not MMI. Historical country rankings must not be presented as current statistics.",
  },
  {
    id: "lancaster",
    publisher: "Lancaster University",
    title: "Medicine applicants — examples of MMI stations",
    url: "https://www.lancaster.ac.uk/lms/medicine/mbchb-medicine-and-surgery/entry-requirements/medicine-applicants/",
    access: "indexed",
    note: "Official indexed example 3; original URL currently returns 404. Retained for source review, with current-page verification required before release.",
  },
  {
    id: "gosh",
    publisher: "Great Ormond Street Hospital",
    title: "Medical School Interviews — Good v Weak Interview Responses",
    url: "https://media.gosh.nhs.uk/documents/2._Medical_School_Interview_Preparation_and_Interview_Response_Analysis.pdf",
    access: "full",
    note: "Public NHS-hosted teaching slides, retrieved and text-extracted. This batch does not reproduce the worked responses or treat them as an official marking scheme.",
  },
];

export interface ReviewQuestion {
  id: string;
  title: string;
  topic: string;
  format: "Discussion" | "Roleplay" | "Academic";
  sourceId: string;
  locator: string;
  question: string;
  followUp: string;
  reviewFocus: string;
  releaseChecks: string[];
}

/** Editorial overlap checks against existing stations; avoid publishing near-duplicates. */
export const RELATED_LIVE_QUESTIONS: Record<
  string,
  Array<{ id: string; title: string }>
> = {
  "SRC-RCS-01": [
    { id: "MED-M1", title: "Why Medicine" },
    {
      id: "MED-MR-11",
      title: "Why medicine — and what nearly changed your mind?",
    },
  ],
  "SRC-RCS-03": [
    { id: "MED-MR-15", title: "What will you find hardest about training?" },
  ],
  "SRC-NHS-02": [
    { id: "MED-CA-19", title: "Should the NHS use private hospitals?" },
    { id: "MED-CA-21", title: "Private Providers in the NHS" },
  ],
  "SRC-MSC-03": [
    { id: "MED-M3", title: "A Mistake You Made" },
    { id: "MED-MR-14", title: "A real failure, and its cost" },
  ],
  "SRC-LEAF-01": [
    { id: "MED-M4", title: "Work Experience Reality Check" },
    {
      id: "MED-MR-13",
      title: "Something from your work experience that changed how you think",
    },
  ],
  "SRC-GOSH-01": [
    { id: "MED-MR-12", title: "Why not nursing, or a physician associate?" },
  ],
  "SRC-GOSH-02": [
    { id: "MED-CA-16", title: "Should vaccination ever be mandatory?" },
  ],
};

// Follow-ups and review notes are editorial suggestions, not quotations or university mark schemes.
export const SOURCED_QUESTIONS: ReviewQuestion[] = [
  {
    id: "SRC-RCS-01",
    title: "Choosing the doctor’s role",
    topic: "Motivation",
    format: "Discussion",
    sourceId: "rcs",
    locator: "Background, motivation and personal insight",
    question: "What has led you to choose a career as a doctor?",
    followUp: "Which experience most tested that decision?",
    reviewFocus: "Specific evidence of an informed choice.",
    releaseChecks: [],
  },
  {
    id: "SRC-RCS-02",
    title: "Qualities patients need",
    topic: "Professionalism",
    format: "Discussion",
    sourceId: "rcs",
    locator: "What makes a good doctor?",
    question: "Which qualities matter in a good doctor, and why?",
    followUp: "What would that quality look like in practice?",
    reviewFocus: "Connect qualities to patient care.",
    releaseChecks: [],
  },
  {
    id: "SRC-RCS-03",
    title: "A challenging medical degree",
    topic: "Reflection",
    format: "Discussion",
    sourceId: "rcs",
    locator: "Greatest challenge in completing medical school",
    question:
      "Which part of training to become a doctor would challenge you most?",
    followUp: "How would you recognise when you needed support?",
    reviewFocus: "Self-awareness with a practical response.",
    releaseChecks: [],
  },
  {
    id: "SRC-RCS-04",
    title: "Understanding levels of care",
    topic: "NHS and healthcare",
    format: "Discussion",
    sourceId: "rcs",
    locator: "Interest in medicine — primary and secondary care",
    question: "How would you distinguish primary care from secondary care?",
    followUp: "How might services work together for one patient?",
    reviewFocus: "Clear explanation without oversimplifying services.",
    releaseChecks: ["Check current NHS terminology before release."],
  },
  {
    id: "SRC-RCS-05",
    title: "Population health priorities",
    topic: "NHS and healthcare",
    format: "Discussion",
    sourceId: "rcs",
    locator: "Medicine and society — healthcare intervention",
    question:
      "Choose one intervention that could substantially improve population health. Explain your choice.",
    followUp: "What evidence could challenge your priority?",
    reviewFocus: "A justified choice acknowledging trade-offs.",
    releaseChecks: [],
  },
  {
    id: "SRC-NHS-01",
    title: "Care closer to home",
    topic: "NHS and healthcare",
    format: "Discussion",
    sourceId: "nhs",
    locator: "Questions about healthcare in the UK/ethical questions",
    question:
      "Discuss the benefits and difficulties of providing more patient care in the community.",
    followUp: "Whose needs might your proposal overlook?",
    reviewFocus: "Consider access, support and patient circumstances.",
    releaseChecks: ["Recheck the original source before release."],
  },
  {
    id: "SRC-NHS-02",
    title: "Who provides NHS care?",
    topic: "NHS and healthcare",
    format: "Discussion",
    sourceId: "nhs",
    locator: "Questions about healthcare in the UK/ethical questions",
    question:
      "How would you evaluate NHS-funded care delivered by organisations outside the NHS?",
    followUp: "Which outcomes would you compare?",
    reviewFocus: "Separate funding, provision and quality.",
    releaseChecks: [
      "Recheck the original source and current policy before release.",
    ],
  },
  {
    id: "SRC-NHS-03",
    title: "Fertility funding and fairness",
    topic: "Ethics",
    format: "Discussion",
    sourceId: "nhs",
    locator:
      "Questions about healthcare in the UK/ethical questions — fertility",
    question:
      "Discuss whether NHS fertility treatment should be funded for people older than forty.",
    followUp: "How would you weigh fairness against limited resources?",
    reviewFocus: "Reasoned trade-offs without stereotyping patients.",
    releaseChecks: [
      "Medical educator review; verify current policy separately.",
    ],
  },
  {
    id: "SRC-NHS-04",
    title: "Breathing at altitude",
    topic: "Scientific reasoning",
    format: "Academic",
    sourceId: "nhs",
    locator: "Science questions",
    question:
      "Explain why breathing can become more difficult at high altitude.",
    followUp: "Which part of your explanation could you measure?",
    reviewFocus: "A mechanism, with assumptions made explicit.",
    releaseChecks: ["Recheck the original source before release."],
  },
  {
    id: "SRC-MSC-01",
    title: "A refusal and uncertain capacity",
    topic: "Ethics",
    format: "Discussion",
    sourceId: "msc-mock",
    locator: "Medical ethics B — printed page 23",
    question:
      "An older patient refuses a last-option leg amputation. He is confused; his two sons disagree about treatment. How should the team approach the decision?",
    followUp: "What must be established before deciding?",
    reviewFocus: "Respectful reasoning within the applicant’s limits.",
    releaseChecks: [
      "Medical educator review of capacity and consent guidance.",
    ],
  },
  {
    id: "SRC-MSC-02",
    title: "Explaining vaccination",
    topic: "Communication",
    format: "Discussion",
    sourceId: "msc-mock",
    locator: "Communication skills B — printed page 31",
    question:
      "Explain vaccination to someone without scientific knowledge, including benefits and drawbacks.",
    followUp: "How would your explanation change for a five-year-old?",
    reviewFocus: "Accessible, accurate language.",
    releaseChecks: ["Medical educator review of the explanation."],
  },
  {
    id: "SRC-MSC-03",
    title: "Learning from a mistake",
    topic: "Reflection",
    format: "Discussion",
    sourceId: "msc-mock",
    locator: "Personal attributes A — printed page 41",
    question:
      "Discuss a significant mistake or failure and what changed afterwards.",
    followUp: "How is that learning relevant to medicine?",
    reviewFocus: "Specific reflection rather than a rehearsed success story.",
    releaseChecks: [],
  },
  {
    id: "SRC-MSC-04",
    title: "Future pressures on the NHS",
    topic: "NHS and healthcare",
    format: "Discussion",
    sourceId: "msc-mock",
    locator: "Insight into the NHS and healthcare A — printed page 25",
    question:
      "Which two challenges could place the greatest pressure on the NHS over the next twenty years?",
    followUp: "How would you approach one of them?",
    reviewFocus: "Explain priorities and acknowledge uncertainty.",
    releaseChecks: ["Check any statistics used in future guidance."],
  },
  {
    id: "SRC-LEAF-01",
    title: "Experience and self-knowledge",
    topic: "Reflection",
    format: "Discussion",
    sourceId: "msc-leaflet",
    locator: "Test yourself — work experience",
    question: "What did relevant work experience teach you about yourself?",
    followUp: "What would you do differently now?",
    reviewFocus:
      "Accept caring, volunteering and ordinary work as relevant experience.",
    releaseChecks: [],
  },
  {
    id: "SRC-LEAF-02",
    title: "Choosing a medical school",
    topic: "Motivation",
    format: "Discussion",
    sourceId: "msc-leaflet",
    locator: "Test yourself — school and university choice",
    question: "Why does your chosen medical school suit you?",
    followUp: "Which aspect of its course would stretch you?",
    reviewFocus: "Specific course research tied to personal learning needs.",
    releaseChecks: ["Supply the candidate’s chosen school before asking."],
  },
  {
    id: "SRC-LEAF-03",
    title: "An interest within medicine",
    topic: "Motivation",
    format: "Discussion",
    sourceId: "msc-leaflet",
    locator: "Test yourself — elements of medicine",
    question:
      "Which aspect of medicine most interests you, and what have you explored about it?",
    followUp: "What remains uncertain to you?",
    reviewFocus: "Curiosity without expecting specialist expertise.",
    releaseChecks: [],
  },
  {
    id: "SRC-QUB-01",
    title: "Supporting a fellow medical student",
    topic: "Communication",
    format: "Roleplay",
    sourceId: "qub",
    locator: "Sample interview station 1",
    question:
      "You are a first-year medical student. At a bus stop after class, a classmate whose name you do not know seems upset. Speak to them and explore whether they want support.",
    followUp: "Respond to what your classmate actually shares.",
    reviewFocus: "Listening without assumptions or pressure.",
    releaseChecks: [
      "Review a complete actor pack before live use; do not invent a crisis.",
    ],
  },
  {
    id: "SRC-QUB-02",
    title: "A family disagreement about treatment",
    topic: "Ethics",
    format: "Discussion",
    sourceId: "qub",
    locator: "Sample interview station 3",
    question:
      "Your 70-year-old grandfather has a condition expected to be fatal within five years. A procedure could cure it without lasting problems but carries a 10% risk of death. He wants it; your mother objects. How would you help them discuss this?",
    followUp: "What is your role in this conversation?",
    reviewFocus:
      "Explore preferences, uncertainty and the limits of family mediation.",
    releaseChecks: [
      "Medical educator review; this is a family discussion, not treatment advice.",
    ],
  },
  {
    id: "SRC-OX-01",
    title: "Comparing mortality between countries",
    topic: "Data interpretation",
    format: "Academic",
    sourceId: "oxford",
    locator: "Medicine — Andrew King, Exeter College",
    question:
      "How would you reason about the ordering of crude death rates in Bangladesh, Japan, South Africa and the UK? Crude mortality means deaths per thousand people.",
    followUp: "How could population age change your comparison?",
    reviewFocus:
      "Explore confounding; do not score a memorised historical ranking.",
    releaseChecks: ["Attach dated data before using any numerical answer key."],
  },
  {
    id: "SRC-OX-02",
    title: "Viruses and their hosts",
    topic: "Scientific reasoning",
    format: "Academic",
    sourceId: "oxford",
    locator: "Medicine — Chris Norbury, The Queen’s College",
    question:
      "Viruses need human cells to reproduce. How can you explain why they nevertheless cause disease?",
    followUp: "Could a virus spread successfully without causing symptoms?",
    reviewFocus: "Develop and test a biological explanation.",
    releaseChecks: ["Academic subject review before release."],
  },
  {
    id: "SRC-LAN-01",
    title: "Meeting a patient representative",
    topic: "Communication",
    format: "Roleplay",
    sourceId: "lancaster",
    locator: "Examples of MMI stations — example 3",
    question:
      "As a medicine applicant, have a conversation with a patient or public representative to learn about them. This is not a medical-history exercise. Ask questions and respond to their answers.",
    followUp: "Follow their response rather than a checklist.",
    reviewFocus: "Reciprocal conversation and attentive listening.",
    releaseChecks: [
      "Replace the unavailable source link with a verified current source; prepare an actor pack before live use.",
    ],
  },
  {
    id: "SRC-GOSH-01",
    title: "Medicine within the healthcare team",
    topic: "Motivation",
    format: "Discussion",
    sourceId: "gosh",
    locator: "Slide 8 — other healthcare professions",
    question:
      "What attracts you to the doctor’s role compared with another healthcare profession?",
    followUp: "How do those roles complement each other?",
    reviewFocus:
      "An informed preference without diminishing other professions.",
    releaseChecks: [],
  },
  {
    id: "SRC-GOSH-02",
    title: "Childhood vaccination policy",
    topic: "Ethics",
    format: "Discussion",
    sourceId: "gosh",
    locator: "Slide 10 — vaccination policy question",
    question:
      "Should childhood vaccination be compulsory? Explain your position.",
    followUp: "What is the strongest objection to your approach?",
    reviewFocus: "Weigh public benefit, trust, access and individual choice.",
    releaseChecks: [
      "Medical educator review; distinguish ethical debate from current law.",
    ],
  },
  {
    id: "SRC-GOSH-03",
    title: "Teamwork and patient care",
    topic: "Teamwork",
    format: "Discussion",
    sourceId: "gosh",
    locator: "Slide 14 — question 3",
    question:
      "Describe a successful team you worked in. What made it effective, and how does that relate to doctors working in the NHS?",
    followUp: "What was your own contribution?",
    reviewFocus: "Evidence of collaboration and transferable learning.",
    releaseChecks: [],
  },
];
