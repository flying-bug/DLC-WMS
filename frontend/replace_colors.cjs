const fs = require('fs');
const path = require('path');

const map = {
  '#f8fafc': 'var(--wms-bg-soft)',
  '#ffffff': 'var(--color-white)',
  '#cbd5e1': 'var(--wms-border-strong)',
  '#475569': 'var(--wms-text-muted)',
  '#f1f5f9': 'var(--wms-bg-hover)',
  '#0f172a': 'var(--wms-text-title)',
  '#eff6ff': 'var(--color-primary-soft)',
  '#2563eb': 'var(--wms-primary)',
  '#334155': 'var(--wms-text-body)',
  '#1d4ed8': 'var(--wms-primary-hover)',
  '#94a3b8': 'var(--wms-text-subtle)',
  '#059669': 'var(--wms-success)',
  '#dc2626': 'var(--wms-danger)',
  '#ecfdf5': 'var(--wms-success-soft)',
  '#047857': 'var(--wms-success-hover)',
  '#a7f3d0': 'var(--wms-success-border)',
  '#fffbeb': 'var(--wms-warning-soft)',
  '#b45309': 'var(--wms-warning-hover)',
  '#fde68a': 'var(--wms-warning-border)',
  '#1e293b': 'var(--wms-text-strong)',
  '#e2e8f0': 'var(--wms-border-base)',
  '#ef4444': 'var(--wms-danger)',
  '#f0fdf4': 'var(--color-success-bg-soft)',
  '#bbf7d0': 'var(--wms-success-border)',
  '#15803d': 'var(--color-success-deep)',
  '#dcfce7': 'var(--color-success-bg)',
  '#1e3a8a': 'var(--color-primary-navy)',
  '#bfdbfe': 'var(--color-info-border-soft)',
  '#64748b': 'var(--wms-text-muted)',
  '#38bdf8': 'var(--color-info)',
  '#6366f1': 'var(--wms-primary)',
  '#1e40af': 'var(--color-primary-link)',
  '#e5e7eb': 'var(--color-border)',
  '#f3f4f6': 'var(--color-bg)',
  '#9ca3af': 'var(--color-text-placeholder)',
  '#374151': 'var(--color-text-heading)',
  '#111827': 'var(--color-text)',
  '#10b981': 'var(--color-success-alt)',
  '#f59e0b': 'var(--color-warning)',
  '#3b82f6': 'var(--color-primary-bright)',
  '#0284c7': 'var(--color-info-hover)',
  '#d1d5db': 'var(--color-border-muted)',
  '#000000': 'var(--color-text-2)',
  '#f9fafb': 'var(--color-bg-elevated)',
  '#dbeafe': 'var(--color-primary-pale)'
};

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.css') || file.endsWith('.jsx') || file.endsWith('.js')) {
        if (!file.includes('tokens.css') && !file.includes('theme.css')) {
          results.push(file);
        }
      }
    }
  });
  return results;
}

const files = walk('./src');
let totalReplaced = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  // replace exact matches
  for (const [hex, variable] of Object.entries(map)) {
    // Case insensitive regex for the hex code
    const regex = new RegExp(hex, 'gi');
    content = content.replace(regex, variable);
  }
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    totalReplaced++;
    console.log(`Updated: ${file}`);
  }
});

console.log(`\nUpdated ${totalReplaced} files in total.`);
