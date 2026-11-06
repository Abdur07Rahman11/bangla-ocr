import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2>কিছু একটা সমস্যা হয়েছে (Something went wrong)</h2>
          <p style={{ color: '#666' }}>{this.state.error?.message || 'Unknown error'}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            রিলোড করুন (Reload)
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
