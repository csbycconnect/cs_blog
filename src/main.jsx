import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/index.css'
import './styles/components.css'
import './styles/blog.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react'; 


ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <AuthProvider>
            <App />
            <Analytics />
            <SpeedInsights />
        </AuthProvider>
    </React.StrictMode>,
)