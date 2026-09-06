export const MAX_ATTRIBUTES = 3;
export const MAX_VALUES_PER_ATTRIBUTE = 20;
export const MAX_VARIANT_COMBINATIONS = 100;
export const MAX_SKU_LENGTH = 50;

export function normalizeAttributeText(value) {
  return String(value ?? '')
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function canonicalCombinationKey(specs) {
  return Object.entries(specs || {})
    .map(([name, value]) => [normalizeAttributeText(name), normalizeAttributeText(value)])
    .filter(([name, value]) => name && value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}=${value}`)
    .join('|');
}

export function countCombinations(attributes) {
  return normalizeAttributes(attributes).reduce((total, attribute) => total * attribute.values.length, 1);
}

export function generateCombinations(attributes, limit = MAX_VARIANT_COMBINATIONS) {
  const normalized = normalizeAttributes(attributes);
  if (normalized.length === 0) return [];

  const count = countCombinations(normalized);
  if (count > limit) {
    throw new RangeError(`Too many variant combinations: ${count}/${limit}`);
  }

  return normalized.reduce((rows, attribute) => rows.flatMap((row) =>
    attribute.values.map((value) => ({ ...row, [attribute.name]: value }))
  ), [{}]);
}

export function slugSkuPart(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

export function generateSku(productCode, specs, usedSkus = new Set()) {
  const base = slugSkuPart(productCode);
  const suffix = Object.values(specs || {}).map(slugSkuPart).filter(Boolean).join('-');
  const raw = [base, suffix].filter(Boolean).join('-');
  const candidate = fitSku(raw, suffix);

  let sku = candidate;
  let counter = 2;
  while (usedSkus.has(sku)) {
    const tail = `-${counter++}`;
    sku = `${candidate.slice(0, MAX_SKU_LENGTH - tail.length).replace(/-+$/g, '')}${tail}`;
  }
  usedSkus.add(sku);
  return sku;
}

export function buildVariantRows(attributes, { productCode, defaults = {}, previousRows = [], excludedKeys = [] } = {}) {
  const previousByKey = new Map(previousRows.map((row) => [row.canonicalKey, row]));
  const excluded = new Set(excludedKeys);
  const usedSkus = new Set();

  return generateCombinations(attributes)
    .map((specs) => {
      const canonicalKey = canonicalCombinationKey(specs);
      const previous = previousByKey.get(canonicalKey);
      if (previous) {
        usedSkus.add(previous.sku);
        return { ...previous, specs, canonicalKey };
      }
      return {
        canonicalKey,
        specs,
        variantName: Object.values(specs).join(' / '),
        sku: generateSku(productCode, specs, usedSkus),
        barcode: '',
        costPrice: defaults.costPrice ?? 0,
        salePrice: defaults.salePrice ?? 0,
        manufacturerPartNumber: '',
        trackingMode: defaults.trackingMode ?? 'NONE',
        minStockQty: defaults.minStockQty ?? 0,
        warrantyMonths: defaults.warrantyMonths ?? 0,
        active: defaults.active ?? true,
        isDirty: false,
        skuManuallyEdited: false,
      };
    })
    .filter((row) => !excluded.has(row.canonicalKey));
}

function normalizeAttributes(attributes) {
  return (attributes || [])
    .slice(0, MAX_ATTRIBUTES)
    .map((attribute) => {
      const seen = new Set();
      return {
        name: String(attribute?.name ?? '').trim().replace(/\s+/g, ' '),
        values: (attribute?.values || [])
          .map((value) => String(value ?? '').trim().replace(/\s+/g, ' '))
          .filter((value) => {
            const key = normalizeAttributeText(value);
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .slice(0, MAX_VALUES_PER_ATTRIBUTE),
      };
    })
    .filter((attribute) => attribute.name && attribute.values.length > 0);
}

function fitSku(raw, suffix) {
  if (raw.length <= MAX_SKU_LENGTH) return raw;

  const suffixPart = suffix.slice(-14).replace(/^-+/g, '');
  const baseLength = Math.min(35, MAX_SKU_LENGTH - suffixPart.length - 1);
  const basePart = raw.slice(0, baseLength).replace(/-+$/g, '');
  return [basePart, suffixPart].filter(Boolean).join('-').slice(0, MAX_SKU_LENGTH).replace(/-+$/g, '');
}
