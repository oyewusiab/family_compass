import React, { useState } from 'react';
import { dbService } from '../db';
import type { Family, Member } from '../types';
import { Compass, Clipboard, Check, LogIn } from 'lucide-react';
import { config } from '../config';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';

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
  const [tab, setTab] = useState<'quick' | 'google' | 'create' | 'join'>(
    config.mode === 'firebase' ? 'google' : 'quick'
  );
  
  // Auth state
  const [googleUser, setGoogleUser] = useState<any>(null);

  // Form states
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

  const handleGoogleSignIn = async () => {
    setError('');
    if (!auth || !googleProvider) {
      setError('Firebase authentication is not initialized. Please verify your Vercel Environment Variables.');
      return;
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Look up if user has a family mapping
      const mapping = await dbService.getUserMapping(user.uid);
      if (mapping) {
        // Fetch family and member details
        const [family, member] = await Promise.all([
          dbService.getFamily(mapping.familyId),
          dbService.getMember(mapping.familyId, mapping.memberId)
        ]);
        
        if (family && member) {
          onLoginSuccess(family, member);
        } else {
          setError('Failed to load your family profile. Try logging in again.');
        }
      } else {
        // Authenticated but unregistered: save user and navigate to create/join
        setGoogleUser(user);
        setCreatorName(user.displayName || '');
        setJoinName(user.displayName || '');
        setTab('create');
        setError('Google account authenticated! Please create a new family or enter an invite code to join an existing one.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google Sign-In failed.');
    }
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (config.mode === 'firebase' && !googleUser) {
      setError('You must sign in with Google first before creating a family.');
      setTab('google');
      return;
    }

    if (!creatorName || !familyName) {
      setError('Please fill in creator name and family name.');
      return;
    }

    try {
      const result = await dbService.createFamily(familyName, missionStatement, creatorName, googleUser?.uid);
      setNewFamilyDetails(result);
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

    if (config.mode === 'firebase' && !googleUser) {
      setError('You must sign in with Google first before joining a family.');
      setTab('google');
      return;
    }

    if (!joinName || !inviteCode) {
      setError('Please fill in your name and the family invite code.');
      return;
    }

    try {
      const result = await dbService.joinFamily(
        inviteCode,
        joinName,
        joinRole,
        joinAge ? parseInt(joinAge) : undefined,
        googleUser?.uid
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
          <div className="tab-container" style={{ width: '100%' }}>
            {config.mode === 'offline' ? (
              <button
                onClick={() => { setTab('quick'); setNewFamilyDetails(null); }}
                className={`tab-btn ${tab === 'quick' ? 'active' : ''}`}
                style={{ flex: 1 }}
              >
                Quick Test
              </button>
            ) : (
              <button
                onClick={() => { setTab('google'); setNewFamilyDetails(null); }}
                className={`tab-btn ${tab === 'google' ? 'active' : ''}`}
                style={{ flex: 1 }}
              >
                Google Sign In
              </button>
            )}
            <button
              onClick={() => { setTab('create'); setNewFamilyDetails(null); }}
              className={`tab-btn ${tab === 'create' ? 'active' : ''}`}
              style={{ flex: 1 }}
            >
              Create Family
            </button>
            <button
              onClick={() => { setTab('join'); setNewFamilyDetails(null); }}
              className={`tab-btn ${tab === 'join' ? 'active' : ''}`}
              style={{ flex: 1 }}
            >
              Join Family
            </button>
          </div>

          {error && (
            <div style={{
              backgroundColor: error.includes('authenticated') ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: error.includes('authenticated') ? 'var(--primary-color)' : 'var(--danger-color)',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              fontWeight: '600'
            }}>
              {error.includes('authenticated') ? '✓' : '⚠️'} {error}
            </div>
          )}

          {/* 1. Offline Quick Login */}
          {tab === 'quick' && config.mode === 'offline' && (
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem', textAlign: 'center' }}>
                Select a family member below to log in instantly.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
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
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {member.role}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Firebase Google Sign-In */}
          {tab === 'google' && config.mode === 'firebase' && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Sign in with Google to access your family's live synchronized dashboard.
              </p>
              
              <button 
                onClick={handleGoogleSignIn}
                className="btn btn-primary"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem' }}
              >
                <LogIn size={20} /> Sign In with Google
              </button>
            </div>
          )}

          {/* 3. Create Family */}
          {tab === 'create' && (
            <div>
              {googleUser && (
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--success-color)', marginBottom: '1rem', fontWeight: 'bold' }}>
                  Authenticated as: {googleUser.email}
                </div>
              )}
              {!newFamilyDetails ? (
                <form onSubmit={handleCreateFamily}>
                  <div className="form-group">
                    <label className="form-label">Your Name (Parent)</label>
                    <input
                      type="text"
                      placeholder="e.g., Sarah Smith"
                      value={creatorName}
                      onChange={(e) => setCreatorName(e.target.value)}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
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
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Family Created!</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                    Share this invite code with other family members so they can join.
                  </p>

                  <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', margin: '0 auto 1.5rem' }}>
                    <div style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                      Invite Code
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

          {/* 4. Join Family */}
          {tab === 'join' && (
            <form onSubmit={handleJoinFamily}>
              {googleUser && (
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--success-color)', marginBottom: '1rem', fontWeight: 'bold' }}>
                  Authenticated as: {googleUser.email}
                </div>
              )}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Role</label>
                  <select
                    value={joinRole}
                    onChange={(e) => setJoinRole(e.target.value as any)}
                    className="input-field"
                    style={{ width: '100%', height: '42px' }}
                  >
                    <option value="child">Child</option>
                    <option value="parent">Parent</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Age (Optional)</label>
                  <input
                    type="number"
                    placeholder="e.g. 14"
                    value={joinAge}
                    onChange={(e) => setJoinAge(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Join Family Dashboard
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
