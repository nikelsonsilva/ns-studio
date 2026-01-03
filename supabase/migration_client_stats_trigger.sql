-- =====================================================
-- MIGRAÇÃO: Trigger para atualizar estatísticas do cliente
-- =====================================================
-- Este trigger atualiza automaticamente:
-- - last_visit_date
-- - total_visits
-- - lifetime_value
-- Quando um agendamento é marcado como 'completed'
-- =====================================================

-- 1. Função que será chamada pelo trigger
CREATE OR REPLACE FUNCTION update_client_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_service_price NUMERIC(10,2);
BEGIN
    -- Só executa se o status mudou para 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        
        -- Buscar preço do serviço
        SELECT price INTO v_service_price 
        FROM services 
        WHERE id = NEW.service_id;
        
        -- Atualizar estatísticas do cliente
        UPDATE clients
        SET 
            last_visit_date = NEW.start_datetime,
            total_visits = COALESCE(total_visits, 0) + 1,
            lifetime_value = COALESCE(lifetime_value, 0) + COALESCE(v_service_price, 0),
            updated_at = NOW()
        WHERE id = NEW.client_id;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Criar o trigger que dispara após update em appointments
DROP TRIGGER IF EXISTS trigger_update_client_stats ON appointments;
CREATE TRIGGER trigger_update_client_stats
    AFTER UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_client_stats();

-- Também criar para INSERT (caso já seja inserido como completed)
DROP TRIGGER IF EXISTS trigger_update_client_stats_insert ON appointments;
CREATE TRIGGER trigger_update_client_stats_insert
    AFTER INSERT ON appointments
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION update_client_stats();

-- =====================================================
-- 3. OPCIONAL: Atualizar dados existentes
-- Execute isso para preencher dados dos clientes baseado 
-- nos agendamentos já completados
-- =====================================================

-- Atualizar last_visit_date baseado no último agendamento completado
UPDATE clients c
SET last_visit_date = (
    SELECT MAX(a.start_datetime)
    FROM appointments a
    WHERE a.client_id = c.id AND a.status = 'completed'
);

-- Atualizar total_visits
UPDATE clients c
SET total_visits = (
    SELECT COUNT(*)
    FROM appointments a
    WHERE a.client_id = c.id AND a.status = 'completed'
);

-- Atualizar lifetime_value
UPDATE clients c
SET lifetime_value = (
    SELECT COALESCE(SUM(s.price), 0)
    FROM appointments a
    JOIN services s ON s.id = a.service_id
    WHERE a.client_id = c.id AND a.status = 'completed'
);

-- Verificar resultado
SELECT 
    name, 
    last_visit_date, 
    total_visits, 
    lifetime_value 
FROM clients 
ORDER BY last_visit_date DESC NULLS LAST;

SELECT '✅ Trigger e dados atualizados com sucesso!' as status;
