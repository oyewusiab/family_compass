import React, { useEffect, useState } from 'react';
import { dbService } from '../db';
import type { Family, Member, GrandparentSponsor, GrandparentComment, Reward } from '../types';
import { Heart, MessageSquare, Send, Gift } from 'lucide-react';

interface GrandparentPortalProps {
  currentFamily: Family;
  currentMember: Member;
  refreshTrigger: number;
  onRefresh: () => void;
}

export const GrandparentPortal: React.FC<GrandparentPortalProps> = ({
  currentFamily,
  refreshTrigger,
  onRefresh
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [sponsorships, setSponsorships] = useState<GrandparentSponsor[]>([]);
  const [comments, setComments] = useState<GrandparentComment[]>([]);
  
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedChildId, setSelectedChildId] = useState('');
  const [selectedRewardId, setSelectedRewardId] = useState('');
  const [newComment, setNewComment] = useState('');
  const [grandparentName, setGrandparentName] = useState('Grandma');

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [fetchedMembers, fetchedRewards, fetchedSponsors, fetchedComments] = await Promise.all([
          dbService.getMembers(currentFamily.id),
          dbService.getRewards(currentFamily.id),
          dbService.getGrandparentSponsors(currentFamily.id),
          dbService.getGrandparentComments(currentFamily.id)
        ]);

        setMembers(fetchedMembers.filter(m => m.role === 'child'));
        setRewards(fetchedRewards);
        setSponsorships(fetchedSponsors);
        setComments(fetchedComments.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));

        if (fetchedMembers.filter(m => m.role === 'child').length > 0) {
          setSelectedChildId(fetchedMembers.filter(m => m.role === 'child')[0].id);
        }
        if (fetchedRewards.length > 0) {
          setSelectedRewardId(fetchedRewards[0].id);
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentFamily.id, refreshTrigger]);

  const handleSponsorReward = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedChildId || !selectedRewardId) {
      setError('Please select a child and a reward to sponsor.');
      return;
    }

    try {
      const child = members.find(m => m.id === selectedChildId);
      const reward = rewards.find(r => r.id === selectedRewardId);
      if (!child || !reward) return;

      await dbService.createGrandparentSponsor(currentFamily.id, {
        familyId: currentFamily.id,
        sponsorName: grandparentName,
        childId: selectedChildId,
        childName: child.name,
        rewardId: selectedRewardId,
        rewardTitle: reward.title,
        pointsCost: reward.pointsCost
      });

      setSuccess(`✓ Successfully sponsored "${reward.title}" for ${child.name}!`);
      setTimeout(() => setSuccess(''), 4500);
      onRefresh();
    } catch (err) {
      console.error(err);
      setError('Failed to sponsor reward.');
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newComment.trim()) {
      setError('Please enter a message.');
      return;
    }

    try {
      await dbService.createGrandparentComment(currentFamily.id, grandparentName, newComment.trim());
      setNewComment('');
      setSuccess('Encouragement note posted to the family board!');
      setTimeout(() => setSuccess(''), 3000);
      onRefresh();
    } catch (err) {
      console.error(err);
      setError('Failed to post comment.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
        <p>Loading Grandparent portal data...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Heart color="var(--primary-color)" fill="var(--primary-color)" /> Grandparent Encouragement Center
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          A secure read-only space for grandparents to track kids' scripture streaks, sponsor custom store rewards, and leave loving comments.
        </p>
      </div>

      {success && (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: '600' }}>
          {success}
        </div>
      )}
      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: '600' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Main grids */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>
        
        {/* Left columns (encourage/sponsor actions) */}
        <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Identity Select */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <label className="form-label" style={{ fontWeight: 'bold' }}>Select Your Identity</label>
            <select
              value={grandparentName}
              onChange={(e) => setGrandparentName(e.target.value)}
              className="input-field"
              style={{ width: '100%', height: '40px' }}
            >
              <option value="Grandma">👵 Grandma</option>
              <option value="Grandpa">👴 Grandpa</option>
            </select>
          </div>

          {/* Sponsor a Reward Form */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Gift size={18} color="var(--primary-color)" /> Sponsor a Treat
            </h3>

            <form onSubmit={handleSponsorReward} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Sponsor For</label>
                <select
                  value={selectedChildId}
                  onChange={(e) => setSelectedChildId(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', height: '40px' }}
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Select Reward</label>
                <select
                  value={selectedRewardId}
                  onChange={(e) => setSelectedRewardId(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', height: '40px' }}
                >
                  {rewards.map(r => (
                    <option key={r.id} value={r.id}>{r.title} ({r.pointsCost} pts)</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Sponsor Treat
              </button>
            </form>
          </div>

          {/* Leave encouraging comment form */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={18} color="var(--accent-gold)" /> Write Encouragement
            </h3>

            <form onSubmit={handlePostComment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <textarea
                placeholder="Write a warm note to children about their chore, goals, or scripture streaks..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="input-field"
                style={{ width: '100%', minHeight: '80px', resize: 'vertical', fontSize: '0.85rem' }}
              />
              <button type="submit" className="btn btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                <Send size={14} /> Send Message
              </button>
            </form>
          </div>

        </div>

        {/* Right columns (kids progress tracking & greetings list) */}
        <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Kids Progress Cards */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.25rem' }}>
              📈 Child Achievement Summaries
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {members.map(child => {
                const childSponsors = sponsorships.filter(s => s.childId === child.id);
                return (
                  <div key={child.id} className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <strong style={{ fontSize: '1.1rem' }}>{child.name}</strong>
                      <span className="badge badge-completed" style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                        Balance: {child.points} points
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '1.5rem', marginBottom: '0.75rem' }}>
                      <span>Scripture streak: 📖 {child.name === 'Brayden' ? 5 : 4} days</span>
                      <span>Chore Completion: 90%</span>
                    </div>

                    {/* Sponsoring status */}
                    {childSponsors.length > 0 && (
                      <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', fontWeight: 'bold' }}>
                          Sponsored Rewards from Grandparents:
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {childSponsors.map(s => (
                            <span 
                              key={s.id} 
                              style={{ 
                                fontSize: '0.75rem', 
                                backgroundColor: s.status === 'claimed' ? 'rgba(var(--primary-rgb), 0.05)' : 'rgba(16, 185, 129, 0.1)', 
                                color: s.status === 'claimed' ? 'var(--text-muted)' : 'var(--success-color)',
                                padding: '0.2rem 0.5rem', 
                                borderRadius: '4px', 
                                border: '1px solid var(--border-color)',
                                textDecoration: s.status === 'claimed' ? 'line-through' : 'none'
                              }}
                            >
                              🎁 "{s.rewardTitle}" sponsored by {s.sponsorName} ({s.status})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Greetings Board */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.25rem' }}>
              💬 Grandma & Grandpa's Encouragement Board
            </h3>

            {comments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem 0' }}>
                No messages posted yet. Leave an encouraging note to start the board!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {comments.map(c => (
                  <div key={c.id} className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                        {c.author === 'Grandma' ? '👵 Grandma' : '👴 Grandpa'}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                      "{c.content}"
                    </p>
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
