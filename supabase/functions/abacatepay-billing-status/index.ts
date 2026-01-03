const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// @ts-ignore - Deno is available in Supabase Edge Functions runtime
declare const Deno: { serve: (handler: (req: Request) => Promise<Response>) => void };

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { apiKey, billingId } = await req.json()

        if (!apiKey || !billingId) {
            return new Response(JSON.stringify({ error: 'API Key and billingId are required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        console.log('🥑 Checking billing status for:', billingId)

        // AbacatePay uses /v1/billing/list endpoint - no individual show endpoint exists
        const response = await fetch(`https://api.abacatepay.com/v1/billing/list`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
        })

        const listData = await response.json()

        console.log('🥑 List response status:', response.status)
        console.log('🥑 List response data:', JSON.stringify(listData))

        if (!response.ok || listData.error) {
            console.error('🥑 API Error:', listData.error || 'Unknown error')
            return new Response(JSON.stringify({ error: listData.error || 'Failed to fetch billings' }),
                { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Find the specific billing by ID from the list
        const billings = listData.data || []
        const billing = billings.find((b: any) => b.id === billingId)

        if (!billing) {
            console.log('🥑 Billing not found in list. Available IDs:', billings.map((b: any) => b.id))
            return new Response(JSON.stringify({ error: 'Billing not found', data: null }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        console.log('🥑 Found billing:', JSON.stringify(billing))

        return new Response(JSON.stringify({ data: billing, error: null }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    } catch (error) {
        console.error('🥑 Error:', error.message)
        return new Response(JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})
