'use client';

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import CalculateRoundedIcon from '@mui/icons-material/CalculateRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded';
import RuleRoundedIcon from '@mui/icons-material/RuleRounded';
import { Metric } from '../common/Metric';
import { NumberField } from '../common/NumberField';
import { Panel } from '../common/Panel';
import { ProductionGoodList } from '../common/ProductionGoodList';
import { TextFieldEditor } from '../common/TextFieldEditor';
import { useEconomyAdmin } from '../../context/EconomyAdminContext';
import { formatGoodLevel, formatNumber, getGood, getGoodLevelName, getGoodProfile, removeArrayItem, updateArrayItem } from '../../lib/economy-admin-utils';

export const SkillsScreen = () => {
  const {
    tab,
    setTab,
    config,
    configText,
    setConfigText,
    isConfigTextDirty,
    setIsConfigTextDirty,
    configError,
    fileStatus,
    configFilePathInput,
    setConfigFilePathInput,
    draggedGoodId,
    setDraggedGoodId,
    skillSearch,
    setSkillSearch,
    ration,
    selectedTemplateIndex,
    selectedTemplate,
    edibleGoods,
    edibleGoodTypes,
    selectedProductionChainIndex,
    selectedProductionChain,
    selectedSkillIndex,
    selectedSkill,
    filteredSkills,
    foodNavigationValue,
    economyNavigationValue,
    syncConfigState,
    patchConfig,
    updateSelectedRationTemplate,
    addRationTemplate,
    duplicateRationTemplate,
    deleteSelectedRationTemplate,
    solveSelectedRation,
    addProductionChain,
    updateSelectedProductionChain,
    duplicateSelectedProductionChain,
    deleteSelectedProductionChain,
    addProductionRecipe,
    updateProductionRecipe,
    deleteProductionRecipe,
    addProductionInput,
    updateProductionInput,
    deleteProductionInput,
    addProductionOutput,
    updateProductionOutput,
    deleteProductionOutput,
    addConsumerProfile,
    updateConsumerProfile,
    deleteConsumerProfile,
    addCharacterSkill,
    updateSelectedSkill,
    duplicateSelectedSkill,
    deleteSelectedSkill,
    addSkillDefault,
    updateSkillDefault,
    deleteSkillDefault,
    addGoodType,
    updateGoodTypeName,
    updateGoodTypeProfile,
    deleteGoodType,
    addGoodLevel,
    updateGoodLevel,
    deleteGoodLevel,
    deleteGood,
    addGoodBiome,
    removeGoodBiome,
    clearGoodBiomes,
    addBiome,
    updateBiome,
    deleteBiome,
    handleGoodDrop,
    importConfigText,
    resetConfig,
    copyConfig,
    loadConfigFromFile,
    saveConfigToFile
  } = useEconomyAdmin();

  return (
            <Stack spacing={2.5} sx={{ width: '100%', minWidth: 0 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 2, width: '100%', minWidth: 0 }}>
                <Metric label="Skills" value={formatNumber(config.skills.length, 0)} />
                <Metric label="Filtered" value={formatNumber(filteredSkills.length, 0)} />
                <Metric label="Defaults" value={formatNumber(selectedSkill?.defaults.length ?? 0, 0)} />
              </Box>

              <Panel
                title="Skills"
                icon={<GroupsRoundedIcon />}
                action={
                  <Stack direction="row" spacing={1}>
                    <Button size="small" startIcon={<AddRoundedIcon />} onClick={addCharacterSkill}>
                      New
                    </Button>
                    <Button size="small" startIcon={<ContentCopyRoundedIcon />} disabled={!selectedSkill} onClick={duplicateSelectedSkill}>
                      Copy
                    </Button>
                  </Stack>
                }
              >
                <Stack spacing={2}>
                  <TextField
                    label="Search"
                    size="small"
                    value={skillSearch}
                    onChange={(event) => setSkillSearch(event.target.value)}
                    fullWidth
                  />
                  {filteredSkills.length ? (
                    <FormControl size="small" fullWidth>
                      <InputLabel>Skill</InputLabel>
                      <Select
                        label="Skill"
                        value={filteredSkills.some((skill) => skill.id === selectedSkill?.id) ? selectedSkill?.id ?? '' : filteredSkills[0]?.id ?? ''}
                        onChange={(event) => patchConfig({ selectedSkillId: event.target.value })}
                      >
                        {filteredSkills.map((skill) => (
                          <MenuItem key={skill.id} value={skill.id}>
                            {skill.name} - {skill.attribute}/{skill.difficulty}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <Alert severity="info">No skills match the current search.</Alert>
                  )}
                </Stack>
              </Panel>

              {selectedSkill ? (
                <Panel
                  title="Skill Editor"
                  icon={<GroupsRoundedIcon />}
                  action={
                    <IconButton color="error" size="small" onClick={deleteSelectedSkill}>
                      <DeleteRoundedIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <Stack spacing={2}>
                    <TextFieldEditor label="Name" value={selectedSkill.name} onChange={(name) => updateSelectedSkill({ name })} />
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
                      <TextFieldEditor label="Category" value={selectedSkill.category} onChange={(category) => updateSelectedSkill({ category })} />
                      <TextFieldEditor label="Source" value={selectedSkill.sourceSystem} onChange={(sourceSystem) => updateSelectedSkill({ sourceSystem })} />
                      <TextFieldEditor label="Attribute" value={selectedSkill.attribute} onChange={(attribute) => updateSelectedSkill({ attribute })} />
                      <TextFieldEditor label="Difficulty" value={selectedSkill.difficulty} onChange={(difficulty) => updateSelectedSkill({ difficulty })} />
                    </Box>
                    <TextField
                      label="Description"
                      size="small"
                      value={selectedSkill.description}
                      onChange={(event) => updateSelectedSkill({ description: event.target.value })}
                      multiline
                      minRows={8}
                      fullWidth
                    />
                  </Stack>
                </Panel>
              ) : null}

              {selectedSkill ? (
                <Panel
                  title="Defaults"
                  icon={<RuleRoundedIcon />}
                  action={
                    <Button size="small" startIcon={<AddRoundedIcon />} onClick={addSkillDefault}>
                      Add default
                    </Button>
                  }
                >
                  <Stack spacing={1}>
                    {selectedSkill.defaults.length ? (
                      selectedSkill.defaults.map((skillDefault, index) => (
                        <Stack
                          key={skillDefault.id}
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1}
                          alignItems={{ xs: 'stretch', sm: 'center' }}
                        >
                          <TextFieldEditor
                            label="Source"
                            value={skillDefault.source}
                            onChange={(source) => updateSkillDefault(index, { source })}
                          />
                          <Box sx={{ width: { xs: '100%', sm: 120 }, flexShrink: 0 }}>
                            <NumberField
                              label="Mod"
                              value={skillDefault.modifier}
                              step={1}
                              integer
                              onChange={(modifier) => updateSkillDefault(index, { modifier })}
                            />
                          </Box>
                          <IconButton color="error" size="small" onClick={() => deleteSkillDefault(index)} sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}>
                            <DeleteRoundedIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      ))
                    ) : (
                      <Alert severity="info">This skill has no defaults.</Alert>
                    )}
                  </Stack>
                </Panel>
              ) : null}
            </Stack>
  );
};
