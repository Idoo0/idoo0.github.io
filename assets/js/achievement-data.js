const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const validMonth = value => typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

export function achievementDate(achievement) {
  if (validMonth(achievement.date)) return `${months[Number(achievement.date.slice(5,7)) - 1]} ${achievement.date.slice(0,4)}`;
  return typeof achievement.year === 'string' ? achievement.year.trim() : '';
}

function sortMonth(achievement) {
  if (validMonth(achievement.date)) return achievement.date;
  const year = typeof achievement.year === 'string' ? achievement.year.trim() : '';
  return /^\d{4}$/.test(year) ? `${year}-00` : '';
}

export function achievementGroups(achievements) {
  const featured = achievements.filter(achievement => achievement.highlighted).slice(0,3)
    .sort((a,b) => sortMonth(b).localeCompare(sortMonth(a)));
  const remaining = achievements.filter(achievement => !featured.includes(achievement))
    .sort((a,b) => sortMonth(b).localeCompare(sortMonth(a)));
  return {featured,remaining};
}
