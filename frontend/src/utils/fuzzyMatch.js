/**
 * Utility matching thông minh cho Voice AI & Search.
 * Hỗ trợ bỏ dấu tiếng Việt, tìm theo cụm từ và so khớp token đa trường.
 */

/**
 * Chuẩn hóa chuỗi tiếng Việt: Bỏ dấu, đưa về chữ thường, bỏ ký tự đặc biệt
 */
export function normalizeVi(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Tính điểm tương đồng giữa từ khóa (kw) và chuỗi mục tiêu (target)
 */
export function calculateMatchScore(kw, target) {
  if (!kw || !target) return 0;
  const nKw = normalizeVi(kw);
  const nTarget = normalizeVi(target);

  if (nKw === nTarget) return 1.0;
  if (nTarget.startsWith(nKw)) return 0.95;
  if (nTarget.includes(nKw)) return 0.85;
  if (nKw.includes(nTarget)) return 0.80;

  // Token-based Jaccard / Overlap similarity
  const kwTokens = nKw.split(/[\s,.-]+/).filter(Boolean);
  const targetTokens = nTarget.split(/[\s,.-]+/).filter(Boolean);
  if (kwTokens.length === 0 || targetTokens.length === 0) return 0;

  let matchedTokens = 0;
  for (const kt of kwTokens) {
    if (targetTokens.some(tt => tt === kt || tt.includes(kt) || kt.includes(tt))) {
      matchedTokens++;
    }
  }

  return matchedTokens / kwTokens.length;
}

/**
 * Tìm phần tử khớp nhất trong danh sách
 * @param {Array} list - Danh sách đối tượng (ví dụ: warehouses, customers, products)
 * @param {string} keyword - Từ khóa giọng nói trích xuất
 * @param {function} getFields - Hàm trả về mảng các trường chuỗi cần tìm kiếm
 * @param {number} threshold - Ngưỡng điểm chấp nhận tối thiểu (mặc định 0.35)
 * @returns {object|null}
 */
export function findBestMatch(list, keyword, getFields, threshold = 0.35) {
  if (!Array.isArray(list) || list.length === 0 || !keyword) return null;

  let bestItem = null;
  let highestScore = 0;

  for (const item of list) {
    const fields = typeof getFields === 'function' ? getFields(item) : [String(item)];
    let itemMaxScore = 0;

    for (const f of (Array.isArray(fields) ? fields : [fields])) {
      if (!f) continue;
      const score = calculateMatchScore(keyword, f);
      if (score > itemMaxScore) {
        itemMaxScore = score;
      }
    }

    if (itemMaxScore > highestScore) {
      highestScore = itemMaxScore;
      bestItem = item;
    }
  }

  if (highestScore >= threshold) {
    return bestItem;
  }
  return null;
}
