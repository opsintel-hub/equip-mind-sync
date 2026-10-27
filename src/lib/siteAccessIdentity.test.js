import { test, expect, afterAll } from "bun:test";
import postgres from "postgres";

// Live permission regression checks; every fixture is rolled back.
const sql = postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false });
afterAll(() => sql.end());
async function fixture(run) {
  try {
    await sql.begin(async (tx) => {
      const [ticket] = await tx`INSERT INTO public.warehouse_access_tickets (warehouse_id,supervisor_id,supervisor_name,supervisor_phone,contractor_name,worker_count,vehicle_plates,purpose,items_description,safety_acknowledged,planned_start_at,planned_end_at,created_by,department) SELECT w.id,p.id,'Identity regression','000000000','Identity regression',1,ARRAY['TEST'],'bring_in','TEST',true,now()+interval '2 days',now()+interval '2 days 1 hour',p.id,d.name FROM public.warehouses w CROSS JOIN public.profiles p CROSS JOIN public.departments d WHERE w.is_active AND d.is_active LIMIT 1 RETURNING id,supervisor_name,department`;
      expect(ticket).toBeDefined();
      await run(tx, ticket);
      throw new Error("ROLLBACK_FIXTURE");
    });
  } catch (error) {
    if (error.message !== "ROLLBACK_FIXTURE") throw error;
  }
}

test("only Super Admin can change a saved booker name", async () => {
  await fixture(async (tx, ticket) => {
    const [actor] = await tx`SELECT user_id FROM public.user_roles WHERE role='super_admin' LIMIT 1`;
    expect(actor).toBeDefined();
    await tx`SELECT set_config('request.jwt.claim.sub',${actor.user_id},true)`;
    const [updated] = await tx`UPDATE public.warehouse_access_tickets SET supervisor_name='Corrected booker' WHERE id=${ticket.id} RETURNING supervisor_name`;
    expect(updated.supervisor_name).toBe("Corrected booker");
  });
});

for (const field of ["supervisor_name", "department"]) {
  test(`non-Super Admin cannot change saved ${field}`, async () => {
    await fixture(async (tx, ticket) => {
      const [actor] = await tx`SELECT p.id FROM public.profiles p WHERE NOT public.has_role(p.id,'super_admin') LIMIT 1`;
      expect(actor).toBeDefined();
      await tx`SELECT set_config('request.jwt.claim.sub',${actor.id},true)`;
      await expect(tx.savepoint(async (sp) => {
        await sp`UPDATE public.warehouse_access_tickets SET ${sp({ [field]: 'Unauthorized correction' })} WHERE id=${ticket.id}`;
      })).rejects.toMatchObject({ code: "42501" });
      const [unchanged] = await tx`SELECT supervisor_name,department FROM public.warehouse_access_tickets WHERE id=${ticket.id}`;
      expect(unchanged[field]).toBe(ticket[field]);
    });
  });
}

test("normal status changes do not require Super Admin", async () => {
  await fixture(async (tx, ticket) => {
    const [actor] = await tx`SELECT p.id FROM public.profiles p WHERE NOT public.has_role(p.id,'super_admin') LIMIT 1`;
    expect(actor).toBeDefined();
    await tx`SELECT set_config('request.jwt.claim.sub',${actor.id},true)`;
    const [updated] = await tx`UPDATE public.warehouse_access_tickets SET status='cancelled' WHERE id=${ticket.id} RETURNING status`;
    expect(updated.status).toBe("cancelled");
  });
});

test("calendar uses booked department instead of profile department", async () => {
  await fixture(async (tx, ticket) => {
    const [actor] = await tx`SELECT user_id FROM public.user_roles WHERE role='super_admin' LIMIT 1`;
    await tx`SELECT set_config('request.jwt.claim.sub',${actor.user_id},true)`;
    const [row] = await tx`SELECT department FROM public.access_ticket_calendar(now(),now()+interval '4 days') WHERE id=${ticket.id}`;
    expect(row.department).toBe(ticket.department);
  });
});