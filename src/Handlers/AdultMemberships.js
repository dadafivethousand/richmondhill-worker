import { memberships } from "../Objects/Objects";
import { jsonResponse } from "../utils";



export async function handleAdultCheckoutSession(request, env) {
    try {
        const { firstName, lastName, email, phone, optionIndex, purchasingHigherIndex} = await request.json();
        console.log(firstName, lastName)
         validateAdultInput({ firstName, lastName, email, phone });
        const timestamp = Date.now().toString(); 
        const membershipDetails = determineMembershipDetails(optionIndex,purchasingHigherIndex);
      
        const customerId = await createAdultCustomer(env, timestamp, firstName, lastName, email, phone, membershipDetails );
        const checkoutSession = await createAdultStripeCheckoutSession(env, timestamp, customerId, firstName, lastName,  email, phone, membershipDetails);

        return jsonResponse({ url: checkoutSession.url });
    } catch (error) {
        console.error("Error creating adult checkout session:", error);
        return jsonResponse({ error: error.message }, 500);
    }
}   


// Validate input data for adults
function validateAdultInput({ firstName, lastName, email, phone, membershipCode }) {
    if (!firstName || typeof firstName !== "string") {
        throw new Error("Invalid first name");
    }
    if (!lastName || typeof lastName !== "string") {
        throw new Error("Invalid last name");
    }
    if (!email || typeof email !== "string") {
        throw new Error("Invalid email address");
    }
    if (!phone || typeof phone !== "string") {
        throw new Error("Invalid phone number");
    }
}


 

function determineMembershipDetails(optionIndex, purchasingHigherIndex) {
    const membership = memberships[purchasingHigherIndex].info[optionIndex];
    console.log(optionIndex, purchasingHigherIndex)
    console.log('helllo')
    console.log(membership)
    if (!membership) {
        throw new Error("Invalid membership code");
    }

    return membership;
}


async function createAdultCustomer(env, timestamp, firstName, lastName, email, phone, membershipDetails ) {
    const response = await stripeRequest(env, "customers", "POST", {
        email,
        name: `${firstName} ${lastName}`,
        phone,
         address: {
            line1: "20 Cranston Park Ave",
            city: "Maple",
            state: "ON",
            postal_code: "L6A 2W2",
            country: "CA"
        }
    });
    const customerId = response.id;
    return customerId;
}


async function createAdultStripeCheckoutSession(env, timestamp, customerId, firstName, lastName,  email, phone,  membershipDetails) {
    const isSubscription = membershipDetails.subscription === true;
    const duration = membershipDetails.duration
    console.log(isSubscription);
    const metadata = {
            timestamp,  
            firstName, 
            lastName,
            phone, 
            duration,
            subscription: isSubscription
    }
  
    const sessionPayload = {
      customer: customerId,
      success_url: "https://rh-bjj.com/success",
      cancel_url: "https://rh-bjj.com/cancel",
        billing_address_collection: "required",
        automatic_tax: { enabled: true },
      metadata: metadata,

    };
  
    if (isSubscription) {
      sessionPayload.mode = "subscription";
      sessionPayload.payment_method_types = ["card"];
      sessionPayload["line_items[0][price_data][currency]"] = "cad";
      sessionPayload["line_items[0][price_data][product_data][name]"] = membershipDetails.description;
      sessionPayload["line_items[0][price_data][unit_amount]"] = membershipDetails.price;
      sessionPayload["line_items[0][price_data][recurring][interval]"] = "month";
      sessionPayload["line_items[0][quantity]"] = 1;
   
    } else {
      sessionPayload.mode = "payment";
      sessionPayload.payment_method_types = ["card", "afterpay_clearpay"];
      sessionPayload["line_items[0][price_data][currency]"] = "cad";
      sessionPayload["line_items[0][price_data][product_data][name]"] = membershipDetails.description;
      sessionPayload["line_items[0][price_data][unit_amount]"] = membershipDetails.price;
      sessionPayload["line_items[0][quantity]"] = 1;
  
    }
  
    const sessionData = await stripeRequest(env, "checkout/sessions", "POST", sessionPayload);
    return sessionData;

    

  }
  

  
// Helper function for making Stripe API requests
async function stripeRequest(env, endpoint, method, body) {
    const params = new URLSearchParams();
    Object.entries(body).forEach(([key, value]) => {
        if (typeof value === "object" && value !== null) {
            // Handle nested objects
            Object.entries(value).forEach(([nestedKey, nestedValue]) => {
                if (typeof nestedValue === "object") {
                    // Handle deeper nesting
                    Object.entries(nestedValue).forEach(([deepKey, deepValue]) => {
                        params.append(`${key}[${nestedKey}][${deepKey}]`, deepValue);
                    });
                } else {
                    params.append(`${key}[${nestedKey}]`, nestedValue);
                }
            });
        } else {
            params.append(key, value);
        }
    });


    const response = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
        method,
        headers: {
            Authorization: `Bearer ${env.STRIPE_PRODUCTION_KEY}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || "Stripe API error");
    }

    return data;
}

export async function fetchPrices(env) {
    try{
        const data = memberships
        return jsonResponse(data);
    } catch (error)  {
        console.error("Error fetching prices:", error);
        return jsonResponse({ error: "Failed to fetch prices" }, 500);
    }

}