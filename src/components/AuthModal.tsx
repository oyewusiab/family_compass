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
  // Top-level choice: 'signup' or 'login'
  const [mainTab, setMainTab] = useState<'signup' | 'login'>('login');
  
  // Sub-tabs inside Sign Up: 'testing' | 'create' | 'join'
  const [signUpTab, setSignUpTab] = useState<'testing' | 'create' | 'join'>(
    config.mode === 'offline' ? 'testing' : 'create'
  );
  
  // Sub-tabs inside Log In: 'credentials' | 'google'
  const [logInTab, setLogInTab] = useState<'credentials' | 'google'>(
    config.mode === 'firebase' ? 'google' : 'credentials'
  );

  // Auth states
  const [googleUser, setGoogleUser] = useState<any>(null);

  // Create Family Form
  const [creatorName, setCreatorName] = useState('');
  const [creatorRole, setCreatorRole] = useState<'Father' | 'Mother'>('Father');
  const [familyName, setFamilyName] = useState('');
  const [missionStatement, setMissionStatement] = useState('');
  const [createUsername, setCreateUsername] = useState('');
  const [createPassword, setCreatePassword] = useState('');

  // Join Family Form
  const [inviteCode, setInviteCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinRole, setJoinRole] = useState<'Father' | 'Mother' | 'child' | 'grandparent'>('child');
  const [joinAge, setJoinAge] = useState('');
  const [joinUsername, setJoinUsername] = useState('');
  const [joinPassword, setJoinPassword] = useState('');

  // Log In Username/Password Form
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

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
      
      try {
        const mapping = await dbService.getUserMapping(user.uid);
        if (mapping) {
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
          setGoogleUser(user);
          setCreatorName(user.displayName || '');
          setJoinName(user.displayName || '');
          setMainTab('signup');
          setSignUpTab('create');
          setError('Google authenticated! Please Create or Join a family below to complete your registration.');
        }
      } catch (dbErr: any) {
        console.error(dbErr);
        if (dbErr.message?.includes('offline') || dbErr.message?.includes('permission')) {
          setError('⚠️ Connection failed: Please verify that you have initialized "Firestore Database" in your Firebase Console and that its Security Rules are set to Test Mode.');
        } else {
          setError(dbErr.message || 'Database connection error.');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google Sign-In failed.');
    }
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!creatorName || !familyName) {
      setError('Please fill in creator name and family name.');
      return;
    }

    if (!googleUser) {
      if (!createUsername || !createPassword) {
        setError('Please provide a username and password to secure this family account.');
        return;
      }
      if (createUsername.length < 3) {
        setError('Username must be at least 3 characters long.');
        return;
      }
      if (createPassword.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      try {
        const taken = await dbService.isUsernameTaken(createUsername);
        if (taken) {
          setError('Username is already taken. Please choose another username.');
          return;
        }
      } catch (err) {
        setError('Error checking username availability. Make sure Firestore is created.');
        return;
      }
    }

    try {
      const result = await dbService.createFamily(
        familyName,
        missionStatement,
        creatorName,
        googleUser?.uid,
        createUsername || undefined,
        createPassword || undefined,
        creatorRole
      );
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

    if (!joinName || !inviteCode) {
      setError('Please fill in your name and the family invite code.');
      return;
    }

    if (!googleUser) {
      if (!joinUsername || !joinPassword) {
        setError('Please provide a username and password to secure your member account.');
        return;
      }
      if (joinUsername.length < 3) {
        setError('Username must be at least 3 characters long.');
        return;
      }
      if (joinPassword.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      try {
        const taken = await dbService.isUsernameTaken(joinUsername);
        if (taken) {
          setError('Username is already taken. Please choose another username.');
          return;
        }
      } catch (err) {
        setError('Error checking username availability. Make sure Firestore is created.');
        return;
      }
    }

    let mappedRole: 'parent' | 'child' | 'grandparent' = 'child';
    if (joinRole === 'Father' || joinRole === 'Mother') {
      mappedRole = 'parent';
    } else if (joinRole === 'grandparent') {
      mappedRole = 'grandparent';
    }

    try {
      const result = await dbService.joinFamily(
        inviteCode,
        joinName,
        mappedRole,
        joinAge ? parseInt(joinAge) : undefined,
        googleUser?.uid,
        joinUsername || undefined,
        joinPassword || undefined,
        joinRole
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

  const handleUsernameLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!loginUsername || !loginPassword) {
      setError('Please enter both username and password.');
      return;
    }

    try {
      const result = await dbService.loginWithUsernamePassword(loginUsername, loginPassword);
      onLoginSuccess(result.family, result.member);
    } catch (err: any) {
      setError(err.message || 'Failed to login. Please verify username and password.');
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
                Role: <span className="badge badge-completed">{currentMember.displayRole || currentMember.role}</span>
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
          maxWidth: '650px',
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

          {/* MAIN TABS: SIGN UP vs LOG IN */}
          <div className="tab-container" style={{ width: '100%', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color)' }}>
            <button
              onClick={() => { setMainTab('signup'); setError(''); }}
              className={`tab-btn ${mainTab === 'signup' ? 'active' : ''}`}
              style={{ flex: 1, padding: '1rem', fontSize: '1.05rem', fontWeight: 'bold' }}
            >
              Sign up
            </button>
            <button
              onClick={() => { setMainTab('login'); setError(''); }}
              className={`tab-btn ${mainTab === 'login' ? 'active' : ''}`}
              style={{ flex: 1, padding: '1rem', fontSize: '1.05rem', fontWeight: 'bold' }}
            >
              Log in
            </button>
          </div>

          {/* SUB-TABS BASED ON MAIN TAB */}
          <div className="tab-container" style={{ width: '100%', marginBottom: '1.5rem', background: 'rgba(var(--primary-rgb), 0.03)', padding: '4px', borderRadius: '12px' }}>
            {mainTab === 'signup' ? (
              <>
                {config.mode === 'offline' && (
                  <button
                    onClick={() => { setSignUpTab('testing'); setNewFamilyDetails(null); }}
                    className={`tab-btn ${signUpTab === 'testing' ? 'active' : ''}`}
                    style={{ flex: 1, padding: '0.5rem' }}
                  >
                    Testing Mode
                  </button>
                )}
                <button
                  onClick={() => { setSignUpTab('create'); setNewFamilyDetails(null); }}
                  className={`tab-btn ${signUpTab === 'create' ? 'active' : ''}`}
                  style={{ flex: 1, padding: '0.5rem' }}
                >
                  Create Family
                </button>
                <button
                  onClick={() => { setSignUpTab('join'); setNewFamilyDetails(null); }}
                  className={`tab-btn ${signUpTab === 'join' ? 'active' : ''}`}
                  style={{ flex: 1, padding: '0.5rem' }}
                >
                  Join Family
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setLogInTab('credentials')}
                  className={`tab-btn ${logInTab === 'credentials' ? 'active' : ''}`}
                  style={{ flex: 1, padding: '0.5rem' }}
                >
                  User Name/Password
                </button>
                {config.mode === 'firebase' && (
                  <button
                    onClick={() => setLogInTab('google')}
                    className={`tab-btn ${logInTab === 'google' ? 'active' : ''}`}
                    style={{ flex: 1, padding: '0.5rem' }}
                  >
                    Google
                  </button>
                )}
              </>
            )}
          </div>

          {error && (
            <div style={{
              backgroundColor: error.includes('authenticated') || error.includes('✓') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: error.includes('authenticated') || error.includes('✓') ? 'var(--success-color)' : 'var(--danger-color)',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              fontWeight: '600'
            }}>
              {error.includes('authenticated') || error.includes('✓') ? '✓' : '⚠️'} {error}
            </div>
          )}

          {/* SIGN UP CONTENT */}
          {mainTab === 'signup' && (
            <div>
              {/* google helper badge */}
              {config.mode === 'firebase' && googleUser && (
                <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--primary-color)', marginBottom: '1.25rem', fontWeight: 'bold' }}>
                  Authenticated: {googleUser.email} (UID: {googleUser.uid.substring(0, 8)}...)
                </div>
              )}
              {config.mode === 'firebase' && !googleUser && (
                <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', textAlign: 'center', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Tip: Google Sign-in is active. To link this new family profile securely to your Google account, click Google under "Log in" first!
                  </p>
                </div>
              )}

              {/* Sub-Tab 1: Testing Mode */}
              {signUpTab === 'testing' && config.mode === 'offline' && (
                <div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem', textAlign: 'center' }}>
                    Select a simulated family member below to log in instantly.
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
                          {member.displayRole || member.role}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-Tab 2: Create Family */}
              {signUpTab === 'create' && (
                <div>
                  {!newFamilyDetails ? (
                    <form onSubmit={handleCreateFamily}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                          <label className="form-label">Your Name (Parent)</label>
                          <input
                            type="text"
                            placeholder="e.g. Sarah Smith"
                            value={creatorName}
                            onChange={(e) => setCreatorName(e.target.value)}
                            className="input-field"
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Role</label>
                          <select
                            value={creatorRole}
                            onChange={(e) => setCreatorRole(e.target.value as any)}
                            className="input-field"
                            style={{ width: '100%', height: '42px' }}
                          >
                            <option value="Father">Father</option>
                            <option value="Mother">Mother</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Family Name</label>
                        <input
                          type="text"
                          placeholder="e.g. The Smith Family"
                          value={familyName}
                          onChange={(e) => setFamilyName(e.target.value)}
                          className="input-field"
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Family Mission Statement (Optional)</label>
                        <textarea
                          placeholder="Define your family's core values..."
                          value={missionStatement}
                          onChange={(e) => setMissionStatement(e.target.value)}
                          className="input-field"
                          style={{ width: '100%', minHeight: '60px', resize: 'vertical' }}
                        />
                      </div>

                      {!googleUser ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
                          <div className="form-group">
                            <label className="form-label" style={{ fontWeight: '600' }}>
                              Username <span style={{ color: 'var(--danger-color)' }}>*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="Choose username (min 3 chars)"
                              value={createUsername}
                              onChange={(e) => setCreateUsername(e.target.value)}
                              className="input-field"
                              style={{ width: '100%', borderColor: createUsername && createUsername.length < 3 ? 'var(--danger-color)' : 'var(--border-color)' }}
                              required
                            />
                            {createUsername && createUsername.length < 3 && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--danger-color)', display: 'block', marginTop: '0.25rem' }}>
                                Min 3 characters
                              </span>
                            )}
                          </div>
                          <div className="form-group">
                            <label className="form-label" style={{ fontWeight: '600' }}>
                              Password <span style={{ color: 'var(--danger-color)' }}>*</span>
                            </label>
                            <input
                              type="password"
                              placeholder="Choose password (min 6 chars)"
                              value={createPassword}
                              onChange={(e) => setCreatePassword(e.target.value)}
                              className="input-field"
                              style={{ width: '100%', borderColor: createPassword && createPassword.length < 6 ? 'var(--danger-color)' : 'var(--border-color)' }}
                              required
                            />
                            {createPassword && createPassword.length < 6 && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--danger-color)', display: 'block', marginTop: '0.25rem' }}>
                                Min 6 characters
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem', color: 'var(--success-color)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                          ✓ Linked to Google Account ({googleUser.email}). No username or password required.
                        </div>
                      )}

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

              {/* Sub-Tab 3: Join Family */}
              {signUpTab === 'join' && (
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

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Your Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Emily"
                        value={joinName}
                        onChange={(e) => setJoinName(e.target.value)}
                        className="input-field"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Age</label>
                      <input
                        type="number"
                        placeholder="e.g. 10"
                        value={joinAge}
                        onChange={(e) => setJoinAge(e.target.value)}
                        className="input-field"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select
                      value={joinRole}
                      onChange={(e) => setJoinRole(e.target.value as any)}
                      className="input-field"
                      style={{ width: '100%', height: '42px' }}
                    >
                      <option value="child">Child</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="grandparent">Grandparent</option>
                    </select>
                  </div>

                  {!googleUser ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: '600' }}>
                          Username <span style={{ color: 'var(--danger-color)' }}>*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Choose username (min 3 chars)"
                          value={joinUsername}
                          onChange={(e) => setJoinUsername(e.target.value)}
                          className="input-field"
                          style={{ width: '100%', borderColor: joinUsername && joinUsername.length < 3 ? 'var(--danger-color)' : 'var(--border-color)' }}
                          required
                        />
                        {joinUsername && joinUsername.length < 3 && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--danger-color)', display: 'block', marginTop: '0.25rem' }}>
                            Min 3 characters
                          </span>
                        )}
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: '600' }}>
                          Password <span style={{ color: 'var(--danger-color)' }}>*</span>
                        </label>
                        <input
                          type="password"
                          placeholder="Choose password (min 6 chars)"
                          value={joinPassword}
                          onChange={(e) => setJoinPassword(e.target.value)}
                          className="input-field"
                          style={{ width: '100%', borderColor: joinPassword && joinPassword.length < 6 ? 'var(--danger-color)' : 'var(--border-color)' }}
                          required
                        />
                        {joinPassword && joinPassword.length < 6 && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--danger-color)', display: 'block', marginTop: '0.25rem' }}>
                            Min 6 characters
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem', color: 'var(--success-color)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      ✓ Linked to Google Account ({googleUser.email}). No username or password required.
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                    Join Family Dashboard
                  </button>
                </form>
              )}
            </div>
          )}

          {/* LOG IN CONTENT */}
          {mainTab === 'login' && (
            <div>
              {/* Sub-Tab 1: Credentials Login */}
              {logInTab === 'credentials' && (
                <form onSubmit={handleUsernameLogin}>
                  <div className="form-group">
                    <label className="form-label">Username</label>
                    <input
                      type="text"
                      placeholder="Enter username"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      placeholder="Enter password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                    Log In
                  </button>
                </form>
              )}

              {/* Sub-Tab 2: Google Sign In */}
              {logInTab === 'google' && config.mode === 'firebase' && (
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                    Sign in securely with Google to access your family's synchronized dashboard.
                  </p>
                  
                  <button 
                    onClick={handleGoogleSignIn}
                    className="btn btn-primary"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', fontSize: '1rem' }}
                  >
                    <LogIn size={20} /> Sign In with Google
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
