export const calcVariance = (plannedAmount: number, actualAmount: number) =>
  plannedAmount - actualAmount;

export const calcPercentage = (numerator: number, denominator: number) => {
  if (denominator <= 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 100);
};

export const varianceTone = (plannedAmount: number, actualAmount: number) => {
  if (plannedAmount <= 0) {
    return "neutral";
  }

  const ratio = actualAmount / plannedAmount;

  if (ratio > 1) {
    return "danger";
  }

  if (ratio >= 0.8) {
    return "warning";
  }

  return "success";
};
