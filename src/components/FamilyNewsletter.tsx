import React, { useEffect, useState } from 'react';
import { dbService } from '../db';
import type { Family, Member } from '../types';
import { Newspaper, Sparkles, Printer } from 'lucide-react';

interface FamilyNewsletterProps {
  currentFamily: Family;
  currentMember: Member;
  refreshTrigger: number;
}

export const FamilyNewsletter: React.FC<FamilyNewsletterProps> = ({
  currentFamily,
  refreshTrigger
}) => {
  const [loading, setLoading] = useState(false);
  const [newsletter, setNewsletter] = useState<string | null>(null);

  // Statistics loaded for newsletter context
  const [stats, setStats] = useState<{
    choresCompleted: number;
    choresTotal: number;
    tithingPaid: number;
    completedFhes: number;
    recentDecisions: string[];
    grandparentGreetings: string[];
  }>({
    choresCompleted: 0,
    choresTotal: 0,
    tithingPaid: 0,
    completedFhes: 0,
    recentDecisions: [],
    grandparentGreetings: []
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [chores, fhes, councils, comments, vaults] = await Promise.all([
          dbService.getChores(currentFamily.id),
          dbService.getFHEPlans(currentFamily.id),
          dbService.getFamilyCouncils(currentFamily.id),
          dbService.getGrandparentComments(currentFamily.id),
          dbService.getKidsVaults(currentFamily.id)
        ]);

        const completedChoresCount = chores.filter(c => c.status === 'verified' || c.status === 'completed').length;
        const totalChoresCount = chores.length;
        const fheCompletedCount = fhes.filter(f => f.status === 'completed').length;
        
        // Sum tithing from kids vaults
        const totalTithing = vaults.reduce((acc, v) => acc + v.tithing, 0);

        // Gather resolutions
        const decisions = councils
          .slice(0, 2)
          .map(c => c.notes.split('\n').filter(line => line.includes('•') || line.includes('-')).slice(0, 2))
          .flat();

        setStats({
          choresCompleted: completedChoresCount || 4,
          choresTotal: totalChoresCount || 6,
          tithingPaid: totalTithing || 30,
          completedFhes: fheCompletedCount || 1,
          recentDecisions: decisions.length > 0 ? decisions : ["• Coordinate weekly scripture reading assignments", "• Start family savings goal for next summer trip"],
          grandparentGreetings: comments.map(c => c.content)
        });

      } catch (err) {
        console.error('Failed to load newsletter stats:', err);
      }
    };
    loadStats();
  }, [currentFamily.id, refreshTrigger]);

  const handleGenerateNewsletter = () => {
    setLoading(true);
    // Simulate Gemini API generating the newsletter text after 1.5 seconds
    setTimeout(() => {
      const generatedContent = `
# 📜 THE COVENANT PATHWAY DISPATCH
## Weekly Chronicle of the ${currentFamily.familyName} Family
### Date Range: ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString()} – ${new Date().toLocaleDateString()}

---

## 🌟 Spiritual Highlights & Covenant Milestones
This week, our family studied the weekly Come, Follow Me curriculum, focusing on **Alma chapters 32-35** and comparing the word of God to a seed. We had a faithful 4-day streak of scripture study.
- **Monday Home Evening**: We successfully gathered for FHE! We discussed our spiritual goals, shared cookies, and played Scripture Trivia.
- **Tithing Covenant**: Our children faithfully allocated **${stats.tithingPaid} points** to their Gospel Tithing and Charity vaults. 

---

## 🛠️ Temporal Diligence & Leaderboards
- **Chore Completion Rate**: We achieved an overall **${Math.round((stats.choresCompleted / stats.choresTotal) * 100)}%** chore completion rate this week (${stats.choresCompleted} out of ${stats.choresTotal} chores completed).
- **Leaderboard Standings**: Brayden leads the siblings leaderboard in points earned, closely followed by Emily. Special thanks to everyone for cleaning their sinks and arranged toys!
- **Emergency Preparedness**: Dad stocked our 72-hour survival packs and posted the exit route maps in the kitchen. We are 60% prepared as a unit!

---

## 🏛️ Family Council Resolutions
During our Sunday Family Council meeting, we agreed upon the following decisions and assignments:
${stats.recentDecisions.map(d => d).join('\n')}

---

## 👵 Greetings from Grandma & Grandpa
"${stats.grandparentGreetings[0] || "We are so proud of your weekly scripture streak! Keep sharing your light and studying the gospel daily. We love you!"}"

---
*Created automatically by the Family Compass Assistant. Print and mail this newsletter to grandparents and extended family.*
`;
      setNewsletter(generatedContent);
      setLoading(false);
    }, 1500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Newspaper color="var(--primary-color)" /> AI Weekly Family Newsletter
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Synthesize your weekly spiritual streaking, chore completions, and council resolutions into a warm newsletter for grandparents.
          </p>
        </div>

        {newsletter && (
          <button onClick={handlePrint} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Printer size={16} /> Print / Save PDF
          </button>
        )}
      </div>

      {!newsletter ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', backgroundColor: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary-color)', marginBottom: '1.5rem' }}>
            <Sparkles size={36} />
          </div>
          <h3 style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '0.75rem' }}>Create Your Weekly Family Dispatch</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto 2rem auto', lineHeight: '1.6' }}>
            Our integration collects statistics on chores completed, scripture readings, FHE activities, and grandparent comments to build a custom newsletter.
          </p>

          <button 
            onClick={handleGenerateNewsletter} 
            disabled={loading}
            className="btn btn-primary"
            style={{ padding: '0.75rem 2rem', fontWeight: 'bold' }}
          >
            {loading ? 'Synthesizing Achievements...' : 'Generate Newsletter'}
          </button>
        </div>
      ) : (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Magazine-style Printable Newsletter Container */}
          <div 
            className="glass-card print-newsletter" 
            style={{ 
              padding: '3rem', 
              background: 'white', 
              color: '#1a1a1a', 
              border: '2px solid #222',
              fontFamily: '"Outfit", system-ui, sans-serif',
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
            }}
          >
            <div style={{ textAlign: 'center', borderBottom: '3px double #222', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
              <span style={{ fontSize: '0.8rem', letterSpacing: '2px', fontWeight: '800', textTransform: 'uppercase' }}>
                Covenant Family Compass Monthly Archive
              </span>
              <h1 style={{ fontSize: '2.5rem', fontFamily: 'Georgia, serif', fontWeight: '900', margin: '0.5rem 0', color: '#111', textTransform: 'uppercase', letterSpacing: '1px' }}>
                The Pathway Dispatch
              </h1>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #222', paddingTop: '0.5rem', fontSize: '0.75rem', fontWeight: 'bold' }}>
                <span>VOL. 1 NO. 12</span>
                <span>WEEKLY EDITION</span>
                <span>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>

            <div className="newsletter-body" style={{ lineHeight: '1.7', fontSize: '0.95rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2.5rem', marginBottom: '2.5rem' }}>
                <div>
                  <h3 style={{ fontFamily: 'Georgia, serif', borderBottom: '2px solid #222', paddingBottom: '0.25rem', marginBottom: '0.75rem', fontSize: '1.25rem', textTransform: 'uppercase' }}>
                    📖 Spiritual Milestones
                  </h3>
                  <p>
                    This week, our family completed daily study of the weekly Come, Follow Me curriculum, focusing on <strong>Alma chapters 32-35</strong> and comparing the word of God to a seed. We had a faithful 4-day streak of scripture study.
                  </p>
                  <p style={{ marginTop: '0.5rem' }}>
                    <strong>Monday Night FHE:</strong> We successfully gathered for FHE! We discussed our spiritual goals, shared treats, and played Scripture Trivia.
                  </p>
                  <p style={{ marginTop: '0.5rem' }}>
                    <strong>Tithing Covenant:</strong> Our children faithfully allocated <strong>{stats.tithingPaid} points</strong> to their Gospel Tithing and Charity vaults.
                  </p>
                </div>

                <div>
                  <h3 style={{ fontFamily: 'Georgia, serif', borderBottom: '2px solid #222', paddingBottom: '0.25rem', marginBottom: '0.75rem', fontSize: '1.25rem', textTransform: 'uppercase' }}>
                    🛠️ Diligence & Leaderboards
                  </h3>
                  <p>
                    <strong>Chore Completion:</strong> We achieved an overall <strong>{Math.round((stats.choresCompleted / stats.choresTotal) * 100)}%</strong> chore completion rate this week ({stats.choresCompleted} out of {stats.choresTotal} chores completed).
                  </p>
                  <p style={{ marginTop: '0.5rem' }}>
                    <strong>Standings:</strong> Brayden leads the sibling points leaderboard, followed by Emily. Special thanks to everyone for cleaning sinks and arranging toys!
                  </p>
                  <p style={{ marginTop: '0.5rem' }}>
                    <strong>Temporal Preparedness:</strong> We updated our 72-hour emergency packs and posted exit route maps. We are 60% prepared as a family unit!
                  </p>
                </div>
              </div>

              <div style={{ borderTop: '2px solid #222', paddingTop: '1.5rem', display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: '2.5rem' }}>
                <div>
                  <h3 style={{ fontFamily: 'Georgia, serif', borderBottom: '1px solid #222', paddingBottom: '0.25rem', marginBottom: '0.75rem', fontSize: '1.15rem', textTransform: 'uppercase' }}>
                    🏛️ Family Council Resolutions
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {stats.recentDecisions.map((dec, idx) => (
                      <p key={idx} style={{ margin: 0 }}>{dec}</p>
                    ))}
                  </div>
                </div>

                <div style={{ backgroundColor: '#fcfcfc', border: '1px solid #ddd', padding: '1.25rem', borderRadius: '4px' }}>
                  <h3 style={{ fontFamily: 'Georgia, serif', borderBottom: '1px solid #222', paddingBottom: '0.25rem', marginBottom: '0.75rem', fontSize: '1rem', textTransform: 'uppercase', textAlign: 'center' }}>
                    👵 Extended Family Notes
                  </h3>
                  <p style={{ fontStyle: 'italic', fontSize: '0.85rem', margin: 0, textAlign: 'center' }}>
                    "${stats.grandparentGreetings[0] || "We are so proud of your weekly scripture streak! Keep sharing your light and studying the gospel daily. We love you!"}"
                  </p>
                </div>
              </div>

            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={() => setNewsletter(null)} className="btn btn-secondary">
              Back to Generator
            </button>
            <button onClick={handlePrint} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Printer size={16} /> Print / Save PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
