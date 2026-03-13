import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ArticleList from '../components/home/ArticleList';
import WelcomeHero from '../components/home/WelcomeHero';
import AnimateOnScroll from '../components/shared/AnimateOnScroll';
import ShuffleText from '../components/shared/ShuffleText';
import ExpandableText from '../components/shared/ExpandableText';
import { useAuth } from '../context/AuthContext';
import AuthGateModal from '../components/shared/AuthGateModal';
import ConfirmationModal from '../components/shared/ConfirmationModal';
import '../styles/index.css';
import '../styles/components.css';

const FAQItem = ({ question, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 900);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div style={{ border: '2px solid var(--c-black)', padding: '1.5rem', backgroundColor: '#f9f9f9', cursor: isMobile ? 'pointer' : 'default' }} onClick={() => isMobile && setIsOpen(!isOpen)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', marginBottom: (!isMobile || isOpen) ? '0.5rem' : '0', fontWeight: '700' }}>
                    {question}
                </h3>
                {isMobile && (
                    <span style={{ fontWeight: 'bold', fontSize: '1.5rem', lineHeight: 1 }}>{isOpen ? '−' : '+'}</span>
                )}
            </div>
            {(!isMobile || isOpen) && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', lineHeight: '1.5', marginTop: '0.5rem' }}>
                    {children}
                </div>
            )}
        </div>
    );
};

export default function Home() {
    const { user } = useAuth();
    const [showGate, setShowGate] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');

    const handleTransmissionRequest = (e) => {
        e.preventDefault();
        // Check auth first
        if (!user) {
            setShowGate(true);
            return;
        }
        // If logged in and form is submitted (validation passed implicitly by required attrs)
        setShowConfirm(true);
    };

    const executeTransmission = () => {
        setShowConfirm(false);
        const subject = encodeURIComponent('ByteBoard Contact Form');
        const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);

        // Open Gmail's compose window directly
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=csbyc.connect@christuniversity.in&su=${subject}&body=${body}`;
        window.open(gmailUrl, '_blank');

        // Optional: clear form
        setName('');
        setEmail('');
        setMessage('');
    };

    return (
        <div>
            {showGate && <AuthGateModal action="send a message" onClose={() => setShowGate(false)} />}
            {showConfirm && <ConfirmationModal onConfirm={executeTransmission} onCancel={() => setShowConfirm(false)} />}
            <Navbar />

            <main className="main-layout-full" style={{ position: 'relative', zIndex: 10, maxWidth: '1400px', margin: '0 auto', padding: '0 5%', width: '100%' }}>
                <div className="articles-area" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>

                    <AnimateOnScroll animationClass="animate-slide-up" delay={0.2} threshold={0.05}>
                        <WelcomeHero />
                    </AnimateOnScroll>

                    <AnimateOnScroll animationClass="animate-slide-up" delay={0.1} threshold={0.1}>
                        <h2 className="serif-heading" style={{ color: 'var(--c-white)', fontSize: '2.5rem', marginBottom: '2rem', borderBottom: '2px solid var(--c-white)', paddingBottom: '0.5rem' }}>
                            Latest Dispatches
                        </h2>
                        <ArticleList />

                        {/* Read More Blogs Link */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                            <Link to="/blogs" className="explore-btn" style={{ textDecoration: 'none' }}>
                                <ShuffleText text="READ MORE →" />
                            </Link>
                        </div>
                    </AnimateOnScroll>

                    {/* About Section matching brutalist blocks */}
                    <AnimateOnScroll animationClass="animate-slide-up" delay={0.1} threshold={0.1}>
                        <div id="about" className="article-wrapper" style={{ marginTop: '5rem' }}>
                            <div className="article-shadow" style={{ top: '10px', left: '10px' }}></div>
                            <div className="article-card" style={{ padding: 'clamp(1.5rem, 5vw, 3rem)', backgroundColor: 'var(--c-white)' }}>
                                <h2 className="serif-heading" style={{ fontSize: '2.5rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--c-black)', paddingBottom: '0.5rem' }}>
                                    The Foundation
                                </h2>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '3rem', alignItems: 'center' }}>
                                    <div>
                                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', marginBottom: '1.5rem', fontWeight: '400', lineHeight: '1.6' }}>
                                            <ExpandableText mobileThreshold={80}>ByteBoard is the official editorial platform by the students, for the students of the Department of Computer Science at CHRIST (Deemed to be University), Yeshwanthpur Campus.</ExpandableText>
                                        </p>
                                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', marginBottom: '2.5rem', fontWeight: '400', lineHeight: '1.6' }}>
                                            <ExpandableText mobileThreshold={100}>We curate the latest happenings, technological trends, and insightful commentary straight from the academic core. Our aim is clarity over noise, documentation over speculation.</ExpandableText>
                                        </p>
                                        <a href="#connect" className="explore-btn"><ShuffleText text="INQUIRE NOW" /></a>
                                    </div>
                                    <div style={{ width: '100%', aspectRatio: '1/1', border: '2px solid var(--c-black)', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                                        {/* Striped placeholder patterned background */}
                                        <img 
                                            src="https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/77659a7b157b7edf61fb3257c621e6ffc13c4b54/banners/CS_BYC_Banner.jpg" 
                                            alt="ByteBoard Banner"
                                            loading="lazy"
                                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </AnimateOnScroll>

                    {/* FAQ Section matching brutalist blocks */}
                    <AnimateOnScroll animationClass="animate-slide-up" delay={0.1} threshold={0.1}>
                        <div id="faq" className="article-wrapper" style={{ marginTop: '5rem', marginBottom: '5rem' }}>
                            <div className="article-shadow" style={{ top: '10px', left: '10px' }}></div>
                            <div className="article-card" style={{ padding: 'clamp(1.5rem, 5vw, 3rem)', backgroundColor: 'var(--c-white)' }}>
                                <h2 className="serif-heading" style={{ fontSize: '2.5rem', marginBottom: '2rem', borderBottom: '2px solid var(--c-black)', paddingBottom: '0.5rem' }}>
                                    Frequently Asked Questions
                                </h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <FAQItem question="Q: Who can write for ByteBoard?">
                                        A: Any student currently enrolled in the Department of Computer Science at the Yeshwanthpur Campus can pitch an article.
                                    </FAQItem>
                                    <FAQItem question="Q: What kind of topics do you cover?">
                                        A: We cover everything from deep dives into AI/ML, Cybersecurity, web development tutorials, and op-eds on tech ethics, to campus event roundups.
                                    </FAQItem>
                                    <FAQItem question="Q: How often is new content published?">
                                        A: New dispatches are typically released on a bi-weekly basis during the academic semester.
                                    </FAQItem>
                                </div>
                            </div>
                        </div>
                    </AnimateOnScroll>

                    {/* Connect Section matching brutalist blocks */}
                    <AnimateOnScroll animationClass="animate-pop" delay={0.1} threshold={0.1}>
                        <div id="connect" className="article-wrapper" style={{ marginBottom: '5rem' }}>
                            <div className="article-shadow" style={{ top: '10px', left: '10px' }}></div>
                            <div className="article-card" style={{ padding: 'clamp(1.5rem, 5vw, 3rem)', backgroundColor: 'var(--c-white)' }}>
                                <h2 className="serif-heading" style={{ fontSize: '2.5rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--c-black)', paddingBottom: '0.5rem' }}>
                                    Connect
                                </h2>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '3rem' }}>

                                    <div>
                                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', marginBottom: '2rem', lineHeight: '1.6' }}>
                                            <ExpandableText mobileThreshold={70}>Have a story to pitch? Found a bug in our code? Or just want to talk about the latest tech trends? Drop us a line.</ExpandableText>
                                        </p>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--c-black)', color: 'var(--c-white)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>@</div>
                                                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700' }}>csbyc.connect@christuniversity.in</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--c-black)', color: 'var(--c-white)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>📍</div>
                                                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700' }}>CS Department, Block B, 2nd Floor</span>
                                            </div>
                                        </div>
                                    </div>

                                    <form onSubmit={handleTransmissionRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', textTransform: 'uppercase' }}>Name</label>
                                            <input
                                                type="text"
                                                placeholder="John Doe"
                                                style={{ padding: '1rem', border: '2px solid var(--c-black)', fontFamily: 'var(--font-mono)', backgroundColor: '#f9f9f9', outline: 'none' }}
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', textTransform: 'uppercase' }}>Email</label>
                                            <input
                                                type="email"
                                                placeholder="john@example.com"
                                                style={{ padding: '1rem', border: '2px solid var(--c-black)', fontFamily: 'var(--font-mono)', backgroundColor: '#f9f9f9', outline: 'none' }}
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', textTransform: 'uppercase' }}>Message</label>
                                            <textarea
                                                rows={4}
                                                placeholder="Your message here..."
                                                style={{ padding: '1rem', border: '2px solid var(--c-black)', fontFamily: 'var(--font-mono)', backgroundColor: '#f9f9f9', outline: 'none', resize: 'vertical' }}
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                                required
                                            ></textarea>
                                        </div>
                                        <button type="submit" className="explore-btn" style={{ alignSelf: 'flex-start', marginTop: '1rem' }}
                                        ><ShuffleText text="SEND TRANSMISSION" /></button>
                                    </form>

                                </div>
                            </div>
                        </div>
                    </AnimateOnScroll>
                </div>
            </main>

            <Footer />
        </div>
    );
}
