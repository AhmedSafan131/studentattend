import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

document.documentElement.setAttribute('translate', 'no');
document.documentElement.classList.add('notranslate');
document.body.setAttribute('translate', 'no');
document.body.classList.add('notranslate');

const rootElement = document.getElementById('root');
rootElement.setAttribute('translate', 'no');
rootElement.classList.add('notranslate');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
