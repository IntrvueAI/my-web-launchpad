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
// 11+ examples. Medicine MMI content is maintained separately in medicine-mmi-examples.ts.
export const PRACTICE_EXAMPLES: PracticeExample[] = [
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
