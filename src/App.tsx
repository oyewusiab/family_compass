import React, { useState, useEffect } from 'react';
import { dbService } from './db';
import type { Family, Member } from './types';
import { AuthModal } from './components/AuthModal';
import { Dashboard } from './components/Dashboard';
import { GospelTracker } from './components/GospelTracker';
import { ChoreSystem } from './components/ChoreSystem';
import { VisionBoard } from './components/VisionBoard';
import { CouncilJournal } from './components/CouncilJournal';
import { CFMBlock } from './components/CFMBlock';
import { BudgetLedger } from './components/BudgetLedger';
import { FamilyHistory } from './components/FamilyHistory';
import { AICoach } from './components/AICoach';
import { FHEFunPortal } from './components/FHEFunPortal';
import { SelfReliance } from './components/SelfReliance';
import { FamilyGame } from './components/FamilyGame';
import { CouncilAgendaBuilder } from './components/CouncilAgendaBuilder';
import { ChoreMarketplace } from './components/ChoreMarketplace';
import { DailyScripture } from './components/DailyScripture';
import { SavingsVault } from './components/SavingsVault';
import { FamilyNewsletter } from './components/FamilyNewsletter';
import { GrandparentPortal } from './components/GrandparentPortal';
import { OfflineSyncIndicator } from './components/OfflineSyncIndicator';
import { MyCorner } from './components/MyCorner';
import { GospelLearning } from './components/GospelLearning';
import { PriesthoodTemple } from './components/PriesthoodTemple';
import { Compass, Users, Sun, Moon, LogOut, User } from 'lucide-react';

export const App: React.FC = () => {
  const [currentFamily, setCurrentFamily] = useState<Family | null>(null);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'gospel' | 'cfm' | 'chores' | 'budget' | 'vision' | 'history' | 'journal' | 'coach' | 'fhe' | 'preparedness' | 'game' | 
    'agenda' | 'choremarket' | 'scripturenarrator' | 'kidsvault' | 'newsletter' | 'grandparent' | 'mycorner' | 'gospellearning' | 'priesthoodtemple' | 'auth'
  >('auth');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [gospelSubTab, setGospelSubTab] = useState('sketchpad');
  const [priesthoodSubTab, setPriesthoodSubTab] = useState('priesthood');
  const [fheSubTab, setFheSubTab] = useState('planner');
  const [prepSubTab, setPrepSubTab] = useState('72hr');
  const [coachSubTab, setCoachSubTab] = useState('coach');
  const [choreMarketSubTab, setChoreMarketSubTab] = useState('market');

  // Profile Swapper States
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedSwapMember, setSelectedSwapMember] = useState<Member | null>(null);
  const [swapPassword, setSwapPassword] = useState('');
  const [swapError, setSwapError] = useState('');
  const [isSettingUpPassword, setIsSettingUpPassword] = useState(false);
  const [setupNewPassword, setSetupNewPassword] = useState('');
  const [setupNewPasswordConfirm, setSetupNewPasswordConfirm] = useState('');
  // Restore session from LocalStorage on mount
  useEffect(() => {
    const savedFam = localStorage.getItem('fc_current_family');
    const savedMem = localStorage.getItem('fc_current_member');
    const savedTheme = localStorage.getItem('fc_theme') as 'light' | 'dark';

    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    if (savedFam && savedMem) {
      setCurrentFamily(JSON.parse(savedFam));
      setCurrentMember(JSON.parse(savedMem));
      setActiveTab('dashboard');
    }
  }, []);

  // Fetch all members in family whenever family changes or refresh triggers
  useEffect(() => {
    const fetchFamilyMembers = async () => {
      if (currentFamily) {
        try {
          const members = await dbService.getMembers(currentFamily.id);
          setAllMembers(members);
          
          // Sync current member points if they were updated
          if (currentMember) {
            const updated = members.find(m => m.id === currentMember.id);
            if (updated && updated.points !== currentMember.points) {
              setCurrentMember(updated);
              localStorage.setItem('fc_current_member', JSON.stringify(updated));
            }
          }
        } catch (err) {
          console.error("Failed to fetch family members:", err);
        }
      }
    };
    fetchFamilyMembers();
  }, [currentFamily, refreshTrigger]);

  const handleLoginSuccess = (family: Family, member: Member) => {
    setCurrentFamily(family);
    setCurrentMember(member);
    localStorage.setItem('fc_current_family', JSON.stringify(family));
    localStorage.setItem('fc_current_member', JSON.stringify(member));
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentFamily(null);
    setCurrentMember(null);
    setAllMembers([]);
    localStorage.removeItem('fc_current_family');
    localStorage.removeItem('fc_current_member');
    setActiveTab('auth');
  };

  const handleProfileClick = (targetMember: Member) => {
    if (!currentFamily || !currentMember) return;
    
    // 1. Same user? Just close modal.
    if (targetMember.id === currentMember.id) {
      setIsProfileModalOpen(false);
      return;
    }

    // 2. Parent admin bypass? Parents can switch to kids/grandparents without password/credentials.
    const isCurrentParent = currentMember.role === 'parent';
    const isTargetKid = targetMember.role === 'child' || targetMember.role === 'grandparent';
    
    if (isCurrentParent && isTargetKid) {
      performProfileSwap(targetMember);
      return;
    }

    // 3. Does target have credentials?
    if (targetMember.password) {
      setSelectedSwapMember(targetMember);
      setIsSettingUpPassword(false);
      setSwapPassword('');
      setSwapError('');
    } else {
      // Profile has no credentials.
      setSelectedSwapMember(targetMember);
      setIsSettingUpPassword(true);
      setSetupNewPassword('');
      setSetupNewPasswordConfirm('');
      setSwapError('');
    }
  };

  const performProfileSwap = (targetMember: Member) => {
    setCurrentMember(targetMember);
    localStorage.setItem('fc_current_member', JSON.stringify(targetMember));
    setIsProfileModalOpen(false);
    setSelectedSwapMember(null);
    setSwapPassword('');
    setSwapError('');
    setRefreshTrigger(prev => prev + 1);
  };

  const handleVerifySwapPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSwapMember) return;
    if (selectedSwapMember.password === swapPassword) {
      performProfileSwap(selectedSwapMember);
    } else {
      setSwapError('Incorrect password or PIN. Please try again.');
    }
  };

  const handleSetupSwapPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSwapMember || !currentFamily) return;
    if (!setupNewPassword) {
      setSwapError('Please enter a password.');
      return;
    }
    if (setupNewPassword.length < 6) {
      setSwapError('Password must be at least 6 characters long.');
      return;
    }
    if (setupNewPassword !== setupNewPasswordConfirm) {
      setSwapError('Passwords do not match.');
      return;
    }

    try {
      const updated = await dbService.updateMember(currentFamily.id, selectedSwapMember.id, {
        password: setupNewPassword
      });
      
      // Update our local state of members
      setAllMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
      
      // Complete the swap
      performProfileSwap(updated);
    } catch (err: any) {
      setSwapError(err.message || 'Failed to update profile password.');
    }
  };

  const handleSkipPasswordSetup = () => {
    if (!selectedSwapMember) return;
    performProfileSwap(selectedSwapMember);
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('fc_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const forceRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="app-container">
      {/* Sidebar navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Compass size={28} color="var(--primary-color)" className="animate-pulse-glow" />
          <span>Family Compass</span>
        </div>

        {/* Display Current Family Stats */}
        {currentFamily && currentMember && (
          <div className="glass-panel" style={{ padding: '0.85rem 1rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ 
                width: '10px', 
                height: '10px', 
                borderRadius: '50%', 
                backgroundColor: currentMember.role === 'parent' ? 'var(--primary-color)' : 'var(--accent-gold)' 
              }}></div>
              <span style={{ fontSize: '0.85rem', fontWeight: '800' }}>{currentMember.name}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                ({currentMember.role})
              </span>
            </div>
            
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              🏡 {currentFamily.familyName}
            </div>

            {/* Profile Quick Swapper */}
            <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
              <button 
                onClick={() => {
                  setSelectedSwapMember(null);
                  setSwapPassword('');
                  setSwapError('');
                  setIsProfileModalOpen(true);
                }}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  padding: '0.45rem',
                  fontSize: '0.75rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                🔄 Switch Profile
              </button>
            </div>
          </div>
        )}

        <ul className="sidebar-menu" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {currentFamily && currentMember ? (
            <>
              <li>
                <div 
                  onClick={() => setActiveTab('dashboard')}
                  className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                >
                  <Compass size={20} />
                  Compass Hub
                </div>
              </li>
              <li>
                <div 
                  onClick={() => setActiveTab('mycorner')}
                  className={`sidebar-item ${activeTab === 'mycorner' ? 'active' : ''}`}
                >
                  <User size={20} />
                  My Corner
                </div>
              </li>
            </>
          ) : null}

          <li>
            <div 
              onClick={() => setActiveTab('auth')}
              className={`sidebar-item ${activeTab === 'auth' ? 'active' : ''}`}
            >
              <Users size={20} />
              {currentFamily && currentMember ? 'Family Setup' : 'Log In / Register'}
            </div>
          </li>
        </ul>

        {/* Theme and logout controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
          <button 
            onClick={toggleTheme} 
            className="btn btn-secondary" 
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
          >
            {theme === 'light' ? (
              <>
                <Moon size={16} /> Dark Mode
              </>
            ) : (
              <>
                <Sun size={16} /> Light Mode
              </>
            )}
          </button>
          
          {currentFamily && currentMember && (
            <button 
              onClick={handleLogout} 
              className="btn btn-danger" 
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
            >
              <LogOut size={16} /> Disconnect
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {currentFamily && currentMember && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            {activeTab !== 'dashboard' && activeTab !== 'auth' ? (
              <button 
                onClick={() => setActiveTab('dashboard')}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                ← Back to Compass Hub
              </button>
            ) : <div />}
            <OfflineSyncIndicator />
          </div>
        )}
        
        {activeTab === 'auth' && (
          <AuthModal 
            currentMember={currentMember}
            currentFamily={currentFamily}
            onLoginSuccess={handleLoginSuccess}
            onLogout={handleLogout}
          />
        )}

        {currentFamily && currentMember ? (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard 
                currentFamily={currentFamily}
                currentMember={currentMember}
                refreshTrigger={refreshTrigger}
                onRefresh={forceRefresh}
                onNavigate={(tab) => {
                  if (tab === 'cfm') {
                    setGospelSubTab('discussion');
                    setActiveTab('gospellearning');
                  } else if (tab === 'game') {
                    setGospelSubTab('challenge');
                    setActiveTab('gospellearning');
                  } else if (tab === 'doodle') {
                    setGospelSubTab('sketchpad');
                    setActiveTab('gospellearning');
                  } else if (tab === 'milestones') {
                    setGospelSubTab('milestones');
                    setActiveTab('gospellearning');
                  } else if (tab === 'priesthood') {
                    setPriesthoodSubTab('priesthood');
                    setActiveTab('priesthoodtemple');
                  } else if (tab === 'temple') {
                    setPriesthoodSubTab('temple');
                    setActiveTab('priesthoodtemple');
                  } else if (tab === 'testimony') {
                    setPriesthoodSubTab('testimony');
                    setActiveTab('priesthoodtemple');
                  } else if (tab === 'fhe') {
                    setFheSubTab('planner');
                    setActiveTab('fhe');
                  } else if (tab === 'singalong') {
                    setFheSubTab('singalong');
                    setActiveTab('fhe');
                  } else if (tab === 'gratitude') {
                    setFheSubTab('gratitude');
                    setActiveTab('fhe');
                  } else if (tab === 'preparedness') {
                    setPrepSubTab('72hr');
                    setActiveTab('preparedness');
                  } else if (tab === 'food') {
                    setPrepSubTab('food');
                    setActiveTab('preparedness');
                  } else if (tab === 'tithing') {
                    setPrepSubTab('tithing');
                    setActiveTab('preparedness');
                  } else if (tab === 'finance') {
                    setPrepSubTab('finance');
                    setActiveTab('preparedness');
                  } else if (tab === 'coach') {
                    setCoachSubTab('coach');
                    setActiveTab('coach');
                  } else if (tab === 'diagnostic') {
                    setCoachSubTab('diagnostic');
                    setActiveTab('coach');
                  } else if (tab === 'pioneer') {
                    setCoachSubTab('pioneer');
                    setActiveTab('coach');
                  } else if (tab === 'choremarket') {
                    setChoreMarketSubTab('market');
                    setActiveTab('choremarket');
                  } else if (tab === 'swap') {
                    setChoreMarketSubTab('swap');
                    setActiveTab('choremarket');
                  } else {
                    setActiveTab(tab as any);
                  }
                }}
              />
            )}

            {activeTab === 'gospel' && (
              <GospelTracker 
                currentFamily={currentFamily}
                currentMember={currentMember}
                refreshTrigger={refreshTrigger}
                onRefresh={forceRefresh}
              />
            )}

            {activeTab === 'cfm' && (
              <CFMBlock 
                currentFamily={currentFamily}
                currentMember={currentMember}
                refreshTrigger={refreshTrigger}
                onRefresh={forceRefresh}
              />
            )}

            {activeTab === 'chores' && (
              <ChoreSystem 
                currentFamily={currentFamily}
                currentMember={currentMember}
                refreshTrigger={refreshTrigger}
                onRefresh={forceRefresh}
              />
            )}

            {activeTab === 'budget' && (
              <BudgetLedger 
                currentFamily={currentFamily}
                currentMember={currentMember}
                refreshTrigger={refreshTrigger}
                onRefresh={forceRefresh}
              />
            )}

            {activeTab === 'vision' && (
              <VisionBoard 
                currentFamily={currentFamily}
                currentMember={currentMember}
                refreshTrigger={refreshTrigger}
                onRefresh={forceRefresh}
              />
            )}

            {activeTab === 'history' && (
              <FamilyHistory 
                currentFamily={currentFamily}
                currentMember={currentMember}
                refreshTrigger={refreshTrigger}
                onRefresh={forceRefresh}
              />
            )}

            {activeTab === 'journal' && (
              <CouncilJournal 
                currentFamily={currentFamily}
                currentMember={currentMember}
                refreshTrigger={refreshTrigger}
                onRefresh={forceRefresh}
              />
            )}

            {activeTab === 'coach' && (
              <AICoach 
                currentFamily={currentFamily}
                currentMember={currentMember}
                refreshTrigger={refreshTrigger}
                onRefresh={forceRefresh}
                initialSubTab={coachSubTab}
              />
            )}

            {activeTab === 'fhe' && (
              <FHEFunPortal 
                currentFamily={currentFamily}
                currentMember={currentMember}
                refreshTrigger={refreshTrigger}
                onRefresh={forceRefresh}
                initialSubTab={fheSubTab}
              />
            )}

            {activeTab === 'preparedness' && (
              <SelfReliance 
                currentFamily={currentFamily}
                currentMember={currentMember}
                refreshTrigger={refreshTrigger}
                onRefresh={forceRefresh}
                initialSubTab={prepSubTab}
              />
            )}

            {activeTab === 'game' && (
              <FamilyGame 
                currentFamily={currentFamily}
                currentMember={currentMember}
                onRefresh={forceRefresh}
              />
            )}

            {activeTab === 'agenda' && (
              <CouncilAgendaBuilder 
                currentFamily={currentFamily}
                currentMember={currentMember}
                refreshTrigger={refreshTrigger}
                onRefresh={forceRefresh}
              />
            )}

            {activeTab === 'choremarket' && (
              <ChoreMarketplace 
                currentFamily={currentFamily}
                currentMember={currentMember}
                refreshTrigger={refreshTrigger}
                onRefresh={forceRefresh}
                initialSubTab={choreMarketSubTab}
              />
            )}

            {activeTab === 'scripturenarrator' && (
              <DailyScripture />
            )}

            {activeTab === 'kidsvault' && (
              <SavingsVault 
                currentFamily={currentFamily}
                currentMember={currentMember}
                refreshTrigger={refreshTrigger}
                onRefresh={forceRefresh}
              />
            )}

            {activeTab === 'newsletter' && (
              <FamilyNewsletter 
                currentFamily={currentFamily}
                currentMember={currentMember}
                refreshTrigger={refreshTrigger}
              />
            )}

            {activeTab === 'grandparent' && (
              <GrandparentPortal 
                currentFamily={currentFamily}
                currentMember={currentMember}
                refreshTrigger={refreshTrigger}
                onRefresh={forceRefresh}
              />
            )}

            {activeTab === 'mycorner' && (
              <MyCorner 
                currentFamily={currentFamily}
                currentMember={currentMember}
                refreshTrigger={refreshTrigger}
                onRefresh={forceRefresh}
              />
            )}

            {activeTab === 'gospellearning' && (
              <GospelLearning 
                currentFamily={currentFamily}
                currentMember={currentMember}
                refreshTrigger={refreshTrigger}
                onRefresh={forceRefresh}
                initialSubTab={gospelSubTab}
              />
            )}

            {activeTab === 'priesthoodtemple' && (
              <PriesthoodTemple 
                currentFamily={currentFamily}
                currentMember={currentMember}
                refreshTrigger={refreshTrigger}
                onRefresh={forceRefresh}
                initialSubTab={priesthoodSubTab}
              />
            )}
          </>
        ) : (
          activeTab !== 'auth' && (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-secondary)' }}>Please log in or select a family member first.</p>
              <button onClick={() => setActiveTab('auth')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Go to Authentication
              </button>
            </div>
          )
        )}
      </main>
      {/* Switch Profile Modal */}
      {isProfileModalOpen && currentFamily && currentMember && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem'
        }} className="animate-fade-in">
          <div className="glass-card" style={{
            maxWidth: '600px',
            width: '100%',
            padding: '2.5rem',
            textAlign: 'center',
            boxShadow: 'var(--shadow-lg)'
          }}>
            {!selectedSwapMember ? (
              <>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.5rem' }}>Who's Using Family Compass?</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                  Switch to your profile to track your personal goals, daily activities, and points.
                </p>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: allMembers.length > 3 ? 'repeat(auto-fit, minmax(110px, 1fr))' : `repeat(${allMembers.length}, minmax(100px, 120px))`,
                  gap: '1.25rem',
                  justifyContent: 'center',
                  marginBottom: '2rem'
                }}>
                  {allMembers.map(m => {
                    const isSelected = m.id === currentMember.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => isSelected ? null : handleProfileClick(m)}
                        style={{
                          cursor: isSelected ? 'default' : 'pointer',
                          padding: '1.25rem 0.5rem',
                          borderRadius: '16px',
                          border: isSelected ? '2px solid var(--accent-gold)' : '1px solid var(--border-color)',
                          background: isSelected ? 'rgba(var(--accent-gold-rgb), 0.05)' : 'rgba(255, 255, 255, 0.01)',
                          transition: 'var(--transition-smooth)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          opacity: isSelected ? 0.6 : 1
                        }}
                        className={isSelected ? '' : 'glass-card'}
                      >
                        <div style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '50%',
                          backgroundColor: m.role === 'parent' ? 'var(--primary-color)' : 'var(--accent-gold)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '1.25rem',
                          marginBottom: '0.75rem',
                          position: 'relative'
                        }}>
                          {m.name.substring(0, 2).toUpperCase()}
                          {m.password && (
                            <span style={{
                              position: 'absolute',
                              bottom: -2,
                              right: -2,
                              backgroundColor: 'var(--bg-secondary)',
                              borderRadius: '50%',
                              padding: '2px',
                              border: '1px solid var(--border-color)',
                              fontSize: '0.65rem'
                            }}>
                              🔒
                            </span>
                          )}
                        </div>
                        <div style={{ fontWeight: '700', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', whiteSpace: 'nowrap' }}>
                          {m.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: '0.15rem' }}>
                          {m.displayRole || m.role}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', fontWeight: 'bold', marginTop: '0.4rem' }}>
                          🪙 {m.points} pts
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setIsProfileModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ minWidth: '120px' }}
                >
                  Cancel
                </button>
              </>
            ) : isSettingUpPassword ? (
              <form onSubmit={handleSetupSwapPassword} className="animate-fade-in" style={{ textAlign: 'left' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.5rem', textAlign: 'center' }}>
                  🔒 Secure Profile: {selectedSwapMember.name}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                  This profile does not have credentials yet. Please set a password or PIN to secure it from unauthorized family member access.
                </p>

                {swapError && (
                  <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 'bold' }}>
                    ⚠️ {swapError}
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Create Password / PIN</label>
                  <input
                    type="password"
                    placeholder="Enter new password (min 6 characters)"
                    value={setupNewPassword}
                    onChange={(e) => setSetupNewPassword(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                    autoFocus
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Confirm Password / PIN</label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={setupNewPasswordConfirm}
                    onChange={(e) => setSetupNewPasswordConfirm(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    Set Password & Switch
                  </button>
                  <button
                    type="button"
                    onClick={handleSkipPasswordSetup}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Skip & Switch (Unsecured)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSwapMember(null)}
                  className="btn btn-secondary"
                  style={{ width: '100%', marginTop: '1rem' }}
                >
                  ← Back to Profiles
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifySwapPassword} className="animate-fade-in" style={{ textAlign: 'center' }}>
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  backgroundColor: selectedSwapMember.role === 'parent' ? 'var(--primary-color)' : 'var(--accent-gold)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '1.25rem',
                  margin: '0 auto 1rem'
                }}>
                  {selectedSwapMember.name.substring(0, 2).toUpperCase()}
                </div>
                
                <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.5rem' }}>
                  Enter Password / PIN
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  To access <strong>{selectedSwapMember.name}</strong>'s profile, enter their security credentials.
                </p>

                {swapError && (
                  <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.25rem', fontWeight: 'bold' }}>
                    ⚠️ {swapError}
                  </div>
                )}

                <div className="form-group" style={{ maxWidth: '320px', margin: '0 auto 1.5rem' }}>
                  <input
                    type="password"
                    placeholder="Enter password or PIN"
                    value={swapPassword}
                    onChange={(e) => setSwapPassword(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', textAlign: 'center', fontSize: '1.25rem', letterSpacing: '4px' }}
                    autoFocus
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', maxWidth: '320px', margin: '0 auto' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    Unlock Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSwapMember(null)}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Back
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
