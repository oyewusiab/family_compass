import React, { useEffect, useState } from 'react';
import { dbService } from '../db';
import type { Family, Member, Chore, ChoreBid, ChoreSwapRequest } from '../types';
import { ShoppingBag, Plus, Landmark } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ChoreMarketplaceProps {
  currentFamily: Family;
  currentMember: Member;
  refreshTrigger: number;
  onRefresh: () => void;
  initialSubTab?: string;
}

export const ChoreMarketplace: React.FC<ChoreMarketplaceProps> = ({
  currentFamily,
  currentMember,
  refreshTrigger,
  onRefresh,
  initialSubTab = 'market'
}) => {
  const [chores, setChores] = useState<Chore[]>([]);
  const [bids, setBids] = useState<ChoreBid[]>([]);
  const [swaps, setSwaps] = useState<ChoreSwapRequest[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'market' | 'swap'>(initialSubTab as any);

  // Form states (Parent creating unassigned chore)
  const [newChoreTitle, setNewChoreTitle] = useState('');
  const [newChorePoints, setNewChorePoints] = useState(10);
  const [isUrgent, setIsUrgent] = useState(false);

  // Bid input states (Child placing a bid)
  const [bidInputs, setBidInputs] = useState<Record<string, string>>({});

  // Swap proposal states
  const [selectedMyChoreId, setSelectedMyChoreId] = useState('');
  const [selectedSiblingChoreId, setSelectedSiblingChoreId] = useState('');

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const isParent = currentMember.role === 'parent';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [fetchedChores, fetchedBids, fetchedSwaps, fetchedMembers] = await Promise.all([
          dbService.getChores(currentFamily.id),
          dbService.getChoreBids(currentFamily.id),
          dbService.getChoreSwaps(currentFamily.id),
          dbService.getMembers(currentFamily.id)
        ]);
        setChores(fetchedChores);
        setBids(fetchedBids);
        setSwaps(fetchedSwaps.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setMembers(fetchedMembers);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentFamily.id, refreshTrigger]);

  const handleCreateUnassignedChore = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newChoreTitle.trim()) {
      setError('Please enter a chore title.');
      return;
    }

    try {
      const finalTitle = isUrgent ? `🚨 [URGENT] ${newChoreTitle.trim()}` : newChoreTitle.trim();
      const points = isUrgent ? newChorePoints + 10 : newChorePoints;

      await dbService.createChore(currentFamily.id, finalTitle, points, null);
      
      setNewChoreTitle('');
      setNewChorePoints(10);
      setIsUrgent(false);
      setSuccess('Marketplace chore posted successfully!');
      setTimeout(() => setSuccess(''), 3000);
      onRefresh();
    } catch (err) {
      setError('Failed to post chore to marketplace.');
    }
  };

  const handlePlaceBid = async (choreId: string, choreTitle: string) => {
    setError('');
    setSuccess('');
    
    const bidVal = bidInputs[choreId];
    if (!bidVal || isNaN(Number(bidVal)) || Number(bidVal) <= 0) {
      setError('Please enter a valid points bid.');
      return;
    }

    try {
      await dbService.placeChoreBid(currentFamily.id, {
        familyId: currentFamily.id,
        choreId,
        choreTitle,
        memberId: currentMember.id,
        memberName: currentMember.name,
        bidPoints: Number(bidVal)
      });

      setBidInputs(prev => ({ ...prev, [choreId]: '' }));
      setSuccess('Bid placed! Parents will review the stewardship offer.');
      setTimeout(() => setSuccess(''), 3000);
      onRefresh();
    } catch (err) {
      setError('Failed to submit chore bid.');
    }
  };

  const handleClaimUrgent = async (choreId: string) => {
    setError('');
    setSuccess('');
    try {
      await dbService.assignChoreDirectly(currentFamily.id, choreId, currentMember.id);
      setSuccess('Urgent chore claimed! It has been added to your daily tasks list.');
      setTimeout(() => setSuccess(''), 3000);
      onRefresh();
    } catch (err) {
      setError('Failed to claim urgent chore.');
    }
  };

  const handleResolveBid = async (bidId: string, status: 'accepted' | 'rejected') => {
    setError('');
    setSuccess('');
    try {
      await dbService.resolveChoreBid(currentFamily.id, bidId, status);
      setSuccess(`Bid successfully ${status === 'accepted' ? 'accepted' : 'declined'}.`);
      setTimeout(() => setSuccess(''), 3000);
      onRefresh();
    } catch (err) {
      setError('Failed to resolve chore bid.');
    }
  };

  // Propose Swap
  const handleProposeSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedMyChoreId || !selectedSiblingChoreId) {
      setError('Please select both your chore and a sibling chore to swap.');
      return;
    }

    const myChore = chores.find(c => c.id === selectedMyChoreId)!;
    const siblingChore = chores.find(c => c.id === selectedSiblingChoreId)!;
    const targetMember = members.find(m => m.id === siblingChore.assignedTo)!;

    try {
      await dbService.createChoreSwap(currentFamily.id, {
        familyId: currentFamily.id,
        requesterId: currentMember.id,
        requesterName: currentMember.name,
        requesterChoreId: myChore.id,
        requesterChoreName: myChore.title,
        targetMemberId: targetMember.id,
        targetMemberName: targetMember.name,
        targetChoreId: siblingChore.id,
        targetChoreName: siblingChore.title
      });

      setSelectedMyChoreId('');
      setSelectedSiblingChoreId('');
      setSuccess('Swap offer submitted! Awaiting parent approval.');
      setTimeout(() => setSuccess(''), 3000);
      onRefresh();
    } catch (err) {
      setError('Failed to propose chore swap.');
    }
  };

  // Resolve Swap
  const handleResolveSwap = async (swapId: string, status: 'approved' | 'rejected') => {
    setError('');
    setSuccess('');
    try {
      await dbService.updateChoreSwapStatus(currentFamily.id, swapId, status);
      
      if (status === 'approved') {
        const swap = swaps.find(s => s.id === swapId)!;
        // Perform swap: assign requesterChore to targetMember, and targetChore to requester
        await Promise.all([
          dbService.assignChoreDirectly(currentFamily.id, swap.requesterChoreId, swap.targetMemberId),
          dbService.assignChoreDirectly(currentFamily.id, swap.targetChoreId, swap.requesterId)
        ]);
        confetti({ particleCount: 80, spread: 60 });
        setSuccess('Chore assignments swapped successfully!');
      } else {
        setSuccess('Chore swap request declined.');
      }
      setTimeout(() => setSuccess(''), 3000);
      onRefresh();
    } catch (err) {
      setError('Failed to resolve chore swap.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
        <p>Loading chore marketplace...</p>
      </div>
    );
  }

  const marketChores = chores.filter(c => !c.assignedTo);
  const pendingBids = bids.filter(b => b.status === 'pending');
  const myAssignedChores = chores.filter(c => c.assignedTo === currentMember.id);
  const siblingAssignedChores = chores.filter(c => c.assignedTo && c.assignedTo !== currentMember.id);
  const pendingSwaps = swaps.filter(s => s.status === 'pending');

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingBag color="var(--primary-color)" /> Chore Marketplace & Swaps
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Bid on open chores, request trades with siblings, or claim urgent tasks for bonus points!
          </p>
        </div>
      </div>

      {/* Subtab selection */}
      <div className="tab-container">
        <button
          onClick={() => { setActiveSubTab('market'); setError(''); setSuccess(''); }}
          className={`tab-btn ${activeSubTab === 'market' ? 'active' : ''}`}
        >
          🛒 Open Chores Board
        </button>
        <button
          onClick={() => { setActiveSubTab('swap'); setError(''); setSuccess(''); }}
          className={`tab-btn ${activeSubTab === 'swap' ? 'active' : ''}`}
        >
          ↔️ Chore Trade-In Board
        </button>
      </div>

      {success && (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: '600' }}>
          ✓ {success}
        </div>
      )}
      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: '600' }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>
        
        {/* VIEW A: OPEN CHORES MARKETPLACE */}
        {activeSubTab === 'market' && (
          <>
            <div style={{ gridColumn: isParent ? 'span 8' : 'span 12', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.5rem' }}>🛒 Open Chores Feed</h3>

              {marketChores.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '2rem 0' }}>
                  The chore marketplace is currently empty. Check back later or ask parents to post communal duties!
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                  {marketChores.map(chore => {
                    const choreBids = bids.filter(b => b.choreId === chore.id);
                    const isChoreUrgent = chore.title.includes('[URGENT]');
                    
                    return (
                      <div 
                        key={chore.id} 
                        className="glass-card" 
                        style={{ 
                          padding: '1.5rem', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          justifyContent: 'space-between',
                          borderLeft: isChoreUrgent ? '4px solid var(--danger-color)' : '1px solid var(--border-color)' 
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: isChoreUrgent ? 'var(--danger-color)' : 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                              {isChoreUrgent ? '🔥 Urgent Task' : '📦 Stewardship Offer'}
                            </span>
                            <span className="badge badge-pending" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
                              Value: {chore.points} Pts
                            </span>
                          </div>

                          <h4 style={{ fontWeight: '800', fontSize: '1.1rem', marginBottom: '1rem' }}>{chore.title}</h4>

                          {choreBids.length > 0 && (
                            <div style={{ marginBottom: '1.25rem' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                Active Offers:
                              </span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {choreBids.map(b => (
                                  <span 
                                    key={b.id} 
                                    style={{ 
                                      fontSize: '0.75rem', 
                                      backgroundColor: 'var(--bg-secondary)', 
                                      color: 'var(--text-primary)',
                                      padding: '0.2rem 0.5rem', 
                                      borderRadius: '6px', 
                                      border: '1px solid var(--border-color)' 
                                    }}
                                  >
                                    {b.memberName}: <strong>{b.bidPoints} pts</strong>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {!isParent && (
                          <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
                            {isChoreUrgent ? (
                              <button 
                                onClick={() => handleClaimUrgent(chore.id)} 
                                className="btn btn-accent" 
                                style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}
                              >
                                Claim Immediately (+10 Bonus)
                              </button>
                            ) : (
                              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                                <input
                                  type="number"
                                  placeholder="Bid points..."
                                  value={bidInputs[chore.id] || ''}
                                  onChange={(e) => setBidInputs(prev => ({ ...prev, [chore.id]: e.target.value }))}
                                  className="input-field"
                                  style={{ width: '60%', height: '36px', fontSize: '0.8rem' }}
                                />
                                <button
                                  onClick={() => handlePlaceBid(chore.id, chore.title)}
                                  className="btn btn-primary"
                                  style={{ width: '40%', padding: '0.5rem', fontSize: '0.8rem' }}
                                >
                                  Bid
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {isParent && (
              <div className="glass-card" style={{ gridColumn: 'span 4', padding: '1.5rem', height: 'fit-content' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Plus size={18} color="var(--primary-color)" /> Post Marketplace Chore
                </h3>

                <form onSubmit={handleCreateUnassignedChore} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Chore Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Clean kitchen counters, weed garden..."
                      value={newChoreTitle}
                      onChange={(e) => setNewChoreTitle(e.target.value)}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Points Value</label>
                      <input
                        type="number"
                        value={newChorePoints}
                        onChange={(e) => setNewChorePoints(Number(e.target.value))}
                        className="input-field"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}>
                        <input
                          type="checkbox"
                          checked={isUrgent}
                          onChange={(e) => setIsUrgent(e.target.checked)}
                        />
                        Mark Urgent
                      </label>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                    Post to Marketplace
                  </button>
                </form>

                <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-gold)' }}>
                  <Landmark size={18} /> Review Bids
                </h3>

                {pendingBids.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>No active stewardship bids from children.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {pendingBids.map(bid => (
                      <div key={bid.id} className="glass-panel" style={{ padding: '1rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Offer by: <strong>{bid.memberName}</strong></div>
                          <strong style={{ fontSize: '0.9rem', display: 'block', margin: '0.25rem 0' }}>{bid.choreTitle}</strong>
                          <span style={{ fontSize: '0.8rem', color: 'var(--primary-color)', fontWeight: 'bold' }}>Bid points: {bid.bidPoints} pts</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button onClick={() => handleResolveBid(bid.id, 'rejected')} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Decline</button>
                          <button onClick={() => handleResolveBid(bid.id, 'accepted')} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Accept</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* VIEW B: CHORE SWAP BOARD */}
        {activeSubTab === 'swap' && (
          <>
            {/* Swap Proposal Form (For Children) */}
            {!isParent && (
              <div className="glass-card" style={{ gridColumn: 'span 4', padding: '1.5rem', height: 'fit-content' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '1.25rem' }}>Propose Chore Swap</h3>
                <form onSubmit={handleProposeSwap} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Select Your Chore to Trade Away</label>
                    <select
                      value={selectedMyChoreId}
                      onChange={(e) => setSelectedMyChoreId(e.target.value)}
                      className="input-field"
                      style={{ width: '100%' }}
                    >
                      <option value="">-- Select my chore --</option>
                      {myAssignedChores.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Select Sibling Chore to Acquire</label>
                    <select
                      value={selectedSiblingChoreId}
                      onChange={(e) => setSelectedSiblingChoreId(e.target.value)}
                      className="input-field"
                      style={{ width: '100%' }}
                    >
                      <option value="">-- Select sibling chore --</option>
                      {siblingAssignedChores.map(c => {
                        const assignedMember = members.find(m => m.id === c.assignedTo);
                        return (
                          <option key={c.id} value={c.id}>
                            {c.title} ({assignedMember?.name || 'Sibling'})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                    Request Trade
                  </button>
                </form>
              </div>
            )}

            {/* Swap Proposals list */}
            <div className="glass-card" style={{ gridColumn: isParent ? 'span 12' : 'span 8', padding: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>↔️ Sibling Trade-In Requests</h3>
              
              {isParent && pendingSwaps.length > 0 && (
                <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent-gold)', textTransform: 'uppercase', display: 'block', marginBottom: '1rem' }}>
                    Awaiting Parental Authorization
                  </span>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
                    {pendingSwaps.map(swap => (
                      <div key={swap.id} className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                          <span>Offer from: <strong>{swap.requesterName}</strong></span>
                          <span>{new Date(swap.createdAt).toLocaleDateString()}</span>
                        </div>

                        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                          <div>🔄 Wants to trade: <strong style={{ color: 'var(--primary-color)' }}>{swap.requesterChoreName}</strong></div>
                          <div style={{ marginTop: '0.35rem' }}>🤝 In exchange for: <strong style={{ color: 'var(--accent-gold)' }}>{swap.targetChoreName}</strong> ({swap.targetMemberName}'s chore)</div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button onClick={() => handleResolveSwap(swap.id, 'rejected')} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                            Decline Trade
                          </button>
                          <button onClick={() => handleResolveSwap(swap.id, 'approved')} className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                            Authorize Swap
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {swaps.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No chore trade-in requests found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {swaps.map(swap => (
                    <div key={swap.id} className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.85rem' }}>
                        <span><strong>{swap.requesterName}</strong> offered to trade <strong>{swap.requesterChoreName}</strong> for <strong>{swap.targetChoreName}</strong> (held by <strong>{swap.targetMemberName}</strong>)</span>
                      </div>
                      <span style={{ 
                        fontSize: '0.7rem', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '6px', 
                        fontWeight: 'bold',
                        backgroundColor: swap.status === 'approved' ? 'rgba(16, 185, 129, 0.1)' : swap.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                        color: swap.status === 'approved' ? 'var(--success-color)' : swap.status === 'rejected' ? 'var(--danger-color)' : 'var(--accent-gold)'
                      }}>
                        {swap.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
};
