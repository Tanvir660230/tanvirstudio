import React from 'react';



interface Props {

  children: React.ReactNode;

  fallback?: React.ReactNode;

}



interface State {

  hasError: boolean;

  error: Error | null;

  errorInfo: React.ErrorInfo | null;

}



export class ErrorBoundary extends React.Component<Props, State> {

  constructor(props: Props) {

    super(props);

    this.state = { hasError: false, error: null, errorInfo: null };

  }



  static getDerivedStateFromError(error: Error): State {

    return { hasError: true, error, errorInfo: null };

  }



  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {

    this.setState({ errorInfo });

    if (import.meta.env.DEV) {

      console.error('[ErrorBoundary] Caught error:', error, errorInfo);

    }

  }



  handleReset = () => {

    this.setState({ hasError: false, error: null, errorInfo: null });

    window.location.reload();

  };



  render() {

    if (this.state.hasError) {

      if (this.props.fallback) return this.props.fallback;



      return (

        <div style={{

          minHeight: '100vh',

          display: 'flex',

          alignItems: 'center',

          justifyContent: 'center',

          background: 'linear-gradient(135deg, #0a0510 0%, #050308 100%)',

          fontFamily: "var(--font-sans)",

          padding: '24px',

        }}>

          <div style={{ maxWidth: 480, textAlign: 'center' }}>

            {/* Error icon */}

            <div style={{

              width: 80, height: 80, borderRadius: '50%',

              background: 'rgba(255,59,48,0.1)',

              border: '2px solid rgba(255,59,48,0.3)',

              display: 'flex', alignItems: 'center', justifyContent: 'center',

              margin: '0 auto 28px', fontSize: 32,

            }}>

              âš ️

            </div>



            {/* Golden divider */}

            <div style={{

              width: 60, height: 2,

              background: 'linear-gradient(90deg, transparent, #d9ad62, transparent)',

              margin: '0 auto 24px', borderRadius: 2,

            }} />



            <h1 style={{

              fontSize: 26, fontWeight: 900, color: 'var(--bg-color)',

              letterSpacing: '-0.04em', margin: '0 0 12px',

            }}>

              Something went wrong

            </h1>



            <p style={{

              fontSize: 15, color: 'rgba(255,255,255,0.5)',

              lineHeight: 1.75, margin: '0 0 32px',

            }}>

              An unexpected error occurred. Please refresh the page to continue.

            </p>



            {/* Dev-only error details */}

            {import.meta.env.DEV && this.state.error && (

              <details style={{

                marginBottom: 24, textAlign: 'left',

                background: 'rgba(255,59,48,0.06)',

                border: '1px solid rgba(255,59,48,0.2)',

                borderRadius: 12, padding: '12px 16px',

              }}>

                <summary style={{

                  fontSize: 12, fontWeight: 700, color: 'var(--color-danger)',

                  cursor: 'pointer', letterSpacing: '0.05em', textTransform: 'uppercase',

                }}>

                  Error Details (dev only)

                </summary>

                <pre style={{

                  marginTop: 8, fontSize: 11,

                  color: 'rgba(255,255,255,0.4)',

                  overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',

                }}>

                  {this.state.error.toString()}

                  {this.state.errorInfo?.componentStack}

                </pre>

              </details>

            )}



            <button

              onClick={this.handleReset}

              style={{

                padding: '14px 32px', borderRadius: 100,

                background: 'linear-gradient(135deg, #d9ad62, #a87428)',

                color: 'var(--text-primary)', border: 'none', fontSize: 15,

                fontWeight: 800, cursor: 'pointer',

                letterSpacing: '-0.01em',

                boxShadow: 'none',

                transition: 'opacity 0.15s, transform 0.15s',

              }}

              onMouseOver={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}

              onMouseOut={e => { (e.currentTarget as HTMLElement).style.transform = ''; }}

            >

              Refresh Page

            </button>



            <div style={{ marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>

              If this keeps happening,{' '}

              <a href="/contact" style={{ color: 'var(--accent-gold-light)', textDecoration: 'none', fontWeight: 600 }}>

                contact support

              </a>

            </div>

          </div>

        </div>

      );

    }



    return this.props.children;

  }

}

