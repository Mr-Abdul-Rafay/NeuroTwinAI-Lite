import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't retry on 4xx — these are user errors, not transient
      retry: (failureCount, error) => {
        if (error?.response?.status >= 400 && error?.response?.status < 500) return false;
        return failureCount < 1;
      },
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
      {/* Global toast notifications — matches dark glass theme */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(20, 20, 32, 0.95)',
            color: '#ffffff',
            border: '1px solid rgba(70, 241, 197, 0.25)',
            borderRadius: '10px',
            fontFamily: "'Inter', sans-serif",
            fontSize: '13px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          },
          success: {
            iconTheme: { primary: '#46f1c5', secondary: '#0a1628' },
          },
          error: {
            iconTheme: { primary: '#FF6B6B', secondary: '#0a1628' },
          },
          loading: {
            iconTheme: { primary: '#4A90D9', secondary: '#0a1628' },
          },
          duration: 4000,
        }}
      />
    </QueryClientProvider>
  </StrictMode>,
);
