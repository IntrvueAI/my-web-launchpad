export interface PracticeExample {
  id: string;
  topic: string;
  title: string;
  question: string;
  interviewType: string;
  answer: string;
  why: string[];
  avoid: string;
  challenge: string;
  source: string;
}
// Original illustrative answers, not university questions or claims of a perfect mark.
const professionalism =
  "https://www.gmc-uk.org/education/standards-guidance-and-curricula/guidance/student-professionalism-and-ftp/achieving-good-medical-practice";
const interviews =
  "https://www.medschools.ac.uk/for-students/applying-to-medical-school/interviews/";
export const PRACTICE_EXAMPLES: PracticeExample[] = [
  {
    id: "honest-record",
    topic: "Ethics",
    title: "Honesty under pressure",
    interviewType: "medicine-ethics-practice",
    question:
      "A friend asks you to confirm volunteering hours you know they did not complete. How would you respond?",
    answer:
      "I would speak to them privately and ask what has happened, without agreeing to confirm an inaccurate record. They may be under pressure, but that does not make the record fair or reliable. I would explain that I can only confirm hours I know they completed and encourage them to correct the record with the coordinator. I could help them explain the situation honestly. If an inaccurate record had already been submitted, I would seek appropriate guidance about correcting it, sharing only the information needed.",
    why: [
      "Clarifies the situation before assuming a motive.",
      "Sets a clear boundary and explains why it matters.",
      "Offers a practical, proportionate way forward.",
    ],
    avoid:
      "Listing ethical principles without explaining what you would actually do.",
    challenge:
      "What if your friend says they will lose an important opportunity?",
    source: professionalism,
  },
  {
    id: "fair-allocation",
    topic: "Ethics",
    title: "Making a fair choice",
    interviewType: "medicine-ethics-practice",
    question:
      "A community project can fund only one of two proposed activities. What would make the decision fair?",
    answer:
      "I would first agree the purpose of the funding and ask what evidence we have about each activity. I would compare expected benefit, cost, who can access it and whether either group is currently underserved. I would ask representatives of both groups for their views and disclose any personal connection I had. I would explain the criteria before making the choice, record the reasons and acknowledge what we still do not know. If the evidence is close, a small pilot could help us learn before committing the whole budget.",
    why: [
      "States the decision criteria explicitly.",
      "Considers access as well as total benefit.",
      "Explains uncertainty and a way to reduce it.",
    ],
    avoid:
      "Choosing the largest group automatically without considering need or access.",
    challenge:
      "How would your answer change if one option had much less certain evidence?",
    source: interviews,
  },
  {
    id: "upset-volunteer",
    topic: "Communication",
    title: "Responding to frustration",
    interviewType: "medicine-roleplay-practice",
    question:
      "You coordinate a student volunteering group. A volunteer says: “Nobody listens to me. I am leaving.” Respond to them.",
    answer:
      "It sounds as though you have felt overlooked. Would you tell me about a time that happened? [Pause and listen.] Thank you for explaining. Have I understood correctly that you suggested changing the rota, but nobody replied? I can see why that was frustrating. I cannot promise the rota will change, but I can make sure the coordinator hears your concern and ask for a response. What would help you feel heard now? Would you like to speak to them together, or would you prefer me to help arrange a private conversation?",
    why: [
      "Acknowledges the concern before offering a solution.",
      "Checks understanding with a specific summary.",
      "Offers a choice without promising an outcome.",
    ],
    avoid:
      "Saying “calm down” or promising to fix something outside your control.",
    challenge: "What would you say if they rejected your first suggestion?",
    source: professionalism,
  },
  {
    id: "explain-evidence",
    topic: "Communication",
    title: "Explaining uncertainty simply",
    interviewType: "medicine-roleplay-practice",
    question:
      "Explain to a friend why two things increasing together does not prove that one causes the other.",
    answer:
      "Imagine that ice-cream sales and sunburn both rise in summer. That does not show that eating ice cream causes sunburn: sunny weather can explain both. When two things change together, I would ask whether another factor connects them and what other evidence could distinguish the explanations. Could you think of a different reason two things might rise together? [Listen to their example and clarify only the part that remains unclear.]",
    why: [
      "Uses a familiar example with a clear mechanism.",
      "Names a plausible alternative explanation.",
      "Checks understanding through the listener’s own example.",
    ],
    avoid:
      "Repeating a technical phrase and asking only “does that make sense?”",
    challenge:
      "How could you explain the same idea without using the ice-cream example?",
    source: interviews,
  },
  {
    id: "why-medicine",
    topic: "Reflection",
    title: "Motivation with evidence",
    interviewType: "medicine-motivation-practice",
    question: "What has helped you understand why you want to study medicine?",
    answer:
      "In a community volunteering role, I noticed how much difference careful listening made when someone felt uncertain. That made me interested in work combining scientific understanding with sustained responsibility for people. Reading about medical training also challenged my initial picture: the role includes uncertainty, teamwork and difficult decisions, not simply solving a problem and moving on. I want to study medicine because that combination interests me. I still need to understand more about its day-to-day demands, so I would keep reflecting on what I observe and asking thoughtful questions.",
    why: [
      "Connects a concrete observation to motivation.",
      "Acknowledges demands and uncertainty.",
      "Names what the candidate still needs to learn.",
    ],
    avoid:
      "Copying this fictional experience as your own or relying on “I like science and helping people”.",
    challenge: "Why does that motivation point towards medicine in particular?",
    source: interviews,
  },
  {
    id: "team-setback",
    topic: "Reflection",
    title: "Owning your part in a setback",
    interviewType: "medicine-motivation-practice",
    question:
      "Tell us about a time teamwork did not go as planned and what you learned.",
    answer:
      "During a school project, I assumed everyone understood the tasks we had agreed verbally. Two people ended up doing overlapping work. I had helped organise the group, so I acknowledged that I should have checked our understanding. We made a shared list of tasks, owners and deadlines, and each person explained what they were taking on. We finished, but with less time to review the result. Next time I would agree the responsibilities at the start and check progress earlier rather than waiting until the deadline.",
    why: [
      "Identifies the candidate’s own responsibility.",
      "Describes a concrete change in behaviour.",
      "Recognises the remaining cost of the mistake.",
    ],
    avoid:
      "Blaming the team or presenting a weakness that has no real consequence.",
    challenge: "How would you know that your new approach was helping?",
    source: professionalism,
  },
  {
    id: "missing-comparator",
    topic: "Data",
    title: "Spotting missing evidence",
    interviewType: "medicine-data-practice",
    question:
      "Students’ average test score rose from 60 to 70 after a new revision app was introduced. Did the app cause the improvement?",
    answer:
      "The average rose by ten points, but that alone does not establish that the app caused it. I would ask whether the tests were comparable, whether the same students took both and what else changed, such as teaching time or other revision. A comparable group without the app would help estimate what might have happened anyway. I would also want the sample size and the spread of scores, because an average can hide different experiences. The result is encouraging, but the causal claim needs stronger evidence.",
    why: [
      "Separates the observed change from the causal claim.",
      "Names specific alternative explanations.",
      "Asks for a comparator and variation, not just a larger average.",
    ],
    avoid:
      "Assuming a before-and-after improvement proves the intervention worked.",
    challenge:
      "What would random allocation improve, and what would it still leave uncertain?",
    source: interviews,
  },
  {
    id: "cooling",
    topic: "Scientific reasoning",
    title: "Testing a tempting prediction",
    interviewType: "medicine-data-practice",
    question:
      "An object cools from 60°C to 40°C in ten minutes in a room at 20°C. Must it reach 20°C after another ten minutes?",
    answer:
      "That prediction assumes the temperature falls at a constant rate. I would question that assumption because heat transfer generally changes as the difference between the object and its surroundings gets smaller. Under a simple model where the excess temperature halves every ten minutes, the excess falls from 40 degrees to 20, then to 10, giving a temperature of 30 degrees after twenty minutes. That is a model-based prediction, not something proved by the two observations. I would take further measurements and check whether room conditions stayed stable.",
    why: [
      "Identifies the hidden constant-rate assumption.",
      "Uses a clearly stated alternative model.",
      "Distinguishes a prediction from established evidence.",
    ],
    avoid:
      "Treating a plausible model as uniquely determined by two measurements.",
    challenge:
      "What measurement would most help you distinguish the two models?",
    source: interviews,
  },
  {
    id: "school-interest",
    topic: "11+",
    title: "Make an interest specific",
    interviewType: "11-plus",
    question: "What do you enjoy doing outside lessons?",
    answer:
      "I enjoy chess because I like working out what might happen next. I used to move too quickly when I saw a chance to take a piece. In one game that meant I missed a threat to my king. Now I stop and ask what my opponent might do before I choose my move. I still make mistakes, but looking back at a game helps me spot a pattern and try something different next time.",
    why: [
      "Names a real activity and why it is interesting.",
      "Gives a specific example instead of a list.",
      "Explains something learned through practice.",
    ],
    avoid: "Memorising this example: choose something you really do and enjoy.",
    challenge:
      "What would you tell someone trying your activity for the first time?",
    source: "",
  },
  {
    id: "school-puzzle",
    topic: "11+",
    title: "Explain a method aloud",
    interviewType: "maths-interview",
    question:
      "Three identical notebooks cost £6. How much would five cost? Explain how you know.",
    answer:
      "I would find the price of one notebook first. Six pounds divided by three is two pounds. Five notebooks would therefore cost five times two pounds, which is ten pounds. I can check it another way: three notebooks cost six pounds and two more cost four pounds, so altogether that is ten pounds. I am assuming each notebook has the same price and there is no discount.",
    why: [
      "Breaks the problem into smaller steps.",
      "Checks the answer using another method.",
      "States the pricing assumption.",
    ],
    avoid: "Giving only “£10” without showing how you reached it.",
    challenge: "What if there were a discount for buying five notebooks?",
    source: "",
  },
];
