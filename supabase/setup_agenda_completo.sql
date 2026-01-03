-- =====================================================
-- PASSO 1: EXECUTAR MIGRATION
-- =====================================================
-- Copie todo o conteúdo de migration_availability_system.sql
-- e execute no Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PASSO 2: CONFIGURAR HORÁRIOS DOS PROFISSIONAIS
-- =====================================================
-- Execute este SQL para adicionar horários padrão Seg-Sex 9h-18h

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
CROSS JOIN generate_series(1, 5) AS day_num -- Segunda a Sexta (1=Seg, 5=Sex)
WHERE p.is_active = true
ON CONFLICT (professional_id, day_of_week) DO NOTHING;

-- Verificar horários criados
SELECT 
    p.name as profissional,
    CASE pa.day_of_week
        WHEN 0 THEN 'Domingo'
        WHEN 1 THEN 'Segunda'
        WHEN 2 THEN 'Terça'
        WHEN 3 THEN 'Quarta'
        WHEN 4 THEN 'Quinta'
        WHEN 5 THEN 'Sexta'
        WHEN 6 THEN 'Sábado'
    END as dia,
    pa.start_time as inicio,
    pa.end_time as fim,
    pa.break_start as almoco_inicio,
    pa.break_end as almoco_fim
FROM professional_availability pa
JOIN professionals p ON p.id = pa.professional_id
ORDER BY p.name, pa.day_of_week;

-- =====================================================
-- PASSO 3: GERAR API TOKEN
-- =====================================================

-- Gerar token para seu negócio
UPDATE businesses
SET booking_settings = jsonb_set(
    COALESCE(booking_settings, '{}'::jsonb),
    '{api_token}',
    to_jsonb(generate_api_token())
)
WHERE user_id = auth.uid();

-- Ver o token gerado (GUARDE EM LOCAL SEGURO!)
SELECT 
    business_name,
    booking_settings->>'api_token' as api_token
FROM businesses
WHERE user_id = auth.uid();

-- =====================================================
-- PASSO 4: ADICIONAR BLOQUEIOS (OPCIONAL)
-- =====================================================

-- Exemplo: Bloquear Natal (25/12/2024)
INSERT INTO time_blocks (business_id, start_datetime, end_datetime, reason, block_type)
SELECT 
    id,
    '2024-12-25 00:00:00'::TIMESTAMPTZ,
    '2024-12-25 23:59:59'::TIMESTAMPTZ,
    'Natal',
    'holiday'
FROM businesses
WHERE user_id = auth.uid();

-- Exemplo: Bloquear Ano Novo (01/01/2025)
INSERT INTO time_blocks (business_id, start_datetime, end_datetime, reason, block_type)
SELECT 
    id,
    '2025-01-01 00:00:00'::TIMESTAMPTZ,
    '2025-01-01 23:59:59'::TIMESTAMPTZ,
    'Ano Novo',
    'holiday'
FROM businesses
WHERE user_id = auth.uid();

-- Ver bloqueios criados
SELECT 
    reason,
    block_type,
    start_datetime,
    end_datetime
FROM time_blocks
WHERE business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
ORDER BY start_datetime;

-- =====================================================
-- PASSO 5: AJUSTAR CONFIGURAÇÕES (OPCIONAL)
-- =====================================================

-- Ajustar antecedência mínima para 4 horas
UPDATE businesses
SET booking_settings = jsonb_set(
    booking_settings,
    '{min_advance_hours}',
    '4'::jsonb
)
WHERE user_id = auth.uid();

-- Ajustar buffer para 10 minutos
UPDATE businesses
SET booking_settings = jsonb_set(
    booking_settings,
    '{buffer_minutes}',
    '10'::jsonb
)
WHERE user_id = auth.uid();

-- Ver todas as configurações
SELECT 
    business_name,
    jsonb_pretty(booking_settings) as configuracoes
FROM businesses
WHERE user_id = auth.uid();

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- 1. Verificar se tabelas foram criadas
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as num_colunas
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('professional_availability', 'time_blocks')
ORDER BY table_name;

-- 2. Verificar se profissionais têm horários
SELECT 
    p.name,
    COUNT(pa.id) as dias_configurados
FROM professionals p
LEFT JOIN professional_availability pa ON pa.professional_id = p.id
WHERE p.is_active = true
GROUP BY p.id, p.name
ORDER BY p.name;

-- 3. Verificar se API token foi gerado
SELECT 
    CASE 
        WHEN booking_settings->>'api_token' IS NOT NULL 
        THEN '✅ Token gerado'
        ELSE '❌ Token não gerado'
    END as status_token
FROM businesses
WHERE user_id = auth.uid();

-- =====================================================
-- TUDO PRONTO! 🎉
-- =====================================================
-- Próximo passo: Testar a API pública
-- Ver: docs/agenda-setup-guide.md
