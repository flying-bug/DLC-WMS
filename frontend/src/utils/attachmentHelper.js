/**
 * Helper to serialize and parse file/image attachments with notes.
 * Uses a safe tagged metadata block inside the TEXT note field.
 */

const ATTACHMENT_TAG_START = '<!--ATTACHMENTS:';
const ATTACHMENT_TAG_END = ':ATTACHMENTS-->';

/**
 * Packs note text and attachments list into a combined string for backend storage
 * @param {string} noteText 
 * @param {Array} attachments 
 * @returns {string}
 */
export const serializeNoteWithAttachments = (noteText = '', attachments = []) => {
  const cleanNote = (noteText || '').trim();
  if (!attachments || attachments.length === 0) {
    return cleanNote;
  }
  const safeAttachments = attachments.map(a => ({
    name: a.name || 'Tệp đính kèm',
    url: a.url || a.secureUrl || '',
    size: a.size || 0,
    type: a.type || '',
    publicId: a.publicId || '',
  }));
  const serialized = JSON.stringify(safeAttachments);
  const tag = `${ATTACHMENT_TAG_START}${serialized}${ATTACHMENT_TAG_END}`;
  return cleanNote ? `${cleanNote}\n${tag}` : tag;
};

/**
 * Unpacks combined string from backend into clean note text and attachments array
 * @param {string} rawNote 
 * @returns {{ note: string, attachments: Array }}
 */
export const parseNoteAndAttachments = (rawNote = '') => {
  if (!rawNote) return { note: '', attachments: [] };
  const str = String(rawNote);
  const startIdx = str.indexOf(ATTACHMENT_TAG_START);
  const endIdx = str.indexOf(ATTACHMENT_TAG_END);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const jsonStr = str.substring(startIdx + ATTACHMENT_TAG_START.length, endIdx);
    const cleanNote = (str.substring(0, startIdx) + str.substring(endIdx + ATTACHMENT_TAG_END.length)).trim();
    try {
      const parsed = JSON.parse(jsonStr);
      return {
        note: cleanNote,
        attachments: Array.isArray(parsed) ? parsed : [],
      };
    } catch {
      return { note: str, attachments: [] };
    }
  }

  return { note: str, attachments: [] };
};
