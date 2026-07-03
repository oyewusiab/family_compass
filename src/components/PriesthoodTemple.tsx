import React, { useState, useEffect } from 'react';
import { dbService } from '../db';
import type { Family, Member, TempleTrip, TestimonyLeaf } from '../types';
import { 
  Calendar, Trash2, Clock, Users
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PriesthoodTempleProps {
  currentFamily: Family;
  currentMember: Member;
  refreshTrigger: number;
  onRefresh: () => void;
  initialSubTab?: string;
}

const ORDINANCES_GUIDE = [
  {
    id: 'sacrament',
    title: 'Sacrament Prayers',
    authority: 'Priest / Melchizedek Priesthood',
    steps: [
      "Kneel in front of the congregation.",
      "Bread Prayer: Read word-for-word from D&C 20:77.",
      "Water/Wine Prayer: Read word-for-word from D&C 20:79."
    ],
    exactWording: "Bread Prayer (D&C 20:77):\n\"O God, the Eternal Father, we ask thee in the name of thy Son, Jesus Christ, to bless and sanctify this bread to the souls of all those who partake of it, that they may eat in remembrance of the body of thy Son, and witness unto thee, O God, the Eternal Father, that they are willing to take upon them the name of thy Son, and always remember him and keep his commandments which he has given them; that they may always have his Spirit to be with them. Amen.\"\n\nWater Prayer (D&C 20:79):\n\"O God, the Eternal Father, we ask thee in the name of thy Son, Jesus Christ, to bless and sanctify this wine [water] to the souls of all those who drink of it, that they may do it in remembrance of the body of thy Son, which was shed for them; that they may witness unto thee, O God, the Eternal Father, that they do always remember him, that they may have his Spirit to be with them. Amen.\""
  },
  {
    id: 'bless_baby',
    title: 'Naming & Blessing a Child',
    authority: 'Melchizedek Priesthood',
    steps: [
      "Brethren stand in a circle and place their hands under the baby.",
      "Address Heavenly Father.",
      "State that the blessing is performed by the authority of the Melchizedek Priesthood.",
      "Give the child a name by which they will be known on church records.",
      "Give a priesthood blessing as guided by the Spirit.",
      "Close in the name of Jesus Christ. Amen."
    ],
    exactWording: "Example Wording:\n\"Our Heavenly Father, we come before Thee at this time... and by the authority of the Holy Melchizedek Priesthood, we bless this child with the name of [Name]... we bless him/her that... we close in the name of Jesus Christ, Amen.\""
  },
  {
    id: 'baptism',
    title: 'Baptism',
    authority: 'Priest / Melchizedek Priesthood',
    steps: [
      "Stand in the water with the candidate.",
      "Hold the candidate's right wrist with your left hand; they hold your left wrist with their right hand.",
      "Raise your right arm to a square.",
      "Pronounce the candidate's full name and recite the baptismal prayer word-for-word.",
      "Immerse the candidate completely in the water.",
      "Help them rise out of the water."
    ],
    exactWording: "Exact Prayer (D&C 20:73):\n\"Having been commissioned of Jesus Christ, I baptize you in the name of the Father, and of the Son, and of the Holy Ghost. Amen.\""
  },
  {
    id: 'confirmation',
    title: 'Confirmation & Gift of the Holy Ghost',
    authority: 'Melchizedek Priesthood',
    steps: [
      "Brethren place their hands lightly on the candidate's head.",
      "Address the candidate by their full name.",
      "State that the ordinance is performed by the authority of the Melchizedek Priesthood.",
      "Confirm them a member of The Church of Jesus Christ of Latter-day Saints.",
      "Say, 'Receive the Holy Ghost.'",
      "Give a blessing as the Spirit directs.",
      "Close in the name of Jesus Christ. Amen."
    ],
    exactWording: "Example Wording:\n\"[Full Name], by the authority of the Melchizedek Priesthood, we confirm you a member of The Church of Jesus Christ of Latter-day Saints; and say unto you, receive the Holy Ghost. We bless you with... in the name of Jesus Christ, Amen.\""
  },
  {
    id: 'sick',
    title: 'Administering to the Sick',
    authority: 'Melchizedek Priesthood (Requires two elders)',
    steps: [
      "Part 1: Anointing with Consecrated Oil. Elder pours a drop of oil on the head, places hands on the head, calls candidate by name, states he is anointing with oil consecrated for the blessing of the sick, and closes in the name of Jesus Christ.",
      "Part 2: Sealing the Anointing. Two or more elders place hands on candidate's head. Elder addressing candidate calls them by name, seals and confirms the anointing, gives a blessing of health/comfort as guided by the Spirit, and closes in the name of Jesus Christ. Amen."
    ],
    exactWording: "Anointing Wording:\n\"[Name], by authority of the Melchizedek Priesthood, I anoint you with this consecrated oil... in the name of Jesus Christ, Amen.\"\n\nSealing Wording:\n\"[Name], by authority of the Melchizedek Priesthood, we seal and confirm this anointing... we bless you that... in the name of Jesus Christ, Amen.\""
  }
];

const SACRAMENT_BREAD_BLANKS = {
  text: "O God, the Eternal Father, we ask thee in the name of thy Son, Jesus Christ, to bless and sanctify this bread to the souls of all those who partake of it, that they may eat in remembrance of the body of thy Son, and witness unto thee, O God, the Eternal Father, that they are willing to take upon them the name of thy Son, and always remember him and keep his commandments which he has given them; that they may always have his Spirit to be with them. Amen.",
  blanks: [
    { idx: 4, correct: 'Father', options: ['Father', 'Creator', 'King'] },
    { idx: 13, correct: 'bless', options: ['bless', 'give', 'break'] },
    { idx: 24, correct: 'remembrance', options: ['remembrance', 'honor', 'fear'] },
    { idx: 37, correct: 'willing', options: ['willing', 'commanded', 'forced'] },
    { idx: 47, correct: 'remember', options: ['remember', 'worship', 'serve'] },
    { idx: 51, correct: 'commandments', options: ['commandments', 'words', 'laws'] }
  ]
};

export const PriesthoodTemple: React.FC<PriesthoodTempleProps> = ({
  currentFamily,
  currentMember,
  refreshTrigger,
  onRefresh,
  initialSubTab = 'priesthood'
}) => {
  const [subTab, setSubTab] = useState(initialSubTab);

  // Ordinance quick ref state
  const [selectedOrdId, setSelectedOrdId] = useState('sacrament');
  const [trainerAnswers, setTrainerAnswers] = useState<Record<number, string>>({});
  const [trainerChecked, setTrainerChecked] = useState(false);
  const [trainerCorrect, setTrainerCorrect] = useState(false);

  // Temple trip planner state
  const [templeTrips, setTempleTrips] = useState<TempleTrip[]>([]);
  const [newTempleName, setNewTempleName] = useState('');
  const [newTripDate, setNewTripDate] = useState('');
  const [newTripTime, setNewTripTime] = useState('');
  const [newTripType, setNewTripType] = useState<'baptisms' | 'endowments' | 'sealings' | 'other'>('baptisms');
  const [newAttendeeCount, setNewAttendeeCount] = useState(1);
  const [newYouthProxies, setNewYouthProxies] = useState('');
  const [newDirections, setNewDirections] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Testimony tree state
  const [testimonies, setTestimonies] = useState<TestimonyLeaf[]>([]);
  const [newTestimonyText, setNewTestimonyText] = useState('');
  const [newTestimonyCat, setNewTestimonyCat] = useState<'savior' | 'prayer' | 'restoration' | 'general'>('savior');
  const [selectedTestimonyLeaf, setSelectedTestimonyLeaf] = useState<TestimonyLeaf | null>(null);

  const [success, setSuccess] = useState('');

  // Load trips & testimonies
  useEffect(() => {
    const loadData = async () => {
      try {
        const fetchedTrips = await dbService.getTempleTrips(currentFamily.id);
        setTempleTrips(fetchedTrips.sort((a, b) => b.tripDate.localeCompare(a.tripDate)));

        const fetchedTestimonies = await dbService.getTestimonyLeaves(currentFamily.id);
        setTestimonies(fetchedTestimonies.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      } catch (err) {
        console.error(err);
      }
    };
    loadData();
  }, [currentFamily.id, refreshTrigger]);

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTempleName.trim() || !newTripDate) return;
    try {
      const proxiesList = newYouthProxies.trim() 
        ? newYouthProxies.split(',').map(n => n.trim()).filter(n => n.length > 0)
        : undefined;

      await dbService.createTempleTrip(
        currentFamily.id,
        newTempleName.trim(),
        newTripDate,
        newTripType,
        newAttendeeCount,
        newTripTime || undefined,
        proxiesList,
        newDirections.trim() || undefined,
        newNotes.trim() || undefined
      );

      setNewTempleName('');
      setNewTripDate('');
      setNewTripTime('');
      setNewAttendeeCount(1);
      setNewYouthProxies('');
      setNewDirections('');
      setNewNotes('');

      setSuccess('Temple trip scheduled in family planner!');
      setTimeout(() => setSuccess(''), 3000);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTripStatus = async (tripId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'scheduled' : 'completed';
    await dbService.updateTempleTripStatus(currentFamily.id, tripId, nextStatus);
    onRefresh();
  };

  const handleVerifySacramentTrainer = () => {
    let allCorrect = true;
    SACRAMENT_BREAD_BLANKS.blanks.forEach((b, idx) => {
      if (trainerAnswers[idx] !== b.correct) {
        allCorrect = false;
      }
    });
    setTrainerCorrect(allCorrect);
    setTrainerChecked(true);

    if (allCorrect) {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    }
  };

  const handleAddTestimony = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestimonyText.trim()) return;
    try {
      await dbService.addTestimonyLeaf(
        currentFamily.id,
        currentMember.id,
        currentMember.name,
        newTestimonyText.trim(),
        newTestimonyCat
      );
      setNewTestimonyText('');
      setSuccess('Testimony hung as a new leaf on the Family Tree!');
      setTimeout(() => setSuccess(''), 3000);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTestimony = async (id: string) => {
    await dbService.deleteTestimonyLeaf(currentFamily.id, id);
    onRefresh();
  };

  const renderSacramentTrainerText = () => {
    const words = SACRAMENT_BREAD_BLANKS.text.split(' ');
    return words.map((w, idx) => {
      const blankIdx = SACRAMENT_BREAD_BLANKS.blanks.findIndex(b => b.idx === idx);
      if (blankIdx !== -1) {
        const blank = SACRAMENT_BREAD_BLANKS.blanks[blankIdx];
        const isCorrect = trainerAnswers[blankIdx] === blank.correct;
        return (
          <span key={idx} style={{ margin: '0 0.25rem', display: 'inline-block' }}>
            <select
              value={trainerAnswers[blankIdx] || ''}
              disabled={trainerChecked && trainerCorrect}
              onChange={(e) => {
                const val = e.target.value;
                setTrainerAnswers(prev => ({ ...prev, [blankIdx]: val }));
              }}
              style={{
                padding: '0.2rem 0.4rem',
                borderRadius: '6px',
                border: trainerChecked
                  ? (isCorrect ? '2px solid var(--success-color)' : '2px solid var(--danger-color)')
                  : '1px solid var(--border-color)',
                fontSize: '0.85rem',
                backgroundColor: 'var(--card-background)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="">???</option>
              {blank.options.map((opt, oIdx) => <option key={oIdx} value={opt}>{opt}</option>)}
            </select>
          </span>
        );
      }
      return <span key={idx} style={{ margin: '0 0.1rem' }}>{w}</span>;
    });
  };

  return (
    <div className="animate-fade-in">
      {/* Top Banner */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800' }}>🏛️ Priesthood & Temple Portal</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Study priesthood ordinance wording guides, schedule temple trips, and look at testimonies of Jesus Christ on the Family Testimony Tree.
        </p>
      </div>

      {/* Tabs list */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem', gap: '0.75rem', flexWrap: 'wrap' }}>
        {[
          { key: 'priesthood', label: '⚔️ Priesthood Reference' },
          { key: 'temple', label: '🏛️ Temple Trip Planner' },
          { key: 'testimony', label: '🌳 Testimony Tree' }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => { setSubTab(t.key); setSuccess(''); }}
            style={{
              padding: '0.75rem 1rem',
              border: 'none',
              background: 'none',
              borderBottom: subTab === t.key ? '3px solid var(--primary-color)' : 'none',
              color: subTab === t.key ? 'var(--primary-color)' : 'var(--text-secondary)',
              fontWeight: subTab === t.key ? '700' : '500',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {success && (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: '600' }}>
          {success}
        </div>
      )}

      {/* Grid Layouts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>

        {/* TAB 1: Priesthood Ordinance Guide */}
        {subTab === 'priesthood' && (
          <>
            <div className="glass-card" style={{ gridColumn: 'span 4', padding: '1.5rem', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.25rem' }}>Ordinances Guide</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {ORDINANCES_GUIDE.map(ord => (
                  <button
                    key={ord.id}
                    onClick={() => setSelectedOrdId(ord.id)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: selectedOrdId === ord.id ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                      background: selectedOrdId === ord.id ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent',
                      color: selectedOrdId === ord.id ? 'var(--primary-color)' : 'var(--text-primary)',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>{ord.title}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{ord.authority}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {(() => {
                const ord = ORDINANCES_GUIDE.find(o => o.id === selectedOrdId)!;
                return (
                  <div className="glass-card" style={{ padding: '2rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent-gold)', textTransform: 'uppercase' }}>
                      Priesthood Ordinance Guide
                    </span>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0.2rem 0 0.5rem 0' }}>{ord.title}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                      Required Authority: <strong>{ord.authority}</strong>
                    </p>

                    <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '0.5rem' }}>Step-by-Step Instructions:</h4>
                    <ol style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
                      {ord.steps.map((s, idx) => <li key={idx} style={{ marginBottom: '0.5rem' }}>{s}</li>)}
                    </ol>

                    <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '0.5rem' }}>Exact Wording:</h4>
                    <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '8px', fontSize: '0.85rem', lineHeight: '1.6', fontFamily: 'Georgia, serif', whiteSpace: 'pre-wrap', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                      {ord.exactWording}
                    </div>
                  </div>
                );
              })()}

              {selectedOrdId === 'sacrament' && (
                <div className="glass-card" style={{ padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.5rem' }}>🍞 Sacrament Wording Trainer</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                    Fill in the blanks to practice reciting the Sacrament bread blessing prayer perfectly.
                  </p>

                  <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', fontSize: '1.05rem', lineHeight: '2', fontFamily: 'Georgia, serif', marginBottom: '1.5rem', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    {renderSacramentTrainerText()}
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => { setTrainerChecked(false); setTrainerAnswers({}); setTrainerCorrect(false); }} 
                      className="btn btn-secondary"
                    >
                      Reset Trainer
                    </button>
                    {!trainerChecked && (
                      <button onClick={handleVerifySacramentTrainer} className="btn btn-primary">
                        Verify Wording
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 2: Temple Trip Planner */}
        {subTab === 'temple' && (
          <>
            <div className="glass-card" style={{ gridColumn: 'span 4', padding: '1.5rem', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.25rem' }}>Schedule Trip</h3>
              <form onSubmit={handleCreateTrip} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Temple Name</label>
                  <input
                    type="text"
                    placeholder="Salt Lake Temple"
                    value={newTempleName}
                    onChange={(e) => setNewTempleName(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Ordinance Type</label>
                  <select
                    value={newTripType}
                    onChange={(e) => setNewTripType(e.target.value as any)}
                    className="input-field"
                    style={{ width: '100%' }}
                  >
                    <option value="baptisms">Proxy Baptisms & Confirmations</option>
                    <option value="endowments">Endowments</option>
                    <option value="sealings">Sealings</option>
                    <option value="other">Initiatories</option>
                  </select>
                </div>

                <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label className="form-label">Date</label>
                    <input
                      type="date"
                      value={newTripDate}
                      onChange={(e) => setNewTripDate(e.target.value)}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label className="form-label">Time</label>
                    <input
                      type="time"
                      value={newTripTime}
                      onChange={(e) => setNewTripTime(e.target.value)}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Attendee Count</label>
                  <input
                    type="number"
                    min="1"
                    value={newAttendeeCount}
                    onChange={(e) => setNewAttendeeCount(Number(e.target.value))}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Youth Proxies (Comma separated names)</label>
                  <input
                    type="text"
                    placeholder="E.g., Jacob, Sarah, Tyler"
                    value={newYouthProxies}
                    onChange={(e) => setNewYouthProxies(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Driving Directions / Logistics</label>
                  <textarea
                    placeholder="E.g., Meet at ward parking lot at 7:00 AM..."
                    value={newDirections}
                    onChange={(e) => setNewDirections(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', minHeight: '60px', fontSize: '0.8rem' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Trip Notes / Names for Ordinances</label>
                  <textarea
                    placeholder="Family names to perform ordinances for..."
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', minHeight: '60px', fontSize: '0.8rem' }}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  Schedule Temple Trip
                </button>
              </form>
            </div>

            <div className="glass-card" style={{ gridColumn: 'span 8', padding: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>📅 Scheduled Family Temple Trips</h3>
              {templeTrips.length === 0 ? (
                <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No temple trips scheduled yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {templeTrips.map(trip => (
                    <div 
                      key={trip.id} 
                      className="glass-panel" 
                      style={{ 
                        padding: '1.5rem', 
                        borderLeft: trip.status === 'completed' ? '4px solid var(--success-color)' : '4px solid var(--primary-color)' 
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div>
                          <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{trip.templeName}</strong>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '8px', 
                            marginLeft: '0.75rem', 
                            backgroundColor: trip.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(37, 99, 235, 0.1)',
                            color: trip.status === 'completed' ? 'var(--success-color)' : 'var(--primary-color)',
                            textTransform: 'uppercase',
                            fontWeight: 'bold'
                          }}>
                            {trip.type}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleToggleTripStatus(trip.id, trip.status)}
                            className={`btn ${trip.status === 'completed' ? 'btn-secondary' : 'btn-primary'}`}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            {trip.status === 'completed' ? 'Mark Scheduled' : 'Mark Completed'}
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={14} /> <span>Date: {trip.tripDate}</span>
                        </div>
                        {trip.tripTime && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Clock size={14} /> <span>Time: {trip.tripTime}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Users size={14} /> <span>Attendees: {trip.attendeeCount}</span>
                        </div>
                      </div>

                      {trip.youthProxies && trip.youthProxies.length > 0 && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                          <strong>Youth Proxies:</strong> {trip.youthProxies.join(', ')}
                        </div>
                      )}

                      {trip.drivingDirections && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', backgroundColor: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '6px', marginBottom: '0.5rem' }}>
                          <strong>Logistics:</strong> {trip.drivingDirections}
                        </div>
                      )}

                      {trip.notes && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          <strong>Notes:</strong> {trip.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 3: Testimony Tree */}
        {subTab === 'testimony' && (
          <>
            <div className="glass-card" style={{ gridColumn: 'span 8', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', alignSelf: 'flex-start', marginBottom: '0.5rem' }}>🌳 Family Testimony Tree</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', alignSelf: 'flex-start', marginBottom: '1.5rem' }}>
                testimonies hung as clickable leaves. Click any glowing leaf to expand and read.
              </p>

              <div 
                style={{ 
                  width: '100%', 
                  maxWidth: '500px', 
                  height: '350px', 
                  position: 'relative', 
                  backgroundColor: 'rgba(255,255,255,0.01)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '16px',
                  overflow: 'hidden'
                }}
              >
                <svg width="100%" height="100%" viewBox="0 0 500 350" style={{ display: 'block' }}>
                  <path d="M225,350 L275,350 L260,250 L240,250 Z" fill="#854d0e" />
                  <path d="M250,250 C220,200 180,180 150,190 C180,160 210,170 240,210 Z" fill="#854d0e" />
                  <path d="M250,250 C280,200 320,180 350,190 C320,160 290,170 260,210 Z" fill="#854d0e" />
                  <path d="M250,210 C250,150 220,100 200,90 C220,90 240,110 250,140 Z" fill="#854d0e" />
                  <path d="M250,210 C250,150 280,100 300,90 C280,90 260,110 250,140 Z" fill="#854d0e" />

                  {testimonies.map((leaf, idx) => {
                    const angle = (idx * 1.9) % (2 * Math.PI);
                    const distance = 60 + (idx * 12) % 110;
                    const cx = 250 + Math.sin(angle) * distance;
                    const cy = 180 + Math.cos(angle) * (distance * 0.6) - 50;

                    const fillVal = leaf.category === 'savior' ? '#fbbf24' : leaf.category === 'prayer' ? '#34d399' : leaf.category === 'restoration' ? '#60a5fa' : '#a78bfa';

                    return (
                      <g 
                        key={leaf.id}
                        onClick={() => setSelectedTestimonyLeaf(leaf)}
                        style={{ cursor: 'pointer' }}
                      >
                        <circle cx={cx} cy={cy} r="10" fill={fillVal} opacity="0.4" style={{ filter: 'blur(3px)' }} />
                        <path 
                          d={`M${cx},${cy-6} C${cx+6},${cy-2} ${cx+6},${cy+2} ${cx},${cy+6} C${cx-6},${cy+2} ${cx-6},${cy-2} ${cx},${cy-6} Z`} 
                          fill={fillVal}
                          stroke="#ffffff"
                          strokeWidth="0.5"
                        />
                        <title>{leaf.memberName} - {leaf.category}</title>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {selectedTestimonyLeaf && (
                <div className="glass-panel" style={{ width: '100%', marginTop: '1.5rem', padding: '1.25rem', position: 'relative', borderLeft: '4px solid var(--accent-gold)' }}>
                  <button 
                    onClick={() => setSelectedTestimonyLeaf(null)}
                    style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    ✕ Close
                  </button>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    <span>By: <strong>{selectedTestimonyLeaf.memberName}</strong></span>
                    <span>{new Date(selectedTestimonyLeaf.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p style={{ fontSize: '0.9rem', lineHeight: '1.5', fontStyle: 'italic', color: 'var(--text-primary)' }}>
                    "{selectedTestimonyLeaf.text}"
                  </p>
                  
                  {currentMember.id === selectedTestimonyLeaf.memberId && (
                    <button
                      onClick={() => { handleDeleteTestimony(selectedTestimonyLeaf.id); setSelectedTestimonyLeaf(null); }}
                      className="btn btn-secondary"
                      style={{ marginTop: '0.75rem', padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <Trash2 size={12} /> Remove Leaf
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="glass-card" style={{ gridColumn: 'span 4', padding: '1.5rem', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.25rem' }}>Add Testimony</h3>
              <form onSubmit={handleAddTestimony} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    value={newTestimonyCat}
                    onChange={(e) => setNewTestimonyCat(e.target.value as any)}
                    className="input-field"
                    style={{ width: '100%' }}
                  >
                    <option value="savior">Testimony of Jesus Christ (Gold Leaf) 💛</option>
                    <option value="prayer">Answered Prayer / Gratitude (Green Leaf) 💚</option>
                    <option value="restoration">The Restoration (Blue Leaf) 💙</option>
                    <option value="general">General Gospel Principles (Purple Leaf) 💜</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Your Testimony / Faith Record</label>
                  <textarea
                    placeholder="Write a brief testimony of your faith (1-2 sentences)..."
                    value={newTestimonyText}
                    onChange={(e) => setNewTestimonyText(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', minHeight: '120px', fontSize: '0.85rem' }}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  Hang Testimony Leaf
                </button>
              </form>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
