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

  const handleProfileSwap = (memberId: string) => {
    const selected = allMembers.find(m => m.id === memberId);
    if (selected && currentFamily) {
      setCurrentMember(selected);
      localStorage.setItem('fc_current_member', JSON.stringify(selected));
      setRefreshTrigger(prev => prev + 1);
    }
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
              <label style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                Profile Quick-Swap
              </label>
              <select
                value={currentMember.id}
                onChange={(e) => handleProfileSwap(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.3rem',
                  fontSize: '0.75rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {allMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role === 'parent' ? 'Parent' : 'Child'})
                  </option>
                ))}
              </select>
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
    </div>
  );
};
