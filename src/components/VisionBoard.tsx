import React, { useEffect, useState } from 'react';
import { dbService } from '../db';
import type { Family, Member, Goal, GoalCategory } from '../types';
import { Award, BookOpen, Heart, Landmark, Plus, Save, Compass, Edit2, ShieldAlert, CheckCircle2, XCircle, User, Users } from 'lucide-react';
import { config } from '../config';

interface VisionBoardProps {
  currentFamily: Family;
  currentMember: Member;
  refreshTrigger: number;
  onRefresh: () => void;
}

const CATEGORY_META: Record<GoalCategory, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  spiritual: { 
    label: 'Spiritual', 
    icon: <Compass size={18} />, 
    color: '#3b82f6', 
    bg: 'rgba(59, 130, 246, 0.1)' 
  },
  financial: { 
    label: 'Financial', 
    icon: <Landmark size={18} />, 
    color: '#10b981', 
    bg: 'rgba(16, 185, 129, 0.1)' 
  },
  education: { 
    label: 'Education', 
    icon: <BookOpen size={18} />, 
    color: '#8b5cf6', 
    bg: 'rgba(139, 92, 246, 0.1)' 
  },
  health: { 
    label: 'Health', 
    icon: <Heart size={18} />, 
    color: '#ef4444', 
    bg: 'rgba(239, 68, 68, 0.1)' 
  },
  service: { 
    label: 'Service', 
    icon: <Award size={18} />, 
    color: '#f59e0b', 
    bg: 'rgba(245, 158, 11, 0.1)' 
  }
};

export const VisionBoard: React.FC<VisionBoardProps> = ({
  currentFamily,
  currentMember,
  refreshTrigger,
  onRefresh
}) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMission, setEditingMission] = useState(false);
  const [missionText, setMissionText] = useState(currentFamily.missionStatement);

  // Vision Board tabs: 'family' (Family Goals) vs 'personal' (My Personal Goals)
  const [subTab, setSubTab] = useState<'family' | 'personal'>('family');

  // New goal form states
  const [activeCategoryForm, setActiveCategoryForm] = useState<GoalCategory | null>(null);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDate, setNewGoalDate] = useState('');

  // Parent goal editing states (for reviewing proposals)
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCategory, setEditCategory] = useState<GoalCategory>('spiritual');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isParent = currentMember.role === 'parent';

  useEffect(() => {
    const fetchGoals = async () => {
      setLoading(true);
      try {
        const fetchedGoals = await dbService.getGoals(currentFamily.id);
        setGoals(fetchedGoals);
      } catch (error) {
        console.error('Error fetching goals:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchGoals();
  }, [currentFamily.id, refreshTrigger]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
        <p>Loading vision board...</p>
      </div>
    );
  }

  const handleSaveMission = async () => {
    if (!isParent) return;
    try {
      if (config.mode === 'offline') {
        const fam = JSON.parse(localStorage.getItem('fc_family') || '{}');
        fam.missionStatement = missionText;
        localStorage.setItem('fc_family', JSON.stringify(fam));
      } else {
        const { db } = await import('../firebase');
        if (db) {
          const { doc, updateDoc } = await import('firebase/firestore');
          await updateDoc(doc(db, 'families', currentFamily.id), {
            missionStatement: missionText
          });
        }
      }
      setEditingMission(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to update mission statement:', err);
    }
  };

  const handleAddGoal = async (category: GoalCategory) => {
    if (!newGoalTitle.trim()) {
      setError('Goal title cannot be empty.');
      return;
    }
    setError('');
    setSuccess('');

    const isPersonalGoal = subTab === 'personal';
    // If it's a family goal proposed by a child, it starts as 'pending'. Otherwise, 'in_progress'.
    const goalStatus = isPersonalGoal 
      ? 'in_progress' 
      : (isParent ? 'in_progress' : 'pending');

    try {
      await dbService.createGoal(
        currentFamily.id,
        category,
        newGoalTitle.trim(),
        newGoalDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // default 1 year out
        goalStatus,
        isPersonalGoal,
        isPersonalGoal ? currentMember.id : undefined,
        currentMember.name
      );
      setNewGoalTitle('');
      setNewGoalDate('');
      setActiveCategoryForm(null);
      
      if (!isPersonalGoal && !isParent) {
        setSuccess('Family goal proposed! Sent to parents for approval.');
      } else {
        setSuccess(isPersonalGoal ? 'Personal goal added!' : 'Family goal added!');
      }
      
      // Auto clear success message
      setTimeout(() => setSuccess(''), 4000);
      onRefresh();
    } catch (err) {
      setError('Failed to add goal.');
      console.error('Failed to add goal:', err);
    }
  };

  const handleToggleGoal = async (goalId: string, currentStatus: 'pending' | 'in_progress' | 'completed', isGoalPersonal: boolean, ownerId?: string) => {
    const canToggle = isParent || (isGoalPersonal && ownerId === currentMember.id);
    if (!canToggle) return;

    const nextStatus = currentStatus === 'completed' ? 'in_progress' : 'completed';
    try {
      await dbService.updateGoalStatus(currentFamily.id, goalId, nextStatus);
      onRefresh();
    } catch (err) {
      console.error('Failed to toggle goal:', err);
    }
  };

  // Administrative actions
  const handleApproveGoal = async (goalId: string) => {
    if (!isParent) return;
    try {
      await dbService.updateGoalStatus(currentFamily.id, goalId, 'in_progress');
      setSuccess('Family goal approved! Now in progress.');
      setTimeout(() => setSuccess(''), 3000);
      onRefresh();
    } catch (err) {
      console.error('Failed to approve goal:', err);
    }
  };

  const handleRejectGoal = async (goalId: string) => {
    if (!isParent) return;
    if (window.confirm('Are you sure you want to reject and delete this goal proposal?')) {
      try {
        await dbService.deleteGoal(currentFamily.id, goalId);
        setSuccess('Goal proposal deleted.');
        setTimeout(() => setSuccess(''), 3000);
        onRefresh();
      } catch (err) {
        console.error('Failed to delete goal proposal:', err);
      }
    }
  };

  const handleStartEditProposal = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setEditTitle(goal.title);
    setEditDate(goal.targetDate);
    setEditCategory(goal.category);
  };

  const handleSaveEditProposal = async (goalId: string) => {
    if (!isParent || !editTitle.trim()) return;
    try {
      await dbService.updateGoal(currentFamily.id, goalId, {
        title: editTitle.trim(),
        targetDate: editDate,
        category: editCategory,
        status: 'in_progress' // Auto-approve upon edit
      });
      setEditingGoalId(null);
      setSuccess('Goal updated and approved!');
      setTimeout(() => setSuccess(''), 3000);
      onRefresh();
    } catch (err) {
      console.error('Failed to update proposed goal:', err);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (window.confirm('Delete this goal permanently?')) {
      try {
        await dbService.deleteGoal(currentFamily.id, goalId);
        onRefresh();
      } catch (err) {
        console.error('Failed to delete goal:', err);
      }
    }
  };

  const categories: GoalCategory[] = ['spiritual', 'financial', 'education', 'health', 'service'];

  // Filter goals
  const pendingProposals = goals.filter(g => !g.isPersonal && g.status === 'pending');
  
  const activeFamilyGoals = goals.filter(g => !g.isPersonal && g.status !== 'pending');
  const activePersonalGoals = goals.filter(g => g.isPersonal && g.memberId === currentMember.id);

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800' }}>Family Vision Board</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Define your family focus, personal growth milestones, and sacred covenant goals.
        </p>
      </div>

      {/* Mission Statement section */}
      <div className="glass-card" style={{
        padding: '2.5rem',
        borderRadius: '16px',
        marginBottom: '2.5rem',
        background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.05), rgba(var(--accent-gold-rgb), 0.03))',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            📜 Family Mission Statement
          </span>
          {isParent && !editingMission && (
            <button 
              onClick={() => setEditingMission(true)}
              className="btn btn-secondary" 
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <Edit2 size={12} /> Edit
            </button>
          )}
        </div>

        {editingMission ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <textarea
              className="input-field"
              value={missionText}
              onChange={(e) => setMissionText(e.target.value)}
              style={{ width: '100%', minHeight: '100px', fontSize: '1.1rem', lineHeight: '1.6', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingMission(false)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
                Cancel
              </button>
              <button onClick={handleSaveMission} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Save size={16} /> Save Statement
              </button>
            </div>
          </div>
        ) : (
          <p style={{
            fontSize: '1.35rem',
            fontWeight: '600',
            fontStyle: 'italic',
            lineHeight: '1.7',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-heading)',
            textAlign: 'center',
            maxWidth: '900px',
            margin: '0 auto'
          }}>
            "{currentFamily.missionStatement || 'Set your family mission statement to inspire your daily walk.'}"
          </p>
        )}
      </div>

      {/* Sub Tabs Toggle (Family Goals vs Personal Goals) */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '2rem',
        gap: '1.5rem'
      }}>
        <button
          onClick={() => { setSubTab('family'); setError(''); setSuccess(''); }}
          style={{
            padding: '0.75rem 1rem',
            border: 'none',
            background: 'none',
            borderBottom: subTab === 'family' ? '3px solid var(--primary-color)' : 'none',
            color: subTab === 'family' ? 'var(--primary-color)' : 'var(--text-secondary)',
            fontWeight: subTab === 'family' ? '700' : '500',
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Users size={18} /> Family Goals
        </button>
        <button
          onClick={() => { setSubTab('personal'); setError(''); setSuccess(''); }}
          style={{
            padding: '0.75rem 1rem',
            border: 'none',
            background: 'none',
            borderBottom: subTab === 'personal' ? '3px solid var(--primary-color)' : 'none',
            color: subTab === 'personal' ? 'var(--primary-color)' : 'var(--text-secondary)',
            fontWeight: subTab === 'personal' ? '700' : '500',
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <User size={18} /> Personal Goals & Plans
        </button>
      </div>

      {/* Message Notifications */}
      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: '600' }}>
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: '600' }}>
          ✓ {success}
        </div>
      )}

      {/* Administrative Actions Panel (Parents Only, shown when there are pending proposals and family tab is open) */}
      {isParent && subTab === 'family' && pendingProposals.length > 0 && (
        <div className="glass-card animate-fade-in" style={{ padding: '1.75rem', marginBottom: '2.5rem', borderLeft: '4px solid var(--accent-gold)' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: '800', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-gold)' }}>
            🛡️ Pending Goal Proposals (Review Required)
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Children have proposed the following family goals. You can approve them instantly, edit their details before approving, or reject them.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pendingProposals.map((goal) => {
              const isEditing = editingGoalId === goal.id;
              
              return (
                <div 
                  key={goal.id} 
                  className="glass-panel animate-fade-in" 
                  style={{ padding: '1.25rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-color)' }}
                >
                  {isEditing ? (
                    // Edit Mode Form inside parent actions
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.7rem' }}>Goal Title</label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="input-field"
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.7rem' }}>Target Date</label>
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="input-field"
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.7rem' }}>Category</label>
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value as GoalCategory)}
                            className="input-field"
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', height: '34px' }}
                          >
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{CATEGORY_META[cat].label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => setEditingGoalId(null)} 
                          className="btn btn-secondary" 
                          style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleSaveEditProposal(goal.id)} 
                          className="btn btn-primary" 
                          style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
                        >
                          Save & Approve
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Regular Display Mode in Actions Panel
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'capitalize', color: CATEGORY_META[goal.category].color }}>
                            [{CATEGORY_META[goal.category].label}]
                          </span>
                          <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>{goal.title}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          Proposed by: <strong>{goal.proposedBy || 'Child'}</strong> • Target: {new Date(goal.targetDate).toLocaleDateString()}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleApproveGoal(goal.id)}
                          className="btn btn-accent"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <CheckCircle2 size={14} /> Approve
                        </button>
                        <button
                          onClick={() => handleStartEditProposal(goal)}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Edit2 size={14} /> Edit & Approve
                        </button>
                        <button
                          onClick={() => handleRejectGoal(goal.id)}
                          className="btn btn-danger"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Goal Categories Section */}
      <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        {subTab === 'family' ? 'Annual Family Goals' : `${currentMember.name}'s Personal Plans & Goals`}
      </h3>

      {subTab === 'family' && !isParent && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(59, 130, 246, 0.05)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <ShieldAlert size={16} color="var(--primary-color)" />
          Note: You can propose family goals. They will become active once approved by Mom or Dad.
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '2rem'
      }}>
        {categories.map((category) => {
          const meta = CATEGORY_META[category];
          
          // Filter list by sub-tab category
          const categoryGoals = subTab === 'family' 
            ? activeFamilyGoals.filter(g => g.category === category)
            : activePersonalGoals.filter(g => g.category === category);

          return (
            <div 
              key={category} 
              className="glass-card" 
              style={{ 
                padding: '1.5rem', 
                borderRadius: '14px',
                display: 'flex',
                flexDirection: 'column',
                borderTop: `4px solid ${meta.color}`
              }}
            >
              {/* Category Title */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    padding: '0.4rem',
                    borderRadius: '8px',
                    backgroundColor: meta.bg,
                    color: meta.color,
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    {meta.icon}
                  </div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: '700' }}>{meta.label}</h4>
                </div>
                
                {/* Everyone can add goals, but children's family proposals will require approval */}
                <button 
                  onClick={() => setActiveCategoryForm(activeCategoryForm === category ? null : category)}
                  className="btn btn-secondary" 
                  style={{ padding: '0.25rem 0.5rem', borderRadius: '6px' }}
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Add Goal Inline Form */}
              {activeCategoryForm === category && (
                <div className="glass-panel animate-fade-in" style={{ padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <input
                      type="text"
                      placeholder={subTab === 'family' ? 'Family goal...' : 'Personal plan...'}
                      value={newGoalTitle}
                      onChange={(e) => setNewGoalTitle(e.target.value)}
                      className="input-field"
                      style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Target Date</label>
                    <input
                      type="date"
                      value={newGoalDate}
                      onChange={(e) => setNewGoalDate(e.target.value)}
                      className="input-field"
                      style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => setActiveCategoryForm(null)} 
                      className="btn btn-secondary" 
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => handleAddGoal(category)} 
                      className="btn btn-primary" 
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                    >
                      {subTab === 'family' && !isParent ? 'Propose' : 'Add Goal'}
                    </button>
                  </div>
                </div>
              )}

              {/* Goal List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                {categoryGoals.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center', padding: '1.5rem 0' }}>
                    No goals defined yet.
                  </p>
                ) : (
                  categoryGoals.map((goal) => {
                    const isGoalPersonal = !!goal.isPersonal;
                    const canToggle = isParent || (isGoalPersonal && goal.memberId === currentMember.id);
                    
                    return (
                      <div 
                        key={goal.id} 
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.5rem',
                          padding: '0.6rem 0.8rem',
                          borderRadius: '8px',
                          background: goal.status === 'completed' ? 'rgba(var(--primary-rgb), 0.02)' : 'transparent',
                          border: '1px solid var(--border-color)',
                          opacity: goal.status === 'completed' ? 0.7 : 1
                        }}
                      >
                        {canToggle ? (
                          <label className="checkbox-container" style={{ marginTop: '0.1rem' }}>
                            <input
                              type="checkbox"
                              checked={goal.status === 'completed'}
                              onChange={() => handleToggleGoal(goal.id, goal.status, isGoalPersonal, goal.memberId)}
                            />
                            <span className="checkmark" style={{ width: '18px', height: '18px' }}></span>
                          </label>
                        ) : (
                          <div style={{ 
                            width: '18px', 
                            height: '18px', 
                            borderRadius: '4px', 
                            border: '2px solid var(--border-color)',
                            backgroundColor: goal.status === 'completed' ? 'var(--success-color)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            marginTop: '0.1rem'
                          }}>
                            {goal.status === 'completed' && '✓'}
                          </div>
                        )}
                        
                        <div style={{ flex: 1, marginLeft: '0.5rem' }}>
                          <div style={{
                            fontWeight: '600',
                            fontSize: '0.875rem',
                            textDecoration: goal.status === 'completed' ? 'line-through' : 'none',
                            color: goal.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)'
                          }}>
                            {goal.title}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2' }}>
                            {goal.targetDate && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                Target: {new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                            )}
                            {/* Option to delete goal for parent or owner */}
                            {(isParent || (isGoalPersonal && goal.memberId === currentMember.id)) && (
                              <button
                                onClick={() => handleDeleteGoal(goal.id)}
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  color: 'var(--text-muted)',
                                  cursor: 'pointer',
                                  fontSize: '0.65rem'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger-color)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
