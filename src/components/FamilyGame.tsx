import React, { useState } from 'react';
import { dbService } from '../db';
import type { Family, Member } from '../types';
import { Award, Trophy, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface FamilyGameProps {
  currentFamily: Family;
  currentMember: Member;
  onRefresh: () => void;
}

interface Question {
  question: string;
  options: string[];
  answerIdx: number;
  explanation: string;
}

const TRIVIA_QUESTIONS: Question[] = [
  {
    question: "Which prophet led the pioneer saints across the plains to the Salt Lake Valley?",
    options: ["Joseph Smith", "Brigham Young", "John Taylor", "Wilford Woodruff"],
    answerIdx: 1,
    explanation: "Brigham Young led the pioneer saints to the West in 1847 following the martyrdom of Joseph Smith."
  },
  {
    question: "Where were the golden plates buried by Moroni before Joseph Smith retrieved them?",
    options: ["Hill Cumorah", "Mount Sinai", "Nauvoo temple grounds", "Salt Lake temple site"],
    answerIdx: 0,
    explanation: "Moroni buried the plates in the Hill Cumorah in New York, where Joseph Smith was guided to retrieve them in 1827."
  },
  {
    question: "Which book in the Book of Mormon contains Helaman's account of the 2,000 stripling warriors?",
    options: ["1 Nephi", "Mosiah", "Alma", "Helaman"],
    answerIdx: 2,
    explanation: "The story of the 2,000 stripling warriors is recorded in Alma chapters 53 and 56-58."
  },
  {
    question: "Who was the father of Nephi, Laman, Lemuel, and Sam?",
    options: ["Lehi", "Alma", "Mosiah", "Jacob"],
    answerIdx: 0,
    explanation: "Lehi was a prophet in Jerusalem who was commanded by God to take his family into the wilderness."
  },
  {
    question: "Which Book of Mormon prophet compared faith to a seed that must be nourished?",
    options: ["Nephi", "Alma", "Mormon", "Moroni"],
    answerIdx: 1,
    explanation: "Alma compared faith to a seed in Alma chapter 32, teaching how to nourish our testimony."
  }
];

export const FamilyGame: React.FC<FamilyGameProps> = ({ currentFamily, currentMember, onRefresh }) => {
  const [gameState, setGameState] = useState<'welcome' | 'playing' | 'results'>('welcome');
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [selectedAns, setSelectedAns] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [claimed, setClaimed] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const currentQuestion = TRIVIA_QUESTIONS[currentQIdx];
  const isChild = currentMember.role === 'child';

  const handleStart = () => {
    setGameState('playing');
    setCurrentQIdx(0);
    setSelectedAns(null);
    setScore(0);
    setClaimed(false);
    setSuccessMsg('');
  };

  const handleSelectOption = (idx: number) => {
    if (selectedAns !== null) return; // Answer locked
    setSelectedAns(idx);
    const correct = idx === currentQuestion.answerIdx;
    if (correct) {
      setScore(prev => prev + 20); // 20 points per question
    }
  };

  const handleNext = () => {
    if (currentQIdx < TRIVIA_QUESTIONS.length - 1) {
      setCurrentQIdx(prev => prev + 1);
      setSelectedAns(null);
    } else {
      setGameState('results');
      if (score === 100) {
        // Perfect score confetti!
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      }
    }
  };

  const handleClaimPoints = async () => {
    if (claimed || score === 0) return;
    try {
      await dbService.updateMemberPoints(currentFamily.id, currentMember.id, score);
      setClaimed(true);
      setSuccessMsg(`✓ Claimed ${score} points successfully! Check your Chores & Rewards balances.`);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '650px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <Sparkles color="var(--accent-gold)" fill="var(--accent-gold)" /> Scripture Trivia Challenge
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Test your gospel knowledge as a family. Earn chore points for correct answers!
        </p>
      </div>

      {successMsg && (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: '600', textAlign: 'center' }}>
          {successMsg}
        </div>
      )}

      {/* Welcome Screen */}
      {gameState === 'welcome' && (
        <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', backgroundColor: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary-color)', marginBottom: '1.25rem' }}>
            <Trophy size={40} />
          </div>
          <h3 style={{ fontSize: '1.35rem', fontWeight: '700', marginBottom: '0.75rem' }}>Are you ready, {currentMember.name}?</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '2rem' }}>
            This quiz has 5 scripture and history questions. Each correct answer is worth **20 points**!
            {isChild ? " Children can claim their trivia score as Chore Reward points." : " Parents can play to test their knowledge (points will not affect parent profiles)."}
          </p>

          <button onClick={handleStart} className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
            Start Trivia Game
          </button>
        </div>
      )}

      {/* Playing Screen */}
      {gameState === 'playing' && (
        <div className="glass-card" style={{ padding: '2rem' }}>
          {/* Progress Indicator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span>Question {currentQIdx + 1} of {TRIVIA_QUESTIONS.length}</span>
            <span>Score: {score} / 100</span>
          </div>

          {/* Question Text */}
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', lineHeight: '1.5', marginBottom: '1.5rem', minHeight: '60px' }}>
            {currentQuestion.question}
          </h3>

          {/* Options list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedAns === idx;
              const isCorrectAnswer = idx === currentQuestion.answerIdx;
              const showCheck = selectedAns !== null && isCorrectAnswer;
              const showWrong = selectedAns !== null && isSelected && !isCorrectAnswer;

              let bgStyle = 'var(--glass-bg)';
              let borderStyle = '1px solid var(--border-color)';
              
              if (selectedAns !== null) {
                if (isCorrectAnswer) {
                  bgStyle = 'rgba(16, 185, 129, 0.1)';
                  borderStyle = '1px solid var(--success-color)';
                } else if (isSelected) {
                  bgStyle = 'rgba(239, 68, 68, 0.1)';
                  borderStyle = '1px solid var(--danger-color)';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  disabled={selectedAns !== null}
                  style={{
                    width: '100%',
                    padding: '1rem 1.25rem',
                    textAlign: 'left',
                    background: bgStyle,
                    border: borderStyle,
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                    cursor: selectedAns !== null ? 'default' : 'pointer',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span>{option}</span>
                  {showCheck && <span style={{ color: 'var(--success-color)' }}>✓ Correct</span>}
                  {showWrong && <span style={{ color: 'var(--danger-color)' }}>✗ Incorrect</span>}
                </button>
              );
            })}
          </div>

          {/* Explanation block */}
          {selectedAns !== null && (
            <div className="glass-panel animate-fade-in" style={{ padding: '1rem 1.25rem', borderRadius: '8px', marginBottom: '2rem', fontSize: '0.85rem', lineHeight: '1.5', background: 'rgba(var(--primary-rgb), 0.03)' }}>
              <strong>💡 Explanation:</strong> {currentQuestion.explanation}
            </div>
          )}

          {/* Next Button */}
          {selectedAns !== null && (
            <button onClick={handleNext} className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
              {currentQIdx < TRIVIA_QUESTIONS.length - 1 ? 'Next Question' : 'View Results'}
            </button>
          )}
        </div>
      )}

      {/* Results Screen */}
      {gameState === 'results' && (
        <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', backgroundColor: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary-color)', marginBottom: '1.25rem' }}>
            <Award size={40} />
          </div>

          <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem' }}>Challenge Completed!</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            You scored <strong>{score} / 100</strong> points.
          </p>

          {/* Custom claims panel for kids */}
          {isChild && score > 0 && (
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid var(--accent-gold)' }}>
              <h4 style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                <ShieldCheck size={16} color="var(--accent-gold)" /> Reward Points Available
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Since you are logged in as a child, you can claim these <strong>{score} points</strong> to buy chores rewards!
              </p>
              <button
                onClick={handleClaimPoints}
                disabled={claimed}
                className="btn btn-accent"
                style={{ width: '100%', padding: '0.5rem' }}
              >
                {claimed ? 'Points Claimed!' : 'Claim Points'}
              </button>
            </div>
          )}

          {!isChild && score > 0 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '2rem' }}>
              Note: Only children accounts can claim trivia scores as Chore reward points.
            </p>
          )}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => setGameState('welcome')} className="btn btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
              <RotateCcw size={14} /> Back to Start
            </button>
            <button onClick={handleStart} className="btn btn-primary" style={{ flex: 1 }}>
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
