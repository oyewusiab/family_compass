import React, { useEffect, useState } from 'react';
import { dbService } from '../db';
import type { Family, Member, AncestorStory, TempleTrip, TempleTripType } from '../types';
import { Plus, Calendar, BookOpen, Compass, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';

interface FamilyHistoryProps {
  currentFamily: Family;
  currentMember: Member;
  refreshTrigger: number;
  onRefresh: () => void;
}

export const FamilyHistory: React.FC<FamilyHistoryProps> = ({
  currentFamily,
  currentMember,
  refreshTrigger,
  onRefresh
}) => {
  const [tab, setTab] = useState<'stories' | 'temple'>('stories');
  const [stories, setStories] = useState<AncestorStory[]>([]);
  const [trips, setTrips] = useState<TempleTrip[]>([]);
  const [loading, setLoading] = useState(true);

  // Ancestor Form States
  const [ancestorName, setAncestorName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [storyText, setStoryText] = useState('');

  // Temple Form States
  const [templeName, setTempleName] = useState('');
  const [tripDate, setTripDate] = useState('');
  const [tripType, setTripType] = useState<TempleTripType>('baptisms');
  const [attendeeCount, setAttendeeCount] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isParent = currentMember.role === 'parent';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [fetchedStories, fetchedTrips] = await Promise.all([
          dbService.getAncestorStories(currentFamily.id),
          dbService.getTempleTrips(currentFamily.id)
        ]);
        setStories(fetchedStories.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setTrips(fetchedTrips.sort((a, b) => b.tripDate.localeCompare(a.tripDate)));
      } catch (err) {
        console.error('Error fetching family history data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentFamily.id, refreshTrigger]);

  const handleAddStory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!ancestorName.trim() || !storyText.trim()) {
      setError('Please provide ancestor name and story details.');
      return;
    }

    try {
      await dbService.createAncestorStory(
        currentFamily.id,
        ancestorName.trim(),
        birthYear ? parseInt(birthYear) : 1900,
        storyText.trim(),
        currentMember.name
      );
      setAncestorName('');
      setBirthYear('');
      setStoryText('');
      setSuccess('Ancestor story recorded successfully!');
      onRefresh();
    } catch (err) {
      setError('Failed to record story.');
    }
  };

  const handleAddTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!isParent) return;

    if (!templeName.trim() || !tripDate) {
      setError('Please provide temple name and scheduled date.');
      return;
    }

    try {
      await dbService.createTempleTrip(
        currentFamily.id,
        templeName.trim(),
        tripDate,
        tripType,
        attendeeCount ? parseInt(attendeeCount) : 1
      );
      setTempleName('');
      setTripDate('');
      setAttendeeCount('');
      setSuccess('Temple trip scheduled successfully!');
      onRefresh();
    } catch (err) {
      setError('Failed to schedule temple trip.');
    }
  };

  const handleCompleteTrip = async (tripId: string) => {
    if (!isParent) return;
    try {
      await dbService.updateTempleTripStatus(currentFamily.id, tripId, 'completed');
      setSuccess('Temple trip completed! Covenants honored.');
      onRefresh();
    } catch (err) {
      console.error('Failed to complete temple trip:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
        <p>Loading family history board...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800' }}>Temple & Family History Companion</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Connect with ancestors through sacred stories and coordinate family temple covenants.
        </p>
      </div>

      {/* Sub tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '2rem',
        gap: '1.5rem'
      }}>
        <button
          onClick={() => { setTab('stories'); setError(''); setSuccess(''); }}
          style={{
            padding: '0.75rem 1rem',
            border: 'none',
            background: 'none',
            borderBottom: tab === 'stories' ? '3px solid var(--primary-color)' : 'none',
            color: tab === 'stories' ? 'var(--primary-color)' : 'var(--text-secondary)',
            fontWeight: tab === 'stories' ? '700' : '500',
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <BookOpen size={18} /> Ancestor Stories
        </button>
        <button
          onClick={() => { setTab('temple'); setError(''); setSuccess(''); }}
          style={{
            padding: '0.75rem 1rem',
            border: 'none',
            background: 'none',
            borderBottom: tab === 'temple' ? '3px solid var(--primary-color)' : 'none',
            color: tab === 'temple' ? 'var(--primary-color)' : 'var(--text-secondary)',
            fontWeight: tab === 'temple' ? '700' : '500',
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Compass size={18} /> Temple Coordinator
        </button>
      </div>

      {/* Messages */}
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

      {/* Ancestor Stories Tab */}
      {tab === 'stories' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>
          {/* Write Story Box */}
          <div className="glass-card" style={{ gridColumn: 'span 4', padding: '1.5rem', height: 'fit-content' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={18} color="var(--primary-color)" /> Record Ancestor Story
            </h3>
            
            <form onSubmit={handleAddStory}>
              <div className="form-group">
                <label className="form-label">Ancestor's Name</label>
                <input
                  type="text"
                  placeholder="e.g. Thomas Smith, Mary Jones..."
                  value={ancestorName}
                  onChange={(e) => setAncestorName(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Birth Year (Approximate)</label>
                <input
                  type="number"
                  placeholder="e.g. 1888"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Story details & legacy</label>
                <textarea
                  placeholder="Write a brief story of their conversion, sacrifice, pioneer walks, or legacy of faith..."
                  value={storyText}
                  onChange={(e) => setStoryText(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', minHeight: '120px', resize: 'vertical', fontSize: '0.85rem' }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                Record Story
              </button>
            </form>
          </div>

          {/* Stories Board */}
          <div className="glass-card" style={{ gridColumn: 'span 8', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} color="var(--primary-color)" /> Ancestor Journal
            </h3>

            {stories.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0' }}>
                No ancestor stories recorded yet. Share a story to inspire the children!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {stories.map((story) => (
                  <div key={story.id} className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                      <div>
                        <h4 style={{ fontSize: '1.15rem', fontWeight: '800' }}>{story.ancestorName}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Born: {story.birthYear} • Submitted by: <strong>{story.submittedBy}</strong>
                        </span>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.925rem', lineHeight: '1.7', whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
                      {story.storyText}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Temple Coordinator Tab */}
      {tab === 'temple' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>
          {/* Schedule Trip - Parent only */}
          {isParent && (
            <div className="glass-card" style={{ gridColumn: 'span 4', padding: '1.5rem', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={18} color="var(--primary-color)" /> Schedule Temple Trip
              </h3>
              
              <form onSubmit={handleAddTrip}>
                <div className="form-group">
                  <label className="form-label">Temple Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Aba Nigeria Temple, Lagos Temple..."
                    value={templeName}
                    onChange={(e) => setTempleName(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Trip Date</label>
                  <input
                    type="date"
                    value={tripDate}
                    onChange={(e) => setTripDate(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Covenant Ordinance Type</label>
                  <select
                    value={tripType}
                    onChange={(e) => setTripType(e.target.value as TempleTripType)}
                    className="input-field"
                    style={{ width: '100%', height: '42px' }}
                  >
                    <option value="baptisms">Baptisms (Youth & Children)</option>
                    <option value="endowments">Endowments (Adults)</option>
                    <option value="sealings">Family Sealings</option>
                    <option value="other">Other Ordinances</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Attendees count</label>
                  <input
                    type="number"
                    placeholder="e.g. 4"
                    value={attendeeCount}
                    onChange={(e) => setAttendeeCount(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                  Schedule Trip
                </button>
              </form>
            </div>
          )}

          {/* Trips list */}
          <div className="glass-card" style={{ gridColumn: isParent ? 'span 8' : 'span 12', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={20} color="var(--primary-color)" /> Scheduled Temple Work
            </h3>

            {!isParent && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(59, 130, 246, 0.05)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <ShieldAlert size={16} color="var(--primary-color)" />
                Note: Only Parents can schedule temple trips and verify completion.
              </div>
            )}

            {trips.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0' }}>
                No temple trips scheduled yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {trips.map((trip) => {
                  const isScheduled = trip.status === 'scheduled';
                  
                  return (
                    <div 
                      key={trip.id}
                      className="glass-panel"
                      style={{
                        padding: '1.25rem',
                        borderRadius: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderLeft: isScheduled ? '4px solid var(--warning-color)' : '4px solid var(--success-color)',
                        opacity: isScheduled ? 1 : 0.7
                      }}
                    >
                      <div>
                        <h4 style={{ fontWeight: '800', fontSize: '1.1rem' }}>⛪ {trip.templeName}</h4>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          Scheduled: <strong>{new Date(trip.tripDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span style={{ textTransform: 'capitalize' }}>Ordinances: <strong>{trip.type}</strong></span>
                          <span>Attendees: <strong>{trip.attendeeCount}</strong></span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className={`badge badge-${trip.status === 'scheduled' ? 'pending' : 'verified'}`}>
                          {trip.status}
                        </span>

                        {isParent && isScheduled && (
                          <button
                            onClick={() => handleCompleteTrip(trip.id)}
                            className="btn btn-accent"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <CheckCircle2 size={14} /> Completed
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
