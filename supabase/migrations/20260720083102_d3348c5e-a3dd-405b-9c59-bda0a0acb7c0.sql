
-- Drop trigger that auto-creates new PM tickets & duplicates history rows on completion
DROP TRIGGER IF EXISTS trigger_create_next_tool_pm_task ON public.tool_pm_tasks;
DROP FUNCTION IF EXISTS public.create_next_tool_pm_task();
