-- Create function to notify waiting requests when goods are received
CREATE OR REPLACE FUNCTION public.notify_waiting_requests()
RETURNS TRIGGER AS $$
DECLARE
  waiting_request RECORD;
  equipment_record RECORD;
BEGIN
  -- Get equipment details
  SELECT code, name INTO equipment_record
  FROM public.equipment
  WHERE id = NEW.equipment_id;

  -- Find all waiting requests for this equipment
  FOR waiting_request IN
    SELECT id, document_no, requester_name, remaining_quantity
    FROM public.goods_issue_pending
    WHERE equipment_id = NEW.equipment_id
      AND status = 'waiting_stock'
  LOOP
    -- Create notification for each waiting request
    INSERT INTO public.notifications (
      title,
      message,
      type,
      category,
      reference_id,
      reference_type,
      is_read
    ) VALUES (
      'สินค้าเข้าคลังแล้ว - ' || equipment_record.code,
      'สินค้า ' || equipment_record.name || ' (' || equipment_record.code || ') ได้รับเข้าคลังจำนวน ' || NEW.quantity || ' หน่วย สำหรับคำขอ ' || waiting_request.document_no || ' (ผู้ขอ: ' || waiting_request.requester_name || ', รอ: ' || COALESCE(waiting_request.remaining_quantity, 0) || ' หน่วย)',
      'info',
      'stock',
      waiting_request.id::text,
      'goods_issue_pending',
      false
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on goods_receipt
DROP TRIGGER IF EXISTS notify_waiting_requests_trigger ON public.goods_receipt;
CREATE TRIGGER notify_waiting_requests_trigger
  AFTER INSERT ON public.goods_receipt
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_waiting_requests();

-- Also trigger on goods_receipt_pending when status changes to 'received'
CREATE OR REPLACE FUNCTION public.notify_waiting_requests_on_pending_received()
RETURNS TRIGGER AS $$
DECLARE
  waiting_request RECORD;
  equipment_record RECORD;
BEGIN
  -- Only trigger when status changes to 'received'
  IF NEW.status = 'received' AND (OLD.status IS NULL OR OLD.status != 'received') THEN
    -- Get equipment details
    SELECT code, name INTO equipment_record
    FROM public.equipment
    WHERE id = NEW.equipment_id;

    -- Find all waiting requests for this equipment
    FOR waiting_request IN
      SELECT id, document_no, requester_name, remaining_quantity
      FROM public.goods_issue_pending
      WHERE equipment_id = NEW.equipment_id
        AND status = 'waiting_stock'
    LOOP
      -- Create notification for each waiting request
      INSERT INTO public.notifications (
        title,
        message,
        type,
        category,
        reference_id,
        reference_type,
        is_read
      ) VALUES (
        'สินค้าเข้าคลังแล้ว - ' || equipment_record.code,
        'สินค้า ' || equipment_record.name || ' (' || equipment_record.code || ') ได้รับเข้าคลังจำนวน ' || NEW.quantity || ' หน่วย สำหรับคำขอ ' || waiting_request.document_no || ' (ผู้ขอ: ' || waiting_request.requester_name || ', รอ: ' || COALESCE(waiting_request.remaining_quantity, 0) || ' หน่วย)',
        'info',
        'stock',
        waiting_request.id::text,
        'goods_issue_pending',
        false
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on goods_receipt_pending
DROP TRIGGER IF EXISTS notify_waiting_requests_on_pending_trigger ON public.goods_receipt_pending;
CREATE TRIGGER notify_waiting_requests_on_pending_trigger
  AFTER UPDATE ON public.goods_receipt_pending
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_waiting_requests_on_pending_received();