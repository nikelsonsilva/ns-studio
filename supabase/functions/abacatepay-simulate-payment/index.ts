/**
 * =====================================================
 * ABACATE PAY - Simulate Payment (Dev Mode Only)
 * =====================================================
 * Simula um pagamento PIX no modo de desenvolvimento.
 * Documentação: https://docs.abacatepay.com/api-reference/simular-pagamento
 * =====================================================
 */

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

        console.log('🥑 [Simulate] Starting simulation for billing:', billingId)

        // Step 1: Get billing details to find the PIX QR Code ID
        const listResponse = await fetch(`https://api.abacatepay.com/v1/billing/list`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
        })

        const listData = await listResponse.json()
        console.log('🥑 [Simulate] Billing list response:', JSON.stringify(listData))

        if (!listResponse.ok || listData.error) {
            return new Response(JSON.stringify({ error: listData.error || 'Failed to fetch billings' }),
                { status: listResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Find the billing
        const billings = listData.data || []
        const billing = billings.find((b: any) => b.id === billingId)

        if (!billing) {
            return new Response(JSON.stringify({ error: 'Billing not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        console.log('🥑 [Simulate] Found billing:', JSON.stringify(billing))

        // Check if already paid
        if (billing.status === 'PAID') {
            console.log('🥑 [Simulate] Billing already paid!')
            return new Response(JSON.stringify({
                data: { status: 'PAID', message: 'Already paid' },
                error: null
            }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Check if in dev mode
        if (!billing.devMode) {
            return new Response(JSON.stringify({
                error: 'Cannot simulate payment in production mode. Only dev mode billings can be simulated.'
            }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // The billing might have a pixQrCode associated - we need to find it
        // For billings created with PIX method, the QR code ID might be in the billing data
        // or we need to check if there's a pix ID pattern

        // Try to simulate using the billing ID directly first (some APIs support this)
        // If not, we'll need to find the associated PIX QR Code

        // According to AbacatePay docs, we need the pixQrCode ID for simulation
        // The billing ID format is different from pix_char_ format
        // We'll try both approaches

        let pixQrCodeId = billing.pixQrCode?.id || billing.pixQrCodeId;

        // If no direct pix ID, try to extract from response or use billing ID
        if (!pixQrCodeId) {
            // Check if billing has payments array with pix info
            if (billing.payments && billing.payments.length > 0) {
                pixQrCodeId = billing.payments[0].pixQrCodeId || billing.payments[0].id;
            }
        }

        console.log('🥑 [Simulate] PIX QR Code ID to simulate:', pixQrCodeId || 'Not found, will try billing-based simulation')

        // Try to simulate the payment
        // Note: The simulate endpoint requires a PIX QR Code ID, not a billing ID
        // If we don't have a specific PIX ID, we'll need to handle this differently

        if (pixQrCodeId) {
            const simulateResponse = await fetch(`https://api.abacatepay.com/v1/pixQrCode/simulate-payment?id=${pixQrCodeId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ metadata: {} }),
            })

            const simulateData = await simulateResponse.json()
            console.log('🥑 [Simulate] Simulation response:', JSON.stringify(simulateData))

            if (!simulateResponse.ok) {
                return new Response(JSON.stringify({
                    error: simulateData.error || 'Failed to simulate payment',
                    details: simulateData
                }),
                    { status: simulateResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }

            return new Response(JSON.stringify({
                data: {
                    status: 'PAID',
                    message: 'Payment simulated successfully',
                    simulationResult: simulateData
                },
                error: null
            }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } else {
            // No PIX ID found - return info about the billing
            return new Response(JSON.stringify({
                error: 'No PIX QR Code ID found for this billing. Make sure the payment was initiated via PIX.',
                billing: billing
            }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

    } catch (error: any) {
        console.error('🥑 [Simulate] Error:', error.message)
        return new Response(JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})
