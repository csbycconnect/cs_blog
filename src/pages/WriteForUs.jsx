import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import DOMPurify from 'dompurify';
import { ArticlesService } from '../services/articles'; // ✅ SWAPPED: Using our clean network service bridge
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
        <div style={{ marginBottom: '1.75rem' }}>
            <label
                style={{
                    display: 'block',
                    fontFamily: 'Space Mono, monospace',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#0A192F',
                    marginBottom: '0.4rem',
                }}
            >
                {label} {required && <span style={{ color: '#FF4D4D' }}>*</span>}
            </label>
            {hint && (
                <p
                    style={{
                        fontFamily: 'Space Mono, monospace',
                        fontSize: '0.72rem',
                        color: '#666',
                        marginTop: '-0.2rem',
                        marginBottom: '0.4rem',
                    }}
                >
                    {hint}
                </p>
            )}
            {children}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '0.25rem',
                    minHeight: '1rem',
                }}
            >
                {error ? (
                    <span
                        style={{
                            fontFamily: 'Space Mono, monospace',
                            fontSize: '0.72rem',
                            color: '#FF4D4D',
                            fontWeight: 500,
                        }}
                    >
                        {error}
                    </span>
                ) : (
                    <span />
                )}
                {counter && (
                    <span
                        style={{
                            fontFamily: 'Space Mono, monospace',
                            fontSize: '0.72rem',
                            color: '#888',
                        }}
                    >
                        {counter}
                    </span>
                )}
            </div>
        </div>
    );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function WriteForUs() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Form field states
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [club, setClub] = useState(searchParams.get('club') || '');
    const [authorName, setAuthorName] = useState(user?.name || '');

    // Form logic states
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // Sync logged‑in user name with author name state
    useEffect(() => {
        if (user?.name && !authorName) {
            setAuthorName(user.name);
        }
    }, [user, authorName]);

    // Initialize Tiptap rich‑text editor
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'editor-link',
                },
            }),
            Image.configure({
                HTMLAttributes: {
                    class: 'editor-image',
                },
            }),
        ],
        content: '<p>Start your dispatch draft here...</p>',
    });

    // Dynamic metrics calculations
    const wordCount = useMemo(() => {
        if (!editor) return 0;
        const text = editor.getText().trim();
        return text ? text.split(/\s+/).length : 0;
    }, [editor?.getText()]);

    const readTime = useMemo(() => {
        const wpm = 200;
        const words = wordCount;
        const minutes = Math.ceil(words / wpm);
        return minutes < 1 ? '1 min read' : `${minutes} min read`;
    }, [wordCount]);

    // Validation engine logic
    const validateForm = () => {
        const newErrors = {};

        if (!title.trim()) {
            newErrors.title = 'Title headline is required';
        } else if (title.length > 100) {
            newErrors.title = 'Title headline must be less than 100 characters';
        }

        if (subtitle.length > 160) {
            newErrors.subtitle = 'Subtitle must be less than 160 characters';
        }

        if (!authorName.trim()) {
            newErrors.authorName = 'Author signature name is required';
        }

        const htmlContent = editor?.getHTML() || '';
        const textContent = editor?.getText().trim() || '';

        if (!textContent || textContent === 'Start your dispatch draft here...') {
            newErrors.content = 'Article core body draft content cannot be empty';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Submission handler logic
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            const rawHtml = editor.getHTML();
            const cleanHtml = DOMPurify.sanitize(rawHtml);

            const payload = {
                title: title.trim(),
                subtitle: subtitle.trim(),
                club: club, // Passes optionally now without blocking if left blank
                authorName: authorName.trim(),
                authorSub: user?.sub || 'anonymous',
                content: cleanHtml,
                readTime,
            };

            // ✅ FIXED: Submitting to our Vercel Endpoint instead of old browser-bound SDK client
            await ArticlesService.create(payload);

            setSubmitSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });

            setTimeout(() => {
                navigate('/blogs');
            }, 2500);
        } catch (err) {
            console.error('Submission tracking failure:', err);
            setErrors({ submit: err.message || 'Failed to safely transmit draft publication.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Prompt image link injector modal handler helper
    const addImage = () => {
        const url = window.prompt('Enter Image URL:');
        if (url) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    };

    // Prompt hyperlink setup injector handler helper
    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('Enter Hyperlink URL:', previousUrl);

        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    return (
        <div style={{ minHeight: '100vh', background: '#F4F4F0', display: 'flex', flexDirection: 'column' }}>
            <Navbar />

            {/* Custom structural layout metrics workspace area frame engine wrapper context body */}
            <main
                style={{
                    flex: 1,
                    padding: '8rem 2rem 4rem 2rem',
                    maxWidth: '1200px',
                    width: '100%',
                    margin: '0 auto',
                    position: 'relative',
                    zIndex: 1,
                }}
            >
                {/* Clean floating return context module indicator trigger link layout interface */}
                <div style={{ marginBottom: '2.5rem' }}>
                    <BackButton />
                </div>

                {/* Primary interface functional splitting row columns grid container frame */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '3rem', alignItems: 'start' }}>
                    {/* LEFT CONTAINER COMPONENT: PRIMARY COMPOSER FORM FRAME GRAPHIC EDITOR LAYOUT */}
                    <div>
                        <div style={{ marginBottom: '2.5rem' }}>
                            <h1
                                style={{
                                    fontFamily: 'Space Mono, monospace',
                                    fontSize: 'clamp(2rem, 4vw, 3rem)',
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    letterSpacing: '-0.03em',
                                    color: '#0A192F',
                                    lineHeight: 0.95,
                                    margin: 0,
                                }}
                            >
                                <ShuffleText text="Compose Dispatch" />
                            </h1>
                            <p
                                style={{
                                    fontFamily: 'Space Mono, monospace',
                                    fontSize: '0.85rem',
                                    color: '#555',
                                    marginTop: '0.65rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.02em',
                                }}
                            >
                                File a new publication draft directly into the system database queue.
                            </p>
                        </div>

                        {submitSuccess ? (
                            <div
                                style={{
                                    background: '#E6F4EA',
                                    border: '3px solid #000',
                                    boxShadow: '6px 6px 0 #137333',
                                    padding: '2.5rem',
                                    fontFamily: 'Space Mono, monospace',
                                    marginBottom: '2rem',
                                    textAlign: 'center',
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: '3rem',
                                        marginBottom: '1rem',
                                        animation: 'pulse 1s infinite alternate',
                                    }}
                                >
                                    📡
                                </div>
                                <h3
                                    style={{
                                        color: '#137333',
                                        fontWeight: 900,
                                        fontSize: '1.4rem',
                                        margin: '0 0 0.5rem 0',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Transmission Logged
                                </h3>
                                <p style={{ color: '#137333', fontSize: '0.85rem', margin: 0, fontWeight: 700 }}>
                                    SUCCESS: DISPATCH METADATA ENCRYPTED & SAVED AS PENDING ENTRY.
                                </p>
                                <p style={{ color: '#555', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                                    Redirecting user profile context frame back to blogs stream directory...
                                </p>
                            </div>
                        ) : (
                            <form
                                onSubmit={handleSubmit}
                                style={{
                                    background: '#fff',
                                    border: '3px solid #000',
                                    boxShadow: '8px 8px 0 #000',
                                    padding: '2.5rem',
                                    position: 'relative',
                                }}
                            >
                                {errors.submit && (
                                    <div
                                        style={{
                                            background: '#FCE8E6',
                                            border: '2px solid #C5221F',
                                            padding: '1rem',
                                            marginBottom: '2rem',
                                            fontFamily: 'Space Mono, monospace',
                                            fontSize: '0.8rem',
                                            color: '#C5221F',
                                            fontWeight: 700,
                                        }}
                                    >
                                        [CRITICAL ERROR]: {errors.submit}
                                    </div>
                                )}

                                {/* Headline core parameter entry field input layout component box slot */}
                                <Field
                                    label="Article Title Headline"
                                    required
                                    error={errors.title}
                                    counter={`${title.length}/100`}
                                >
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        maxLength={100}
                                        disabled={isSubmitting}
                                        placeholder="e.g., ARCHITECTURAL ANALYSIS OF DISTRIBUTED KV STORES"
                                        style={{
                                            width: '100%',
                                            padding: '0.85rem',
                                            fontFamily: 'Space Mono, monospace',
                                            fontSize: '0.9rem',
                                            fontWeight: 700,
                                            border: '2px solid #000',
                                            background: '#fff',
                                            borderRadius: 0,
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            textTransform: 'uppercase',
                                        }}
                                    />
                                </Field>

                                {/* Abstract line parameter entry field input layout component box slot */}
                                <Field
                                    label="Subtitle / Abstract Summary"
                                    hint="A brief structural overview line displayed below the main listing index block cards."
                                    error={errors.subtitle}
                                    counter={`${subtitle.length}/160`}
                                >
                                    <input
                                        type="text"
                                        value={subtitle}
                                        onChange={(e) => setSubtitle(e.target.value)}
                                        maxLength={160}
                                        disabled={isSubmitting}
                                        placeholder="e.g., An evaluation exploring single‑master replication boundaries under severe packet drops."
                                        style={{
                                            width: '100%',
                                            padding: '0.85rem',
                                            fontFamily: 'Space Mono, monospace',
                                            fontSize: '0.85rem',
                                            border: '2px solid #000',
                                            background: '#fff',
                                            borderRadius: 0,
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                </Field>

                                {/* Inline metadata partitioning rows double grid layout block structure box */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    {/* Club parameter drop menu selector layout wrapper frame component entry box */}
                                    <Field label="Affiliated Core Club" error={errors.club}>
                                        <select
                                            value={club}
                                            onChange={(e) => setClub(e.target.value)}
                                            disabled={isSubmitting}
                                            style={{
                                                width: '100%',
                                                padding: '0.85rem',
                                                fontFamily: 'Space Mono, monospace',
                                                fontSize: '0.85rem',
                                                fontWeight: 700,
                                                border: '2px solid #000',
                                                background: '#fff',
                                                borderRadius: 0,
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <option value="">[ NONE / INDEPENDENT ]</option>
                                            {CLUBS.map((c) => (
                                                <option key={c} value={c}>
                                                    {c}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>

                                    {/* Signature token author presentation text parameter field component box line frame */}
                                    <Field
                                        label="Author Signature Display Name"
                                        required
                                        error={errors.authorName}
                                    >
                                        <input
                                            type="text"
                                            value={authorName}
                                            onChange={(e) => setAuthorName(e.target.value)}
                                            disabled={isSubmitting}
                                            placeholder="e.g., OPERATOR_NAME"
                                            style={{
                                                width: '100%',
                                                padding: '0.85rem',
                                                fontFamily: 'Space Mono, monospace',
                                                fontSize: '0.85rem',
                                                fontWeight: 700,
                                                border: '2px solid #000',
                                                background: '#fff',
                                                borderRadius: 0,
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                    </Field>
                                </div>

                                {/* Main workspace body draft core markdown custom workspace module anchor text layout box structure frame */}
                                <Field
                                    label="Core Draft Content"
                                    required
                                    error={errors.content}
                                    hint="Rich Text Markdown Workspace Editor Engine"
                                    counter={`${wordCount} words | ${readTime}`}
                                >
                                    <div
                                        style={{
                                            border: '2px solid #000',
                                            background: '#fff',
                                            position: 'relative',
                                        }}
                                    >
                                        {/* CUSTOM RETRO ACTION BAR PANEL TOOLBAR SELECTION BUTTON GRID INTERFACE WRAPPER MODULE */}
                                        <div
                                            style={{
                                                borderBottom: '2px solid #000',
                                                background: '#FAF9F5',
                                                padding: '0.6rem',
                                                display: 'flex',
                                                gap: '0.35rem',
                                                flexWrap: 'wrap',
                                                alignItems: 'center',
                                                fontFamily: 'Space Mono, monospace',
                                            }}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => editor?.chain().focus().toggleBold().run()}
                                                disabled={!editor}
                                                style={{
                                                    padding: '0.3rem 0.6rem',
                                                    border: '1px solid #000',
                                                    background: editor?.isActive('bold') ? '#000' : '#fff',
                                                    color: editor?.isActive('bold') ? '#fff' : '#000',
                                                    fontFamily: 'Space Mono, monospace',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                B
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => editor?.chain().focus().toggleItalic().run()}
                                                disabled={!editor}
                                                style={{
                                                    padding: '0.3rem 0.6rem',
                                                    border: '1px solid #000',
                                                    background: editor?.isActive('italic') ? '#000' : '#fff',
                                                    color: editor?.isActive('italic') ? '#fff' : '#000',
                                                    fontFamily: 'Space Mono, monospace',
                                                    fontSize: '0.75rem',
                                                    fontStyle: 'italic',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                I
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => editor?.chain().focus().toggleUnderline().run()}
                                                disabled={!editor}
                                                style={{
                                                    padding: '0.3rem 0.6rem',
                                                    border: '1px solid #000',
                                                    background: editor?.isActive('underline') ? '#000' : '#fff',
                                                    color: editor?.isActive('underline') ? '#fff' : '#000',
                                                    fontFamily: 'Space Mono, monospace',
                                                    fontSize: '0.75rem',
                                                    textDecoration: 'underline',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                U
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                                                disabled={!editor}
                                                style={{
                                                    padding: '0.3rem 0.6rem',
                                                    border: '1px solid #000',
                                                    background: editor?.isActive('codeBlock') ? '#000' : '#fff',
                                                    color: editor?.isActive('codeBlock') ? '#fff' : '#000',
                                                    fontFamily: 'Space Mono, monospace',
                                                    fontSize: '0.75rem',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                &lt;/&gt;
                                            </button>
                                            <div
                                                style={{
                                                    width: '1px',
                                                    height: '1.2rem',
                                                    background: '#ccc',
                                                    margin: '0 0.25rem',
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    editor?.chain().focus().toggleHeading({ level: 1 }).run()
                                                }
                                                disabled={!editor}
                                                style={{
                                                    padding: '0.3rem 0.6rem',
                                                    border: '1px solid #000',
                                                    background: editor?.isActive('heading', { level: 1 })
                                                        ? '#000'
                                                        : '#fff',
                                                    color: editor?.isActive('heading', { level: 1 }) ? '#fff' : '#000',
                                                    fontFamily: 'Space Mono, monospace',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 900,
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                H1
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    editor?.chain().focus().toggleHeading({ level: 2 }).run()
                                                }
                                                disabled={!editor}
                                                style={{
                                                    padding: '0.3rem 0.6rem',
                                                    border: '1px solid #000',
                                                    background: editor?.isActive('heading', { level: 2 })
                                                        ? '#000'
                                                        : '#fff',
                                                    color: editor?.isActive('heading', { level: 2 }) ? '#fff' : '#000',
                                                    fontFamily: 'Space Mono, monospace',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                H2
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                                                disabled={!editor}
                                                style={{
                                                    padding: '0.3rem 0.6rem',
                                                    border: '1px solid #000',
                                                    background: editor?.isActive('bulletList') ? '#000' : '#fff',
                                                    color: editor?.isActive('bulletList') ? '#fff' : '#000',
                                                    fontFamily: 'Space Mono, monospace',
                                                    fontSize: '0.75rem',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                • List
                                            </button>
                                            <div
                                                style={{
                                                    width: '1px',
                                                    height: '1.2rem',
                                                    background: '#ccc',
                                                    margin: '0 0.25rem',
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={setLink}
                                                disabled={!editor}
                                                style={{
                                                    padding: '0.3rem 0.6rem',
                                                    border: '1px solid #000',
                                                    background: editor?.isActive('link') ? '#000' : '#fff',
                                                    color: editor?.isActive('link') ? '#fff' : '#000',
                                                    fontFamily: 'Space Mono, monospace',
                                                    fontSize: '0.75rem',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                🔗 Link
                                            </button>
                                            <button
                                                type="button"
                                                onClick={addImage}
                                                disabled={!editor}
                                                style={{
                                                    padding: '0.3rem 0.6rem',
                                                    border: '1px solid #000',
                                                    background: '#fff',
                                                    color: '#000',
                                                    fontFamily: 'Space Mono, monospace',
                                                    fontSize: '0.75rem',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                🖼 Image
                                            </button>
                                            <div
                                                style={{
                                                    width: '1px',
                                                    height: '1.2rem',
                                                    background: '#ccc',
                                                    margin: '0 0.25rem',
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => editor?.chain().focus().undo().run()}
                                                disabled={!editor}
                                                style={{
                                                    padding: '0.3rem 0.4rem',
                                                    border: '1px solid #000',
                                                    background: '#fff',
                                                    cursor: 'pointer',
                                                    fontSize: '0.7rem',
                                                }}
                                            >
                                                ⟲
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => editor?.chain().focus().redo().run()}
                                                disabled={!editor}
                                                style={{
                                                    padding: '0.3rem 0.4rem',
                                                    border: '1px solid #000',
                                                    background: '#fff',
                                                    cursor: 'pointer',
                                                    fontSize: '0.7rem',
                                                }}
                                            >
                                                ⟳
                                            </button>
                                        </div>

                                        {/* PRIMARY TIPTAP ATTACHED WORKSPACE EDITOR CONTAINER COMPONENT FRAME INNER INPUT MATRIX SECTION */}
                                        <div
                                            className="tiptap-editor-container"
                                            style={{
                                                minHeight: '350px',
                                                maxHeight: '600px',
                                                overflowY: 'auto',
                                                padding: '1.25rem',
                                                fontFamily: 'Space Mono, monospace',
                                                fontSize: '0.9rem',
                                                lineHeight: 1.6,
                                                outline: 'none',
                                            }}
                                        >
                                            <EditorContent editor={editor} />
                                        </div>
                                    </div>
                                </Field>

                                {/* Bottom execution pipeline form completion submit action element button interface line frame block */}
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    style={{
                                        width: '100%',
                                        padding: '1.15rem',
                                        background: isSubmitting ? '#A2A29F' : '#F7D000',
                                        color: '#000',
                                        border: '3px solid #000',
                                        fontFamily: 'Space Mono, monospace',
                                        fontSize: '1.05rem',
                                        fontWeight: 900,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.06em',
                                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                        boxShadow: isSubmitting ? 'none' : '5px 5px 0 #000',
                                        transform: isSubmitting ? 'translate(5px, 5px)' : 'none',
                                        transition: 'all 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                    }}
                                >
                                    {isSubmitting ? 'Transmitting Entry Packet...' : 'Submit Dispatch for Review'}
                                </button>
                            </form>
                        )}
                    </div>

                    {/* RIGHT CONTAINER COMPONENT: FIXED FLOATING EDITORIAL SYSTEM LAYOUT SIDEBAR GUIDE CARDS */}
                    <div style={{ position: 'sticky', top: '8.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {/* Rules card display panel block box graphic design framework element structure */}
                        <AnimateOnScroll animationClass="animate-slide-up" delay={0.12} threshold={0.02}>
                            <div
                                style={{
                                    background: '#F7D000',
                                    border: '3px solid #000',
                                    boxShadow: '5px 5px 0 #000',
                                    padding: '1.75rem',
                                    position: 'relative',
                                }}
                            >
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '-0.75rem',
                                        right: '1rem',
                                        background: '#000',
                                        color: '#F7D000',
                                        fontFamily: 'Space Mono, monospace',
                                        fontSize: '0.6rem',
                                        fontWeight: 900,
                                        padding: '0.15rem 0.4rem',
                                        border: '2px solid #000',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    REQ_V2.0
                                </div>
                                <h3
                                    style={{
                                        fontFamily: 'Space Mono, monospace',
                                        fontSize: '1.1rem',
                                        fontWeight: 900,
                                        textTransform: 'uppercase',
                                        color: '#000',
                                        margin: '0 0 1rem 0',
                                        letterSpacing: '-0.01em',
                                    }}
                                >
                                    Submission Rules
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {GUIDELINES.map((guideline, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                display: 'flex',
                                                gap: '0.65rem',
                                                alignItems: 'flex-start',
                                                fontFamily: 'Space Mono, monospace',
                                                fontSize: '0.76rem',
                                                color: '#000',
                                                lineHeight: 1.4,
                                            }}
                                        >
                                            <span style={{ fontWeight: 900 }}>[{index + 1}]</span>
                                            <span>{guideline}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </AnimateOnScroll>

                        {/* Contact card display panel block box graphic design framework element structure */}
                        <AnimateOnScroll animationClass="animate-slide-up" delay={0.22} threshold={0.02}>
                            <div
                                style={{
                                    background: '#fff',
                                    border: '3px solid #000',
                                    boxShadow: '5px 5px 0 #000',
                                    padding: '1.75rem',
                                }}
                            >
                                <div
                                    style={{
                                        fontFamily: 'Space Mono, monospace',
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.12em',
                                        color: '#0A192F',
                                        marginBottom: '0.65rem',
                                    }}
                                >
                                    Questions?
                                </div>
                                <p
                                    style={{
                                        fontFamily: 'Space Mono, monospace',
                                        fontSize: '0.76rem',
                                        color: '#666',
                                        lineHeight: 1.65,
                                        marginBottom: '1rem',
                                        margin: '0 0 1rem 0',
                                    }}
                                >
                                    Reach out to the editorial team before submitting a core publication dispatch format
                                    draft file:
                                </p>
                                <div
                                    style={{
                                        fontFamily: 'Space Mono, monospace',
                                        fontSize: '0.82rem',
                                        fontWeight: 700,
                                        color: '#0A192F',
                                        borderBottom: '2px solid #f7d000',
                                        display: 'inline-block',
                                        paddingBottom: 1,
                                    }}
                                >
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