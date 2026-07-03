import React, { useState } from 'react';
import { dbService } from '../db';
import type { Family, Member } from '../types';
import { Compass, Clipboard, Check } from 'lucide-react';
import { config } from '../config';

interface AuthModalProps {
  currentMember: Member | null;
  currentFamily: Family | null;
  onLoginSuccess: (family: Family, member: Member) => void;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  currentMember,
  currentFamily,
  onLoginSuccess,
  onLogout
}) => {
  const [tab, setTab] = useState<'quick' | 'create' | 'join'>('quick');
  const [creatorName, setCreatorName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [missionStatement, setMissionStatement] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinRole, setJoinRole] = useState<'parent' | 'child'>('child');
  const [joinAge, setJoinAge] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [newFamilyDetails, setNewFamilyDetails] = useState<{ family: Family; member: Member } | null>(null);

  // Quick select members for offline testing
  const [quickMembers, setQuickMembers] = useState<Member[]>(() => {
    if (config.mode === 'offline') {
      const data = localStorage.getItem('fc_members');
      return data ? JSON.parse(data) : [];
    }
    return [];
  });

  const handleQuickLogin = async (member: Member) => {
    setError('');
    try {
      const family = await dbService.getFamily(member.familyId);
      if (family) {
        onLoginSuccess(family, member);
      } else {
        setError('Family associated with this member not found.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    }
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!creatorName || !familyName) {
      setError('Please fill in creator name and family name.');
      return;
    }

    try {
      const result = await dbService.createFamily(familyName, missionStatement, creatorName);
      setNewFamilyDetails(result);
      // Update quick list
      if (config.mode === 'offline') {
        const data = localStorage.getItem('fc_members');
        if (data) setQuickMembers(JSON.parse(data));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create family.');
    }
  };

  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!joinName || !inviteCode) {
      setError('Please fill in your name and the family invite code.');
      return;
    }

    try {
      const result = await dbService.joinFamily(
        inviteCode,
        joinName,
        joinRole,
        joinAge ? parseInt(joinAge) : undefined
      );

      if (result) {
        onLoginSuccess(result.family, result.member);
      } else {
        setError('Invalid invite code. Family not found.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to join family.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: currentMember ? 'auto' : '80vh',
      width: '100%',
      padding: '1rem'
    }}>
      {currentMember && currentFamily ? (
        // Already logged in - show status card with logout option
        <div className="glass-card animate-fade-in" style={{ padding: '2rem', maxWidth: '500px', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary-color), var(--accent-gold))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '1.25rem'
            }}>
              {currentMember.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem' }}>Logged in as {currentMember.name}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Role: <span className="badge badge-completed">{currentMember.role}</span>
              </p>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', borderRadius: '8px' }}>
            <p style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              🏠 {currentFamily.familyName}
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              "{currentFamily.missionStatement}"
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', background: 'rgba(var(--primary-rgb), 0.05)', padding: '0.5rem', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Invite Code:</span>
              <code style={{ fontSize: '0.9rem', color: 'var(--accent-gold)', fontWeight: 'bold', flex: 1 }}>
                {currentFamily.inviteCode}
              </code>
              <button 
                onClick={() => copyToClipboard(currentFamily.inviteCode)}
                className="btn btn-secondary" 
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
              >
                {copied ? <Check size={14} color="var(--success-color)" /> : <Clipboard size={14} />}
              </button>
            </div>
          </div>

          <button onClick={onLogout} className="btn btn-danger" style={{ width: '100%' }}>
            Disconnect / Log Out
          </button>
        </div>
      ) : (
        // Not logged in - show forms
        <div className="glass-card animate-fade-in" style={{
          padding: '2.5rem',
          maxWidth: '550px',
          width: '100%',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', backgroundColor: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary-color)', marginBottom: '1rem' }}>
              <Compass size={36} className="animate-pulse-glow" />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800' }}>Family Compass</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Spiritual growth, chores, and goals for Latter-day Saint Families
            </p>
          </div>

          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: '1.5rem'
          }}>
            <button
              onClick={() => { setTab('quick'); setNewFamilyDetails(null); }}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: 'none',
                background: 'none',
                borderBottom: tab === 'quick' ? '2px solid var(--primary-color)' : 'none',
                color: tab === 'quick' ? 'var(--primary-color)' : 'var(--text-secondary)',
                fontWeight: tab === 'quick' ? '700' : '500',
                cursor: 'pointer'
              }}
            >
              Quick Test
            </button>
            <button
              onClick={() => { setTab('create'); setNewFamilyDetails(null); }}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: 'none',
                background: 'none',
                borderBottom: tab === 'create' ? '2px solid var(--primary-color)' : 'none',
                color: tab === 'create' ? 'var(--primary-color)' : 'var(--text-secondary)',
                fontWeight: tab === 'create' ? '700' : '500',
                cursor: 'pointer'
              }}
            >
              Create Family
            </button>
            <button
              onClick={() => { setTab('join'); setNewFamilyDetails(null); }}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: 'none',
                background: 'none',
                borderBottom: tab === 'join' ? '2px solid var(--primary-color)' : 'none',
                color: tab === 'join' ? 'var(--primary-color)' : 'var(--text-secondary)',
                fontWeight: tab === 'join' ? '700' : '500',
                cursor: 'pointer'
              }}
            >
              Join Family
            </button>
          </div>

          {error && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--danger-color)',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              fontWeight: '600'
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Quick Login Tab */}
          {tab === 'quick' && (
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem', textAlign: 'center' }}>
                Select a family member below to log in instantly. This offline simulator includes pre-seeded data for Brayden, Emily, Mom, and Dad.
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1rem'
              }}>
                {quickMembers.map((member) => (
                  <div
                    key={member.id}
                    onClick={() => handleQuickLogin(member)}
                    className="glass-card"
                    style={{
                      padding: '1.25rem',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      backgroundColor: 'rgba(var(--primary-rgb), 0.02)'
                    }}
                  >
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      backgroundColor: member.role === 'parent' ? 'var(--primary-color)' : 'var(--accent-gold)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 0.75rem',
                      fontWeight: 'bold'
                    }}>
                      {member.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ fontWeight: '700' }}>{member.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                      {member.role} {member.age ? `(Age ${member.age})` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create Family Tab */}
          {tab === 'create' && (
            <div>
              {!newFamilyDetails ? (
                <form onSubmit={handleCreateFamily}>
                  <div className="form-group">
                    <label className="form-label">Your Name (Parent)</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="e.g., Sarah Smith"
                        value={creatorName}
                        onChange={(e) => setCreatorName(e.target.value)}
                        className="input-field"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Family Name</label>
                    <input
                      type="text"
                      placeholder="e.g., The Smith Family"
                      value={familyName}
                      onChange={(e) => setFamilyName(e.target.value)}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Family Mission Statement (Optional)</label>
                    <textarea
                      placeholder="Define your family's core values and spiritual focus..."
                      value={missionStatement}
                      onChange={(e) => setMissionStatement(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                    Create Family & Get Invite Code
                  </button>
                </form>
              ) : (
                // Success screen showing code
                <div style={{ textAlign: 'center', padding: '1rem 0' }} className="animate-fade-in">
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(5, 150, 105, 0.1)',
                    color: 'var(--success-color)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem'
                  }}>
                    <Check size={32} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Family Created Successfully!</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                    Share this code with other family members (spouse, children) so they can join your family dashboard.
                  </p>

                  <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', margin: '0 auto 1.5rem' }}>
                    <div style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                      Family Invite Code
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                      <span style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '2px', color: 'var(--accent-gold)' }}>
                        {newFamilyDetails.family.inviteCode}
                      </span>
                      <button 
                        onClick={() => copyToClipboard(newFamilyDetails.family.inviteCode)}
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem' }}
                      >
                        {copied ? 'Copied!' : <Clipboard size={18} />}
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleQuickLogin(newFamilyDetails.member)}
                    className="btn btn-primary" 
                    style={{ width: '100%' }}
                  >
                    Enter Dashboard as {newFamilyDetails.member.name}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Join Family Tab */}
          {tab === 'join' && (
            <form onSubmit={handleJoinFamily}>
              <div className="form-group">
                <label className="form-label">Invite Code</label>
                <input
                  type="text"
                  placeholder="e.g. FAM-123-456"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', textTransform: 'uppercase' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Your Name</label>
                <input
                  type="text"
                  placeholder="e.g. Brayden"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    value={joinRole}
                    onChange={(e) => setJoinRole(e.target.value as 'parent' | 'child')}
                    className="input-field"
                    style={{ width: '100%', height: '45px' }}
                  >
                    <option value="child">Child</option>
                    <option value="parent">Parent</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Age (For children)</label>
                  <input
                    type="number"
                    placeholder="e.g. 10"
                    value={joinAge}
                    onChange={(e) => setJoinAge(e.target.value)}
                    disabled={joinRole === 'parent'}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                Join Family Dashboard
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
