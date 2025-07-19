import { memberships } from "../Objects/Objects";
import { jsonResponse } from "../utils";
export async function handleKidCheckoutSession(request, env) {
    try {      
        const { firstName, lastName, email, phone, kids, optionIndex, purchasingHigherIndex } = await request.json();
        validateInput({ kids, email });
        const timestamp = Date.now().toString(); 
        const membershipDetails = determineMembershipDetails(optionIndex,purchasingHigherIndex);
        const totalPrice = calculatePrice(kids, optionIndex, purchasingHigherIndex );
        const  customerId  = await CreateCustomer(env, firstName, lastName, email);
        const checkoutSession = await createStripeCheckoutSession(env, firstName, lastName,  timestamp, phone, customerId, totalPrice, kids, membershipDetails);
        return jsonResponse({ url: checkoutSession.url });
    } catch (error) {
        console.error("Error creating checkout session:", error);
        return jsonResponse({ error: error.message }, 500);
    }
}


// Validate input data
function validateInput({ kids, email }) {
    if (!email || typeof email !== "string") {
        throw new Error("Invalid parent email");
    }
    if (!Array.isArray(kids) || kids.length === 0) {
        throw new Error("Invalid kids data");
    }
}

// Fetch membership details based on the provided code
function determineMembershipDetails(optionIndex, purchasingHigherIndex) {
 
    const membership = memberships[purchasingHigherIndex].info[optionIndex];
    console.log(optionIndex, purchasingHigherIndex)
    console.log('helllo')
    console.log(membership)
    console.log(membership.duration)
    if (!membership) {
        throw new Error("Invalid membership code");
    }

    return membership;
}



async function CreateCustomer(env, firstName, lastName, email) {
    const response = await stripeRequest(env, "customers", "POST", { 
        email: email,
        name: `${firstName} ${lastName}`, 
     address: {
            line1: "20 Cranston Park Ave",
            city: "Maple",
            state: "ON",
            postal_code: "L6A 2W2",
            country: "CA"
        }});
    const customerId = response.id;
    return customerId ;
}


  async function createStripeCheckoutSession(env, firstName, lastName, timestamp, phone, customerId, totalPrice, kids, membershipDetails) {
    const isSubscription = membershipDetails.subscription === true;
    
    console.log(isSubscription);
  const duration = membershipDetails.duration
 
    const metadata = {
          phone,
      timestamp,
      firstName, 
      lastName,
       duration,
       kids: JSON.stringify(kids),
       subscription: isSubscription

    };
  
   const sessionPayload = {
  customer: customerId,
  success_url: "https://rh-bjj.com/success",
  cancel_url: "https://rh-bjj.com/cancel",
  billing_address_collection: "required",  // <-- ADD THIS
  automatic_tax: { enabled: true },
  "line_items[0][price_data][currency]": "cad",
  "line_items[0][price_data][product_data][name]": "Kids Membership",
  "line_items[0][price_data][unit_amount]": totalPrice,
  "line_items[0][quantity]": 1,
  metadata: metadata
};
  
    if (isSubscription) {
      sessionPayload.mode = "subscription";
      sessionPayload.payment_method_types = ["card"];
      sessionPayload["line_items[0][price_data][recurring][interval]"] = "month";
     } else {
      sessionPayload.mode = "payment";
      sessionPayload.payment_method_types = ["card", "klarna"];
     }
  
    const sessionData = await stripeRequest(env, "checkout/sessions", "POST", sessionPayload);
    return sessionData;
  }
  

  // Calculate the total subscription price for kids
function calculatePrice(kids, optionIndex, purchasingHigherIndex ) {
     
    const basePrice = memberships[purchasingHigherIndex].info[optionIndex].price
    console.log('this is the base price')
    console.log(basePrice)
    return kids.length*basePrice
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
