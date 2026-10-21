import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './motion/motion.css'; // after styles.css so the motion layer can refine it

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
