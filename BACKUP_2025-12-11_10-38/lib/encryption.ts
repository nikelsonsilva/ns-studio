/**
 * =====================================================
 * ENCRYPTION UTILITIES - Criptografia de Dados Sensíveis
 * =====================================================
 * Funções para criptografar e descriptografar dados sensíveis
 * como API keys do Stripe usando AES-256-GCM
 * =====================================================
 */

// Usando Web Crypto API (nativa do browser e Node.js)
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recomendado para GCM

/**
 * Gera uma chave de criptografia a partir de uma senha
 * Usa PBKDF2 para derivar a chave
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Importar a senha como chave base
    const baseKey = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    // Derivar a chave final usando PBKDF2
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt as BufferSource,
            iterations: 100000, // Recomendado OWASP
            hash: 'SHA-256'
        },
        baseKey,
        { name: ALGORITHM, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Gera um salt aleatório
 */
function generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Gera um IV (Initialization Vector) aleatório
 */
function generateIV(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Converte ArrayBuffer para string Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Converte string Base64 para ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Criptografa dados sensíveis
 * @param plaintext - Texto a ser criptografado
 * @param masterPassword - Senha mestra (deve vir de variável de ambiente)
 * @returns String Base64 contendo: salt + iv + dados criptografados
 */
export async function encrypt(plaintext: string, masterPassword: string): Promise<string> {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(plaintext);

        // Gerar salt e IV aleatórios
        const salt = generateSalt();
        const iv = generateIV();

        // Derivar chave da senha mestra
        const key = await deriveKey(masterPassword, salt);

        // Criptografar
        const encryptedData = await crypto.subtle.encrypt(
            {
                name: ALGORITHM,
                iv: iv as BufferSource
            },
            key,
            data
        );

        // Combinar salt + iv + dados criptografados
        const combined = new Uint8Array(
            salt.byteLength + iv.byteLength + encryptedData.byteLength
        );
        combined.set(salt, 0);
        combined.set(iv, salt.byteLength);
        combined.set(new Uint8Array(encryptedData), salt.byteLength + iv.byteLength);

        // Converter para Base64
        return arrayBufferToBase64(combined.buffer);
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
}

/**
 * Descriptografa dados sensíveis
 * @param encryptedData - String Base64 contendo salt + iv + dados
 * @param masterPassword - Senha mestra
 * @returns Texto descriptografado
 */
export async function decrypt(encryptedData: string, masterPassword: string): Promise<string> {
    try {
        // Converter de Base64
        const combined = new Uint8Array(base64ToArrayBuffer(encryptedData));

        // Extrair salt, iv e dados criptografados
        const salt = combined.slice(0, 16);
        const iv = combined.slice(16, 16 + IV_LENGTH);
        const data = combined.slice(16 + IV_LENGTH);

        // Derivar chave da senha mestra
        const key = await deriveKey(masterPassword, salt);

        // Descriptografar
        const decryptedData = await crypto.subtle.decrypt(
            {
                name: ALGORITHM,
                iv: iv as BufferSource
            },
            key,
            data as BufferSource
        );

        // Converter para string
        const decoder = new TextDecoder();
        return decoder.decode(decryptedData);
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
}

/**
 * Gera um hash seguro de uma string (para verificação)
 */
export async function hash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return arrayBufferToBase64(hashBuffer);
}

/**
 * Mascara uma API key para exibição segura
 * Exemplo: sk_live_abc123... -> sk_live_***...123
 */
export function maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 12) return '***';

    const prefix = apiKey.substring(0, 8);
    const suffix = apiKey.substring(apiKey.length - 4);
    return `${prefix}***...${suffix}`;
}

/**
 * Valida formato de API key do Stripe
 */
export function isValidStripeKeyFormat(apiKey: string): boolean {
    // Stripe keys começam com sk_test_ ou sk_live_
    const pattern = /^sk_(test|live)_[A-Za-z0-9]{24,}$/;
    return pattern.test(apiKey);
}
