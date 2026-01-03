# 🚀 Deploy em Produção - VPN + Domínio Próprio

Guia completo para colocar o NS Studio em produção com domínio próprio e VPN.

---

## 📋 Pré-requisitos

- [ ] Domínio registrado (ex: `nsstudio.com.br`)
- [ ] VPN/Servidor configurado
- [ ] SSL/HTTPS configurado
- [ ] Código testado localmente

---

## 🔧 Parte 1: Configurar Variáveis de Ambiente

### 1.1. Criar arquivo `.env.production`

No servidor/VPN, criar arquivo `.env.production`:

```env
# Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key

# Stripe (será buscado do banco, mas pode ter fallback)
VITE_STRIPE_SECRET_KEY=sk_live_...

# Domínio da aplicação
VITE_APP_URL=https://nsstudio.com.br

# Gemini (se usar)
GEMINI_API_KEY=sua_key

# Encryption
VITE_ENCRYPTION_KEY=sua_chave_segura_aqui
```

### 1.2. Configurar domínio no código

O sistema já usa `window.location.origin` para gerar links, mas você pode forçar o domínio:

**Criar arquivo:** `lib/config.ts`

```typescript
// Configuração de domínio
export const APP_CONFIG = {
    // URL base da aplicação
    baseUrl: import.meta.env.VITE_APP_URL || window.location.origin,
    
    // URL pública para agendamentos
    publicBookingUrl: import.meta.env.VITE_APP_URL 
        ? `${import.meta.env.VITE_APP_URL}/booking`
        : `${window.location.origin}/booking`,
    
    // URL do webhook
    webhookUrl: import.meta.env.VITE_APP_URL
        ? `${import.meta.env.VITE_APP_URL}/api/stripe/webhook`
        : `${window.location.origin}/api/stripe/webhook`,
    
    // Ambiente
    isProduction: import.meta.env.PROD,
    isDevelopment: import.meta.env.DEV
};
```

---

## 🌐 Parte 2: Atualizar Links Públicos

### 2.1. Atualizar `bookingLinks.ts`

**Arquivo:** `lib/bookingLinks.ts`

Substituir todas as ocorrências de `window.location.origin` por `APP_CONFIG.baseUrl`:

```typescript
import { APP_CONFIG } from './config';

export function generateBookingLink(businessId: string, professionalId?: string): string {
    const baseUrl = APP_CONFIG.publicBookingUrl;
    
    let url = `${baseUrl}/${businessId}`;
    
    if (professionalId) {
        url += `?professional=${professionalId}`;
    }
    
    return url;
}
```

### 2.2. Atualizar links de pagamento do Stripe

**Arquivo:** `lib/stripePaymentLinks.ts`

```typescript
import { APP_CONFIG } from './config';

// URL de retorno após pagamento
const successUrl = `${APP_CONFIG.baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
const cancelUrl = `${APP_CONFIG.baseUrl}/payment/cancel`;
```

---

## 🔐 Parte 3: Configurar Stripe para Produção

### 3.1. Trocar para chaves LIVE

No Stripe Dashboard:

1. Ir em: https://dashboard.stripe.com/apikeys
2. Copiar **Live** API keys (não Test)
3. Salvar no banco de dados:

```sql
-- Atualizar para chaves LIVE
UPDATE businesses
SET 
    stripe_api_key = 'CHAVE_CRIPTOGRAFADA_LIVE',
    stripe_api_key_valid = true
WHERE id = 'seu_business_id';
```

### 3.2. Configurar Webhook de Produção

1. Ir em: https://dashboard.stripe.com/webhooks
2. Clicar em **"Add endpoint"**
3. **Endpoint URL:**
   ```
   https://nsstudio.com.br/api/stripe/webhook
   ```
4. **Events:**
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.succeeded`
5. Copiar **Signing secret** (whsec_...)
6. Salvar no banco:

```sql
UPDATE businesses
SET stripe_webhook_secret = 'whsec_LIVE_...'
WHERE id = 'seu_business_id';
```

---

## 🏗️ Parte 4: Build e Deploy

### 4.1. Build da aplicação

```bash
# Instalar dependências
npm install

# Build para produção
npm run build
```

Isso cria a pasta `dist/` com os arquivos otimizados.

### 4.2. Deploy no servidor/VPN

**Opção A - Servidor Node.js:**

```bash
# Copiar arquivos para servidor
scp -r dist/* usuario@servidor:/var/www/nsstudio

# No servidor, instalar servidor HTTP
npm install -g serve

# Servir aplicação
serve -s dist -l 3000
```

**Opção B - Nginx:**

Configurar nginx para servir a pasta `dist/`:

```nginx
server {
    listen 80;
    server_name nsstudio.com.br;
    
    # Redirecionar para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name nsstudio.com.br;
    
    # SSL
    ssl_certificate /etc/ssl/certs/nsstudio.crt;
    ssl_certificate_key /etc/ssl/private/nsstudio.key;
    
    # Root
    root /var/www/nsstudio/dist;
    index index.html;
    
    # SPA - todas as rotas vão para index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API Webhook (proxy para Node.js se necessário)
    location /api/stripe/webhook {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Opção C - Vercel/Netlify:**

```bash
# Vercel
npm install -g vercel
vercel --prod

# Netlify
npm install -g netlify-cli
netlify deploy --prod
```

---

## 🔒 Parte 5: Configurar SSL/HTTPS

### 5.1. Obter certificado SSL

**Opção A - Let's Encrypt (Grátis):**

```bash
# Instalar certbot
sudo apt-get install certbot python3-certbot-nginx

# Obter certificado
sudo certbot --nginx -d nsstudio.com.br -d www.nsstudio.com.br

# Renovação automática
sudo certbot renew --dry-run
```

**Opção B - Cloudflare (Recomendado):**

1. Adicionar domínio no Cloudflare
2. Atualizar nameservers
3. SSL automático ativado
4. Proteção DDoS incluída

---

## 🌍 Parte 6: Configurar DNS

### 6.1. Apontar domínio para servidor

No painel do registrador de domínio:

```
Tipo    Nome    Valor                   TTL
A       @       IP_DO_SERVIDOR          3600
A       www     IP_DO_SERVIDOR          3600
CNAME   api     nsstudio.com.br         3600
```

### 6.2. Verificar DNS

```bash
# Verificar se DNS está propagado
nslookup nsstudio.com.br

# Ou
dig nsstudio.com.br
```

---

## ✅ Parte 7: Checklist de Produção

### Antes de ir ao ar:

- [ ] Build da aplicação gerado
- [ ] Variáveis de ambiente configuradas
- [ ] Chaves Stripe LIVE configuradas
- [ ] Webhook Stripe configurado com domínio
- [ ] SSL/HTTPS funcionando
- [ ] DNS apontando corretamente
- [ ] Testar agendamento completo
- [ ] Testar pagamento real (valor baixo)
- [ ] Testar webhook recebendo eventos
- [ ] Backup do banco de dados
- [ ] Monitoramento configurado

---

## 🧪 Parte 8: Testar em Produção

### 8.1. Teste de Agendamento Público

1. Abrir: `https://nsstudio.com.br/booking/SEU_BUSINESS_ID`
2. Fazer agendamento
3. Verificar se salvou no banco
4. Verificar se aparece na agenda

### 8.2. Teste de Pagamento

1. Criar agendamento com pagamento online
2. Usar cartão de teste Stripe (mesmo em LIVE, tem cartões de teste)
3. Completar pagamento
4. Verificar logs do webhook
5. Verificar se status atualizou

### 8.3. Monitorar Logs

**Ver logs do webhook:**

```bash
# Se usando PM2
pm2 logs nsstudio

# Se usando systemd
journalctl -u nsstudio -f

# Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 🔄 Parte 9: Atualizar Links Existentes

### 9.1. Atualizar links de agendamento

Todos os links públicos agora usarão o domínio:

```
Antes: http://localhost:3000/booking/abc123
Depois: https://nsstudio.com.br/booking/abc123
```

### 9.2. Atualizar links do Stripe

Os links de checkout do Stripe usarão:

```
Success: https://nsstudio.com.br/payment/success
Cancel: https://nsstudio.com.br/payment/cancel
```

### 9.3. Compartilhar links

Agora você pode compartilhar:

```
📱 WhatsApp: https://nsstudio.com.br/booking/abc123
📧 Email: https://nsstudio.com.br/booking/abc123
📲 QR Code: https://nsstudio.com.br/booking/abc123
```

---

## 🚨 Troubleshooting Produção

### Webhook não recebe eventos:

```bash
# Verificar se porta está aberta
sudo netstat -tulpn | grep 3000

# Testar endpoint
curl -X POST https://nsstudio.com.br/api/stripe/webhook

# Ver logs do Stripe
https://dashboard.stripe.com/webhooks
```

### SSL não funciona:

```bash
# Verificar certificado
sudo certbot certificates

# Renovar
sudo certbot renew

# Testar SSL
https://www.ssllabs.com/ssltest/
```

### DNS não propaga:

```bash
# Limpar cache DNS local
ipconfig /flushdns  # Windows
sudo systemd-resolve --flush-caches  # Linux

# Verificar propagação global
https://dnschecker.org
```

---

## 📊 Parte 10: Monitoramento

### 10.1. Configurar alertas

**Uptime monitoring:**
- UptimeRobot (grátis)
- Pingdom
- StatusCake

**Error tracking:**
- Sentry
- LogRocket
- Rollbar

### 10.2. Métricas importantes

- Uptime do servidor
- Tempo de resposta
- Taxa de erro de webhooks
- Pagamentos processados
- Agendamentos criados

---

## 🎯 Resumo Rápido

```bash
# 1. Build
npm run build

# 2. Deploy
scp -r dist/* servidor:/var/www/nsstudio

# 3. Configurar .env.production
VITE_APP_URL=https://nsstudio.com.br

# 4. Atualizar Stripe
- Webhook URL: https://nsstudio.com.br/api/stripe/webhook
- Chaves LIVE
- Salvar signing secret no banco

# 5. Configurar DNS
A @ IP_SERVIDOR

# 6. SSL
certbot --nginx -d nsstudio.com.br

# 7. Testar
https://nsstudio.com.br
```

---

## 📞 Suporte

Se algo não funcionar:

1. Verificar logs do servidor
2. Verificar logs do Stripe
3. Verificar DNS
4. Verificar SSL
5. Testar webhook manualmente

---

## ✅ Checklist Final

- [ ] Domínio configurado
- [ ] SSL ativo
- [ ] Build deployado
- [ ] Variáveis de ambiente configuradas
- [ ] Stripe em modo LIVE
- [ ] Webhook configurado
- [ ] Teste de agendamento OK
- [ ] Teste de pagamento OK
- [ ] Monitoramento ativo
- [ ] Backup configurado

🎉 **Pronto para produção!**
