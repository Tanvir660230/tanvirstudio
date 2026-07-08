import type { Dispatch, SetStateAction } from 'react';
import { Banknote, Wallet } from 'lucide-react';
import { TransactionList, LedgerPanel } from '../../components/finance/FinanceShared';

const ACCOUNTS = ['bKash', 'Nagad', 'Bank', 'Cash', 'Other'];

export interface TxFilter { type: 'all' | 'in' | 'out'; search: string; category: string }

export interface TransactionsTabProps {
  monthTransactions: any[];
  txFilter: TxFilter;
  setTxFilter: Dispatch<SetStateAction<TxFilter>>;
  txCategories: string[];
  filteredTransactions: any[];
  exportTransactionsCSV: () => void;
  isAdmin: boolean;
  handleDeleteTx: (tx: any) => void;
  monthLabel: string;
  currency: string;
  money: (n: number) => string;
}

export function TransactionsTab({
  monthTransactions, txFilter, setTxFilter, txCategories, filteredTransactions,
  exportTransactionsCSV, isAdmin, handleDeleteTx, monthLabel, currency, money,
}: TransactionsTabProps) {
  const accountBreakdown = ACCOUNTS.map(acc => {
    const txs = monthTransactions.filter((tx: any) => (tx.account || 'bKash') === acc);
    const inflow = txs.filter((tx: any) => tx.type === 'in').reduce((s: number, tx: any) => s + (Number(tx.amount) || 0), 0);
    const outflow = txs.filter((tx: any) => tx.type === 'out').reduce((s: number, tx: any) => s + (Number(tx.amount) || 0), 0);
    return { acc, inflow, outflow, net: inflow - outflow, count: txs.length };
  }).filter(a => a.count > 0);

  return (
    <>
      <LedgerPanel title="Transactions" icon={<Banknote size={18} />} description={`Cash activity recorded in ${monthLabel}.`} actionLabel="↓ Export CSV" onAction={exportTransactionsCSV}>
        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <input
            className="ledger-input"
            style={{ flex: 1, minWidth: 160, fontSize: 13 }}
            placeholder="Search title, note, category…"
            value={txFilter.search}
            onChange={e => setTxFilter(f => ({ ...f, search: e.target.value }))}
          />
          {/* Type toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-color)', borderRadius: 8, padding: 2, gap: 2 }}>
            {(['all', 'in', 'out'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTxFilter(f => ({ ...f, type: t }))}
                style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 800,
                  background: txFilter.type === t ? 'var(--card-bg)' : 'transparent',
                  color: txFilter.type === t
                    ? (t === 'in' ? 'var(--color-success)' : t === 'out' ? 'var(--color-danger)' : 'var(--text-primary)')
                    : 'var(--text-tertiary)',
                  boxShadow: txFilter.type === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >{t === 'all' ? 'All' : t === 'in' ? '↑ In' : '↓ Out'}</button>
            ))}
          </div>
          {/* Category filter */}
          {txCategories.length > 0 && (
            <select
              className="ledger-input"
              style={{ fontSize: 12, fontWeight: 700, minWidth: 120 }}
              value={txFilter.category}
              onChange={e => setTxFilter(f => ({ ...f, category: e.target.value }))}
            >
              <option value="">All categories</option>
              {txCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          )}
          {/* Clear filters */}
          {(txFilter.search || txFilter.type !== 'all' || txFilter.category) && (
            <button
              className="ledger-small-button"
              onClick={() => setTxFilter({ type: 'all', search: '', category: '' })}
              style={{ whiteSpace: 'nowrap' }}
            >Clear</button>
          )}
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {filteredTransactions.length} / {monthTransactions.length}
          </span>
        </div>
        <TransactionList items={filteredTransactions} currency={currency} empty="No transactions match the filter." onDelete={isAdmin ? handleDeleteTx : undefined} />
      </LedgerPanel>
      {accountBreakdown.length > 0 && (
        <LedgerPanel title="Account Breakdown" icon={<Wallet size={18} />} description="Cash flow by payment method this month.">
          <div className="ledger-list">
            {accountBreakdown.map(({ acc, inflow, outflow, net, count }) => (
              <div key={acc} className="ledger-row">
                <div className="ledger-row-icon blue"><Banknote size={18} /></div>
                <div className="ledger-row-main">
                  <div className="ledger-row-title">{acc}</div>
                  <div className="ledger-row-sub">{count} transaction{count !== 1 ? 's' : ''} · In {money(inflow)} · Out {money(outflow)}</div>
                </div>
                <div className="ledger-row-money">
                  <strong style={{ color: net >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{net >= 0 ? '+' : ''}{money(net)}</strong>
                  <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: 500, color: 'var(--text-tertiary)', marginTop: 2 }}>net flow</span>
                </div>
              </div>
            ))}
          </div>
        </LedgerPanel>
      )}
    </>
  );
}
