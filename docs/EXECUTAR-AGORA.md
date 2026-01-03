# 🚀 Executando o Plano - Passo a Passo

## ✅ Checklist de Execução

### Etapa 1: Executar Migration no Supabase (5 min)

**Passos:**

1. Abra o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral)
4. Clique em **New Query**
5. Copie **TODO** o conteúdo de [`migration_availability_system.sql`](file:///c:/Users/nikel/Desktop/APP%20ns-studio/supabase/migration_availability_system.sql)
6. Cole no editor
7. Clique em **Run** (ou Ctrl+Enter)
8. Aguarde mensagem de sucesso ✅

**Resultado esperado:**
```
status: "Sistema de disponibilidade criado com sucesso!"
tabelas: "Tabelas criadas: professional_availability, time_blocks"
configuracao: "Campo adicionado: businesses.booking_settings"
```

---

### Etapa 2: Configurar Horários dos Profissionais (3 min)

**Opção A: Horário Padrão (Seg-Sex 9h-18h)**

1. No mesmo SQL Editor, execute:

```sql
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
CROSS JOIN generate_series(1, 5) AS day_num
WHERE p.is_active = true
ON CONFLICT (professional_id, day_of_week) DO NOTHING;
```

2. Verificar:

```sql
SELECT 
    p.name as profissional,
    CASE pa.day_of_week
        WHEN 1 THEN 'Segunda'
        WHEN 2 THEN 'Terça'
        WHEN 3 THEN 'Quarta'
        WHEN 4 THEN 'Quinta'
        WHEN 5 THEN 'Sexta'
    END as dia,
    pa.start_time || ' - ' || pa.end_time as horario
FROM professional_availability pa
JOIN professionals p ON p.id = pa.professional_id
ORDER BY p.name, pa.day_of_week;
```

**Opção B: Horários Personalizados**

Edite os valores conforme necessário:
- `day_num`: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
- `start_time`: Hora de início
- `end_time`: Hora de fim
- `break_start/break_end`: Intervalo (ou NULL se não tiver)

---

### Etapa 3: Gerar API Token (2 min)

**Executar:**

```sql
-- Gerar token
UPDATE businesses
SET booking_settings = jsonb_set(
    COALESCE(booking_settings, '{}'::jsonb),
    '{api_token}',
    to_jsonb(generate_api_token())
)
WHERE user_id = auth.uid();

-- Ver token gerado
SELECT 
    business_name,
    booking_settings->>'api_token' as api_token
FROM businesses
WHERE user_id = auth.uid();
```

**⚠️ IMPORTANTE:**
- Copie o token gerado (formato: `bk_...`)
- Guarde em local seguro (gerenciador de senhas)
- Você precisará dele para integração WhatsApp

---

### Etapa 4: Adicionar Bloqueios de Feriados (Opcional - 2 min)

```sql
-- Natal 2024
INSERT INTO time_blocks (business_id, start_datetime, end_datetime, reason, block_type)
SELECT 
    id,
    '2024-12-25 00:00:00'::TIMESTAMPTZ,
    '2024-12-25 23:59:59'::TIMESTAMPTZ,
    'Natal',
    'holiday'
FROM businesses
WHERE user_id = auth.uid();

-- Ano Novo 2025
INSERT INTO time_blocks (business_id, start_datetime, end_datetime, reason, block_type)
SELECT 
    id,
    '2025-01-01 00:00:00'::TIMESTAMPTZ,
    '2025-01-01 23:59:59'::TIMESTAMPTZ,
    'Ano Novo',
    'holiday'
FROM businesses
WHERE user_id = auth.uid();
```

---

### Etapa 5: Testar API Pública (5 min)

**Com cURL (Terminal):**

```bash
# Substituir SEU_TOKEN pelo token gerado

# 1. Listar serviços
curl -X GET http://localhost:5173/api/public/services \
  -H "Authorization: Bearer SEU_TOKEN"

# 2. Listar profissionais
curl -X GET http://localhost:5173/api/public/professionals \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Com Postman/Insomnia:**

1. Criar nova requisição GET
2. URL: `http://localhost:5173/api/public/services`
3. Header: `Authorization: Bearer SEU_TOKEN`
4. Send

---

## 📊 Verificação Final

Execute este SQL para verificar tudo:

```sql
-- 1. Tabelas criadas?
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as colunas
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('professional_availability', 'time_blocks')
ORDER BY table_name;

-- 2. Profissionais têm horários?
SELECT 
    p.name,
    COUNT(pa.id) as dias_configurados
FROM professionals p
LEFT JOIN professional_availability pa ON pa.professional_id = p.id
WHERE p.is_active = true
GROUP BY p.id, p.name;

-- 3. Token gerado?
SELECT 
    CASE 
        WHEN booking_settings->>'api_token' IS NOT NULL 
        THEN '✅ Token gerado'
        ELSE '❌ Token não gerado'
    END as status
FROM businesses
WHERE user_id = auth.uid();

-- 4. Ver todas as configurações
SELECT jsonb_pretty(booking_settings) FROM businesses WHERE user_id = auth.uid();
```

**Resultado esperado:**
- ✅ 2 tabelas criadas
- ✅ Cada profissional com 5 dias configurados
- ✅ Token gerado
- ✅ Configurações completas

---

## 🎯 Próximos Passos

Após executar tudo acima:

### Imediato:
1. ✅ Sistema está funcional via API
2. ✅ Link público já pode ser usado
3. ✅ Pronto para integração WhatsApp

### Opcional:
1. **Criar interface de configuração** (frontend)
2. **Implementar bot WhatsApp** (ver [`docs/whatsapp-integration.md`](file:///c:/Users/nikel/Desktop/APP%20ns-studio/docs/whatsapp-integration.md))
3. **Ajustar configurações** conforme necessidade

---

## 🆘 Problemas Comuns

### "Tabela já existe"
✅ Normal! O `IF NOT EXISTS` garante que não há erro

### "Nenhum profissional encontrado"
❌ Você precisa ter profissionais cadastrados primeiro
- Vá em **Team** e adicione profissionais

### "Token NULL"
❌ Execute novamente o comando de gerar token
- Verifique se está logado no Supabase

### "API retorna 401"
❌ Token inválido ou não configurado
- Verifique se está usando `Bearer SEU_TOKEN`
- Confirme que o token está correto

---

## 📞 Suporte

- **Documentação completa**: [`docs/README.md`](file:///c:/Users/nikel/Desktop/APP%20ns-studio/docs/README.md)
- **Setup rápido**: [`docs/agenda-setup-guide.md`](file:///c:/Users/nikel/Desktop/APP%20ns-studio/docs/agenda-setup-guide.md)
- **WhatsApp**: [`docs/whatsapp-integration.md`](file:///c:/Users/nikel/Desktop/APP%20ns-studio/docs/whatsapp-integration.md)

---

**Tempo total estimado:** 15-20 minutos

**Boa sorte! 🚀**
