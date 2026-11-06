export const BUTTON_CLASS = "yte-save-to-watch-later-button";
// The native icon names that carry the saved state on the button.
export const SAVED_ICON = "CHECK_CIRCLE_THICK";
export const UNSAVED_ICON = "WATCH_LATER";
export const LOCKUP_SELECTOR = "yt-lockup-view-model";
// This class also appears in index.css. Keep both in sync.
export const LOCKUP_MENU_WRAPPER_SELECTOR = "div.ytLockupMetadataViewModelMenuButton";
export const ACTIONS_ROW_SELECTOR = "ytd-watch-metadata ytd-menu-renderer";
// A search row is a legacy Polymer renderer: no id attribute, and the button goes in the action menu's button slot.
export const SEARCH_ROW_SELECTOR = "ytd-video-renderer";
export const SEARCH_MENU_SLOT_SELECTOR = `${SEARCH_ROW_SELECTOR} #menu ytd-menu-renderer #top-level-buttons-computed`;
export const SEARCH_ROW_THUMBNAIL_SELECTOR = "a#thumbnail";
// Mutations inside these subtrees can never contain a lockup or the actions row.
export const IGNORED_MUTATION_ROOTS = "#player, ytd-comments";
// YouTube ships two watch layouts. The selector matches whichever one the session has.
export const WATCH_CONTAINER_SELECTOR = "ytd-watch-flexy, ytd-watch-grid";
