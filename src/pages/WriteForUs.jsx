import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import DOMPurify from 'dompurify';
import { ArticlesService } from '../services/articles';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ShuffleText from '../components/shared/ShuffleText';
import AnimateOnScroll from '../components/shared/AnimateOnScroll';
import BackButton from '../components/shared/BackButton';

// ─── OPTIONS ──────────────────────────────────────────────────────────────────
const CLUBS = ['S.H.E.I.L.D', 'OffTopic', 'W.I.S.T.', 'VaultVortex', 'Vizerion'];

const GUIDELINES = [
    'Articles should be 800 – 3000 words',
    'Original, unpublished content only',
    'Technical articles must include code or examples',
    'All submissions reviewed within 3–5 business days',
    'Published authors receive an editorial badge',
    'Images must be copyright-free or your own',
];

// ─── REUSABLE FIELD WRAPPER ───────────────────────────────────────────────────
function Field({ label, required, error, hint, counter, children }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <label style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555' }}>
                    {label}
                    {required && <span style={{ color: '#c53030', marginLeft: 2 }}>*</span>}
                </label>
                {counter && (
                    <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.6rem', color: counter.over ? '#c53030' : '#bbb' }}>
                        {counter.val}/{counter.max}
                    </span>
                )}
            </div>
            {children}
            {hint && !error && <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.6rem', color: '#aaa', marginTop: 1 }}>{hint}</span>}
            {error && <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.62rem', color: '#c53030', fontWeight: 700, marginTop: 1 }}>⚠ {error}</span>}
        </div>
    );
}

// ─── SHARED INPUT STYLE BUILDER ───────────────────────────────────────────────
const baseInput = {
    fontFamily: 'Space Mono, monospace', fontSize: '0.85rem', color: '#0A192F',
    background: '#fff', border: '2px solid #000', outline: 'none',
    padding: '0.6rem 0.85rem', width: '100%', boxSizing: 'border-box',
    transition: 'box-shadow 0.15s, border-color 0.15s',
};
const statusStyle = (touched, hasErr) =>
    touched && hasErr ? { borderColor: '#c53030', boxShadow: '3px 3px 0 #c53030' }
        : touched && !hasErr ? { boxShadow: '3px 3px 0 #000' }
            : {};

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
function SectionHead({ num, title }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.75rem', paddingBottom: '0.85rem', borderBottom: '2px solid #000' }}>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.68rem', fontWeight: 700, color: '#bbb', letterSpacing: '0.12em', flexShrink: 0 }}>{num} ──</span>
            <h2 style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: '1.35rem', color: '#0A192F', margin: 0 }}>{title}</h2>
        </div>
    );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function WriteForUs() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const draftIndex = searchParams.get('draft');

    const [form, setForm] = useState({
        name: '', email: '', bio: '',
        title: '', category: '', club: '', tags: '', excerpt: '',
    });
    const [editorHtml, setEditorHtml] = useState('');
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Initialize from draft or autosave if provided
    useEffect(() => {
        if (draftIndex !== null) {
            const drafts = JSON.parse(localStorage.getItem('bb_drafts') || '[]');
            if (drafts[Number(draftIndex)]) {
                const saved = drafts[Number(draftIndex)];
                setForm(saved);
                setEditorHtml(saved.editorHtml || saved.content || '');
            }
        } else {
            // Attempt to load autosaved session
            const autosave = JSON.parse(localStorage.getItem('bb_autosave'));
            if (autosave) {
                const { editorHtml: savedHtml, ...savedForm } = autosave;
                setForm(savedForm);
                setEditorHtml(savedHtml || '');
            }
        }
    }, [draftIndex]);

    // Auto-save session debounced
    useEffect(() => {
        const handler = setTimeout(() => {
            if (form.title || editorHtml) {
                localStorage.setItem('bb_autosave', JSON.stringify({ ...form, editorHtml }));
            }
        }, 1500);
        return () => clearTimeout(handler);
    }, [form, editorHtml]);

    // populate author information when Cognito user is available
    const { user, loading: authLoading } = useAuth();
    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                // redirect unauthenticated visitors to login page
                navigate('/login');
            } else {
                setForm(f => ({
                    ...f,
                    name: user.name || '',
                    email: user.email || '',
                    bio: user.bio || ''
                }));
            }
        }
    }, [user, authLoading, navigate]);

    // helper used by validation and live word count
    const stripHtml = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = useMemo(() => stripHtml(editorHtml).split(' ').filter(Boolean).length, [editorHtml]);
    const readTime = useMemo(() => Math.max(1, Math.round(wordCount / 220)), [wordCount]);

    const set = (k) => (e) => {
        setForm(f => ({ ...f, [k]: e.target.value }));
        setTouched(t => ({ ...t, [k]: true }));
    };


    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = 'Full name is required.';
        if (!form.email.trim()) e.email = 'Email address is required.';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email.';
        if (!form.title.trim()) e.title = 'Article title is required.';
        else if (form.title.trim().length < 10) e.title = 'Title must be at least 10 characters.';
        if (!form.category.trim()) e.category = 'Category is required.';
        if (!form.excerpt.trim()) e.excerpt = 'A summary is required.';
        else if (form.excerpt.trim().length > 150) e.excerpt = 'Keep it under 150 characters.';
        // validate rich-text editor instead of raw markdown
        if (!stripHtml(editorHtml)) e.content = 'Article content is required.';
        else if (wordCount > 1000) e.content = `Only ${wordCount} words — maximum is 1000.`;
        return e;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const allTouched = Object.fromEntries(Object.keys(form).map(k => [k, true]));
        setTouched(allTouched);
        const errs = validate();
        setErrors(errs);
        if (Object.keys(errs).length) return;
        setSubmitting(true);
        try {
            // sanitize HTML and attach to payload
            const cleanHtml = DOMPurify.sanitize(editorHtml);
            const payload = {
                ...form,
                club: form.club,
                contentHTML: cleanHtml,
                authorId: user?.sub // include cognito user id
            };
            await ArticlesService.create(payload);

            // Remove draft if it was submitted
            if (draftIndex !== null) {
                const drafts = JSON.parse(localStorage.getItem('bb_drafts') || '[]');
                drafts.splice(Number(draftIndex), 1);
                localStorage.setItem('bb_drafts', JSON.stringify(drafts));
            }
            // Clear autosave on success
            localStorage.removeItem('bb_autosave');
            setSubmitted(true);
        } catch (error) {
            console.error("Submission error:", error);
            alert("Failed to submit article. Please try again later. Make sure AWS configuration is valid.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveDraft = () => {
        const drafts = JSON.parse(localStorage.getItem('bb_drafts') || '[]');
        const draftObj = { ...form, editorHtml, date: new Date().toISOString() };
        if (draftIndex !== null) {
            drafts[Number(draftIndex)] = draftObj;
        } else {
            drafts.push(draftObj);
        }
        localStorage.setItem('bb_drafts', JSON.stringify(drafts));
        alert('Draft saved successfully! You can find it in Your Blogs.');
        navigate('/your-blogs');
    };

    const inp = (k) => ({ ...baseInput, ...statusStyle(touched[k], !!errors[k]) });
    const selectInp = (k) => ({
        ...inp(k), appearance: 'none',
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23000'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', paddingRight: '2rem',
        cursor: 'pointer',
    });

    // ---------- rich editor configurations ----------
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Image,
            Link.configure({ openOnClick: false }),
        ],
        content: editorHtml,
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            setEditorHtml(html);
            setTouched(t => ({ ...t, content: true }));
        },
        editorProps: {
            attributes: {
                style: 'min-height: 200px; padding: 1rem; border: 2px solid #000; font-family: Space Mono, monospace; font-size: 0.88rem; outline: none; background: #fff; line-height: 1.75;',
                placeholder: 'Start writing your article...'
            }
        }
    });

    // Hydrate Tiptap editor if content was loaded from a Draft
    useEffect(() => {
        if (editor && editorHtml && editor.getHTML() !== editorHtml) {
            editor.commands.setContent(editorHtml);
        }
    }, [editor, editorHtml]);

    // ─── TOOLBAR COMPONENT ────────────────────────────────────────────────────
    const ToolbarBtn = ({ icon, label, onClick, active }) => (
        <button
            type="button"
            onMouseDown={(e) => {
                e.preventDefault(); // Prevent focus stealing away from Editor
                onClick(e);
            }}
            title={label}
            style={{
                fontFamily: 'Space Mono, monospace', fontSize: '0.75rem', fontWeight: 700,
                background: active ? '#f7d000' : '#fff', border: '1.5px solid #000', color: '#0A192F',
                width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.1s', padding: 0
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f7d000'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = ''; }}
        >
            {icon}
        </button>
    );

    const resetForm = () => {
        setForm({ name: '', email: '', bio: '', title: '', category: '', club: '', tags: '', excerpt: '' });
        setEditorHtml('');
        setErrors({}); setTouched({}); setSubmitted(false);
    };

    // ── Success State ─────────────────────────────────────────────────────────
    if (submitted) {
        return (
            <div style={{ position: 'relative', minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
                <Navbar />
                <main style={{ maxWidth: 1100, margin: '0 auto', padding: '3rem 5% 6rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', width: '100%' }}>
                    <BackButton />
                    <div style={{ maxWidth: 580, width: '100%' }}>
                        <div style={{ background: '#fff', border: '2px solid #000', boxShadow: '12px 12px 0 #f7d000', overflow: 'hidden' }}>
                            {/* Success header bar */}
                            <div style={{ background: '#0A192F', padding: '1rem 1.5rem', borderBottom: '2px solid #000', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#f7d000' }}>Submission Received</span>
                            </div>
                            {/* Body */}
                            <div style={{ padding: '2.5rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '3.5rem', marginBottom: '1rem', lineHeight: 1 }}>✓</div>
                                <div style={{ display: 'inline-block', background: '#f7d000', border: '2px solid #000', padding: '0.3rem 0.9rem', fontFamily: 'Space Mono, monospace', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '1.25rem' }}>
                                    {form.category || 'Article'}
                                </div>
                                <h2 style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: '1.9rem', color: '#0A192F', lineHeight: 1.2, marginBottom: '0.5rem' }}>
                                    Thank you, {form.name.split(' ')[0]}!
                                </h2>
                                <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.82rem', color: '#555', lineHeight: 1.7, marginBottom: '0.5rem' }}>
                                    Your article <strong>"{form.title}"</strong> has been received by the editorial board.
                                </p>
                                <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.78rem', color: '#888', lineHeight: 1.6, marginBottom: '2rem' }}>
                                    We'll email you at <strong style={{ color: '#0A192F' }}>{form.email}</strong> within 3–5 business days.
                                </p>
                                {/* Review steps */}
                                <div style={{ background: '#f9f9f9', border: '1.5px solid #e0e0e0', padding: '1rem 1.25rem', textAlign: 'left', marginBottom: '2rem' }}>
                                    {['Editorial review', 'Feedback email', 'Revisions (if any)', 'Published on ByteBoard'].map((step, i) => (
                                        <div key={i} style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.75rem', color: i === 0 ? '#0A192F' : '#aaa', padding: '0.3rem 0', display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: i === 0 ? 700 : 400 }}>
                                            <span style={{ background: i === 0 ? '#f7d000' : '#e0e0e0', border: '1.5px solid #000', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 900, flexShrink: 0 }}>→</span>
                                            {step}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={resetForm}
                                    style={{ background: '#0A192F', border: '2px solid #000', color: '#f7d000', fontFamily: 'Space Mono, monospace', fontWeight: 700, fontSize: '0.85rem', padding: '0.75rem 2rem', cursor: 'pointer', boxShadow: '5px 5px 0 #000', transition: 'all 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = '3px 3px 0 #000'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '5px 5px 0 #000'; }}
                                >
                                    <ShuffleText text="Submit Another Article →" />
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    // ── Form ──────────────────────────────────────────────────────────────────
    return (
        <div style={{ position: 'relative', minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
            <Navbar />
            <main style={{ maxWidth: 1100, margin: '0 auto', padding: '0 5% 6rem', position: 'relative', zIndex: 10, width: '100%' }}>
                <BackButton />

                {/* Page Header */}
                <AnimateOnScroll animationClass="animate-slide-up" delay={0.05} threshold={0.02}>
                    <div style={{ marginBottom: '3rem', borderBottom: '2px solid rgba(255,255,255,0.2)', paddingBottom: '1.25rem' }}>
                        <div style={{ display: 'inline-block', background: '#f7d000', border: '2px solid #000', padding: '0.25rem 0.85rem', fontFamily: 'Space Mono, monospace', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1rem' }}>
                            Contributor Submission
                        </div>
                        <h1 style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', color: '#fff', lineHeight: 1.1, marginBottom: '0.75rem' }}>
                            Write for us<span style={{ color: '#f7d000' }}>.</span>
                        </h1>
                        <p style={{ fontFamily: 'Space Mono, monospace', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', maxWidth: 560 }}>
                            Share your ideas, research, and insights with the CS community at CHRIST University.
                        </p>
                    </div>
                </AnimateOnScroll>

                {/* Two-column layout that collapses on mobile */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2.5rem', alignItems: 'start' }}>

                    {/* ─── FORM CARD ─── */}
                    <AnimateOnScroll animationClass="animate-slide-up" delay={0.1} threshold={0.02}>
                        <div style={{ position: 'relative' }}>
                            {/* Brutalist shadow */}
                            <div style={{ position: 'absolute', top: 10, left: 10, width: '100%', height: '100%', border: '2px solid #f7d000', zIndex: 0, pointerEvents: 'none' }} />

                            <form
                                onSubmit={handleSubmit}
                                noValidate
                                style={{ position: 'relative', zIndex: 1, background: '#fff', border: '2px solid #000', padding: '2.5rem' }}
                            >
                                {/* ── SECTION 01: Author Information ────────── */}
                                <SectionHead num="01" title="Author Information" />

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                                    <Field label="Full Name" required error={touched.name && errors.name}>
                                        <input type="text" placeholder="e.g. Vishnu Sharma" value={form.name} readOnly style={{ ...inp('name'), background: '#f0f0f0', color: '#555' }} maxLength={80} />
                                    </  Field>
                                    <Field label="Email Address" required error={touched.email && errors.email}>
                                        <input type="email" placeholder="you@example.com" value={form.email} readOnly style={{ ...inp('email'), background: '#f0f0f0', color: '#555' }} />
                                    </Field>
                                </div>

                                <div style={{ marginBottom: '2.25rem' }}>
                                    <Field label="Short Bio" hint="Appears under your published article (optional)">
                                        <input type="text" placeholder="3rd year CSE · AI enthusiast" value={form.bio} readOnly style={{ ...baseInput, background: '#f0f0f0', color: '#555' }} maxLength={120} />
                                    </Field>
                                </div>

                                {/* ── Separator ── */}
                                <div style={{ height: 2, background: '#f5f0e8', margin: '0 -2.5rem 2.25rem' }} />

                                {/* ── SECTION 02: Article Details ───────────── */}
                                <SectionHead num="02" title="Article Details" />

                                <div style={{ marginBottom: '1.25rem' }}>
                                    <Field label="Article Title" required error={touched.title && errors.title}>
                                        <input type="text" placeholder="e.g. Understanding Transformers from First Principles" value={form.title} onChange={set('title')} style={{ ...inp('title'), fontSize: '1rem' }} maxLength={160} />
                                    </Field>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                                    <Field label="Category" required error={touched.category && errors.category}>
                                        <input type="text" placeholder="e.g. Technical / CS Concepts" value={form.category} onChange={set('category')} style={inp('category')} maxLength={50} />
                                    </Field>
                                    <Field label="Club" hint="Which club does this represent?">
                                        <select value={form.club} onChange={set('club')} style={{ ...baseInput, ...selectInp('club') }}>
                                            <option value="">Select club…</option>
                                            {CLUBS.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </Field>
                                </div>

                                <div style={{ marginBottom: '1.25rem' }}>
                                    <Field label="Tags" hint="Comma-separated keywords, e.g.  Machine Learning, Python, NLP">
                                        <input type="text" placeholder="AI, Web Dev, Career…" value={form.tags} onChange={set('tags')} style={{ ...baseInput, boxShadow: form.tags ? '3px 3px 0 #000' : 'none' }} maxLength={200} />
                                    </Field>
                                </div>

                                <Field
                                    label="Article Summary / Excerpt"
                                    required
                                    error={touched.excerpt && errors.excerpt}
                                    hint="This is displayed on the blog card. Keep it punchy."
                                    counter={{ val: form.excerpt.length, max: 150, over: form.excerpt.length > 150 }}
                                >
                                    <textarea
                                        placeholder="A 1–3 sentence hook that makes readers want to read more…"
                                        value={form.excerpt}
                                        onChange={set('excerpt')}
                                        rows={3}
                                        maxLength={150}
                                        style={{ ...inp('excerpt'), resize: 'vertical', lineHeight: 1.65 }}
                                    />
                                </Field>

                                {/* ── Separator ── */}
                                <div style={{ height: 2, background: '#f5f0e8', margin: '2.25rem -2.5rem' }} />

                                {/* ── SECTION 03: Full Article ───────────────── */}
                                <SectionHead num="03" title="Full Article Content" />

                                <Field
                                    label="Article Body"
                                    required
                                    error={touched.content && errors.content}
                                    hint={wordCount > 0 ? `${wordCount.toLocaleString()} words · ~${readTime} min read` : 'Maximum 1000 words. Use toolbar to format.'}
                                >
                                    <div style={{ marginBottom: '1rem' }}>
                                        {editor && (
                                            <div style={{ display: 'flex', gap: '0.4rem', padding: '0.4rem', borderTop: '2px solid #000', borderLeft: '2px solid #000', borderRight: '2px solid #000', background: '#e0e0e0', flexWrap: 'wrap' }}>
                                                <ToolbarBtn icon="B" label="Bold (Ctrl+B)" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} />
                                                <ToolbarBtn icon="I" label="Italic (Ctrl+I)" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} />
                                                <ToolbarBtn icon="U" label="Underline (Ctrl+U)" onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} />
                                                <ToolbarBtn icon="S" label="Strike (Ctrl+Shift+X)" onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} />
                                                <div style={{ width: 1, background: '#000', margin: '0 0.2rem' }} /> {/* divider */}
                                                <ToolbarBtn icon="H1" label="Heading 1 (Ctrl+Alt+1)" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} />
                                                <ToolbarBtn icon="H2" label="Heading 2 (Ctrl+Alt+2)" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} />
                                                <ToolbarBtn icon="H3" label="Heading 3 (Ctrl+Alt+3)" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} />
                                                <div style={{ width: 1, background: '#000', margin: '0 0.2rem' }} />
                                                <ToolbarBtn icon="“" label="Blockquote (Ctrl+Shift+B)" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} />
                                                <ToolbarBtn icon="<>" label="Code Block (Ctrl+Alt+C)" onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} />
                                                <ToolbarBtn icon="🔗" label="Link" onClick={() => {
                                                    const previousUrl = editor.getAttributes('link').href;
                                                    const url = window.prompt('URL', previousUrl);
                                                    if (url === null) return;
                                                    if (url === '') {
                                                        editor.chain().focus().extendMarkRange('link').unsetLink().run();
                                                    } else {
                                                        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                                                    }
                                                }} active={editor.isActive('link')} />
                                                <ToolbarBtn icon="🖼️" label="Image" onClick={() => {
                                                    const url = window.prompt('Image URL');
                                                    if (url) {
                                                        editor.chain().focus().setImage({ src: url }).run();
                                                    }
                                                }} />
                                                <div style={{ width: 1, background: '#000', margin: '0 0.2rem' }} />
                                                <ToolbarBtn icon="•" label="Bullet List (Ctrl+Shift+8)" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} />
                                                <ToolbarBtn icon="1." label="Ordered List (Ctrl+Shift+7)" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} />
                                            </div>
                                        )}
                                        <style>{`
                                            .tiptap p { margin-bottom: 0.75em; }
                                            .tiptap blockquote { border-left: 3px solid #f7d000; margin: 1rem 0; padding-left: 1rem; font-style: italic; color: #555; background: #f9f9f9; padding-top: 0.5rem; padding-bottom: 0.5rem; }
                                            .tiptap pre { background: #0A192F; color: #fff; padding: 1rem; border-radius: 4px; overflow-x: auto; font-family: 'Space Mono', monospace; margin: 1rem 0; }
                                            .tiptap pre code { color: inherit; pading: 0; background: none; font-size: 0.8rem; }
                                            .tiptap ul, .tiptap ol { padding-left: 1.75rem; margin-bottom: 1rem; list-style-position: outside; }
                                            .tiptap li { margin-bottom: 0.25rem; }
                                            .tiptap img { max-width: 100%; height: auto; display: block; margin: 1rem auto; padding: 0.5rem; border: 1.5px solid #ccc; }
                                            .tiptap a { color: #000; text-decoration: underline; text-decoration-color: #f7d000; text-decoration-thickness: 2px; }
                                        `}</style>
                                        <EditorContent editor={editor} />
                                    </div>
                                </Field>

                                {/* ── Live preview strip ── */}
                                {form.title && form.excerpt && (
                                    <div style={{ background: '#f9f9f9', border: '1.5px solid #e0e0e0', padding: '1.25rem', marginTop: '1.5rem', borderLeft: '4px solid #f7d000' }}>
                                        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#aaa', marginBottom: '0.5rem' }}>Card Preview</div>
                                        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.65rem', color: '#888', marginBottom: '0.25rem' }}>{form.name || 'Your Name'} · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {readTime} min read</div>
                                        <div style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: '1.1rem', color: '#0A192F', fontWeight: 700, marginBottom: '0.4rem', lineHeight: 1.3 }}>{form.title}</div>
                                        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.78rem', color: '#555', lineHeight: 1.6 }}>{form.excerpt}</div>
                                        {form.tags && <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>{form.tags.split(',').filter(t => t.trim()).map(t => <span key={t} style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.6rem', background: '#f7d000', border: '1.5px solid #000', padding: '1px 6px' }}>{t.trim()}</span>)}</div>}
                                    </div>
                                )}

                                {/* ── Submit Row ── */}
                                <div style={{ marginTop: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', borderTop: '2px solid #000', paddingTop: '1.5rem' }}>
                                    <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.68rem', color: '#999' }}>
                                        <span style={{ color: '#c53030' }}>*</span> Required fields
                                        {Object.keys(validate()).length > 0 && Object.keys(touched).length > 0 && (
                                            <span style={{ color: '#c53030', marginLeft: '0.75rem' }}>
                                                · {Object.keys(validate()).length} field{Object.keys(validate()).length > 1 ? 's' : ''} need attention
                                            </span>
                                        )}
                                    </span>
                                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                        <button
                                            type="button"
                                            onClick={handleSaveDraft}
                                            disabled={submitting}
                                            style={{
                                                background: '#fff',
                                                border: '2px solid #000', color: '#000',
                                                fontFamily: 'Space Mono, monospace', fontWeight: 700, fontSize: '0.9rem',
                                                padding: '0.8rem 1.5rem', cursor: submitting ? 'wait' : 'pointer',
                                                boxShadow: '3px 3px 0 #ccc',
                                                transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                            }}
                                            onMouseEnter={e => !submitting && (e.currentTarget.style.transform = 'translate(1px,1px)', e.currentTarget.style.boxShadow = '2px 2px 0 #ccc')}
                                            onMouseLeave={e => !submitting && (e.currentTarget.style.transform = '', e.currentTarget.style.boxShadow = '3px 3px 0 #ccc')}
                                        >
                                            <ShuffleText text="SAVE DRAFT" />
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            style={{
                                                background: submitting ? '#e0e0e0' : '#f7d000',
                                                border: '2px solid #000', color: '#000',
                                                fontFamily: 'Space Mono, monospace', fontWeight: 700, fontSize: '0.9rem',
                                                padding: '0.8rem 2.5rem', cursor: submitting ? 'wait' : 'pointer',
                                                boxShadow: submitting ? 'none' : '5px 5px 0 #000',
                                                transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                            }}
                                            onMouseEnter={e => !submitting && (e.currentTarget.style.transform = 'translate(2px,2px)', e.currentTarget.style.boxShadow = '3px 3px 0 #000')}
                                            onMouseLeave={e => !submitting && (e.currentTarget.style.transform = '', e.currentTarget.style.boxShadow = '5px 5px 0 #000')}
                                        >
                                            {submitting
                                                ? <span>SUBMITTING…</span>
                                                : <ShuffleText text="SUBMIT ARTICLE →" />
                                            }
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </AnimateOnScroll>

                    {/* ─── SIDEBAR ─── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        {/* Guidelines */}
                        <AnimateOnScroll animationClass="animate-slide-up" delay={0.18} threshold={0.02}>
                            <div style={{ background: '#0A192F', border: '2px solid #000', boxShadow: '6px 6px 0 #f7d000', padding: '1.75rem', position: 'sticky', top: '1.5rem' }}>
                                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#f7d000', marginBottom: '1.25rem' }}>
                                    📋 Submission Guidelines
                                </div>
                                {GUIDELINES.map((g, i) => (
                                    <div key={i} style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.76rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, paddingLeft: '0.75rem', borderLeft: '2px solid rgba(247,208,0,0.5)', marginBottom: '0.7rem' }}>
                                        {g}
                                    </div>
                                ))}

                                {/* Review Process */}
                                <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.25rem' }}>
                                    <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#f7d000', marginBottom: '0.85rem' }}>
                                        Review Process
                                    </div>
                                    {['Submit form', 'Editorial review (3–5 days)', 'Feedback / approval email', 'Revisions if needed', 'Published on ByteBoard'].map((step, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '0.5rem' }}>
                                            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.68rem', fontWeight: 700, color: '#f7d000', flexShrink: 0, minWidth: 16 }}>
                                                {['①', '②', '③', '④', '⑤'][i]}
                                            </span>
                                            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>{step}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </AnimateOnScroll>

                        {/* Keyboard Shortcuts */}
                        <AnimateOnScroll animationClass="animate-slide-up" delay={0.2} threshold={0.02}>
                            <div style={{ background: '#f9f9f9', border: '2px solid #000', boxShadow: '4px 4px 0 #000', padding: '1.5rem', position: 'sticky', top: '1.5rem' }}>
                                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#0A192F', marginBottom: '1.25rem' }}>⌨️ Keyboard Shortcuts</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    {[
                                        { key: 'Ctrl + B', label: 'Bold' },
                                        { key: 'Ctrl + I', label: 'Italic' },
                                        { key: 'Ctrl + 1', label: 'Heading 1' },
                                        { key: 'Ctrl + 2', label: 'Heading 2' },
                                        { key: 'Ctrl + Q', label: 'Quote' },
                                        { key: 'Ctrl + E', label: 'Code' },
                                        { key: 'Ctrl + K', label: 'Link' },
                                        { key: 'Ctrl + L', label: 'List' }
                                    ].map((sc, i) => (
                                        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.65rem', color: '#555' }}>{sc.label}</span>
                                            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.62rem', fontWeight: 700, background: '#e0e0e0', padding: '0.15rem 0.4rem', borderRadius: 3, display: 'inline-block', width: 'fit-content', color: '#000' }}>{sc.key}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </AnimateOnScroll>

                        {/* Contact card */}
                        <AnimateOnScroll animationClass="animate-slide-up" delay={0.22} threshold={0.02}>
                            <div style={{ background: '#fff', border: '2px solid #000', boxShadow: '4px 4px 0 #000', padding: '1.5rem' }}>
                                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#0A192F', marginBottom: '0.65rem' }}>Questions?</div>
                                <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.76rem', color: '#666', lineHeight: 1.65, marginBottom: '0.75rem' }}>
                                    Reach out to the editorial team before submitting:
                                </p>
                                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.82rem', fontWeight: 700, color: '#0A192F', borderBottom: '2px solid #f7d000', display: 'inline-block', paddingBottom: 1 }}>
                                    byteboard@christuniversity.in
                                </div>
                            </div>
                        </AnimateOnScroll>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
