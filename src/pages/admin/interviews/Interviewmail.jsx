import React, { useState } from 'react';
import { authHeaders } from '../../../lib/authToken';

const ROLES = [
    { value: 'dev', label: 'Dev Team',                       display: 'Development Team' },
    { value: 'qa',  label: 'Quality Assurance Team',    display: 'Quality Assurance Team' },
    { value: 'cr',  label: 'Class Representative',       display: 'Class Representative' },
];

const inputStyle = {
    padding: '0.75rem', border: '2px solid var(--c-black)',
    fontFamily: 'var(--font-mono)', fontSize: '0.9rem', width: '100%',
    outline: 'none', boxSizing: 'border-box',
};

const labelStyle = {
    fontFamily: 'var(--font-mono)', fontWeight: 700,
    fontSize: '0.85rem', color: 'var(--c-black)',
};

export default function InterviewMail() {
    const [form, setForm]     = useState({ email: '', name: '', role: '' });
    const [status, setStatus] = useState(null); // null | 'sending' | 'ok' | 'err'
    const [errMsg, setErrMsg] = useState('');

    const field = (key) => ({
        value: form[key],
        onChange: e => { setForm(p => ({ ...p, [key]: e.target.value })); setStatus(null); }
    });

    const selectedRole = ROLES.find(r => r.value === form.role);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.email.trim() || !form.role) {
            setStatus('err'); setErrMsg('Email and Role are required.'); return;
        }
        setStatus('sending');
        try {
            const res = await fetch('/api/send-email', {
                method: 'POST',
                headers: await authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    templateType: 'interview_selection',
                    toEmail: form.email.trim(),
                    templateData: {
                        recipientName: form.name.trim(),
                        roleDisplay: selectedRole?.display || form.role,
                    },
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Unknown error');
            setStatus('ok');
            setForm({ email: '', name: '', role: '' });
        } catch (err) {
            setStatus('err');
            setErrMsg(err.message || 'Failed to send.');
        }
    };

    return (
        <div style={{ background: 'var(--c-white)', border: '2px solid var(--c-black)', boxShadow: '8px 8px 0 var(--c-yellow)', padding: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #ddd', paddingBottom: '0.5rem' }}>
                <h2 className="serif-heading" style={{ color: 'var(--c-black)', fontSize: '1.8rem', margin: 0 }}>Interview Mail</h2>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', background: 'var(--c-yellow)', padding: '3px 8px', fontWeight: 700 }}>
                    SELECTION NOTICE
                </span>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={labelStyle}>Candidate Name <span style={{ color: '#999', fontWeight: 400 }}>(optional)</span></label>
                        <input type="text" placeholder="e.g. Rahul Sharma" style={inputStyle} {...field('name')} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={labelStyle}>Recipient Gmail *</label>
                        <input type="email" required placeholder="candidate@gmail.com" style={inputStyle} {...field('email')} />
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={labelStyle}>Role *</label>
                    <select required style={{ ...inputStyle, cursor: 'pointer', background: '#fff' }} {...field('role')}>
                        <option value="" disabled>— Select a role —</option>
                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                </div>

                {/* Live preview strip */}
                {form.role && form.email && (
                    <div style={{ background: '#f9fafb', border: '1px dashed #ccc', padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#444', lineHeight: 1.7 }}>
                        <strong>Preview · </strong>
                        Sending to <strong>{form.email}</strong> — Role: <strong>{selectedRole?.display}</strong>
                        {form.name && <> — Name: <strong>{form.name}</strong></>}
                    </div>
                )}

                {status === 'ok' && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#16a34a', padding: '0.7rem 1rem', border: '1px solid #16a34a', background: '#f0fdf4' }}>
                        ✔ Selection email sent successfully.
                    </div>
                )}
                {status === 'err' && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#c53030', padding: '0.7rem 1rem', border: '1px solid #c53030', background: '#fff5f5' }}>
                        ✖ {errMsg}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={status === 'sending'}
                    style={{ background: status === 'sending' ? '#ddd' : 'var(--c-yellow)', border: '2px solid var(--c-black)', padding: '1rem', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem', cursor: status === 'sending' ? 'not-allowed' : 'pointer', boxShadow: status === 'sending' ? 'none' : '4px 4px 0 #000', marginTop: '0.5rem' }}
                >
                    {status === 'sending' ? 'SENDING…' : 'SEND SELECTION EMAIL'}
                </button>
            </form>
        </div>
    );
}