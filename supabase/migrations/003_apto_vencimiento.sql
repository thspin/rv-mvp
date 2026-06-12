-- ============================================================================
-- MIGRACION 003: Agregar estado 'vencido' a apto_medico_status
-- Permite marcar certificados médicos que han vencido
-- ============================================================================

ALTER TABLE athletes DROP CONSTRAINT IF EXISTS athletes_apto_medico_status_check;

ALTER TABLE athletes ADD CONSTRAINT athletes_apto_medico_status_check 
  CHECK (apto_medico_status IN ('no_entregado', 'pendiente_verificacion', 'vigente', 'rechazado', 'vencido'));
