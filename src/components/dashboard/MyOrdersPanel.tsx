import { PackageOpen, Star, Download } from 'lucide-react';

interface MyOrdersPanelProps {
  myOrders: any[];
  go: (path: string, state?: any) => void;
  onReview: (order: any) => void;
}

function orderStatusInfo(status: string) {
  if (status === 'pending')   return { label: 'Under Review', color: 'var(--accent-gold)', bg: 'rgba(196,154,82,0.1)' };
  if (status === 'new')       return { label: 'Accepted', color: 'var(--color-success)', bg: 'rgba(52,199,89,0.1)' };
  if (status === 'declined')  return { label: 'Declined', color: 'var(--color-danger)', bg: 'rgba(255,59,48,0.1)' };
  if (status === 'completed') return { label: 'Completed', color: 'var(--color-info)', bg: 'rgba(0,122,255,0.1)' };
  return { label: status, color: 'var(--text-secondary)', bg: 'var(--surface-1)' };
}

export function MyOrdersPanel({ myOrders, go, onReview }: MyOrdersPanelProps) {
  return (

        <div className="card" style={{ marginBottom: 32, borderRadius: 24, overflow: 'hidden', boxShadow: 'none', border: '1px solid rgba(128,128,128,0.15)' }}>

          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(128,128,128,0.15)', display: 'flex', alignItems: 'center', gap: 12 }}>

            <PackageOpen size={16} color="var(--accent-gold)" />

            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>My Orders</h3>

            {myOrders.length > 0 && (

              <span style={{ fontSize: 11, fontWeight: 800, background: 'var(--surface-1)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', padding: '1px 7px', borderRadius: 999 }}>{myOrders.length}</span>

            )}

          </div>

          {myOrders.length === 0 ? (

            <div style={{ padding: '40px 18px', textAlign: 'center' }}>

              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 6px' }}>No orders yet</p>

              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 16px' }}>Browse our services and place an order to get started.</p>

              <button onClick={() => go('/services')} style={{ background: 'linear-gradient(135deg,var(--accent-gold),#9a6828)', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: 'none' }}>

                Browse Services →

              </button>

            </div>

          ) : (

            <div style={{ display: 'flex', flexDirection: 'column' }}>

              {myOrders.map((order: any, idx: number) => {

                const info = orderStatusInfo(order.status);

                const recordDate = order.recordingDate ? new Date(order.recordingDate).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : null;

                return (

                  <div key={order.id} style={{ padding: '14px 18px', borderBottom: idx < myOrders.length - 1 ? '1px solid var(--border-color)' : 'none' }}>

                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>

                      <div style={{ flex: 1, minWidth: 0 }}>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>

                          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{order.songName || order.title?.replace(/^TSN-- \w+\s*-\s*/, '') || '—'}</span>

                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-gold)', background: 'rgba(196,154,82,0.1)', border: '1px solid rgba(196,154,82,0.2)', padding: '1px 7px', borderRadius: 6 }}>{order.packageName || '—'}</span>

                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-tertiary)' }}>

                          {order.orderRef && <span style={{ fontWeight: 700, letterSpacing: '.04em' }}>#{order.orderRef}</span>}

                          {order.createdAt && <span>{new Date(order.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}</span>}

                          {recordDate && order.status === 'new' && <span>Session: {recordDate}</span>}

                        </div>

                        {order.status === 'pending' && (

                          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>Your order is under review. We'll contact you shortly.</p>

                        )}

                        {order.status === 'declined' && (

                          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--color-danger)' }}>We couldn't take this project at this time. Please contact us for alternatives.</p>

                        )}

                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>

                        <span style={{ fontSize: 11, fontWeight: 700, color: info.color, background: info.bg, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{info.label}</span>

                        {order.status === 'completed' && (

                          <button onClick={() => onReview(order)}

                            style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-gold)', background: 'rgba(196,154,82,0.08)', border: '1px solid rgba(196,154,82,0.25)', padding: '3px 10px', borderRadius: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>

                            <Star size={10} /> Review

                          </button>

                        )}

                      </div>

                    </div>

                    {/* File Delivery */}

                    {(order.deliveryFiles || []).length > 0 && (

                      <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(52,199,89,0.06)', borderRadius: 10, border: '1px solid rgba(52,199,89,0.15)' }}>

                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-success)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Project Files Ready</div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

                          {(order.deliveryFiles as any[]).map((f: any, fi: number) => (

                            <a key={fi} href={f.url} target="_blank" rel="noreferrer"

                              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--color-success)', textDecoration: 'none' }}>

                              <Download size={13} /> {f.name || `File ${fi + 1}`}

                            </a>

                          ))}

                        </div>

                      </div>

                    )}

                  </div>

                );

              })}

            </div>

          )}

        </div>


  );
}
