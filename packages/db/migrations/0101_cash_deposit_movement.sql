-- CASH-001: registra deposito bancario como saida explicita da gaveta.

ALTER TYPE cash_movement_type ADD VALUE IF NOT EXISTS 'deposit';
