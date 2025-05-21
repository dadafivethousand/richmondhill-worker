import { saveToKV, sendEmail, jsonResponse } from '../utils/utils.js';

export async function handleIntakeForm(request, env, ctx) {
    try {
        // Parse the request body
        const formData = await request.json();
        // Save to KV
        const key = `lead:${formData.email}}`;
        await saveToKV(env.Leads, key, formData);

     // Background task: Send emails
     ctx.waitUntil(
        (async () => {
            const capitalizedFirstName =
                formData.firstName.charAt(0).toUpperCase() + formData.firstName.slice(1).toLowerCase();

            const adminSubject = 'New Client Lead';
            const adminBody = `
                <p>You have a new client lead:</p>
                <ul>
                    <li><strong>Name:</strong> ${formData.firstName} ${formData.lastName}</li>
                    <li><strong>Email:</strong> ${formData.email}</li>
                    <li><strong>Phone:</strong> ${formData.phone}</li>
                </ul>
            `;

            const userSubject = 'Welcome to Maple Jiu-Jitsu';
            const userBody = `
                <p>Hello ${capitalizedFirstName},</p>
                <p>Thank you for your interest in our academy. Please feel free to attend any classes you see listed on our schedule, which is found on our website 
                at <a href="http://maplebjj.com">maplebjj.com</a>. Your trial will start on the day that you attend your first class and will last 7 days.</p>
                <p>If you decide at the end of your free trial that you would like to join, you can sign up either online or in person. 
                We won’t bother you with follow-ups after the trial because we prefer that you make the decision on your own.</p>
                <p>Should you have any questions or concerns, please feel free to reach out to us directly.</p>

                <br>
                <div style="font-family:'Trebuchet MS',sans-serif; color:#383b3e;">
                    <p>Sincerely,</p>
                    <p><strong>Maple Jiu-Jitsu Academy</strong></p>
                    <img src="https://i.imgur.com/b8kPby1.png" alt="Maple Jiu-Jitsu" width="96" height="43"><br>
                    <p>📞 647-887-9940<br>
                    ✉️ <a href="mailto:admin@maplebjj.com">admin@maplebjj.com</a><br>
                    🌐 <a href="http://maplebjj.com" target="_blank">Maplebjj.com</a><br>
                    📍 20 Cranston Park Ave, Maple, ON L6A2G1</p>
                </div>
            `;

            // Send both emails
            await Promise.all([
                sendEmail({
                    recipient: 'admin@maplebjj.com',
                    subject: adminSubject,
                    body: adminBody,
                }),
                sendEmail({
                    recipient: formData.email,
                    subject: userSubject,
                    body: userBody,
                }),
            ]);
            

         })()
    );
        // Return a success response
        return jsonResponse({ message: 'Intake form submitted successfully!' });
    } catch (error) {
        console.error('Error handling intake form:', error);
        return jsonResponse({ error: 'Failed to process intake form' }, 500);
    }
}
