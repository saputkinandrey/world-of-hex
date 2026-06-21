export interface SkillDefault {
  id: string;
  source: string;
  modifier: number;
}

export interface CharacterSkill {
  id: string;
  name: string;
  category: string;
  attribute: string;
  difficulty: string;
  description: string;
  defaults: SkillDefault[];
  sourceSystem: string;
}

export interface CharacterTechnique {
  id: string;
  name: string;
  baseSkillId: string;
  productionRecipeId: string;
  difficultyPenalty: number;
  maxRelativeLevel: number;
  prerequisiteTechniqueIds: string[];
  notes: string;
}
