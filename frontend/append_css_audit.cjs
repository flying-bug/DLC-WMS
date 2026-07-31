const fs = require('fs');
const css = fs.readFileSync('d:\\DLC-WMS\\frontend\\append_css.cjs', 'utf-8').split('`')[1];
fs.appendFileSync('d:\\DLC-WMS\\frontend\\src\\pages\\AuditLog\\AuditLogPage.module.css', css);
