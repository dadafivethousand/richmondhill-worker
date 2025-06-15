import { getCorsHeaders, handleOptionsRequest} from './utils.js';
import { handleIntakeForm } from './Handlers/IntakeForm.js';
import {handleAdultCheckoutSession} from './Handlers/AdultMemberships.js'
 
import { fetchPrices } from './Handlers/AdultMemberships.js';

export default {
  async fetch(request, env, ctx) {
        const { pathname } = new URL(request.url);
        async function handleRequest(request, env) {
            if (request.method === 'OPTIONS') {
                return handleOptionsRequest();
            }
            const { method, url } = request;
            const pathname = new URL(url).pathname;
			 if (method === 'POST' && pathname === '/intake-form') {
   
              return handleIntakeForm(request, env, ctx);
            }
            else if (method === 'POST' && pathname === '/adult_subscription') {
              return handleAdultCheckoutSession(request, env, ctx);
            }
             else if (method === 'GET' && pathname === '/membership-info') {
              return fetchPrices(request, env, ctx);
            }
          }
        try {

            return handleRequest(request, env)

        } catch (error) {
            console.error('Unhandled error:', error);
            return new Response(
                JSON.stringify({ error: 'Internal Server Error' }),
                {
                    status: 500,
                    headers: getCorsHeaders(),
                }
            );
        }
    }
};
