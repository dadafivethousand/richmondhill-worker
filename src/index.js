import { getCorsHeaders, handleOptionsRequest} from './utils.js';
import { handleIntakeForm } from './Handlers/intakeForm.js';

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
