import React, { useEffect, useState } from 'react';
import { dbService } from '../db';
import type { Family, Member, FamilyCouncil, CouncilAssignment, CouncilTemplate } from '../types';
import { Calendar, Clipboard, Plus, FileText, ChevronDown, ChevronUp, Save, ShieldAlert, Trash2 } from 'lucide-react';

interface CouncilJournalProps {
  currentFamily: Family;
  currentMember: Member;
  refreshTrigger: number;
  onRefresh: () => void;
}

export const CouncilJournal: React.FC<CouncilJournalProps> = ({
  currentFamily,
  currentMember,
  refreshTrigger,
  onRefresh
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [councils, setCouncils] = useState<FamilyCouncil[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCouncilId, setExpandedCouncilId] = useState<string | null>(null);

  // New council form states
  const [showNewForm, setShowNewForm] = useState(false);
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [assignments, setAssignments] = useState<CouncilAssignment[]>([]);

  // Selected assignment builder states
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [assignmentTask, setAssignmentTask] = useState('');

  // Version 2.5 Templates states
  const [templates, setTemplates] = useState<CouncilTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  const isParent = currentMember.role === 'parent';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [fetchedMembers, fetchedCouncils, fetchedTemplates] = await Promise.all([
          dbService.getMembers(currentFamily.id),
          dbService.getFamilyCouncils(currentFamily.id),
          dbService.getCouncilTemplates(currentFamily.id)
        ]);
        setMembers(fetchedMembers);
        // Sort councils by date descending
        setCouncils(fetchedCouncils.sort((a, b) => b.meetingDate.localeCompare(a.meetingDate)));
        setTemplates(fetchedTemplates);
        
        if (fetchedCouncils.length > 0) {
          setExpandedCouncilId(fetchedCouncils[0].id); // Expand the latest one by default
        }
      } catch (err) {
        console.error('Error fetching council data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentFamily.id, refreshTrigger]);

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) {
      setNotes('');
      setAssignments([]);
      return;
    }
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    // Prefill Discussion Topics & Decisions Made in Notes
    const noteText = `### Discussion Topics:\n${template.discussionTopics}\n\n### Decisions Made:\n${template.decisionsMade}`;
    setNotes(noteText);

    // Map template assignments to actual family members by name matching
    const mapped: CouncilAssignment[] = template.assignments.map(asg => {
      const match = members.find(m => 
        m.name.toLowerCase().includes(asg.name.toLowerCase()) || 
        asg.name.toLowerCase().includes(m.name.toLowerCase())
      );
      return {
        memberId: match ? match.id : currentMember.id,
        name: match ? match.name : asg.name,
        task: asg.task
      };
    });
    setAssignments(mapped);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (window.confirm("Are you sure you want to delete this custom template?")) {
      try {
        await dbService.deleteCouncilTemplate(currentFamily.id, templateId);
        // Refresh templates list
        const fetched = await dbService.getCouncilTemplates(currentFamily.id);
        setTemplates(fetched);
      } catch (err) {
        console.error("Failed to delete template:", err);
      }
    }
  };

  const renderTemplateManager = () => {
    const customTemplates = templates.filter(t => !t.isDefault);
    return (
      <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', height: 'fit-content' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          📋 Saved Templates
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.4' }}>
          Parents can save new templates during meeting logs. Manage your custom templates below.
        </p>

        {customTemplates.length === 0 ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem 0', textAlign: 'center' }}>
            No custom templates created yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {customTemplates.map(t => (
              <div 
                key={t.id} 
                className="glass-panel" 
                style={{ 
                  padding: '0.75rem 1rem', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  fontSize: '0.85rem',
                  border: '1px solid var(--border-color)'
                }}
              >
                <span style={{ fontWeight: '700' }}>{t.templateName}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteTemplate(t.id)}
                  style={{ 
                    border: 'none', 
                    background: 'none', 
                    color: 'var(--danger-color)', 
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <Trash2 size={12} style={{ marginRight: '2px' }} /> Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const handleAddAssignment = () => {
    if (!selectedMemberId || !assignmentTask.trim()) return;
    const member = members.find(m => m.id === selectedMemberId);
    if (!member) return;

    const newAssignment: CouncilAssignment = {
      memberId: member.id,
      name: member.name,
      task: assignmentTask.trim()
    };

    setAssignments([...assignments, newAssignment]);
    setSelectedMemberId('');
    setAssignmentTask('');
  };

  const handleRemoveAssignment = (index: number) => {
    setAssignments(assignments.filter((_, idx) => idx !== index));
  };

  const handleSaveCouncil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim() || !isParent) return;

    try {
      const newCouncil = await dbService.createFamilyCouncil(
        currentFamily.id,
        meetingDate,
        notes,
        assignments
      );

      // Save custom template if checked
      if (saveAsTemplate && newTemplateName.trim()) {
        let discussion = notes;
        let decisions = '';
        const parts = notes.split('### Decisions Made:');
        if (parts.length > 1) {
          discussion = parts[0].replace('### Discussion Topics:', '').trim();
          decisions = parts[1].trim();
        }

        const templateAssignments = assignments.map(a => ({
          name: a.name,
          task: a.task
        }));

        await dbService.createCouncilTemplate(
          currentFamily.id,
          newTemplateName.trim(),
          discussion,
          decisions,
          templateAssignments
        );

        setSaveAsTemplate(false);
        setNewTemplateName('');
        
        // Reload templates
        const fetched = await dbService.getCouncilTemplates(currentFamily.id);
        setTemplates(fetched);
      }
      
      setNotes('');
      setAssignments([]);
      setSelectedTemplateId('');
      setShowNewForm(false);
      onRefresh();
      setExpandedCouncilId(newCouncil.id);
    } catch (err) {
      console.error('Failed to save family council entry:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
        <p>Loading family journal...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800' }}>Family Council Journal</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Record discussions, decisions, and weekly assignments from your family councils.
          </p>
        </div>

        {isParent && !showNewForm && (
          <button onClick={() => setShowNewForm(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} /> New Council Entry
          </button>
        )}
      </div>

      {/* New Entry Form - Parent only */}
      {showNewForm && isParent && (
        <div className="glass-card animate-fade-in" style={{ padding: '2rem', marginBottom: '2.5rem', borderLeft: '4px solid var(--accent-gold)' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText color="var(--accent-gold)" /> Record New Family Council
          </h3>

          <form onSubmit={handleSaveCouncil}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Meeting Date</label>
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Select Meeting Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleSelectTemplate(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', height: '45px' }}
                >
                  <option value="">Start from scratch (Blank)</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.templateName} {t.isDefault ? '(Built-in)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Discussion & Decisions</label>
              <textarea
                placeholder="Write what was discussed, budget planning, spiritual focuses, and key family decisions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-field"
                style={{ width: '100%', minHeight: '120px', resize: 'vertical' }}
              />
            </div>

            {/* Assignments Builder */}
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                Action Assignments
              </h4>

              {/* Input builder */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Member</label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', height: '42px', fontSize: '0.85rem' }}
                  >
                    <option value="">Select...</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Action / Task</label>
                  <input
                    type="text"
                    placeholder="e.g. Save ₦10,000, daily chores, budget review..."
                    value={assignmentTask}
                    onChange={(e) => setAssignmentTask(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem' }}
                  />
                </div>
                <button 
                  type="button" 
                  onClick={handleAddAssignment} 
                  className="btn btn-secondary"
                  style={{ height: '42px', padding: '0 1rem' }}
                >
                  Add Action
                </button>
              </div>

              {/* Assignment preview list */}
              {assignments.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                  {assignments.map((asg, index) => (
                    <div 
                      key={index} 
                      style={{
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '0.5rem 0.75rem', 
                        background: 'var(--bg-secondary)', 
                        borderRadius: '6px', 
                        border: '1px solid var(--border-color)',
                        fontSize: '0.85rem'
                      }}
                    >
                      <span>
                        👤 <strong>{asg.name}</strong>: {asg.task}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveAssignment(index)} 
                        style={{ border: 'none', background: 'none', color: 'var(--danger-color)', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '0.5rem 0' }}>
                  No assignments added yet.
                </div>
              )}
            </div>

            {/* Save as custom template */}
            <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                />
                <span className="checkmark" style={{ marginRight: '0.75rem' }}></span>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Save this structure as a template</span>
              </label>

              {saveAsTemplate && (
                <div className="form-group animate-fade-in" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Template Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Weekly Planning Council, Sunday Study..."
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="input-field"
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                onClick={() => { setShowNewForm(false); setNotes(''); setAssignments([]); }} 
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Save size={16} /> Save Journal Entry
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Warning if child tries to open create form */}
      {!isParent && showNewForm && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.05)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--danger-color)' }}>
          <ShieldAlert size={16} />
          Access Denied: Only Parents can record family council meetings.
        </div>
      )}

      {/* Past Councils & Template Manager Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>
        <div style={{ gridColumn: isParent ? 'span 8' : 'span 12', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {councils.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Clipboard size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p>No family council journal entries found. Hold your first council meeting and record it!</p>
            </div>
          ) : (
            councils.map((council) => {
              const isExpanded = expandedCouncilId === council.id;

              return (
                <div 
                  key={council.id} 
                  className="glass-card" 
                  style={{
                    borderRadius: '14px',
                    overflow: 'hidden',
                    borderLeft: isExpanded ? '4px solid var(--primary-color)' : '1px solid var(--glass-border)'
                  }}
                >
                  {/* Accordion header */}
                  <div 
                    onClick={() => setExpandedCouncilId(isExpanded ? null : council.id)}
                    style={{
                      padding: '1.5rem',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: isExpanded ? 'rgba(var(--primary-rgb), 0.02)' : 'transparent',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <Calendar size={20} color="var(--primary-color)" />
                      <div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: '700' }}>
                          Council Meeting — {new Date(council.meetingDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                          {council.assignments.length} Action assignments decided
                        </p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div style={{
                      padding: '0 1.5rem 1.5rem',
                      borderTop: '1px solid var(--border-color)',
                      animation: 'fadeIn 0.25s ease'
                    }}>
                      {/* Discussion notes */}
                      <div style={{ marginTop: '1.5rem' }}>
                        <h5 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
                          Notes & Decisions
                        </h5>
                        <p style={{
                          fontSize: '0.95rem',
                          lineHeight: '1.7',
                          color: 'var(--text-primary)',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {council.notes}
                        </p>
                      </div>

                      {/* Assignments */}
                      {council.assignments && council.assignments.length > 0 && (
                        <div style={{ marginTop: '1.5rem' }}>
                          <h5 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>
                            Assignments Decided
                          </h5>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '1rem'
                          }}>
                            {council.assignments.map((asg, idx) => (
                              <div 
                                key={idx}
                                className="glass-panel"
                                style={{
                                  padding: '1rem',
                                  borderRadius: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.75rem',
                                  border: '1px solid var(--border-color)'
                                }}
                              >
                                <div style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  backgroundColor: 'rgba(var(--primary-rgb), 0.1)',
                                  color: 'var(--primary-color)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 'bold',
                                  fontSize: '0.75rem',
                                  flexShrink: 0
                                }}>
                                  {asg.name.substring(0, 1).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{asg.name}</div>
                                  <div style={{ fontSize: '0.875rem', fontWeight: '600', marginTop: '0.1rem' }}>{asg.task}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Template Manager - Parent only */}
        {isParent && (
          <div style={{ gridColumn: 'span 4' }}>
            {renderTemplateManager()}
          </div>
        )}
      </div>
    </div>
  );
};
