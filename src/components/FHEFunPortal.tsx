import React, { useState, useEffect } from 'react';
import { dbService } from '../db';
import type { Family, Member, FHEPlan, GratitudeJarNote } from '../types';
import { Plus, Play, Pause } from 'lucide-react';
import confetti from 'canvas-confetti';

interface FHEFunPortalProps {
  currentFamily: Family;
  currentMember: Member;
  refreshTrigger: number;
  onRefresh: () => void;
  initialSubTab?: string;
}

// Preset Library data
const LESSON_LIBRARY = [
  {
    id: 'faith_seed',
    title: 'Faith is Like a Seed',
    category: 'lesson',
    description: 'Read Alma 32:21-28. Discuss how we nourish our testimonies daily like a growing plant.',
    activity: 'Plant a bean seed in a paper cup and place it in the window.',
    treat: 'Decorate flowerpot-shaped cupcakes with Oreo dirt.'
  },
  {
    id: 'service_king',
    title: 'Serving One Another',
    category: 'lesson',
    description: 'Read Mosiah 2:17. Discuss how serving each other in the home is actually serving Heavenly Father.',
    activity: 'Write secret helper tasks on cards and perform acts of service for family members.',
    treat: 'Make warm homemade soft pretzels.'
  },
  {
    id: 'word_wisdom',
    title: 'Temples of God',
    category: 'lesson',
    description: 'Read D&C 89. Talk about keeping our bodies healthy and pure as temples.',
    activity: 'Set up a family obstacle course or go on a brisk walk together.',
    treat: 'Fruit skewers with a yogurt dip.'
  },
  {
    id: 'honesty_shield',
    title: 'The Shield of Honesty',
    category: 'lesson',
    description: 'Discuss how truthfulness builds trust and shields us from temptation.',
    activity: 'Play the trust fall game or a cooperative board game.',
    treat: 'Rice Krispies Treats shaped like shields.'
  }
];

const GAME_LIBRARY = [
  {
    id: 'scripture_charades',
    title: 'Scripture Charades',
    description: 'Act out bible/book of mormon scenes (Nephi building the ship, Daniel in the lions den, Noah building the ark) without speaking.'
  },
  {
    id: 'aof_relay',
    title: 'Article of Faith Relay',
    description: 'Print out words of a selected Article of Faith, mix them up, and race to arrange them in order!'
  },
  {
    id: 'trivia_wheel',
    title: 'Family Doctrinal Trivia',
    description: 'A parent reads simple gospel trivia questions and siblings compete in friendly buzz-in matches.'
  }
];

// Seeded Hymns with simple MIDI-like note data for synthesis
const HYMN_PLAYLIST = [
  {
    id: 'child_god',
    title: 'I Am a Child of God',
    lyrics: "I am a child of God, And he has sent me here,\nHas given me an earthly home With parents kind and dear.\n\nLead me, guide me, walk beside me, Help me find the way.\nTeach me all that I must do To live with him someday.",
    notes: [
      { note: 'G4', dur: 0.5 }, { note: 'G4', dur: 0.5 }, { note: 'A4', dur: 0.5 }, { note: 'G4', dur: 0.5 },
      { note: 'C5', dur: 1.0 }, { note: 'E5', dur: 0.5 }, { note: 'D5', dur: 1.5 },
      { note: 'F5', dur: 0.5 }, { note: 'F5', dur: 0.5 }, { note: 'G5', dur: 0.5 }, { note: 'F5', dur: 0.5 },
      { note: 'E5', dur: 1.0 }, { note: 'D5', dur: 0.5 }, { note: 'C5', dur: 1.5 }
    ]
  },
  {
    id: 'keep_cmd',
    title: 'Keep the Commandments',
    lyrics: "Keep the commandments; keep the commandments!\nIn this there is safety; in this there is peace.\nHe will send blessings; He will send blessings.\nWords of a prophet: Keep the commandments.\nIn this there is safety and peace.",
    notes: [
      { note: 'E4', dur: 0.5 }, { note: 'G4', dur: 0.5 }, { note: 'C5', dur: 0.75 }, { note: 'B4', dur: 0.25 },
      { note: 'A4', dur: 0.5 }, { note: 'A4', dur: 0.5 }, { note: 'G4', dur: 1.0 },
      { note: 'F4', dur: 0.5 }, { note: 'A4', dur: 0.5 }, { note: 'D5', dur: 0.75 }, { note: 'C5', dur: 0.25 },
      { note: 'B4', dur: 0.5 }, { note: 'B4', dur: 0.5 }, { note: 'C5', dur: 1.0 }
    ]
  },
  {
    id: 'choose_right',
    title: 'Choose the Right',
    lyrics: "Choose the right when a choice is placed before you.\nIn the right the Holy Spirit guides;\nAnd its light is forever shining o'er you,\nWhen in the right your heart confides.\n\nChoose the right! Choose the right!\nLet wisdom mark the way before. In the right there is safety evermore.",
    notes: [
      { note: 'C4', dur: 0.5 }, { note: 'E4', dur: 0.5 }, { note: 'G4', dur: 0.5 }, { note: 'C5', dur: 1.0 },
      { note: 'C5', dur: 0.5 }, { note: 'B4', dur: 0.5 }, { note: 'A4', dur: 0.5 }, { note: 'G4', dur: 1.5 },
      { note: 'G4', dur: 0.5 }, { note: 'A4', dur: 0.5 }, { note: 'F4', dur: 0.5 }, { note: 'D4', dur: 1.0 },
      { note: 'G4', dur: 0.5 }, { note: 'E4', dur: 0.5 }, { note: 'C4', dur: 1.5 }
    ]
  }
];

const NOTE_FREQS: Record<string, number> = {
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00
};

export const FHEFunPortal: React.FC<FHEFunPortalProps> = ({
  currentFamily,
  currentMember,
  refreshTrigger,
  onRefresh,
  initialSubTab = 'planner'
}) => {
  const [subTab, setSubTab] = useState(initialSubTab);

  // FHE Planner States
  const [fhePlans, setFhePlans] = useState<FHEPlan[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [fheDate, setFheDate] = useState('');
  const [conductorName, setConductorName] = useState('');
  const [musicLeaderName, setMusicLeaderName] = useState('');
  const [lessonName, setLessonName] = useState('');
  const [openingPrayerName, setOpeningPrayerName] = useState('');
  const [closingPrayerName, setClosingPrayerName] = useState('');
  const [treatsName, setTreatsName] = useState('');
  const [activityName, setActivityName] = useState('');

  // Audio Playback states
  const [selectedHymnId, setSelectedHymnId] = useState('child_god');
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);
  const [activeOscillators, setActiveOscillators] = useState<any[]>([]);

  // Gratitude Jar states
  const [jarNotes, setJarNotes] = useState<GratitudeJarNote[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isJarOpen, setIsJarOpen] = useState(false);

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const isParent = currentMember.role === 'parent';

  // Load plans, members & gratitude notes
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedPlans, fetchedMembers, fetchedNotes] = await Promise.all([
          dbService.getFHEPlans(currentFamily.id),
          dbService.getMembers(currentFamily.id),
          dbService.getGratitudeJarNotes(currentFamily.id)
        ]);
        setFhePlans(fetchedPlans.sort((a, b) => b.date.localeCompare(a.date)));
        setMembers(fetchedMembers);
        setJarNotes(fetchedNotes);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [currentFamily.id, refreshTrigger]);

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!fheDate) {
      setError('Please select an FHE date.');
      return;
    }

    try {
      const plan: Omit<FHEPlan, 'id' | 'createdAt'> = {
        familyId: currentFamily.id,
        date: fheDate,
        conductorName,
        musicLeaderName,
        lessonName,
        openingPrayerName,
        closingPrayerName,
        treatsName,
        activityName,
        status: 'planned'
      };

      await dbService.createFHEPlan(currentFamily.id, plan);
      setSuccess('Monday Home Evening plan scheduled successfully!');
      
      // Reset form
      setFheDate('');
      setConductorName('');
      setMusicLeaderName('');
      setLessonName('');
      setOpeningPrayerName('');
      setClosingPrayerName('');
      setTreatsName('');
      setActivityName('');
      setShowForm(false);
      
      setTimeout(() => setSuccess(''), 3000);
      onRefresh();
    } catch (err) {
      setError('Failed to schedule FHE plan.');
    }
  };

  const handleTogglePlanStatus = async (planId: string, currentStatus: 'planned' | 'completed') => {
    const nextStatus = currentStatus === 'completed' ? 'planned' : 'completed';
    await dbService.updateFHEPlanStatus(currentFamily.id, planId, nextStatus);
    onRefresh();
  };

  // Play MIDI Accompaniment using Web Audio API
  const startSynthesizer = () => {
    if (isPlaying) {
      stopSynthesizer();
      return;
    }

    // Initialize audio context on user gesture
    const ctx = audioCtx || new (window.AudioContext || (window as any).webkitAudioContext)();
    if (!audioCtx) setAudioCtx(ctx);

    setIsPlaying(true);
    const hymn = HYMN_PLAYLIST.find(h => h.id === selectedHymnId)!;
    
    let timeOffset = 0;
    const oscs: any[] = [];

    hymn.notes.forEach((n) => {
      const freq = NOTE_FREQS[n.note];
      if (freq) {
        // Oscillator 1 (Square wave melody guide)
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + timeOffset);

        // Gain node for clean envelope
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.15, ctx.currentTime + timeOffset);
        // Soft fade out at end of note
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + timeOffset + n.dur - 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + timeOffset);
        osc.stop(ctx.currentTime + timeOffset + n.dur);

        oscs.push(osc);
      }
      timeOffset += n.dur;
    });

    setActiveOscillators(oscs);

    // Automatically stop playing when melody is done
    const totalDurationMs = timeOffset * 1000;
    setTimeout(() => {
      setIsPlaying(false);
    }, totalDurationMs);
  };

  const stopSynthesizer = () => {
    activeOscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (err) {}
    });
    setActiveOscillators([]);
    setIsPlaying(false);
  };

  // Assign Library Item to FHE Planner states
  const applyLibraryItem = (lesson: typeof LESSON_LIBRARY[0]) => {
    setLessonName(lesson.title + ': ' + lesson.description);
    setActivityName(lesson.activity);
    setTreatsName(lesson.treat);
    setSubTab('planner');
    setShowForm(true);
    setSuccess(`Loaded "${lesson.title}" parameters into planner!`);
    setTimeout(() => setSuccess(''), 3000);
  };

  // Add gratitude note
  const handleAddGratitudeNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    await dbService.addGratitudeJarNote(
      currentFamily.id,
      currentMember.id,
      currentMember.name,
      newNoteText.trim(),
      isAnonymous
    );

    setNewNoteText('');
    setIsAnonymous(false);
    setSuccess('Appreciation note dropped in the Gratitude Jar! 🍯');
    setTimeout(() => setSuccess(''), 3000);
    onRefresh();

    confetti({ particleCount: 30, spread: 40 });
  };

  // Open Jar ceremony
  const handleOpenJar = () => {
    setIsJarOpen(true);
    confetti({ particleCount: 150, spread: 80 });
  };

  // Clear Jar
  const handleClearJar = async () => {
    if (confirm('Are you sure you want to empty the Gratitude Jar notes for the next week?')) {
      await dbService.clearGratitudeJar(currentFamily.id);
      setIsJarOpen(false);
      onRefresh();
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Top Banner */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800' }}>🏠 Monday Home Evening & Family Fun</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Coordinate weekly FHE planners, assign presets from our Lesson Library, sing along to hymns, and drop gratitude notes in the jar.
        </p>
      </div>

      {/* Portal subtabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem', gap: '0.75rem', flexWrap: 'wrap' }}>
        {[
          { key: 'planner', label: '📅 FHE Scheduler' },
          { key: 'library', label: '📚 Lessons & Activities' },
          { key: 'singalong', label: '🎵 Sing-Along Playlist' },
          { key: 'gratitude', label: '🍯 Gratitude Jar' }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => { setSubTab(t.key); setSuccess(''); stopSynthesizer(); }}
            style={{
              padding: '0.75rem 1rem',
              border: 'none',
              background: 'none',
              borderBottom: subTab === t.key ? '3px solid var(--primary-color)' : 'none',
              color: subTab === t.key ? 'var(--primary-color)' : 'var(--text-secondary)',
              fontWeight: subTab === t.key ? '700' : '500',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {success && (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: '600' }}>
          {success}
        </div>
      )}
      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: '600' }}>
          {error}
        </div>
      )}

      {/* Grid Layouts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>

        {/* TAB 1: FHE Planner */}
        {subTab === 'planner' && (
          <>
            <div className="glass-card" style={{ gridColumn: 'span 4', padding: '1.5rem', height: 'fit-content' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>Schedule FHE</h3>
                {isParent && !showForm && (
                  <button onClick={() => setShowForm(true)} className="btn btn-primary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}>
                    <Plus size={14} style={{ marginRight: '0.2rem' }} /> Add Plan
                  </button>
                )}
              </div>

              {showForm && (
                <form onSubmit={handleSavePlan} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div className="form-group">
                    <label className="form-label">FHE Date</label>
                    <input
                      type="date"
                      value={fheDate}
                      onChange={(e) => setFheDate(e.target.value)}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Conductor</label>
                    <select
                      value={conductorName}
                      onChange={(e) => setConductorName(e.target.value)}
                      className="input-field"
                      style={{ width: '100%' }}
                    >
                      <option value="">Select Conductor</option>
                      {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Music Leader</label>
                    <select
                      value={musicLeaderName}
                      onChange={(e) => setMusicLeaderName(e.target.value)}
                      className="input-field"
                      style={{ width: '100%' }}
                    >
                      <option value="">Select Leader</option>
                      {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Lesson Leader</label>
                    <select
                      value={openingPrayerName} // reusing prayer slot for Lesson leader to match old schema mappings safely
                      onChange={(e) => setOpeningPrayerName(e.target.value)}
                      className="input-field"
                      style={{ width: '100%' }}
                    >
                      <option value="">Select Leader</option>
                      {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Lesson Topic & Scripture</label>
                    <input
                      type="text"
                      placeholder="E.g., Faith in Alma 32"
                      value={lessonName}
                      onChange={(e) => setLessonName(e.target.value)}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Activity Game</label>
                    <input
                      type="text"
                      placeholder="E.g., Scripture Charades"
                      value={activityName}
                      onChange={(e) => setActivityName(e.target.value)}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Treat / Refreshment</label>
                    <input
                      type="text"
                      placeholder="E.g., Oreo dirts or chocolate chip cookies"
                      value={treatsName}
                      onChange={(e) => setTreatsName(e.target.value)}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                      Schedule Plan
                    </button>
                    <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {!showForm && (
                <div style={{ padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    💡 Tip: Go to the **Lessons & Activities** tab to select preset lessons and treats recipe ideas.
                  </p>
                </div>
              )}
            </div>

            <div className="glass-card" style={{ gridColumn: 'span 8', padding: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>📅 Scheduled Monday Home Evening Plans</h3>
              {fhePlans.length === 0 ? (
                <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No FHE plans scheduled yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {fhePlans.map(plan => (
                    <div 
                      key={plan.id} 
                      className="glass-panel" 
                      style={{ 
                        padding: '1.5rem', 
                        borderLeft: plan.status === 'completed' ? '4px solid var(--success-color)' : '4px solid var(--primary-color)' 
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div>
                          <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Monday Night, {plan.date}</strong>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '8px', 
                            marginLeft: '0.75rem', 
                            backgroundColor: plan.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(37, 99, 235, 0.1)',
                            color: plan.status === 'completed' ? 'var(--success-color)' : 'var(--primary-color)',
                            textTransform: 'uppercase',
                            fontWeight: 'bold'
                          }}>
                            {plan.status}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleTogglePlanStatus(plan.id, plan.status)}
                            className={`btn ${plan.status === 'completed' ? 'btn-secondary' : 'btn-primary'}`}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            {plan.status === 'completed' ? 'Mark Planned' : 'Mark Completed'}
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                        <div><strong>Conductor:</strong> {plan.conductorName || 'Family'}</div>
                        <div><strong>Music:</strong> {plan.musicLeaderName || 'Family'}</div>
                        <div><strong>Lesson Leader:</strong> {plan.openingPrayerName || 'Family'}</div>
                      </div>

                      <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                        <div style={{ marginBottom: '0.35rem' }}>📖 <strong>Lesson:</strong> {plan.lessonName || 'Custom Lesson'}</div>
                        <div style={{ marginBottom: '0.35rem' }}>🎨 <strong>Activity:</strong> {plan.activityName || 'Family Board Games'}</div>
                        <div>🍪 <strong>Treats:</strong> {plan.treatsName || 'Apples and caramel'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 2: Lessons & Activities Library */}
        {subTab === 'library' && (
          <>
            <div className="glass-card" style={{ gridColumn: 'span 8', padding: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.25rem' }}>📚 Preset FHE Lessons & Ideas</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                {LESSON_LIBRARY.map(lesson => (
                  <div key={lesson.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--accent-gold)', textTransform: 'uppercase' }}>CFM Presets</span>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '0.2rem 0 0.5rem 0' }}>{lesson.title}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{lesson.description}</p>
                      
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                        <strong>Activity:</strong> {lesson.activity}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                        <strong>Treat Suggestion:</strong> {lesson.treat}
                      </div>
                    </div>

                    <button onClick={() => applyLibraryItem(lesson)} className="btn btn-primary" style={{ width: '100%', fontSize: '0.75rem', padding: '0.4rem' }}>
                      Assign to Next FHE Plan
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card" style={{ gridColumn: 'span 4', padding: '1.5rem', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.25rem' }}>🎮 Fun Family Games</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {GAME_LIBRARY.map(game => (
                  <div key={game.id} className="glass-panel" style={{ padding: '1rem' }}>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--primary-color)' }}>{game.title}</strong>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: '1.4' }}>
                      {game.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* TAB 3: Sing-Along Playlist */}
        {subTab === 'singalong' && (
          <>
            <div className="glass-card" style={{ gridColumn: 'span 4', padding: '1.5rem', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.25rem' }}>Primary Sing-Along</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {HYMN_PLAYLIST.map(hymn => (
                  <button
                    key={hymn.id}
                    onClick={() => { setSelectedHymnId(hymn.id); stopSynthesizer(); }}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: selectedHymnId === hymn.id ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                      background: selectedHymnId === hymn.id ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent',
                      color: selectedHymnId === hymn.id ? 'var(--primary-color)' : 'var(--text-primary)',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>{hymn.title}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Accompaniment available</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-card" style={{ gridColumn: 'span 8', padding: '2rem' }}>
              {(() => {
                const hymn = HYMN_PLAYLIST.find(h => h.id === selectedHymnId)!;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.25rem' }}>{hymn.title}</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>LDS Sing-Along Accompaniment</span>

                    {/* Audio Controls */}
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
                      <button 
                        onClick={startSynthesizer} 
                        className={`btn ${isPlaying ? 'btn-danger' : 'btn-primary'}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem' }}
                      >
                        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                        <span>{isPlaying ? 'Mute/Stop Melody' : 'Play Accompaniment'}</span>
                      </button>
                    </div>

                    {/* Scrolling Lyrics Box */}
                    <div className="glass-panel" style={{ width: '100%', padding: '2rem', borderRadius: '12px', fontSize: '1.1rem', lineHeight: '1.8', textAlign: 'center', fontFamily: 'Georgia, serif', whiteSpace: 'pre-wrap', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                      {hymn.lyrics}
                    </div>
                  </div>
                );
              })()}
            </div>
          </>
        )}

        {/* TAB 4: Gratitude Jar */}
        {subTab === 'gratitude' && (
          <>
            {/* Visual SVG Jar */}
            <div className="glass-card" style={{ gridColumn: 'span 8', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', alignSelf: 'flex-start', marginBottom: '0.5rem' }}>🍯 The Virtual Family Gratitude Jar</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', alignSelf: 'flex-start', marginBottom: '1.5rem' }}>
                Drop notes of gratitude throughout the week. Open the jar during FHE or Sunday Council to read them together.
              </p>

              {!isJarOpen ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                  {/* Jar Representation */}
                  <div style={{ width: '200px', height: '240px', position: 'relative' }}>
                    <svg width="200" height="240" viewBox="0 0 100 120">
                      {/* Jar Outline */}
                      <path d="M30,20 L70,20 L70,30 L85,45 L85,105 C85,115 75,118 50,118 C25,118 15,115 15,105 L15,45 L30,30 Z" fill="rgba(255,255,255,0.02)" stroke="var(--primary-color)" strokeWidth="2.5" />
                      {/* Lid */}
                      <rect x="26" y="10" width="48" height="10" rx="3" fill="var(--accent-gold)" />
                      {/* Ribbon */}
                      <path d="M30,30 L70,30" stroke="var(--danger-color)" strokeWidth="2" />
                      
                      {/* Random dots inside the jar indicating notes */}
                      {jarNotes.map((_, idx) => {
                        const x = 30 + (idx * 17) % 40;
                        const y = 50 + (idx * 13) % 55;
                        return (
                          <circle key={idx} cx={x} cy={y} r="3.5" fill="var(--accent-gold)" opacity="0.8" style={{ filter: 'drop-shadow(0 0 2px var(--accent-gold))' }} />
                        );
                      })}
                    </svg>

                    <div style={{ position: 'absolute', top: '55%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-gold)' }}>{jarNotes.length}</span>
                      <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Notes</div>
                    </div>
                  </div>

                  {jarNotes.length > 0 ? (
                    <button onClick={handleOpenJar} className="btn btn-primary" style={{ padding: '0.5rem 1.5rem' }}>
                      🔓 Open Gratitude Jar
                    </button>
                  ) : (
                    <p style={{ fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>The jar is empty. Write the first note!</p>
                  )}
                </div>
              ) : (
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <strong style={{ fontSize: '1.1rem' }}>Appreciation & Gratitude Notes:</strong>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={handleClearJar} className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                        Empty Jar for Next Week
                      </button>
                      <button onClick={() => setIsJarOpen(false)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                        Back to Jar
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {jarNotes.map(note => (
                      <div key={note.id} className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-gold)' }}>
                        <p style={{ fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                          "{note.noteText}"
                        </p>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'right' }}>
                          — {note.isAnonymous ? 'Anonymous' : note.memberName}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Drop note form */}
            <div className="glass-card" style={{ gridColumn: 'span 4', padding: '1.5rem', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.25rem' }}>Write Appreciation</h3>
              <form onSubmit={handleAddGratitudeNote} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Your Note of Appreciation</label>
                  <textarea
                    placeholder="Write a gratitude note or thank a family member..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', minHeight: '120px', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="isAnon"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                  />
                  <label htmlFor="isAnon" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    Post anonymously
                  </label>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  Drop Note in Jar 🍯
                </button>
              </form>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
