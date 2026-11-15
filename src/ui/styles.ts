export const css = `
.qc-dialog {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 300px;
  min-height: 0;
}
.qc-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  min-height: 0;
  padding: 8px 10px 10px;
}
.qc-spacer { flex: 1 1 auto; }
.qc-topbar {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 24px;
  flex: 0 0 auto;
}
.qc-panel-title {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.qc-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 220px;
  padding: 2px 7px;
  border: 1px solid rgba(127, 127, 127, 0.25);
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
.qc-chip:hover { background: rgba(127, 127, 127, 0.12); }
.qc-chip-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.qc-thread-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1 1 auto;
  min-height: 0;
}
.qc-thread {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 2px 4px 4px 2px;
  scrollbar-gutter: stable;
}
.qc-row { display: flex; flex-direction: column; gap: 4px; }
.qc-row-user { align-items: flex-end; }
.qc-row-assistant { align-items: stretch; }
.qc-bubble-user {
  max-width: 86%;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(127, 127, 127, 0.16);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.5;
}
.qc-plain {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.55;
}
.qc-selectable { user-select: text; }
.qc-row-actions { display: flex; gap: 10px; opacity: 0; transition: opacity 120ms ease; }
.qc-row:hover .qc-row-actions { opacity: 1; }
.qc-link {
  border: 0;
  background: transparent;
  color: inherit;
  opacity: 0.55;
  font: inherit;
  font-size: 11px;
  padding: 0;
  cursor: pointer;
  text-decoration: none;
}
.qc-link:hover { opacity: 1; text-decoration: underline; }
.qc-link:disabled { opacity: 0.35; cursor: default; text-decoration: none; }
.qc-error { color: #ff7a70; font-size: 12px; line-height: 1.45; }
.qc-meta { font-size: 11px; opacity: 0.55; }
.qc-ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }

.qc-composer-wrap { flex: 0 0 auto; }
.qc-composer {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid rgba(127, 127, 127, 0.28);
  border-radius: 10px;
}
.qc-composer:focus-within { border-color: rgba(127, 127, 127, 0.55); }
.qc-input {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 22px;
  max-height: 160px;
  padding: 3px 0;
  border: 0;
  outline: 0;
  resize: none;
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: 1.5;
}
.qc-hint { margin-top: 4px; font-size: 11px; opacity: 0.5; }

.qc-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 24px 16px;
  text-align: center;
  flex: 1 1 auto;
}
.qc-empty-title { font-size: 13px; font-weight: 600; }
.qc-empty-body { max-width: 320px; font-size: 12px; line-height: 1.5; opacity: 0.6; }

.qc-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  padding: 5px 8px;
  border: 1px solid rgba(127, 127, 127, 0.28);
  border-radius: 7px;
  font-size: 11px;
  opacity: 0.9;
}

.qc-view {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1 1 auto;
  min-height: 0;
}
.qc-history { overflow: hidden; }
.qc-history > .qc-list { margin-top: 2px; }
.qc-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  scrollbar-gutter: stable;
}
.qc-item {
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 8px;
  padding: 1px;
}
.qc-item:hover { background: rgba(127, 127, 127, 0.1); }
.qc-item-active { background: rgba(127, 127, 127, 0.16); }
.qc-item-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.qc-item-title {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.qc-item-preview {
  font-size: 11px;
  opacity: 0.55;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.qc-item-side {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-right: 4px;
  flex: 0 0 auto;
}
.qc-badge {
  font-size: 10px;
  border: 1px solid rgba(127, 127, 127, 0.35);
  border-radius: 4px;
  padding: 1px 4px;
  opacity: 0.8;
  white-space: nowrap;
}

.qc-handoff { overflow-y: auto; }
.qc-handoff-head, .qc-view-head { display: flex; flex-direction: column; gap: 4px; }
.qc-view-title { font-size: 13px; font-weight: 600; }
.qc-view-body { font-size: 12px; line-height: 1.5; opacity: 0.6; }
.qc-options { display: flex; flex-direction: column; gap: 6px; }
.qc-option {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 9px 11px;
  border: 1px solid rgba(127, 127, 127, 0.28);
  border-radius: 9px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.qc-option:hover { background: rgba(127, 127, 127, 0.08); }
.qc-option-active { border-color: rgba(127, 127, 127, 0.75); background: rgba(127, 127, 127, 0.12); }
.qc-option-title { font-size: 13px; font-weight: 600; }
.qc-option-body { font-size: 11px; line-height: 1.45; opacity: 0.6; }
.qc-facts { display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
.qc-fact { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.qc-fact-key { flex: 0 0 auto; min-width: 48px; opacity: 0.55; }
.qc-view-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: auto;
  padding-top: 6px;
  flex: 0 0 auto;
}

.qc-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.qc-settings {
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 720px;
  padding: 20px 24px;
}
.qc-settings-head { display: flex; flex-direction: column; gap: 4px; }
.qc-settings-title { font-size: 15px; font-weight: 600; }
.qc-settings-body, .qc-settings-hint { font-size: 12px; line-height: 1.5; opacity: 0.6; }
.qc-settings-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 14px;
  border-top: 1px solid rgba(127, 127, 127, 0.18);
}
.qc-settings-label { font-size: 13px; font-weight: 600; }
.qc-settings-row { display: flex; align-items: center; gap: 8px; }
.qc-settings-inline { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.qc-settings-status { font-size: 11px; opacity: 0.6; }
.qc-settings-status[data-ok="true"] { color: #5fbf7a; opacity: 1; }
`
