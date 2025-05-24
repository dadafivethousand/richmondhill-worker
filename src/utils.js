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


export async function saveToKV(kvNamespace, key, value) {
 
    await kvNamespace.put(key, JSON.stringify(value));
    console.log('saved successfully to KV')
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