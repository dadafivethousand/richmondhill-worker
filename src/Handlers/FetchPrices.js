import { memberships } from "../Objects/Objects";

export async function fetchPrices(env) {
    try{
        const data = memberships
        return jsonResponse(data);
    } catch (error)  {
        console.error("Error fetching prices:", error);
        return jsonResponse({ error: "Failed to fetch prices" }, 500);
    }

}