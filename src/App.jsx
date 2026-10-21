import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import {
  Marquee, Services, AIEngine, Process, WhyUs, Testimonials, Booking, FinalCTA, Footer, WhatsAppFab,
} from './components/Sections.jsx';
import useReveal from './hooks/useReveal.js';
import ChatWidget from './components/chat/ChatWidget.jsx';
import MotionLayer from './motion/MotionLayer.jsx';

export default function App() {
  useReveal();
  return (
    <>
      <a className="skip" href="#services">Skip to content</a>
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Services />
        <AIEngine />
        <Process />
        <WhyUs />
        <Testimonials />
        <Booking />
        <FinalCTA />
      </main>
      <Footer />
      <WhatsAppFab />
      <ChatWidget />
      <MotionLayer />
    </>
  );
}
