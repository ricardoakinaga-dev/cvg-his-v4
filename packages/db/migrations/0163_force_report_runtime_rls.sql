-- Reforca o isolamento tenant do motor de relatorios sem editar a migration historica 0048.

ALTER TABLE report_executions FORCE ROW LEVEL SECURITY;
ALTER TABLE report_exports FORCE ROW LEVEL SECURITY;
ALTER TABLE report_schedules FORCE ROW LEVEL SECURITY;
ALTER TABLE report_schedule_deliveries FORCE ROW LEVEL SECURITY;
