import React, { useEffect, useState } from 'react';
import { dbService } from '../db';
import type { Family, Member, Chore, Reward, RewardClaim } from '../types';
import { Award, Plus, CheckCircle2, ShoppingBag, ListTodo, Sparkles } from 'lucide-react';

interface ChoreSystemProps {
  currentFamily: Family;
  currentMember: Member;
  refreshTrigger: number;
  onRefresh: () => void;
}

export const ChoreSystem: React.FC<ChoreSystemProps> = ({
  currentFamily,
  currentMember,
  refreshTrigger,
  onRefresh
}) => {
  const [tab, setTab] = useState<'chores' | 'rewards'>('chores');
  const [members, setMembers] = useState<Member[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [choreTitle, setChoreTitle] = useState('');
  const [chorePoints, setChorePoints] = useState('');
  const [choreAssignee, setChoreAssignee] = useState('');

  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardPointsCost, setRewardPointsCost] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isParent = currentMember.role === 'parent';

  const childrenRanked = members
    .filter(m => m.role === 'child')
    .sort((a, b) => b.points - a.points);

  const renderLeaderboard = () => (
    <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', height: 'fit-content' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        🏆 Point Standings
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {childrenRanked.map((child, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;
          return (
            <div 
              key={child.id} 
              className="glass-panel" 
              style={{ 
                padding: '0.6rem 0.85rem', 
                borderRadius: '8px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                background: child.id === currentMember.id ? 'rgba(var(--primary-rgb), 0.05)' : 'var(--glass-bg)',
                border: child.id === currentMember.id ? '1px solid var(--primary-color)' : '1px solid var(--glass-border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem', width: '20px', display: 'inline-block', textAlign: 'center' }}>
                  {medal || `${index + 1}.`}
                </span>
                <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>
                  {child.name}
                  {child.id === currentMember.id && ' (You)'}
                </span>
              </div>
              <span style={{ fontWeight: '800', color: 'var(--accent-gold)', fontSize: '0.85rem' }}>
                🪙 {child.points} pts
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [fetchedMembers, fetchedChores, fetchedRewards, fetchedClaims] = await Promise.all([
          dbService.getMembers(currentFamily.id),
          dbService.getChores(currentFamily.id),
          dbService.getRewards(currentFamily.id),
          dbService.getClaims(currentFamily.id)
        ]);

        setMembers(fetchedMembers);
        setChores(fetchedChores);
        setRewards(fetchedRewards);
        setClaims(fetchedClaims);
      } catch (err) {
        console.error('Error fetching chores data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentFamily.id, refreshTrigger]);

  const handleCreateChore = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!isParent) return;

    if (!choreTitle.trim() || !chorePoints) {
      setError('Please provide a title and point value.');
      return;
    }

    try {
      await dbService.createChore(
        currentFamily.id,
        choreTitle,
        parseInt(chorePoints),
        choreAssignee || null
      );
      setChoreTitle('');
      setChorePoints('');
      setChoreAssignee('');
      setSuccess('Chore created successfully!');
      onRefresh();
    } catch (err) {
      setError('Failed to create chore.');
    }
  };

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!isParent) return;

    if (!rewardTitle.trim() || !rewardPointsCost) {
      setError('Please provide a title and point cost.');
      return;
    }

    try {
      await dbService.createReward(
        currentFamily.id,
        rewardTitle,
        parseInt(rewardPointsCost)
      );
      setRewardTitle('');
      setRewardPointsCost('');
      setSuccess('Reward created successfully!');
      onRefresh();
    } catch (err) {
      setError('Failed to create reward.');
    }
  };

  const handleMarkChoreComplete = async (choreId: string) => {
    try {
      await dbService.updateChoreStatus(currentFamily.id, choreId, 'completed');
      setSuccess('Chore marked as completed! Pending parent verification.');
      onRefresh();
    } catch (err) {
      console.error('Failed to complete chore:', err);
    }
  };

  const handleVerifyChore = async (choreId: string) => {
    if (!isParent) return;
    try {
      await dbService.updateChoreStatus(currentFamily.id, choreId, 'verified');
      setSuccess('Chore verified and points awarded!');
      onRefresh();
    } catch (err) {
      console.error('Failed to verify chore:', err);
    }
  };

  const handleClaimReward = async (rewardId: string) => {
    setError('');
    setSuccess('');
    try {
      const result = await dbService.claimReward(currentFamily.id, currentMember.id, rewardId);
      if (result) {
        setSuccess(`Successfully claimed "${result.claim.title}"! Points deducted. Pending parent approval.`);
        onRefresh();
      } else {
        setError('Insufficient points or error claiming reward.');
      }
    } catch (err) {
      setError('Failed to claim reward.');
    }
  };

  const handleApproveClaim = async (claimId: string) => {
    if (!isParent) return;
    try {
      await dbService.approveRewardClaim(currentFamily.id, claimId);
      setSuccess('Reward claim approved and fulfilled!');
      onRefresh();
    } catch (err) {
      console.error('Failed to approve claim:', err);
    }
  };

  const getMemberName = (id: string | null) => {
    if (!id) return 'Unassigned';
    const member = members.find(m => m.id === id);
    return member ? member.name : 'Unknown';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
        <p>Loading chore system...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header section with User Point Balances */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800' }}>Family Chore & Reward System</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Teach responsibility through gospel diligence and helpful chores.
          </p>
        </div>

        {/* Current user point balance */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: 'linear-gradient(135deg, rgba(var(--accent-gold-rgb), 0.1), rgba(var(--accent-gold-rgb), 0.2))',
          border: '1px solid rgba(var(--accent-gold-rgb), 0.3)',
          padding: '0.75rem 1.25rem',
          borderRadius: '12px'
        }}>
          <Sparkles size={20} color="var(--accent-gold)" fill="var(--accent-gold)" />
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
              {currentMember.name}'s Balance
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--accent-gold)' }}>
              {currentMember.points} Points
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '2rem',
        gap: '1.5rem'
      }}>
        <button
          onClick={() => { setTab('chores'); setError(''); setSuccess(''); }}
          style={{
            padding: '0.75rem 1rem',
            border: 'none',
            background: 'none',
            borderBottom: tab === 'chores' ? '3px solid var(--primary-color)' : 'none',
            color: tab === 'chores' ? 'var(--primary-color)' : 'var(--text-secondary)',
            fontWeight: tab === 'chores' ? '700' : '500',
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <ListTodo size={18} /> Chores
        </button>
        <button
          onClick={() => { setTab('rewards'); setError(''); setSuccess(''); }}
          style={{
            padding: '0.75rem 1rem',
            border: 'none',
            background: 'none',
            borderBottom: tab === 'rewards' ? '3px solid var(--primary-color)' : 'none',
            color: tab === 'rewards' ? 'var(--primary-color)' : 'var(--text-secondary)',
            fontWeight: tab === 'rewards' ? '700' : '500',
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <ShoppingBag size={18} /> Reward Store
        </button>
      </div>

      {/* Feedback messages */}
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

      {/* Chores View */}
      {tab === 'chores' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>
          {/* Chore creation - Parent only */}
          {isParent && (
            <div className="glass-card" style={{ gridColumn: 'span 4', padding: '1.5rem', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={18} color="var(--primary-color)" /> Create a Chore
              </h3>
              <form onSubmit={handleCreateChore}>
                <div className="form-group">
                  <label className="form-label">Chore Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Make bed, wash dishes..."
                    value={choreTitle}
                    onChange={(e) => setChoreTitle(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Point Value</label>
                  <input
                    type="number"
                    placeholder="e.g. 10"
                    value={chorePoints}
                    onChange={(e) => setChorePoints(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Assign To</label>
                  <select
                    value={choreAssignee}
                    onChange={(e) => setChoreAssignee(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', height: '42px' }}
                  >
                    <option value="">Unassigned (Anyone can claim)</option>
                    {members.filter(m => m.role === 'child').map(child => (
                      <option key={child.id} value={child.id}>
                        {child.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                  Add Family Chore
                </button>
              </form>
            </div>
          )}

          {/* Chore list */}
          <div className="glass-card" style={{ gridColumn: isParent ? 'span 5' : 'span 8', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ListTodo size={20} color="var(--primary-color)" /> Family Chores
            </h3>

            {chores.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0' }}>
                No chores created yet. Add chores to start tracking!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {chores.map((chore) => {
                  const isAssignedToMe = chore.assignedTo === currentMember.id;
                  const isPendingVerification = chore.status === 'completed';
                  const isVerified = chore.status === 'verified';

                  return (
                    <div 
                      key={chore.id}
                      className="glass-panel"
                      style={{
                        padding: '1.25rem',
                        borderRadius: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        borderLeft: isVerified ? '4px solid var(--success-color)' : isPendingVerification ? '4px solid var(--primary-color)' : '4px solid var(--warning-color)',
                        opacity: isVerified ? 0.7 : 1
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '1rem', textDecoration: isVerified ? 'line-through' : 'none' }}>
                          {chore.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--accent-gold)' }}>
                            🪙 {chore.points} Points
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Assigned to: <strong>{getMemberName(chore.assignedTo)}</strong>
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className={`badge badge-${chore.status}`}>
                          {chore.status === 'pending' ? 'pending' : chore.status === 'completed' ? 'pending review' : 'verified'}
                        </span>

                        {/* Child complete trigger */}
                        {!isParent && isAssignedToMe && chore.status === 'pending' && (
                          <button
                            onClick={() => handleMarkChoreComplete(chore.id)}
                            className="btn btn-primary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                          >
                            Mark Complete
                          </button>
                        )}

                        {/* Parent verify trigger */}
                        {isParent && isPendingVerification && (
                          <button
                            onClick={() => handleVerifyChore(chore.id)}
                            className="btn btn-accent"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <CheckCircle2 size={14} /> Approve & Award
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Standings Leaderboard */}
          <div style={{ gridColumn: isParent ? 'span 3' : 'span 4' }}>
            {renderLeaderboard()}
          </div>
        </div>
      )}

      {/* Rewards Store View */}
      {tab === 'rewards' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>
          {/* Create Reward - Parent only */}
          {isParent && (
            <div className="glass-card" style={{ gridColumn: 'span 4', padding: '1.5rem', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={18} color="var(--primary-color)" /> Create a Reward
              </h3>
              <form onSubmit={handleCreateReward}>
                <div className="form-group">
                  <label className="form-label">Reward Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ice Cream, 1 hour games..."
                    value={rewardTitle}
                    onChange={(e) => setRewardTitle(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Cost (Points)</label>
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    value={rewardPointsCost}
                    onChange={(e) => setRewardPointsCost(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                  Add Reward Option
                </button>
              </form>
            </div>
          )}

          {/* Reward list and pending claims */}
          <div className="glass-card" style={{ gridColumn: isParent ? 'span 5' : 'span 8', padding: '2rem' }}>
            {/* Pending Claims Section (visible to parents/admin) */}
            {isParent && (
              <div style={{ marginBottom: '2.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Award size={20} color="var(--accent-gold)" /> Pending Claims (Needs Approval)
                </h3>

                {claims.filter(c => c.status === 'pending').length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                    No pending reward claims.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {claims.filter(c => c.status === 'pending').map((claim) => (
                      <div 
                        key={claim.id} 
                        className="glass-panel" 
                        style={{ padding: '1rem', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <div>
                          <div style={{ fontWeight: '700' }}>{claim.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Claimed by: <strong>{getMemberName(claim.memberId)}</strong> • Cost: {claim.pointsCost} Points
                          </div>
                        </div>
                        <button
                          onClick={() => handleApproveClaim(claim.id)}
                          className="btn btn-accent"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        >
                          Approve Claim
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Storefront Grid */}
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingBag size={20} color="var(--primary-color)" /> Reward Catalog
            </h3>

            {rewards.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0' }}>
                No rewards configured yet.
              </p>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1.25rem'
              }}>
                {rewards.map((reward) => {
                  const hasEnoughPoints = currentMember.points >= reward.pointsCost;
                  const isChild = currentMember.role === 'child';

                  return (
                    <div 
                      key={reward.id} 
                      className="glass-panel" 
                      style={{
                        padding: '1.25rem',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '140px',
                        textAlign: 'center'
                      }}
                    >
                      <div>
                        <h4 style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.5rem' }}>{reward.title}</h4>
                        <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--accent-gold)', marginBottom: '1rem' }}>
                          🪙 {reward.pointsCost} pts
                        </div>
                      </div>

                      {isChild ? (
                        <button
                          onClick={() => handleClaimReward(reward.id)}
                          disabled={!hasEnoughPoints}
                          className={`btn ${hasEnoughPoints ? 'btn-accent' : 'btn-secondary'}`}
                          style={{ width: '100%', fontSize: '0.85rem' }}
                        >
                          {hasEnoughPoints ? 'Claim Reward' : 'Not Enough Points'}
                        </button>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Parents View Only
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Standings Leaderboard */}
          <div style={{ gridColumn: isParent ? 'span 3' : 'span 4' }}>
            {renderLeaderboard()}
          </div>
        </div>
      )}
    </div>
  );
};
