import React, { useEffect, useState } from 'react';
import { dbService } from '../db';
import type { Family, Member, CFMThought, CFMPlan } from '../types';
import { cfmLessons } from '../mockData';
import { BookOpen, Send, MessageCircle, HelpCircle, Compass, Save } from 'lucide-react';

interface CFMBlockProps {
  currentFamily: Family;
  currentMember: Member;
  refreshTrigger: number;
  onRefresh: () => void;
}

export const CFMBlock: React.FC<CFMBlockProps> = ({
  currentFamily,
  currentMember,
  refreshTrigger,
  onRefresh
}) => {
  const [selectedLessonId, setSelectedLessonId] = useState(cfmLessons[0].id);
  const [thoughts, setThoughts] = useState<CFMThought[]>([]);
  const [newThought, setNewThought] = useState('');
  const [loading, setLoading] = useState(true);

  // Coordinator States
  const [members, setMembers] = useState<Member[]>([]);
  const [leaderId, setLeaderId] = useState('');
  const [dailyVerses, setDailyVerses] = useState('');
  const [notes, setNotes] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);

  const activeLesson = cfmLessons.find(l => l.id === selectedLessonId) || cfmLessons[0];
  const isParent = currentMember.role === 'parent';

  // Fetch family members on mount
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const fetched = await dbService.getMembers(currentFamily.id);
        setMembers(fetched);
      } catch (err) {
        console.error('Error fetching members for CFM:', err);
      }
    };
    fetchMembers();
  }, [currentFamily.id]);

  // Fetch thoughts & coordinator plan when lesson changes
  useEffect(() => {
    const fetchLessonData = async () => {
      setLoading(true);
      try {
        const [fetchedThoughts, plan] = await Promise.all([
          dbService.getCFMThoughts(currentFamily.id, selectedLessonId),
          dbService.getCFMPlan(currentFamily.id, selectedLessonId)
        ]);
        
        setThoughts(fetchedThoughts.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        
        if (plan) {
          setLeaderId(plan.leaderId);
          setDailyVerses(plan.dailyVerses);
          setNotes(plan.notes);
        } else {
          setLeaderId('');
          setDailyVerses('');
          setNotes('');
        }
      } catch (err) {
        console.error('Error fetching CFM data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLessonData();
  }, [currentFamily.id, selectedLessonId, refreshTrigger]);

  const handleSubmitThought = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThought.trim()) return;

    try {
      await dbService.createCFMThought(
        currentFamily.id,
        currentMember.id,
        currentMember.name,
        selectedLessonId,
        newThought.trim()
      );
      setNewThought('');
      onRefresh();
    } catch (err) {
      console.error('Failed to submit thought:', err);
    }
  };

  const handleSaveCoordinatorPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPlan(true);
    try {
      const leaderMember = members.find(m => m.id === leaderId);
      const plan: CFMPlan = {
        id: selectedLessonId,
        familyId: currentFamily.id,
        lessonId: selectedLessonId,
        leaderId,
        leaderName: leaderMember ? leaderMember.name : '',
        dailyVerses,
        notes,
        updatedAt: new Date().toISOString()
      };
      await dbService.saveCFMPlan(currentFamily.id, plan);
      onRefresh();
    } catch (err) {
      console.error('Failed to save CFM coordinator plan:', err);
    } finally {
      setSavingPlan(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header section with Dropdown */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800' }}>Come Follow Me Companion</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Study together as a family and coordinate your weekly reading plans.
          </p>
        </div>

        {/* Lesson Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.4rem 0.8rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <BookOpen size={16} color="var(--primary-color)" />
          <select
            value={selectedLessonId}
            onChange={(e) => setSelectedLessonId(e.target.value)}
            style={{
              border: 'none',
              background: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontWeight: '600',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {cfmLessons.map(lesson => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.scriptureBlock} ({lesson.title})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>
        {/* Lesson Summary & Coordinator Card */}
        <div style={{ gridColumn: 'span 7', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Summary Box */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              📖 Weekly Scripture Study Block
            </span>
            <h3 style={{ fontSize: '1.5rem', marginTop: '0.25rem', marginBottom: '0.5rem' }}>{activeLesson.scriptureBlock}</h3>
            <h4 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '1.5rem' }}>
              "{activeLesson.title}"
            </h4>

            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', lineHeight: '1.7' }}>
              <p>{activeLesson.summary}</p>
            </div>

            <h4 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HelpCircle size={18} color="var(--accent-gold)" /> Discussion Prompts
            </h4>
            <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {activeLesson.questions.map((question, idx) => (
                <li key={idx} style={{ color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
                  {question}
                </li>
              ))}
            </ul>
          </div>

          {/* Reading Coordinator Box */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Compass size={20} color="var(--primary-color)" /> Reading & Lesson Coordinator
            </h3>

            <form onSubmit={handleSaveCoordinatorPlan}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Weekly Lesson Leader</label>
                  <select
                    value={leaderId}
                    onChange={(e) => setLeaderId(e.target.value)}
                    className="input-field"
                    disabled={!isParent}
                    style={{ width: '100%', height: '42px' }}
                  >
                    <option value="">Select Leader...</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.role === 'parent' ? 'Parent' : 'Child'})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Daily Reading Verses</label>
                  <input
                    type="text"
                    placeholder="e.g. Alma 32:21-28, 41-43"
                    value={dailyVerses}
                    onChange={(e) => setDailyVerses(e.target.value)}
                    disabled={!isParent}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Family Study Notes / Questions</label>
                <textarea
                  placeholder="Record key thoughts, children questions, or spiritual focuses for this lesson block..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={!isParent}
                  className="input-field"
                  style={{ width: '100%', minHeight: '80px', resize: 'vertical', fontSize: '0.85rem' }}
                />
              </div>

              {isParent ? (
                <button
                  type="submit"
                  disabled={savingPlan}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}
                >
                  <Save size={16} /> {savingPlan ? 'Saving...' : 'Save Coordinator Plan'}
                </button>
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  🔒 Note: Only parents can edit the weekly CFM coordinator plans.
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Insights Sharing Board */}
        <div style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Post Thought box */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageCircle size={18} color="var(--primary-color)" /> Share Your Thought
            </h3>
            
            <form onSubmit={handleSubmitThought}>
              <textarea
                placeholder="What did you learn or feel from this scripture block?"
                value={newThought}
                onChange={(e) => setNewThought(e.target.value)}
                className="input-field"
                style={{ width: '100%', minHeight: '80px', fontSize: '0.875rem', marginBottom: '1rem', resize: 'vertical' }}
              />
              <button type="submit" className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Send size={14} /> Submit Insight
              </button>
            </form>
          </div>

          {/* Thoughts Timeline */}
          <div className="glass-card" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Family Insight Board</h3>

            {loading ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>Loading thoughts...</p>
            ) : thoughts.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0' }}>
                No thoughts shared for this lesson yet. Be the first to share!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', maxHeight: '450px', paddingRight: '0.5rem' }}>
                {thoughts.map((t) => (
                  <div key={t.id} className="glass-panel" style={{ padding: '1rem', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(var(--primary-rgb), 0.1)',
                          color: 'var(--primary-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '0.7rem'
                        }}>
                          {t.memberName.substring(0, 1).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{t.memberName}</span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                      "{t.thought}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
