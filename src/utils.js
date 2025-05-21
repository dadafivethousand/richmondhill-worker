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
