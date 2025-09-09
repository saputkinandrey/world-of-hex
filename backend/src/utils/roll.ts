export const rollXd = (x: number) => {
  return Math.ceil(Math.random() * x);
};

export const rollXd6 = (d6: number, plus: number = 0, forEach: number = 0) => {
  let total = 0;
  for (let i = 0; i < d6; i++) {
    total += rollXd(6) + forEach;
  }
  return total + plus;
};

export const roll3d6Under = (target: number) => {
  return target - rollXd6(3);
};

export const randomChoice = <T>(variants: T[]): T => {
  return variants[rollXd(variants.length) - 1];
};
