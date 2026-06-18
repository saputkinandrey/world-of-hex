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
  gurpsCode: string;
  description: string;
  defaults: SkillDefault[];
  sourceSystem: string;
}
