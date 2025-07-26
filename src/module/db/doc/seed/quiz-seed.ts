// quiz-seed.ts
import { Quiz } from '../entity/quiz/quiz';

export const quizSeed: Quiz = {
  title: 'Quiz 1',
  questions: [
    {
      id: 1,
      content: "When tackling a tricky work challenge, I'm most likely to…",
      dimension: 'Problem Clarity',
      options: [
        {
          id: 1,
          content: 'Come up with a completely new approach',
          archetypeId: 1,
          context: 'Innovative Thinking',
        },
        {
          id: 2,
          content:
            'See how various elements of the project influence one another',
          archetypeId: 2,
          context: 'Systems Thinking',
        },
        {
          id: 3,
          content: 'Ask people I know in various roles for their input',
          archetypeId: 4,
          context: 'Collaborative Input',
        },
        {
          id: 4,
          content: 'Blend concepts from different domains',
          archetypeId: 3,
          context: 'Cross-Disciplinary Insight',
        },
      ],
    },
    {
      id: 2,
      content: "My organization's main software roadblock seems to be…",
      dimension: 'Problem Clarity',
      options: [
        {
          id: 1,
          content: "We don't know what's possible or where to begin",
          archetypeId: 2,
          context: 'Lack of Vision',
        },
        {
          id: 2,
          content: "We've tried and failed to implement fixes in the past",
          archetypeId: 3,
          context: 'Failed Attempts',
        },
        {
          id: 3,
          content: "We know what's needed but can't agree on who should do it",
          archetypeId: 4,
          context: 'Lack of Ownership',
        },
        {
          id: 4,
          content: "We're underestimating the scale of what's required",
          archetypeId: 1,
          context: 'Effort Misjudgment',
        },
      ],
    },
    {
      id: 3,
      content: 'How would you describe your current strategic plan?',
      dimension: 'Strategic Readiness',
      options: [
        {
          id: 1,
          content: "We don't have one yet",
          archetypeId: 3,
          context: 'Lack of Strategic Framework',
        },
        {
          id: 2,
          content: "It's still in development",
          archetypeId: 1,
          context: 'Emerging Strategy',
        },
        {
          id: 3,
          content: "It's well documented and in use",
          archetypeId: 2,
          context: 'Operationalized Plan',
        },
        {
          id: 4,
          content: "We have one, but it's not tied to our software efforts",
          archetypeId: 4,
          context: 'Misalignment',
        },
      ],
    },
    {
      id: 4,
      content: "What's the timeline for solving your biggest software barrier?",
      dimension: 'Time Horizon',
      options: [
        {
          id: 1,
          content: "Yesterday—we're behind already",
          archetypeId: 4,
          context: 'Urgent/Reactive',
        },
        {
          id: 2,
          content: "This quarter—we've allocated budget and resources",
          archetypeId: 2,
          context: 'Planned Execution',
        },
        {
          id: 3,
          content: "Later this year—it's not the top priority yet",
          archetypeId: 3,
          context: 'Deferred',
        },
        {
          id: 4,
          content: "No fixed timeline—we're still evaluating",
          archetypeId: 1,
          context: 'Unstructured Timeline',
        },
      ],
    },
    {
      id: 5,
      content: "How would you describe your team's technical capacity?",
      dimension: 'Resource Inventory',
      options: [
        {
          id: 1,
          content: "We're understaffed and under-skilled",
          archetypeId: 3,
          context: 'Low Capacity',
        },
        {
          id: 2,
          content: "We have the right people, but they're stretched thin",
          archetypeId: 4,
          context: 'Bandwith Constrained',
        },
        {
          id: 3,
          content: "We're actively growing or outsourcing talent",
          archetypeId: 1,
          context: 'Scaling Talent',
        },
        {
          id: 4,
          content: 'We have strong skills but struggle to align efforts',
          archetypeId: 2,
          context: 'Coordination Gaps',
        },
      ],
    },
    {
      id: 6,
      content:
        'How confident are you that your current path will lead to success?',
      dimension: 'Confidence Alignment',
      options: [
        {
          id: 1,
          content: "Very confident—we've solved similar problems before",
          archetypeId: 2,
          context: 'Experienced Confidence',
        },
        {
          id: 2,
          content: "Somewhat confident—we're still testing assumptions",
          archetypeId: 3,
          context: 'Experimental',
        },
        {
          id: 3,
          content: 'Not confident—we lack clarity or progress',
          archetypeId: 4,
          context: 'Uncertainty',
        },
        {
          id: 4,
          content: 'Overconfident—we may be underestimating the effort',
          archetypeId: 1,
          context: 'Blind Spots',
        },
      ],
    },
  ],
};
