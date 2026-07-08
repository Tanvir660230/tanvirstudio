import { Wallet, CheckCircle2 } from 'lucide-react';
import { WorkerDueList, WorkerPaymentHistory, LedgerPanel } from '../../components/finance/FinanceShared';

export interface WorkersTabProps {
  workerRegistry: Record<string, any>;
  currency: string;
  expandedWorker: string | null;
  setExpandedWorker: (id: string | null) => void;
  setPayModal: (worker: any) => void;
  workerPayments: any[];
}

export function WorkersTab({ workerRegistry, currency, expandedWorker, setExpandedWorker, setPayModal, workerPayments }: WorkersTabProps) {
  return (
    <>
      <LedgerPanel title="Worker Payables" icon={<Wallet size={18} />} description="Ready = client cleared (delivered/completed). Waiting = work done but awaiting client clearance.">
        <WorkerDueList registry={workerRegistry} currency={currency} expandedWorker={expandedWorker} setExpandedWorker={setExpandedWorker} onPay={setPayModal} empty="No worker payables right now." />
      </LedgerPanel>

      {workerPayments.length > 0 && (
        <LedgerPanel title="Payment history" icon={<CheckCircle2 size={18} />}>
          <WorkerPaymentHistory payments={workerPayments} currency={currency} />
        </LedgerPanel>
      )}
    </>
  );
}
