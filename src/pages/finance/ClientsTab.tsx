import { Bell } from 'lucide-react';
import { ClientDueList, LedgerPanel } from '../../components/finance/FinanceShared';

export interface ClientsTabProps {
  clientDues: any[];
  currency: string;
  setInvoiceTask: (task: any) => void;
  handleSendReminder: (task: any, daysOverdue: number) => void;
  studioName?: string;
}

export function ClientsTab({ clientDues, currency, setInvoiceTask, handleSendReminder, studioName }: ClientsTabProps) {
  return (
    <LedgerPanel title="Client Dues" icon={<Bell size={18} />} description="All unpaid projects stay visible here until fully collected.">
      <ClientDueList items={clientDues} currency={currency} onInvoice={setInvoiceTask} onRemind={handleSendReminder} studioName={studioName} empty="No unpaid client projects." />
    </LedgerPanel>
  );
}
