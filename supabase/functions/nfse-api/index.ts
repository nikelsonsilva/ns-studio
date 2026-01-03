// @ts-nocheck
// deno-lint-ignore-file
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Nuvem Fiscal API URLs
const NUVEM_FISCAL_API_URL = 'https://api.nuvemfiscal.com.br'
const NUVEM_FISCAL_AUTH_URL = 'https://auth.nuvemfiscal.com.br'

// Get credentials from environment (Supabase Secrets)
const CLIENT_ID = Deno.env.get('NUVEM_FISCAL_CLIENT_ID') || ''
const CLIENT_SECRET = Deno.env.get('NUVEM_FISCAL_CLIENT_SECRET') || ''

/**
 * Get OAuth2 access token from Nuvem Fiscal
 */
async function getAccessToken(): Promise<string> {
    const response = await fetch(`${NUVEM_FISCAL_AUTH_URL}/oauth/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            scope: 'empresa cep cnpj mdfe cte nfse nfe',
        }),
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to get access token: ${error}`)
    }

    const data = await response.json()
    return data.access_token
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Parse request body
        const body = req.method === 'POST' ? await req.json() : {}

        // Get action from body or URL path
        const url = new URL(req.url)
        const urlAction = url.pathname.split('/').pop()
        const action = body.action || urlAction

        // Check credentials before proceeding
        if (!CLIENT_ID || !CLIENT_SECRET) {
            console.error('Missing Nuvem Fiscal credentials')
            return new Response(
                JSON.stringify({ error: 'Nuvem Fiscal credentials not configured. Please set NUVEM_FISCAL_CLIENT_ID and NUVEM_FISCAL_CLIENT_SECRET secrets.' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Get access token for all requests
        const accessToken = await getAccessToken()

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        switch (action) {
            case 'register_company':
            case 'cadastrar-empresa': {
                // Accept both naming conventions
                const business_id = body.businessId || body.business_id
                const companyData = body.companyData || body.empresa
                const ambiente = body.ambiente || 'homologacao'

                if (!business_id || !companyData) {
                    return new Response(
                        JSON.stringify({ error: 'businessId and companyData are required' }),
                        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    )
                }

                // Build empresa object for Nuvem Fiscal API
                const empresa = {
                    cpf_cnpj: companyData.cpf_cnpj,
                    inscricao_municipal: companyData.inscricao_municipal || undefined,
                    nome_razao_social: companyData.razao_social,
                    nome_fantasia: companyData.nome_fantasia || companyData.razao_social,
                    email: companyData.email,
                    endereco: {
                        logradouro: companyData.endereco?.logradouro,
                        numero: companyData.endereco?.numero,
                        complemento: companyData.endereco?.complemento || undefined,
                        bairro: companyData.endereco?.bairro,
                        codigo_municipio: companyData.endereco?.codigo_municipio,
                        cidade: companyData.endereco?.cidade,
                        uf: companyData.endereco?.uf,
                        cep: companyData.endereco?.cep,
                        codigo_pais: '1058',
                        pais: 'Brasil',
                    },
                }

                console.log('Registering company:', empresa)

                let response = await fetch(`${NUVEM_FISCAL_API_URL}/empresas`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(empresa),
                })

                let result: any

                if (!response.ok) {
                    const errorText = await response.text()
                    console.error('Nuvem Fiscal error:', errorText)

                    // Verificar se empresa já existe
                    try {
                        const errorJson = JSON.parse(errorText)
                        if (errorJson.error?.code === 'EmpresaAlreadyExists') {
                            // Consultar empresa existente
                            console.log('Empresa já existe, consultando...')
                            const consultaResponse = await fetch(
                                `${NUVEM_FISCAL_API_URL}/empresas/${companyData.cpf_cnpj}`,
                                {
                                    method: 'GET',
                                    headers: {
                                        'Authorization': `Bearer ${accessToken}`,
                                    },
                                }
                            )

                            if (consultaResponse.ok) {
                                result = await consultaResponse.json()
                                console.log('Empresa existente encontrada:', result.cpf_cnpj)
                            } else {
                                throw new Error(`Nuvem Fiscal error: ${errorText}`)
                            }
                        } else {
                            throw new Error(`Nuvem Fiscal error: ${errorText}`)
                        }
                    } catch (parseError) {
                        throw new Error(`Nuvem Fiscal error: ${errorText}`)
                    }
                } else {
                    result = await response.json()
                }

                // Save empresa_id to business
                await supabase
                    .from('businesses')
                    .update({
                        nfse_config: {
                            empresa_id: result.cpf_cnpj, // Nuvem Fiscal usa cpf_cnpj como ID
                            cnpj: companyData.cpf_cnpj,
                            status: 'empresa_cadastrada',
                            ambiente: ambiente,
                        }
                    })
                    .eq('id', business_id)

                return new Response(JSON.stringify({
                    success: true,
                    empresa_id: result.cpf_cnpj,
                    message: result.id ? 'Empresa cadastrada com sucesso na Nuvem Fiscal' : 'Empresa já estava cadastrada na Nuvem Fiscal',
                    already_existed: !result.id
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            case 'upload-certificado': {
                // Upload certificate to empresa
                const { businessId, empresaId, certificadoBase64, senha } = body

                if (!empresaId || !certificadoBase64 || !senha) {
                    return new Response(
                        JSON.stringify({ error: 'empresaId, certificadoBase64 and senha are required' }),
                        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    )
                }

                console.log('Uploading certificate for empresa:', empresaId)

                const response = await fetch(
                    `${NUVEM_FISCAL_API_URL}/empresas/${empresaId}/certificado`,
                    {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            certificado: certificadoBase64,
                            password: senha,
                        }),
                    }
                )

                if (!response.ok) {
                    const errorText = await response.text()
                    console.error('Nuvem Fiscal certificate error:', errorText)
                    return new Response(
                        JSON.stringify({ error: `Erro ao enviar certificado: ${errorText}` }),
                        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    )
                }

                const result = await response.json()

                // Update business with certificado_id
                const { data: business } = await supabase
                    .from('businesses')
                    .select('nfse_config')
                    .eq('id', businessId)
                    .single()

                await supabase
                    .from('businesses')
                    .update({
                        nfse_config: {
                            ...business?.nfse_config,
                            certificado_id: result.id,
                            certificado_validade: result.not_valid_after,
                            status: 'configurado',
                        }
                    })
                    .eq('id', businessId)

                return new Response(JSON.stringify({
                    success: true,
                    certificado_id: result.id,
                    validade: result.not_valid_after,
                    message: 'Certificado cadastrado com sucesso'
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            case 'emitir': {
                // Emit NFS-e
                const { business_id, appointment_id, nfseData } = body

                const response = await fetch(`${NUVEM_FISCAL_API_URL}/nfse/dps`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(nfseData),
                })

                if (!response.ok) {
                    const error = await response.text()

                    // Save error to history
                    await supabase
                        .from('nfse_history')
                        .insert({
                            business_id,
                            appointment_id,
                            status: 'erro',
                            erro_mensagem: error,
                        })

                    throw new Error(`Nuvem Fiscal error: ${error}`)
                }

                const result = await response.json()

                // Save to history
                await supabase
                    .from('nfse_history')
                    .insert({
                        business_id,
                        appointment_id,
                        nuvem_fiscal_id: result.id,
                        numero: result.numero,
                        status: result.status || 'autorizada',
                        valor: nfseData.infDPS.serv.vServ.vServPrest,
                        cliente_nome: nfseData.infDPS.toma.xNome,
                        cliente_cpf_cnpj: nfseData.infDPS.toma.CPF || nfseData.infDPS.toma.CNPJ,
                        servico_descricao: nfseData.infDPS.serv.cServ.xDescServ,
                        pdf_url: result.pdf_url,
                        xml_url: result.xml_url,
                    })

                return new Response(JSON.stringify(result), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            case 'consultar': {
                // Get NFS-e by ID
                const nfseId = url.searchParams.get('id')

                const response = await fetch(`${NUVEM_FISCAL_API_URL}/nfse/${nfseId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                })

                if (!response.ok) {
                    const error = await response.text()
                    throw new Error(`Nuvem Fiscal error: ${error}`)
                }

                const result = await response.json()

                return new Response(JSON.stringify(result), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            case 'cancelar': {
                // Cancel NFS-e
                const { nfseId, motivo, business_id } = body

                const response = await fetch(
                    `${NUVEM_FISCAL_API_URL}/nfse/${nfseId}/cancelamento`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ motivo }),
                    }
                )

                if (!response.ok) {
                    const error = await response.text()
                    throw new Error(`Nuvem Fiscal error: ${error}`)
                }

                const result = await response.json()

                // Update history
                await supabase
                    .from('nfse_history')
                    .update({ status: 'cancelada' })
                    .eq('nuvem_fiscal_id', nfseId)

                return new Response(JSON.stringify(result), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            case 'pdf': {
                // Get PDF URL
                const nfseId = url.searchParams.get('id')

                const response = await fetch(`${NUVEM_FISCAL_API_URL}/nfse/${nfseId}/pdf`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                })

                if (!response.ok) {
                    const error = await response.text()
                    throw new Error(`Nuvem Fiscal error: ${error}`)
                }

                const result = await response.json()

                return new Response(JSON.stringify(result), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            default:
                return new Response(JSON.stringify({ error: 'Unknown action' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error('NFS-e API Error:', error)
        return new Response(
            JSON.stringify({ error: errorMessage }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        )
    }
})
