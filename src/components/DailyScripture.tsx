import React, { useState } from 'react';
import { Book, Play, Pause, RotateCcw, Volume2, Sparkles } from 'lucide-react';

interface ScripturePassage {
  reference: string;
  text: string;
  context: string;
}

const DAILY_PASSAGES: ScripturePassage[] = [
  {
    reference: "Alma 32:21",
    text: "And now as I said concerning faith—faith is not to have a perfect knowledge of things; therefore if ye have faith ye hope for things which are not seen, which are true.",
    context: "Alma teaches the Zoramites on the hill Onidah concerning faith and humility."
  },
  {
    reference: "Alma 32:28",
    text: "Now, we will compare the word unto a seed. Now, if ye give place, that a seed may be planted in your heart, behold, if it be a true seed, or a good seed, if ye do not cast it out by your unbelief, that ye will resist the Spirit of the Lord, behold, it will begin to swell within your breasts.",
    context: "The seed experiment. How to test if a spiritual message is good and true."
  },
  {
    reference: "Alma 37:6",
    text: "Now ye may suppose that this is foolishness in me; but behold I say unto you, that by small and simple things are great things brought to pass; and small means in many instances doth confound the wise.",
    context: "Helaman receives the sacred plates and council from his father Alma."
  },
  {
    reference: "Alma 37:37",
    text: "Counsel with the Lord in all thy doings, and he will direct thee for good; yea, when thou liest down at night lie down unto the Lord, that he may watch over you in your sleep; and when thou risest in the morning let thy heart be full of thanks unto God; and if ye do these things, ye shall be lifted up at the last day.",
    context: "Alma's practical directions to Helaman on daily prayer, devotion, and gratitude."
  },
  {
    reference: "Alma 39:9",
    text: "Now my son, I would that ye should repent and forsake your sins, and go no more after the lusts of your eyes, but cross yourself in all these things; for except ye do this ye can in nowise inherit the kingdom of God.",
    context: "Alma's strict but loving warning and counsel to his son Corianton."
  }
];

export const DailyScripture: React.FC = () => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);

  const activePassage = DAILY_PASSAGES[selectedIdx];

  const handlePlayAudio = () => {
    if ('speechSynthesis' in window) {
      // If paused/stopped, speak new
      window.speechSynthesis.cancel(); // clear queue
      
      const newUtterance = new SpeechSynthesisUtterance(activePassage.text);
      newUtterance.rate = speechRate;
      newUtterance.pitch = 1.0;
      
      newUtterance.onend = () => {
        setIsPlaying(false);
      };
      newUtterance.onerror = () => {
        setIsPlaying(false);
      };

      window.speechSynthesis.speak(newUtterance);
      setIsPlaying(true);
    } else {
      alert("Audio narration is not supported on your browser. Please try Chrome or Safari.");
    }
  };

  const handlePauseAudio = () => {
    if ('speechSynthesis' in window) {
      if (isPlaying) {
        window.speechSynthesis.pause();
        setIsPlaying(false);
      } else {
        window.speechSynthesis.resume();
        setIsPlaying(true);
      }
    }
  };

  const handleStopAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '750px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <Book color="var(--primary-color)" /> Daily Scripture Narrator
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Select a daily core scripture passage and listen to the audio narration together during family meals.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>
        {/* Passages List */}
        <div className="glass-card" style={{ gridColumn: 'span 4', padding: '1.25rem', height: 'fit-content' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '1rem', color: 'var(--text-primary)' }}>
            📖 Daily Readings
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {DAILY_PASSAGES.map((passage, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedIdx(idx);
                  handleStopAudio();
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: selectedIdx === idx ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                  background: selectedIdx === idx ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent',
                  color: selectedIdx === idx ? 'var(--primary-color)' : 'var(--text-primary)',
                  fontWeight: selectedIdx === idx ? '700' : '500',
                  fontSize: '0.85rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {passage.reference}
              </button>
            ))}
          </div>
        </div>

        {/* Main Display & Player */}
        <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '2.5rem', minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
            {/* Background sparkle icon */}
            <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', opacity: 0.15 }}>
              <Sparkles size={48} color="var(--accent-gold)" />
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '0.75rem' }}>
                📜 Core Passage • {activePassage.reference}
              </span>
              
              <blockquote style={{ 
                fontSize: '1.35rem', 
                fontFamily: 'var(--font-heading)',
                lineHeight: '1.7', 
                fontWeight: '700', 
                color: 'var(--text-primary)',
                borderLeft: '4px solid var(--primary-color)',
                paddingLeft: '1.5rem',
                margin: '1.5rem 0'
              }}>
                "{activePassage.text}"
              </blockquote>
            </div>

            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem', fontStyle: 'italic' }}>
                Context: {activePassage.context}
              </p>

              {/* Player Controls */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {isPlaying ? (
                    <button onClick={handlePauseAudio} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Pause size={16} /> Pause
                    </button>
                  ) : (
                    <button onClick={handlePlayAudio} className="btn btn-primary" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Play size={16} /> Play Narrator
                    </button>
                  )}
                  <button onClick={handleStopAudio} className="btn btn-secondary" style={{ padding: '0.5rem' }}>
                    <RotateCcw size={16} />
                  </button>
                </div>

                {/* Speed selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <Volume2 size={16} color="var(--text-muted)" />
                  <span>Speed:</span>
                  <select
                    value={speechRate}
                    onChange={(e) => {
                      setSpeechRate(Number(e.target.value));
                      if (isPlaying) {
                        handlePlayAudio(); // restart with new speed
                      }
                    }}
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      padding: '0.2rem 0.4rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="0.8">Slow (0.8x)</option>
                    <option value="1.0">Normal (1.0x)</option>
                    <option value="1.2">Fast (1.2x)</option>
                    <option value="1.5">Very Fast (1.5x)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
