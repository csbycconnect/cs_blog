import React, { useState, useRef } from 'react';

const inputStyle = {
    padding: '0.75rem', border: '2px solid var(--c-black)',
    fontFamily: 'var(--font-mono)', fontSize: '0.9rem', width: '100%',
    outline: 'none', boxSizing: 'border-box',
};

const labelStyle = {
    fontFamily: 'var(--font-mono)', fontWeight: 700,
    fontSize: '0.85rem', color: 'var(--c-black)',
};

const MAX_FILE_MB = 8;

const MAIL_TYPES = [
    { value: 'class', label: 'Class Mail (Submission Call)' },
    { value: 'general', label: 'General Mail (Invitation)' },
];

const GREETING_PRESETS = ['Faculty', 'Student', 'Reader'];

export default function SubmissionCallMail() {
    const [mailType, setMailType] = useState('class');
    const [form, setForm] = useState({ emails: '', className: '', endDate: '', greeting: '' });
    const [poster, setPoster] = useState(null); // { filename, contentType, base64, previewUrl }
    const [dragActive, setDragActive] = useState(false);
    const [status, setStatus] = useState(null); // null | 'sending' | 'ok' | 'err'
    const [errMsg, setErrMsg] = useState('');
    const fileInputRef = useRef(null);

    const field = (key) => ({
        value: form[key],
        onChange: e => { setForm(p => ({ ...p, [key]: e.target.value })); setStatus(null); }
    });

    const readFile = (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setStatus('err'); setErrMsg('Poster must be an image file.'); return;
        }
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
            setStatus('err'); setErrMsg(`Poster must be under ${MAX_FILE_MB}MB.`); return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setPoster({
                filename: file.name,
                contentType: file.type,
                base64: reader.result, // data:image/...;base64,....
                previewUrl: reader.result,
            });
            setStatus(null);
        };
        reader.onerror = () => { setStatus('err'); setErrMsg('Could not read the image file.'); };
        reader.readAsDataURL(file);
    };

    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        readFile(file);
    };

    const handleDrag = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
        else if (e.type === 'dragleave') setDragActive(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const emailList = form.emails.split(',').map(s => s.trim()).filter(Boolean);

        if (emailList.length === 0) {
            setStatus('err'); setErrMsg('Recipient email(s) are required.'); return;
        }

        let templateData;
        if (mailType === 'class') {
            if (!form.className.trim() || !form.endDate.trim()) {
                setStatus('err'); setErrMsg('Class and Deadline are required.'); return;
            }
            templateData = { className: form.className.trim(), endDate: form.endDate.trim() };
        } else {
            if (!form.greeting.trim()) {
                setStatus('err'); setErrMsg('Please fill in "Dear ___" (e.g. Faculty, Student, or a name).'); return;
            }
            templateData = { greeting: form.greeting.trim() };
        }

        setStatus('sending');
        try {
            const res = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    templateType: mailType === 'class' ? 'submission_call' : 'general_invite',
                    toEmail: emailList.length === 1 ? emailList[0] : emailList,
                    templateData,
                    ...(poster ? {
                        attachment: {
                            filename: poster.filename,
                            contentType: poster.contentType,
                            contentBase64: poster.base64,
                        }
                    } : {}),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Unknown error');
            setStatus('ok');
            setForm({ emails: '', className: '', endDate: '', greeting: '' });
            setPoster(null);
        } catch (err) {
            setStatus('err');
            setErrMsg(err.message || 'Failed to send.');
        }
    };

    return (
        <div style={{ background: 'var(--c-white)', border: '2px solid var(--c-black)', boxShadow: '8px 8px 0 var(--c-yellow)', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #ddd', paddingBottom: '0.5rem' }}>
                <h2 className="serif-heading" style={{ color: 'var(--c-black)', fontSize: '1.8rem', margin: 0 }}>Send Mail</h2>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', background: 'var(--c-yellow)', padding: '3px 8px', fontWeight: 700 }}>
                    {mailType === 'class' ? 'CALL FOR SUBMISSIONS' : 'GENERAL INVITATION'}
                </span>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={labelStyle}>Mail Type *</label>
                    <select
                        required
                        style={{ ...inputStyle, cursor: 'pointer', background: '#fff' }}
                        value={mailType}
                        onChange={e => { setMailType(e.target.value); setStatus(null); }}
                    >
                        {MAIL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={labelStyle}>Recipient Email(s) * <span style={{ color: '#999', fontWeight: 400 }}>(comma separated for multiple)</span></label>
                    <input type="text" required placeholder="student1@christuniversity.in, student2@christuniversity.in" style={inputStyle} {...field('emails')} />
                </div>

                {mailType === 'class' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={labelStyle}>Class Name *</label>
                            <input type="text" required placeholder="e.g. BCA 5th Sem" style={inputStyle} {...field('className')} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={labelStyle}>Submission Deadline *</label>
                            <input type="text" required placeholder="e.g. 30th August 2026" style={inputStyle} {...field('endDate')} />
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={labelStyle}>Dear ___ *</label>
                        <input
                            type="text"
                            required
                            list="greeting-presets"
                            placeholder="e.g. Faculty, Student, or a name like Dr. Rao"
                            style={inputStyle}
                            {...field('greeting')}
                        />
                        <datalist id="greeting-presets">
                            {GREETING_PRESETS.map(g => <option key={g} value={g} />)}
                        </datalist>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#999' }}>
                            This fills the "Dear ___" line in the email. Type anything — a role or a name.
                        </span>
                    </div>
                )}

                {/* Poster drag & drop */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={labelStyle}>Poster Attachment <span style={{ color: '#999', fontWeight: 400 }}>(optional, image)</span></label>
                    <div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            border: `2px dashed ${dragActive ? 'var(--c-black)' : '#ccc'}`,
                            background: dragActive ? '#f9fafb' : '#fff',
                            padding: '1.5rem', textAlign: 'center', cursor: 'pointer',
                            fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#555',
                        }}
                    >
                        {poster ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
                                <img src={poster.previewUrl} alt="poster preview" style={{ height: '70px', border: '1px solid #ddd' }} />
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontWeight: 700 }}>{poster.filename}</div>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setPoster(null); }}
                                        style={{ marginTop: '0.3rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', background: 'none', border: '1px solid #c53030', color: '#c53030', padding: '2px 8px', cursor: 'pointer' }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <span>Drag &amp; drop a poster image here, or click to browse (max {MAX_FILE_MB}MB)</span>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => readFile(e.target.files?.[0])}
                    />
                </div>

                {status === 'ok' && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#16a34a', padding: '0.7rem 1rem', border: '1px solid #16a34a', background: '#f0fdf4' }}>
                        ✔ Mail sent successfully.
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
                    {status === 'sending' ? 'SENDING…' : 'SEND MAIL'}
                </button>
            </form>
        </div>
    );
}