# Integração WhatsApp - Guia Completo

## 📋 Visão Geral

Este guia explica como integrar seu sistema de agendamento com WhatsApp usando a **Evolution API** (open-source e gratuita).

### Arquitetura

```
Cliente WhatsApp
      ↓
Evolution API (Bot)
      ↓
Sua API Pública (/api/public/*)
      ↓
Supabase (Database)
```

## 🔑 Passo 1: Gerar API Token

### No Painel Admin

1. Acesse **Configurações** → **Agenda**
2. Clique em **"Gerar Token de API"**
3. Copie o token gerado (formato: `bk_...`)
4. **Guarde em local seguro** - será usado pelo bot

### Programaticamente

```typescript
import { generateNewAPIToken } from './lib/publicAPI';

const token = await generateNewAPIToken();
console.log('Seu token:', token);
```

## 🚀 Passo 2: Instalar Evolution API

### Opção A: Docker (Recomendado)

```bash
# Clone o repositório
git clone https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api

# Configure variáveis de ambiente
cp .env.example .env

# Edite o .env com suas configurações
nano .env

# Inicie com Docker
docker-compose up -d
```

### Opção B: Deploy em Cloud

**Railway** (mais fácil):
1. Acesse [railway.app](https://railway.app)
2. Clique em "New Project" → "Deploy from GitHub"
3. Selecione o repositório da Evolution API
4. Configure as variáveis de ambiente
5. Deploy automático

**Render, Heroku, DigitalOcean** também funcionam.

## 📡 Passo 3: Configurar Webhooks

Na Evolution API, configure os webhooks para receber mensagens:

```json
{
  "webhook": "https://seu-servidor.com/webhook/whatsapp",
  "webhook_by_events": true,
  "events": [
    "messages.upsert"
  ]
}
```

## 🤖 Passo 4: Criar o Bot

### Estrutura Básica do Bot

```javascript
const API_BASE_URL = 'https://sua-api.com/api/public';
const API_TOKEN = 'bk_seu_token_aqui';

// Headers para todas as requisições
const headers = {
  'Authorization': `Bearer ${API_TOKEN}`,
  'Content-Type': 'application/json'
};

// Função para enviar mensagem
async function sendMessage(phone, message) {
  // Implementação específica da Evolution API
  await evolutionAPI.sendText(phone, message);
}

// Processar mensagem recebida
async function handleMessage(message) {
  const phone = message.from;
  const text = message.text.toLowerCase();

  if (text.includes('agendar') || text === '1') {
    await startBookingFlow(phone);
  }
}

// Fluxo de agendamento
async function startBookingFlow(phone) {
  // 1. Listar serviços
  const services = await getServices();
  await sendMessage(phone, formatServicesMessage(services));
  
  // Aguardar resposta do cliente...
  // 2. Listar profissionais
  // 3. Mostrar datas disponíveis
  // 4. Confirmar agendamento
}
```

## 📚 API Endpoints Disponíveis

### 1. Listar Serviços

```http
GET /api/public/services
Authorization: Bearer bk_seu_token_aqui
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Corte Masculino",
      "description": "Corte tradicional",
      "category": "Cabelo",
      "price": 50.00,
      "duration_minutes": 30,
      "image_url": "https://..."
    }
  ]
}
```

### 2. Listar Profissionais

```http
GET /api/public/professionals
Authorization: Bearer bk_seu_token_aqui
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "João Silva",
      "specialty": "Barbeiro",
      "avatar_url": "https://...",
      "rating": 4.8
    }
  ]
}
```

### 3. Consultar Disponibilidade

```http
GET /api/public/availability
Authorization: Bearer bk_seu_token_aqui
Content-Type: application/json

{
  "professional_id": "uuid",
  "service_id": "uuid",
  "date": "2024-12-10"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "date": "2024-12-10",
    "slots": ["09:00", "09:30", "10:00", "14:00", "15:30"]
  }
}
```

### 4. Criar Agendamento

```http
POST /api/public/appointments
Authorization: Bearer bk_seu_token_aqui
Content-Type: application/json

{
  "professional_id": "uuid",
  "service_id": "uuid",
  "client_name": "Maria Santos",
  "client_phone": "11999999999",
  "client_email": "maria@email.com",
  "date": "2024-12-10",
  "time": "14:00",
  "notes": "Preferência por tesoura"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "appointment_id": "uuid"
  },
  "message": "Appointment created successfully"
}
```

## 💬 Exemplo de Fluxo Conversacional

```
Bot: Olá! Bem-vindo à NS Studio 💈
     
     Como posso ajudar?
     1️⃣ Agendar horário
     2️⃣ Meus agendamentos
     3️⃣ Falar com atendente

Cliente: 1

Bot: Ótimo! Qual serviço você deseja?
     
     1️⃣ Corte Masculino - R$ 50,00 (30min)
     2️⃣ Barba - R$ 30,00 (20min)
     3️⃣ Corte + Barba - R$ 70,00 (45min)

Cliente: 1

Bot: Perfeito! Escolha o profissional:
     
     1️⃣ João Silva ⭐ 4.8
     2️⃣ Pedro Costa ⭐ 4.9
     3️⃣ Qualquer um disponível

Cliente: 2

Bot: Qual dia você prefere?
     
     📅 Datas disponíveis:
     1️⃣ Hoje (05/12)
     2️⃣ Amanhã (06/12)
     3️⃣ Sexta (08/12)
     4️⃣ Outro dia

Cliente: 2

Bot: Horários disponíveis para 06/12:
     
     🕐 Manhã:
     1️⃣ 09:00
     2️⃣ 10:30
     
     🕑 Tarde:
     3️⃣ 14:00
     4️⃣ 15:30
     5️⃣ 16:00

Cliente: 4

Bot: ✅ Agendamento confirmado!
     
     📋 Resumo:
     • Serviço: Corte Masculino
     • Profissional: Pedro Costa
     • Data: 06/12/2024
     • Horário: 15:30
     • Valor: R$ 50,00
     
     📍 NS Studio
     Av. Paulista, 1000 - SP
     
     Nos vemos lá! 😊
```

## 🔧 Código Completo do Bot (Node.js)

```javascript
const axios = require('axios');

class BookingBot {
  constructor(apiToken, apiBaseUrl) {
    this.apiToken = apiToken;
    this.apiBaseUrl = apiBaseUrl;
    this.userSessions = new Map(); // Armazena estado da conversa
  }

  // Headers para API
  get headers() {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json'
    };
  }

  // GET Services
  async getServices() {
    const response = await axios.get(
      `${this.apiBaseUrl}/services`,
      { headers: this.headers }
    );
    return response.data.data;
  }

  // GET Professionals
  async getProfessionals() {
    const response = await axios.get(
      `${this.apiBaseUrl}/professionals`,
      { headers: this.headers }
    );
    return response.data.data;
  }

  // GET Availability
  async getAvailability(professionalId, serviceId, date) {
    const response = await axios.get(
      `${this.apiBaseUrl}/availability`,
      {
        headers: this.headers,
        data: { professional_id: professionalId, service_id: serviceId, date }
      }
    );
    return response.data.data.slots;
  }

  // POST Appointment
  async createAppointment(appointmentData) {
    const response = await axios.post(
      `${this.apiBaseUrl}/appointments`,
      appointmentData,
      { headers: this.headers }
    );
    return response.data;
  }

  // Processar mensagem
  async handleMessage(phone, message) {
    const session = this.userSessions.get(phone) || { step: 'initial' };

    switch (session.step) {
      case 'initial':
        await this.sendWelcome(phone);
        break;

      case 'choose_service':
        await this.handleServiceChoice(phone, message, session);
        break;

      case 'choose_professional':
        await this.handleProfessionalChoice(phone, message, session);
        break;

      case 'choose_date':
        await this.handleDateChoice(phone, message, session);
        break;

      case 'choose_time':
        await this.handleTimeChoice(phone, message, session);
        break;

      case 'confirm_details':
        await this.handleConfirmation(phone, message, session);
        break;
    }
  }

  async sendWelcome(phone) {
    const services = await this.getServices();
    let message = '👋 Bem-vindo! Escolha um serviço:\n\n';
    
    services.forEach((service, index) => {
      message += `${index + 1}️⃣ ${service.name} - R$ ${service.price.toFixed(2)}\n`;
    });

    await this.sendMessage(phone, message);
    
    this.userSessions.set(phone, {
      step: 'choose_service',
      services
    });
  }

  // Implementar outros métodos...
}

// Uso
const bot = new BookingBot(
  'bk_seu_token_aqui',
  'https://sua-api.com/api/public'
);

// Webhook handler
app.post('/webhook/whatsapp', async (req, res) => {
  const { phone, message } = req.body;
  await bot.handleMessage(phone, message);
  res.sendStatus(200);
});
```

## 🔒 Segurança

### Boas Práticas

1. **Nunca exponha o token** em código cliente
2. **Use HTTPS** para todas as requisições
3. **Implemente rate limiting** no servidor
4. **Valide todos os inputs** antes de processar
5. **Monitore uso da API** para detectar abusos

### Rate Limiting (Recomendado)

```javascript
// Exemplo com express-rate-limit
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requisições por IP
  message: 'Muitas requisições, tente novamente mais tarde'
});

app.use('/api/public/', apiLimiter);
```

## 📊 Monitoramento

### Logs Importantes

- Requisições à API pública
- Agendamentos criados via WhatsApp
- Erros de autenticação
- Horários não disponíveis

### Métricas

- Taxa de conversão (mensagens → agendamentos)
- Horários mais procurados
- Serviços mais solicitados
- Tempo médio de resposta

## 🆘 Troubleshooting

### Erro: "Invalid API token"

- Verifique se o token está correto
- Confirme que está usando `Bearer` no header
- Regenere o token se necessário

### Erro: "Horário não disponível"

- Verifique se a disponibilidade do profissional está configurada
- Confirme que não há bloqueios de horário
- Verifique se a data está dentro do período permitido

### Bot não responde

- Verifique se o webhook está configurado corretamente
- Confirme que a Evolution API está rodando
- Cheque os logs do servidor

## 📞 Suporte

Para dúvidas ou problemas:
- Evolution API: [GitHub](https://github.com/EvolutionAPI/evolution-api)
- Documentação completa: [Docs](https://doc.evolution-api.com/)

---

**Desenvolvido para NS Studio** 💈
