// โดเมนอีเมลบริษัทที่อนุญาตให้เข้าใช้งานระบบ (แก้ที่เดียว)
export const ALLOWED_EMAIL_DOMAIN = "planbmedia.co.th";

// อีเมลนอกโดเมนที่อนุญาตเป็นกรณีพิเศษ (ผู้ดูแลระบบภายนอก)
export const ALLOWED_EXTERNAL_EMAILS = ["polpat@demuk.co.th"];

export const isAllowedEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return (
    normalized.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`) ||
    ALLOWED_EXTERNAL_EMAILS.includes(normalized)
  );
};
