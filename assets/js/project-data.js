export const projectCategories = ['Web','Mobile','AI/ML','Web3/Crypto','Data','IoT/Hardware','Game'];
export const projectStatuses = ['Concept','Research','Experiment','In progress','Prototype','Alpha','Beta','Production','Archived'];
export const selectedProjectLimit = 6;

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const validMonth = value => typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const formatMonth = value => validMonth(value)
  ? `${monthNames[Number(value.slice(5,7)) - 1]} ${value.slice(0,4)}` : '';
const monthRank = value => validMonth(value) ? Number(value.slice(0,4)) * 12 + Number(value.slice(5,7)) : -Infinity;

function endRank(project) {
  if (validMonth(project.end)) return monthRank(project.end);
  if (validMonth(project.start) && (project.end == null || project.end === '')) return Infinity;
  const year = typeof project.year === 'string' ? project.year.trim() : '';
  return /^\d{4}$/.test(year) ? Number(year) * 12 : -Infinity;
}

function newestEndFirst(a,b) {
  const endA = endRank(a), endB = endRank(b);
  if (endA !== endB) return endA > endB ? -1 : 1;
  const startA = monthRank(a.start), startB = monthRank(b.start);
  return startA === startB ? 0 : startA > startB ? -1 : 1;
}

export function projectPeriod(project) {
  const start = formatMonth(project.start), end = formatMonth(project.end);
  if (start && end) return `${start} – ${end}`;
  if (start) return project.end == null || project.end === '' ? `${start} – Present` : start;
  return end || (typeof project.year === 'string' ? project.year.trim() : '');
}

export function projectFilterCategories(project) {
  const values = Array.isArray(project.categories) ? project.categories : [];
  return [...new Set(values.filter(value => projectCategories.includes(value)))];
}

export function projectView(collection,view) {
  const projects = view === 'Selected'
    ? collection.filter(project => project.selected === true).slice(0,selectedProjectLimit)
    : view === 'All' ? [...collection] : collection.filter(project => projectFilterCategories(project).includes(view));
  return projects.sort(newestEndFirst);
}
