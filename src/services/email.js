import emailjs from '@emailjs/browser';

export const EmailService = {
    /**
     * Transmits a confirmation email via EmailJS when a draft is filed
     * @param {Object} params - The template variables
     */
    async sendSubmissionConfirmation({ to_name, to_email, article_title, read_time }) {
        try {
            const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
            const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
            const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

            if (!serviceId || !templateId || !publicKey) {
                console.warn("[EmailService] Missing EmailJS configuration keys in environment.");
                return null;
            }

            const templateParams = {
                to_name: to_name,
                to_email: to_email,
                article_title: article_title,
                read_time: read_time,
                status: 'pending review'
            };

            const response = await emailjs.send(serviceId, templateId, templateParams, publicKey);
            return response;
        } catch (error) {
            console.error("[EmailService] Failed to transmit notification email:", error);
            throw error;
        }
    }
};