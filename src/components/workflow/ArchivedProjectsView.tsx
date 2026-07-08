import { CheckCircle2 } from 'lucide-react';
import { SortableTask } from '../SortableTask';

interface ArchivedProjectsViewProps {
  filteredTasks: any[];
  isArchiveReady: (task: any) => boolean;
  userRole: string | undefined;
  currency: string;
  openDetails: (task: any) => void;
  navigate: (path: string) => void;
}

export function ArchivedProjectsView({
  filteredTasks,
  isArchiveReady,
  userRole,
  currency,
  openDetails,
  navigate,
}: ArchivedProjectsViewProps) {
  const completedTasks = filteredTasks.filter((t: any) => isArchiveReady(t));

  if (completedTasks.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary)' }}>
          <CheckCircle2 size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>No archived projects yet</div>
          <div style={{ fontSize: '14px', marginTop: '8px' }}>Projects archive after 7 days and full client payment clearance.</div>
        </div>
      </div>
    );
  }

  // Group by Month and Year
  const grouped = completedTasks.reduce((acc: any, task: any) => {
    const dateObj = task.completedAt ? new Date(task.completedAt) : (task.createdAt ? new Date(task.createdAt) : new Date());
    const monthYear = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!acc[monthYear]) acc[monthYear] = [];
    acc[monthYear].push(task);
    return acc;
  }, {});

  // Sort groups by newest first
  const sortedMonths = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {sortedMonths.map(month => (
        <div key={month} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            {month} <span style={{ color: 'var(--text-tertiary)', fontSize: '13px', marginLeft: '8px', fontWeight: '600' }}>({grouped[month].length} projects)</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {grouped[month]
              .sort((a: any, b: any) => {
                const da = a.completedAt ? new Date(a.completedAt).getTime() : 0;
                const db = b.completedAt ? new Date(b.completedAt).getTime() : 0;
                return db - da;
              })
              .map((task: any) => (
                <SortableTask
                  key={task.id}
                  task={task}
                  userRole={userRole}
                  currency={currency}
                  openDetails={openDetails}
                  navigate={navigate}
                  isHighlighted={false}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ArchivedProjectsView;
