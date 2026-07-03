import React, { useEffect, useState } from 'react';
import { dbService } from '../db';
import type { Family, Member, SelfRelianceItem, FoodStorageItem, TithingRecord } from '../types';
import { 
  Shield, Edit2, Trash2 
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SelfRelianceProps {
  currentFamily: Family;
  currentMember: Member;
  refreshTrigger: number;
  onRefresh: () => void;
  initialSubTab?: string;
}

export const SelfReliance: React.FC<SelfRelianceProps> = ({
  currentFamily,
  currentMember,
  refreshTrigger,
  onRefresh,
  initialSubTab = '72hr'
}) => {
  const [items, setItems] = useState<SelfRelianceItem[]>([]);
  const [foodStorage, setFoodStorage] = useState<FoodStorageItem[]>([]);
  const [tithingRecords, setTithingRecords] = useState<TithingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Active tab inside preparedness
  const [activeTab, setActiveTab] = useState<'72hr' | 'food' | 'tithing' | 'finance' | 'drills' | 'budget'>(initialSubTab as any);
  
  // Note editing states (checklists)
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');

  // Food Storage Form states
  const [newFoodName, setNewFoodName] = useState('');
  const [newFoodCat, setNewFoodCat] = useState<'water' | 'wheat' | 'canned' | 'other'>('canned');
  const [newFoodQty, setNewFoodQty] = useState(1);
  const [newFoodUnit, setNewFoodUnit] = useState('cans');
  const [newFoodExpiry, setNewFoodExpiry] = useState('');

  // Tithing Calculator Form states
  const [tithingEarning, setTithingEarning] = useState(0);
  const [tithingAmount, setTithingAmount] = useState(0);
  const [fastOffering, setFastOffering] = useState(0);
  const [missionaryFund, setMissionaryFund] = useState(0);
  const [humanitarianAid, setHumanitarianAid] = useState(0);

  const [sandboxIncome, setSandboxIncome] = useState(100);
  const [sandboxTithing, setSandboxTithing] = useState(10);
  const [sandboxSavings, setSandboxSavings] = useState(10);
  const [sandboxRent, setSandboxRent] = useState(30);
  const [sandboxFood, setSandboxFood] = useState(25);
  const [sandboxFun, setSandboxFun] = useState(15);

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const [fetchedChecklists, fetchedFood, fetchedTithing] = await Promise.all([
          dbService.getSelfRelianceItems(currentFamily.id),
          dbService.getFoodStorage(currentFamily.id),
          dbService.getTithingRecords(currentFamily.id)
        ]);
        setItems(fetchedChecklists);
        setFoodStorage(fetchedFood);
        setTithingRecords(fetchedTithing.sort((a, b) => b.date.localeCompare(a.date)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [currentFamily.id, refreshTrigger]);

  const handleToggleItem = async (itemId: string, isCompleted: boolean) => {
    await dbService.updateSelfRelianceItem(currentFamily.id, itemId, !isCompleted);
    onRefresh();
  };

  const handleSaveNotes = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    await dbService.updateSelfRelianceItem(currentFamily.id, itemId, item.isCompleted, editNotes);
    setEditingItemId(null);
    setSuccess('Notes updated successfully!');
    setTimeout(() => setSuccess(''), 3000);
    onRefresh();
  };

  // Add food storage item
  const handleAddFoodStorage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFoodName.trim() || !newFoodExpiry) return;

    await dbService.addFoodStorageItem(currentFamily.id, {
      itemName: newFoodName.trim(),
      category: newFoodCat,
      quantity: newFoodQty,
      unit: newFoodUnit,
      expiryDate: newFoodExpiry,
      familyId: currentFamily.id
    });

    setNewFoodName('');
    setNewFoodExpiry('');
    setSuccess('Food storage item added to inventory!');
    setTimeout(() => setSuccess(''), 3000);
    onRefresh();
  };

  const handleDeleteFoodItem = async (id: string) => {
    await dbService.deleteFoodStorageItem(currentFamily.id, id);
    onRefresh();
  };

  // Handle tithing calculator slip submission
  const handleFileTithing = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const totalDonation = tithingAmount + fastOffering + missionaryFund + humanitarianAid;
    if (totalDonation <= 0) {
      setError('Please allocate positive values to file donation.');
      return;
    }

    try {
      // Deduct points from child's points wallet if they are paying with points
      if (currentMember.points >= totalDonation) {
        await dbService.updateMemberPoints(currentFamily.id, currentMember.id, -totalDonation);
      }

      await dbService.addTithingRecord(currentFamily.id, {
        memberId: currentMember.id,
        memberName: currentMember.name,
        tithing: tithingAmount,
        fastOffering,
        missionary: missionaryFund,
        humanitarian: humanitarianAid,
        date: new Date().toISOString().split('T')[0],
        familyId: currentFamily.id
      });

      setTithingEarning(0);
      setTithingAmount(0);
      setFastOffering(0);
      setMissionaryFund(0);
      setHumanitarianAid(0);

      confetti({ particleCount: 100, spread: 80 });
      setSuccess('Tithing and offerings donation processed successfully! Thank you for your faithful stewardship.');
      setTimeout(() => setSuccess(''), 4000);
      onRefresh();
    } catch (err) {
      setError('Failed to log tithing record.');
    }
  };

  // Helper to check food expiry status
  const isExpiringSoon = (expiryStr: string) => {
    const today = new Date();
    const expiry = new Date(expiryStr);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30; // expiring in next 30 days
  };

  // Auto-calculated fields for tithing calculator helper
  const handleEarningsChange = (val: number) => {
    setTithingEarning(val);
    setTithingAmount(Math.round(val * 0.1)); // 10% calculated tithing target
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
        <p>Loading preparedness companion...</p>
      </div>
    );
  }

  // Filter items by category tab
  const filteredChecklist = items.filter(item => {
    if (activeTab === '72hr') return item.category === '72hr_pack';
    if (activeTab === 'drills') return item.category === 'fire_drill';
    if (activeTab === 'budget') return item.category === 'budget_goal';
    return false;
  });

  const getProgress = (cat: '72hr_pack' | 'fire_drill' | 'budget_goal') => {
    const catItems = items.filter(i => i.category === cat);
    if (catItems.length === 0) return 0;
    const completed = catItems.filter(i => i.isCompleted).length;
    return Math.round((completed / catItems.length) * 100);
  };

  // Finance Sandbox Calculations
  const sandboxTotalAllocated = sandboxTithing + sandboxSavings + sandboxRent + sandboxFood + sandboxFun;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield color="var(--primary-color)" /> Stewardship & Self-Reliance
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Organize emergency supply checklists, track food storage shelf rotation, pay tithing, and learn financial budgeting.
        </p>
      </div>

      {/* Tabs */}
      <div className="tab-container" style={{ flexWrap: 'wrap' }}>
        {[
          { key: '72hr', label: '🎒 72-Hour Kits' },
          { key: 'food', label: '🌾 Food Storage' },
          { key: 'tithing', label: '💸 Tithing Calculator' },
          { key: 'finance', label: '📈 Finance Simulator' },
          { key: 'drills', label: '🔥 Safety Drills' },
          { key: 'budget', label: '💰 Budget Checklists' }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key as any); setError(''); setSuccess(''); }}
            className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
          >
            {t.label}
          </button>
        ))}
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

      {/* Grid Layouts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>

        {/* 1. CHECKLIST VIEWS (72hr, Drills, Budget checklists) */}
        {(activeTab === '72hr' || activeTab === 'drills' || activeTab === 'budget') && (
          <>
            <div className="glass-card" style={{ gridColumn: 'span 4', padding: '1.5rem', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '0.75rem' }}>Preparedness Progress</h3>
              
              {activeTab === '72hr' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    <span>🎒 72-Hour Kits checklist</span>
                    <strong>{getProgress('72hr_pack')}%</strong>
                  </div>
                  <div style={{ height: '8px', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', overflow: 'hidden' }}>
                    <div style={{ width: `${getProgress('72hr_pack')}%`, height: '100%', backgroundColor: 'var(--success-color)', transition: 'width 0.3s' }} />
                  </div>
                </div>
              )}

              {activeTab === 'drills' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    <span>🔥 Safety Drills completed</span>
                    <strong>{getProgress('fire_drill')}%</strong>
                  </div>
                  <div style={{ height: '8px', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', overflow: 'hidden' }}>
                    <div style={{ width: `${getProgress('fire_drill')}%`, height: '100%', backgroundColor: 'var(--success-color)', transition: 'width 0.3s' }} />
                  </div>
                </div>
              )}

              {activeTab === 'budget' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    <span>💰 Personal finance goals</span>
                    <strong>{getProgress('budget_goal')}%</strong>
                  </div>
                  <div style={{ height: '8px', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', overflow: 'hidden' }}>
                    <div style={{ width: `${getProgress('budget_goal')}%`, height: '100%', backgroundColor: 'var(--success-color)', transition: 'width 0.3s' }} />
                  </div>
                </div>
              )}
            </div>

            <div className="glass-card" style={{ gridColumn: 'span 8', padding: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.25rem' }}>
                📋 {activeTab === '72hr' ? 'Family Emergency Kit Tasks' : activeTab === 'drills' ? 'Safety Drills & Action Plans' : 'Personal Finance Setup'}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredChecklist.map(item => (
                  <div key={item.id} className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={item.isCompleted}
                        onChange={() => handleToggleItem(item.id, item.isCompleted)}
                        style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: '0.9rem', color: item.isCompleted ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: item.isCompleted ? 'line-through' : 'none' }}>
                          {item.title}
                        </strong>
                        {editingItemId === item.id ? (
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <input
                              type="text"
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              className="input-field"
                              style={{ flex: 1, height: '30px', fontSize: '0.8rem' }}
                            />
                            <button onClick={() => handleSaveNotes(item.id)} className="btn btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>Save</button>
                            <button onClick={() => setEditingItemId(null)} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>Cancel</button>
                          </div>
                        ) : (
                          item.notes && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{item.notes}</div>
                        )}
                      </div>
                    </div>

                    {!item.isCompleted && editingItemId !== item.id && (
                      <button 
                        onClick={() => { setEditingItemId(item.id); setEditNotes(item.notes || ''); }} 
                        className="btn btn-secondary" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <Edit2 size={12} /> Notes
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 2. FOOD STORAGE INVENTORY */}
        {activeTab === 'food' && (
          <>
            {/* Add Food Storage Form */}
            <div className="glass-card" style={{ gridColumn: 'span 4', padding: '1.5rem', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '1.25rem' }}>Add Storage Item</h3>
              
              <form onSubmit={handleAddFoodStorage} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Item Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Red Winter Wheat, Dry Oats..."
                    value={newFoodName}
                    onChange={(e) => setNewFoodName(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    value={newFoodCat}
                    onChange={(e) => setNewFoodCat(e.target.value as any)}
                    className="input-field"
                    style={{ width: '100%' }}
                  >
                    <option value="canned">Canned Goods</option>
                    <option value="wheat">Wheat & Grains</option>
                    <option value="water">Water Storage</option>
                    <option value="other">Other Dry Goods</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={newFoodQty}
                      onChange={(e) => setNewFoodQty(Number(e.target.value))}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit</label>
                    <input
                      type="text"
                      placeholder="e.g. cans, lbs, gallons"
                      value={newFoodUnit}
                      onChange={(e) => setNewFoodUnit(e.target.value)}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Expiration Date</label>
                  <input
                    type="date"
                    value={newFoodExpiry}
                    onChange={(e) => setNewFoodExpiry(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  Add to Inventory
                </button>
              </form>
            </div>

            {/* Inventory table & Rotation list */}
            <div className="glass-card" style={{ gridColumn: 'span 8', padding: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.25rem' }}>🌾 Home Emergency Food Storage</h3>
              
              {foodStorage.length === 0 ? (
                <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No food storage items logged.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '0.5rem' }}>Item</th>
                        <th style={{ padding: '0.5rem' }}>Category</th>
                        <th style={{ padding: '0.5rem' }}>Stock</th>
                        <th style={{ padding: '0.5rem' }}>Expires</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {foodStorage.map(item => {
                        const expiring = isExpiringSoon(item.expiryDate);
                        return (
                          <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: expiring ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                            <td style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold' }}>
                              {item.itemName} {expiring && '⚠️'}
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem', textTransform: 'capitalize' }}>{item.category}</td>
                            <td style={{ padding: '0.75rem 0.5rem' }}>{item.quantity} {item.unit}</td>
                            <td style={{ padding: '0.75rem 0.5rem', color: expiring ? 'var(--danger-color)' : 'var(--text-secondary)' }}>
                              {item.expiryDate} {expiring && '(Expiring Soon)'}
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                              <button onClick={() => handleDeleteFoodItem(item.id)} style={{ border: 'none', background: 'none', color: 'var(--danger-color)', cursor: 'pointer' }}>
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Restock rotation warning alerts */}
                  {foodStorage.some(i => isExpiringSoon(i.expiryDate)) && (
                    <div className="glass-panel" style={{ padding: '1rem', borderLeft: '4px solid var(--danger-color)', backgroundColor: 'rgba(239, 68, 68, 0.02)' }}>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--danger-color)', display: 'block', marginBottom: '0.35rem' }}>
                        ⚠️ Rotation Alerts (Grocery List Restock Items):
                      </strong>
                      <ul style={{ paddingLeft: '1.25rem', fontSize: '0.75rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                        {foodStorage.filter(i => isExpiringSoon(i.expiryDate)).map(item => (
                          <li key={item.id}>
                            Rotate & consume: <strong>{item.itemName}</strong> (Expiring {item.expiryDate}) - Add replacement to grocery restock list.
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
              )}
            </div>
          </>
        )}

        {/* 3. TITHING CALCULATOR */}
        {activeTab === 'tithing' && (
          <>
            {/* Tithing Slip Form */}
            <div className="glass-card" style={{ gridColumn: 'span 7', padding: '2rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent-gold)', textTransform: 'uppercase' }}>Tithing Slip Simulator</span>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginTop: '0.2rem', marginBottom: '1.5rem' }}>💸 Law of Consecration slipping</h3>
              
              <form onSubmit={handleFileTithing} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', alignItems: 'flex-end' }}>
                  <div>
                    <label className="form-label">Simulate Income Earnings</label>
                    <input
                      type="number"
                      min="0"
                      value={tithingEarning}
                      onChange={(e) => handleEarningsChange(Number(e.target.value))}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingBottom: '0.5rem' }}>
                    Calculated Tithing (10%): <strong>{Math.round(tithingEarning * 0.1)} pts</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '12px' }}>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--primary-color)' }}>LDS Donation slip simulator</strong>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem' }}>Tithing (10%)</span>
                    <input
                      type="number"
                      min="0"
                      value={tithingAmount}
                      onChange={(e) => setTithingAmount(Number(e.target.value))}
                      className="input-field"
                      style={{ width: '100px', height: '32px', textAlign: 'right' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem' }}>Fast Offerings (Poor & Needy)</span>
                    <input
                      type="number"
                      min="0"
                      value={fastOffering}
                      onChange={(e) => setFastOffering(Number(e.target.value))}
                      className="input-field"
                      style={{ width: '100px', height: '32px', textAlign: 'right' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem' }}>Ward Missionary Fund</span>
                    <input
                      type="number"
                      min="0"
                      value={missionaryFund}
                      onChange={(e) => setMissionaryFund(Number(e.target.value))}
                      className="input-field"
                      style={{ width: '100px', height: '32px', textAlign: 'right' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem' }}>Humanitarian Aid</span>
                    <input
                      type="number"
                      min="0"
                      value={humanitarianAid}
                      onChange={(e) => setHumanitarianAid(Number(e.target.value))}
                      className="input-field"
                      style={{ width: '100px', height: '32px', textAlign: 'right' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', fontWeight: 'bold' }}>
                    <span>Total Donation:</span>
                    <span>{tithingAmount + fastOffering + missionaryFund + humanitarianAid} pts</span>
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Your Balance: <strong>{currentMember.points} Points</strong>. (Filing tithing will deduct points from your actual score).
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  Submit Tithing Donation slip
                </button>
              </form>
            </div>

            {/* Donation Records */}
            <div className="glass-card" style={{ gridColumn: 'span 5', padding: '2rem', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '1.25rem' }}>📜 Family Donation History</h3>
              {tithingRecords.length === 0 ? (
                <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No tithing slips filed yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {tithingRecords.map(rec => (
                    <div key={rec.id} className="glass-panel" style={{ padding: '0.85rem', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '0.35rem' }}>
                        <span>{rec.memberName}</span>
                        <span style={{ color: 'var(--primary-color)' }}>+{rec.tithing + rec.fastOffering + rec.missionary + rec.humanitarian} pts</span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        <div>Tithing: {rec.tithing} | Fast Offering: {rec.fastOffering}</div>
                        <div>Humanitarian: {rec.humanitarian} | Date: {rec.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* 4. BUDGET FINANCE SIMULATOR */}
        {activeTab === 'finance' && (
          <div className="glass-card" style={{ gridColumn: 'span 12', padding: '2.5rem' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '0.5rem' }}>📈 Stewardship Personal Finance Simulator</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '2rem' }}>
              Learn how to budget like a faithful steward. Enter your mock monthly earnings, pay tithing first, save, and allocate expenses.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
              
              {/* Sliders sandbox */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Simulated Monthly Income</span>
                    <strong>{sandboxIncome} pts</strong>
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="1000"
                    step="50"
                    value={sandboxIncome}
                    onChange={(e) => setSandboxIncome(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="form-group" style={{ paddingLeft: '1rem', borderLeft: '3px solid var(--accent-gold)' }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>1. Tithing (10% target)</span>
                    <strong>{sandboxTithing} pts</strong>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={sandboxIncome}
                    value={sandboxTithing}
                    onChange={(e) => setSandboxTithing(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="form-group" style={{ paddingLeft: '1rem', borderLeft: '3px solid var(--success-color)' }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>2. Savings (10% target)</span>
                    <strong>{sandboxSavings} pts</strong>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={sandboxIncome}
                    value={sandboxSavings}
                    onChange={(e) => setSandboxSavings(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>3. Rent / Housing</span>
                    <strong>{sandboxRent} pts</strong>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={sandboxIncome}
                    value={sandboxRent}
                    onChange={(e) => setSandboxRent(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>4. Food & Necessities</span>
                    <strong>{sandboxFood} pts</strong>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={sandboxIncome}
                    value={sandboxFood}
                    onChange={(e) => setSandboxFood(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>5. Fun & Recreation</span>
                    <strong>{sandboxFun} pts</strong>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={sandboxIncome}
                    value={sandboxFun}
                    onChange={(e) => setSandboxFun(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Budget breakdown summary */}
              <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--primary-color)' }}>
                    Budget Balance Diagnostic
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Income:</span>
                      <strong>{sandboxIncome} pts</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-gold)' }}>
                      <span>Tithing:</span>
                      <strong>-{sandboxTithing} pts ({Math.round((sandboxTithing / sandboxIncome)*100)}%)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success-color)' }}>
                      <span>Savings:</span>
                      <strong>-{sandboxSavings} pts ({Math.round((sandboxSavings / sandboxIncome)*100)}%)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Expenses (Rent, Food, Fun):</span>
                      <strong>-{sandboxRent + sandboxFood + sandboxFun} pts</strong>
                    </div>
                    
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.05rem' }}>
                      <span>Remaining:</span>
                      <span style={{ color: sandboxIncome - sandboxTotalAllocated >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                        {sandboxIncome - sandboxTotalAllocated} pts
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '2rem' }}>
                  {sandboxIncome - sandboxTotalAllocated === 0 ? (
                    <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', padding: '1rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '600' }}>
                      🌟 Budget Balanced! You allocated 100% of your earnings exactly.
                    </div>
                  ) : sandboxIncome - sandboxTotalAllocated > 0 ? (
                    <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-color)', padding: '1rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '600' }}>
                      💰 Surplus: You have {sandboxIncome - sandboxTotalAllocated} pts remaining. Try putting it into your Savings or Fast Offering!
                    </div>
                  ) : (
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', padding: '1rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '600' }}>
                      🚨 Deficit: You overspent by {Math.abs(sandboxIncome - sandboxTotalAllocated)} pts! Reduce your Fun or Rent expenses to balance the budget.
                    </div>
                  )}

                  {/* Financial lesson tip */}
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1rem', fontStyle: 'italic', lineHeight: '1.4' }}>
                    Lesson: Paying a honest 10% tithing first helps us recognize that all we have comes from God, encouraging us to manage the remaining 90% wisely.
                  </p>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
