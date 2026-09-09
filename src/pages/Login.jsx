import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import AnimateOnScroll from '../components/shared/AnimateOnScroll';
import ShuffleText from '../components/shared/ShuffleText';
import BackButton from '../components/shared/BackButton';
import NotificationModal from '../components/shared/NotificationModal';
import VideoGuideLink from '../components/home/help';

// Cognito user pool policy: min 8 chars, 1 number, 1 lowercase, 1 uppercase, 1 symbol
const getPasswordChecks = (password) => ({
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[-!"#$%&'()*+,./:;<=>?@[\]^_`{|}~\\]/.test(password),
});

const isPasswordValid = (password) => Object.values(getPasswordChecks(password)).every(Boolean);

function PasswordRequirements({ password }) {
    const checks = getPasswordChecks(password);
    const rules = [
        { key: 'length', label: 'At least 8 characters' },
        { key: 'lowercase', label: 'One lowercase letter (a-z)' },
        { key: 'uppercase', label: 'One uppercase letter (A-Z)' },
        { key: 'number', label: 'One number (0-9)' },
        { key: 'symbol', label: 'One symbol (-,.@# etc.)' },
    ];
    return (
        <ul style={{
            listStyle: 'none', padding: '0.75rem 1rem', margin: 0,
            backgroundColor: '#f2f2ea', border: '1px solid #ccc',
            display: 'flex', flexDirection: 'column', gap: '0.3rem'
        }}>
            {rules.map(({ key, label }) => {
                const passed = checks[key];
                return (
                    <li key={key} style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
                        color: passed ? 'green' : '#666',
                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}>
                        <span>{passed ? '✓' : '○'}</span>
                        <span>{label}</span>
                    </li>
                );
            })}
        </ul>
    );
}

function ResetPasswordModal({
    stage, form, setForm, onRequestSubmit, onConfirmSubmit, onClose,
    loading, showPw, setShowPw, pwFocused, setPwFocused,
}) {
    if (stage === 'closed') return null;

    return createPortal(
        <div
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: '1rem' }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{ width: 'min(440px, 100%)', maxHeight: '90vh', overflowY: 'auto', background: 'var(--c-white)', border: '2px solid var(--c-black)', boxShadow: '8px 8px 0 var(--c-yellow)', padding: '2rem' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                    <h3 className="serif-heading" style={{ fontSize: '1.6rem', margin: 0, color: 'var(--c-black)' }}>
                        {stage === 'request' ? 'Reset Password' : 'Enter New Password'}
                    </h3>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', lineHeight: 1, color: '#555' }}>×</button>
                </div>

                {stage === 'request' ? (
                    <form onSubmit={onRequestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#555', margin: 0 }}>
                            Enter your account email. We'll send a verification code to reset your password.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={labelStyle}>Email</label>
                            <input
                                type="email"
                                required
                                autoFocus
                                placeholder="you@christuniversity.in"
                                value={form.email}
                                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                                style={inputStyle}
                                onFocus={e => e.target.style.boxShadow = '4px 4px 0 var(--c-yellow)'}
                                onBlur={e => e.target.style.boxShadow = 'none'}
                            />
                        </div>
                        <button type="submit" disabled={loading} style={{ ...submitBtnStyle, opacity: loading ? 0.7 : 1 }}>
                            <ShuffleText text={loading ? "Sending..." : "Send Verification Code →"} />
                        </button>
                    </form>
                ) : (
                    <form onSubmit={onConfirmSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#555', margin: 0 }}>
                            Check your email: <strong>{form.email}</strong>
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={labelStyle}>Verification Code</label>
                            <input
                                type="text"
                                required
                                autoFocus
                                placeholder="123456"
                                value={form.code}
                                onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                                style={inputStyle}
                                onFocus={e => e.target.style.boxShadow = '4px 4px 0 var(--c-yellow)'}
                                onBlur={e => e.target.style.boxShadow = 'none'}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={labelStyle}>New Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    required
                                    placeholder="••••••••"
                                    value={form.newPassword}
                                    onChange={e => setForm(p => ({ ...p, newPassword: e.target.value }))}
                                    style={{ ...inputStyle, paddingRight: '3.5rem' }}
                                    onFocus={e => { e.target.style.boxShadow = '4px 4px 0 var(--c-yellow)'; setPwFocused(true); }}
                                    onBlur={e => e.target.style.boxShadow = 'none'}
                                />
                                <button type="button" onClick={() => setShowPw(v => !v)} style={eyeBtnStyle}>{showPw ? '🙈' : '👁'}</button>
                            </div>
                            {(pwFocused || form.newPassword.length > 0) && (
                                <PasswordRequirements password={form.newPassword} />
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={labelStyle}>Confirm New Password</label>
                            <input
                                type={showPw ? 'text' : 'password'}
                                required
                                placeholder="••••••••"
                                value={form.confirmNewPassword}
                                onChange={e => setForm(p => ({ ...p, confirmNewPassword: e.target.value }))}
                                style={{
                                    ...inputStyle,
                                    borderColor: form.confirmNewPassword.length > 0
                                        ? (form.confirmNewPassword === form.newPassword ? 'green' : '#c0392b')
                                        : 'var(--c-black)'
                                }}
                                onFocus={e => e.target.style.boxShadow = '4px 4px 0 var(--c-yellow)'}
                                onBlur={e => e.target.style.boxShadow = 'none'}
                            />
                            {form.confirmNewPassword.length > 0 && form.confirmNewPassword !== form.newPassword && (
                                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#c0392b', margin: 0 }}>
                                    Passwords do not match.
                                </p>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !isPasswordValid(form.newPassword) || form.newPassword !== form.confirmNewPassword}
                            style={{ ...submitBtnStyle, opacity: (loading || !isPasswordValid(form.newPassword) || form.newPassword !== form.confirmNewPassword) ? 0.5 : 1 }}
                        >
                            <ShuffleText text={loading ? "Resetting..." : "Reset Password →"} />
                        </button>
                    </form>
                )}
            </div>
        </div>,
        document.body
    );
}

export default function Login() {
    const navigate = useNavigate();
    const { user, register, confirmRegistration, login, logout, signInWithProvider, forgotPassword, confirmForgotPassword } = useAuth();
    // Read optional ?register query parameter
    const queryParams = new URLSearchParams(window.location.search);
    const initialRegisterMode = queryParams.get('register') === 'true';

    const [tab, setTab] = useState('student'); // 'student' | 'admin'
    const [isRegisterMode, setIsRegisterMode] = useState(initialRegisterMode);

    const [studentForm, setStudentForm] = useState({ name: '', email: '', password: '', confirmPassword: '', verificationCode: '' });
    const [adminForm, setAdminForm] = useState({ username: '', password: '' });
    const [showStudentPw, setShowStudentPw] = useState(false);
    const [showStudentConfirmPw, setShowStudentConfirmPw] = useState(false);
    const [showAdminPw, setShowAdminPw] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [showVerification, setShowVerification] = useState(false);
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null); // { title: '', message: '', type: '' }

    // Forgot password flow: 'closed' | 'request' (enter email) | 'confirm' (enter code + new password)
    const [resetStage, setResetStage] = useState('closed');
    const [resetForm, setResetForm] = useState({ email: '', code: '', newPassword: '', confirmNewPassword: '' });
    const [showResetPw, setShowResetPw] = useState(false);
    const [resetPwFocused, setResetPwFocused] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);

    const handleStudentSubmit = async (e) => {
        e.preventDefault();

        // client-side password validation, only relevant when registering
        if (!showVerification && isRegisterMode) {
            if (!isPasswordValid(studentForm.password)) {
                setNotification({ title: 'Weak Password', message: 'Your password must be at least 8 characters and include one uppercase letter, one lowercase letter, one number, and one symbol (e.g. -,.@#).', type: 'error' });
                return;
            }
            if (studentForm.password !== studentForm.confirmPassword) {
                setNotification({ title: 'Password Mismatch', message: 'Your password and confirm password do not match.', type: 'error' });
                return;
            }
        }

        setLoading(true);
        try {
            if (showVerification) {
                await confirmRegistration(studentForm.email, studentForm.verificationCode);
                setNotification({ title: 'Welcome', message: 'Email verified successfully! You can now log in.', type: 'success' });
                setShowVerification(false);
                setIsRegisterMode(false);
            } else if (isRegisterMode) {
                const { result } = await register(studentForm.email, studentForm.password, studentForm.name);
                console.log('Registration result:', result);
                setNotification({ title: 'Check Your Inbox', message: 'Registration successful! Please check your email for the verification code.', type: 'success' });
                setShowVerification(true);
            } else {
                await login(studentForm.email, studentForm.password);
                navigate('/');
            }
        } catch (error) {
            console.error(error);
            setNotification({ title: 'Error', message: error.message || "An error occurred.", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleRequestReset = async (e) => {
        e.preventDefault();
        setResetLoading(true);
        try {
            await forgotPassword(resetForm.email.trim());
            setNotification({ title: 'Check Your Inbox', message: 'A verification code has been sent to your email.', type: 'success' });
            setResetStage('confirm');
        } catch (error) {
            console.error(error);
            setNotification({ title: 'Error', message: error.message || 'Could not send verification code.', type: 'error' });
        } finally {
            setResetLoading(false);
        }
    };

    const handleConfirmReset = async (e) => {
        e.preventDefault();
        if (!isPasswordValid(resetForm.newPassword)) {
            setNotification({ title: 'Weak Password', message: 'Your new password must be at least 8 characters and include one uppercase letter, one lowercase letter, one number, and one symbol (e.g. -,.@#).', type: 'error' });
            return;
        }
        if (resetForm.newPassword !== resetForm.confirmNewPassword) {
            setNotification({ title: 'Password Mismatch', message: 'Your new password and confirm password do not match.', type: 'error' });
            return;
        }
        setResetLoading(true);
        try {
            await confirmForgotPassword(resetForm.email.trim(), resetForm.code.trim(), resetForm.newPassword);
            setNotification({ title: 'Password Reset', message: 'Your password has been reset successfully. You can now log in.', type: 'success' });
            setResetStage('closed');
            setResetForm({ email: '', code: '', newPassword: '', confirmNewPassword: '' });
        } catch (error) {
            console.error(error);
            setNotification({ title: 'Error', message: error.message || 'Could not reset password.', type: 'error' });
        } finally {
            setResetLoading(false);
        }
    };

    const closeResetFlow = () => {
        setResetStage('closed');
        setResetForm({ email: '', code: '', newPassword: '', confirmNewPassword: '' });
    };

    const handleAdminSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await login(adminForm.username, adminForm.password);
            const idToken = result.getIdToken().decodePayload();
            const rawGroups = idToken['cognito:groups'];
            const groups = Array.isArray(rawGroups) ? rawGroups : rawGroups ? [rawGroups] : [];

            if (groups.some(g => ['AL0', 'AL1', 'AL2'].includes(String(g))) || groups.some(g => /admin/i.test(String(g)))) {
                setNotification({ title: 'Authenticated', message: 'Admin Login Successful! Redirecting...', type: 'success' });
                setTimeout(() => navigate('/admin'), 1500);
            } else {
                logout();
                setNotification({ title: 'Access Denied', message: 'Unauthorized: You do not have administration privileges.', type: 'error' });
            }
        } catch (error) {
            console.error(error);
            setNotification({ title: 'Login Failed', message: error.message || 'Invalid admin credentials.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // if the user object becomes defined and we're not in registration mode
    // (or waiting for verification) then we can immediately leave this page.
    React.useEffect(() => {
        if (user && !isRegisterMode && !showVerification) {
            const groups = Array.isArray(user.groups) ? user.groups : user.groups ? [user.groups] : [];
            const isAdminUser = groups.some(g => ['AL0', 'AL1', 'AL2'].includes(String(g))) || groups.some(g => /admin/i.test(String(g))) || /admin/i.test(String(user.role || ''));
            if (isAdminUser) {
                navigate('/admin');
            } else {
                navigate('/');
            }
        }
    }, [user, isRegisterMode, showVerification, navigate]);

    return (
        <div style={{ position: 'relative', minHeight: '100vh' }}>
            {notification && (
                <NotificationModal
                    title={notification.title}
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            )}
            <ResetPasswordModal
                stage={resetStage}
                form={resetForm}
                setForm={setResetForm}
                onRequestSubmit={handleRequestReset}
                onConfirmSubmit={handleConfirmReset}
                onClose={closeResetFlow}
                loading={resetLoading}
                showPw={showResetPw}
                setShowPw={setShowResetPw}
                pwFocused={resetPwFocused}
                setPwFocused={setResetPwFocused}
            />
            <Navbar />
            <main style={{ maxWidth: '560px', margin: '0 auto', padding: '0 2.5rem 5rem' }}>
                <BackButton />

                <AnimateOnScroll animationClass="animate-slide-up" delay={0.1} threshold={0.05}>
                    <div style={{ marginBottom: '2.5rem', borderBottom: '2px solid var(--c-white)', paddingBottom: '1rem' }}>
                        <h1 className="serif-heading" style={{ color: 'var(--c-white)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1.1 }}>
                            {tab === 'student' && isRegisterMode ? 'Register' : 'Login'}<span style={{ color: 'var(--c-yellow)' }}>.</span>
                        </h1>
                        <p style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.6)', marginTop: '0.75rem', fontSize: '0.9rem' }}>
                            {tab === 'student'
                                ? showVerification
                                    ? 'Verify your email address.'
                                    : isRegisterMode
                                        ? 'Create a new ByteBoard account.'
                                        : 'Access your ByteBoard account.'
                                : 'Admin Access'}
                        </p>
                    </div>
                </AnimateOnScroll>

                <AnimateOnScroll animationClass="animate-pop" delay={0.15} threshold={0.05}>
                    <div style={{ position: 'relative' }}>
                        {/* shadow */}
                        <div style={{ position: 'absolute', top: '10px', left: '10px', width: '100%', height: '100%', border: '2px solid var(--c-yellow)', zIndex: 0 }} />
                        <div style={{ position: 'relative', zIndex: 1, backgroundColor: 'var(--c-white)', border: '2px solid var(--c-black)' }}>

                            {/* Tabs */}
                            <div style={{ display: 'flex', borderBottom: '2px solid var(--c-black)' }}>
                                {[
                                    { key: 'student', label: '01 — User Login' },
                                    { key: 'admin', label: '02 — Admin' },
                                ].map(({ key, label }) => (
                                    <button
                                        key={key}
                                        onClick={() => setTab(key)}
                                        style={{
                                            flex: 1,
                                            fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem',
                                            textTransform: 'uppercase', letterSpacing: '0.08em',
                                            padding: '1rem',
                                            border: 'none',
                                            borderRight: key === 'student' ? '2px solid var(--c-black)' : 'none',
                                            backgroundColor: tab === key ? 'var(--c-black)' : 'transparent',
                                            color: tab === key ? 'var(--c-yellow)' : 'var(--c-black)',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {/* Student Form */}
                            {tab === 'student' && (
                                <form onSubmit={handleStudentSubmit} style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    {showVerification ? (
                                        <>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                <label style={labelStyle}>Verification Code</label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="123456"
                                                    value={studentForm.verificationCode}
                                                    onChange={e => setStudentForm(p => ({ ...p, verificationCode: e.target.value }))}
                                                    style={inputStyle}
                                                    onFocus={e => e.target.style.boxShadow = '4px 4px 0 var(--c-yellow)'}
                                                    onBlur={e => e.target.style.boxShadow = 'none'}
                                                />
                                            </div>
                                            <button type="submit" disabled={loading} style={{ ...submitBtnStyle, opacity: loading ? 0.7 : 1 }}>
                                                <ShuffleText text={loading ? "Verifying..." : "Verify Email →"} />
                                            </button>
                                            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#555', textAlign: 'center' }}>
                                                Check your email: <strong>{studentForm.email}</strong>
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            {isRegisterMode && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    <label style={labelStyle}>Full Name</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="Your full name"
                                                        value={studentForm.name}
                                                        onChange={e => setStudentForm(p => ({ ...p, name: e.target.value }))}
                                                        style={inputStyle}
                                                        onFocus={e => e.target.style.boxShadow = '4px 4px 0 var(--c-yellow)'}
                                                        onBlur={e => e.target.style.boxShadow = 'none'}
                                                    />
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                <label style={labelStyle}>Student Email</label>
                                                <input
                                                    type="email"
                                                    required
                                                    placeholder="you@christuniversity.in"
                                                    value={studentForm.email}
                                                    onChange={e => setStudentForm(p => ({ ...p, email: e.target.value }))}
                                                    style={inputStyle}
                                                    onFocus={e => e.target.style.boxShadow = '4px 4px 0 var(--c-yellow)'}
                                                    onBlur={e => e.target.style.boxShadow = 'none'}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                <label style={labelStyle}>Password</label>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type={showStudentPw ? 'text' : 'password'}
                                                        required
                                                        placeholder="••••••••"
                                                        value={studentForm.password}
                                                        onChange={e => setStudentForm(p => ({ ...p, password: e.target.value }))}
                                                        style={{ ...inputStyle, paddingRight: '3.5rem' }}
                                                        onFocus={e => { e.target.style.boxShadow = '4px 4px 0 var(--c-yellow)'; setPasswordFocused(true); }}
                                                        onBlur={e => e.target.style.boxShadow = 'none'}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                document.getElementById('student-submit-btn').click();
                                                            }
                                                        }}
                                                    />
                                                    <button type="button" onClick={() => setShowStudentPw(v => !v)} style={eyeBtnStyle}>{showStudentPw ? '🙈' : '👁'}</button>
                                                </div>
                                                {isRegisterMode && (passwordFocused || studentForm.password.length > 0) && (
                                                    <PasswordRequirements password={studentForm.password} />
                                                )}
                                            </div>
                                            {isRegisterMode && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    <label style={labelStyle}>Confirm Password</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <input
                                                            type={showStudentConfirmPw ? 'text' : 'password'}
                                                            required
                                                            placeholder="••••••••"
                                                            value={studentForm.confirmPassword}
                                                            onChange={e => setStudentForm(p => ({ ...p, confirmPassword: e.target.value }))}
                                                            style={{
                                                                ...inputStyle,
                                                                paddingRight: '3.5rem',
                                                                borderColor: studentForm.confirmPassword.length > 0
                                                                    ? (studentForm.confirmPassword === studentForm.password ? 'green' : '#c0392b')
                                                                    : 'var(--c-black)'
                                                            }}
                                                            onFocus={e => e.target.style.boxShadow = '4px 4px 0 var(--c-yellow)'}
                                                            onBlur={e => e.target.style.boxShadow = 'none'}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    document.getElementById('student-submit-btn').click();
                                                                }
                                                            }}
                                                        />
                                                        <button type="button" onClick={() => setShowStudentConfirmPw(v => !v)} style={eyeBtnStyle}>{showStudentConfirmPw ? '🙈' : '👁'}</button>
                                                    </div>
                                                    {studentForm.confirmPassword.length > 0 && studentForm.confirmPassword !== studentForm.password && (
                                                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#c0392b', margin: 0 }}>
                                                            Passwords do not match.
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                            {!isRegisterMode && (
                                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setResetForm(p => ({ ...p, email: studentForm.email }));
                                                            setResetStage('request');
                                                        }}
                                                        style={{ background: 'none', border: 'none', padding: 0, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#555', textDecoration: 'underline', cursor: 'pointer' }}
                                                    >
                                                        Forgot password?
                                                    </button>
                                                </div>
                                            )}
                                            {(() => {
                                                const registerBlocked = isRegisterMode && (!isPasswordValid(studentForm.password) || studentForm.password !== studentForm.confirmPassword);
                                                const isDisabled = loading || registerBlocked;
                                                return (
                                                    <button id="student-submit-btn" type="submit" disabled={isDisabled} style={{ ...submitBtnStyle, opacity: isDisabled ? 0.5 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer' }}>
                                                        <ShuffleText text={loading ? "Processing..." : isRegisterMode ? "Register as User →" : "Login →"} />
                                                    </button>
                                                );
                                            })()}

                                            {/* social providers (only shown during login mode) 
                                            {!isRegisterMode && !showVerification && (
                                                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                                                    <p style={{ fontFamily: 'var(--font-mono)', color: '#555', margin: '0 0 0.5rem' }}>or continue with</p>
                                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                                                        {['Google', 'Facebook', 'Apple'].map(p => (
                                                            <button
                                                                key={p}
                                                                type="button"
                                                                onClick={() => signInWithProvider(p)}
                                                                style={{
                                                                    padding: '0.5rem 1rem',
                                                                    border: '2px solid var(--c-black)',
                                                                    background: 'var(--c-white)',
                                                                    cursor: 'pointer',
                                                                    fontFamily: 'var(--font-mono)',
                                                                    fontWeight: 700
                                                                }}
                                                            >
                                                                {p}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}x
                                            */}
                                        </>
                                    )}
                                    {!showVerification && (
                                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#555', textAlign: 'center' }}>
                                            {isRegisterMode ? (
                                                <>Already have an account? <button type="button" onClick={() => setIsRegisterMode(false)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--c-black)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Login here</button> · <VideoGuideLink /></>
                                            ) : (
                                                <>No account? <button type="button" onClick={() => setIsRegisterMode(true)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--c-black)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Register here</button> · <VideoGuideLink /></>
                                            )}
                                        </p> 
                                    )}
                                </form>
                            )}

                            {/* Admin Form */}
                            {tab === 'admin' && (
                                <form onSubmit={handleAdminSubmit} style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    {/* Admin warning banner */}
                                    <div style={{
                                        backgroundColor: '#0A192F', color: 'var(--c-yellow)',
                                        border: '2px solid var(--c-yellow)',
                                        padding: '0.75rem 1rem',
                                        fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700,
                                        textTransform: 'uppercase', letterSpacing: '0.05em',
                                    }}>
                                        ⚠ Restricted — Authorized Personnel Only
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={labelStyle}>Username or Email</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="admin_handle or email"
                                            value={adminForm.username}
                                            onChange={e => setAdminForm(p => ({ ...p, username: e.target.value }))}
                                            style={inputStyle}
                                            onFocus={e => e.target.style.boxShadow = '4px 4px 0 var(--c-yellow)'}
                                            onBlur={e => e.target.style.boxShadow = 'none'}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={labelStyle}>Password</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type={showAdminPw ? 'text' : 'password'}
                                                required
                                                placeholder="••••••••"
                                                value={adminForm.password}
                                                onChange={e => setAdminForm(p => ({ ...p, password: e.target.value }))}
                                                style={{ ...inputStyle, paddingRight: '3.5rem' }}
                                                onFocus={e => e.target.style.boxShadow = '4px 4px 0 var(--c-yellow)'}
                                                onBlur={e => e.target.style.boxShadow = 'none'}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        document.getElementById('admin-login-btn').click();
                                                    }
                                                }}
                                            />
                                            <button type="button" onClick={() => setShowAdminPw(v => !v)} style={eyeBtnStyle}>{showAdminPw ? '🙈' : '👁'}</button>
                                        </div>
                                    </div>
                                    {/* Secret Key removed for AWS Cognito Auth */}
                                    <button id="admin-login-btn" type="submit" disabled={loading} style={{ ...submitBtnStyle, backgroundColor: 'var(--c-black)', color: 'var(--c-yellow)', boxShadow: '6px 6px 0 var(--c-yellow)', opacity: loading ? 0.7 : 1 }}>
                                        <ShuffleText text={loading ? "Processing..." : "Login as Admin →"} />
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </AnimateOnScroll>
            </main>
            <Footer />
        </div>
    );
}

/* ── Micro-styles ── */
const labelStyle = {
    fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem',
    textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--c-black)',
};

const inputStyle = {
    width: '100%',
    padding: '0.85rem 1rem',
    fontFamily: 'var(--font-mono)', fontSize: '0.9rem',
    border: '2px solid var(--c-black)',
    backgroundColor: '#f9f9f9',
    outline: 'none',
    color: 'var(--c-black)',
    transition: 'box-shadow 0.15s',
};

const submitBtnStyle = {
    fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    backgroundColor: 'var(--c-black)', color: 'var(--c-white)',
    border: '2px solid var(--c-black)', boxShadow: '6px 6px 0 var(--c-black)',
    padding: '0.85rem 1.5rem', cursor: 'pointer',
    transition: 'transform 0.1s, box-shadow 0.1s',
};

const eyeBtnStyle = {
    position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', lineHeight: 1,
};