// โดเมนอีเมลบริษัทที่อนุญาตให้เข้าใช้งานระบบ (แก้ที่เดียว)
export const ALLOWED_EMAIL_DOMAIN = "planbmedia.co.th";

export const isAllowedEmail = (email?: string | null): boolean =>
  !!email && email.trim().toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
