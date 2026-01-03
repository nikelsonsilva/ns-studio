/**
 * Nuvem Fiscal API Client
 * 
 * This library handles authentication and API calls to Nuvem Fiscal.
 * All API calls should be made through the Edge Function for security.
 */

const NUVEM_FISCAL_API_URL = 'https://api.nuvemfiscal.com.br';

export interface NuvemFiscalConfig {
    clientId: string;
    clientSecret: string;
    ambiente: 'homologacao' | 'producao';
}

export interface EmpresaData {
    cpf_cnpj: string;
    inscricao_municipal?: string;
    razao_social: string;
    nome_fantasia?: string;
    email: string;
    fone?: string;
    endereco: {
        logradouro: string;
        numero: string;
        complemento?: string;
        bairro: string;
        codigo_municipio: string;
        cidade: string;
        uf: string;
        cep: string;
    };
}

export interface NfseData {
    ambiente: 'homologacao' | 'producao';
    infDPS: {
        tpAmb: number; // 1 = Produção, 2 = Homologação
        dhEmi: string; // Data/hora emissão ISO8601
        verAplic: string;
        serie: string;
        nDPS: number;
        dCompet: string;
        tpEmit: number;
        cLocEmi: number; // Código IBGE municipio
        subst?: {
            cNFS: string;
            cLocNFS: number;
        };
        prest: {
            CNPJ?: string;
            CPF?: string;
            IM?: string;
            regTrib: {
                opSimpNac: number;
                regApTribSN?: number;
                regEspTrib?: number;
            };
        };
        toma: {
            CNPJ?: string;
            CPF?: string;
            xNome: string;
            end?: {
                endNac?: {
                    cMun: number;
                    CEP: string;
                    xLgr: string;
                    nro: string;
                    xCpl?: string;
                    xBairro: string;
                };
            };
            fone?: string;
            email?: string;
        };
        serv: {
            cServ: {
                cTribNac: string;
                cTribMun?: string;
                CNAE?: string;
                xDescServ: string;
            };
            comExt?: any;
            locPrest: {
                cLocPrest: number; // Código IBGE
                cPaisPrest?: string;
            };
            lsSubcontr?: any[];
            vReceb?: number;
            vServ: {
                vServPrest: number;
                vDescIncwordt?: number;
                vDescCondIncBenef?: number;
            };
            trib: {
                tribMun: {
                    tribISSQN: number;
                    cPaisResult?: string;
                    BM?: {
                        pAliq: number;
                    };
                    exigISSQN: number;
                    tpImunidade?: number;
                    tpRetISSQN: number;
                };
                tribFed?: {
                    CST: number;
                    vBC?: number;
                    pPIS?: number;
                    vPIS?: number;
                    pCOFINS?: number;
                    vCOFINS?: number;
                    tpRetPisCofins?: number;
                };
            };
        };
        infCompl?: {
            xInfAdFisco?: string;
            xInfCpl?: string;
        };
    };
}

/**
 * Get OAuth2 access token from Nuvem Fiscal
 */
export async function getAccessToken(config: NuvemFiscalConfig): Promise<string> {
    const response = await fetch(`${NUVEM_FISCAL_API_URL}/oauth/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: config.clientId,
            client_secret: config.clientSecret,
            scope: 'empresa cep cnpj mdfe cte nfse nfe',
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get access token: ${error}`);
    }

    const data = await response.json();
    return data.access_token;
}

/**
 * Create empresa (company) in Nuvem Fiscal
 */
export async function createEmpresa(
    accessToken: string,
    empresa: EmpresaData
): Promise<{ id: string }> {
    const response = await fetch(`${NUVEM_FISCAL_API_URL}/empresas`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(empresa),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create empresa: ${error}`);
    }

    return await response.json();
}

/**
 * Upload certificate to empresa
 */
export async function uploadCertificado(
    accessToken: string,
    empresaId: string,
    certificadoBase64: string,
    senha: string
): Promise<{ id: string }> {
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
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to upload certificado: ${error}`);
    }

    return await response.json();
}

/**
 * Emit NFS-e
 */
export async function emitirNfse(
    accessToken: string,
    nfseData: NfseData
): Promise<{
    id: string;
    numero: string;
    status: string;
    pdf_url?: string;
    xml?: string;
}> {
    const response = await fetch(`${NUVEM_FISCAL_API_URL}/nfse/dps`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(nfseData),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to emit NFS-e: ${error}`);
    }

    return await response.json();
}

/**
 * Get NFS-e by ID
 */
export async function consultarNfse(
    accessToken: string,
    nfseId: string
): Promise<any> {
    const response = await fetch(`${NUVEM_FISCAL_API_URL}/nfse/${nfseId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get NFS-e: ${error}`);
    }

    return await response.json();
}

/**
 * Cancel NFS-e
 */
export async function cancelarNfse(
    accessToken: string,
    nfseId: string,
    motivo: string
): Promise<any> {
    const response = await fetch(`${NUVEM_FISCAL_API_URL}/nfse/${nfseId}/cancelamento`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ motivo }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to cancel NFS-e: ${error}`);
    }

    return await response.json();
}

/**
 * Get NFS-e PDF
 */
export async function downloadPdfNfse(
    accessToken: string,
    nfseId: string
): Promise<string> {
    const response = await fetch(`${NUVEM_FISCAL_API_URL}/nfse/${nfseId}/pdf`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get NFS-e PDF: ${error}`);
    }

    // Returns URL to PDF
    const data = await response.json();
    return data.url;
}
