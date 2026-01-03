/**
 * Brasil API - Client Library
 * 
 * Consultas de CEP e CNPJ via BrasilAPI (gratuita)
 * https://brasilapi.com.br/
 */

const BRASIL_API_URL = 'https://brasilapi.com.br/api';

export interface CepData {
    cep: string;
    state: string;
    city: string;
    neighborhood: string;
    street: string;
    service: string;
}

export interface CnpjData {
    cnpj: string;
    razao_social: string;
    nome_fantasia: string;
    descricao_situacao_cadastral: string;
    data_situacao_cadastral: string;
    cnae_fiscal: number;
    cnae_fiscal_descricao: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
    ddd_telefone_1: string;
    email: string;
}

/**
 * Busca endereço pelo CEP
 */
export async function buscarCep(cep: string): Promise<CepData | null> {
    try {
        // Remove caracteres não numéricos
        const cepLimpo = cep.replace(/\D/g, '');

        if (cepLimpo.length !== 8) {
            return null;
        }

        const response = await fetch(`${BRASIL_API_URL}/cep/v1/${cepLimpo}`);

        if (!response.ok) {
            console.error('CEP não encontrado:', cepLimpo);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        return null;
    }
}

/**
 * Busca dados da empresa pelo CNPJ
 */
export async function buscarCnpj(cnpj: string): Promise<CnpjData | null> {
    try {
        // Remove caracteres não numéricos
        const cnpjLimpo = cnpj.replace(/\D/g, '');

        if (cnpjLimpo.length !== 14) {
            return null;
        }

        const response = await fetch(`${BRASIL_API_URL}/cnpj/v1/${cnpjLimpo}`);

        if (!response.ok) {
            console.error('CNPJ não encontrado:', cnpjLimpo);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Erro ao buscar CNPJ:', error);
        return null;
    }
}

/**
 * Busca código IBGE do município
 */
export async function buscarCodigoIbge(uf: string, cidade: string): Promise<string | null> {
    try {
        const response = await fetch(`${BRASIL_API_URL}/ibge/municipios/v1/${uf}?providers=dados-abertos-br,gov,wikipedia`);

        if (!response.ok) {
            return null;
        }

        const municipios = await response.json();

        // Busca por nome do município (normalizado)
        const cidadeNormalizada = cidade
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();

        const municipio = municipios.find((m: any) => {
            const nomeNormalizado = m.nome
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase();
            return nomeNormalizado === cidadeNormalizada;
        });

        return municipio?.codigo_ibge?.toString() || null;
    } catch (error) {
        console.error('Erro ao buscar código IBGE:', error);
        return null;
    }
}

/**
 * Formata CEP: 00000-000
 */
export function formatarCep(cep: string): string {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return cep;
    return `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5)}`;
}

/**
 * Formata CNPJ: 00.000.000/0001-00
 */
export function formatarCnpj(cnpj: string): string {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) return cnpj;
    return cnpjLimpo.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        '$1.$2.$3/$4-$5'
    );
}
