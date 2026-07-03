import React, { useEffect, useState } from 'react';
import { dbService } from '../db';
import type { Family, Member, DailyActivity } from '../types';
import { getTodayDateString } from '../mockData';
import { Calendar, Check, Sparkles, Sun, Moon, BookOpen, Compass, Award } from 'lucide-react';

interface GospelTrackerProps {
  currentFamily: Family;
  currentMember: Member;
  refreshTrigger: number;
  onRefresh: () => void;
}

export const GospelTracker: React.FC<GospelTrackerProps> = ({
  currentFamily,
  currentMember,
  refreshTrigger,
  onRefresh
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [activities, setActivities] = useState<DailyActivity[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [loading, setLoading] = useState(true);

  const isParent = currentMember.role === 'parent';

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      try {
        const [fetchedMembers, fetchedActivities] = await Promise.all([
          dbService.getMembers(currentFamily.id),
          dbService.getDailyActivities(currentFamily.id, selectedDate)
        ]);
        setMembers(fetchedMembers);
        setActivities(fetchedActivities);
      } catch (err) {
        console.error('Error fetching gospel data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, [currentFamily.id, selectedDate, refreshTrigger]);

  const handleToggleActivity = async (memberId: string, field: keyof DailyActivity, val: boolean) => {
    // Permission check: children can only toggle their own logs. Parents can toggle for anyone.
    if (memberId !== currentMember.id && !isParent) {
      alert("You can only update your own tracker. Parents can update trackers for all family members.");
      return;
    }

    try {
      await dbService.updateDailyActivity(currentFamily.id, memberId, selectedDate, {
        [field]: val
      });
      onRefresh();
    } catch (err) {
      console.error('Failed to update activity:', err);
    }
  };

  const handleChurchSelect = async (memberId: string, value: 'sacrament' | 'midweek' | 'none') => {
    if (memberId !== currentMember.id && !isParent) {
      alert("You can only update your own tracker.");
      return;
    }

    try {
      await dbService.updateDailyActivity(currentFamily.id, memberId, selectedDate, {
        churchAttendance: value
      });
      onRefresh();
    } catch (err) {
      console.error('Failed to update church attendance:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
        <p>Loading gospel tracker...</p>
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
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800' }}>Daily Gospel Tracker</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Build consistent scripture study and prayer habits.
          </p>
        </div>

        {/* Date Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.4rem 0.8rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <Calendar size={16} color="var(--primary-color)" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              border: 'none',
              background: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontWeight: '600',
              outline: 'none',
              cursor: 'pointer'
            }}
          />
        </div>
      </div>

      {/* Member tracking grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {members.map((member) => {
          const act = activities.find(a => a.memberId === member.id) || {
            prayerMorning: false,
            prayerEvening: false,
            scripturePersonal: false,
            scriptureFamily: false,
            churchAttendance: 'none' as 'sacrament' | 'midweek' | 'none',
            templeAttendance: false
          };

          const canEdit = member.id === currentMember.id || isParent;

          // Compute member completion rate for today (out of 5 main elements: morning prayer, evening prayer, personal scripture, family scripture, temple)
          const completedCount = 
            (act.prayerMorning ? 1 : 0) + 
            (act.prayerEvening ? 1 : 0) + 
            (act.scripturePersonal ? 1 : 0) + 
            (act.scriptureFamily ? 1 : 0) +
            (act.templeAttendance ? 1 : 0);

          return (
            <div 
              key={member.id} 
              className="glass-card" 
              style={{
                padding: '2rem',
                borderRadius: '16px',
                borderLeft: member.id === currentMember.id ? '5px solid var(--primary-color)' : '1px solid var(--glass-border)',
                backgroundColor: member.id === currentMember.id ? 'rgba(var(--primary-rgb), 0.01)' : 'var(--glass-bg)'
              }}
            >
              {/* Member Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: member.role === 'parent' ? 'var(--primary-color)' : 'var(--accent-gold)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                  }}>
                    {member.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      {member.name}
                      {member.id === currentMember.id && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--primary-color)', backgroundColor: 'rgba(var(--primary-rgb), 0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                          You
                        </span>
                      )}
                    </h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                      {member.role} {member.age ? `• Age ${member.age}` : ''}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={16} color="var(--accent-gold)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                    Score: {Math.round((completedCount / 5) * 100)}%
                  </span>
                </div>
              </div>

              {/* Toggles Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.25rem',
                marginBottom: '1.5rem'
              }}>
                {/* Morning Prayer */}
                <div 
                  className="glass-panel" 
                  onClick={() => canEdit && handleToggleActivity(member.id, 'prayerMorning', !act.prayerMorning)}
                  style={{
                    padding: '1rem',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: canEdit ? 'pointer' : 'default',
                    opacity: canEdit ? 1 : 0.8
                  }}
                >
                  <div style={{ color: act.prayerMorning ? 'var(--success-color)' : 'var(--text-muted)' }}>
                    {act.prayerMorning ? <Check size={20} style={{ strokeWidth: 3 }} /> : <Sun size={20} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>Morning Prayer</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Start day with devotion</div>
                  </div>
                </div>

                {/* Evening Prayer */}
                <div 
                  className="glass-panel" 
                  onClick={() => canEdit && handleToggleActivity(member.id, 'prayerEvening', !act.prayerEvening)}
                  style={{
                    padding: '1rem',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: canEdit ? 'pointer' : 'default',
                    opacity: canEdit ? 1 : 0.8
                  }}
                >
                  <div style={{ color: act.prayerEvening ? 'var(--success-color)' : 'var(--text-muted)' }}>
                    {act.prayerEvening ? <Check size={20} style={{ strokeWidth: 3 }} /> : <Moon size={20} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>Evening Prayer</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Gratitude at night</div>
                  </div>
                </div>

                {/* Personal Scripture */}
                <div 
                  className="glass-panel" 
                  onClick={() => canEdit && handleToggleActivity(member.id, 'scripturePersonal', !act.scripturePersonal)}
                  style={{
                    padding: '1rem',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: canEdit ? 'pointer' : 'default',
                    opacity: canEdit ? 1 : 0.8
                  }}
                >
                  <div style={{ color: act.scripturePersonal ? 'var(--success-color)' : 'var(--text-muted)' }}>
                    {act.scripturePersonal ? <Check size={20} style={{ strokeWidth: 3 }} /> : <BookOpen size={20} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>Personal Scripture</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Daily Book of Mormon</div>
                  </div>
                </div>

                {/* Family Scripture */}
                <div 
                  className="glass-panel" 
                  onClick={() => canEdit && handleToggleActivity(member.id, 'scriptureFamily', !act.scriptureFamily)}
                  style={{
                    padding: '1rem',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: canEdit ? 'pointer' : 'default',
                    opacity: canEdit ? 1 : 0.8
                  }}
                >
                  <div style={{ color: act.scriptureFamily ? 'var(--success-color)' : 'var(--text-muted)' }}>
                    {act.scriptureFamily ? <Check size={20} style={{ strokeWidth: 3 }} /> : <Compass size={20} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>Family CFM Study</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Come Follow Me lesson</div>
                  </div>
                </div>

                {/* Temple Attendance */}
                <div 
                  className="glass-panel" 
                  onClick={() => canEdit && handleToggleActivity(member.id, 'templeAttendance', !act.templeAttendance)}
                  style={{
                    padding: '1rem',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: canEdit ? 'pointer' : 'default',
                    opacity: canEdit ? 1 : 0.8
                  }}
                >
                  <div style={{ color: act.templeAttendance ? 'var(--success-color)' : 'var(--text-muted)' }}>
                    {act.templeAttendance ? <Check size={20} style={{ strokeWidth: 3 }} /> : <Award size={20} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>Temple Work</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ordinances & history</div>
                  </div>
                </div>
              </div>

              {/* Church Attendance Row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '1rem',
                flexWrap: 'wrap'
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                  ⛪ Church Attendance:
                </span>
                
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {/* None option */}
                  <button
                    onClick={() => canEdit && handleChurchSelect(member.id, 'none')}
                    className={`btn ${act.churchAttendance === 'none' ? 'btn-primary' : 'btn-secondary'}`}
                    disabled={!canEdit}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', cursor: canEdit ? 'pointer' : 'default' }}
                  >
                    None
                  </button>

                  {/* Sacrament */}
                  <button
                    onClick={() => canEdit && handleChurchSelect(member.id, 'sacrament')}
                    className={`btn ${act.churchAttendance === 'sacrament' ? 'btn-primary' : 'btn-secondary'}`}
                    disabled={!canEdit}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', cursor: canEdit ? 'pointer' : 'default' }}
                  >
                    Sacrament Meeting
                  </button>

                  {/* Midweek Activities */}
                  <button
                    onClick={() => canEdit && handleChurchSelect(member.id, 'midweek')}
                    className={`btn ${act.churchAttendance === 'midweek' ? 'btn-primary' : 'btn-secondary'}`}
                    disabled={!canEdit}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', cursor: canEdit ? 'pointer' : 'default' }}
                  >
                    Midweek Activity
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
