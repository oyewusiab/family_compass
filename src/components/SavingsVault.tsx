import React, { useEffect, useState } from 'react';
import { dbService } from '../db';
import type { Family, Member, KidsVault } from '../types';
import { Landmark, PiggyBank, Heart, ArrowDownRight, Calculator } from 'lucide-react';

interface SavingsVaultProps {
  currentFamily: Family;
  currentMember: Member;
  refreshTrigger: number;
  onRefresh: () => void;
}

export const SavingsVault: React.FC<SavingsVaultProps> = ({
  currentFamily,
  currentMember,
  refreshTrigger,
  onRefresh
}) => {
  const [vaults, setVaults] = useState<KidsVault[]>([]);
  const [loading, setLoading] = useState(true);

  // Allocation forms
  const [allocAmount, setAllocAmount] = useState('');
  const [allocTarget, setAllocTarget] = useState<'savings' | 'mission' | 'tithing'>('savings');

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const isChild = currentMember.role === 'child';

  // Load vaults
  useEffect(() => {
    const fetchVaults = async () => {
      setLoading(true);
      try {
        const fetched = await dbService.getKidsVaults(currentFamily.id);
        setVaults(fetched);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchVaults();
  }, [currentFamily.id, refreshTrigger]);

  // Find active member's vault or mock one
  const activeVault = vaults.find(v => v.memberId === currentMember.id) || {
    id: 'mock-v',
    familyId: currentFamily.id,
    memberId: currentMember.id,
    memberName: currentMember.name,
    savings: 0,
    mission: 0,
    tithing: 0,
    updatedAt: new Date().toISOString()
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const amt = Number(allocAmount);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid points amount.');
      return;
    }

    if (currentMember.points < amt) {
      setError(`Insufficient main balance. You only have ${currentMember.points} points.`);
      return;
    }

    try {
      // Deduct points from member's profile
      await dbService.updateMemberPoints(currentFamily.id, currentMember.id, -amt);
      
      // Update vault
      let newSavings = activeVault.savings;
      let newMission = activeVault.mission;
      let newTithing = activeVault.tithing;

      if (allocTarget === 'savings') newSavings += amt;
      else if (allocTarget === 'mission') newMission += amt;
      else if (allocTarget === 'tithing') newTithing += amt;

      await dbService.updateKidsVault(currentFamily.id, currentMember.id, newSavings, newMission, newTithing);

      setAllocAmount('');
      setSuccess(`Successfully allocated ${amt} points to your ${allocTarget === 'tithing' ? 'Gospel Tithing/Charity' : allocTarget + ' vault'}!`);
      setTimeout(() => setSuccess(''), 4500);
      onRefresh();
    } catch (err) {
      console.error(err);
      setError('Allocation failed.');
    }
  };

  const handleAutoTithing = async () => {
    setError('');
    setSuccess('');
    
    // Auto-tithing is 10% of their main points balance
    const tithingDues = Math.floor(currentMember.points * 0.1);
    if (tithingDues <= 0) {
      setError('You need at least 10 points to pay 10% tithing.');
      return;
    }

    try {
      await dbService.updateMemberPoints(currentFamily.id, currentMember.id, -tithingDues);
      const newTithing = activeVault.tithing + tithingDues;
      await dbService.updateKidsVault(currentFamily.id, currentMember.id, activeVault.savings, activeVault.mission, newTithing);
      
      setSuccess(`✓ 10% Covenant Tithing of ${tithingDues} points paid successfully! Thank you for your faithful stewardship.`);
      setTimeout(() => setSuccess(''), 4500);
      onRefresh();
    } catch (err) {
      console.error(err);
      setError('Failed to pay tithing.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
        <p>Loading family bank vaults...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Landmark color="var(--primary-color)" /> Kids' Savings Vault & Tithing Ledger
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Manage your virtual "Family Compass Bank." Allocate your chore points into distinct vaults for long-term goals and covenants.
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

      {/* Overview Cards (Vaults) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>
        
        {/* Vaults balances */}
        <div style={{ gridColumn: isChild ? 'span 8' : 'span 12', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {/* Savings Vault */}
            <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', borderTop: '4px solid var(--primary-color)' }}>
              <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '50%', backgroundColor: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary-color)', marginBottom: '1rem' }}>
                <PiggyBank size={32} />
              </div>
              <h4 style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-secondary)' }}>Personal Savings Fund</h4>
              <div style={{ fontSize: '2rem', fontWeight: '800', marginTop: '0.5rem', color: 'var(--text-primary)' }}>
                {isChild ? activeVault.savings : '—'} Points
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                For toys, outings, or custom rewards.
              </p>
            </div>

            {/* Missions / Education Vault */}
            <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', borderTop: '4px solid var(--accent-gold)' }}>
              <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '50%', backgroundColor: 'rgba(var(--accent-gold-rgb), 0.1)', color: 'var(--accent-gold)', marginBottom: '1rem' }}>
                <Landmark size={32} />
              </div>
              <h4 style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-secondary)' }}>Missions & BYU Pathway</h4>
              <div style={{ fontSize: '2rem', fontWeight: '800', marginTop: '0.5rem', color: 'var(--text-primary)' }}>
                {isChild ? activeVault.mission : '—'} Points
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Dedicated for missionary or university preparation.
              </p>
            </div>

            {/* Tithing Vault */}
            <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', borderTop: '4px solid var(--success-color)' }}>
              <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', marginBottom: '1rem' }}>
                <Heart size={32} fill="var(--success-color)" />
              </div>
              <h4 style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-secondary)' }}>Gospel Tithing & Charity</h4>
              <div style={{ fontSize: '2rem', fontWeight: '800', marginTop: '0.5rem', color: 'var(--text-primary)' }}>
                {isChild ? activeVault.tithing : '—'} Points
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                10% dedicated to Lord's storehouse & community support.
              </p>
            </div>
          </div>

          {/* Sibling vault overview for parents */}
          {!isChild && (
            <div className="glass-card" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.25rem' }}>
                👥 Children Bank Overview
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {vaults.map(v => (
                  <div key={v.id} className="glass-panel" style={{ padding: '1rem 1.5rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '1rem' }}>{v.memberName || 'Child'}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
                      <div>Savings: <strong>{v.savings} pts</strong></div>
                      <div>Mission: <strong>{v.mission} pts</strong></div>
                      <div>Tithing: <strong>{v.tithing} pts</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Allocation controls for Child */}
        {isChild && (
          <div className="glass-card" style={{ gridColumn: 'span 4', padding: '2rem', height: 'fit-content' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              💰 Manage Funds
            </h3>
            
            <div className="glass-panel" style={{ padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 'bold' }}>Main Chore Balance</span>
              <strong style={{ fontSize: '1.5rem', color: 'var(--primary-color)' }}>{currentMember.points} Points</strong>
            </div>

            <form onSubmit={handleAllocate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Allocate Amount</label>
                <input
                  type="number"
                  placeholder="Points to transfer..."
                  value={allocAmount}
                  onChange={(e) => setAllocAmount(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Destination Vault</label>
                <select
                  value={allocTarget}
                  onChange={(e) => setAllocTarget(e.target.value as any)}
                  className="input-field"
                  style={{ width: '100%', height: '42px' }}
                >
                  <option value="savings">Personal Savings</option>
                  <option value="mission">Mission & Education Fund</option>
                  <option value="tithing">Gospel Tithing (10%)</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                <ArrowDownRight size={16} /> Transfer to Vault
              </button>
            </form>

            {/* Auto Tithing Button */}
            <div style={{ textAlign: 'center' }}>
              <button 
                onClick={handleAutoTithing} 
                className="btn btn-accent" 
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.6rem' }}
              >
                <Calculator size={16} /> Pay 10% Covenant Tithing
              </button>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                Auto-calculate and donate exactly 10% of your current chore balance.
              </p>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
