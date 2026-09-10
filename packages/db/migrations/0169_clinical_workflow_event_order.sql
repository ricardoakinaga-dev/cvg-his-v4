-- Preserve historical events: NULL means causal revision was not captured.
-- New events are stamped atomically with their task transition, including writes
-- from older binaries. Apply before deploying revision-ordered readers.
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.clinical_workflow_task_events
  ADD COLUMN task_revision INTEGER;

CREATE FUNCTION app.stamp_clinical_workflow_event_revision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  SELECT task.revision INTO NEW.task_revision
    FROM public.clinical_workflow_tasks AS task
   WHERE task.account_id = NEW.account_id AND task.id = NEW.task_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workflow event requires a visible task' USING ERRCODE = '23503';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER clinical_workflow_task_events_revision_trigger
  BEFORE INSERT ON public.clinical_workflow_task_events
  FOR EACH ROW EXECUTE FUNCTION app.stamp_clinical_workflow_event_revision();

ALTER TABLE public.clinical_workflow_task_events
  ADD CONSTRAINT clinical_workflow_task_events_revision_unique
  UNIQUE (account_id, task_id, task_revision);

COMMENT ON COLUMN public.clinical_workflow_task_events.task_revision IS
  'Task revision at append; NULL only for legacy events whose causal order is unknown. Gaps from lease renewal are valid.';
