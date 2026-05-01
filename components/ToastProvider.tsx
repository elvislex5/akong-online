import React from 'react';
import { Toaster } from 'react-hot-toast';

/**
 * Toast notifications, themed via the design-system CSS vars.
 * Background, ink, borders, and accent colors all flip automatically
 * with light/dark mode (handled by `:root` / `:root.dark` in tailwind.css).
 */
const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      {children}
      <Toaster
        position="top-center"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--surface)',
            color: 'var(--ink)',
            border: '1px solid var(--rule)',
            borderRadius: '6px',
            padding: '10px 14px',
            fontSize: '13px',
            fontWeight: 500,
            fontFamily: 'var(--font-sans)',
            boxShadow:
              '0 4px 12px -2px rgb(0 0 0 / 0.08), 0 2px 4px -1px rgb(0 0 0 / 0.04)',
            maxWidth: '420px',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: 'var(--success)',
              secondary: 'var(--surface)',
            },
            style: {
              borderLeft: '3px solid var(--success)',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: 'var(--danger)',
              secondary: 'var(--surface)',
            },
            style: {
              borderLeft: '3px solid var(--danger)',
            },
          },
          loading: {
            iconTheme: {
              primary: 'var(--accent)',
              secondary: 'var(--surface)',
            },
            style: {
              borderLeft: '3px solid var(--accent)',
            },
          },
        }}
      />
    </>
  );
};

export default ToastProvider;
