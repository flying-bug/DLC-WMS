const fs = require('fs');
const css = `
/* Filter Section */
.filterSection {
  background: var(--color-white);
  padding: 14px 20px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  border: 1px solid var(--color-border);
  gap: 16px;
  flex-wrap: wrap;
}

.searchAndPopover {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  flex: 1;
}

.searchBox {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 260px;
  max-width: 380px;
  flex: 1;
}

.searchBox i:first-child {
  position: absolute;
  left: 12px;
  color: var(--color-text-muted);
  font-size: 14px;
}

.searchInput {
  width: 100%;
  padding: 8px 36px 8px 36px;
  border: 1px solid var(--color-border-strong);
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  color: var(--color-text-strong);
  height: 38px;
  transition: border-color 0.2s ease;
}

.searchInput:focus {
  border-color: var(--color-primary);
}

.clearSearchBtn {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  font-size: 14px;
}

.clearSearchBtn:hover {
  color: var(--color-danger);
}

.filterSelectGroup {
  display: flex;
  gap: 12px;
  align-items: center;
}

.filterSelect {
  padding: 8px 12px;
  border: 1px solid var(--color-border-strong);
  border-radius: 6px;
  font-size: 14px;
  color: var(--color-text-strong);
  height: 38px;
  outline: none;
  background-color: var(--color-white);
}

.filterSelect:focus {
  border-color: var(--color-primary);
}

.filterActions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.iconBtn {
  border: 1px solid var(--color-border-strong);
  background: var(--color-white);
  width: 38px;
  height: 38px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
}

.iconBtn:hover {
  background-color: var(--color-bg);
  color: var(--color-primary);
  border-color: var(--color-primary);
}
`;
fs.appendFileSync('d:\\DLC-WMS\\frontend\\src\\pages\\UsersPage.module.css', css);
