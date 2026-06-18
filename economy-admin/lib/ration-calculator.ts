export interface RationTarget {
  protein: number;
  energy: number;
  water: number;
  weightLbs: number;
  taste: number;
}

export interface RationCalculatorItem {
  id: string;
  quantity: number;
  proteinPerUnit: number;
  energyPerUnit: number;
  waterPerUnit: number;
  weightLbsPerUnit: number;
  costPerUnit: number;
  edible: boolean;
  valuableProteins: boolean;
  isLimited: boolean;
}

export interface RationCalculatorLine {
  id: string;
  quantity: number;
  protein: number;
  energy: number;
  water: number;
  weightLbs: number;
  cost: number;
  edible: boolean;
  valuableProteins: boolean;
}

export interface RationTotals {
  protein: number;
  energy: number;
  water: number;
  weightLbs: number;
  cost: number;
  ingredientCount: number;
}

export interface RationNutritionResult {
  lines: RationCalculatorLine[];
  protein: number;
  energy: number;
  water: number;
  weightLbs: number;
  cost: number;
  taste: number;
  proteinRatio: number;
  energyRatio: number;
  waterRatio: number;
  weightRatio: number;
  tasteRatio: number;
  hasValuableProteins: boolean;
}

export interface RationSolverOptions {
  step: number;
  maxIterations: number;
  minImprovement: number;
  costWeight: number;
  limitedItemMaxQuantity: number;
}

export interface RationQuantityResult {
  id: string;
  quantity: number;
}

interface SolverCandidate extends RationCalculatorItem {
  quantity: number;
}

interface SolverStep {
  candidate: SolverCandidate;
  totals: RationTotals;
  score: number;
}

export const defaultRationSolverOptions: RationSolverOptions = {
  step: 1,
  maxIterations: 2000,
  minImprovement: 0.000001,
  costWeight: 0.25,
  limitedItemMaxQuantity: 1,
};

const emptyTotals: RationTotals = {
  protein: 0,
  energy: 0,
  water: 0,
  weightLbs: 0,
  cost: 0,
  ingredientCount: 0,
};

const ratio = (value: number, target: number): number => (target > 0 ? value / target : 0);

export const calculateRationNutrition = ({
  target,
  items,
}: {
  target: RationTarget;
  items: RationCalculatorItem[];
}): RationNutritionResult => {
  const lines = items.map((item) => ({
    id: item.id,
    quantity: item.quantity,
    protein: item.proteinPerUnit * item.quantity,
    energy: item.energyPerUnit * item.quantity,
    water: item.waterPerUnit * item.quantity,
    weightLbs: item.weightLbsPerUnit * item.quantity,
    cost: item.costPerUnit * item.quantity,
    edible: item.edible,
    valuableProteins: item.valuableProteins,
  }));

  const totals = lines.reduce<RationTotals>(
    (accumulator, line) => ({
      protein: accumulator.protein + line.protein,
      energy: accumulator.energy + line.energy,
      water: accumulator.water + line.water,
      weightLbs: accumulator.weightLbs + line.weightLbs,
      cost: accumulator.cost + line.cost,
      ingredientCount: accumulator.ingredientCount + (line.quantity > 0 && line.edible ? 1 : 0),
    }),
    emptyTotals,
  );

  const hasValuableProteins = lines.some((line) => line.quantity > 0 && line.edible && line.valuableProteins);

  return {
    lines,
    protein: totals.protein,
    energy: totals.energy,
    water: totals.water,
    weightLbs: totals.weightLbs,
    cost: totals.cost,
    taste: totals.ingredientCount,
    proteinRatio: ratio(totals.protein, target.protein),
    energyRatio: ratio(totals.energy, target.energy),
    waterRatio: ratio(totals.water, target.water),
    weightRatio: ratio(totals.weightLbs, target.weightLbs),
    tasteRatio: ratio(totals.ingredientCount, target.taste),
    hasValuableProteins,
  };
};

export const calculateRationTotals = (items: RationCalculatorItem[]): RationTotals => {
  return items.reduce<RationTotals>(
    (totals, item) => ({
      protein: totals.protein + item.proteinPerUnit * item.quantity,
      energy: totals.energy + item.energyPerUnit * item.quantity,
      water: totals.water + item.waterPerUnit * item.quantity,
      weightLbs: totals.weightLbs + item.weightLbsPerUnit * item.quantity,
      cost: totals.cost + item.costPerUnit * item.quantity,
      ingredientCount: totals.ingredientCount + (item.quantity > 0 && item.edible ? 1 : 0),
    }),
    emptyTotals,
  );
};

export const calculateSolverScore = ({
  totals,
  target,
  ingredientTarget,
  costWeight,
}: {
  totals: RationTotals;
  target: RationTarget;
  ingredientTarget: number;
  costWeight: number;
}): number => {
  const proteinDelta = target.protein > 0 ? (target.protein - totals.protein) / target.protein : totals.protein;
  const energyDelta = target.energy > 0 ? (target.energy - totals.energy) / target.energy : totals.energy;
  const waterDelta = target.water > 0 ? (target.water - totals.water) / target.water : totals.water;
  const weightDelta = target.weightLbs > 0 ? (target.weightLbs - totals.weightLbs) / target.weightLbs : totals.weightLbs;
  const ingredientDelta = ingredientTarget > 0 ? (ingredientTarget - totals.ingredientCount) / ingredientTarget : totals.ingredientCount;
  const costDelta = target.energy > 0 ? totals.cost / target.energy : totals.cost;
  return (
    proteinDelta * proteinDelta +
    energyDelta * energyDelta +
    waterDelta * waterDelta +
    weightDelta * weightDelta +
    ingredientDelta * ingredientDelta +
    costDelta * costDelta * costWeight
  );
};

const addCandidateToTotals = ({
  totals,
  candidate,
  step,
}: {
  totals: RationTotals;
  candidate: SolverCandidate;
  step: number;
}): RationTotals => ({
  protein: totals.protein + candidate.proteinPerUnit * step,
  energy: totals.energy + candidate.energyPerUnit * step,
  water: totals.water + candidate.waterPerUnit * step,
  weightLbs: totals.weightLbs + candidate.weightLbsPerUnit * step,
  cost: totals.cost + candidate.costPerUnit * step,
  ingredientCount: totals.ingredientCount + (candidate.quantity > 0 ? 0 : 1),
});

const findGreedySolverStep = ({
  candidates,
  totals,
  target,
  ingredientTarget,
  options,
}: {
  candidates: SolverCandidate[];
  totals: RationTotals;
  target: RationTarget;
  ingredientTarget: number;
  options: RationSolverOptions;
}): SolverStep | null => {
  const currentScore = calculateSolverScore({
    totals,
    target,
    ingredientTarget,
    costWeight: options.costWeight,
  });

  return candidates.reduce<SolverStep | null>((bestStep, candidate) => {
    if (candidate.isLimited && candidate.quantity >= options.limitedItemMaxQuantity) return bestStep;
    const nextTotals = addCandidateToTotals({ totals, candidate, step: options.step });
    const nextScore = calculateSolverScore({
      totals: nextTotals,
      target,
      ingredientTarget,
      costWeight: options.costWeight,
    });
    if (nextScore >= currentScore - options.minImprovement) return bestStep;
    if (!bestStep || nextScore < bestStep.score) {
      return { candidate, totals: nextTotals, score: nextScore };
    }
    return bestStep;
  }, null);
};

export const solveRationQuantities = ({
  target,
  items,
  options = {},
}: {
  target: RationTarget;
  items: RationCalculatorItem[];
  options?: Partial<RationSolverOptions>;
}): RationQuantityResult[] => {
  const solverOptions = { ...defaultRationSolverOptions, ...options };
  const candidates = items
    .map((item) => ({ ...item, quantity: 0 }))
    .filter(
      (item) =>
        item.edible &&
        (item.weightLbsPerUnit > 0 || item.proteinPerUnit > 0 || item.energyPerUnit > 0 || item.waterPerUnit > 0),
    );
  const ingredientTarget = target.taste;
  const quantities = new Map<string, number>(items.map((item) => [item.id, 0]));
  let totals: RationTotals = { ...emptyTotals };

  for (let iteration = 0; iteration < solverOptions.maxIterations; iteration += 1) {
    const step = findGreedySolverStep({
      candidates,
      totals,
      target,
      ingredientTarget,
      options: solverOptions,
    });
    if (!step) break;
    totals = step.totals;
    quantities.set(step.candidate.id, (quantities.get(step.candidate.id) ?? 0) + solverOptions.step);
    step.candidate.quantity += solverOptions.step;
  }

  const solvedItems = items.map((item) => ({
    id: item.id,
    quantity: quantities.get(item.id) ?? 0,
  }));
  const currentScore = calculateSolverScore({
    totals: calculateRationTotals(items),
    target,
    ingredientTarget,
    costWeight: solverOptions.costWeight,
  });
  const solvedScore = calculateSolverScore({
    totals: calculateRationTotals(items.map((item) => ({ ...item, quantity: quantities.get(item.id) ?? 0 }))),
    target,
    ingredientTarget,
    costWeight: solverOptions.costWeight,
  });

  if (solvedScore >= currentScore - solverOptions.minImprovement) {
    return items.map((item) => ({ id: item.id, quantity: item.quantity }));
  }
  return solvedItems;
};
