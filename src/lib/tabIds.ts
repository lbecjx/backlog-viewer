import type { Zone } from './computeZone'

// A tab's id/panel-id pair, shared with the `role="tabpanel"` element the
// active tab controls (see App.tsx) — required by the WAI-ARIA Tabs pattern
// once `role="tab"`/`role="tablist"` are in use, not optional decoration.
export const tabId = (zone: Zone): string => `tab-${zone}`
export const tabPanelId = (zone: Zone): string => `tabpanel-${zone}`
