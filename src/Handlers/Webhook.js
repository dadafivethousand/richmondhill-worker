 //import { handleMembershipConfirmation } from "../utils/utils";
 
// Function to handle Stripe Webhook
export async function handleStripeWebhook(request, env, ctx) {
    try {
        console.log('✅ Webhook received');
        const rawBody = await request.text();
        const stripeSignature = request.headers.get("stripe-signature");
        const endpointSecret = env.STRIPE_WEBHOOK_SECRET;

        console.log('✅ Raw body parsed, verifying ssignature...');
        const isVerified = await verifyStripeSignature(rawBody, stripeSignature, endpointSecret);

        if (!isVerified) {
            console.error("❌ Invalid Stripe signature");
            return new Response("Invalid signature", { status: 400 });
        }

        const event = JSON.parse(rawBody);
        console.log(`✅ Event parsed: ${event.type}`);

        if (event.type === "checkout.session.completed") {
            console.log("✅ Handling checkout.session.completed event");
            const session = event.data.object;
            const customerId = session.customer;
            const kids = session.metadata.kids || null;
            const timestamp = session.metadata.timestamp || "[]";
            const firstName = session.metadata.firstName || "[]";
            const lastName = session.metadata.lastName || "[]";
            const phone = session.metadata.phone || "[]";
            const duration = parseInt(session.metadata.duration, 10) || "[]";
            const subscription = session.metadata.subscription === "true";
            
  
            console.log("✅ Extracted metadata:", { customerId, timestamp, kids });

            const customerEmail = await fetchCustomerEmail(customerId, env.STRIPE_PRODUCTION_KEY);
            const email = customerEmail || "unknown@example.com";
            console.log(`✅ Fetched customer email: ${email}`);

            if (kids) {
                const parsedKids = JSON.parse(session.metadata.kids);

               const kidKeys = [];
        for (let i = 0; i < parsedKids.length; i++) {
                    try {
                        const kidKey = `kid:${email}:${timestamp + i}`; // Each kid has unique key
                        kidKeys.push(kidKey);
                        await env.richmondhillkids.put(
                            kidKey,                            
                            JSON.stringify({
                                ...parsedKids[i],
                                parentFirstName:firstName,
                                parentLastName:lastName,
                                parentEmail:email,
                                doNotMail:subscription,
                                phone:phone,
                                customerId,
                                paymentStatus: "completed",
                                 startDate: new Date().toISOString().split('T')[0],
                                 endDate: new Date(new Date().setMonth(new Date().getMonth() + duration)).toISOString().split('T')[0]
                                }));
                    } catch (kidError) {
                        console.error("Error saving kid:", kidError);
                        return jsonResponse({ error: "Failed to save kids, rolling back parent" }, 500);
                    }
                } 
            //ctx.waitUntil(handleMembershipConfirmation(env, null, kidKeys ));
            } 
            else {
                console.log("✅ Processing regular student flow");
                const key = `student:${email}:${timestamp}`;
                console.log("✅ Computed KV key:", key);

                    await env.richmondhillclients.put(
                                     key,
                                    JSON.stringify({
                                          doNotMail:subscription,
                                        customerId,
                                        email,
                                        firstName,
                                        lastName,
                                        phone,
                                        paymentStatus: "completed",
                                        startDate: new Date().toISOString().split('T')[0],
                                        endDate: new Date(new Date().setMonth(new Date().getMonth() + duration)).toISOString().split('T')[0]
                                        
                                    })
                                );
                console.log(`✅ Created Profile and Updated paymentStatus for student: ${key}`);

                console.log("✅ Sending confirmation email for student:", key);
             //   ctx.waitUntil(handleMembershipConfirmation(env, key));
            }
        } else {
            console.log(`ℹ️ Unhandled event type: ${event.type}`);
        }

        return new Response("Webhook processed", { status: 200 });

    } catch (error) {
        console.error("❌ Error handling webhook:", error);
        return new Response("Webhook handling error", { status: 500 });
    }
}


// Function to Verify Stripe Signature
async function verifyStripeSignature(payload, signatureHeader, secret) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const [timestamp, signatures] = parseStripeSignatureHeader(signatureHeader);

    if (!timestamp || !signatures.length) {
        console.error("Invalid signature header:", signatureHeader);
        return false;
    }

    const signedPayload = `${timestamp}.${payload}`;
    const signedPayloadHash = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
    
    const computedSignature = [...new Uint8Array(signedPayloadHash)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");

    return signatures.includes(computedSignature);
}

{/*
async function handleMembershipConfirmation(env, memberKey) {
    try {
        console.log(`Sending membership confirmation email to member with key: ${memberKey}`);

        const memberData = await env.KV_STUDENTS.get(memberKey);
        if (!memberData) {
            console.error(`No membership data found for key: ${memberKey}`);
            return;
        }

        const member = JSON.parse(memberData);

        const formattedStartDate = new Date(member.startDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });

        const formattedEndDate = new Date(member.endDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });

        const capitalizedFirstName =
            member.firstName.charAt(0).toUpperCase() + member.firstName.slice(1).toLowerCase();

        const body = `
            <p>Dear ${capitalizedFirstName},</p>
            <p> Welcome to Maple Jiu-Jitsu!</p>
            <p>Your membership details are as follows:</p>
            <ul>
                <li><strong>Start Date:</strong> ${formattedStartDate}</li>
                <li><strong>End Date:</strong> ${formattedEndDate}</li>
            </ul>
            <p>If you have any questions or need assistance, please don’t hesitate to reach out.</p>

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

        await sendEmail({
            recipient: member.email,
            cc: ["admin@maplebjj.com"],
            subject: "Membership Confirmation - Maple Jiu-Jitsu",
            body,
        });

        console.log(`Membership confirmation email sent to ${member.email}`);
    } catch (error) {
        console.error(`Failed to send membership confirmation email for key: ${memberKey}`, error);
    }
}
*/}
async function sendEmail({ recipient, subject, body }) {
    const smtpData = {
        api_key: "api-E590F5313DC444E7AC02A68775937CF8",
        to: [recipient],
        sender: '"Maple Jiu-Jitsu" <admin@maplebjj.com>',
        subject,
        html_body: body,
    };

    await fetch("https://api.smtp2go.com/v3/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(smtpData),
    });

}

async function fetchCustomerEmail(customerId, stripeApiKey) {
    const response = await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${stripeApiKey}`,
        },
    });

    const customerData = await response.json();
    if (!response.ok) {
        throw new Error(customerData.error?.message || "Error fetching customer data");
    }

    return customerData.email;
}


// Helper to parse Stripe Signature Header
function parseStripeSignatureHeader(header) {
    const parts = header.split(",");
    const timestampPart = parts.find((part) => part.startsWith("t="));
    const signatureParts = parts.filter((part) => part.startsWith("v1="));

    const timestamp = timestampPart?.split("=")[1];
    const signatures = signatureParts.map((part) => part.split("=")[1]);

    return [timestamp, signatures];
}
