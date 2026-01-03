# 📚 Documentação da Agenda

Este diretório contém toda a documentação do sistema de agendamento.

## 📄 Arquivos

### 1. [agenda-setup-guide.md](./agenda-setup-guide.md)
**Guia Rápido de Configuração**

Passo a passo para configurar a agenda do zero:
- Executar migrations
- Configurar horários dos profissionais
- Gerar API token
- Testar endpoints
- Configurações recomendadas

⏱️ Tempo estimado: 20-30 minutos

---

### 2. [whatsapp-integration.md](./whatsapp-integration.md)
**Integração com WhatsApp**

Guia completo para integrar com WhatsApp usando Evolution API:
- Instalação da Evolution API
- Configuração de webhooks
- Código do bot (Node.js)
- Exemplos de fluxo conversacional
- Troubleshooting

📱 Recomendado para automação de agendamentos

---

## 🎯 Por onde começar?

### Se você é novo:
1. Leia o [Guia de Configuração](./agenda-setup-guide.md)
2. Execute as migrations
3. Configure os horários
4. Teste o link público

### Se quer integrar WhatsApp:
1. Complete a configuração básica primeiro
2. Siga o [Guia de Integração WhatsApp](./whatsapp-integration.md)
3. Instale a Evolution API
4. Crie seu bot

## 🔑 Conceitos Importantes

### Arquitetura

```
┌─────────────────┐
│  Supabase DB    │  ← Fonte de verdade
│  - appointments │
│  - availability │
│  - time_blocks  │
└────────┬────────┘
         │
    ┌────┴────┐
    │   API   │  ← Regras de negócio
    └────┬────┘
         │
    ┌────┴────────────────┐
    │                     │
┌───┴───┐          ┌──────┴──────┐
│  Web  │          │  WhatsApp   │
│ Link  │          │     Bot     │
└───────┘          └─────────────┘
```

### Fluxo de Agendamento

1. **Cliente** escolhe serviço e profissional
2. **Sistema** calcula horários disponíveis:
   - Verifica horários de trabalho
   - Remove bloqueios (férias, feriados)
   - Exclui horários já agendados
   - Aplica buffer entre atendimentos
3. **Cliente** escolhe horário
4. **Sistema** valida e cria agendamento
5. **Confirmação** enviada ao cliente

### Regras de Disponibilidade

- ✅ **Duplo agendamento**: Permitido (profissionais diferentes)
- ⏰ **Buffer**: Tempo entre atendimentos (configurável)
- 📅 **Antecedência**: Mínimo de horas para agendar
- 🔒 **Bloqueios**: Férias, feriados, eventos
- 🕐 **Horários**: Flexíveis por dia + exceções

## 🔐 Segurança

### API Token

- Formato: `bk_` + 64 caracteres hexadecimais
- Usado no header: `Authorization: Bearer bk_...`
- **Nunca** exponha em código cliente
- Regenere se comprometido

### Rate Limiting

Recomendado implementar:
- 100 requisições / 15 minutos por IP
- Monitorar uso anormal
- Bloquear IPs suspeitos

## 📊 Tabelas do Banco

### `professional_availability`
Horários de trabalho dos profissionais

| Campo | Tipo | Descrição |
|-------|------|-----------|
| professional_id | UUID | Profissional |
| day_of_week | INT | 0=Dom, 1=Seg, ..., 6=Sáb |
| start_time | TIME | Início (ex: 09:00) |
| end_time | TIME | Fim (ex: 18:00) |
| break_start | TIME | Início intervalo |
| break_end | TIME | Fim intervalo |

### `time_blocks`
Bloqueios de horários

| Campo | Tipo | Descrição |
|-------|------|-----------|
| professional_id | UUID | NULL = todos |
| start_datetime | TIMESTAMP | Início do bloqueio |
| end_datetime | TIMESTAMP | Fim do bloqueio |
| block_type | TEXT | vacation, holiday, etc |
| reason | TEXT | Motivo do bloqueio |

### `businesses.booking_settings`
Configurações de agendamento (JSONB)

```json
{
  "min_advance_hours": 2,
  "max_advance_days": 30,
  "buffer_minutes": 15,
  "allow_same_day": true,
  "require_payment": false,
  "api_token": "bk_...",
  "slot_duration_minutes": 30
}
```

## 🛠️ Funções Principais

### Backend (`lib/availability.ts`)

- `getAvailableSlots()` - Calcula horários disponíveis
- `isSlotAvailable()` - Verifica horário específico
- `createPublicAppointment()` - Cria agendamento

### API Pública (`lib/publicAPI.ts`)

- `GET /api/public/services` - Lista serviços
- `GET /api/public/professionals` - Lista profissionais
- `GET /api/public/availability` - Horários disponíveis
- `POST /api/public/appointments` - Criar agendamento

## 🐛 Debug

### Verificar disponibilidade

```sql
-- Ver horários configurados
SELECT * FROM professional_availability
WHERE professional_id = 'UUID';

-- Ver bloqueios ativos
SELECT * FROM time_blocks
WHERE end_datetime > NOW();

-- Ver agendamentos do dia
SELECT * FROM appointments
WHERE date = CURRENT_DATE;
```

### Logs importantes

- Requisições à API pública
- Erros de validação de horário
- Tentativas de agendamento falhadas
- Tokens inválidos

## 📈 Métricas Sugeridas

- Agendamentos por canal (web vs WhatsApp)
- Taxa de conversão
- Horários mais populares
- Profissionais mais requisitados
- Taxa de no-show

## 🚀 Roadmap

- [ ] Interface visual de configuração
- [ ] Notificações automáticas (email/SMS)
- [ ] Integração com Google Calendar (sincronização)
- [ ] Multi-idioma
- [ ] Pagamento obrigatório na reserva
- [ ] Lista de espera automática

---

**Desenvolvido para NS Studio** 💈
