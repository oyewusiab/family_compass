import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../db';
import type { Family, Member, GospelSketch, CovenantMilestoneProgress } from '../types';
import { cfmLessons } from '../mockData';
import { 
  Eraser, Trash2, Check, HelpCircle, ArrowRight, 
  BookOpen, ShieldAlert, Award, Smile, ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface GospelLearningProps {
  currentFamily: Family;
  currentMember: Member;
  refreshTrigger: number;
  onRefresh: () => void;
  initialSubTab?: string;
}

const DISCUSSION_PROMPTS: Record<string, { primary: string[]; youth: string[]; adult: string[] }> = {
  'cfm-2026-w27': {
    primary: [
      "What does it mean to plant a good seed in our hearts?",
      "How can we show Heavenly Father we want our faith to grow?"
    ],
    youth: [
      "How is experimenting on the word like testing a scientific theory?",
      "How can you recognize when a spiritual seed is beginning to swell and grow inside you?"
    ],
    adult: [
      "How do we prevent our soil from becoming hard or crowded with weeds (distractions)?",
      "What are the specific steps you take to nourish family faith daily?"
    ]
  },
  'cfm-2026-w28': {
    primary: [
      "How does prayer help us feel close to Heavenly Father?",
      "Can we pray when we are happy, sad, or scared?"
    ],
    youth: [
      "Zenos taught that God hears us in our wilderness, field, or closet. How does this apply to your school life?",
      "Why is mercy only possible through the infinite Atonement of Jesus Christ?"
    ],
    adult: [
      "How does the concept of an 'infinite and eternal sacrifice' shape your understanding of the Atonement?",
      "What can we do to make our home a sanctuary of prayer and reflection?"
    ]
  }
};

const DEFAULT_DISCUSSION = {
  primary: [
    "What is your favorite story about Jesus Christ?",
    "How can we help someone feel loved today?"
  ],
  youth: [
    "How do you stand as a witness of God at all times and in all places?",
    "What helps you hear the voice of the Holy Ghost when making hard choices?"
  ],
  adult: [
    "What gospel principle has brought the greatest peace to your home this week?",
    "How can we support our family members in keeping their covenants?"
  ]
};

const MEMORY_SCRIPTURES = [
  {
    ref: 'Alma 37:37',
    text: 'Counsel with the Lord in all thy doings, and he will direct thee for good; yea, when thou liest down at night lie down unto the Lord, that he may watch over you in your sleep; and when thou risest in the morning let thy heart be full of thanks unto God; and if ye do these things, ye shall be lifted up at the last day.',
    blanks: [
      { wordIndex: 1, options: ['Lord', 'prophet', 'bishop', 'parents'], correct: 'Lord' },
      { wordIndex: 7, options: ['direct', 'force', 'command', 'judge'], correct: 'direct' },
      { wordIndex: 30, options: ['thanks', 'fear', 'sorrow', 'guilt'], correct: 'thanks' },
      { wordIndex: 44, options: ['lifted', 'left', 'judged', 'hidden'], correct: 'lifted' }
    ]
  },
  {
    ref: 'Mosiah 2:17',
    text: 'And behold, I tell you these things that ye may learn wisdom; that ye may learn that when ye are in the service of your fellow beings ye are only in the service of your God.',
    blanks: [
      { wordIndex: 8, options: ['wisdom', 'wealth', 'languages', 'history'], correct: 'wisdom' },
      { wordIndex: 17, options: ['service', 'judgment', 'shadow', 'presence'], correct: 'service' },
      { wordIndex: 26, options: ['God', 'king', 'family', 'friends'], correct: 'God' }
    ]
  },
  {
    ref: '1 Nephi 3:7',
    text: 'And it came to pass that I, Nephi, said unto my father: I will go and do the things which the Lord hath commanded, for I know that the Lord giveth no commandments unto the children of men, save he shall prepare a way for them that they may accomplish the thing which he commandeth them.',
    blanks: [
      { wordIndex: 13, options: ['go', 'sit', 'flee', 'wait'], correct: 'go' },
      { wordIndex: 15, options: ['do', 'hear', 'judge', 'write'], correct: 'do' },
      { wordIndex: 21, options: ['commanded', 'requested', 'forgotten', 'forbidden'], correct: 'commanded' },
      { wordIndex: 34, options: ['prepare', 'block', 'change', 'hide'], correct: 'prepare' }
    ]
  }
];

const COVENANT_MILESTONES = [
  {
    id: 'baptism',
    title: 'Water Baptism & Confirmation',
    ageRange: 'Age 8+',
    icon: '🌊',
    checklist: [
      "Study 2 Nephi 31 about the doctrine of Christ.",
      "Understand the baptismal covenant: bear burdens, mourn with those that mourn, stand as a witness.",
      "Prepare for the baptismal interview with the Bishop.",
      "Receive the gift of the Holy Ghost by the laying on of hands.",
      "Write a testimony in your private spiritual diary."
    ],
    guidance: "Baptism is the gate that enters the covenant path. The Holy Ghost becomes your constant companion to guide your steps daily."
  },
  {
    id: 'priesthood_yw',
    title: 'Aaronic Priesthood / YW Theme',
    ageRange: 'Age 11-12+',
    icon: '⚔️',
    checklist: [
      "Study the Aaronic Priesthood duties or the Young Women Theme.",
      "Meet with the Bishop to receive your Priesthood ordination or YW advancement.",
      "Prepare to pass the sacrament or participate in class presidency responsibilities.",
      "Study the 'For the Strength of Youth' guide.",
      "Establish a consistent daily scripture study habit."
    ],
    guidance: "Entering youth callings helps you discover your divine identity and participate in gathering Israel."
  },
  {
    id: 'temple_recommend',
    title: 'Temple Recommend & Seminary',
    ageRange: 'Age 14+',
    icon: '🏛️',
    checklist: [
      "Hold a worthiness interview with the bishopric for a temple recommend.",
      "Perform proxy baptisms and confirmations in the House of the Lord.",
      "Register and attend daily Seminary classes.",
      "Find and submit an ancestor name for temple work on FamilySearch.",
      "Share your testimony in a fast and testimony meeting."
    ],
    guidance: "Seminary deepens your scriptural foundations while temple worship connects you with eternal covenants."
  },
  {
    id: 'mission_prep',
    title: 'Full-time Mission Preparation',
    ageRange: 'Age 18+',
    icon: '🌍',
    checklist: [
      "Study chapters 1 and 3 of Preach My Gospel.",
      "Save money in your personal missionary savings vault.",
      "Attend local Stake missionary preparation classes.",
      "Submit recommendation forms and receive your official call.",
      "Prepare to stand as a representative of Jesus Christ."
    ],
    guidance: "A full-time mission is a sacred call to consecrate your time and talents to share the Restored Gospel of Jesus Christ."
  },
  {
    id: 'endowment_sealing',
    title: 'Temple Endowment & Sealing',
    ageRange: 'Adult',
    icon: '👑',
    checklist: [
      "Attend temple preparation seminars at your ward.",
      "Receive the Initiatory and Endowment ordinances.",
      "Study the temple covenants: Obedience, Sacrifice, Gospel, Chastity, Consecration.",
      "Prepare for celestial marriage and sealing covenants.",
      "Strive to remain temple worthy throughout your life."
    ],
    guidance: "The endowment equips you with spiritual power. Sealing covenants bind families together forever."
  }
];

export const GospelLearning: React.FC<GospelLearningProps> = ({
  currentFamily,
  currentMember,
  refreshTrigger,
  onRefresh,
  initialSubTab = 'sketchpad'
}) => {
  const [subTab, setSubTab] = useState(initialSubTab);

  // Doodle State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#2563eb');
  const [brushSize, setBrushSize] = useState(5);
  const [isEraser, setIsEraser] = useState(false);
  const [doodleCaption, setDoodleCaption] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState(cfmLessons[0].id);
  const [sketches, setSketches] = useState<GospelSketch[]>([]);

  // Discussion deck state
  const [discussionAge, setDiscussionAge] = useState<'primary' | 'youth' | 'adult'>('youth');
  const [starterIndex, setStarterIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Memory Challenge state
  const [memoryIndex, setMemoryIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [memoryChecked, setMemoryChecked] = useState(false);
  const [memoryCorrect, setMemoryCorrect] = useState(false);
  const [memoryStreak, setMemoryStreak] = useState(0);
  const [pointsClaimed, setPointsClaimed] = useState(false);

  // Covenant roadmap state
  const [selectedMilestoneId, setSelectedMilestoneId] = useState('baptism');
  const [covenantProgressList, setCovenantProgressList] = useState<CovenantMilestoneProgress[]>([]);
  const [completedItems, setCompletedItems] = useState<string[]>([]);
  const [milestoneNotes, setMilestoneNotes] = useState('');
  const [milestoneDate, setMilestoneDate] = useState('');

  const [success, setSuccess] = useState('');

  // Load sketches, memory stats, and milestone states
  useEffect(() => {
    const loadGospelData = async () => {
      try {
        const fetchedSketches = await dbService.getGospelSketches(currentFamily.id);
        setSketches(fetchedSketches.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));

        const memoryStats = await dbService.getScriptureMemoryProgress(currentMember.id);
        if (memoryStats) {
          setMemoryStreak(memoryStats.streak);
        }

        const milestones = await dbService.getCovenantMilestoneProgress(currentMember.id);
        setCovenantProgressList(milestones);

        // Populate active milestone details
        const activeMilestone = milestones.find(m => m.milestoneId === selectedMilestoneId);
        if (activeMilestone) {
          setCompletedItems(activeMilestone.completedChecklist);
          setMilestoneNotes(activeMilestone.notes);
          setMilestoneDate(activeMilestone.completedDate || '');
        } else {
          setCompletedItems([]);
          setMilestoneNotes('');
          setMilestoneDate('');
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadGospelData();
  }, [currentFamily.id, currentMember.id, selectedMilestoneId, refreshTrigger]);

  // Rest of canvas drawing logic and helpers
  useEffect(() => {
    if (subTab !== 'sketchpad' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [subTab]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const coords = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = isEraser ? '#1a1d24' : brushColor; // Fallback back to standard dark bg color in eraser
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSaveSketch = async (e: React.FormEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    
    try {
      await dbService.saveGospelSketch(
        currentFamily.id,
        currentMember.id,
        currentMember.name,
        selectedLessonId,
        dataUrl,
        doodleCaption.trim() || 'No caption'
      );
      setDoodleCaption('');
      clearCanvas();
      setSuccess('Gospel sketch saved to Family Art Album!');
      setTimeout(() => setSuccess(''), 4000);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSketch = async (sketchId: string) => {
    try {
      await dbService.deleteGospelSketch(currentFamily.id, sketchId);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const activeLesson = cfmLessons.find(l => l.id === selectedLessonId) || cfmLessons[0];
  const activePrompts = DISCUSSION_PROMPTS[activeLesson.id]?.[discussionAge] || DEFAULT_DISCUSSION[discussionAge];
  const currentPrompt = activePrompts[starterIndex % activePrompts.length];

  const activeScripture = MEMORY_SCRIPTURES[memoryIndex];

  const handleVerifyMemory = () => {
    let allCorrect = true;
    activeScripture.blanks.forEach((blank, idx) => {
      if (userAnswers[idx] !== blank.correct) {
        allCorrect = false;
      }
    });

    setMemoryCorrect(allCorrect);
    setMemoryChecked(true);

    if (allCorrect) {
      const nextStreak = memoryStreak + 1;
      setMemoryStreak(nextStreak);
      dbService.updateScriptureMemoryProgress(currentMember.id, nextStreak, 1, new Date().toISOString().split('T')[0]);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } else {
      setMemoryStreak(0);
      dbService.updateScriptureMemoryProgress(currentMember.id, 0, 0);
    }
  };

  const handleClaimMemoryPoints = async () => {
    if (!memoryCorrect || pointsClaimed) return;
    await dbService.updateMemberPoints(currentFamily.id, currentMember.id, 50);
    setPointsClaimed(true);
    setSuccess('🎉 50 Points claimed for your chore reward chest!');
    setTimeout(() => setSuccess(''), 4000);
    onRefresh();
  };

  const handleNextMemoryScripture = () => {
    setMemoryIndex((prev) => (prev + 1) % MEMORY_SCRIPTURES.length);
    setUserAnswers({});
    setMemoryChecked(false);
    setMemoryCorrect(false);
    setPointsClaimed(false);
  };

  const handleToggleMilestoneItem = (item: string) => {
    let next: string[] = [];
    if (completedItems.includes(item)) {
      next = completedItems.filter(i => i !== item);
    } else {
      next = [...completedItems, item];
    }
    setCompletedItems(next);
  };

  const handleSaveMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dbService.saveCovenantMilestoneProgress(
        currentMember.id,
        selectedMilestoneId,
        completedItems,
        milestoneNotes.trim(),
        milestoneDate || undefined
      );
      setSuccess('Milestone goals and progress updated.');
      setTimeout(() => setSuccess(''), 3000);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const renderScriptureMemoryText = () => {
    const words = activeScripture.text.split(' ');
    
    return words.map((w, idx) => {
      const blankIdx = activeScripture.blanks.findIndex(b => b.wordIndex === idx);
      if (blankIdx !== -1) {
        const blank = activeScripture.blanks[blankIdx];
        const isUserCorrect = userAnswers[blankIdx] === blank.correct;
        return (
          <span key={idx} style={{ margin: '0 0.25rem', display: 'inline-block' }}>
            <select
              value={userAnswers[blankIdx] || ''}
              disabled={memoryChecked && memoryCorrect}
              onChange={(e) => {
                const val = e.target.value;
                setUserAnswers(prev => ({ ...prev, [blankIdx]: val }));
              }}
              style={{
                padding: '0.2rem 0.5rem',
                borderRadius: '6px',
                border: memoryChecked 
                  ? (isUserCorrect ? '2px solid var(--success-color)' : '2px solid var(--danger-color)')
                  : '1px solid var(--border-color)',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                backgroundColor: 'var(--card-background)',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              <option value="">???</option>
              {blank.options.map((opt, oIdx) => <option key={oIdx} value={opt}>{opt}</option>)}
            </select>
          </span>
        );
      }
      return <span key={idx} style={{ margin: '0 0.15rem' }}>{w}</span>;
    });
  };

  const currentLessonText = cfmLessons.find(l => l.id === selectedLessonId)?.scriptureBlock || '';

  return (
    <div className="animate-fade-in">
      {/* Head banner */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800' }}>📖 Gospel Learning & Covenants</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Explore interactive sketchpads, age-filtered family discussion decks, gamified memory scripture challenges, and your covenant path milestone map.
        </p>
      </div>

      {/* Tabs list */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem', gap: '0.75rem', flexWrap: 'wrap' }}>
        {[
          { key: 'sketchpad', label: '🎨 Scripture Doodle' },
          { key: 'discussion', label: '💬 Discussion Deck' },
          { key: 'challenge', label: '🏆 Memory Challenge' },
          { key: 'milestones', label: '🕊️ Covenant Path Roadmap' }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => { setSubTab(t.key); setSuccess(''); }}
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

      {/* Subtab Contents */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>

        {/* 1. SCRIPTURE DOODLE CANVS */}
        {subTab === 'sketchpad' && (
          <>
            <div className="glass-card" style={{ gridColumn: 'span 7', padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800' }}>Scripture Doodle Canvas</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Inspiration: <strong>{currentLessonText}</strong>
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    value={selectedLessonId}
                    onChange={(e) => setSelectedLessonId(e.target.value)}
                    className="input-field"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', height: '32px' }}
                  >
                    {cfmLessons.map(l => (
                      <option key={l.id} value={l.id}>{l.scriptureBlock}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Toolbar */}
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  {['#2563eb', '#eab308', '#16a34a', '#ef4444', '#1f2937', '#ffffff'].map(c => (
                    <button
                      key={c}
                      onClick={() => { setBrushColor(c); setIsEraser(false); }}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: c,
                        border: brushColor === c && !isEraser ? '2px solid var(--accent-gold)' : '1px solid var(--border-color)',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>

                <div style={{ height: '20px', width: '1px', backgroundColor: 'var(--border-color)' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Brush Size</span>
                  <input
                    type="range"
                    min="2"
                    max="20"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    style={{ accentColor: 'var(--primary-color)', cursor: 'pointer', width: '80px' }}
                  />
                </div>

                <div style={{ height: '20px', width: '1px', backgroundColor: 'var(--border-color)' }} />

                <button
                  type="button"
                  onClick={() => setIsEraser(!isEraser)}
                  className={`btn ${isEraser ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                >
                  <Eraser size={14} /> Eraser
                </button>

                <button
                  type="button"
                  onClick={clearCanvas}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                >
                  <Trash2 size={14} /> Clear
                </button>
              </div>

              {/* Canvas viewport */}
              <canvas
                ref={canvasRef}
                width={550}
                height={350}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  cursor: 'crosshair',
                  display: 'block'
                }}
              />

              <form onSubmit={handleSaveSketch} style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Caption your sketch (e.g. planting the good seed in Alma 32)..."
                  value={doodleCaption}
                  onChange={(e) => setDoodleCaption(e.target.value)}
                  className="input-field"
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  Publish Doodle
                </button>
              </form>
            </div>

            {/* Gallery list */}
            <div className="glass-card" style={{ gridColumn: 'span 5', padding: '1.75rem', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1rem' }}>🎨 Family Gospel Art Album</h3>
              {sketches.length === 0 ? (
                <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No sketches drawn yet. Be the first to share your doodle!</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {sketches.map(s => (
                    <div key={s.id} className="glass-panel" style={{ padding: '0.75rem', position: 'relative' }}>
                      <button
                        onClick={() => handleDeleteSketch(s.id)}
                        style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} />
                      </button>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                        <strong>{s.memberName}</strong> • {new Date(s.createdAt).toLocaleDateString()}
                      </div>
                      <img
                        src={s.canvasData}
                        alt={s.caption}
                        style={{ width: '100%', borderRadius: '6px', backgroundColor: '#1a1d24', border: '1px solid var(--border-color)', marginBottom: '0.5rem' }}
                      />
                      <p style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                        "{s.caption}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* 2. WEEKLY DISCUSSION STARTER DECK */}
        {subTab === 'discussion' && (
          <div className="glass-card" style={{ gridColumn: 'span 12', padding: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '800' }}>💬 Weekly Discussion Starters</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Active scripture block: <strong>{currentLessonText}</strong>
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {[
                  { key: 'primary', label: 'Primary 👶' },
                  { key: 'youth', label: 'Youth 🧑' },
                  { key: 'adult', label: 'Adults 🧔' }
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => { setDiscussionAge(item.key as any); setStarterIndex(0); setIsFlipped(false); }}
                    className={`btn ${discussionAge === item.key ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.8rem' }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
              <div 
                onClick={() => setIsFlipped(!isFlipped)}
                style={{
                  width: '100%',
                  maxWidth: '500px',
                  height: '250px',
                  perspective: '1000px',
                  cursor: 'pointer'
                }}
              >
                <div 
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    transition: 'transform 0.6s',
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'none'
                  }}
                >
                  {/* Front */}
                  <div 
                    className="glass-panel"
                    style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      backfaceVisibility: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: '2rem',
                      textAlign: 'center',
                      borderRadius: '16px',
                      border: '2px dashed var(--primary-color)'
                    }}
                  >
                    <BookOpen size={48} color="var(--primary-color)" style={{ marginBottom: '1rem' }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      {discussionAge.toUpperCase()} DISCUSSION STARTER
                    </span>
                    <h4 style={{ fontSize: '1.2rem', marginTop: '0.5rem' }}>{currentLessonText}</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>Click Card to Flip & Reveal Question</p>
                  </div>

                  {/* Back */}
                  <div 
                    className="glass-card"
                    style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: '2rem',
                      textAlign: 'center',
                      borderRadius: '16px',
                      backgroundColor: 'rgba(var(--primary-rgb), 0.05)',
                      border: '2px solid var(--primary-color)'
                    }}
                  >
                    <HelpCircle size={40} color="var(--accent-gold)" style={{ marginBottom: '1rem' }} />
                    <p style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                      "{currentPrompt}"
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>Click card to flip back</p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={() => { setStarterIndex(prev => prev > 0 ? prev - 1 : activePrompts.length - 1); setIsFlipped(false); }}
                className="btn btn-secondary"
              >
                Previous Card
              </button>
              <button
                onClick={() => { setStarterIndex(prev => (prev + 1) % activePrompts.length); setIsFlipped(false); }}
                className="btn btn-primary"
              >
                Next Prompt Card
              </button>
            </div>
          </div>
        )}

        {/* 3. SCRIPTURE MEMORY CHALLENGE */}
        {subTab === 'challenge' && (
          <div className="glass-card" style={{ gridColumn: 'span 12', padding: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '800' }}>🏆 Youth Scripture Memory Challenge</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Fill in the missing words from Aaronic Priesthood / Seminary scripture masteries. Correct fill-ins award <strong>50 Chore points</strong>!
                </p>
              </div>

              <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={20} color="var(--accent-gold)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Streak: {memoryStreak} Days</span>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.02)', marginBottom: '2rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent-gold)', textTransform: 'uppercase' }}>
                Scripture Master: {activeScripture.ref}
              </span>

              <div 
                style={{ 
                  fontSize: '1.25rem', 
                  lineHeight: '2', 
                  marginTop: '1rem', 
                  color: 'var(--text-primary)',
                  fontFamily: 'Georgia, serif',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {renderScriptureMemoryText()}
              </div>
            </div>

            {memoryChecked && (
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  backgroundColor: memoryCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                  color: memoryCorrect ? 'var(--success-color)' : 'var(--danger-color)',
                  padding: '1rem', 
                  borderRadius: '8px', 
                  marginBottom: '1.5rem',
                  fontWeight: '600'
                }}
              >
                {memoryCorrect ? (
                  <>
                    <Smile size={20} />
                    <span>Fantastic! You filled all missing words correctly!</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert size={20} />
                    <span>Some words are incorrect. Review the master scripture and try again!</span>
                  </>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              {!memoryChecked ? (
                <button onClick={handleVerifyMemory} className="btn btn-primary">
                  Verify My Fill-ins
                </button>
              ) : (
                <>
                  <button onClick={() => { setMemoryChecked(false); setUserAnswers({}); }} className="btn btn-secondary">
                    Retry Scripture
                  </button>
                  {memoryCorrect && currentMember.role === 'child' && (
                    <button onClick={handleClaimMemoryPoints} disabled={pointsClaimed} className="btn btn-primary">
                      {pointsClaimed ? 'Points Claimed!' : 'Claim 50 Chore Points'}
                    </button>
                  )}
                  <button onClick={handleNextMemoryScripture} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    Next Scripture <ArrowRight size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* 4. COVENANT PATH MILESTONE ROADMAP */}
        {subTab === 'milestones' && (
          <>
            <div className="glass-card" style={{ gridColumn: 'span 4', padding: '1.5rem', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.25rem' }}>🕊️ Covenant Path Milestones</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {COVENANT_MILESTONES.map(mile => (
                  <button
                    key={mile.id}
                    onClick={() => setSelectedMilestoneId(mile.id)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: selectedMilestoneId === mile.id ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                      background: selectedMilestoneId === mile.id ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent',
                      color: selectedMilestoneId === mile.id ? 'var(--primary-color)' : 'var(--text-primary)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>{mile.icon}</span>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>{mile.title}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{mile.ageRange}</div>
                      </div>
                    </div>
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-card" style={{ gridColumn: 'span 8', padding: '2rem' }}>
              {(() => {
                const milestone = COVENANT_MILESTONES.find(m => m.id === selectedMilestoneId)!;
                const dbMatch = covenantProgressList.find(m => m.milestoneId === selectedMilestoneId);
                const isCompleted = dbMatch?.completedDate ? true : false;
                
                return (
                  <form onSubmit={handleSaveMilestone}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                      <div>
                        <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>{milestone.icon}</span>
                        <h3 style={{ fontSize: '1.3rem', fontWeight: '800', display: 'inline' }}>{milestone.title}</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                          Target preparation guide for: <strong>{milestone.ageRange}</strong>
                        </p>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: '700',
                          padding: '0.25rem 0.6rem', 
                          borderRadius: '12px',
                          backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: isCompleted ? 'var(--success-color)' : 'var(--danger-color)'
                        }}>
                          {isCompleted ? `Achieved on ${dbMatch?.completedDate}` : 'In Preparation'}
                        </span>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '1.5rem' }}>
                      "{milestone.guidance}"
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                      {milestone.checklist.map((item, idx) => (
                        <div 
                          key={idx}
                          onClick={() => handleToggleMilestoneItem(item)}
                          className={`glass-panel ${completedItems.includes(item) ? 'active' : ''}`}
                          style={{ 
                            padding: '0.8rem 1rem', 
                            borderRadius: '8px', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            borderLeft: completedItems.includes(item) ? '4px solid var(--primary-color)' : '4px solid transparent'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={completedItems.includes(item)}
                            readOnly
                          />
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', textDecoration: completedItems.includes(item) ? 'line-through' : 'none' }}>
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div>
                        <label className="form-label">Completion Date (Leave blank if not achieved)</label>
                        <input
                          type="date"
                          value={milestoneDate}
                          onChange={(e) => setMilestoneDate(e.target.value)}
                          className="input-field"
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                      <label className="form-label">Milestone Study Notes & Covenants Reflections</label>
                      <textarea
                        placeholder="Write down personal notes, bishop interview goals, or covenant reflections..."
                        value={milestoneNotes}
                        onChange={(e) => setMilestoneNotes(e.target.value)}
                        className="input-field"
                        style={{ width: '100%', minHeight: '100px', fontSize: '0.85rem' }}
                      />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                      <Check size={16} /> Save Milestone Progress
                    </button>
                  </form>
                );
              })()}
            </div>
          </>
        )}

      </div>
    </div>
  );
};
