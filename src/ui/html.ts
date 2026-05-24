export function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[char] ?? char));
}

export function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/'/g, '&#39;');
}
