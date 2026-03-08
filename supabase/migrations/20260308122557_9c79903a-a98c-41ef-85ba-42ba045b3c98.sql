-- Allow anonymous (public) read access to direct_shipments for public view page
CREATE POLICY "Allow anon read direct_shipments for public view"
ON public.direct_shipments
FOR SELECT
TO anon
USING (true);

-- Allow anonymous read access to direct_shipment_items for public view page
CREATE POLICY "Allow anon read direct_shipment_items for public view"
ON public.direct_shipment_items
FOR SELECT
TO anon
USING (true);

-- Allow anonymous read access to companies for joining
CREATE POLICY "Allow anon read companies for public view"
ON public.companies
FOR SELECT
TO anon
USING (true);

-- Allow anonymous read access to suppliers for joining
CREATE POLICY "Allow anon read suppliers for public view"
ON public.suppliers
FOR SELECT
TO anon
USING (true);