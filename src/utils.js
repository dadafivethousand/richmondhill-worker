export function getCorsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
    };
}

export function handleOptionsRequest() {
    return new Response(null, {
        status: 204, // No Content
        headers: getCorsHeaders(),
    });
}


// KV Storage Utilities
export async function saveToKV(kvNamespace, key, value) {
    await kvNamespace.put(key, JSON.stringify(value));
    console.log('saved successfully to KV')
}

export async function getFromKV(kvNamespace, key) {
    const value = await kvNamespace.get(key, { type: 'json' });
    return value;
}

export async function deleteFromKV(kvNamespace, key, env) {
    // Retrieve the data before deleting
    const value = await kvNamespace.get(key, { type: 'json' });
    if (value) {
        // Save the data to the recycling bin
        await saveToKV(env.RECYCLING_BIN, key, value);
    }

    // Delete the key from the original namespace
    await kvNamespace.delete(key);
}


export async function sendEmail({ recipient, subject, body }) {
  const smtpData = {
    api_key: "api-A9A45BD75EF043EB8B99CE2F0E9F6C06",
    to: [recipient],
    sender: '"Richmond-Hill Jiu-Jitsu" <info@rh-bjj.com>',
    subject,
    html_body: body,
  };

  try {
    const response = await fetch("https://api.smtp2go.com/v3/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(smtpData),
    });

    const result = await response.json();

    if (!response.ok || result.data?.succeeded !== 1) {
      console.error("SMTP2GO Error Response:", result);
      throw new Error(`Email failed: ${result.data?.error || result.message || 'Unknown error'}`);
    }

    console.log(`✅ Email sent to ${recipient}`);
  } catch (err) {
    console.error("❌ Failed to send email:", err.message);
    // Optional: rethrow or handle accordingly
  }
}


export function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...getCorsHeaders(), "Content-Type": "application/json" },
    });
}


// Validation Utilities
export function validateMembershipInput({ firstName, lastName, email, phone, membershipCode }) {
    if (!firstName || typeof firstName !== 'string') throw new Error('Invalid first name');
    if (!lastName || typeof lastName !== 'string') throw new Error('Invalid last name');
    if (!email || typeof email !== 'string') throw new Error('Invalid email address');
    if (!phone || typeof phone !== 'string') throw new Error('Invalid phone number');
    if (!membershipCode || typeof membershipCode !== 'string') throw new Error('Invalid membership code');
}

export function validateKidsMembershipInput({ parentEmail, parentPhone, kids }) {
    if (!parentEmail || typeof parentEmail !== 'string') throw new Error('Invalid parent email');
    if (!parentPhone || typeof parentPhone !== 'string') throw new Error('Invalid parent phone number');
    if (!Array.isArray(kids) || kids.length === 0) throw new Error('Invalid kids data');
}

// Pricing Utilities
export function determineMembershipDetails(membershipCode) {
    const memberships = {
        basic: { price: 2000, description: 'Basic Membership', duration: '1 month' },
        premium: { price: 5000, description: 'Premium Membership', duration: '6 months' },
        vip: { price: 10000, description: 'VIP Membership', duration: '1 year' },
    };

    const membership = memberships[membershipCode];
    if (!membership) throw new Error('Invalid membership code');

    return membership;
}

export function calculateKidsMembershipPrice(kids) {
    const basePrice = 160 * 100; // Price per kid in cents
    return kids.reduce((total, _, index) => total + basePrice * (1 - (index > 0 ? 0.2 * index : 0)), 0);
}

// Stripe Utilities
export async function createStripeCustomer(env, { firstName, lastName, email, phone }) {
    const response = await stripeRequest(env, 'customers', 'POST', {
        name: `${firstName} ${lastName}`,
        email,
        phone,
    });
    return response.id;
}

export async function createStripeCheckoutSession(env, customerId, membershipDetails, kids = null) {
    const metadata = kids ? { kids: JSON.stringify(kids) } : {};
    const sessionData = await stripeRequest(env, 'checkout/sessions', 'POST', {
        mode: 'subscription',
        customer: customerId,
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][product_data][name]': membershipDetails.description,
        'line_items[0][price_data][unit_amount]': membershipDetails.price * 100, // Convert to cents
        'line_items[0][price_data][recurring][interval]': 'month',
        'line_items[0][quantity]': 1,
        success_url: 'https://yourdomain.com/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://yourdomain.com/cancel',
        metadata,
    });
    return sessionData;
}

export async function handleMembershipConfirmation(env, memberKey, kids = []) {

    try {
      console.log(`hello, Sending membership confirmation email for key: ${memberKey}`);
        console.log("kids:",kids)
      let parentEmail;
      let capitalizedFirstName;
      let formattedStartDate;
      let formattedEndDate;
      let membershipDetails;
  
      if (Array.isArray(kids) && kids.length > 0) {
        // —— KIDS BRANCH ————————————————————————————————————————
        // 1) fetch all kid records
        const rawKids = await Promise.all(
          kids.map(kidKey => env.KV_KIDS.get(kidKey))
        );
        const kidsData = rawKids.map(r => JSON.parse(r));
  
        // 2) collect first names
        const kidFirstNames = kidsData.map(k => k.firstName);
  
        // 3) grab parent info off the first kid
        parentEmail = kidsData[0].parentEmail;
        const parentFirstName = kidsData[0].parentFirstName;
  
        // 4) dates (all kids share the same dates)
        const startDate = kidsData[0].startDate;
        const endDate   = kidsData[0].endDate;
  
        // 5) format
        capitalizedFirstName =
          parentFirstName.charAt(0).toUpperCase() +
          parentFirstName.slice(1).toLowerCase();
  
        formattedStartDate = new Date(startDate).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        formattedEndDate = new Date(endDate).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
  
        // 6) custom details for kids
        membershipDetails = `
          <p>Your children (${kidFirstNames.join(", ")}) have been successfully registered for training.</p>
        `;
      } else {
        // —— NO‑KIDS BRANCH ——————————————————————————————————————
        console.log("no kids, defaulting to adult")
        const rawMember = await env.KV_STUDENTS.get(memberKey);
        
        if (!rawMember) {
          console.error(`No student record for key: ${memberKey}`);
          return;
        }
        const member = JSON.parse(rawMember);
  
        parentEmail = member.email;
        const firstName = member.firstName;
        const startDate = member.startDate;
        const endDate   = member.endDate;
        console.log(endDate)
        capitalizedFirstName =
          firstName.charAt(0).toUpperCase() +
          firstName.slice(1).toLowerCase();
  
        formattedStartDate = new Date(startDate).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        formattedEndDate = new Date(endDate).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
  
        membershipDetails = `
          <p>Your membership details are as follows:</p>
        `;
      }
  
      // —— BUILD & SEND EMAIL ——————————————————————————————————
      const body = `
        <p>Dear ${capitalizedFirstName},</p>
        <p>Welcome to Maple Jiu-Jitsu!</p>
        ${membershipDetails}
        <ul>
          <li><strong>Start Date:</strong> ${formattedStartDate}</li>
          <li><strong>End Date:</strong> ${formattedEndDate}</li>
        </ul>
        <p>If you have any questions or need assistance, please don’t hesitate to reach out.</p>
        <br>
        <div style="font-family:'Trebuchet MS',sans-serif; color:#383b3e;">
          <p>Sincerely,</p>
          <p><strong>Maple Jiu-Jitsu Academy</strong></p>
          <p>📞 647-887-9940<br>
             ✉️ <a href="mailto:admin@maplebjj.com">admin@maplebjj.com</a><br>
             🌐 <a href="http://maplebjj.com" target="_blank">maplebjj.com</a><br>
             📍 20 Cranston Park Ave, Maple, ON L6A2G1
          </p>
        </div>
      `;
  
      await sendEmail({
        recipient: parentEmail,
        cc       : ["admin@maplebjj.com"],
        subject  : "Membership Confirmation - Maple Jiu-Jitsu",
        body,
      });
  
      console.log(`Confirmation email sent to ${parentEmail}`);
    } catch (error) {
      console.error(
        `Failed to send membership confirmation for key: ${memberKey}`,
        error
      );
    }
  }
  


export async function stripeRequest(env, endpoint, method, body) {
    const params = new URLSearchParams();
    Object.entries(body).forEach(([key, value]) => params.append(key, value));

    const response = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
        method,
        headers: {
            Authorization: `Bearer ${env.STRIPE_PRODUCTION_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Stripe API error');
    return data;
}


 


export async function addClient(request, env, ctx) {
    const data = await request.json();
    const key = `student:${data.email}`;
    await saveToKV(env.KV_STUDENTS, key, data);
    ctx.waitUntil(handleMembershipConfirmation(env, key));
    return jsonResponse({ message: 'Client added successfully!' });
}

export async function editClient(request, env) {
    const { key, data } = await request.json();
    await saveToKV(env.KV_STUDENTS, key, data);
    return jsonResponse({ message: 'Client updated successfully!' });
}

export async function deleteClient(request, env) {
    const { key } = await request.json();
    await deleteFromKV(env.KV_STUDENTS, key);
    return jsonResponse({ message: 'Client deleted successfully!' });
}

 
export async function addLead(request, env) {
    const data = await request.json();
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
    const key = `lead:${data.email}${timestamp}`;
    await saveToKV(env.Leads, key, data);
    return jsonResponse({ message: 'Lead added successfully!' });
}

export async function editLead(request, env) {
    const { key, data } = await request.json();
    await saveToKV(env.Leads, key, data);
    return jsonResponse({ message: 'Lead updated successfully!' });
}

export async function deleteLead(request, env) {
    const { key } = await request.json();
    await deleteFromKV(env.Leads, key);
    return jsonResponse({ message: 'Lead deleted successfully!' });
}

export async function sendTrialReminderEmails(env) {
    try {
        // Fetch all leads from KV storage
        const keys = await env.Leads.list();
        const leads = [];

        for (const key of keys.keys) {
            const leadData = await getFromKV(env.Leads, key.name);
            if (leadData) {
                leads.push(leadData);
            }
        }

        // Loop through each lead and send an email
        for (const lead of leads) {
            const { firstName, email } = lead;

            const emailBody = `
                Hey ${firstName},

                Just a friendly reminder that your free trial at Maple Jiu-Jitsu is still available. 
                Feel free to attend any class you see on our schedule. You can check the schedule at maplebjj.com.

                See you soon.

                  <br>
                <div style="font-family:'Trebuchet MS',sans-serif; color:#383b3e;">
                    <p>Sincerely,</p>
                    <p><strong>Maple Jiu-Jitsu Academy</strong></p>
                     <p>📞 647-887-9940<br>
                    ✉️ <a href="mailto:admin@maplebjj.com">admin@maplebjj.com</a><br>
                    🌐 <a href="http://maplebjj.com" target="_blank">Maplebjj.com</a><br>
                    📍 20 Cranston Park Ave, Maple, ON L6A2G1</p>
                </div>
            `;

            // Use the existing sendEmail function
            await sendEmail({
                recipient: email,
                subject: "Reminder: Your Free Trial at Maple Jiu-Jitsu",
                body: emailBody,
            });

            console.log(`Reminder email sent to ${email}`);
        }

        return jsonResponse({ message: "Emails sent successfully!" });

    } catch (error) {
        console.error("Error sending emails:", error);
        return jsonResponse({ error: "Failed to send emails" }, 500);
    }
}



export async function handleExpiringMemberships(env) {
    console.log("Checking for expiring memberships...");
    const today = new Date();
    const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    if (!env.KV_STUDENTS) {
        console.error("KV_STUDENTS is not defined in the environment.");
        return new Response("KV namespace not available", { status: 500 });
    }

    const keys = await env.KV_STUDENTS.list();
    console.log("Keys retrieved from KV:", keys);

    const memberships = [];

    for (const key of keys.keys) {
        const memberData = await env.KV_STUDENTS.get(key.name);
        if (memberData) {
            memberships.push({ key: key.name, data: JSON.parse(memberData) });
        }
    }

    const membershipsExpiringSoon = memberships.filter((member) => {
        const endDate = new Date(member.data.endDate);
        const daysToExpiry = (endDate - today) / (1000 * 60 * 60 * 24);
        const alreadySentThisMonth = member.data.expiringSoon === currentYearMonth;

        return (
            daysToExpiry <= 7 &&
            daysToExpiry > 0 &&
            !alreadySentThisMonth &&
            !member.data.doNotMail
        );
    });

    console.log(`Found ${membershipsExpiringSoon.length} membership(s) expiring soon`);

    for (const member of membershipsExpiringSoon) {
        try {
            const formattedEndDate = new Date(member.data.endDate).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
            });

            const capitalizedFirstName =
                member.data.firstName.charAt(0).toUpperCase() + member.data.firstName.slice(1).toLowerCase();

            const body = `
                <p>Dear ${capitalizedFirstName},</p>
                <p>This is a friendly reminder that your membership at Maple Jiu-Jitsu Academy is set to expire on <strong>${formattedEndDate}</strong>.</p>
                <p>We value your continued training and would love to have you stay with us! You can renew your membership by speaking with one of our staff members.</p>
                <p>If you have any questions or need assistance, please don’t hesitate to reach out.</p>
                <br>
                <div style="font-family:'Trebuchet MS',sans-serif; color:#383b3e;">
                    <p>Sincerely,</p>
                    <p><strong>Maple Jiu-Jitsu Academy</strong></p>
                    <p>📞 647-887-9940<br>
                    ✉️ <a href="mailto:admin@maplebjj.com">admin@maplebjj.com</a><br>
                    🌐 <a href="http://maplebjj.com" target="_blank">Maplebjj.com</a><br>
                    📍 20 Cranston Park Ave, Maple, ON L6A2G1</p>
                </div>
            `;

            await sendEmail({
                recipient: member.data.email,
                subject: "Maple Jiu-Jitsu Membership Expiring Soon",
                body,
            });

            member.data.expiringSoon = currentYearMonth;
            await env.KV_STUDENTS.put(member.key, JSON.stringify(member.data));
            console.log(`Reminder sent to ${member.data.email}`);
        } catch (error) {
            console.error(`Failed to send email to ${member.data.email}:`, error);
        }
    }

    return new Response(
        `Checked ${memberships.length} memberships, sent ${membershipsExpiringSoon.length} reminders.`
    );
}



export async function handleExpiringKidMemberships(env) {
    console.log("Checking for expiring kid memberships...");
    const today = new Date();
    const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    const keys = await env.KV_KIDS.list();
    const allKids = [];

    for (const key of keys.keys) {
        const data = await env.KV_KIDS.get(key.name);
        if (data) {
            const parsed = JSON.parse(data);
            allKids.push({ key: key.name, data: parsed });
        }
    }

    // Filter kids whose memberships are expiring soon
    const expiringKids = allKids.filter(({ data }) => {
        const endDate = new Date(data.endDate);
        const daysToExpiry = (endDate - today) / (1000 * 60 * 60 * 24);
        const alreadySent = data.expiringSoon === currentYearMonth;

        return (
            daysToExpiry <= 7 &&
            daysToExpiry > 0 &&
            !alreadySent &&
            !data.doNotMail
        );
    });

    // Group kids by parentEmail
    const groupedByParent = {};
    for (const kid of expiringKids) {
        const email = kid.data.parentEmail;
        if (!groupedByParent[email]) {
            groupedByParent[email] = {
                parentFirstName: kid.data.parentFirstName,
                parentLastName: kid.data.parentLastName,
                phone: kid.data.phone,
                kids: []
            };
        }
        groupedByParent[email].kids.push(kid);
    }

    let sentCount = 0;

    for (const parentEmail in groupedByParent) {
        const parentInfo = groupedByParent[parentEmail];
        const kidsList = parentInfo.kids;

        // Format the kids' names and end dates
        const kidsDetails = kidsList.map(k => {
            const date = new Date(k.data.endDate).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric"
            });
            return `<li><strong>${k.data.firstName}</strong> (ending on ${date})</li>`;
        }).join("");

        const capitalizedParentFirstName =
            parentInfo.parentFirstName.charAt(0).toUpperCase() +
            parentInfo.parentFirstName.slice(1).toLowerCase();

        const body = `
            <p>Dear ${capitalizedParentFirstName},</p>
            <p>This is a friendly reminder that your children's memberships at Maple Jiu-Jitsu Academy are set to expire soon:</p>
            <ul>${kidsDetails}</ul>
            <p>Please speak with a staff member to renew their memberships. We’d love to keep them training with us!</p>
            <br>
            <div style="font-family:'Trebuchet MS',sans-serif; color:#383b3e;">
                <p>Sincerely,</p>
                <p><strong>Maple Jiu-Jitsu Academy</strong></p>
                <p>📞 647-887-9940<br>
                ✉️ <a href="mailto:admin@maplebjj.com">admin@maplebjj.com</a><br>
                🌐 <a href="http://maplebjj.com" target="_blank">Maplebjj.com</a><br>
                📍 20 Cranston Park Ave, Maple, ON L6A2G1</p>
            </div>
        `;

        try {
            await sendEmail({
                recipient: parentEmail,
                subject: "Maple Jiu-Jitsu - Your Kids' Memberships Expiring Soon",
                body,
            });

            // Mark each kid's `expiringSoon` with the current month
            for (const kid of kidsList) {
                kid.data.expiringSoon = currentYearMonth;
                await env.KV_KIDS.put(kid.key, JSON.stringify(kid.data));
            }

            console.log(`Reminder sent to parent: ${parentEmail}`);
            sentCount++;
        } catch (error) {
            console.error(`Failed to send to ${parentEmail}:`, error);
        }
    }

    return new Response(`Checked ${allKids.length} kids. Sent ${sentCount} reminders.`);
}


  

 
export async function handleInstallmentReminders(env) {
    console.log("Checking for installment reminders...");
    const today = new Date();
    const keys = await env.KV_STUDENTS.list();

    for (const key of keys.keys) {
        try {
            const studentData = await env.KV_STUDENTS.get(key.name);
            if (!studentData) continue;

            const student = JSON.parse(studentData);

            // Skip if no reminder dates or payment is complete
            if (!student.reminderDates || student.paymentStatus.toLowerCase() === "complete") {
                continue;
            }

            for (const dateString of student.reminderDates) {
                const paymentDate = new Date(dateString);
                const daysToPayment = (paymentDate - today) / (1000 * 60 * 60 * 24);

                if (daysToPayment === 7) {
                    const formattedPaymentDate = paymentDate.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    });

                    const body = `
                        <p>Dear ${student.firstName},</p>
                        <p>Your next installment is due on <strong>${formattedPaymentDate}</strong>.</p>
                        <p>Please make your payment to continue training with us.</p>
                    `;

                    await sendEmail({
                        recipient: student.email,
                        subject: "Installment Reminder",
                        body,
                    });

                    console.log(`Installmentr reminder sent to ${student.email} for ${formattedPaymentDate}`);
                }
            }
        } catch (error) {
            console.error(`Failed to process student with key ${key.name}:`, error);
        }
    }
    return new Response(`Checked ${memberships.length} memberships, sent ${membershipsExpiringSoon.length} reminders.`);
}


export async function serveSitemap(request, env) {
    const sitemap = await env.BLOGS.get("sitemap.xml");
  
    if (!sitemap) {
      return new Response("Sitemap not found", { status: 404 });
    }
  
    return new Response(sitemap, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600"
      }
    });
  }
  
