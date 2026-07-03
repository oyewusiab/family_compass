import React, { useEffect, useState } from 'react';
import { dbService } from '../db';
import type { Family, Member, BudgetItem } from '../types';
import { Plus, Landmark, ArrowUpRight, ArrowDownRight, PiggyBank, FileText } from 'lucide-react';

interface BudgetLedgerProps {
  currentFamily: Family;
  currentMember: Member;
  refreshTrigger: number;
  onRefresh: () => void;
}

export const BudgetLedger: React.FC<BudgetLedgerProps> = ({
  currentFamily,
  currentMember,
  refreshTrigger,
  onRefresh
}) => {
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New ledger form states
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense' | 'savings'>('savings');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const isParent = currentMember.role === 'parent';
  const SAVINGS_TARGET = 500000; // ₦500,000 Goal from prompt

  useEffect(() => {
    const fetchBudget = async () => {
      setLoading(true);
      try {
        const fetchedItems = await dbService.getBudgetItems(currentFamily.id);
        // Sort by date descending
        setBudgetItems(fetchedItems.sort((a, b) => b.date.localeCompare(a.date)));
      } catch (err) {
        console.error('Error fetching budget:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBudget();
  }, [currentFamily.id, refreshTrigger]);

  const handleSubmitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount || !isParent) return;

    try {
      await dbService.createBudgetItem(
        currentFamily.id,
        description.trim(),
        parseFloat(amount),
        type,
        date,
        currentMember.name
      );
      setDescription('');
      setAmount('');
      onRefresh();
    } catch (err) {
      console.error('Failed to log budget item:', err);
    }
  };

  // Math for summary
  const totalIncome = budgetItems.filter(i => i.type === 'income').reduce((acc, i) => acc + i.amount, 0);
  const totalExpenses = budgetItems.filter(i => i.type === 'expense').reduce((acc, i) => acc + i.amount, 0);
  const totalSavings = budgetItems.filter(i => i.type === 'savings').reduce((acc, i) => acc + i.amount, 0);

  // Remaining cash balance is cash that hasn't been set aside for savings or spent
  const cashBalance = totalIncome - totalExpenses - totalSavings;
  const savingsProgressPercent = Math.min(100, Math.round((totalSavings / SAVINGS_TARGET) * 100));

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
        <p>Loading budget ledger...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header section */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800' }}>Family Budget & Savings Ledger</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Track income, manage expenses, and save together for family covenants and education.
        </p>
      </div>

      {/* Summary Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Cash Balance */}
        <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold' }}>
            Available Cash Balance
            <Landmark size={18} color="var(--primary-color)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', marginTop: '0.5rem' }}>
            ₦{cashBalance.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Total cash remaining on hand
          </div>
        </div>

        {/* Savings Goal progress */}
        <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-gold)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold' }}>
            Covenant Savings Fund
            <PiggyBank size={18} color="var(--accent-gold)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', marginTop: '0.5rem', color: 'var(--accent-gold)' }}>
            ₦{totalSavings.toLocaleString()}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            <span>Target: ₦{SAVINGS_TARGET.toLocaleString()}</span>
            <span>{savingsProgressPercent}%</span>
          </div>
          <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', marginTop: '0.5rem', overflow: 'hidden' }}>
            <div style={{ width: `${savingsProgressPercent}%`, height: '100%', backgroundColor: 'var(--accent-gold)', borderRadius: '3px' }}></div>
          </div>
        </div>

        {/* Income Card */}
        <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--success-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold' }}>
            Total Income Logged
            <ArrowUpRight size={18} color="var(--success-color)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', marginTop: '0.5rem' }}>
            ₦{totalIncome.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Cash inflows logged
          </div>
        </div>

        {/* Expense Card */}
        <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--danger-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold' }}>
            Total Expenses Logged
            <ArrowDownRight size={18} color="var(--danger-color)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', marginTop: '0.5rem' }}>
            ₦{totalExpenses.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Cash outflows logged
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>
        {/* Parent Log transaction form */}
        {isParent && (
          <div className="glass-card" style={{ gridColumn: 'span 4', padding: '1.5rem', height: 'fit-content' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={18} color="var(--primary-color)" /> Log a Transaction
            </h3>
            
            <form onSubmit={handleSubmitItem}>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Tithing, Weekly savings deposit, FHE treats..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Amount (₦)</label>
                <input
                  type="number"
                  placeholder="e.g. 10000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as 'income' | 'expense' | 'savings')}
                  className="input-field"
                  style={{ width: '100%', height: '42px' }}
                >
                  <option value="savings">Savings Deposit (₦10,000 weekly decision)</option>
                  <option value="expense">Expense (Outflow)</option>
                  <option value="income">Income (Inflow)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Transaction Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                Log Transaction
              </button>
            </form>
          </div>
        )}

        {/* Ledger logs */}
        <div className="glass-card" style={{ gridColumn: isParent ? 'span 8' : 'span 12', padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} color="var(--primary-color)" /> Family Ledger
          </h3>

          {budgetItems.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0' }}>
              No transactions logged yet. Let parents record income and expenses!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {budgetItems.map((item) => {
                const isSavings = item.type === 'savings';
                const isIncome = item.type === 'income';

                return (
                  <div
                    key={item.id}
                    className="glass-panel"
                    style={{
                      padding: '1rem',
                      borderRadius: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderLeft: isSavings ? '4px solid var(--accent-gold)' : isIncome ? '4px solid var(--success-color)' : '4px solid var(--danger-color)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{item.description}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Logged by: <strong>{item.loggedBy}</strong> • {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontWeight: '800',
                        fontSize: '1.1rem',
                        color: isSavings ? 'var(--accent-gold)' : isIncome ? 'var(--success-color)' : 'var(--danger-color)'
                      }}>
                        {isSavings || isIncome ? '+' : '-'} ₦{item.amount.toLocaleString()}
                      </div>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        color: isSavings ? 'var(--accent-gold)' : isIncome ? 'var(--success-color)' : 'var(--danger-color)'
                      }}>
                        {item.type}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
