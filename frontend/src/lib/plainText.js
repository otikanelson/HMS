/**
 * Convert potentially HTML-containing text to plain text
 * Handles older entries with HTML tags, converts them to plain text
 * Clean entries pass through unchanged
 * @param {string} value - The value to convert
 * @returns {string} - Plain text with line breaks preserved
 */
export function toPlainText(value) {
  if (!value) return '';
  
  // If no angle brackets, it's already plain text
  if (!value.includes('<')) {
    return value;
  }
  
  // Convert HTML tags to line breaks and remove them
  let text = value
    // Convert closing tags to line breaks
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // Remove all remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    // Clean up excess newlines
    .replace(/\n\n+/g, '\n')
    .trim();
  
  return text;
}
