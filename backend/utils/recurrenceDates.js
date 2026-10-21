function isLastDayOfMonth(date) {
  return date.getDate() === new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function advanceMonthly(date, anchorDay = date.getDate(), anchorMonthEnd = isLastDayOfMonth(date)) {
  const next = new Date(date);
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);

  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(anchorMonthEnd ? lastDay : Math.min(anchorDay, lastDay));
  return next;
}

module.exports = { advanceMonthly, isLastDayOfMonth };