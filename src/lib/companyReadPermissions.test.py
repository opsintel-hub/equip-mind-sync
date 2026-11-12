"""Live read-only regression: run with python3 using injected preview auth."""
import asyncio
import json
import os
from playwright.async_api import async_playwright


async def main():
    session = json.loads(os.environ["LOVABLE_BROWSER_SUPABASE_SESSION_JSON"])
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        await page.goto("http://localhost:8080")
        await page.evaluate("([k,v]) => localStorage.setItem(k,v)", [
            os.environ["LOVABLE_BROWSER_SUPABASE_STORAGE_KEY"], json.dumps(session)])
        await page.goto("http://localhost:8080/delivery-entry")
        result = await page.evaluate("""async (token) => {
            const {supabase} = await import('/src/integrations/supabase/client.ts');
            const request = async (path, body) => {
                const response = await fetch(supabase.supabaseUrl + '/rest/v1/' + path, {
                    method:body ? 'POST' : 'GET',
                    headers:{apikey:supabase.supabaseKey, Authorization:'Bearer '+token, 'Content-Type':'application/json'},
                    ...(body ? {body:JSON.stringify(body)} : {})});
                return {data:await response.json(), error:!response.ok};
            };
            const approved = await request('companies?select=id&department_id=is.null');
            const all = await request('companies?select=id,department_id');
            const departments = await request('departments?select=id,name');
            const allowed = new Set();
            for (const d of departments.data || []) {
                const permission = await request('rpc/security_department_read', {p_department:d.name});
                if (permission.error) throw new Error('Department permission check failed');
                if (permission.data) allowed.add(d.id);
            }
            const {createClient} = await import('/node_modules/.vite/deps/@supabase_supabase-js.js');
            const anonymous = createClient(supabase.supabaseUrl, supabase.supabaseKey, {auth:{persistSession:false,autoRefreshToken:false}});
            const anon = await anonymous.from('companies').select('id').is('department_id',null);
            return {count:approved.data.length,error:!!approved.error,
                outsideScope:(all.data || []).filter(c=>c.department_id && !allowed.has(c.department_id)).length,
                anonymousRows:(anon.data || []).length};
        }""", session["access_token"])
        assert not result["error"], "Approved user cannot read shared companies"
        assert result["count"] == 214, "Expected 214 existing shared companies"
        assert result["outsideScope"] == 0, "Department boundary leaked"
        assert result["anonymousRows"] == 0, "Anonymous access leaked"
        print("PASS: 214 shared companies; department boundary intact; anonymous access denied")
        await browser.close()


asyncio.run(main())