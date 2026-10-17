export const experienceRoles = ['Software Engineer','AI/ML Engineer','Data Scientist','Data Analyst','Data Engineer','Leadership','Teaching'];

export function experienceRoleCategories(item) {
  if (Array.isArray(item.roles)) return experienceRoles.filter(role => item.roles.includes(role));
  // Older JSON remains usable until the role categories are edited in admin.
  const title = String(item.title || '').toLowerCase();
  return experienceRoles.filter(role => ({
    'Software Engineer': /software|back.?end|mobile/.test(title),
    'AI/ML Engineer': /machine learning|ai[ /&]|ai\/ml/.test(title),
    'Data Scientist': /data scien/.test(title),
    'Data Analyst': /data analy/.test(title),
    'Data Engineer': /data engineer/.test(title),
    Leadership: /president|lead$/.test(title),
    Teaching: /teaching|trainer/.test(title)
  })[role]);
}

export function experienceView(items, role = '') {
  return items.filter(item => !role || experienceRoleCategories(item).includes(role));
}
