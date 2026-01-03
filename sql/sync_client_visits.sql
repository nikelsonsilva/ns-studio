-- =====================================================
-- Script para sincronizar total_visits e last_visit_date
-- na tabela clients com base nos agendamentos concluídos
-- =====================================================

-- 1. Atualizar total_visits e last_visit_date para todos os clientes
UPDATE clients c
SET 
  total_visits = COALESCE(stats.visit_count, 0),
  last_visit_date = stats.last_visit,
  lifetime_value = COALESCE(stats.total_paid, 0)
FROM (
  SELECT 
    a.client_id,
    COUNT(*) as visit_count,
    MAX(a.start_datetime) as last_visit,
    SUM(COALESCE(s.price, 0)) as total_paid
  FROM appointments a
  LEFT JOIN services s ON a.service_id = s.id
  WHERE a.status = 'completed'
    AND a.payment_status = 'paid'
  GROUP BY a.client_id
) stats
WHERE c.id = stats.client_id;

-- 2. Verificar os resultados
SELECT 
  c.id,
  c.name,
  c.total_visits,
  c.last_visit_date,
  c.lifetime_value
FROM clients c
ORDER BY c.total_visits DESC;
