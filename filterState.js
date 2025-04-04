// filterState.js
let currentFilter = {};

export function setCurrentFilter(filter) {
  currentFilter = filter;
}

export function getCurrentFilter() {
  return currentFilter;
}
