export interface Family {
  id: string;
  familyName: string;
  missionStatement: string;
  inviteCode: string;
  createdAt: string;
}

export interface Member {
  id: string;
  familyId: string;
  name: string;
  role: 'parent' | 'child' | 'grandparent';
  displayRole?: string; // e.g. 'Father', 'Mother', 'Child', 'Grandparent'
  age?: number;
  points: number;
  authUserId?: string; // Links to Firebase Auth user UID
  username?: string; // For username/password logins
  password?: string; // Simple plain-text password store
  createdAt: string;
}

export type GoalCategory = 'spiritual' | 'financial' | 'education' | 'health' | 'service';

export interface Goal {
  id: string;
  familyId: string;
  category: GoalCategory;
  title: string;
  targetDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  isPersonal?: boolean;
  memberId?: string;
  proposedBy?: string; // Name of member who created/proposed it
  createdAt: string;
}

export interface DailyActivity {
  id: string;
  memberId: string;
  date: string; // YYYY-MM-DD
  prayerMorning: boolean;
  prayerEvening: boolean;
  scripturePersonal: boolean;
  scriptureFamily: boolean;
  churchAttendance: 'sacrament' | 'midweek' | 'none';
  templeAttendance: boolean;
  updatedAt: string;
}

export interface Chore {
  id: string;
  familyId: string;
  title: string;
  points: number;
  assignedTo: string | null; // memberId or null if unassigned
  status: 'pending' | 'completed' | 'verified';
  createdAt: string;
}

export interface Reward {
  id: string;
  familyId: string;
  title: string;
  pointsCost: number;
  createdAt: string;
}

export interface RewardClaim {
  id: string;
  familyId: string;
  memberId: string;
  rewardId: string;
  title: string;
  pointsCost: number;
  status: 'pending' | 'approved';
  claimedAt: string;
}

export interface CouncilAssignment {
  memberId: string;
  name: string;
  task: string;
}

export interface FamilyCouncil {
  id: string;
  familyId: string;
  meetingDate: string; // YYYY-MM-DD
  notes: string;
  assignments: CouncilAssignment[];
  createdAt: string;
}

// --- Version 2 Types ---

export interface CFMThought {
  id: string;
  familyId: string;
  memberId: string;
  memberName: string;
  lessonId: string; // e.g. "cfm-2026-w27"
  thought: string;
  createdAt: string;
}

export interface BudgetItem {
  id: string;
  familyId: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'savings';
  date: string; // YYYY-MM-DD
  loggedBy: string; // memberName
  createdAt: string;
}

export interface AncestorStory {
  id: string;
  familyId: string;
  ancestorName: string;
  birthYear: number;
  storyText: string;
  submittedBy: string; // memberName
  createdAt: string;
}

export type TempleTripType = 'baptisms' | 'endowments' | 'sealings' | 'other';

export interface TempleTrip {
  id: string;
  familyId: string;
  templeName: string;
  tripDate: string;
  tripTime?: string;
  type: TempleTripType;
  attendeeCount: number;
  status: 'scheduled' | 'completed';
  youthProxies?: string[];
  drivingDirections?: string;
  notes?: string;
  createdAt: string;
}

export interface CouncilTemplateAssignment {
  name: string;
  task: string;
}

export interface CouncilTemplate {
  id: string;
  familyId: string;
  templateName: string;
  discussionTopics: string;
  decisionsMade: string;
  assignments: CouncilTemplateAssignment[];
  isDefault: boolean;
  createdAt: string;
}

export interface CFMPlan {
  id: string;
  familyId: string;
  lessonId: string;
  leaderId: string;
  leaderName: string;
  dailyVerses: string;
  notes: string;
  updatedAt: string;
}

export interface FHEPlan {
  id: string;
  familyId: string;
  date: string; // YYYY-MM-DD
  conductorName: string;
  musicLeaderName: string;
  lessonName: string;
  openingPrayerName: string;
  closingPrayerName: string;
  treatsName: string;
  activityName: string;
  status: 'planned' | 'completed';
  createdAt: string;
}

export interface SelfRelianceItem {
  id: string;
  familyId: string;
  category: '72hr_pack' | 'food_storage' | 'fire_drill' | 'budget_goal';
  title: string;
  assignedToName?: string;
  isCompleted: boolean;
  notes?: string;
  updatedAt: string;
}

export interface AgendaItem {
  id: string;
  familyId: string;
  type: 'topic' | 'event' | 'appreciation';
  content: string;
  submittedBy: string; // memberName
  date?: string; // for calendar events
  createdAt: string;
}

export interface ChoreBid {
  id: string;
  familyId: string;
  choreId: string;
  choreTitle: string;
  memberId: string;
  memberName: string;
  bidPoints: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface KidsVault {
  id: string;
  familyId: string;
  memberId: string;
  memberName: string;
  savings: number;
  mission: number;
  tithing: number;
  updatedAt: string;
}

export interface GrandparentSponsor {
  id: string;
  familyId: string;
  sponsorName: string;
  childId: string;
  childName: string;
  rewardId: string;
  rewardTitle: string;
  pointsCost: number;
  status: 'sponsored' | 'claimed';
  createdAt: string;
}

export interface GrandparentComment {
  id: string;
  familyId: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface PersonalJournalEntry {
  id: string;
  memberId: string;
  content: string;
  createdAt: string;
}

export interface PersonalStudyNote {
  id: string;
  memberId: string;
  lessonId: string;
  noteText: string;
  updatedAt: string;
}

export interface PersonalMission {
  memberId: string;
  creed: string;
  vision: string;
}

export interface TempleVisit {
  id: string;
  memberId: string;
  date: string;
  templeName: string;
  ordinanceType: 'Baptism' | 'Initiatory' | 'Endowment' | 'Sealing';
}

export interface ReadingProgress {
  memberId: string;
  bookName: string;
  completedChapters: number[];
}

export interface PrayerRequest {
  id: string;
  memberId: string;
  requestText: string;
  createdAt: string;
  isAnswered: boolean;
  answerText?: string;
  answeredAt?: string;
}

export interface GospelSketch {
  id: string;
  familyId: string;
  memberId: string;
  memberName: string;
  lessonId: string;
  canvasData: string;
  caption: string;
  createdAt: string;
}

export interface CovenantMilestoneProgress {
  memberId: string;
  milestoneId: string;
  completedChecklist: string[];
  notes: string;
  completedDate?: string;
}

export interface ScriptureMemoryProgress {
  memberId: string;
  streak: number;
  completedCount: number;
  lastCompletedDate?: string;
}

export interface TestimonyLeaf {
  id: string;
  familyId: string;
  memberId: string;
  memberName: string;
  text: string;
  category: 'savior' | 'prayer' | 'restoration' | 'general';
  createdAt: string;
}

export interface GratitudeJarNote {
  id: string;
  familyId: string;
  memberId: string;
  memberName: string;
  noteText: string;
  isAnonymous: boolean;
  createdAt: string;
}

export interface FoodStorageItem {
  id: string;
  familyId: string;
  itemName: string;
  category: 'water' | 'wheat' | 'canned' | 'other';
  quantity: number;
  unit: string;
  expiryDate: string;
}

export interface TithingRecord {
  id: string;
  familyId: string;
  memberId: string;
  memberName: string;
  tithing: number;
  fastOffering: number;
  missionary: number;
  humanitarian: number;
  date: string;
}

export interface ChoreSwapRequest {
  id: string;
  familyId: string;
  requesterId: string;
  requesterName: string;
  requesterChoreId: string;
  requesterChoreName: string;
  targetMemberId: string;
  targetMemberName: string;
  targetChoreId: string;
  targetChoreName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface SpiritualDiagnostic {
  id: string;
  familyId: string;
  unityRating: number;
  stressRating: number;
  studyRating: number;
  date: string;
  diagnosis: string;
  recommendations: string[];
}
