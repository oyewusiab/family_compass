import type { Family, Member, Goal, Chore, Reward, RewardClaim, DailyActivity, FamilyCouncil, CouncilTemplate } from './types';

export const getTodayDateString = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

export const defaultFamily: Family = {
  id: 'fam-covenant-123',
  familyName: 'The Smith Family',
  missionStatement: 'We are a covenant family striving to follow Jesus Christ, strengthen one another, and prepare for eternal life.',
  inviteCode: 'FAM-582-901',
  createdAt: new Date().toISOString()
};

export const defaultMembers: Member[] = [
  { id: 'mem-dad', familyId: 'fam-covenant-123', name: 'Dad (John)', role: 'parent', points: 150, createdAt: new Date().toISOString() },
  { id: 'mem-mom', familyId: 'fam-covenant-123', name: 'Mom (Sarah)', role: 'parent', points: 200, createdAt: new Date().toISOString() },
  { id: 'mem-brayden', familyId: 'fam-covenant-123', name: 'Brayden', role: 'child', age: 10, points: 75, createdAt: new Date().toISOString() },
  { id: 'mem-emily', familyId: 'fam-covenant-123', name: 'Emily', role: 'child', age: 7, points: 120, createdAt: new Date().toISOString() }
];

export const defaultGoals: Goal[] = [
  { id: 'goal-1', familyId: 'fam-covenant-123', category: 'spiritual', title: 'Read Book of Mormon together daily', targetDate: '2026-12-31', status: 'in_progress', createdAt: new Date().toISOString() },
  { id: 'goal-2', familyId: 'fam-covenant-123', category: 'financial', title: 'Save ₦500,000 for family projects', targetDate: '2026-12-31', status: 'in_progress', createdAt: new Date().toISOString() },
  { id: 'goal-3', familyId: 'fam-covenant-123', category: 'education', title: 'Complete BYU Pathway courses', targetDate: '2026-08-31', status: 'in_progress', createdAt: new Date().toISOString() },
  { id: 'goal-4', familyId: 'fam-covenant-123', category: 'health', title: 'Walk 3 times weekly as a family', targetDate: '2026-12-31', status: 'completed', createdAt: new Date().toISOString() },
  { id: 'goal-5', familyId: 'fam-covenant-123', category: 'service', title: 'Perform one family service project monthly', targetDate: '2026-12-31', status: 'in_progress', createdAt: new Date().toISOString() }
];

export const defaultChores: Chore[] = [
  { id: 'chore-1', familyId: 'fam-covenant-123', title: 'Make bed', points: 10, assignedTo: 'mem-brayden', status: 'pending', createdAt: new Date().toISOString() },
  { id: 'chore-2', familyId: 'fam-covenant-123', title: 'Arrange toys', points: 10, assignedTo: 'mem-emily', status: 'completed', createdAt: new Date().toISOString() },
  { id: 'chore-3', familyId: 'fam-covenant-123', title: 'Help set table', points: 5, assignedTo: 'mem-brayden', status: 'pending', createdAt: new Date().toISOString() },
  { id: 'chore-4', familyId: 'fam-covenant-123', title: 'Clean bathroom sink', points: 15, assignedTo: 'mem-brayden', status: 'verified', createdAt: new Date().toISOString() },
  { id: 'chore-5', familyId: 'fam-covenant-123', title: 'Feed the family pet', points: 5, assignedTo: 'mem-emily', status: 'verified', createdAt: new Date().toISOString() }
];

export const defaultRewards: Reward[] = [
  { id: 'rew-1', familyId: 'fam-covenant-123', title: 'Ice Cream treat', pointsCost: 100, createdAt: new Date().toISOString() },
  { id: 'rew-2', familyId: 'fam-covenant-123', title: 'Family Outing to park', pointsCost: 500, createdAt: new Date().toISOString() },
  { id: 'rew-3', familyId: 'fam-covenant-123', title: 'Extra 30 mins game time', pointsCost: 50, createdAt: new Date().toISOString() }
];

export const defaultClaims: RewardClaim[] = [
  { id: 'claim-1', familyId: 'fam-covenant-123', memberId: 'mem-brayden', rewardId: 'rew-1', title: 'Ice Cream treat', pointsCost: 100, status: 'pending', claimedAt: new Date().toISOString() }
];

export const defaultDailyActivities: DailyActivity[] = [
  { id: 'act-dad', memberId: 'mem-dad', date: getTodayDateString(), prayerMorning: true, prayerEvening: false, scripturePersonal: true, scriptureFamily: true, churchAttendance: 'none', templeAttendance: false, updatedAt: new Date().toISOString() },
  { id: 'act-mom', memberId: 'mem-mom', date: getTodayDateString(), prayerMorning: true, prayerEvening: false, scripturePersonal: true, scriptureFamily: true, churchAttendance: 'none', templeAttendance: false, updatedAt: new Date().toISOString() },
  { id: 'act-brayden', memberId: 'mem-brayden', date: getTodayDateString(), prayerMorning: true, prayerEvening: false, scripturePersonal: false, scriptureFamily: true, churchAttendance: 'none', templeAttendance: false, updatedAt: new Date().toISOString() },
  { id: 'act-emily', memberId: 'mem-emily', date: getTodayDateString(), prayerMorning: false, prayerEvening: false, scripturePersonal: false, scriptureFamily: true, churchAttendance: 'none', templeAttendance: false, updatedAt: new Date().toISOString() }
];

export const defaultCouncils: FamilyCouncil[] = [
  {
    id: 'counc-1',
    familyId: 'fam-covenant-123',
    meetingDate: '2026-06-28',
    notes: 'We held our weekly family council. We discussed our school fees, upcoming family trip details, and our spiritual goals. Brayden committed to doing his chores daily. Dad will review the monthly budget and Mom will outline a meal plan to save costs.',
    assignments: [
      { memberId: 'mem-dad', name: 'Dad (John)', task: 'Review and adjust family budget' },
      { memberId: 'mem-mom', name: 'Mom (Sarah)', task: 'Create weekly meal plan' },
      { memberId: 'mem-brayden', name: 'Brayden', task: 'Complete daily chores consistently' }
    ],
    createdAt: new Date().toISOString()
  }
];

export interface CFMLesson {
  id: string;
  title: string;
  scriptureBlock: string;
  summary: string;
  questions: string[];
}

export const cfmLessons: CFMLesson[] = [
  {
    id: 'cfm-2026-w27',
    title: 'Sow the Word in Your Hearts',
    scriptureBlock: 'Alma 32–35',
    summary: 'Alma teaches the Zoramites about faith and compares the word of God to a seed. He explains that if we give place for the seed to be planted in our hearts, it will begin to swell within us. If we nourish it with faith, diligence, and patience, it will grow into a tree springing up unto everlasting life.',
    questions: [
      'How is faith like a seed? What starts the growth of faith?',
      'What can our family do to "nourish" our testimonies of Jesus Christ daily?',
      'Alma taught that worship is not confined to a building (like the Rameumptom). How can we worship God in our home?'
    ]
  },
  {
    id: 'cfm-2026-w28',
    title: 'Look to God and Live',
    scriptureBlock: 'Alma 36–39',
    summary: 'Alma shares his conversion story with his son Helaman, describing his transition from intense torment to exquisite joy through the grace of Jesus Christ. He entrusts Helaman with the sacred records and counsels his sons Shiblon and Corianton on diligence, self-control, and keeping the commandments.',
    questions: [
      'Alma described his joy as "exquisite and sweet." How has following Jesus Christ brought joy to our family?',
      'Why is it important to learn wisdom in our youth, as Alma counseled Shiblon?',
      'What does it mean to "bridle all our passions" and why does it help us be filled with love?'
    ]
  },
  {
    id: 'cfm-2026-w29',
    title: 'The Great Plan of Happiness',
    scriptureBlock: 'Alma 40–42',
    summary: 'Alma teaches his son Corianton about the state of the soul between death and the resurrection, explaining the spirits of the righteous go to paradise and the wicked to outer darkness. He explains the doctrine of restoration, justice, mercy, and how the Atonement of Jesus Christ satisfies the demands of justice.',
    questions: [
      'What is the difference between physical death and spiritual death, and how does the Savior overcome both?',
      'Why is the plan of salvation called the "plan of happiness" or "plan of mercy"?',
      'How does understanding resurrection and restoration influence the choices we make today?'
    ]
  }
];

import type { CFMThought, BudgetItem, AncestorStory, TempleTrip } from './types';

export const defaultCFMThoughts: CFMThought[] = [
  {
    id: 'thought-1',
    familyId: 'fam-covenant-123',
    memberId: 'mem-dad',
    memberName: 'Dad (John)',
    lessonId: 'cfm-2026-w27',
    thought: 'I was touched by the idea that we must nourish the seed with patience. Sometimes we expect instant answers or testimonies, but a strong testimony grows slowly and steadily through daily prayer and scripture study.',
    createdAt: new Date().toISOString()
  }
];

export const defaultBudgetItems: BudgetItem[] = [
  {
    id: 'bud-1',
    familyId: 'fam-covenant-123',
    description: 'FHE Treat ingredients',
    amount: 1500,
    type: 'expense',
    date: '2026-06-29',
    loggedBy: 'Mom (Sarah)',
    createdAt: new Date().toISOString()
  },
  {
    id: 'bud-2',
    familyId: 'fam-covenant-123',
    description: 'Weekly savings transfer',
    amount: 10000,
    type: 'savings',
    date: '2026-06-28',
    loggedBy: 'Dad (John)',
    createdAt: new Date().toISOString()
  },
  {
    id: 'bud-3',
    familyId: 'fam-covenant-123',
    description: 'BYU Pathway course rebate',
    amount: 5000,
    type: 'income',
    date: '2026-06-30',
    loggedBy: 'Mom (Sarah)',
    createdAt: new Date().toISOString()
  }
];

export const defaultAncestorStories: AncestorStory[] = [
  {
    id: 'story-1',
    familyId: 'fam-covenant-123',
    ancestorName: 'Grandfather Thomas Smith',
    birthYear: 1888,
    storyText: 'Grandfather Thomas was one of the early pioneers in his region. He joined the Church when he was 22 years old after reading a pamphlet left by missionaries. Despite being ridiculed by his friends, he remained faithful and walked 15 miles every single Sunday to attend Sacrament meetings in the neighboring town. He established a legacy of faith that our family still inherits today.',
    submittedBy: 'Dad (John)',
    createdAt: new Date().toISOString()
  }
];

export const defaultTempleTrips: TempleTrip[] = [
  {
    id: 'trip-1',
    familyId: 'fam-covenant-123',
    templeName: 'Aba Nigeria Temple',
    tripDate: '2026-07-15',
    type: 'baptisms',
    attendeeCount: 4,
    status: 'scheduled',
    createdAt: new Date().toISOString()
  }
];

export const defaultTemplates: CouncilTemplate[] = [
  {
    id: 'tpl-weekly',
    familyId: 'fam-covenant-123',
    templateName: 'Weekly Family Council (Default)',
    discussionTopics: '1. Calendar review (activities, appointments)\n2. School fees & household budget review\n3. Chores & family goal status updates\n4. Special needs or challenges in the family',
    decisionsMade: '1. Save money (weekly savings targets)\n2. Activity schedules and helper assignments',
    assignments: [
      { name: 'Dad', task: 'Review weekly budget' },
      { name: 'Mom', task: 'Meal planning and shopping list' },
      { name: 'Brayden', task: 'Complete assigned daily chores' }
    ],
    isDefault: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'tpl-cfm',
    familyId: 'fam-covenant-123',
    templateName: 'Come Follow Me & Scripture Planner',
    discussionTopics: '1. Choose next week\'s scripture block\n2. Design family scripture study schedule (e.g. 7:00 PM daily)\n3. Family member insights & testimony sharing',
    decisionsMade: '1. Commit to daily study block time\n2. Select a family goal (e.g. read Book of Mormon daily)',
    assignments: [
      { name: 'Mom', task: 'Lead CFM opening lesson' },
      { name: 'Brayden', task: 'Prepare closing FHE spiritual thought' }
    ],
    isDefault: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'tpl-service',
    familyId: 'fam-covenant-123',
    templateName: 'Activity & Service Project Planner',
    discussionTopics: '1. Plan monthly family service project\n2. Coordinate upcoming family temple trip (baptisms/endowments)\n3. Relatives/grandparents visit schedule',
    decisionsMade: '1. Perform one service project this month\n2. Visit relatives next Saturday',
    assignments: [
      { name: 'Dad', task: 'Arrange temple trip transportation' },
      { name: 'Brayden', task: 'Prepare ancestor names for baptisms' }
    ],
    isDefault: true,
    createdAt: new Date().toISOString()
  }
];

