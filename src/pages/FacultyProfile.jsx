import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import BackButton from '../components/shared/BackButton';
import AnimateOnScroll from '../components/shared/AnimateOnScroll';
import facultyDataRaw from '../data/faculty.json';

export default function FacultyProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [faculty, setFaculty] = useState(null);

    useEffect(() => {
        // Find faculty by matching the formatted URL ID against the real name
        const found = facultyDataRaw.find(f => {
            const formattedName = f.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            return formattedName === id;
        });

        if (found) {
            setFaculty(found);
        } else {
            // If invalid ID, redirect back
            navigate('/cs-connect');
        }
    }, [id, navigate]);

    if (!faculty) {
        return <div style={{ minHeight: '100vh', backgroundColor: 'var(--c-black)' }} />;
    }

    // Resolve the Vite static asset URL or use absolute external URL
    const imageUrl = faculty.imagePath.startsWith('http') || faculty.imagePath.startsWith('/')
        ? faculty.imagePath
        : new URL(`../assets/faculty/${faculty.imagePath}`, import.meta.url).href;

    return (
        <div style={{ position: 'relative', minHeight: '100vh', backgroundColor: 'var(--c-black)', color: 'var(--c-white)' }}>
            <Navbar />

            <main style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                <BackButton customLabel="← Back to Directory" customAction={() => navigate('/cs-connect')} />

                <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '3rem' }}>

                    {/* Hero Section */}
                    <AnimateOnScroll animationClass="animate-slide-up">
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '3rem',
                            border: '4px solid var(--c-yellow)',
                            padding: '2rem',
                            backgroundColor: '#111',
                            boxShadow: '12px 12px 0 var(--c-white)'
                        }}>
                            <div style={{
                                flex: '1 1 300px',
                                border: '2px solid var(--c-white)',
                                maxHeight: '500px',
                                overflow: 'hidden'
                            }}>
                                <img
                                    src={imageUrl}
                                    alt={faculty.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
                                />
                            </div>

                            <div style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <h1 className="serif-heading" style={{
                                    fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
                                    lineHeight: 1,
                                    margin: '0 0 1rem 0',
                                    textTransform: 'uppercase',
                                    color: 'var(--c-yellow)'
                                }}>
                                    {faculty.name}
                                </h1>
                                <p style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '1.5rem',
                                    fontWeight: 'bold',
                                    color: 'var(--c-white)',
                                    marginBottom: '2rem',
                                    paddingLeft: '1rem',
                                    borderLeft: '4px solid var(--c-yellow)'
                                }}>
                                    {faculty.designation}
                                </p>

                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button style={{
                                        padding: '0.75rem 1.5rem',
                                        backgroundColor: 'transparent',
                                        color: 'var(--c-white)',
                                        border: '2px solid var(--c-white)',
                                        fontFamily: 'var(--font-mono)',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        textTransform: 'uppercase'
                                    }}
                                        onMouseEnter={e => {
                                            e.target.style.backgroundColor = 'var(--c-white)';
                                            e.target.style.color = 'var(--c-black)';
                                        }}
                                        onMouseLeave={e => {
                                            e.target.style.backgroundColor = 'transparent';
                                            e.target.style.color = 'var(--c-white)';
                                        }}>
                                        ✉ Contact
                                    </button>
                                </div>
                            </div>
                        </div>
                    </AnimateOnScroll>

                    {/* Biography Section */}
                    {faculty.bio && faculty.bio.length > 0 && (
                        <AnimateOnScroll animationClass="animate-fade" delay={0.2}>
                            <div style={{
                                padding: '3rem',
                                border: '2px dashed var(--c-white)',
                                backgroundColor: '#0a0a0a',
                                fontFamily: 'var(--font-sans)',
                                color: '#eee',
                                fontSize: '1.1rem',
                                lineHeight: '1.8'
                            }}>
                                <h2 style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '1.2rem',
                                    textTransform: 'uppercase',
                                    color: 'var(--c-yellow)',
                                    marginBottom: '2rem',
                                    letterSpacing: '2px'
                                }}>
                                    // Professional Biography
                                </h2>

                                {faculty.bio.map((paragraph, index) => (
                                    <p key={index} style={{ marginBottom: '1.5rem' }}>
                                        {paragraph}
                                    </p>
                                ))}
                            </div>
                        </AnimateOnScroll>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
