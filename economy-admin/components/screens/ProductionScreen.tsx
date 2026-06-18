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

export const ProductionScreen = () => {
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
    addProductionStep,
    updateProductionStep,
    deleteProductionStep,
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
            <Stack spacing={2.5} sx={{ width: '100%', maxWidth: 640, mx: 'auto', alignSelf: 'center', minWidth: 0 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 2, width: '100%', minWidth: 0 }}>
                <Metric label="Production chains" value={formatNumber(config.productionChains.length, 0)} />
                <Metric label="Selected chain steps" value={formatNumber(selectedProductionChain?.steps.length ?? 0, 0)} />
                <Metric label="Goods available" value={formatNumber(config.goods.length, 0)} />
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2.5, width: '100%', minWidth: 0 }}>
                <Panel
                  title="Production Chains"
                  icon={<AccountTreeRoundedIcon />}
                  action={
                    <Stack direction="row" spacing={1}>
                      <Button size="small" startIcon={<AddRoundedIcon />} onClick={addProductionChain}>
                        New
                      </Button>
                      <Button
                        size="small"
                        startIcon={<ContentCopyRoundedIcon />}
                        disabled={!selectedProductionChain}
                        onClick={duplicateSelectedProductionChain}
                      >
                        Copy
                      </Button>
                    </Stack>
                  }
                >
                  <Stack spacing={2}>
                    {config.productionChains.length ? (
                      <FormControl size="small" fullWidth>
                        <InputLabel>Chain</InputLabel>
                        <Select
                          label="Chain"
                          value={selectedProductionChain?.id ?? ''}
                          onChange={(event) => patchConfig({ selectedProductionChainId: event.target.value })}
                        >
                          {config.productionChains.map((chain) => (
                            <MenuItem key={chain.id} value={chain.id}>
                              {chain.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : (
                      <Alert severity="info">No production chains yet.</Alert>
                    )}

                    {selectedProductionChain ? (
                      <>
                        <TextFieldEditor
                          label="Chain name"
                          value={selectedProductionChain.name}
                          onChange={(name) => updateSelectedProductionChain({ name })}
                        />
                        <IconButton
                          color="error"
                          size="small"
                          disabled={config.productionChains.length <= 1}
                          onClick={deleteSelectedProductionChain}
                        >
                          <DeleteRoundedIcon fontSize="small" />
                        </IconButton>
                      </>
                    ) : null}
                  </Stack>
                </Panel>

                <Panel
                  title={selectedProductionChain ? `Steps: ${selectedProductionChain.name}` : 'Steps'}
                  icon={<AccountTreeRoundedIcon />}
                  action={
                    <Button
                      size="small"
                      startIcon={<AddRoundedIcon />}
                      disabled={!selectedProductionChain || !config.goods.length}
                      onClick={addProductionStep}
                    >
                      Add step
                    </Button>
                  }
                >
                  {selectedProductionChain ? (
                    <Stack spacing={2}>
                      {selectedProductionChain.steps.map((step, index) => {
                        const inputGoods = step.inputs.map((input) => getGood(config, input.goodId));
                        const outputGoods = step.outputs.map((output) => getGood(config, output.goodId));
                        const inputGoodIds = new Set(step.inputs.map((input) => input.goodId));
                        const producedGoods = step.outputs
                          .filter((output) => !inputGoodIds.has(output.goodId))
                          .map((output) => getGood(config, output.goodId));
                        const inputLevelNames = Array.from(new Set(inputGoods.map((good) => getGoodLevelName(config, good.level))));
                        const outputLevelNames = Array.from(new Set(outputGoods.map((good) => getGoodLevelName(config, good.level))));
                        const highestInputLevel = Math.max(...inputGoods.map((good) => good.level));
                        const lowestProducedLevel = Math.min(...producedGoods.map((good) => good.level));
                        const isHigherLevel = inputGoods.length > 0 && producedGoods.length > 0 && lowestProducedLevel > highestInputLevel;
                        return (
                          <Box
                            key={step.id}
                            sx={{
                              border: '1px solid var(--line)',
                              borderRadius: 1,
                              p: 1.5,
                              bgcolor: 'rgba(237, 247, 242, 0.03)',
                            }}
                          >
                            <Stack spacing={2}>
                              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                                <Stack direction="row" spacing={1} alignItems="center" minWidth={0} sx={{ flexWrap: 'wrap' }}>
                                  <Typography variant="subtitle2">Step {index + 1}</Typography>
                                  <Chip
                                    size="small"
                                    label={`${inputLevelNames.join(', ') || 'None'} -> ${outputLevelNames.join(', ') || 'None'}`}
                                  />
                                  {isHigherLevel ? null : <Chip size="small" color="warning" label="Not higher" />}
                                </Stack>
                                <IconButton color="error" size="small" onClick={() => deleteProductionStep(index)}>
                                  <DeleteRoundedIcon fontSize="small" />
                                </IconButton>
                              </Stack>

                              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2, minWidth: 0 }}>
                                <Stack spacing={1} sx={{ minWidth: 0 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    Inputs
                                  </Typography>
                                  <ProductionGoodList
                                    label="Input"
                                    config={config}
                                    entries={step.inputs}
                                    onAdd={() => addProductionInput(index)}
                                    onUpdate={(inputIndex, patch) => updateProductionInput(index, inputIndex, patch)}
                                    onDelete={(inputIndex) => deleteProductionInput(index, inputIndex)}
                                  />
                                </Stack>
                                <Stack spacing={1} sx={{ minWidth: 0 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    Outputs
                                  </Typography>
                                  <ProductionGoodList
                                    label="Output"
                                    config={config}
                                    entries={step.outputs}
                                    onAdd={() => addProductionOutput(index)}
                                    onUpdate={(outputIndex, patch) => updateProductionOutput(index, outputIndex, patch)}
                                    onDelete={(outputIndex) => deleteProductionOutput(index, outputIndex)}
                                  />
                                </Stack>
                              </Box>

                              <TextFieldEditor
                                label="Note"
                                value={step.note}
                                onChange={(note) => updateProductionStep(index, { note })}
                              />
                              <Box sx={{ maxWidth: 180 }}>
                                <NumberField
                                  label="Duration, min"
                                  value={step.durationMinutes}
                                  min={0}
                                  step={15}
                                  onChange={(durationMinutes) => updateProductionStep(index, { durationMinutes })}
                                />
                              </Box>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Checkbox
                                  checked={step.preservesInputs}
                                  onChange={(event) => updateProductionStep(index, { preservesInputs: event.target.checked })}
                                  size="small"
                                />
                                <Typography variant="body2" color="text.secondary">
                                  Preserves inputs
                                </Typography>
                              </Stack>
                            </Stack>
                          </Box>
                        );
                      })}
                    </Stack>
                  ) : (
                    <Alert severity="info">Create a production chain to add conversion steps.</Alert>
                  )}
                </Panel>
              </Box>
            </Stack>
  );
};
