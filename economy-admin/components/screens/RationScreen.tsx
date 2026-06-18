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

export const RationScreen = () => {
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
            <Stack spacing={2.5}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(6, 1fr)' }, gap: 2 }}>
                <Metric label={`Protein for ${ration.target.name}`} value={`${formatNumber(ration.protein)} / ${ration.target.protein}`} ratio={ration.proteinRatio} />
                <Metric label={`Energy for ${ration.target.name}`} value={`${formatNumber(ration.energy)} / ${ration.target.energy}`} ratio={ration.energyRatio} />
                <Metric label={`Water for ${ration.target.name}`} value={`${formatNumber(ration.water)} / ${ration.target.water}`} ratio={ration.waterRatio} />
                <Metric label={`Weight, lbs for ${ration.target.name}`} value={`${formatNumber(ration.weightLbs)} / ${ration.target.weightLbs}`} ratio={ration.weightRatio} />
                <Metric label={`Taste for ${ration.target.name}`} value={`${formatNumber(ration.taste, 0)} / ${ration.target.taste}`} ratio={ration.tasteRatio} />
                <Metric label="Cost" value={formatNumber(ration.cost)} />
              </Box>
              {ration.hasValuableProteins ? null : (
                <Alert severity="warning">Ration has no valuable proteins. Long-term use should cause deficiency diseases.</Alert>
              )}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1fr 1fr' }, gap: 2.5 }}>
                <Panel
                  title="Saved Rations"
                  icon={<RestaurantRoundedIcon />}
                  action={
                    <Stack direction="row" spacing={1}>
                      <Button size="small" startIcon={<AddRoundedIcon />} onClick={addRationTemplate}>
                        New
                      </Button>
                      <Button size="small" startIcon={<ContentCopyRoundedIcon />} onClick={duplicateRationTemplate}>
                        Copy
                      </Button>
                      <IconButton color="error" size="small" disabled={config.rationTemplates.length <= 1} onClick={deleteSelectedRationTemplate}>
                        <DeleteRoundedIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  }
                >
                  <Stack spacing={2}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Load ration</InputLabel>
                        <Select
                          label="Load ration"
                          value={config.selectedRationTemplateId}
                          onChange={(event) => patchConfig({ selectedRationTemplateId: event.target.value })}
                        >
                          {config.rationTemplates.map((template) => (
                            <MenuItem key={template.id} value={template.id}>
                              {template.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextFieldEditor label="Ration name" value={selectedTemplate.name} onChange={(name) => updateSelectedRationTemplate({ name })} />
                      <FormControl size="small" fullWidth>
                        <InputLabel>Consumer</InputLabel>
                        <Select
                          label="Consumer"
                          value={selectedTemplate.consumerId}
                          onChange={(event) => updateSelectedRationTemplate({ consumerId: event.target.value })}
                        >
                          {config.consumers.map((consumer) => (
                            <MenuItem key={consumer.id} value={consumer.id}>
                              {consumer.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Button
                        startIcon={<AddRoundedIcon />}
                        onClick={() =>
                          updateSelectedRationTemplate({
                            items: [
                              ...selectedTemplate.items,
                              { id: `ration-${Date.now()}`, goodId: edibleGoods[0]?.id ?? '', quantity: 1 },
                            ],
                          })
                        }
                        disabled={!edibleGoods.length}
                      >
                        Add ration row
                      </Button>
                      <Button variant="contained" startIcon={<CalculateRoundedIcon />} onClick={solveSelectedRation}>
                        Solve Ration
                      </Button>
                    </Box>
                    <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell>Good</TableCell>
                        <TableCell>Quantity</TableCell>
                        <TableCell align="right">Protein</TableCell>
                        <TableCell align="right">Energy</TableCell>
                        <TableCell align="right">Water</TableCell>
                        <TableCell align="right">Weight</TableCell>
                        <TableCell align="right">Cost</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ration.lines.map((line, index) => {
                        const goodsForType = edibleGoods.filter((good) => good.goodType === line.good.goodType);
                        return (
                        <TableRow key={line.item.id}>
                          <TableCell>
                            <FormControl size="small" fullWidth>
                              <InputLabel>Type</InputLabel>
                              <Select
                                label="Type"
                                value={line.good.goodType}
                                onChange={(event) => {
                                  const nextGoodType = event.target.value;
                                  const nextGood = edibleGoods.find((good) => good.goodType === nextGoodType);
                                  if (!nextGood) return;
                                  updateSelectedRationTemplate({
                                    items: updateArrayItem(selectedTemplate.items, index, { goodId: nextGood.id }),
                                  });
                                }}
                              >
                                {line.profile.edible ? null : (
                                  <MenuItem key={line.good.goodType} value={line.good.goodType} disabled>
                                    {line.good.goodType}
                                  </MenuItem>
                                )}
                                {edibleGoodTypes.map((goodType) => (
                                  <MenuItem key={goodType} value={goodType}>
                                    {goodType}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell>
                            <FormControl size="small" fullWidth>
                              <Select
                                value={line.item.goodId}
                                onChange={(event) =>
                                  updateSelectedRationTemplate({
                                    items: updateArrayItem(selectedTemplate.items, index, { goodId: event.target.value }),
                                  })
                                }
                              >
                                {line.profile.edible ? null : (
                                  <MenuItem key={line.good.id} value={line.good.id} disabled>
                                    {line.good.name}
                                  </MenuItem>
                                )}
                                {goodsForType.map((good) => (
                                  <MenuItem key={good.id} value={good.id}>
                                    {good.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell>
                            <NumberField
                              label="Qty"
                              value={line.item.quantity}
                              min={0}
                              step={1}
                              onChange={(quantity) =>
                                updateSelectedRationTemplate({ items: updateArrayItem(selectedTemplate.items, index, { quantity }) })
                              }
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="flex-end" sx={{ minWidth: 68 }}>
                              <Box component="span" sx={{ minWidth: 24, textAlign: 'right' }}>
                                {formatNumber(line.protein)}
                              </Box>
                              {line.profile.valuableProteins ? (
                                <Chip size="small" color="success" label="VP" sx={{ height: 20, minWidth: 32, '& .MuiChip-label': { px: 0.75 } }} />
                              ) : (
                                <Box component="span" sx={{ width: 32, height: 20, flexShrink: 0 }} />
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell align="right">{formatNumber(line.energy)}</TableCell>
                          <TableCell align="right">{formatNumber(line.water)}</TableCell>
                          <TableCell align="right">{formatNumber(line.weightLbs)}</TableCell>
                          <TableCell align="right">{formatNumber(line.cost)}</TableCell>
                          <TableCell>
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => updateSelectedRationTemplate({ items: removeArrayItem(selectedTemplate.items, index) })}
                            >
                              <DeleteRoundedIcon fontSize="small" />
                              </IconButton>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                    </Table>
                  </Stack>
                </Panel>

              </Box>
            </Stack>
  );
};
