'use client';

import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import RuleRoundedIcon from '@mui/icons-material/RuleRounded';
import { Metric } from '../common/Metric';
import { NumberField } from '../common/NumberField';
import { Panel } from '../common/Panel';
import { TextFieldEditor } from '../common/TextFieldEditor';
import { useDomainAdmin } from '../../context/DomainAdminContext';
import { formatNumber, getGood } from '../../lib/domain-admin-utils';

export const TechniquesScreen = () => {
  const {
    config,
    selectedTechnique,
    patchConfig,
    addCharacterTechnique,
    updateSelectedTechnique,
    duplicateSelectedTechnique,
    deleteSelectedTechnique,
  } = useDomainAdmin();

  const productionRecipes = config.productionChains.flatMap((chain) =>
    chain.recipes.map((recipe) => {
      const outputNames = recipe.outputs.map((output) => getGood(config, output.goodId).name).join(' + ');
      return {
        chain,
        recipe,
        label: `${chain.name}: ${outputNames}`,
      };
    }),
  );
  const prerequisiteOptions = config.techniques.filter((technique) => technique.id !== selectedTechnique?.id);
  const selectedRecipeLabel = productionRecipes.find((recipeOption) => recipeOption.recipe.id === selectedTechnique?.productionRecipeId)?.label ?? 'Missing recipe';
  const selectedBaseSkill = config.skills.find((skill) => skill.id === selectedTechnique?.baseSkillId);

  return (
    <Stack spacing={2.5} sx={{ width: '100%', minWidth: 0 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
        <Metric label="Techniques" value={formatNumber(config.techniques.length, 0)} />
        <Metric label="Recipes" value={formatNumber(productionRecipes.length, 0)} />
        <Metric label="Prerequisites" value={formatNumber(selectedTechnique?.prerequisiteTechniqueIds.length ?? 0, 0)} />
      </Box>

      <Panel
        title="Techniques"
        icon={<GroupsRoundedIcon />}
        action={
          <Stack direction="row" spacing={1}>
            <Button size="small" startIcon={<AddRoundedIcon />} onClick={addCharacterTechnique}>
              New
            </Button>
            <Button size="small" startIcon={<ContentCopyRoundedIcon />} disabled={!selectedTechnique} onClick={duplicateSelectedTechnique}>
              Copy
            </Button>
          </Stack>
        }
      >
        <Stack spacing={2}>
          {config.techniques.length ? (
            <FormControl size="small" fullWidth>
              <InputLabel>Technique</InputLabel>
              <Select
                label="Technique"
                value={selectedTechnique?.id ?? config.techniques[0]?.id ?? ''}
                onChange={(event) => patchConfig({ selectedTechniqueId: event.target.value })}
              >
                {config.techniques.map((technique) => (
                  <MenuItem key={technique.id} value={technique.id}>
                    {technique.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <Alert severity="info">Create a technique to bind a recipe to a skill application.</Alert>
          )}
        </Stack>
      </Panel>

      {selectedTechnique ? (
        <Panel
          title="Technique Editor"
          icon={<RuleRoundedIcon />}
          action={
            <IconButton color="error" size="small" onClick={deleteSelectedTechnique}>
              <DeleteRoundedIcon fontSize="small" />
            </IconButton>
          }
        >
          <Stack spacing={2}>
            <TextFieldEditor label="Name" value={selectedTechnique.name} onChange={(name) => updateSelectedTechnique({ name })} />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Base skill</InputLabel>
                <Select
                  label="Base skill"
                  value={selectedTechnique.baseSkillId}
                  onChange={(event) => updateSelectedTechnique({ baseSkillId: event.target.value })}
                >
                  {selectedBaseSkill ? null : (
                    <MenuItem value={selectedTechnique.baseSkillId} disabled>
                      Missing skill
                    </MenuItem>
                  )}
                  {config.skills.map((skill) => (
                    <MenuItem key={skill.id} value={skill.id}>
                      {skill.name} - {skill.attribute}/{skill.difficulty}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>Recipe</InputLabel>
                <Select
                  label="Recipe"
                  value={selectedTechnique.productionRecipeId}
                  onChange={(event) => updateSelectedTechnique({ productionRecipeId: event.target.value })}
                >
                  {productionRecipes.some((recipeOption) => recipeOption.recipe.id === selectedTechnique.productionRecipeId) ? null : (
                    <MenuItem value={selectedTechnique.productionRecipeId} disabled>
                      {selectedRecipeLabel}
                    </MenuItem>
                  )}
                  {productionRecipes.map((recipeOption) => (
                    <MenuItem key={recipeOption.recipe.id} value={recipeOption.recipe.id}>
                      {recipeOption.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <NumberField
                label="Difficulty penalty"
                value={selectedTechnique.difficultyPenalty}
                max={0}
                step={1}
                integer
                onChange={(difficultyPenalty) => updateSelectedTechnique({ difficultyPenalty })}
              />
              <NumberField
                label="Max relative level"
                value={selectedTechnique.maxRelativeLevel}
                step={1}
                integer
                onChange={(maxRelativeLevel) => updateSelectedTechnique({ maxRelativeLevel })}
              />
            </Box>
            <FormControl size="small" fullWidth>
              <InputLabel>Prerequisites</InputLabel>
              <Select
                multiple
                label="Prerequisites"
                value={selectedTechnique.prerequisiteTechniqueIds}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((techniqueId) => (
                      <Chip
                        key={techniqueId}
                        size="small"
                        label={config.techniques.find((technique) => technique.id === techniqueId)?.name ?? techniqueId}
                      />
                    ))}
                  </Box>
                )}
                onChange={(event) =>
                  updateSelectedTechnique({
                    prerequisiteTechniqueIds:
                      typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value,
                  })
                }
              >
                {prerequisiteOptions.map((technique) => (
                  <MenuItem key={technique.id} value={technique.id}>
                    {technique.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Notes"
              size="small"
              value={selectedTechnique.notes}
              onChange={(event) => updateSelectedTechnique({ notes: event.target.value })}
              multiline
              minRows={4}
              fullWidth
            />
          </Stack>
        </Panel>
      ) : null}
    </Stack>
  );
};
