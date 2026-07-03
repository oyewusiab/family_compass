import type { 
  Family, Member, Goal, Chore, Reward, RewardClaim, 
  DailyActivity, FamilyCouncil, CouncilAssignment, GoalCategory,
  CFMThought, BudgetItem, AncestorStory, TempleTrip, TempleTripType,
  CouncilTemplate, CouncilTemplateAssignment,
  CFMPlan, FHEPlan, SelfRelianceItem,
  AgendaItem, ChoreBid, KidsVault, GrandparentSponsor, GrandparentComment,
  PersonalJournalEntry, PersonalStudyNote,
  PersonalMission, TempleVisit, ReadingProgress, PrayerRequest,
  GospelSketch, CovenantMilestoneProgress, ScriptureMemoryProgress, TestimonyLeaf, GratitudeJarNote,
  FoodStorageItem, TithingRecord, ChoreSwapRequest, SpiritualDiagnostic
} from './types';
import { 
  defaultFamily, defaultMembers, defaultGoals, defaultChores, 
  defaultRewards, defaultClaims, defaultDailyActivities, defaultCouncils,
  defaultCFMThoughts, defaultBudgetItems, defaultAncestorStories, defaultTempleTrips,
  defaultTemplates
} from './mockData';
import { db } from './firebase';
import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, 
  query, where, deleteDoc, runTransaction 
} from 'firebase/firestore';
import { config } from './config';

// --- LocalStorage Helpers ---
const loadLocal = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(`fc_${key}`);
  return data ? JSON.parse(data) : defaultValue;
};

const saveLocal = <T>(key: string, value: T): void => {
  localStorage.setItem(`fc_${key}`, JSON.stringify(value));
  if (localStorage.getItem('fc_initialized')) {
    window.dispatchEvent(new CustomEvent('offline-db-change'));
  }
};

// Initialize LocalStorage with mock data if empty
const initLocalStorage = () => {
  if (!localStorage.getItem('fc_initialized')) {
    saveLocal('family', defaultFamily);
    saveLocal('members', defaultMembers);
    saveLocal('goals', defaultGoals);
    saveLocal('chores', defaultChores);
    saveLocal('rewards', defaultRewards);
    saveLocal('claims', defaultClaims);
    saveLocal('activities', defaultDailyActivities);
    saveLocal('councils', defaultCouncils);
    localStorage.setItem('fc_initialized', 'true');
  }
  // V2 initializers (ensures seed if keys are missing)
  if (!localStorage.getItem('fc_cfm_thoughts')) {
    saveLocal('cfm_thoughts', defaultCFMThoughts);
  }
  if (!localStorage.getItem('fc_budget_items')) {
    saveLocal('budget_items', defaultBudgetItems);
  }
  if (!localStorage.getItem('fc_ancestor_stories')) {
    saveLocal('ancestor_stories', defaultAncestorStories);
  }
  if (!localStorage.getItem('fc_temple_trips')) {
    saveLocal('temple_trips', defaultTempleTrips);
  }
  if (!localStorage.getItem('fc_council_templates')) {
    saveLocal('council_templates', defaultTemplates);
  }
  if (!localStorage.getItem('fc_self_reliance')) {
    const defaultSelfReliance = [
      { id: 'sr-1', familyId: 'fam-covenant-123', category: '72hr_pack', title: '72-Hour Kit complete', assignedToName: 'Dad', isCompleted: true, notes: 'Kit is fully stocked with water, rations, and first aid.', updatedAt: new Date().toISOString() },
      { id: 'sr-2', familyId: 'fam-covenant-123', category: '72hr_pack', title: '72-Hour Kit complete', assignedToName: 'Mom', isCompleted: false, notes: 'Needs fresh batteries for flashlight.', updatedAt: new Date().toISOString() },
      { id: 'sr-3', familyId: 'fam-covenant-123', category: '72hr_pack', title: '72-Hour Kit complete', assignedToName: 'Brayden', isCompleted: false, notes: 'Needs larger clothes swap.', updatedAt: new Date().toISOString() },
      { id: 'sr-4', familyId: 'fam-covenant-123', category: '72hr_pack', title: '72-Hour Kit complete', assignedToName: 'Emily', isCompleted: false, notes: 'Needs comfort toy and snack bars.', updatedAt: new Date().toISOString() },
      
      { id: 'sr-5', familyId: 'fam-covenant-123', category: 'food_storage', title: '3-Month supply of drinking water', isCompleted: false, notes: 'Need 12 more gallons.', updatedAt: new Date().toISOString() },
      { id: 'sr-6', familyId: 'fam-covenant-123', category: 'food_storage', title: 'Basic grain supply (Wheat, Rice, Flour)', isCompleted: true, notes: 'Large buckets sealed in pantry.', updatedAt: new Date().toISOString() },
      { id: 'sr-7', familyId: 'fam-covenant-123', category: 'food_storage', title: 'First Aid medical kit stocked', isCompleted: true, notes: 'Bandages and antiseptic verified.', updatedAt: new Date().toISOString() },
      
      { id: 'sr-8', familyId: 'fam-covenant-123', category: 'fire_drill', title: 'Map family emergency exit paths', isCompleted: true, notes: 'Exit map posted on fridge.', updatedAt: new Date().toISOString() },
      { id: 'sr-9', familyId: 'fam-covenant-123', category: 'fire_drill', title: 'Conduct family fire drill practice', isCompleted: false, notes: 'Plan to hold drill this Saturday.', updatedAt: new Date().toISOString() },
      
      { id: 'sr-10', familyId: 'fam-covenant-123', category: 'budget_goal', title: 'Create personal/family budget goals', isCompleted: true, notes: 'Aligned with ledger savings goal.', updatedAt: new Date().toISOString() },
      { id: 'sr-11', familyId: 'fam-covenant-123', category: 'budget_goal', title: 'Establish 1-month emergency fund', isCompleted: false, notes: 'Savings in progress.', updatedAt: new Date().toISOString() }
    ];
    saveLocal('self_reliance', defaultSelfReliance);
  }
  if (!localStorage.getItem('fc_fhe_plans')) {
    saveLocal('fhe_plans', []);
  }
  if (!localStorage.getItem('fc_cfm_plans')) {
    saveLocal('cfm_plans', []);
  }
  if (!localStorage.getItem('fc_agenda_items')) {
    saveLocal('agenda_items', [
      { id: 'ag-1', familyId: 'fam-covenant-123', type: 'topic', content: 'Planning our next temple trip logistics', submittedBy: 'Dad', createdAt: new Date().toISOString() },
      { id: 'ag-2', familyId: 'fam-covenant-123', type: 'event', content: 'Emily youth activity on Wednesday night', submittedBy: 'Emily', date: '2026-07-08', createdAt: new Date().toISOString() },
      { id: 'ag-3', familyId: 'fam-covenant-123', type: 'appreciation', content: 'Thanks Brayden for helping clean my room!', submittedBy: 'Emily', createdAt: new Date().toISOString() }
    ]);
  }
  if (!localStorage.getItem('fc_chore_bids')) {
    saveLocal('chore_bids', []);
  }
  if (!localStorage.getItem('fc_kids_vaults')) {
    saveLocal('kids_vaults', [
      { id: 'kv-1', familyId: 'fam-covenant-123', memberId: 'mem-brayden-456', memberName: 'Brayden', savings: 150, mission: 50, tithing: 20, updatedAt: new Date().toISOString() },
      { id: 'kv-2', familyId: 'fam-covenant-123', memberId: 'mem-emily-789', memberName: 'Emily', savings: 80, mission: 30, tithing: 10, updatedAt: new Date().toISOString() }
    ]);
  }
  if (!localStorage.getItem('fc_grandparent_sponsors')) {
    saveLocal('grandparent_sponsors', [
      { id: 'spon-1', familyId: 'fam-covenant-123', sponsorName: 'Grandma', childId: 'mem-brayden-456', childName: 'Brayden', rewardId: 'reward-ice-cream', rewardTitle: 'Ice Cream', pointsCost: 100, status: 'sponsored', createdAt: new Date().toISOString() }
    ]);
  }
  if (!localStorage.getItem('fc_personal_journals')) {
    saveLocal('personal_journals', [
      { id: 'pj-1', memberId: 'mem-brayden-456', content: 'Today I read Alma 32. I really felt the Spirit when thinking about nourishing faith like a seed. I want to be more diligent in morning prayers.', createdAt: new Date().toISOString() }
    ]);
  }
  if (!localStorage.getItem('fc_personal_study_notes')) {
    saveLocal('personal_study_notes', [
      { id: 'psn-1', memberId: 'mem-brayden-456', lessonId: 'lesson-1', noteText: 'Faith is hope in things not seen which are true. I will apply this by listening to promptings.', updatedAt: new Date().toISOString() }
    ]);
  }
  if (!localStorage.getItem('fc_personal_missions')) {
    saveLocal('personal_missions', [
      { memberId: 'mem-brayden-456', creed: 'I will strive to follow Jesus Christ daily, build my testimony of the Book of Mormon, and do my chores with a cheerful heart.', vision: 'Be prepare to serve a full-time mission and obtain a university degree.' }
    ]);
  }
  if (!localStorage.getItem('fc_temple_visits')) {
    saveLocal('temple_visits', [
      { id: 'tv-1', memberId: 'mem-brayden-456', date: '2026-06-15', templeName: 'Salt Lake Temple', ordinanceType: 'Baptism' }
    ]);
  }
  if (!localStorage.getItem('fc_reading_progress')) {
    saveLocal('reading_progress', [
      { memberId: 'mem-brayden-456', bookName: 'Book of Mormon', completedChapters: [1, 2, 3, 4, 5] }
    ]);
  }
  if (!localStorage.getItem('fc_prayer_requests')) {
    saveLocal('prayer_requests', [
      { id: 'pr-1', memberId: 'mem-brayden-456', requestText: 'Pray for Grandpa to feel better from his back pain.', createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), isAnswered: true, answerText: 'Grandpa felt much better and was able to come to Sunday dinner!', answeredAt: new Date().toISOString() }
    ]);
  }
};
initLocalStorage();

// Generate a readable random code like FAM-123-456
const generateInviteCode = (): string => {
  const part1 = Math.floor(100 + Math.random() * 900);
  const part2 = Math.floor(100 + Math.random() * 900);
  return `FAM-${part1}-${part2}`;
};

// --- Unified Database Service ---
const baseDbService = {
  // 1. Get Family Details
  async getFamily(familyId: string): Promise<Family | null> {
    if (config.mode === 'firebase' && db) {
      const docRef = doc(db, 'families', familyId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? (docSnap.data() as Family) : null;
    } else {
      const family = loadLocal<Family>('family', defaultFamily);
      return family.id === familyId ? family : null;
    }
  },

  // 2. Find Family by Invite Code
  async getFamilyByInviteCode(inviteCode: string): Promise<Family | null> {
    if (config.mode === 'firebase' && db) {
      const familiesRef = collection(db, 'families');
      const q = query(familiesRef, where('inviteCode', '==', inviteCode.trim().toUpperCase()));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data() as Family;
      }
      return null;
    } else {
      const family = loadLocal<Family>('family', defaultFamily);
      return family.inviteCode === inviteCode.trim().toUpperCase() ? family : null;
    }
  },

  // 3. Create Family (Admin flow)
  async createFamily(
    familyName: string, 
    missionStatement: string, 
    creatorName: string, 
    uid?: string, 
    username?: string, 
    password?: string, 
    displayRole?: string
  ): Promise<{ family: Family, member: Member }> {
    const familyId = config.mode === 'firebase' ? doc(collection(db!, 'families')).id : `fam-${Date.now()}`;
    const inviteCode = generateInviteCode();
    
    const newFamily: Family = {
      id: familyId,
      familyName,
      missionStatement: missionStatement || 'We are a covenant family striving to follow Jesus Christ and strengthen one another.',
      inviteCode,
      createdAt: new Date().toISOString()
    };

    const memberId = config.mode === 'firebase' ? doc(collection(db!, `families/${familyId}/members`)).id : `mem-${Date.now()}`;
    const newMember: Member = {
      id: memberId,
      familyId,
      name: creatorName,
      role: 'parent',
      displayRole: displayRole || 'Parent',
      points: 0,
      authUserId: uid || undefined,
      username: username || undefined,
      password: password || undefined,
      createdAt: new Date().toISOString()
    };

    if (config.mode === 'firebase' && db) {
      // Write family doc
      await setDoc(doc(db, 'families', familyId), newFamily);
      // Write parent member doc
      await setDoc(doc(db, `families/${familyId}/members`, memberId), newMember);
      
      // Write user mapping if authenticated
      if (uid) {
        await setDoc(doc(db, 'users_mapping', uid), { familyId, memberId });
      }
      // Write username mapping if provided
      if (username && password) {
        const formatted = username.trim().toLowerCase();
        await setDoc(doc(db, 'usernames', formatted), { familyId, memberId, password });
      }
    } else {
      saveLocal('family', newFamily);
      saveLocal('members', [newMember]);
      saveLocal('goals', []);
      saveLocal('chores', []);
      saveLocal('rewards', []);
      saveLocal('claims', []);
      saveLocal('activities', []);
      saveLocal('councils', []);
    }

    return { family: newFamily, member: newMember };
  },

  // 4. Join Family (Member flow)
  async joinFamily(
    inviteCode: string, 
    name: string, 
    role: 'parent' | 'child' | 'grandparent', 
    age?: number, 
    uid?: string, 
    username?: string, 
    password?: string, 
    displayRole?: string
  ): Promise<{ family: Family, member: Member } | null> {
    const family = await this.getFamilyByInviteCode(inviteCode);
    if (!family) return null;

    const familyId = family.id;
    const memberId = config.mode === 'firebase' ? doc(collection(db!, `families/${familyId}/members`)).id : `mem-${Date.now()}`;
    
    const newMember: Member = {
      id: memberId,
      familyId,
      name,
      role,
      displayRole: displayRole || (role === 'parent' ? 'Parent' : role === 'child' ? 'Child' : 'Grandparent'),
      age: age || undefined,
      points: 0,
      authUserId: uid || undefined,
      username: username || undefined,
      password: password || undefined,
      createdAt: new Date().toISOString()
    };

    if (config.mode === 'firebase' && db) {
      await setDoc(doc(db, `families/${familyId}/members`, memberId), newMember);
      
      if (uid) {
        await setDoc(doc(db, 'users_mapping', uid), { familyId, memberId });
      }
      if (username && password) {
        const formatted = username.trim().toLowerCase();
        await setDoc(doc(db, 'usernames', formatted), { familyId, memberId, password });
      }
    } else {
      const members = loadLocal<Member[]>('members', defaultMembers);
      members.push(newMember);
      saveLocal('members', members);
    }

    return { family, member: newMember };
  },

  // Find mapped user profile by firebase uid
  async getUserMapping(uid: string): Promise<{ familyId: string, memberId: string } | null> {
    if (config.mode === 'firebase' && db) {
      const docRef = doc(db, 'users_mapping', uid);
      const snap = await getDoc(docRef);
      return snap.exists() ? (snap.data() as { familyId: string, memberId: string }) : null;
    }
    return null;
  },

  // Fetch a single member directly
  async getMember(familyId: string, memberId: string): Promise<Member | null> {
    if (config.mode === 'firebase' && db) {
      const docRef = doc(db, `families/${familyId}/members`, memberId);
      const snap = await getDoc(docRef);
      return snap.exists() ? (snap.data() as Member) : null;
    } else {
      const members = loadLocal<Member[]>('members', defaultMembers);
      return members.find(m => m.id === memberId && m.familyId === familyId) || null;
    }
  },

  // Check if a username is already taken globally
  async isUsernameTaken(username: string): Promise<boolean> {
    const formatted = username.trim().toLowerCase();
    if (config.mode === 'firebase' && db) {
      const docRef = doc(db, 'usernames', formatted);
      const snap = await getDoc(docRef);
      return snap.exists();
    } else {
      const members = loadLocal<Member[]>('members', defaultMembers);
      return members.some(m => m.username?.toLowerCase() === formatted);
    }
  },

  // Authenticate member with username and password
  async loginWithUsernamePassword(username: string, password: string): Promise<{ family: Family, member: Member }> {
    const formatted = username.trim().toLowerCase();
    if (config.mode === 'firebase' && db) {
      const docRef = doc(db, 'usernames', formatted);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        throw new Error('Invalid username or password.');
      }
      const data = snap.data() as { familyId: string, memberId: string, password?: string };
      if (data.password !== password) {
        throw new Error('Invalid username or password.');
      }
      const [family, member] = await Promise.all([
        this.getFamily(data.familyId),
        this.getMember(data.familyId, data.memberId)
      ]);
      if (!family || !member) {
        throw new Error('Family or member profile not found.');
      }
      return { family, member };
    } else {
      const members = loadLocal<Member[]>('members', defaultMembers);
      const member = members.find(m => m.username?.toLowerCase() === formatted && m.password === password);
      if (!member) {
        throw new Error('Invalid username or password.');
      }
      const family = await this.getFamily(member.familyId);
      if (!family) {
        throw new Error('Associated family not found.');
      }
      return { family, member };
    }
  },

  // 5. Get Members
  async getMembers(familyId: string): Promise<Member[]> {
    if (config.mode === 'firebase' && db) {
      const membersRef = collection(db, `families/${familyId}/members`);
      const querySnapshot = await getDocs(membersRef);
      return querySnapshot.docs.map(doc => doc.data() as Member);
    } else {
      return loadLocal<Member[]>('members', defaultMembers).filter(m => m.familyId === familyId);
    }
  },

  // 6. Update Member Points
  async updateMemberPoints(familyId: string, memberId: string, pointsDiff: number): Promise<number> {
    if (config.mode === 'firebase' && db) {
      const memberRef = doc(db, `families/${familyId}/members`, memberId);
      let updatedPoints = 0;
      await runTransaction(db, async (transaction) => {
        const memberDoc = await transaction.get(memberRef);
        if (!memberDoc.exists()) throw new Error("Member does not exist!");
        const currentPoints = memberDoc.data().points || 0;
        updatedPoints = currentPoints + pointsDiff;
        transaction.update(memberRef, { points: updatedPoints });
      });
      return updatedPoints;
    } else {
      const members = loadLocal<Member[]>('members', defaultMembers);
      const memberIdx = members.findIndex(m => m.id === memberId);
      if (memberIdx !== -1) {
        members[memberIdx].points = Math.max(0, members[memberIdx].points + pointsDiff);
        saveLocal('members', members);
        return members[memberIdx].points;
      }
      return 0;
    }
  },

  // 7. Get Goals
  async getGoals(familyId: string): Promise<Goal[]> {
    if (config.mode === 'firebase' && db) {
      const goalsRef = collection(db, `families/${familyId}/goals`);
      const querySnapshot = await getDocs(goalsRef);
      return querySnapshot.docs.map(doc => doc.data() as Goal);
    } else {
      return loadLocal<Goal[]>('goals', defaultGoals).filter(g => g.familyId === familyId);
    }
  },

  // 8. Create Goal
  async createGoal(
    familyId: string, 
    category: GoalCategory, 
    title: string, 
    targetDate: string,
    status: 'pending' | 'in_progress' | 'completed' = 'in_progress',
    isPersonal: boolean = false,
    memberId?: string,
    proposedBy?: string
  ): Promise<Goal> {
    const goalId = config.mode === 'firebase' ? doc(collection(db!, `families/${familyId}/goals`)).id : `goal-${Date.now()}`;
    const newGoal: Goal = {
      id: goalId,
      familyId,
      category,
      title,
      targetDate,
      status,
      isPersonal,
      memberId,
      proposedBy,
      createdAt: new Date().toISOString()
    };

    if (config.mode === 'firebase' && db) {
      await setDoc(doc(db, `families/${familyId}/goals`, goalId), newGoal);
    } else {
      const goals = loadLocal<Goal[]>('goals', defaultGoals);
      goals.push(newGoal);
      saveLocal('goals', goals);
    }
    return newGoal;
  },

  // 9. Update Goal
  async updateGoal(familyId: string, goalId: string, updates: Partial<Goal>): Promise<void> {
    if (config.mode === 'firebase' && db) {
      const goalRef = doc(db, `families/${familyId}/goals`, goalId);
      await updateDoc(goalRef, updates);
    } else {
      const goals = loadLocal<Goal[]>('goals', defaultGoals);
      const goalIdx = goals.findIndex(g => g.id === goalId);
      if (goalIdx !== -1) {
        goals[goalIdx] = { ...goals[goalIdx], ...updates };
        saveLocal('goals', goals);
      }
    }
  },

  // 9b. Update Goal Status Wrapper
  async updateGoalStatus(familyId: string, goalId: string, status: 'pending' | 'in_progress' | 'completed'): Promise<void> {
    await this.updateGoal(familyId, goalId, { status });
  },

  // 10. Get Chores
  async getChores(familyId: string): Promise<Chore[]> {
    if (config.mode === 'firebase' && db) {
      const choresRef = collection(db, `families/${familyId}/chores`);
      const querySnapshot = await getDocs(choresRef);
      return querySnapshot.docs.map(doc => doc.data() as Chore);
    } else {
      return loadLocal<Chore[]>('chores', defaultChores).filter(c => c.familyId === familyId);
    }
  },

  // 11. Create Chore
  async createChore(familyId: string, title: string, points: number, assignedTo: string | null): Promise<Chore> {
    const choreId = config.mode === 'firebase' ? doc(collection(db!, `families/${familyId}/chores`)).id : `chore-${Date.now()}`;
    const newChore: Chore = {
      id: choreId,
      familyId,
      title,
      points,
      assignedTo,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    if (config.mode === 'firebase' && db) {
      await setDoc(doc(db, `families/${familyId}/chores`, choreId), newChore);
    } else {
      const chores = loadLocal<Chore[]>('chores', defaultChores);
      chores.push(newChore);
      saveLocal('chores', chores);
    }
    return newChore;
  },

  // 12. Update Chore Status (complete, verify)
  async updateChoreStatus(familyId: string, choreId: string, status: 'pending' | 'completed' | 'verified'): Promise<Chore | null> {
    if (config.mode === 'firebase' && db) {
      const choreRef = doc(db, `families/${familyId}/chores`, choreId);
      const choreSnap = await getDoc(choreRef);
      if (!choreSnap.exists()) return null;
      const chore = choreSnap.data() as Chore;
      
      const prevStatus = chore.status;
      await updateDoc(choreRef, { status });
      const updatedChore = { ...chore, status };

      // If chore was verified, credit the points to the assigned member
      if (status === 'verified' && prevStatus !== 'verified' && chore.assignedTo) {
        await this.updateMemberPoints(familyId, chore.assignedTo, chore.points);
      }
      return updatedChore;
    } else {
      const chores = loadLocal<Chore[]>('chores', defaultChores);
      const choreIdx = chores.findIndex(c => c.id === choreId);
      if (choreIdx !== -1) {
        const prevStatus = chores[choreIdx].status;
        chores[choreIdx].status = status;
        saveLocal('chores', chores);
        
        // If verified, award points
        if (status === 'verified' && prevStatus !== 'verified' && chores[choreIdx].assignedTo) {
          await this.updateMemberPoints(familyId, chores[choreIdx].assignedTo!, chores[choreIdx].points);
        }
        return chores[choreIdx];
      }
      return null;
    }
  },

  // 13. Get Rewards
  async getRewards(familyId: string): Promise<Reward[]> {
    if (config.mode === 'firebase' && db) {
      const rewardsRef = collection(db, `families/${familyId}/rewards`);
      const querySnapshot = await getDocs(rewardsRef);
      return querySnapshot.docs.map(doc => doc.data() as Reward);
    } else {
      return loadLocal<Reward[]>('rewards', defaultRewards).filter(r => r.familyId === familyId);
    }
  },

  // 14. Create Reward
  async createReward(familyId: string, title: string, pointsCost: number): Promise<Reward> {
    const rewardId = config.mode === 'firebase' ? doc(collection(db!, `families/${familyId}/rewards`)).id : `rew-${Date.now()}`;
    const newReward: Reward = {
      id: rewardId,
      familyId,
      title,
      pointsCost,
      createdAt: new Date().toISOString()
    };

    if (config.mode === 'firebase' && db) {
      await setDoc(doc(db, `families/${familyId}/rewards`, rewardId), newReward);
    } else {
      const rewards = loadLocal<Reward[]>('rewards', defaultRewards);
      rewards.push(newReward);
      saveLocal('rewards', rewards);
    }
    return newReward;
  },

  // 15. Get Claims
  async getClaims(familyId: string): Promise<RewardClaim[]> {
    if (config.mode === 'firebase' && db) {
      const claimsRef = collection(db, `families/${familyId}/claims`);
      const querySnapshot = await getDocs(claimsRef);
      return querySnapshot.docs.map(doc => doc.data() as RewardClaim);
    } else {
      return loadLocal<RewardClaim[]>('claims', defaultClaims).filter(c => c.familyId === familyId);
    }
  },

  // 16. Claim Reward
  async claimReward(familyId: string, memberId: string, rewardId: string): Promise<{ claim: RewardClaim, member: Member } | null> {
    // 1. Get Reward
    let reward: Reward | null = null;
    if (config.mode === 'firebase' && db) {
      const rewRef = doc(db, `families/${familyId}/rewards`, rewardId);
      const snap = await getDoc(rewRef);
      if (snap.exists()) reward = snap.data() as Reward;
    } else {
      const rewards = loadLocal<Reward[]>('rewards', defaultRewards);
      reward = rewards.find(r => r.id === rewardId) || null;
    }
    if (!reward) return null;

    // 2. Check points balance
    const members = await this.getMembers(familyId);
    const member = members.find(m => m.id === memberId);
    if (!member || member.points < reward.pointsCost) return null;

    // Deduct points
    const newPoints = await this.updateMemberPoints(familyId, memberId, -reward.pointsCost);
    const updatedMember = { ...member, points: newPoints };

    // Create claim
    const claimId = config.mode === 'firebase' ? doc(collection(db!, `families/${familyId}/claims`)).id : `claim-${Date.now()}`;
    const newClaim: RewardClaim = {
      id: claimId,
      familyId,
      memberId,
      rewardId,
      title: reward.title,
      pointsCost: reward.pointsCost,
      status: 'pending',
      claimedAt: new Date().toISOString()
    };

    if (config.mode === 'firebase' && db) {
      await setDoc(doc(db, `families/${familyId}/claims`, claimId), newClaim);
    } else {
      const claims = loadLocal<RewardClaim[]>('claims', defaultClaims);
      claims.push(newClaim);
      saveLocal('claims', claims);
    }

    return { claim: newClaim, member: updatedMember };
  },

  // 17. Approve Reward Claim (Parent flow)
  async approveRewardClaim(familyId: string, claimId: string): Promise<void> {
    if (config.mode === 'firebase' && db) {
      const claimRef = doc(db, `families/${familyId}/claims`, claimId);
      await updateDoc(claimRef, { status: 'approved' });
    } else {
      const claims = loadLocal<RewardClaim[]>('claims', defaultClaims);
      const claimIdx = claims.findIndex(c => c.id === claimId);
      if (claimIdx !== -1) {
        claims[claimIdx].status = 'approved';
        saveLocal('claims', claims);
      }
    }
  },

  // 18. Get Daily Activities
  async getDailyActivities(familyId: string, date: string): Promise<DailyActivity[]> {
    if (config.mode === 'firebase' && db) {
      // In Firebase, we store activities in `/families/{familyId}/activities/{memberId}_{date}`
      const activitiesRef = collection(db, `families/${familyId}/activities`);
      const querySnapshot = await getDocs(activitiesRef);
      // Filter for the specified date
      return querySnapshot.docs
        .map(doc => doc.data() as DailyActivity)
        .filter(act => act.date === date);
    } else {
      const activities = loadLocal<DailyActivity[]>('activities', defaultDailyActivities);
      // Ensure there's an activity record for today for every member. If not, auto-create.
      const members = await this.getMembers(familyId);
      let updated = false;
      
      const filtered = activities.filter(a => a.date === date);
      
      for (const member of members) {
        const hasRecord = filtered.some(a => a.memberId === member.id);
        if (!hasRecord) {
          const newAct: DailyActivity = {
            id: `act-${member.id}-${date}`,
            memberId: member.id,
            date,
            prayerMorning: false,
            prayerEvening: false,
            scripturePersonal: false,
            scriptureFamily: false,
            churchAttendance: 'none',
            templeAttendance: false,
            updatedAt: new Date().toISOString()
          };
          activities.push(newAct);
          filtered.push(newAct);
          updated = true;
        }
      }
      
      if (updated) {
        saveLocal('activities', activities);
      }
      
      return filtered;
    }
  },

  // 19. Update Daily Activity
  async updateDailyActivity(familyId: string, memberId: string, date: string, updates: Partial<DailyActivity>): Promise<DailyActivity> {
    if (config.mode === 'firebase' && db) {
      const docId = `${memberId}_${date}`;
      const actRef = doc(db, `families/${familyId}/activities`, docId);
      const actSnap = await getDoc(actRef);
      
      let currentActivity: DailyActivity;
      if (actSnap.exists()) {
        currentActivity = actSnap.data() as DailyActivity;
      } else {
        currentActivity = {
          id: docId,
          memberId,
          date,
          prayerMorning: false,
          prayerEvening: false,
          scripturePersonal: false,
          scriptureFamily: false,
          churchAttendance: 'none',
          templeAttendance: false,
          updatedAt: new Date().toISOString()
        };
      }
      
      const updatedActivity = {
        ...currentActivity,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(actRef, updatedActivity);
      return updatedActivity;
    } else {
      const activities = loadLocal<DailyActivity[]>('activities', defaultDailyActivities);
      let actIdx = activities.findIndex(a => a.memberId === memberId && a.date === date);
      
      if (actIdx === -1) {
        const newAct: DailyActivity = {
          id: `act-${memberId}-${date}`,
          memberId,
          date,
          prayerMorning: false,
          prayerEvening: false,
          scripturePersonal: false,
          scriptureFamily: false,
          churchAttendance: 'none',
          templeAttendance: false,
          updatedAt: new Date().toISOString()
        };
        activities.push(newAct);
        actIdx = activities.length - 1;
      }
      
      activities[actIdx] = {
        ...activities[actIdx],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      saveLocal('activities', activities);
      return activities[actIdx];
    }
  },

  // 20. Get Family Councils
  async getFamilyCouncils(familyId: string): Promise<FamilyCouncil[]> {
    if (config.mode === 'firebase' && db) {
      const councilsRef = collection(db, `families/${familyId}/councils`);
      const querySnapshot = await getDocs(councilsRef);
      return querySnapshot.docs.map(doc => doc.data() as FamilyCouncil);
    } else {
      return loadLocal<FamilyCouncil[]>('councils', defaultCouncils).filter(c => c.familyId === familyId);
    }
  },

  // 21. Create Family Council Record
  async createFamilyCouncil(familyId: string, meetingDate: string, notes: string, assignments: CouncilAssignment[]): Promise<FamilyCouncil> {
    const councilId = config.mode === 'firebase' ? doc(collection(db!, `families/${familyId}/councils`)).id : `counc-${Date.now()}`;
    const newCouncil: FamilyCouncil = {
      id: councilId,
      familyId,
      meetingDate,
      notes,
      assignments,
      createdAt: new Date().toISOString()
    };

    if (config.mode === 'firebase' && db) {
      await setDoc(doc(db, `families/${familyId}/councils`, councilId), newCouncil);
    } else {
      const councils = loadLocal<FamilyCouncil[]>('councils', defaultCouncils);
      councils.push(newCouncil);
      saveLocal('councils', councils);
    }
    return newCouncil;
  },

  // 22. Get CFM Thoughts
  async getCFMThoughts(familyId: string, lessonId: string): Promise<CFMThought[]> {
    if (config.mode === 'firebase' && db) {
      const thoughtsRef = collection(db, `families/${familyId}/cfmThoughts`);
      const q = query(thoughtsRef, where('lessonId', '==', lessonId));
      const snap = await getDocs(q);
      return snap.docs.map(doc => doc.data() as CFMThought);
    } else {
      return loadLocal<CFMThought[]>('cfm_thoughts', defaultCFMThoughts).filter(t => t.familyId === familyId && t.lessonId === lessonId);
    }
  },

  // 23. Create CFM Thought
  async createCFMThought(familyId: string, memberId: string, memberName: string, lessonId: string, thought: string): Promise<CFMThought> {
    const thoughtId = config.mode === 'firebase' ? doc(collection(db!, `families/${familyId}/cfmThoughts`)).id : `thought-${Date.now()}`;
    const newThought: CFMThought = {
      id: thoughtId,
      familyId,
      memberId,
      memberName,
      lessonId,
      thought,
      createdAt: new Date().toISOString()
    };

    if (config.mode === 'firebase' && db) {
      await setDoc(doc(db, `families/${familyId}/cfmThoughts`, thoughtId), newThought);
    } else {
      const thoughts = loadLocal<CFMThought[]>('cfm_thoughts', defaultCFMThoughts);
      thoughts.push(newThought);
      saveLocal('cfm_thoughts', thoughts);
    }
    return newThought;
  },

  // 24. Get Budget Items
  async getBudgetItems(familyId: string): Promise<BudgetItem[]> {
    if (config.mode === 'firebase' && db) {
      const itemsRef = collection(db, `families/${familyId}/budgetItems`);
      const snap = await getDocs(itemsRef);
      return snap.docs.map(doc => doc.data() as BudgetItem);
    } else {
      return loadLocal<BudgetItem[]>('budget_items', defaultBudgetItems).filter(b => b.familyId === familyId);
    }
  },

  // 25. Create Budget Item
  async createBudgetItem(familyId: string, description: string, amount: number, type: 'income' | 'expense' | 'savings', date: string, loggedBy: string): Promise<BudgetItem> {
    const itemId = config.mode === 'firebase' ? doc(collection(db!, `families/${familyId}/budgetItems`)).id : `bud-${Date.now()}`;
    const newItem: BudgetItem = {
      id: itemId,
      familyId,
      description,
      amount,
      type,
      date,
      loggedBy,
      createdAt: new Date().toISOString()
    };

    if (config.mode === 'firebase' && db) {
      await setDoc(doc(db, `families/${familyId}/budgetItems`, itemId), newItem);
    } else {
      const items = loadLocal<BudgetItem[]>('budget_items', defaultBudgetItems);
      items.push(newItem);
      saveLocal('budget_items', items);
    }
    return newItem;
  },

  // 26. Get Ancestor Stories
  async getAncestorStories(familyId: string): Promise<AncestorStory[]> {
    if (config.mode === 'firebase' && db) {
      const storiesRef = collection(db, `families/${familyId}/ancestors`);
      const snap = await getDocs(storiesRef);
      return snap.docs.map(doc => doc.data() as AncestorStory);
    } else {
      return loadLocal<AncestorStory[]>('ancestor_stories', defaultAncestorStories).filter(a => a.familyId === familyId);
    }
  },

  // 27. Create Ancestor Story
  async createAncestorStory(familyId: string, ancestorName: string, birthYear: number, storyText: string, submittedBy: string): Promise<AncestorStory> {
    const storyId = config.mode === 'firebase' ? doc(collection(db!, `families/${familyId}/ancestors`)).id : `story-${Date.now()}`;
    const newStory: AncestorStory = {
      id: storyId,
      familyId,
      ancestorName,
      birthYear,
      storyText,
      submittedBy,
      createdAt: new Date().toISOString()
    };

    if (config.mode === 'firebase' && db) {
      await setDoc(doc(db, `families/${familyId}/ancestors`, storyId), newStory);
    } else {
      const stories = loadLocal<AncestorStory[]>('ancestor_stories', defaultAncestorStories);
      stories.push(newStory);
      saveLocal('ancestor_stories', stories);
    }
    return newStory;
  },

  // 28. Get Temple Trips
  async getTempleTrips(familyId: string): Promise<TempleTrip[]> {
    if (config.mode === 'firebase' && db) {
      const tripsRef = collection(db, `families/${familyId}/templeTrips`);
      const snap = await getDocs(tripsRef);
      return snap.docs.map(doc => doc.data() as TempleTrip);
    } else {
      return loadLocal<TempleTrip[]>('temple_trips', defaultTempleTrips).filter(t => t.familyId === familyId);
    }
  },

  // 29. Create Temple Trip
  async createTempleTrip(
    familyId: string, 
    templeName: string, 
    tripDate: string, 
    type: TempleTripType, 
    attendeeCount: number,
    tripTime?: string,
    youthProxies?: string[],
    drivingDirections?: string,
    notes?: string
  ): Promise<TempleTrip> {
    const tripId = config.mode === 'firebase' ? doc(collection(db!, `families/${familyId}/templeTrips`)).id : `trip-${Date.now()}`;
    const newTrip: TempleTrip = {
      id: tripId,
      familyId,
      templeName,
      tripDate,
      tripTime,
      type,
      attendeeCount,
      status: 'scheduled',
      youthProxies,
      drivingDirections,
      notes,
      createdAt: new Date().toISOString()
    };

    if (config.mode === 'firebase' && db) {
      await setDoc(doc(db, `families/${familyId}/templeTrips`, tripId), newTrip);
    } else {
      const trips = loadLocal<TempleTrip[]>('temple_trips', defaultTempleTrips);
      trips.push(newTrip);
      saveLocal('temple_trips', trips);
    }
    return newTrip;
  },

  // 30. Update Temple Trip Status
  async updateTempleTripStatus(familyId: string, tripId: string, status: 'scheduled' | 'completed'): Promise<void> {
    if (config.mode === 'firebase' && db) {
      const tripRef = doc(db, `families/${familyId}/templeTrips`, tripId);
      await updateDoc(tripRef, { status });
    } else {
      const trips = loadLocal<TempleTrip[]>('temple_trips', defaultTempleTrips);
      const idx = trips.findIndex(t => t.id === tripId);
      if (idx !== -1) {
        trips[idx].status = status;
        saveLocal('temple_trips', trips);
      }
    }
  },

  // 31. Get Council Templates
  async getCouncilTemplates(familyId: string): Promise<CouncilTemplate[]> {
    if (config.mode === 'firebase' && db) {
      const templatesRef = collection(db, `families/${familyId}/templates`);
      const snap = await getDocs(templatesRef);
      return snap.docs.map(doc => doc.data() as CouncilTemplate);
    } else {
      return loadLocal<CouncilTemplate[]>('council_templates', defaultTemplates).filter(t => t.familyId === familyId || t.isDefault);
    }
  },

  // 32. Create Council Template
  async createCouncilTemplate(
    familyId: string, 
    templateName: string, 
    discussionTopics: string, 
    decisionsMade: string, 
    assignments: CouncilTemplateAssignment[]
  ): Promise<CouncilTemplate> {
    const templateId = config.mode === 'firebase' ? doc(collection(db!, `families/${familyId}/templates`)).id : `tpl-${Date.now()}`;
    const newTemplate: CouncilTemplate = {
      id: templateId,
      familyId,
      templateName,
      discussionTopics,
      decisionsMade,
      assignments,
      isDefault: false,
      createdAt: new Date().toISOString()
    };

    if (config.mode === 'firebase' && db) {
      await setDoc(doc(db, `families/${familyId}/templates`, templateId), newTemplate);
    } else {
      const templates = loadLocal<CouncilTemplate[]>('council_templates', defaultTemplates);
      templates.push(newTemplate);
      saveLocal('council_templates', templates);
    }
    return newTemplate;
  },

  // 33. Delete Council Template
  async deleteCouncilTemplate(familyId: string, templateId: string): Promise<void> {
    if (config.mode === 'firebase' && db) {
      const templateRef = doc(db, `families/${familyId}/templates`, templateId);
      await deleteDoc(templateRef);
    } else {
      const templates = loadLocal<CouncilTemplate[]>('council_templates', defaultTemplates);
      const filtered = templates.filter(t => t.id !== templateId);
      saveLocal('council_templates', filtered);
    }
  },

  // 34. Delete Goal
  async deleteGoal(familyId: string, goalId: string): Promise<void> {
    if (config.mode === 'firebase' && db) {
      const goalRef = doc(db, `families/${familyId}/goals`, goalId);
      await deleteDoc(goalRef);
    } else {
      const goals = loadLocal<Goal[]>('goals', defaultGoals);
      const filtered = goals.filter(g => g.id !== goalId);
      saveLocal('goals', filtered);
    }
  },

  // 35. Get CFM Study Coordinator Plan
  async getCFMPlan(familyId: string, lessonId: string): Promise<CFMPlan | null> {
    if (config.mode === 'firebase' && db) {
      const docRef = doc(db, `families/${familyId}/cfmPlans`, lessonId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() as CFMPlan : null;
    } else {
      const plans = loadLocal<CFMPlan[]>('cfm_plans', []);
      return plans.find(p => p.familyId === familyId && p.lessonId === lessonId) || null;
    }
  },

  // 36. Save CFM Study Plan
  async saveCFMPlan(familyId: string, plan: CFMPlan): Promise<void> {
    if (config.mode === 'firebase' && db) {
      await setDoc(doc(db, `families/${familyId}/cfmPlans`, plan.lessonId), plan);
    } else {
      const plans = loadLocal<CFMPlan[]>('cfm_plans', []);
      const idx = plans.findIndex(p => p.familyId === familyId && p.lessonId === plan.lessonId);
      if (idx !== -1) {
        plans[idx] = plan;
      } else {
        plans.push(plan);
      }
      saveLocal('cfm_plans', plans);
    }
  },

  // 37. Get FHE Plans
  async getFHEPlans(familyId: string): Promise<FHEPlan[]> {
    if (config.mode === 'firebase' && db) {
      const ref = collection(db, `families/${familyId}/fhePlans`);
      const snap = await getDocs(ref);
      return snap.docs.map(doc => doc.data() as FHEPlan);
    } else {
      return loadLocal<FHEPlan[]>('fhe_plans', []);
    }
  },

  // 38. Create FHE Plan
  async createFHEPlan(familyId: string, plan: Omit<FHEPlan, 'id' | 'createdAt'>): Promise<FHEPlan> {
    const fheId = config.mode === 'firebase' ? doc(collection(db!, `families/${familyId}/fhePlans`)).id : `fhe-${Date.now()}`;
    const newPlan: FHEPlan = {
      ...plan,
      id: fheId,
      createdAt: new Date().toISOString()
    };
    if (config.mode === 'firebase' && db) {
      await setDoc(doc(db, `families/${familyId}/fhePlans`, fheId), newPlan);
    } else {
      const plans = loadLocal<FHEPlan[]>('fhe_plans', []);
      plans.push(newPlan);
      saveLocal('fhe_plans', plans);
    }
    return newPlan;
  },

  // 39. Update FHE Plan Status
  async updateFHEPlanStatus(familyId: string, fheId: string, status: 'planned' | 'completed'): Promise<void> {
    if (config.mode === 'firebase' && db) {
      const ref = doc(db, `families/${familyId}/fhePlans`, fheId);
      await updateDoc(ref, { status });
    } else {
      const plans = loadLocal<FHEPlan[]>('fhe_plans', []);
      const idx = plans.findIndex(p => p.id === fheId);
      if (idx !== -1) {
        plans[idx].status = status;
        saveLocal('fhe_plans', plans);
      }
    }
  },

  // 40. Get Emergency Prep & Self-Reliance Items
  async getSelfRelianceItems(familyId: string): Promise<SelfRelianceItem[]> {
    if (config.mode === 'firebase' && db) {
      const ref = collection(db, `families/${familyId}/selfReliance`);
      const snap = await getDocs(ref);
      return snap.docs.map(doc => doc.data() as SelfRelianceItem);
    } else {
      const allItems = loadLocal<SelfRelianceItem[]>('self_reliance', []);
      return allItems.filter(item => item.familyId === familyId);
    }
  },

  // 41. Update Self-Reliance Item
  async updateSelfRelianceItem(familyId: string, itemId: string, isCompleted: boolean, notes?: string): Promise<void> {
    const updates: Partial<SelfRelianceItem> = { isCompleted, updatedAt: new Date().toISOString() };
    if (notes !== undefined) {
      updates.notes = notes;
    }

    if (config.mode === 'firebase' && db) {
      const ref = doc(db, `families/${familyId}/selfReliance`, itemId);
      await updateDoc(ref, updates);
    } else {
      const allItems = loadLocal<SelfRelianceItem[]>('self_reliance', []);
      const idx = allItems.findIndex(item => item.id === itemId);
      if (idx !== -1) {
        allItems[idx] = { ...allItems[idx], ...updates };
        saveLocal('self_reliance', allItems);
      }
    }
  },

  // 42. Get Agenda Items
  async getAgendaItems(familyId: string): Promise<AgendaItem[]> {
    if (config.mode === 'firebase' && db) {
      const ref = collection(db, `families/${familyId}/agendaItems`);
      const snap = await getDocs(ref);
      return snap.docs.map(doc => doc.data() as AgendaItem);
    } else {
      const items = loadLocal<AgendaItem[]>('agenda_items', []);
      return items.filter(i => i.familyId === familyId);
    }
  },

  // 43. Create Agenda Item
  async createAgendaItem(familyId: string, item: Omit<AgendaItem, 'id' | 'createdAt'>): Promise<AgendaItem> {
    const itemId = config.mode === 'firebase' ? doc(collection(db!, `families/${familyId}/agendaItems`)).id : `ag-${Date.now()}`;
    const newItem: AgendaItem = {
      ...item,
      id: itemId,
      createdAt: new Date().toISOString()
    };
    if (config.mode === 'firebase' && db) {
      await setDoc(doc(db, `families/${familyId}/agendaItems`, itemId), newItem);
    } else {
      const items = loadLocal<AgendaItem[]>('agenda_items', []);
      items.push(newItem);
      saveLocal('agenda_items', items);
    }
    return newItem;
  },

  // 44. Clear Agenda Items
  async clearAgendaItems(familyId: string): Promise<void> {
    if (config.mode === 'firebase' && db) {
      const ref = collection(db, `families/${familyId}/agendaItems`);
      const snap = await getDocs(ref);
      const { deleteDoc, doc } = await import('firebase/firestore');
      for (const d of snap.docs) {
        await deleteDoc(doc(db, `families/${familyId}/agendaItems`, d.id));
      }
    } else {
      const items = loadLocal<AgendaItem[]>('agenda_items', []);
      const remaining = items.filter(i => i.familyId !== familyId);
      saveLocal('agenda_items', remaining);
    }
  },

  // 45. Get Chore Bids
  async getChoreBids(familyId: string): Promise<ChoreBid[]> {
    if (config.mode === 'firebase' && db) {
      const ref = collection(db, `families/${familyId}/choreBids`);
      const snap = await getDocs(ref);
      return snap.docs.map(doc => doc.data() as ChoreBid);
    } else {
      const bids = loadLocal<ChoreBid[]>('chore_bids', []);
      return bids.filter(b => b.familyId === familyId);
    }
  },

  // 46. Place Chore Bid
  async placeChoreBid(familyId: string, bid: Omit<ChoreBid, 'id' | 'createdAt' | 'status'>): Promise<ChoreBid> {
    const bidId = config.mode === 'firebase' ? doc(collection(db!, `families/${familyId}/choreBids`)).id : `bid-${Date.now()}`;
    const newBid: ChoreBid = {
      ...bid,
      id: bidId,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    if (config.mode === 'firebase' && db) {
      await setDoc(doc(db, `families/${familyId}/choreBids`, bidId), newBid);
    } else {
      const bids = loadLocal<ChoreBid[]>('chore_bids', []);
      bids.push(newBid);
      saveLocal('chore_bids', bids);
    }
    return newBid;
  },

  // 47. Resolve Chore Bid
  async resolveChoreBid(familyId: string, bidId: string, status: 'accepted' | 'rejected'): Promise<void> {
    if (config.mode === 'firebase' && db) {
      const ref = doc(db, `families/${familyId}/choreBids`, bidId);
      await updateDoc(ref, { status });
      if (status === 'accepted') {
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const bidData = snap.data() as ChoreBid;
          const choreRef = doc(db, `families/${familyId}/chores`, bidData.choreId);
          await updateDoc(choreRef, { assignedTo: bidData.memberId });
        }
      }
    } else {
      const bids = loadLocal<ChoreBid[]>('chore_bids', []);
      const idx = bids.findIndex(b => b.id === bidId);
      if (idx !== -1) {
        bids[idx].status = status;
        saveLocal('chore_bids', bids);

        if (status === 'accepted') {
          const chores = loadLocal<Chore[]>('chores', defaultChores);
          const cIdx = chores.findIndex(c => c.id === bids[idx].choreId);
          if (cIdx !== -1) {
            chores[cIdx].assignedTo = bids[idx].memberId;
            saveLocal('chores', chores);
          }
        }
      }
    }
  },

  // 48. Get Kids Vaults
  async getKidsVaults(familyId: string): Promise<KidsVault[]> {
    if (config.mode === 'firebase' && db) {
      const ref = collection(db, `families/${familyId}/kidsVaults`);
      const snap = await getDocs(ref);
      return snap.docs.map(doc => doc.data() as KidsVault);
    } else {
      const vaults = loadLocal<KidsVault[]>('kids_vaults', []);
      return vaults.filter(v => v.familyId === familyId);
    }
  },

  // 49. Update Kids Vault
  async updateKidsVault(familyId: string, memberId: string, savings: number, mission: number, tithing: number): Promise<void> {
    if (config.mode === 'firebase' && db) {
      const ref = doc(db, `families/${familyId}/kidsVaults`, memberId);
      await setDoc(ref, {
        familyId,
        memberId,
        savings,
        mission,
        tithing,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } else {
      const vaults = loadLocal<KidsVault[]>('kids_vaults', []);
      const idx = vaults.findIndex(v => v.memberId === memberId);
      if (idx !== -1) {
        vaults[idx].savings = savings;
        vaults[idx].mission = mission;
        vaults[idx].tithing = tithing;
        vaults[idx].updatedAt = new Date().toISOString();
        saveLocal('kids_vaults', vaults);
      } else {
        vaults.push({
          id: `kv-${Date.now()}`,
          familyId,
          memberId,
          memberName: '', 
          savings,
          mission,
          tithing,
          updatedAt: new Date().toISOString()
        });
        saveLocal('kids_vaults', vaults);
      }
    }
  },

  // 50. Get Grandparent Sponsors
  async getGrandparentSponsors(familyId: string): Promise<GrandparentSponsor[]> {
    if (config.mode === 'firebase' && db) {
      const ref = collection(db, `families/${familyId}/grandparentSponsors`);
      const snap = await getDocs(ref);
      return snap.docs.map(doc => doc.data() as GrandparentSponsor);
    } else {
      const sponsors = loadLocal<GrandparentSponsor[]>('grandparent_sponsors', []);
      return sponsors.filter(s => s.familyId === familyId);
    }
  },

  // 51. Create Grandparent Sponsor
  async createGrandparentSponsor(familyId: string, sponsor: Omit<GrandparentSponsor, 'id' | 'createdAt' | 'status'>): Promise<GrandparentSponsor> {
    const sponsorId = config.mode === 'firebase' ? doc(collection(db!, `families/${familyId}/grandparentSponsors`)).id : `spon-${Date.now()}`;
    const newSponsor: GrandparentSponsor = {
      ...sponsor,
      id: sponsorId,
      status: 'sponsored',
      createdAt: new Date().toISOString()
    };
    if (config.mode === 'firebase' && db) {
      await setDoc(doc(db, `families/${familyId}/grandparentSponsors`, sponsorId), newSponsor);
    } else {
      const sponsors = loadLocal<GrandparentSponsor[]>('grandparent_sponsors', []);
      sponsors.push(newSponsor);
      saveLocal('grandparent_sponsors', sponsors);
    }
    return newSponsor;
  },

  // 52. Claim Grandparent Sponsor
  async claimGrandparentSponsor(familyId: string, sponsorId: string): Promise<void> {
    if (config.mode === 'firebase' && db) {
      const ref = doc(db, `families/${familyId}/grandparentSponsors`, sponsorId);
      await updateDoc(ref, { status: 'claimed' });
    } else {
      const sponsors = loadLocal<GrandparentSponsor[]>('grandparent_sponsors', []);
      const idx = sponsors.findIndex(s => s.id === sponsorId);
      if (idx !== -1) {
        sponsors[idx].status = 'claimed';
        saveLocal('grandparent_sponsors', sponsors);
      }
    }
  },

  // 53. Get Grandparent Comments
  async getGrandparentComments(familyId: string): Promise<GrandparentComment[]> {
    if (config.mode === 'firebase' && db) {
      const ref = collection(db, `families/${familyId}/grandparentComments`);
      const snap = await getDocs(ref);
      return snap.docs.map(doc => doc.data() as GrandparentComment);
    } else {
      const comments = loadLocal<GrandparentComment[]>('grandparent_comments', []);
      return comments.filter(c => c.familyId === familyId);
    }
  },

  // 54. Create Grandparent Comment
  async createGrandparentComment(familyId: string, author: string, content: string): Promise<GrandparentComment> {
    const commentId = config.mode === 'firebase' ? doc(collection(db!, `families/${familyId}/grandparentComments`)).id : `gpc-${Date.now()}`;
    const newComment: GrandparentComment = {
      id: commentId,
      familyId,
      author,
      content,
      createdAt: new Date().toISOString()
    };
    if (config.mode === 'firebase' && db) {
      await setDoc(doc(db, `families/${familyId}/grandparentComments`, commentId), newComment);
    } else {
      const comments = loadLocal<GrandparentComment[]>('grandparent_comments', []);
      comments.push(newComment);
      saveLocal('grandparent_comments', comments);
    }
    return newComment;
  },

  // 55. Assign Chore Directly (Urgent claims)
  async assignChoreDirectly(familyId: string, choreId: string, memberId: string): Promise<void> {
    if (config.mode === 'firebase' && db) {
      const ref = doc(db, `families/${familyId}/chores`, choreId);
      await updateDoc(ref, { assignedTo: memberId });
    } else {
      const chores = loadLocal<Chore[]>('chores', defaultChores);
      const idx = chores.findIndex(c => c.id === choreId);
      if (idx !== -1) {
        chores[idx].assignedTo = memberId;
        saveLocal('chores', chores);
      }
    }
  },

  // 56. Get Personal Journal
  async getPersonalJournal(memberId: string): Promise<PersonalJournalEntry[]> {
    if (config.mode === 'firebase' && db) {
      const ref = collection(db, `members/${memberId}/journal`);
      const snap = await getDocs(ref);
      return snap.docs.map(doc => doc.data() as PersonalJournalEntry);
    } else {
      const entries = loadLocal<PersonalJournalEntry[]>('personal_journals', []);
      return entries.filter(e => e.memberId === memberId);
    }
  },

  // 57. Create Personal Journal Entry
  async createPersonalJournalEntry(memberId: string, content: string): Promise<PersonalJournalEntry> {
    const entryId = config.mode === 'firebase' ? doc(collection(db!, `members/${memberId}/journal`)).id : `pj-${Date.now()}`;
    const newEntry: PersonalJournalEntry = {
      id: entryId,
      memberId,
      content,
      createdAt: new Date().toISOString()
    };
    if (config.mode === 'firebase' && db) {
      await setDoc(doc(db, `members/${memberId}/journal`, entryId), newEntry);
    } else {
      const entries = loadLocal<PersonalJournalEntry[]>('personal_journals', []);
      entries.push(newEntry);
      saveLocal('personal_journals', entries);
    }
    return newEntry;
  },

  // 58. Delete Personal Journal Entry
  async deletePersonalJournalEntry(memberId: string, entryId: string): Promise<void> {
    if (config.mode === 'firebase' && db) {
      const ref = doc(db, `members/${memberId}/journal`, entryId);
      await deleteDoc(ref);
    } else {
      const entries = loadLocal<PersonalJournalEntry[]>('personal_journals', []);
      const filtered = entries.filter(e => e.id !== entryId);
      saveLocal('personal_journals', filtered);
    }
  },

  // 59. Get Personal Study Notes
  async getPersonalStudyNotes(memberId: string): Promise<PersonalStudyNote[]> {
    if (config.mode === 'firebase' && db) {
      const ref = collection(db, `members/${memberId}/studyNotes`);
      const snap = await getDocs(ref);
      return snap.docs.map(doc => doc.data() as PersonalStudyNote);
    } else {
      const notes = loadLocal<PersonalStudyNote[]>('personal_study_notes', []);
      return notes.filter(n => n.memberId === memberId);
    }
  },

  // 60. Save Personal Study Note
  async savePersonalStudyNote(memberId: string, lessonId: string, noteText: string): Promise<void> {
    if (config.mode === 'firebase' && db) {
      const ref = doc(db, `members/${memberId}/studyNotes`, lessonId);
      await setDoc(ref, {
        id: lessonId,
        memberId,
        lessonId,
        noteText,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } else {
      const notes = loadLocal<PersonalStudyNote[]>('personal_study_notes', []);
      const idx = notes.findIndex(n => n.memberId === memberId && n.lessonId === lessonId);
      if (idx !== -1) {
        notes[idx].noteText = noteText;
        notes[idx].updatedAt = new Date().toISOString();
        saveLocal('personal_study_notes', notes);
      } else {
        notes.push({
          id: `psn-${Date.now()}`,
          memberId,
          lessonId,
          noteText,
          updatedAt: new Date().toISOString()
        });
        saveLocal('personal_study_notes', notes);
      }
    }
  },

  // 61. Get Personal Mission
  async getPersonalMission(memberId: string): Promise<PersonalMission | null> {
    if (config.mode === 'firebase' && db) {
      const ref = doc(db, `members/${memberId}/personalMission`, 'mission');
      const snap = await getDoc(ref);
      return snap.exists() ? (snap.data() as PersonalMission) : null;
    } else {
      const missions = loadLocal<PersonalMission[]>('personal_missions', []);
      const mission = missions.find(m => m.memberId === memberId);
      return mission || null;
    }
  },

  // 62. Save Personal Mission
  async savePersonalMission(memberId: string, creed: string, vision: string): Promise<void> {
    const newMission: PersonalMission = { memberId, creed, vision };
    if (config.mode === 'firebase' && db) {
      const ref = doc(db, `members/${memberId}/personalMission`, 'mission');
      await setDoc(ref, newMission, { merge: true });
    } else {
      const missions = loadLocal<PersonalMission[]>('personal_missions', []);
      const idx = missions.findIndex(m => m.memberId === memberId);
      if (idx !== -1) {
        missions[idx] = newMission;
      } else {
        missions.push(newMission);
      }
      saveLocal('personal_missions', missions);
    }
  },

  // 63. Get Temple Visits
  async getTempleVisits(memberId: string): Promise<TempleVisit[]> {
    if (config.mode === 'firebase' && db) {
      const ref = collection(db, `members/${memberId}/templeVisits`);
      const snap = await getDocs(ref);
      return snap.docs.map(doc => doc.data() as TempleVisit);
    } else {
      const visits = loadLocal<TempleVisit[]>('temple_visits', []);
      return visits.filter(v => v.memberId === memberId);
    }
  },

  // 64. Add Temple Visit
  async addTempleVisit(memberId: string, date: string, templeName: string, ordinanceType: 'Baptism' | 'Initiatory' | 'Endowment' | 'Sealing'): Promise<TempleVisit> {
    const id = config.mode === 'firebase' ? doc(collection(db!, `members/${memberId}/templeVisits`)).id : `tv-${Date.now()}`;
    const newVisit: TempleVisit = { id, memberId, date, templeName, ordinanceType };
    if (config.mode === 'firebase' && db) {
      await setDoc(doc(db, `members/${memberId}/templeVisits`, id), newVisit);
    } else {
      const visits = loadLocal<TempleVisit[]>('temple_visits', []);
      visits.push(newVisit);
      saveLocal('temple_visits', visits);
    }
    return newVisit;
  },

  // 65. Delete Temple Visit
  async deleteTempleVisit(memberId: string, visitId: string): Promise<void> {
    if (config.mode === 'firebase' && db) {
      const ref = doc(db, `members/${memberId}/templeVisits`, visitId);
      await deleteDoc(ref);
    } else {
      const visits = loadLocal<TempleVisit[]>('temple_visits', []);
      const filtered = visits.filter(v => v.id !== visitId);
      saveLocal('temple_visits', filtered);
    }
  },

  // 66. Get Reading Progress
  async getReadingProgress(memberId: string, bookName: string): Promise<ReadingProgress> {
    if (config.mode === 'firebase' && db) {
      const ref = doc(db, `members/${memberId}/readingProgress`, bookName);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as ReadingProgress;
      }
      return { memberId, bookName, completedChapters: [] };
    } else {
      const progresses = loadLocal<ReadingProgress[]>('reading_progress', []);
      const progress = progresses.find(p => p.memberId === memberId && p.bookName === bookName);
      return progress || { memberId, bookName, completedChapters: [] };
    }
  },

  // 67. Toggle Chapter Progress
  async toggleChapterProgress(memberId: string, bookName: string, chapterNum: number): Promise<number[]> {
    if (config.mode === 'firebase' && db) {
      const ref = doc(db, `members/${memberId}/readingProgress`, bookName);
      const snap = await getDoc(ref);
      let completedChapters: number[] = [];
      if (snap.exists()) {
        const data = snap.data() as ReadingProgress;
        completedChapters = data.completedChapters || [];
      }
      if (completedChapters.includes(chapterNum)) {
        completedChapters = completedChapters.filter(c => c !== chapterNum);
      } else {
        completedChapters.push(chapterNum);
      }
      await setDoc(ref, { memberId, bookName, completedChapters }, { merge: true });
      return completedChapters;
    } else {
      const progresses = loadLocal<ReadingProgress[]>('reading_progress', []);
      const idx = progresses.findIndex(p => p.memberId === memberId && p.bookName === bookName);
      let completedChapters: number[] = [];
      if (idx !== -1) {
        completedChapters = progresses[idx].completedChapters || [];
        if (completedChapters.includes(chapterNum)) {
          completedChapters = completedChapters.filter(c => c !== chapterNum);
        } else {
          completedChapters.push(chapterNum);
        }
        progresses[idx].completedChapters = completedChapters;
      } else {
        completedChapters = [chapterNum];
        progresses.push({ memberId, bookName, completedChapters });
      }
      saveLocal('reading_progress', progresses);
      return completedChapters;
    }
  },

  // 68. Get Prayer Requests
  async getPrayerRequests(memberId: string): Promise<PrayerRequest[]> {
    if (config.mode === 'firebase' && db) {
      const ref = collection(db, `members/${memberId}/prayerRequests`);
      const snap = await getDocs(ref);
      return snap.docs.map(doc => doc.data() as PrayerRequest);
    } else {
      const prayers = loadLocal<PrayerRequest[]>('prayer_requests', []);
      return prayers.filter(p => p.memberId === memberId);
    }
  },

  // 69. Add Prayer Request
  async addPrayerRequest(memberId: string, requestText: string): Promise<PrayerRequest> {
    const id = config.mode === 'firebase' ? doc(collection(db!, `members/${memberId}/prayerRequests`)).id : `pr-${Date.now()}`;
    const newPrayer: PrayerRequest = {
      id,
      memberId,
      requestText,
      createdAt: new Date().toISOString(),
      isAnswered: false
    };
    if (config.mode === 'firebase' && db) {
      await setDoc(doc(db, `members/${memberId}/prayerRequests`, id), newPrayer);
    } else {
      const prayers = loadLocal<PrayerRequest[]>('prayer_requests', []);
      prayers.push(newPrayer);
      saveLocal('prayer_requests', prayers);
    }
    return newPrayer;
  },

  // 70. Mark Prayer Answered
  async markPrayerAnswered(memberId: string, id: string, answerText: string): Promise<void> {
    if (config.mode === 'firebase' && db) {
      const ref = doc(db, `members/${memberId}/prayerRequests`, id);
      await setDoc(ref, {
        isAnswered: true,
        answerText,
        answeredAt: new Date().toISOString()
      }, { merge: true });
    } else {
      const prayers = loadLocal<PrayerRequest[]>('prayer_requests', []);
      const idx = prayers.findIndex(p => p.id === id);
      if (idx !== -1) {
        prayers[idx].isAnswered = true;
        prayers[idx].answerText = answerText;
        prayers[idx].answeredAt = new Date().toISOString();
        saveLocal('prayer_requests', prayers);
      }
    }
  },

  // 71. Delete Prayer Request
  async deletePrayerRequest(memberId: string, id: string): Promise<void> {
    if (config.mode === 'firebase' && db) {
      const ref = doc(db, `members/${memberId}/prayerRequests`, id);
      await deleteDoc(ref);
    } else {
      const prayers = loadLocal<PrayerRequest[]>('prayer_requests', []);
      const filtered = prayers.filter(p => p.id !== id);
      saveLocal('prayer_requests', filtered);
    }
  },

  // 72. Get Gospel Sketches
  async getGospelSketches(familyId: string): Promise<GospelSketch[]> {
    if (config.mode === 'firebase' && db) {
      const q = query(collection(db, 'sketches'), where('familyId', '==', familyId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as GospelSketch));
    } else {
      return loadLocal<GospelSketch[]>('gospel_sketches', []);
    }
  },

  // 73. Save Gospel Sketch
  async saveGospelSketch(familyId: string, memberId: string, memberName: string, lessonId: string, canvasData: string, caption: string): Promise<GospelSketch> {
    const newSketch: GospelSketch = {
      id: Math.random().toString(36).substr(2, 9),
      familyId,
      memberId,
      memberName,
      lessonId,
      canvasData,
      caption,
      createdAt: new Date().toISOString()
    };
    if (config.mode === 'firebase' && db) {
      const ref = doc(db, 'sketches', newSketch.id);
      await setDoc(ref, newSketch);
    } else {
      const list = loadLocal<GospelSketch[]>('gospel_sketches', []);
      list.push(newSketch);
      saveLocal('gospel_sketches', list);
    }
    return newSketch;
  },

  // 74. Delete Gospel Sketch
  async deleteGospelSketch(_familyId: string, id: string): Promise<void> {
    if (config.mode === 'firebase' && db) {
      const ref = doc(db, 'sketches', id);
      await deleteDoc(ref);
    } else {
      const list = loadLocal<GospelSketch[]>('gospel_sketches', []);
      const filtered = list.filter(item => item.id !== id);
      saveLocal('gospel_sketches', filtered);
    }
  },

  // 75. Get Covenant Milestone Progress
  async getCovenantMilestoneProgress(memberId: string): Promise<CovenantMilestoneProgress[]> {
    if (config.mode === 'firebase' && db) {
      const snap = await getDocs(collection(db, `members/${memberId}/milestones`));
      return snap.docs.map(d => d.data() as CovenantMilestoneProgress);
    } else {
      const all = loadLocal<CovenantMilestoneProgress[]>('covenant_milestones', []);
      return all.filter(m => m.memberId === memberId);
    }
  },

  // 76. Save Covenant Milestone Progress
  async saveCovenantMilestoneProgress(memberId: string, milestoneId: string, completedChecklist: string[], notes: string, completedDate?: string): Promise<void> {
    const payload: CovenantMilestoneProgress = {
      memberId,
      milestoneId,
      completedChecklist,
      notes,
      completedDate
    };
    if (config.mode === 'firebase' && db) {
      const ref = doc(db, `members/${memberId}/milestones`, milestoneId);
      await setDoc(ref, payload);
    } else {
      const all = loadLocal<CovenantMilestoneProgress[]>('covenant_milestones', []);
      const idx = all.findIndex(m => m.memberId === memberId && m.milestoneId === milestoneId);
      if (idx !== -1) {
        all[idx] = payload;
      } else {
        all.push(payload);
      }
      saveLocal('covenant_milestones', all);
    }
  },

  // 77. Get Scripture Memory Progress
  async getScriptureMemoryProgress(memberId: string): Promise<ScriptureMemoryProgress | null> {
    if (config.mode === 'firebase' && db) {
      const snap = await getDoc(doc(db, `members/${memberId}/memoryProgress`, 'current'));
      return snap.exists() ? (snap.data() as ScriptureMemoryProgress) : null;
    } else {
      const all = loadLocal<ScriptureMemoryProgress[]>('scripture_memory_progress', []);
      const match = all.find(p => p.memberId === memberId);
      return match || null;
    }
  },

  // 78. Update Scripture Memory Progress
  async updateScriptureMemoryProgress(memberId: string, streak: number, completedCount: number, lastCompletedDate?: string): Promise<void> {
    const payload: ScriptureMemoryProgress = {
      memberId,
      streak,
      completedCount,
      lastCompletedDate
    };
    if (config.mode === 'firebase' && db) {
      const ref = doc(db, `members/${memberId}/memoryProgress`, 'current');
      await setDoc(ref, payload, { merge: true });
    } else {
      const all = loadLocal<ScriptureMemoryProgress[]>('scripture_memory_progress', []);
      const idx = all.findIndex(p => p.memberId === memberId);
      if (idx !== -1) {
        all[idx] = { ...all[idx], ...payload };
      } else {
        all.push(payload);
      }
      saveLocal('scripture_memory_progress', all);
    }
  },

  // 79. Get Testimony Leaves
  async getTestimonyLeaves(familyId: string): Promise<TestimonyLeaf[]> {
    if (config.mode === 'firebase' && db) {
      const q = query(collection(db, 'testimonies'), where('familyId', '==', familyId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as TestimonyLeaf));
    } else {
      return loadLocal<TestimonyLeaf[]>('testimony_leaves', []);
    }
  },

  // 80. Add Testimony Leaf
  async addTestimonyLeaf(familyId: string, memberId: string, memberName: string, text: string, category: 'savior' | 'prayer' | 'restoration' | 'general'): Promise<TestimonyLeaf> {
    const newLeaf: TestimonyLeaf = {
      id: Math.random().toString(36).substr(2, 9),
      familyId,
      memberId,
      memberName,
      text,
      category,
      createdAt: new Date().toISOString()
    };
    if (config.mode === 'firebase' && db) {
      const ref = doc(db, 'testimonies', newLeaf.id);
      await setDoc(ref, newLeaf);
    } else {
      const list = loadLocal<TestimonyLeaf[]>('testimony_leaves', []);
      list.push(newLeaf);
      saveLocal('testimony_leaves', list);
    }
    return newLeaf;
  },

  // 81. Delete Testimony Leaf
  async deleteTestimonyLeaf(_familyId: string, id: string): Promise<void> {
    if (config.mode === 'firebase' && db) {
      const ref = doc(db, 'testimonies', id);
      await deleteDoc(ref);
    } else {
      const list = loadLocal<TestimonyLeaf[]>('testimony_leaves', []);
      const filtered = list.filter(item => item.id !== id);
      saveLocal('testimony_leaves', filtered);
    }
  },

  // 82. Get Gratitude Jar Notes
  async getGratitudeJarNotes(familyId: string): Promise<GratitudeJarNote[]> {
    if (config.mode === 'firebase' && db) {
      const q = query(collection(db, 'gratitude_notes'), where('familyId', '==', familyId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as GratitudeJarNote));
    } else {
      const list = loadLocal<GratitudeJarNote[]>('gratitude_notes', []);
      return list.filter(n => n.familyId === familyId);
    }
  },

  // 83. Add Gratitude Jar Note
  async addGratitudeJarNote(familyId: string, memberId: string, memberName: string, noteText: string, isAnonymous: boolean): Promise<GratitudeJarNote> {
    const newNote: GratitudeJarNote = {
      id: Math.random().toString(36).substr(2, 9),
      familyId,
      memberId,
      memberName,
      noteText,
      isAnonymous,
      createdAt: new Date().toISOString()
    };
    if (config.mode === 'firebase' && db) {
      const ref = doc(db, 'gratitude_notes', newNote.id);
      await setDoc(ref, newNote);
    } else {
      const list = loadLocal<GratitudeJarNote[]>('gratitude_notes', []);
      list.push(newNote);
      saveLocal('gratitude_notes', list);
    }
    return newNote;
  },

  // 84. Clear Gratitude Jar
  async clearGratitudeJar(familyId: string): Promise<void> {
    if (config.mode === 'firebase' && db) {
      const q = query(collection(db, 'gratitude_notes'), where('familyId', '==', familyId));
      const snap = await getDocs(q);
      const { deleteDoc, doc } = await import('firebase/firestore');
      for (const d of snap.docs) {
        await deleteDoc(doc(db, 'gratitude_notes', d.id));
      }
    } else {
      const list = loadLocal<GratitudeJarNote[]>('gratitude_notes', []);
      const remaining = list.filter(n => n.familyId !== familyId);
      saveLocal('gratitude_notes', remaining);
    }
  },

  // 85. Get Food Storage Items
  async getFoodStorage(familyId: string): Promise<FoodStorageItem[]> {
    if (config.mode === 'firebase' && db) {
      const q = query(collection(db, 'food_storage'), where('familyId', '==', familyId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as FoodStorageItem));
    } else {
      const list = loadLocal<FoodStorageItem[]>('food_storage', []);
      return list.filter(i => i.familyId === familyId);
    }
  },

  // 86. Add Food Storage Item
  async addFoodStorageItem(familyId: string, item: Omit<FoodStorageItem, 'id'>): Promise<FoodStorageItem> {
    const newItem: FoodStorageItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      familyId
    };
    if (config.mode === 'firebase' && db) {
      await setDoc(doc(db, 'food_storage', newItem.id), newItem);
    } else {
      const list = loadLocal<FoodStorageItem[]>('food_storage', []);
      list.push(newItem);
      saveLocal('food_storage', list);
    }
    return newItem;
  },

  // 87. Delete Food Storage Item
  async deleteFoodStorageItem(_familyId: string, id: string): Promise<void> {
    if (config.mode === 'firebase' && db) {
      await deleteDoc(doc(db, 'food_storage', id));
    } else {
      const list = loadLocal<FoodStorageItem[]>('food_storage', []);
      const filtered = list.filter(item => item.id !== id);
      saveLocal('food_storage', filtered);
    }
  },

  // 88. Get Tithing Records
  async getTithingRecords(familyId: string): Promise<TithingRecord[]> {
    if (config.mode === 'firebase' && db) {
      const q = query(collection(db, 'tithing_records'), where('familyId', '==', familyId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as TithingRecord));
    } else {
      const list = loadLocal<TithingRecord[]>('tithing_records', []);
      return list.filter(r => r.familyId === familyId);
    }
  },

  // 89. Add Tithing Record
  async addTithingRecord(familyId: string, record: Omit<TithingRecord, 'id'>): Promise<TithingRecord> {
    const newRecord: TithingRecord = {
      ...record,
      id: Math.random().toString(36).substr(2, 9),
      familyId
    };
    if (config.mode === 'firebase' && db) {
      await setDoc(doc(db, 'tithing_records', newRecord.id), newRecord);
    } else {
      const list = loadLocal<TithingRecord[]>('tithing_records', []);
      list.push(newRecord);
      saveLocal('tithing_records', list);
    }
    return newRecord;
  },

  // 90. Get Chore Swaps
  async getChoreSwaps(familyId: string): Promise<ChoreSwapRequest[]> {
    if (config.mode === 'firebase' && db) {
      const q = query(collection(db, 'chore_swaps'), where('familyId', '==', familyId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as ChoreSwapRequest));
    } else {
      const list = loadLocal<ChoreSwapRequest[]>('chore_swaps', []);
      return list.filter(s => s.familyId === familyId);
    }
  },

  // 91. Create Chore Swap
  async createChoreSwap(familyId: string, swap: Omit<ChoreSwapRequest, 'id' | 'status' | 'createdAt'>): Promise<ChoreSwapRequest> {
    const newSwap: ChoreSwapRequest = {
      ...swap,
      id: Math.random().toString(36).substr(2, 9),
      familyId,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    if (config.mode === 'firebase' && db) {
      await setDoc(doc(db, 'chore_swaps', newSwap.id), newSwap);
    } else {
      const list = loadLocal<ChoreSwapRequest[]>('chore_swaps', []);
      list.push(newSwap);
      saveLocal('chore_swaps', list);
    }
    return newSwap;
  },

  // 92. Update Chore Swap Status
  async updateChoreSwapStatus(_familyId: string, swapId: string, status: 'approved' | 'rejected'): Promise<void> {
    if (config.mode === 'firebase' && db) {
      await updateDoc(doc(db, 'chore_swaps', swapId), { status });
    } else {
      const list = loadLocal<ChoreSwapRequest[]>('chore_swaps', []);
      const idx = list.findIndex(s => s.id === swapId);
      if (idx !== -1) {
        list[idx].status = status;
        saveLocal('chore_swaps', list);
      }
    }
  },

  // 93. Get Spiritual Diagnostics
  async getSpiritualDiagnostics(familyId: string): Promise<SpiritualDiagnostic[]> {
    if (config.mode === 'firebase' && db) {
      const q = query(collection(db, 'spiritual_diagnostics'), where('familyId', '==', familyId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as SpiritualDiagnostic));
    } else {
      const list = loadLocal<SpiritualDiagnostic[]>('spiritual_diagnostics', []);
      return list.filter(d => d.familyId === familyId);
    }
  },

  // 94. Save Spiritual Diagnostic
  async saveSpiritualDiagnostic(familyId: string, diagnostic: Omit<SpiritualDiagnostic, 'id'>): Promise<SpiritualDiagnostic> {
    const newDiag: SpiritualDiagnostic = {
      ...diagnostic,
      id: Math.random().toString(36).substr(2, 9),
      familyId
    };
    if (config.mode === 'firebase' && db) {
      await setDoc(doc(db, 'spiritual_diagnostics', newDiag.id), newDiag);
    } else {
      const list = loadLocal<SpiritualDiagnostic[]>('spiritual_diagnostics', []);
      list.push(newDiag);
      saveLocal('spiritual_diagnostics', list);
    }
    return newDiag;
  }
};

// Export proxy-wrapped dbService to support transparent caching for Spark free plan protection
const cache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL_MS = 60000; // Cache Firestore read operations for 60 seconds

const proxiedDbService = new Proxy(baseDbService, {
  get(target, propKey, receiver) {
    const originalMethod = Reflect.get(target, propKey, receiver);
    if (typeof originalMethod !== 'function') {
      return originalMethod;
    }

    const methodName = String(propKey);

    return function (...args: any[]) {
      const familyId = args[0];
      
      // We only apply caching if the first argument is a string (familyId)
      if (typeof familyId === 'string' && familyId.length > 0) {
        if (methodName.startsWith('get')) {
          // Read operation - cache result
          const cacheKey = `${familyId}_${methodName}_${JSON.stringify(args.slice(1))}`;
          const cached = cache[cacheKey];
          if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
            return Promise.resolve(cached.data);
          }
          
          // Call original method and cache resolved data
          return originalMethod.apply(target, args).then((data: any) => {
            cache[cacheKey] = { data, timestamp: Date.now() };
            return data;
          });
        } else {
          // Write operation - invalidate all cache entries for this family
          Object.keys(cache).forEach(k => {
            if (k.startsWith(familyId)) {
              delete cache[k];
            }
          });
        }
      }

      return originalMethod.apply(target, args);
    };
  }
});

export { proxiedDbService as dbService };
