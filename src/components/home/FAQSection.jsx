import React, { useState } from 'react';

export default function FAQSection() {
    const faqs = [
        { question: 'What is ByteBoard?', answer: 'It is the official editorial website for the CS Dept at CHRIST Yeshwanthpur Campus.' },
        { question: 'Who can write for us?', answer: 'Any student from any department can submit their thoughts and articles to the board.' },
        { question: 'How often do we publish?', answer: 'Fresh content is pushed every week. Stay tuned.' }
    ];

    const [openIndex, setOpenIndex] = useState(null);

    return (
        <section id="faq">
            <h2 className="section-title">FAQ</h2>
            <div className="faq-list">
                {faqs.map((faq, index) => (
                    <div key={index} className="faq-item">
                        <button
                            className="faq-question"
                            onClick={() => setOpenIndex(openIndex === index ? null : index)}
                        >
                            {faq.question}
                            <span>{openIndex === index ? '-' : '+'}</span>
                        </button>
                        {openIndex === index && (
                            <div className="faq-answer">
                                <p>{faq.answer}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}
