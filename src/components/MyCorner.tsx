import React, { useEffect, useState } from 'react';
import { dbService } from '../db';
import type { Family, Member, PersonalJournalEntry, Goal, TempleVisit, ReadingProgress, PrayerRequest } from '../types';
import { cfmLessons } from '../mockData';
import { Trash2, CheckCircle2, Smile } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MyCornerProps {
  currentFamily: Family;
  currentMember: Member;
  refreshTrigger: number;
  onRefresh: () => void;
}

const MATCH_QUESTIONS = [
  { number: 1, options: ["Godhead / Trinity", "Atonement", "Adam's Transgression", "First Principles & Ordinances"], correctAnswer: "Godhead / Trinity" },
  { number: 2, options: ["Atonement", "Adam's Transgression", "First Principles & Ordinances", "Call of God by Prophecy"], correctAnswer: "Adam's Transgression" },
  { number: 3, options: ["Atonement", "Bible & Book of Mormon", "First Principles & Ordinances", "Godhead / Trinity"], correctAnswer: "Atonement" },
  { number: 4, options: ["Gathering of Israel", "First Principles & Ordinances", "Call of God by Prophecy", "Zion's building"], correctAnswer: "First Principles & Ordinances" },
  { number: 5, options: ["Call of God by Prophecy", "Bible & Book of Mormon", "Gathering of Israel", "Zion's building"], correctAnswer: "Call of God by Prophecy" }
];

const COVENANTS_CHECKLIST = [
  { id: 'cov-bap', title: 'Baptismal Covenant', desc: 'Willingness to take upon us the name of Jesus Christ, keep His commandments, and stand as a witness of Him at all times.' },
  { id: 'cov-sac', title: 'Sacrament Renewal', desc: 'Weekly promise to always remember Him, keep His commandments, and seek to have His Spirit to be with us.' },
  { id: 'cov-priesthood', title: 'Priesthood Oath & Covenant (Brethren)', desc: 'Magnifying callings, receiving the Lord and His servants, and living by every word of God.' },
  { id: 'cov-temple', title: 'Temple Covenants', desc: 'Law of Obedience, Sacrifice, Gospel, Chastity, and Consecration.' }
];

const PRESETS_MEMORIZE = [
  { ref: 'Alma 37:37', text: 'Counsel with the Lord in all thy doings, and he will direct thee for good; yea, when thou liest down at night lie down unto the Lord, that he may watch over you in your sleep; and when thou risest in the morning let thy heart be full of thanks unto God; and if ye do these things, ye shall be lifted up at the last day.' },
  { ref: 'Mosiah 2:17', text: 'And behold, I tell you these things that ye may learn wisdom; that ye may learn that when ye are in the service of your fellow beings ye are only in the service of your God.' },
  { ref: 'Articles of Faith #1', text: 'We believe in God, the Eternal Father, and in His Son, Jesus Christ, and in the Holy Ghost.' },
  { ref: 'Articles of Faith #13', text: 'We believe in being honest, true, chaste, benevolent, virtuous, and in doing good to all men; indeed, we may say that we follow the admonition of Paul—We believe all things, we hope all things, we have endured many things, and hope to be able to endure all things. If there is anything virtuous, lovely, or of good report or praiseworthy, we seek after these things.' }
];

export const MyCorner: React.FC<MyCornerProps> = ({
  currentFamily,
  currentMember,
  refreshTrigger,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'study' | 'creed' | 'temple' | 'reading' | 'memory' | 'prayers' | 'matcher'>('study');
  const [loading, setLoading] = useState(true);

  // States
  const [selectedLessonId, setSelectedLessonId] = useState(cfmLessons[0].id);
  const [activeNoteText, setActiveNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [journalEntries, setJournalEntries] = useState<PersonalJournalEntry[]>([]);
  const [newJournalText, setNewJournalText] = useState('');

  const [personalCreed, setPersonalCreed] = useState('');
  const [personalVision, setPersonalVision] = useState('');
  const [savingCreed, setSavingCreed] = useState(false);
  const [personalGoals, setPersonalGoals] = useState<Goal[]>([]);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDate, setNewGoalDate] = useState('');

  const [templeVisits, setTempleVisits] = useState<TempleVisit[]>([]);
  const [newTempleName, setNewTempleName] = useState('');
  const [newTempleDate, setNewTempleDate] = useState('');
  const [newTempleOrdinance, setNewTempleOrdinance] = useState<'Baptism' | 'Initiatory' | 'Endowment' | 'Sealing'>('Baptism');
  const [checkedCovenants, setCheckedCovenants] = useState<string[]>([]);

  const [selectedBook, setSelectedBook] = useState<'Book of Mormon' | 'New Testament' | 'D&C'>('Book of Mormon');
  const [readingProgress, setReadingProgress] = useState<ReadingProgress | null>(null);

  const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);
  const [customMemoryText, setCustomMemoryText] = useState('');
  const [memoryHidePercent, setMemoryHidePercent] = useState(0); // 0 to 4 (0%, 25%, 50%, 75%, 100%)

  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([]);
  const [newPrayerText, setNewPrayerText] = useState('');
  const [activePrayerAnswerInput, setActivePrayerAnswerInput] = useState<Record<string, string>>({});

  const [matcherSelections, setMatcherSelections] = useState<Record<number, string>>({});
  const [matcherScore, setMatcherScore] = useState<number | null>(null);
  const [gameClaimed, setGameClaimed] = useState(false);

  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadCornerData = async () => {
      setLoading(true);
      try {
        const [
          fetchedNotes,
          fetchedJournal,
          fetchedMission,
          fetchedGoals,
          fetchedTempleVisits,
          fetchedReading,
          fetchedPrayers
        ] = await Promise.all([
          dbService.getPersonalStudyNotes(currentMember.id),
          dbService.getPersonalJournal(currentMember.id),
          dbService.getPersonalMission(currentMember.id),
          dbService.getGoals(currentFamily.id),
          dbService.getTempleVisits(currentMember.id),
          dbService.getReadingProgress(currentMember.id, selectedBook),
          dbService.getPrayerRequests(currentMember.id)
        ]);

        // Study note
        const activeNote = fetchedNotes.find(n => n.lessonId === selectedLessonId);
        setActiveNoteText(activeNote ? activeNote.noteText : '');

        // Journal
        setJournalEntries(fetchedJournal.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));

        // Creed
        if (fetchedMission) {
          setPersonalCreed(fetchedMission.creed);
          setPersonalVision(fetchedMission.vision);
        } else {
          setPersonalCreed('');
          setPersonalVision('');
        }

        // Goals
        setPersonalGoals(fetchedGoals.filter(g => g.isPersonal && g.memberId === currentMember.id));

        // Temple
        setTempleVisits(fetchedTempleVisits.sort((a, b) => b.date.localeCompare(a.date)));

        // Covenants checkbox local cache mock
        const savedCovenants = localStorage.getItem(`fc_covenants_${currentMember.id}`);
        if (savedCovenants) {
          setCheckedCovenants(JSON.parse(savedCovenants));
        }

        // Reading
        setReadingProgress(fetchedReading);

        // Prayers
        setPrayerRequests(fetchedPrayers.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadCornerData();
  }, [currentFamily.id, currentMember.id, selectedLessonId, selectedBook, refreshTrigger]);

  const handleSaveStudyNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNote(true);
    try {
      await dbService.savePersonalStudyNote(currentMember.id, selectedLessonId, activeNoteText);
      setSuccess('Personal scripture notes saved.');
      setTimeout(() => setSuccess(''), 3000);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNote(false);
    }
  };

  const handleAddJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJournalText.trim()) return;
    try {
      await dbService.createPersonalJournalEntry(currentMember.id, newJournalText.trim());
      setNewJournalText('');
      setSuccess('Diary log entry saved.');
      setTimeout(() => setSuccess(''), 3000);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteJournal = async (id: string) => {
    try {
      await dbService.deletePersonalJournalEntry(currentMember.id, id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveMission = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCreed(true);
    try {
      await dbService.savePersonalMission(currentMember.id, personalCreed, personalVision);
      setSuccess('Personal creed & vision updated.');
      setTimeout(() => setSuccess(''), 3000);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingCreed(false);
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;
    try {
      await dbService.createGoal(
        currentFamily.id,
        'spiritual',
        newGoalTitle.trim(),
        newGoalDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        'in_progress',
        true,
        currentMember.id,
        currentMember.name
      );
      setNewGoalTitle('');
      setNewGoalDate('');
      setSuccess('Private goal added.');
      setTimeout(() => setSuccess(''), 3000);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleGoal = async (goalId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'in_progress' : 'completed';
    await dbService.updateGoal(currentFamily.id, goalId, { status: nextStatus });
    onRefresh();
  };

  const handleDeleteGoal = async (id: string) => {
    await dbService.deleteGoal(currentFamily.id, id);
    onRefresh();
  };

  const handleAddTemple = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTempleName.trim() || !newTempleDate) return;
    try {
      await dbService.addTempleVisit(currentMember.id, newTempleDate, newTempleName.trim(), newTempleOrdinance);
      setNewTempleName('');
      setNewTempleDate('');
      setSuccess('Temple attendance logged.');
      setTimeout(() => setSuccess(''), 3000);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTemple = async (id: string) => {
    await dbService.deleteTempleVisit(currentMember.id, id);
    onRefresh();
  };

  const handleToggleCovenant = (covId: string) => {
    let next: string[] = [];
    if (checkedCovenants.includes(covId)) {
      next = checkedCovenants.filter(c => c !== covId);
    } else {
      next = [...checkedCovenants, covId];
    }
    setCheckedCovenants(next);
    localStorage.setItem(`fc_covenants_${currentMember.id}`, JSON.stringify(next));
  };

  const handleToggleChapter = async (chapNum: number) => {
    await dbService.toggleChapterProgress(currentMember.id, selectedBook, chapNum);
    onRefresh();
  };

  const handleAddPrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrayerText.trim()) return;
    try {
      await dbService.addPrayerRequest(currentMember.id, newPrayerText.trim());
      setNewPrayerText('');
      setSuccess('Prayer request logged.');
      setTimeout(() => setSuccess(''), 3000);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnswerPrayer = async (prayerId: string) => {
    const answer = activePrayerAnswerInput[prayerId];
    if (!answer?.trim()) return;
    try {
      await dbService.markPrayerAnswered(currentMember.id, prayerId, answer.trim());
      setSuccess('Praise God! Prayer logged as answered.');
      setTimeout(() => setSuccess(''), 3000);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePrayer = async (id: string) => {
    await dbService.deletePrayerRequest(currentMember.id, id);
    onRefresh();
  };

  const handleCheckAnswers = () => {
    let score = 0;
    MATCH_QUESTIONS.forEach(q => {
      if (matcherSelections[q.number] === q.correctAnswer) score += 20;
    });
    setMatcherScore(score);
    if (score === 100) {
      confetti({ particleCount: 100, spread: 75, origin: { y: 0.6 } });
    }
  };

  const handleClaimPoints = async () => {
    if (gameClaimed || !matcherScore) return;
    await dbService.updateMemberPoints(currentFamily.id, currentMember.id, matcherScore);
    setGameClaimed(true);
    setSuccess(`✓ Claimed ${matcherScore} points successfully!`);
    onRefresh();
  };

  // Memory verse processor
  const getProcessedMemoryText = () => {
    const baseText = selectedPresetIdx === -1 ? customMemoryText : PRESETS_MEMORIZE[selectedPresetIdx].text;
    if (!baseText) return 'Write or choose a verse to memorize.';
    if (memoryHidePercent === 0) return baseText;

    const words = baseText.split(' ');
    const countToHide = Math.floor(words.length * (memoryHidePercent * 0.25));

    // Seeded selection to hide words based on length
    const indicesToHide = new Set<number>();
    let attempts = 0;
    while (indicesToHide.size < countToHide && attempts < 1000) {
      const idx = Math.floor(Math.random() * words.length);
      indicesToHide.add(idx);
      attempts++;
    }

    return words.map((w, idx) => {
      if (indicesToHide.has(idx)) {
        // preserve punctuation
        const cleanWord = w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
        const underlines = '_'.repeat(Math.max(3, cleanWord.length));
        const trailing = w.slice(cleanWord.length);
        return underlines + trailing;
      }
      return w;
    }).join(' ');
  };

  const totalChapters = selectedBook === 'Book of Mormon' ? 239 : selectedBook === 'New Testament' ? 260 : 138;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
        <p>Loading My Corner...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Top Banner */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800' }}>👤 My Corner</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Your individual spiritual sanctuary. Study scriptures, draft your personal mission creed, track reading goals, memorize verses, and keep a registry of answered prayers.
        </p>
      </div>

      {/* Tabs list */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem', gap: '0.75rem', flexWrap: 'wrap' }}>
        {[
          { key: 'study', label: '📖 Study & Journal' },
          { key: 'creed', label: '🎯 Creed & Goals' },
          { key: 'temple', label: '🕊️ Covenant & Temple' },
          { key: 'reading', label: '📅 Reading Tracker' },
          { key: 'memory', label: '🧠 Memory Master' },
          { key: 'prayers', label: '🙏 Answered Prayers' },
          { key: 'matcher', label: '🧩 AoF Matcher' }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key as any); setSuccess(''); }}
            style={{
              padding: '0.75rem 1rem',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === t.key ? '3px solid var(--primary-color)' : 'none',
              color: activeTab === t.key ? 'var(--primary-color)' : 'var(--text-secondary)',
              fontWeight: activeTab === t.key ? '700' : '500',
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
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

      {/* GRID LAYOUTS FOR SUBTABS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>

        {/* TAB 1: Study & Journal */}
        {activeTab === 'study' && (
          <>
            <div className="glass-card" style={{ gridColumn: 'span 4', padding: '1.5rem', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem' }}>Scripture Blocks</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto', marginBottom: '1.5rem' }}>
                {cfmLessons.map(lesson => (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLessonId(lesson.id)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: selectedLessonId === lesson.id ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                      background: selectedLessonId === lesson.id ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent',
                      color: selectedLessonId === lesson.id ? 'var(--primary-color)' : 'var(--text-primary)',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {lesson.scriptureBlock}
                  </button>
                ))}
              </div>

              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>Write Diary Log</h3>
              <form onSubmit={handleAddJournal}>
                <textarea
                  placeholder="Record private testimonies or spiritual thoughts..."
                  value={newJournalText}
                  onChange={(e) => setNewJournalText(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', minHeight: '120px', fontSize: '0.8rem', marginBottom: '0.75rem' }}
                />
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  Log Diary Entry
                </button>
              </form>
            </div>

            <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* CFM Note Area */}
              <div className="glass-card" style={{ padding: '2rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--accent-gold)', textTransform: 'uppercase' }}>
                  📖 Personal CFM Notes
                </span>
                <h3 style={{ fontSize: '1.25rem', margin: '0.2rem 0 1rem 0' }}>
                  {cfmLessons.find(l => l.id === selectedLessonId)?.scriptureBlock}
                </h3>
                <form onSubmit={handleSaveStudyNote}>
                  <textarea
                    placeholder="Write down personal notes or impressions concerning Alma chapters studied this week..."
                    value={activeNoteText}
                    onChange={(e) => setActiveNoteText(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', minHeight: '180px', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '1rem' }}
                  />
                  <button type="submit" disabled={savingNote} className="btn btn-primary" style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                    <CheckCircle2 size={16} /> {savingNote ? 'Saving...' : 'Save Notes'}
                  </button>
                </form>
              </div>

              {/* Diary Entries List */}
              <div className="glass-card" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1.25rem' }}>📓 Spiritual Diary Archive</h3>
                {journalEntries.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.85rem' }}>No diary logs written yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
                    {journalEntries.map(e => (
                      <div key={e.id} className="glass-panel" style={{ padding: '1rem', position: 'relative' }}>
                        <button 
                          onClick={() => handleDeleteJournal(e.id)} 
                          style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} />
                        </button>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          {new Date(e.createdAt).toLocaleDateString()}
                        </span>
                        <p style={{ fontSize: '0.85rem', marginTop: '0.4rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{e.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* TAB 2: Creed & Goals */}
        {activeTab === 'creed' && (
          <>
            <div className="glass-card" style={{ gridColumn: 'span 7', padding: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.25rem' }}>🛡️ Personal Creed & Life Vision</h3>
              <form onSubmit={handleSaveMission}>
                <div className="form-group">
                  <label className="form-label">My Personal Creed / Mission Statement</label>
                  <textarea
                    placeholder="E.g., I will be honest, true, chaste, and do good to all. I stand as a witness of God..."
                    value={personalCreed}
                    onChange={(e) => setPersonalCreed(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', minHeight: '120px', fontSize: '0.85rem' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">My Life Vision & Missions (Spiritual/Educational)</label>
                  <textarea
                    placeholder="E.g., Serve an honorable mission, obtain a degree, establish a temple-centered family..."
                    value={personalVision}
                    onChange={(e) => setPersonalVision(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', minHeight: '120px', fontSize: '0.85rem' }}
                  />
                </div>

                <button type="submit" disabled={savingCreed} className="btn btn-primary" style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                  <CheckCircle2 size={16} /> {savingCreed ? 'Saving...' : 'Update Creed & Vision'}
                </button>
              </form>
            </div>

            <div className="glass-card" style={{ gridColumn: 'span 5', padding: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1.25rem' }}>🎯 My Private Goals</h3>
              
              <form onSubmit={handleAddGoal} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <input
                  type="text"
                  placeholder="Set private goal..."
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="date"
                    value={newGoalDate}
                    onChange={(e) => setNewGoalDate(e.target.value)}
                    className="input-field"
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn btn-primary">Add</button>
                </div>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {personalGoals.map(g => (
                  <div key={g.id} className="glass-panel" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={g.status === 'completed'}
                        onChange={() => handleToggleGoal(g.id, g.status)}
                      />
                      <span style={{ textDecoration: g.status === 'completed' ? 'line-through' : 'none', fontSize: '0.85rem', fontWeight: '600' }}>
                        {g.title}
                      </span>
                    </div>
                    <button onClick={() => handleDeleteGoal(g.id)} style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* TAB 3: Covenant & Temple */}
        {activeTab === 'temple' && (
          <>
            <div className="glass-card" style={{ gridColumn: 'span 4', padding: '1.5rem', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.25rem' }}>Log Temple Attendance</h3>
              <form onSubmit={handleAddTemple} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Ordinance Type</label>
                  <select
                    value={newTempleOrdinance}
                    onChange={(e) => setNewTempleOrdinance(e.target.value as any)}
                    className="input-field"
                    style={{ width: '100%' }}
                  >
                    <option value="Baptism">Baptism & Confirmation</option>
                    <option value="Initiatory">Initiatory</option>
                    <option value="Endowment">Endowment</option>
                    <option value="Sealing">Sealing</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Temple Name</label>
                  <input
                    type="text"
                    placeholder="Salt Lake Temple"
                    value={newTempleName}
                    onChange={(e) => setNewTempleName(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Visit Date</label>
                  <input
                    type="date"
                    value={newTempleDate}
                    onChange={(e) => setNewTempleDate(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  Log Temple Trip
                </button>
              </form>
            </div>

            <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Covenants Checklists */}
              <div className="glass-card" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.25rem' }}>🕊️ Covenants Kept Tracker</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {COVENANTS_CHECKLIST.map(cov => (
                    <div 
                      key={cov.id} 
                      onClick={() => handleToggleCovenant(cov.id)}
                      className={`glass-panel ${checkedCovenants.includes(cov.id) ? 'active' : ''}`}
                      style={{ 
                        padding: '1rem', 
                        borderRadius: '10px', 
                        cursor: 'pointer',
                        borderLeft: checkedCovenants.includes(cov.id) ? '4px solid var(--primary-color)' : '4px solid transparent'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <input
                          type="checkbox"
                          checked={checkedCovenants.includes(cov.id)}
                          readOnly
                        />
                        <div>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{cov.title}</strong>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{cov.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Temple Attendance Logs */}
              <div className="glass-card" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.25rem' }}>📅 Temple Attendance Log</h3>
                {templeVisits.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.85rem' }}>No temple visits logged yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto' }}>
                    {templeVisits.map(visit => (
                      <div key={visit.id} className="glass-panel" style={{ padding: '0.8rem 1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--primary-color)' }}>
                            {visit.ordinanceType}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '1rem' }}>
                            at {visit.templeName}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{visit.date}</span>
                          <button onClick={() => handleDeleteTemple(visit.id)} style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* TAB 4: Scripture Reading Tracker */}
        {activeTab === 'reading' && (
          <div className="glass-card" style={{ gridColumn: 'span 12', padding: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '800' }}>📅 Daily Scripture reading Tracker</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Check off chapters as you read to track your daily progress.</p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {['Book of Mormon', 'New Testament', 'D&C'].map(b => (
                  <button
                    key={b}
                    onClick={() => setSelectedBook(b as any)}
                    className={`btn ${selectedBook === b ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Progress indicator */}
            {readingProgress && (
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  <span>Progress in {selectedBook}</span>
                  <span>
                    {readingProgress.completedChapters.length} / {totalChapters} Chapters ({Math.round((readingProgress.completedChapters.length / totalChapters) * 100)}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${(readingProgress.completedChapters.length / totalChapters) * 100}%`, 
                      height: '100%', 
                      backgroundColor: 'var(--primary-color)',
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Visual Chapters Grid */}
            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(45px, 1fr))', 
                gap: '0.4rem',
                maxHeight: '400px',
                overflowY: 'auto',
                paddingRight: '0.5rem'
              }}
            >
              {Array.from({ length: totalChapters }).map((_, idx) => {
                const chapNum = idx + 1;
                const isCompleted = readingProgress?.completedChapters.includes(chapNum) || false;
                return (
                  <button
                    key={chapNum}
                    onClick={() => handleToggleChapter(chapNum)}
                    style={{
                      height: '40px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: isCompleted ? 'var(--primary-color)' : 'transparent',
                      color: isCompleted ? '#ffffff' : 'var(--text-primary)',
                      fontWeight: '700',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {chapNum}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: Memory Master */}
        {activeTab === 'memory' && (
          <div className="glass-card" style={{ gridColumn: 'span 12', padding: '2.5rem' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.5rem' }}>🧠 Scripture Memory Trainer</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '2rem' }}>
              Select a scripture or paste a custom verse, then use the slider to hide words and test your memory!
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '700' }}>Choose Verse</h4>
                {PRESETS_MEMORIZE.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedPresetIdx(idx)}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: selectedPresetIdx === idx ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                      background: selectedPresetIdx === idx ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent',
                      color: selectedPresetIdx === idx ? 'var(--primary-color)' : 'var(--text-primary)',
                      textAlign: 'left',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {preset.ref}
                  </button>
                ))}
                
                <button
                  onClick={() => setSelectedPresetIdx(-1)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: selectedPresetIdx === -1 ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                    background: selectedPresetIdx === -1 ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent',
                    color: selectedPresetIdx === -1 ? 'var(--primary-color)' : 'var(--text-primary)',
                    textAlign: 'left',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  ＋ Custom Verse
                </button>

                {selectedPresetIdx === -1 && (
                  <textarea
                    placeholder="Paste or write your scripture verse here..."
                    value={customMemoryText}
                    onChange={(e) => setCustomMemoryText(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', minHeight: '100px', fontSize: '0.8rem' }}
                  />
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Word fading slider */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>Fading Slider (Hide Words)</span>
                    <span style={{ color: 'var(--primary-color)' }}>
                      {memoryHidePercent === 0 ? '0% (Visible)' : memoryHidePercent === 1 ? '25% Hidden' : memoryHidePercent === 2 ? '50% Hidden' : memoryHidePercent === 3 ? '75% Hidden' : '100% Hidden'}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="4"
                    value={memoryHidePercent}
                    onChange={(e) => setMemoryHidePercent(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--primary-color)', cursor: 'pointer', marginTop: '0.5rem' }}
                  />
                </div>

                {/* Main text box */}
                <div 
                  className="glass-panel" 
                  style={{ 
                    padding: '2rem', 
                    borderRadius: '12px', 
                    minHeight: '180px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(var(--bg-primary-rgb), 0.3)'
                  }}
                >
                  <p 
                    style={{ 
                      fontSize: '1.15rem', 
                      lineHeight: '1.8', 
                      textAlign: 'center', 
                      color: 'var(--text-primary)',
                      fontStyle: 'italic',
                      fontFamily: 'Georgia, serif',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {getProcessedMemoryText()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: Answered Prayers Registry */}
        {activeTab === 'prayers' && (
          <>
            <div className="glass-card" style={{ gridColumn: 'span 4', padding: '1.5rem', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.25rem' }}>Add Prayer Request</h3>
              <form onSubmit={handleAddPrayer}>
                <textarea
                  placeholder="E.g., Pray for Emily to pass her school exams this Friday..."
                  value={newPrayerText}
                  onChange={(e) => setNewPrayerText(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', minHeight: '120px', fontSize: '0.85rem', marginBottom: '0.75rem' }}
                />
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  Log Prayer Request
                </button>
              </form>
            </div>

            <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Active prayers */}
              <div className="glass-card" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.25rem' }}>🙏 Active Prayer Board</h3>
                
                {prayerRequests.filter(p => !p.isAnswered).length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.85rem' }}>No active prayer requests.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {prayerRequests.filter(p => !p.isAnswered).map(prayer => (
                      <div key={prayer.id} className="glass-panel" style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                          <span>Logged: {new Date(prayer.createdAt).toLocaleDateString()}</span>
                          <button onClick={() => handleDeletePrayer(prayer.id)} style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <p style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '1rem' }}>"{prayer.requestText}"</p>
                        
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            type="text"
                            placeholder="Write how this prayer was answered..."
                            value={activePrayerAnswerInput[prayer.id] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setActivePrayerAnswerInput(prev => ({ ...prev, [prayer.id]: val }));
                            }}
                            className="input-field"
                            style={{ flex: 1, height: '36px', fontSize: '0.8rem' }}
                          />
                          <button 
                            onClick={() => handleAnswerPrayer(prayer.id)}
                            className="btn btn-primary"
                            style={{ padding: '0 1rem', height: '36px', fontSize: '0.8rem' }}
                          >
                            Mark Answered
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Answered prayers history */}
              <div className="glass-card" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.25rem', color: 'var(--success-color)' }}>
                  🌻 Answered prayers & Gratitude Log
                </h3>

                {prayerRequests.filter(p => p.isAnswered).length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.85rem' }}>No answered prayers archived yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '250px', overflowY: 'auto' }}>
                    {prayerRequests.filter(p => p.isAnswered).map(prayer => (
                      <div key={prayer.id} className="glass-panel" style={{ padding: '1rem', borderLeft: '4px solid var(--success-color)' }}>
                        <p style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Request: "{prayer.requestText}"</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', backgroundColor: 'rgba(16, 185, 129, 0.05)', padding: '0.5rem', borderRadius: '6px' }}>
                          <Smile size={14} style={{ color: 'var(--success-color)' }} />
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                            <strong>Answer:</strong> {prayer.answerText}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* TAB 7: AoF Matcher */}
        {activeTab === 'matcher' && (
          <div className="glass-card" style={{ gridColumn: 'span 12', padding: '2.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.5rem' }}>🧩 Articles of Faith Matcher</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
              Select the correct summary keyword match for each Article of Faith to earn <strong>Chore points</strong>!
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
              {MATCH_QUESTIONS.map(q => (
                <div key={q.number} className="glass-panel" style={{ padding: '1rem 1.5rem', borderRadius: '12px', display: 'grid', gridTemplateColumns: '1fr 2fr', alignItems: 'center', gap: '2rem' }}>
                  <strong style={{ fontSize: '0.95rem' }}>Article of Faith #{q.number}</strong>
                  <select
                    value={matcherSelections[q.number] || ''}
                    disabled={matcherScore !== null}
                    onChange={(e) => setMatcherSelections(prev => ({ ...prev, [q.number]: e.target.value }))}
                    className="input-field"
                    style={{ width: '100%', height: '40px' }}
                  >
                    <option value="">Select match...</option>
                    {q.options.map((opt, oIdx) => <option key={oIdx} value={opt}>{opt}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {matcherScore === null ? (
              <button onClick={handleCheckAnswers} className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
                Check My Answers
              </button>
            ) : (
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                  Your Score: <strong>{matcherScore} / 100</strong>
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  {matcherScore === 100 ? '🎉 Perfect! You matched all Articles of Faith correctly!' : 'Try again to get a perfect score.'}
                </p>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button 
                    onClick={() => { setMatcherScore(null); setMatcherSelections({}); setGameClaimed(false); }} 
                    className="btn btn-secondary"
                  >
                    Reset Game
                  </button>
                  
                  {matcherScore > 0 && currentMember.role === 'child' && (
                    <button 
                      onClick={handleClaimPoints} 
                      disabled={gameClaimed}
                      className="btn btn-primary"
                    >
                      {gameClaimed ? 'Points Claimed!' : 'Claim Points for Chore Store'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
