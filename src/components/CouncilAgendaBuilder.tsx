import React, { useEffect, useState } from 'react';
import { dbService } from '../db';
import type { Family, Member, AgendaItem } from '../types';
import { Clipboard, Heart, Calendar, MessageSquare, Plus, ArrowRight } from 'lucide-react';

interface AgendaBuilderProps {
  currentFamily: Family;
  currentMember: Member;
  refreshTrigger: number;
  onRefresh: () => void;
}

export const CouncilAgendaBuilder: React.FC<AgendaBuilderProps> = ({
  currentFamily,
  currentMember,
  refreshTrigger,
  onRefresh
}) => {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [type, setType] = useState<'topic' | 'event' | 'appreciation'>('topic');
  const [content, setContent] = useState('');
  const [eventDate, setEventDate] = useState('');
  
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  const isParent = currentMember.role === 'parent';

  useEffect(() => {
    const fetchAgenda = async () => {
      setLoading(true);
      try {
        const fetched = await dbService.getAgendaItems(currentFamily.id);
        setItems(fetched.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAgenda();
  }, [currentFamily.id, refreshTrigger]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!content.trim()) {
      setError('Please enter item details or content.');
      return;
    }
    if (type === 'event' && !eventDate) {
      setError('Please select a date for the calendar event.');
      return;
    }

    try {
      await dbService.createAgendaItem(currentFamily.id, {
        familyId: currentFamily.id,
        type,
        content: content.trim(),
        submittedBy: currentMember.name,
        date: type === 'event' ? eventDate : undefined
      });

      setContent('');
      setEventDate('');
      setSuccess('Item added to weekly council agenda!');
      setTimeout(() => setSuccess(''), 3000);
      onRefresh();
    } catch (err) {
      console.error(err);
      setError('Failed to add agenda item.');
    }
  };

  const handleCompileAgenda = async () => {
    if (!isParent) return;
    if (items.length === 0) {
      setError('Agenda is currently empty. Add topics first!');
      return;
    }

    try {
      // Build skeleton notes from items
      const topicsText = items
        .filter(i => i.type === 'topic')
        .map(i => `• [Proposed by ${i.submittedBy}] ${i.content}`)
        .join('\n') || '• No specific discussion topics submitted.';

      const eventsText = items
        .filter(i => i.type === 'event')
        .map(i => `• [Event date: ${i.date} submitted by ${i.submittedBy}] ${i.content}`)
        .join('\n') || '• No calendar events submitted.';

      const appreciationsText = items
        .filter(i => i.type === 'appreciation')
        .map(i => `• [From ${i.submittedBy}] ${i.content}`)
        .join('\n') || '• No peer appreciations logged.';

      // Combine notes
      const templateContent = `Weekly Sunday Family Council Agenda\n\n1. Spiritual Opening & Prayer\n\n2. Peer Appreciations:\n${appreciationsText}\n\n3. Calendar Review:\n${eventsText}\n\n4. Topics for Discussion:\n${topicsText}\n\n5. Assignments & Decisions`;

      // Save as a Family Council Log
      await dbService.createFamilyCouncil(
        currentFamily.id,
        new Date().toISOString().split('T')[0],
        templateContent,
        [] // empty assignments initially
      );

      // Clear Agenda Items
      await dbService.clearAgendaItems(currentFamily.id);
      
      setSuccess('Sunday Council Agenda compiled and archived to Council Journal logs successfully!');
      setTimeout(() => setSuccess(''), 4000);
      onRefresh();
    } catch (err) {
      console.error(err);
      setError('Failed to compile council agenda.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
        <p>Loading family council agenda board...</p>
      </div>
    );
  }

  const topics = items.filter(i => i.type === 'topic');
  const events = items.filter(i => i.type === 'event');
  const appreciations = items.filter(i => i.type === 'appreciation');

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clipboard color="var(--primary-color)" /> Family Council Agenda Builder
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Collaborate on Sunday agenda items throughout the week. Anyone can submit topics, events, or peer appreciations.
          </p>
        </div>

        {isParent && items.length > 0 && (
          <button 
            onClick={handleCompileAgenda} 
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            Compile Sunday Agenda <ArrowRight size={16} />
          </button>
        )}
      </div>

      {success && (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: '600' }}>
          ✓ {success}
        </div>
      )}
      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: '600' }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>
        {/* Submission Form */}
        <div className="glass-card" style={{ gridColumn: 'span 4', padding: '1.75rem', height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} color="var(--primary-color)" /> Add Submissions
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Submission Category</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setType('topic')}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: type === 'topic' ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
                    color: type === 'topic' ? 'var(--primary-color)' : 'var(--text-secondary)',
                    fontWeight: '600',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  Topic
                </button>
                <button
                  type="button"
                  onClick={() => setType('event')}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: type === 'event' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    color: type === 'event' ? 'var(--primary-color)' : 'var(--text-secondary)',
                    fontWeight: '600',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  Event
                </button>
                <button
                  type="button"
                  onClick={() => setType('appreciation')}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: type === 'appreciation' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                    color: type === 'appreciation' ? 'var(--success-color)' : 'var(--text-secondary)',
                    fontWeight: '600',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  Appreciate
                </button>
              </div>
            </div>

            {type === 'event' && (
              <div className="form-group animate-fade-in">
                <label className="form-label">Event Date</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                {type === 'topic' && 'What should we discuss?'}
                {type === 'event' && 'Event description & details'}
                {type === 'appreciation' && 'Who do you want to appreciate and why?'}
              </label>
              <textarea
                placeholder={
                  type === 'topic' ? "e.g. Schedule family summer trip, school fee budget planning..." :
                  type === 'event' ? "e.g. Youth temple trip Wednesday, Soccer match Saturday..." :
                  "e.g. Thanks Brayden for packing my lunch box on Tuesday morning!"
                }
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="input-field"
                style={{ width: '100%', minHeight: '100px', resize: 'vertical', fontSize: '0.85rem' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Submit Entry
            </button>
          </form>
        </div>

        {/* Categories Preview list */}
        <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Peer Appreciations (Uplifting Notes) */}
          <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--success-color)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success-color)' }}>
              <Heart size={18} fill="var(--success-color)" /> Family Appreciations & Uplifts
            </h3>
            {appreciations.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                No appreciation notes logged yet. Lift up family members with kind comments!
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                {appreciations.map(item => (
                  <div key={item.id} className="glass-panel animate-fade-in" style={{ padding: '1rem', borderRadius: '10px' }}>
                    <p style={{ fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--text-primary)' }}>
                      "{item.content}"
                    </p>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'right' }}>
                      — Submitted by <strong>{item.submittedBy}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Calendar review */}
          <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid #3b82f6' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6' }}>
              <Calendar size={18} /> Calendar & Events Log
            </h3>
            {events.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                No events submitted for review.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {events.map(item => (
                  <div key={item.id} className="glass-panel animate-fade-in" style={{ padding: '0.75rem 1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>📅 {item.date}:</strong> <span style={{ fontSize: '0.875rem', marginLeft: '0.5rem' }}>{item.content}</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>submitted by {item.submittedBy}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Topics for discussion */}
          <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-gold)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-gold)' }}>
              <MessageSquare size={18} /> Sunday Council Discussion Topics
            </h3>
            {topics.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                No discussion topics logged. Add items to review during your family meeting.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {topics.map(item => (
                  <div key={item.id} className="glass-panel animate-fade-in" style={{ padding: '0.75rem 1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem' }}>💬 {item.content}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>proposed by {item.submittedBy}</span>
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
