type DeliveryItem = {
  pending_id?: string | null;
  issued_quantity?: number | null;
};

/** Receipt views use actual issued quantities, never requested quantities. */
export function deliveryConfirmationItems<T extends DeliveryItem>(items: readonly T[], requestId: string): T[] {
  return items.filter(item => item.pending_id === requestId && Number(item.issued_quantity ?? 0) > 0);
}