-- Adicionar campo is_encaixe para diferenciar encaixes de agendamentos regulares
-- Encaixes não bloqueiam os próximos horários regulares

ALTER TABLE appointments ADD COLUMN is_encaixe BOOLEAN DEFAULT FALSE;

-- Comentário: Encaixes são agendamentos criados via "Disponíveis Agora"
-- que não devem afetar a disponibilidade de slots regulares
COMMENT ON COLUMN appointments.is_encaixe IS 'True se o agendamento foi criado como encaixe via Disponíveis Agora';
