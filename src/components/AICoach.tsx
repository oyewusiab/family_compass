import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../db';
import type { Family, Member, SpiritualDiagnostic, AncestorStory } from '../types';
import { Send, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AICoachProps {
  currentFamily: Family;
  currentMember: Member;
  refreshTrigger: number;
  onRefresh: () => void;
  initialSubTab?: string;
}

interface Message {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  createdAt: Date;
}

const PRESETS = [
  {
    question: "How can our family improve scripture study consistency?",
    answer: `### 📖 Tips for Scripture Study Consistency\n\nEstablishing consistent scripture study is a journey of faith, patience, and love. Here are practical ways to build this holy habit in your family:\n\n1. **Link it to an Existing Habit**: Study scriptures immediately after a meal or right before bedtime.\n2. **Keep it Short and Engaging**: For younger children, read just a few verses, tell the story in simple terms, or watch a short Book of Mormon video.\n3. **Use the Come Follow Me Manual**: Align your reading with the weekly CFM block and use the manual's discussion points.\n4. **Make it Interactive**: Let kids take turns marking verses or checking off their dashboard boxes!\n\n*“Feast upon the words of Christ; for behold, the words of Christ will tell you all things what ye should do.” (2 Nephi 32:3)*`
  },
  {
    question: "What chores are suitable for a 7-year-old child like Emily?",
    answer: `### 🧹 Age-Appropriate Chores for a 7-Year-Old\n\nAt age 7, children can learn responsibility through simple daily routines. Suitable chores for Emily include:\n\n- **Personal Care**: Making her bed, hanging up towels.\n- **Tidying Up**: Arranging toys, books, shoes.\n- **Kitchen Help**: Setting napkins, clearing her plate.\n- **Pets & Plants**: Feeding pets under supervision, watering plants.\n\n**Coach Tip:** Assign Reward Points in the Family Chore System! Tasks like *Arrange Toys* (10 pts) and *Help Set Table* (5 pts) are perfect.`
  }
];

export const AICoach: React.FC<AICoachProps> = ({
  currentFamily,
  currentMember,
  refreshTrigger,
  onRefresh,
  initialSubTab = 'coach'
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'coach' | 'diagnostic' | 'pioneer'>(initialSubTab as any);

  // Tab 1: Coach Q&A States
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'coach',
      text: `Hello ${currentMember.name}! I am your **Family Compass AI Coach**.\n\nHow can I help your family improve scripture consistency, chore rewards, or parenting strategies today?`,
      createdAt: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Tab 2: Diagnostic States
  const [unityRating, setUnityRating] = useState(7);
  const [stressRating, setStressRating] = useState(4);
  const [studyRating, setStudyRating] = useState(6);
  const [diagnostics, setDiagnostics] = useState<SpiritualDiagnostic[]>([]);
  const [activeDiagnostic, setActiveDiagnostic] = useState<SpiritualDiagnostic | null>(null);

  // Tab 3: Pioneer Generator States
  const [ancestors, setAncestors] = useState<AncestorStory[]>([]);
  const [selectedAncestorId, setSelectedAncestorId] = useState('');
  const [generatedStory, setGeneratedStory] = useState('');
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);

  const [success, setSuccess] = useState('');

  // Load ancestors & diagnostics
  useEffect(() => {
    const loadData = async () => {
      try {
        const [fetchedStories, fetchedDiagnostics] = await Promise.all([
          dbService.getAncestorStories(currentFamily.id),
          dbService.getSpiritualDiagnostics(currentFamily.id)
        ]);
        setAncestors(fetchedStories);
        setDiagnostics(fetchedDiagnostics.sort((a, b) => b.date.localeCompare(a.date)));
      } catch (err) {
        console.error(err);
      }
    };
    loadData();
  }, [currentFamily.id, refreshTrigger]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Tab 1 Send message
  const handleSend = (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}-u`,
      sender: 'user',
      text: textToSend,
      createdAt: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    setTimeout(() => {
      const matchedPreset = PRESETS.find(p => p.question.toLowerCase().includes(textToSend.toLowerCase()) || textToSend.toLowerCase().includes(p.question.toLowerCase()));
      
      let replyText = '';
      if (matchedPreset) {
        replyText = matchedPreset.answer;
      } else {
        replyText = `### 🧭 AI Coach Suggestion\n\nThank you for asking that, **${currentMember.name}**! As a family walking in covenant paths, we can address this by focusing on:\n\n1. **Open Communication in Family Councils**: Hold a quick 10-minute family council this Sunday. Write down decisions in the **Council Journal**.\n2. **Positive Reinforcement**: Offer small, meaningful rewards in the Reward Store to motivate children to build habits.\n3. **Small and Simple Habits**: Remember Alma's counsel: *“by small and simple things are great things brought to pass” (Alma 37:6)*.\n\nWould you like advice on chore structures, Come Follow Me study, or FHE prep?`;
      }

      const coachMsg: Message = {
        id: `msg-${Date.now()}-c`,
        sender: 'coach',
        text: replyText,
        createdAt: new Date()
      };

      setMessages(prev => [...prev, coachMsg]);
      setIsThinking(false);
    }, 1200);
  };

  // Tab 2 Run Diagnostic
  const handleRunDiagnostic = async () => {
    setIsThinking(true);
    setSuccess('');

    setTimeout(async () => {
      let diagnosis = '';
      let recommendations: string[] = [];

      if (unityRating >= 8 && stressRating <= 3) {
        diagnosis = "Your family is experiencing high spiritual alignment and low temporal stress. Excellent work! This is a celestial season to focus on reaching outward.";
        recommendations = [
          "Organize a secret service challenge for siblings.",
          "Invite a neighbors family to your next FHE dessert night.",
          "Plan a temple sealing trip for parents or proxy baptisms for youth."
        ];
      } else if (stressRating >= 7) {
        diagnosis = "Friction Alert: High temporal stress is squeezing out time for gospel connections and study. Your family needs rest, reset, and shared recreation.";
        recommendations = [
          "Hold a brief Family Council to delegate/reduce chores for a week.",
          "Use the FHE sing-along playlist for a relaxing devotional instead of a long lesson.",
          "Clear the Gratitude Jar during dinner to remind everyone of family support."
        ];
      } else if (studyRating <= 5) {
        diagnosis = "Gospel study consistency is low. Family members might feel study sessions are passive or too long.";
        recommendations = [
          "Use the Scripture Doodle canvas to make weekly CFM study interactive.",
          "Set a visual 5-minute timer and read only three verses per day.",
          "Award 50 points to children when they complete the Scripture Memory blank-fill challenges."
        ];
      } else {
        diagnosis = "Your family is maintaining steady habits, but there is room to build deeper gospel study enjoyment and reduce sibling friction.";
        recommendations = [
          "Use age-filtered discussion starter cards during dinner.",
          "Conduct a Safety Drill / Emergency prep evening to build teamwork.",
          "Log prayer requests in My Corner registries to track shared focus."
        ];
      }

      const newDiag = await dbService.saveSpiritualDiagnostic(currentFamily.id, {
        familyId: currentFamily.id,
        unityRating,
        stressRating,
        studyRating,
        date: new Date().toISOString().split('T')[0],
        diagnosis,
        recommendations
      });

      setActiveDiagnostic(newDiag);
      setSuccess('Weekly spiritual diagnostic completed successfully!');
      setTimeout(() => setSuccess(''), 3000);
      setIsThinking(false);
      onRefresh();
    }, 1500);
  };

  // Tab 3 Generate Story
  const handleGeneratePioneerStory = () => {
    setIsGeneratingStory(true);
    setGeneratedStory('');

    setTimeout(() => {
      let ancestorName = "Mary Ann Campbell";

      if (selectedAncestorId) {
        const found = ancestors.find(a => a.id === selectedAncestorId);
        if (found) {
          ancestorName = found.ancestorName;
        }
      }

      const stories = [
        `### 🕯️ Journal entry of ${ancestorName} (July 1856)
        
        "The wind was fierce today as we pulling our cart up the steep hills. My feet were blistered and cold, but as the sun began to set, the children gathered dry brush and we lit a small campfire. 
        
        Jacob stood up and led us in singing: 'Come, come, ye saints, no toil nor labor fear; But with joy wend your way.'
        
        A sweet peace came over my heart. I knew that Heavenly Father was watching over our children. If we continue in faith, we will reach the valley of Salt Lake and build a holy Temple. We do not fear the journey."`,

        `### 🏛️ Memoir of ${ancestorName} (Ephraim, Utah)
        
        "I remember when we were asked to help build the Manti Temple. Food was scarce, and we worked in the quarries cutting granite stones under the hot sun. 
        
        One afternoon, my strength failed me. I knelt behind a rock and poured out my soul in prayer to God. As I arose, a sibling in faith walked up and handed me a crust of bread. 
        
        I felt the truth of the Savior's words. God provides for His children when they serve Him. The temple stands today as a monument of our faith and sacrifice. I hope our grandchildren will always remember the covenants made there."`
      ];

      // Select random mock story template
      const selected = stories[Math.floor(Math.random() * stories.length)];
      setGeneratedStory(selected);
      setIsGeneratingStory(false);
      confetti({ particleCount: 50, spread: 50 });
    }, 1500);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Banner */}
      <div style={{ marginBottom: '1.5rem', flexShrink: 0 }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles color="var(--accent-gold)" fill="var(--accent-gold)" /> AI Family Coach
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Get spiritual diagnostics, practice parenting strategies, or generate pioneer stories based on your family history.
        </p>
      </div>

      {/* Tabs */}
      <div className="tab-container" style={{ flexWrap: 'wrap' }}>
        {[
          { key: 'coach', label: '💬 AI Q&A Advisor' },
          { key: 'diagnostic', label: '🩺 Spiritual Diagnostic' },
          { key: 'pioneer', label: '📜 Pioneer Story Generator' }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => { setActiveSubTab(t.key as any); setSuccess(''); }}
            className={`tab-btn ${activeSubTab === t.key ? 'active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {success && (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: '600' }}>
          ✓ {success}
        </div>
      )}

      {/* TAB Content views */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>

        {/* 1. CHAT ADVISOR */}
        {activeSubTab === 'coach' && (
          <>
            {/* Chat Frame */}
            <div className="glass-card" style={{ gridColumn: 'span 8', padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '450px' }}>
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {messages.map((m) => {
                  const isCoach = m.sender === 'coach';
                  return (
                    <div 
                      key={m.id}
                      style={{
                        alignSelf: isCoach ? 'flex-start' : 'flex-end',
                        maxWidth: '85%',
                        backgroundColor: isCoach ? 'rgba(255,255,255,0.02)' : 'rgba(37, 99, 235, 0.15)',
                        border: isCoach ? '1px solid var(--border-color)' : '1px solid rgba(37, 99, 235, 0.3)',
                        borderRadius: isCoach ? '12px 12px 12px 2px' : '12px 12px 2px 12px',
                        padding: '1rem 1.25rem',
                        fontSize: '0.9rem',
                        lineHeight: '1.5',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {m.text}
                    </div>
                  );
                })}
                {isThinking && (
                  <div style={{ alignSelf: 'flex-start', color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                    Coach is typing counsel...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <input
                  type="text"
                  placeholder="Ask for advice on scripture study, FHE games, or chore points..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
                  className="input-field"
                  style={{ flex: 1 }}
                />
                <button onClick={() => handleSend(input)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Send size={16} /> Send
                </button>
              </div>
            </div>

            {/* Presets / Prompts sidebar */}
            <div className="glass-card" style={{ gridColumn: 'span 4', padding: '1.5rem', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1rem', color: 'var(--accent-gold)' }}>Quick Advisor Topics</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(p.question)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'rgba(255,255,255,0.01)',
                      color: 'var(--text-primary)',
                      textAlign: 'left',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    {p.question}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 2. SPIRITUAL DIAGNOSTIC */}
        {activeSubTab === 'diagnostic' && (
          <>
            {/* Form */}
            <div className="glass-card" style={{ gridColumn: 'span 4', padding: '1.5rem', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '1.25rem' }}>Weekly Review</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Family Unity Rating</span>
                    <strong>{unityRating}/10</strong>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={unityRating}
                    onChange={(e) => setUnityRating(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Stress Level Rating</span>
                    <strong>{stressRating}/10</strong>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={stressRating}
                    onChange={(e) => setStressRating(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Study Enjoyment Rating</span>
                    <strong>{studyRating}/10</strong>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={studyRating}
                    onChange={(e) => setStudyRating(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <button 
                  onClick={handleRunDiagnostic} 
                  disabled={isThinking}
                  className="btn btn-primary" 
                  style={{ width: '100%' }}
                >
                  {isThinking ? 'Analyzing Metrics...' : 'Analyze Family Health'}
                </button>
              </div>
            </div>

            {/* Results Drawer */}
            <div className="glass-card" style={{ gridColumn: 'span 8', padding: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.25rem' }}>🩺 Spiritual Health Diagnostic Dashboard</h3>
              
              {activeDiagnostic ? (
                <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary-color)', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Diagnostic Date: {activeDiagnostic.date}
                  </div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>Diagnostic Summary:</h4>
                  <p style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
                    {activeDiagnostic.diagnosis}
                  </p>

                  <h4 style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--accent-gold)' }}>
                    Coach Action Recommendations:
                  </h4>
                  <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                    {activeDiagnostic.recommendations.map((rec, idx) => (
                      <li key={idx} style={{ marginBottom: '0.35rem' }}>{rec}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '2rem 0' }}>
                  Run the diagnostic review on the left to output weekly recommendations and spiritual guidance notes.
                </p>
              )}

              {/* Log History */}
              {diagnostics.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.75rem' }}>
                    Diagnostic History Log
                  </strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {diagnostics.map(d => (
                      <div key={d.id} onClick={() => setActiveDiagnostic(d)} style={{ padding: '0.75rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                        <span>Weekly Health Log ({d.date})</span>
                        <strong>Unity: {d.unityRating} | Stress: {d.stressRating} | Study: {d.studyRating}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* 3. PIONEER STORY GENERATOR */}
        {activeSubTab === 'pioneer' ? (
          <>
            {/* Ancestor list selection */}
            <div className="glass-card" style={{ gridColumn: 'span 4', padding: '1.5rem', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '1.25rem' }}>Select Ancestor</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Choose Ancestor from History</label>
                  <select
                    value={selectedAncestorId}
                    onChange={(e) => setSelectedAncestorId(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  >
                    <option value="">-- Choose Ancestor --</option>
                    {ancestors.map(a => (
                      <option key={a.id} value={a.id}>{a.ancestorName} (b. {a.birthYear})</option>
                    ))}
                  </select>
                </div>

                <button 
                  onClick={handleGeneratePioneerStory}
                  disabled={isGeneratingStory}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  {isGeneratingStory ? 'Cross-referencing journals...' : 'Generate Pioneer Story'}
                </button>
              </div>
            </div>

            {/* Rendered Story */}
            <div className="glass-card" style={{ gridColumn: 'span 8', padding: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.25rem' }}>📜 Pioneer journal story generator</h3>
              
              {generatedStory ? (
                <div 
                  className="glass-panel" 
                  style={{ 
                    padding: '2rem', 
                    borderRadius: '12px', 
                    fontSize: '1rem', 
                    lineHeight: '1.6', 
                    fontFamily: 'Georgia, serif', 
                    whiteSpace: 'pre-wrap', 
                    backgroundColor: 'rgba(255,255,255,0.01)',
                    borderLeft: '4px solid var(--accent-gold)'
                  }}
                >
                  {generatedStory}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
                  <p style={{ fontStyle: 'italic', fontSize: '0.85rem' }}>
                    Select an ancestor from the dropdown and click generate to construct a custom pioneer diary story.
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    (If no ancestors are logged in Family History yet, leaving it blank will generate a story based on pioneer courage).
                  </p>
                </div>
              )}
            </div>
          </>
        ) : null}

      </div>
    </div>
  );
};
