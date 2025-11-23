import React from 'react';
import { Toaster } from 'react-hot-toast';

/**
 * Toast Provider - Wraps the app with toast notification support
 * Uses react-hot-toast for elegant notifications
 */
const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      {children}
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          // Default options
          duration: 4000,
          style: {
            background: '#1F2937', // gray-800
            color: '#F3F4F6', // gray-100
            borderRadius: '12px',
            padding: '16px',
            fontSize: '14px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
            border: '1px solid #374151', // gray-700
          },
          // Success
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981', // green-500
              secondary: '#F3F4F6',
            },
            style: {
              border: '1px solid #10B981',
            },
          },
          // Error
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#EF4444', // red-500
              secondary: '#F3F4F6',
            },
            style: {
              border: '1px solid #EF4444',
            },
          },
          // Loading
          loading: {
            iconTheme: {
              primary: '#F59E0B', // amber-500
              secondary: '#F3F4F6',
            },
          },
        }}
      />
    </>
  );
};

export default ToastProvider;
