# 🚀 Guia Rápido de Configuração da Agenda

## ✅ Checklist de Implementação

### 1. Banco de Dados (5 min)

- [ ] Executar migration SQL no Supabase
  ```
  Arquivo: supabase/migration_availability_system.sql
  ```
- [ ] Verificar se as tabelas foram criadas:
  - `professional_availability`
  - `time_blocks`
  - `businesses.booking_settings`

### 2. Configurar Horários dos Profissionais (10 min)

**Opção A: Via SQL (Rápido)**

```sql
-- Adicionar horário padrão Seg-Sex 9h-18h para todos os profissionais
INSERT INTO professional_availability (business_id, professional_id, day_of_week, start_time, end_time, break_start, break_end)
SELECT 
    p.business_id,
    p.id,
    day_num,
    '09:00'::TIME,
    '18:00'::TIME,
    '12:00'::TIME,
    '13:00'::TIME
FROM professionals p
CROSS JOIN generate_series(1, 5) AS day_num -- Segunda a Sexta
WHERE p.is_active = true;
```

**Opção B: Via Interface (Em desenvolvimento)**

Aguardar componente `AvailabilitySettings.tsx`

### 3. Gerar API Token (2 min)

**Via SQL:**

```sql
-- Gerar token para seu negócio
UPDATE businesses
SET booking_settings = jsonb_set(
    COALESCE(booking_settings, '{}'::jsonb),
    '{api_token}',
    to_jsonb('bk_' || encode(gen_random_bytes(32), 'hex'))
)
WHERE user_id = auth.uid();

-- Ver o token gerado
SELECT booking_settings->>'api_token' as api_token
FROM businesses
WHERE user_id = auth.uid();
```

**Via Código:**

```typescript
import { generateNewAPIToken } from './lib/publicAPI';

const token = await generateNewAPIToken();
console.log('Token:', token);
```

### 4. Testar API Pública (5 min)

**Com cURL:**

```bash
# Substituir SEU_TOKEN e BUSINESS_ID

# 1. Listar serviços
curl -X GET https://sua-api.com/api/public/services \
  -H "Authorization: Bearer SEU_TOKEN"

# 2. Listar profissionais
curl -X GET https://sua-api.com/api/public/professionals \
  -H "Authorization: Bearer SEU_TOKEN"

# 3. Ver disponibilidade
curl -X GET https://sua-api.com/api/public/availability \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "professional_id": "UUID_DO_PROFISSIONAL",
    "service_id": "UUID_DO_SERVICO",
    "date": "2024-12-10"
  }'

# 4. Criar agendamento
curl -X POST https://sua-api.com/api/public/appointments \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "professional_id": "UUID_DO_PROFISSIONAL",
    "service_id": "UUID_DO_SERVICO",
    "client_name": "Teste Cliente",
    "client_phone": "11999999999",
    "date": "2024-12-10",
    "time": "14:00"
  }'
```

**Com Postman/Insomnia:**

1. Criar nova Collection
2. Adicionar header: `Authorization: Bearer SEU_TOKEN`
3. Testar cada endpoint acima

### 5. Link Público (Já funciona!)

Seu link público já está pronto:

```
https://seu-dominio.com/public-booking
```

Compartilhe com clientes para agendamento direto.

## ⚙️ Configurações Recomendadas

### Ajustar Regras de Agendamento

```sql
UPDATE businesses
SET booking_settings = jsonb_set(
    booking_settings,
    '{min_advance_hours}',
    '2'::jsonb  -- Mínimo 2h de antecedência
)
WHERE user_id = auth.uid();

UPDATE businesses
SET booking_settings = jsonb_set(
    booking_settings,
    '{max_advance_days}',
    '30'::jsonb  -- Máximo 30 dias no futuro
)
WHERE user_id = auth.uid();

UPDATE businesses
SET booking_settings = jsonb_set(
    booking_settings,
    '{buffer_minutes}',
    '15'::jsonb  -- 15 min entre atendimentos
)
WHERE user_id = auth.uid();
```

### Adicionar Bloqueios (Feriados, Férias)

```sql
-- Bloquear dia inteiro (feriado)
INSERT INTO time_blocks (business_id, start_datetime, end_datetime, reason, block_type)
VALUES (
    'SEU_BUSINESS_ID',
    '2024-12-25 00:00:00',
    '2024-12-25 23:59:59',
    'Natal',
    'holiday'
);

-- Bloquear profissional específico (férias)
INSERT INTO time_blocks (business_id, professional_id, start_datetime, end_datetime, reason, block_type)
VALUES (
    'SEU_BUSINESS_ID',
    'UUID_DO_PROFISSIONAL',
    '2024-12-20 00:00:00',
    '2024-12-27 23:59:59',
    'Férias',
    'vacation'
);
```

## 🤖 Integração WhatsApp

Siga o guia completo: [`docs/whatsapp-integration.md`](./whatsapp-integration.md)

**Resumo rápido:**

1. Instalar Evolution API (Docker ou Cloud)
2. Configurar webhook
3. Criar bot usando os endpoints públicos
4. Testar fluxo de agendamento

## 📊 Verificação Final

Antes de colocar em produção, verifique:

- [ ] Todos os profissionais têm horários configurados
- [ ] API token foi gerado e está seguro
- [ ] Endpoints públicos respondem corretamente
- [ ] Link público está acessível
- [ ] Bloqueios de feriados foram adicionados
- [ ] Configurações de buffer/antecedência estão corretas

## 🆘 Problemas Comuns

### "Nenhum horário disponível"

**Causa:** Profissional sem horários configurados

**Solução:**
```sql
-- Verificar se profissional tem horários
SELECT * FROM professional_availability
WHERE professional_id = 'UUID_DO_PROFISSIONAL';

-- Se vazio, adicionar horários (ver Passo 2)
```

### "Invalid API token"

**Causa:** Token não foi gerado ou está incorreto

**Solução:**
```sql
-- Verificar token atual
SELECT booking_settings->>'api_token' FROM businesses WHERE user_id = auth.uid();

-- Se NULL, gerar novo (ver Passo 3)
```

### "Appointment creation failed"

**Causa:** Validação de horário ou dados faltando

**Solução:**
- Verificar se o horário ainda está disponível
- Confirmar que todos os campos obrigatórios foram enviados
- Checar logs do servidor para erro específico

## 📞 Próximos Passos

1. **Interface de Configuração**: Aguardar `AvailabilitySettings.tsx` para gerenciar horários visualmente
2. **Notificações**: Implementar envio de confirmação por email/SMS
3. **Relatórios**: Dashboard de agendamentos via WhatsApp vs. site
4. **Multi-canal**: Expandir para Instagram, Telegram, etc.

---

**Tempo total de configuração:** ~20-30 minutos

**Dúvidas?** Consulte a documentação completa ou entre em contato.
