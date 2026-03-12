import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle";
import "font-awesome/css/font-awesome.min.css";
import { setAmplitudeUserId } from './utils';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);

const userObj = localStorage.getItem('user');
if (userObj) {
  try {
    const user = JSON.parse(userObj);
    if (user && user.email) {
      const userIdStr = user.email;
      if (userIdStr.length >= 5) {
        setAmplitudeUserId(userIdStr);
      } else {
        console.warn('[Amplitude] Not setting userId: invalid id', userIdStr);
      }
    }
  } catch (e) {
    // ignore
  }
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
