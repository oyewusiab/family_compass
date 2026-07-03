import React, { useEffect, useState } from 'react';
import { dbService } from '../db';
import type { Family, Member, Goal, Chore, DailyActivity } from '../types';
import { getTodayDateString } from '../mockData';
import { Award, BookOpen, Calendar, CheckSquare, Heart, ListTodo, Star, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DashboardProps {
  currentFamily: Family;
  currentMember: Member;
  refreshTrigger: number;
  onRefresh: () => void;
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentFamily,
  currentMember,
  refreshTrigger,
  onRefresh,
  onNavigate
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [activities, setActivities] = useState<DailyActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const today = getTodayDateString();
        const [fetchedMembers, fetchedGoals, fetchedChores, fetchedActivities] = await Promise.all([
          dbService.getMembers(currentFamily.id),
          dbService.getGoals(currentFamily.id),
          dbService.getChores(currentFamily.id),
          dbService.getDailyActivities(currentFamily.id, today)
        ]);

        setMembers(fetchedMembers);
        setGoals(fetchedGoals);
        setChores(fetchedChores);
        setActivities(fetchedActivities);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentFamily.id, refreshTrigger]);

  // Calculations for Scores
  const totalMembers = members.length || 1;

  // 1. Prayer Score (Morning + Evening for all members)
  const totalPrayersPossible = totalMembers * 2;
  const completedPrayers = activities.reduce((acc, act) => {
    let count = 0;
    if (act.prayerMorning) count++;
    if (act.prayerEvening) count++;
    return acc + count;
  }, 0);
  const prayerScorePercent = Math.round((completedPrayers / totalPrayersPossible) * 100) || 0;

  // 2. Scripture Score (Personal + Family Study for all members)
  const totalScripturesPossible = totalMembers * 2;
  const completedScriptures = activities.reduce((acc, act) => {
    let count = 0;
    if (act.scripturePersonal) count++;
    if (act.scriptureFamily) count++;
    return acc + count;
  }, 0);
  const scriptureScorePercent = Math.round((completedScriptures / totalScripturesPossible) * 100) || 0;

  // 3. Chores Score (today's completed or verified vs total)
  const assignedChores = chores.filter(c => c.assignedTo !== null);
  const totalChores = assignedChores.length || 1;
  const completedChores = assignedChores.filter(c => c.status === 'completed' || c.status === 'verified').length;
  const choresScorePercent = assignedChores.length > 0 ? Math.round((completedChores / totalChores) * 100) : 100;

  // 4. Goals Score (completed vs total)
  const totalGoalsCount = goals.length || 1;
  const completedGoalsCount = goals.filter(g => g.status === 'completed').length;
  const goalsScorePercent = goals.length > 0 ? Math.round((completedGoalsCount / totalGoalsCount) * 100) : 100;

  // FHE Score (Is Monday? If Monday, is FHE held? Otherwise defaults to 100% or based on last week)
  // Let's combine standard LDS habits to get the Overall Family Score
  const overallScore = Math.round((prayerScorePercent + scriptureScorePercent + choresScorePercent + goalsScorePercent) / 4);

  // Trigger celebration on 100% score
  const [celebrated, setCelebrated] = useState(false);
  useEffect(() => {
    if (overallScore === 100 && !celebrated && !loading) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
      setCelebrated(true);
    } else if (overallScore < 100) {
      setCelebrated(false);
    }
  }, [overallScore, celebrated, loading]);

  // Quick toggle handlers for current member
  const handleToggleActivity = async (field: keyof DailyActivity, val: boolean) => {
    const today = getTodayDateString();
    await dbService.updateDailyActivity(currentFamily.id, currentMember.id, today, {
      [field]: val
    });
    onRefresh();
  };

  // Get current member's activity record
  const currentMemberActivity = activities.find(a => a.memberId === currentMember.id) || {
    prayerMorning: false,
    prayerEvening: false,
    scripturePersonal: false,
    scriptureFamily: false,
    churchAttendance: 'none',
    templeAttendance: false
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
        <p>Loading family dashboard...</p>
      </div>
    );
  }

  // Circular progress ring setup
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallScore / 100) * circumference;

  return (
    <div className="animate-fade-in">
      {/* Welcome Banner */}
      <div className="glass-panel" style={{
        padding: '2rem',
        borderRadius: '16px',
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem',
        background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.08), rgba(var(--primary-rgb), 0.02))',
      }}>
        <div>
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            🧭 Welcome to your compass
          </span>
          <h1 style={{ fontSize: '2.25rem', marginTop: '0.25rem' }}>{currentFamily.familyName}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontStyle: 'italic', maxWidth: '600px' }}>
            "{currentFamily.missionStatement}"
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <Calendar size={18} color="var(--primary-color)" />
          <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: '2rem',
        marginBottom: '2rem'
      }}>
        {/* Overall Score Circle Card */}
        <div className="glass-card" style={{
          gridColumn: 'span 4',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          minWidth: '280px'
        }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.15rem', color: 'var(--text-secondary)' }}>Today's Family Score</h3>
          
          <div style={{ position: 'relative', width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
            <svg width="150" height="150">
              <circle
                stroke="var(--bg-tertiary)"
                fill="transparent"
                strokeWidth="10"
                r={radius}
                cx="75"
                cy="75"
              />
              <circle
                className="progress-ring-circle animate-pulse-glow"
                stroke="var(--accent-gold)"
                fill="transparent"
                strokeWidth="12"
                strokeDasharray={`${circumference} ${circumference}`}
                style={{ strokeDashoffset }}
                strokeLinecap="round"
                r={radius}
                cx="75"
                cy="75"
              />
            </svg>
            <div style={{ position: 'absolute', fontSize: '2rem', fontWeight: '800', fontFamily: 'var(--font-heading)' }}>
              {overallScore}%
            </div>
          </div>
          
          <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Complete prayers, scripture study, chores, and goals together to reach 100%!
          </p>
        </div>

        {/* Today's Progress List */}
        <div className="glass-card" style={{
          gridColumn: 'span 8',
          padding: '2rem'
        }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Star color="var(--accent-gold)" fill="var(--accent-gold)" size={20} />
            Today's Progress At a Glance
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Prayer card */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Heart size={20} color="var(--danger-color)" />
                <div>
                  <div style={{ fontWeight: '700' }}>Family Prayers</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Morning & Evening personal devotionals</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span className={`badge ${prayerScorePercent === 100 ? 'badge-verified' : 'badge-pending'}`}>
                  {prayerScorePercent === 100 ? 'Completed' : 'In Progress'}
                </span>
                <span style={{ fontWeight: 'bold', minWidth: '40px', textAlign: 'right' }}>{prayerScorePercent}%</span>
              </div>
            </div>

            {/* Scripture Study card */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <BookOpen size={20} color="var(--primary-color)" />
                <div>
                  <div style={{ fontWeight: '700' }}>Scripture Study</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Personal and family Come Follow Me reading</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span className={`badge ${scriptureScorePercent === 100 ? 'badge-verified' : 'badge-pending'}`}>
                  {scriptureScorePercent === 100 ? 'Completed' : 'In Progress'}
                </span>
                <span style={{ fontWeight: 'bold', minWidth: '40px', textAlign: 'right' }}>{scriptureScorePercent}%</span>
              </div>
            </div>

            {/* Chores card */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <ListTodo size={20} color="var(--success-color)" />
                <div>
                  <div style={{ fontWeight: '700' }}>Family Chores</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Completed: {completedChores} of {assignedChores.length} chores assigned</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span className={`badge ${choresScorePercent === 100 ? 'badge-verified' : 'badge-pending'}`}>
                  {choresScorePercent === 100 ? 'Completed' : 'In Progress'}
                </span>
                <span style={{ fontWeight: 'bold', minWidth: '40px', textAlign: 'right' }}>{choresScorePercent}%</span>
              </div>
            </div>

            {/* Annual Goals card */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Award size={20} color="var(--accent-gold)" />
                <div>
                  <div style={{ fontWeight: '700' }}>Annual Goals Progress</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Completed: {completedGoalsCount} of {goals.length} active goals</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span className={`badge ${goalsScorePercent === 100 ? 'badge-verified' : 'badge-pending'}`}>
                  {goalsScorePercent === 100 ? 'Completed' : 'In Progress'}
                </span>
                <span style={{ fontWeight: 'bold', minWidth: '40px', textAlign: 'right' }}>{goalsScorePercent}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Trackers for Current Logged-in Member */}
      <div className="glass-card" style={{
        padding: '2rem',
        marginBottom: '2rem'
      }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckSquare size={20} color="var(--primary-color)" />
          Your Quick Daily Tracker
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Check off your personal gospel practices as you complete them today, <strong>{currentMember.name}</strong>.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.25rem'
        }}>
          {/* Morning Prayer */}
          <label className="glass-panel checkbox-container" style={{ padding: '1.25rem', borderRadius: '12px' }}>
            <input
              type="checkbox"
              checked={currentMemberActivity.prayerMorning}
              onChange={(e) => handleToggleActivity('prayerMorning', e.target.checked)}
            />
            <span className="checkmark" style={{ marginRight: '1rem' }}></span>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>Morning Prayer</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Start day with gratitude</div>
            </div>
          </label>

          {/* Evening Prayer */}
          <label className="glass-panel checkbox-container" style={{ padding: '1.25rem', borderRadius: '12px' }}>
            <input
              type="checkbox"
              checked={currentMemberActivity.prayerEvening}
              onChange={(e) => handleToggleActivity('prayerEvening', e.target.checked)}
            />
            <span className="checkmark" style={{ marginRight: '1rem' }}></span>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>Evening Prayer</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Close the day in reflection</div>
            </div>
          </label>

          {/* Personal Scripture */}
          <label className="glass-panel checkbox-container" style={{ padding: '1.25rem', borderRadius: '12px' }}>
            <input
              type="checkbox"
              checked={currentMemberActivity.scripturePersonal}
              onChange={(e) => handleToggleActivity('scripturePersonal', e.target.checked)}
            />
            <span className="checkmark" style={{ marginRight: '1rem' }}></span>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>Personal Study</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Daily scripture study</div>
            </div>
          </label>

          {/* Family Scripture */}
          <label className="glass-panel checkbox-container" style={{ padding: '1.25rem', borderRadius: '12px' }}>
            <input
              type="checkbox"
              checked={currentMemberActivity.scriptureFamily}
              onChange={(e) => handleToggleActivity('scriptureFamily', e.target.checked)}
            />
            <span className="checkmark" style={{ marginRight: '1rem' }}></span>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>Family Scripture</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Come Follow Me study</div>
            </div>
          </label>
        </div>
      </div>

      {/* 🚀 FAMILY PORTAL LAUNCHPAD */}
      <div className="glass-card" style={{ padding: '2rem', marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={20} color="var(--primary-color)" />
          Family Compass Feature Launchpad
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '2rem' }}>
          Instantly jump into any scripture study room, stewardship ledger, or family activity board.
        </p>

        {/* Category: Personal Room */}
        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
          👤 Personal Space
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div 
            onClick={() => onNavigate('mycorner')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>My Corner</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Personal creed, private journals, covenant trackers, memory games, and daily checklists.</div>
          </div>
        </div>

        {/* Category: Spiritual Growth */}
        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
          📖 Gospel & Scripture Study
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div 
            onClick={() => onNavigate('cfm')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>Come Follow Me</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Coordinate weekly discussion leaders and log scripture insights.</div>
          </div>

          <div 
            onClick={() => onNavigate('scripturenarrator')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>Scripture Narrator</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Listen to curated daily scriptures read aloud using TTS.</div>
          </div>

          <div 
            onClick={() => onNavigate('game')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>Scripture Trivia</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Play scripture trivia games and earn points for chores.</div>
          </div>

          <div 
            onClick={() => onNavigate('gospel')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>Gospel Habits Tracker</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>View overall family gospel streak score and completion metrics.</div>
          </div>

          <div 
            onClick={() => onNavigate('history')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>Family History</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Share ancestor stories and log temple sealings.</div>
          </div>

          <div 
            onClick={() => onNavigate('doodle')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>Scripture Doodle</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Draw scripture lessons on a digital sketchpad and publish to family gallery.</div>
          </div>

          <div 
            onClick={() => onNavigate('milestones')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>Covenant Path Roadmap</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Check off sacramental, baptismal, and temple preparation milestone timeline goals.</div>
          </div>

          <div 
            onClick={() => onNavigate('priesthood')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>Priesthood Reference</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Ordinances procedures, exact prayers wording, and sacrament trainers.</div>
          </div>

          <div 
            onClick={() => onNavigate('temple')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>Temple Trip Planner</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Schedule trips, reserve times, log logistics, and track youth proxy lists.</div>
          </div>

          <div 
            onClick={() => onNavigate('testimony')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>Family Testimony Tree</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Hang personal testimonies of Christ as glowing leaves on an interactive family tree.</div>
          </div>
        </div>

        {/* Category: Family Governance */}
        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
          🏛️ Council & Gatherings
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div 
            onClick={() => onNavigate('journal')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>Council Journal</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Write meeting logs using custom structured templates.</div>
          </div>

          <div 
            onClick={() => onNavigate('agenda')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>Agenda Builder</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Collaboratively build Sunday council meeting agendas.</div>
          </div>

          <div 
            onClick={() => onNavigate('fhe')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>Monday Home Evening</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Plan lessons, games, treats, and assign conducting/prayer roles.</div>
          </div>

          <div 
            onClick={() => onNavigate('singalong')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>Hymns Sing-Along</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Conduct music sing-alongs with audio guides and scrolling lyrics.</div>
          </div>

          <div 
            onClick={() => onNavigate('gratitude')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>Gratitude Jar</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Drop anonymous appreciation notes to open during family gatherings.</div>
          </div>

          <div 
            onClick={() => onNavigate('newsletter')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>Weekly Newsletter</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Generate and print weekly achievements dispatch for grandparents.</div>
          </div>

          <div 
            onClick={() => onNavigate('coach')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>AI Gospel Coach</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Chat with our AI guide on gospel doctrines and family questions.</div>
          </div>

          <div 
            onClick={() => onNavigate('diagnostic')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>Spiritual Diagnostic</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Rate family unity, stress, and study habits to get AI guidance notes.</div>
          </div>

          <div 
            onClick={() => onNavigate('pioneer')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>Pioneer Story Generator</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Cross-reference ancestor names and construct custom pioneer diary stories.</div>
          </div>
        </div>

        {/* Category: Stewardship & Chores */}
        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
          💰 Stewardship & Chores
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div 
            onClick={() => onNavigate('chores')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>Chores & Rewards</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Complete chore lists, claim points, and redeem custom parents rewards.</div>
          </div>

          <div 
            onClick={() => onNavigate('choremarket')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>Communal Chore Market</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Place points bids on unassigned chores.</div>
          </div>

          <div 
            onClick={() => onNavigate('swap')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>Chore Swap Board</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Trade active chore duties with siblings under parent review authorization.</div>
          </div>

          <div 
            onClick={() => onNavigate('budget')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>Family Budget</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Log tithing payments and keep general family ledger registers.</div>
          </div>

          <div 
            onClick={() => onNavigate('kidsvault')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>Kids Savings Vault</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Manage mission savings, general piggy banks, and tithing calculators.</div>
          </div>

          <div 
            onClick={() => onNavigate('vision')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>Vision Board</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Set family goals and review child goal approval requests.</div>
          </div>

          <div 
            onClick={() => onNavigate('preparedness')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>Emergency Preparedness</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Track 72-hour emergency kits and safety drills logs.</div>
          </div>

          <div 
            onClick={() => onNavigate('food')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>Food Storage Inventory</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Track water, dry wheat, shelf lives, rotation alerts, and shopping restocks.</div>
          </div>

          <div 
            onClick={() => onNavigate('tithing')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>Tithing Calculator Slip</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Youth-friendly LDS donation slips to calculate tithing and offerings.</div>
          </div>

          <div 
            onClick={() => onNavigate('finance')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>Personal Finance Simulator</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Stewardship sandbox teaching kids to allocate budget ratios on income.</div>
          </div>
        </div>

        {/* Category: Extended Family */}
        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
          👵 Extended Family
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div 
            onClick={() => onNavigate('grandparent')}
            className="glass-panel" 
            style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-color)' }}>Grandparent Portal</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Grandparent log to view child stats, comments, and sponsor rewards.</div>
          </div>
        </div>
      </div>
    </div>
  );
};
