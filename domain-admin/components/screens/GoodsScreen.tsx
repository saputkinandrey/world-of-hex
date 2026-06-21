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
import { useDomainAdmin } from '../../context/DomainAdminContext';
import { formatGoodLevel, formatNumber, getGood, getGoodLevelName, getGoodProfile, removeArrayItem, updateArrayItem } from '../../lib/domain-admin-utils';

export const GoodsScreen = () => {
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
  } = useDomainAdmin();

  return (
            <Stack spacing={2.5}>
              <Panel
                title="Processing Levels"
                icon={<RuleRoundedIcon />}
                action={
                  <Button size="small" startIcon={<AddRoundedIcon />} onClick={addGoodLevel}>
                    Add level
                  </Button>
                }
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Level</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {config.goodLevels.map((goodLevel, index) => (
                      <TableRow key={`${goodLevel.level}-${index}`}>
                        <TableCell sx={{ width: 140 }}>
                          <NumberField
                            label="Level"
                            value={goodLevel.level}
                            min={0}
                            step={1}
                            onChange={(level) => updateGoodLevel(index, { level })}
                          />
                        </TableCell>
                        <TableCell>
                          <TextFieldEditor
                            label="Name"
                            value={goodLevel.name}
                            onChange={(name) => updateGoodLevel(index, { name })}
                          />
                        </TableCell>
                        <TableCell>
                          <TextFieldEditor
                            label="Description"
                            value={goodLevel.description}
                            onChange={(description) => updateGoodLevel(index, { description })}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            color="error"
                            size="small"
                            disabled={config.goodLevels.length <= 1}
                            onClick={() => deleteGoodLevel(goodLevel.level)}
                          >
                            <DeleteRoundedIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Panel>

              <Panel title="Goods" icon={<RuleRoundedIcon />}>
                <Stack spacing={2}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Good</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Level</TableCell>
                        <TableCell>Price</TableCell>
                        <TableCell>Biome</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {config.goods.map((good, index) => {
                        const goodBiomes = good.biomeIds
                          .map((biomeId) => config.biomes.find((biome) => biome.id === biomeId)?.name)
                          .filter((biomeName): biomeName is string => Boolean(biomeName));
                        return (
                          <TableRow key={good.id}>
                            <TableCell>
                              <TextFieldEditor
                                label="Good"
                                value={good.name}
                                onChange={(name) => patchConfig({ goods: updateArrayItem(config.goods, index, { name }) })}
                              />
                            </TableCell>
                            <TableCell>
                              <FormControl size="small" fullWidth>
                                <InputLabel>Type</InputLabel>
                                <Select
                                  label="Type"
                                  value={good.goodType}
                                  onChange={(event) =>
                                    patchConfig({ goods: updateArrayItem(config.goods, index, { goodType: event.target.value }) })
                                  }
                                >
                                  {config.goodTypes.map((currentGoodType) => (
                                    <MenuItem key={currentGoodType} value={currentGoodType}>
                                      {currentGoodType}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell>
                              <FormControl size="small" fullWidth>
                                <InputLabel>Level</InputLabel>
                                <Select
                                  label="Level"
                                  value={good.level}
                                  onChange={(event) => {
                                    const level = Number(event.target.value);
                                    patchConfig({
                                      goods: updateArrayItem(config.goods, index, {
                                        level,
                                        biomeIds: level === 0 ? good.biomeIds : [],
                                      }),
                                    });
                                  }}
                                >
                                  {config.goodLevels.some((goodLevel) => goodLevel.level === good.level) ? null : (
                                    <MenuItem value={good.level} disabled>
                                      {formatNumber(good.level, 0)} - Missing level
                                    </MenuItem>
                                  )}
                                  {config.goodLevels.map((goodLevel) => (
                                    <MenuItem key={`${goodLevel.level}-${goodLevel.name}`} value={goodLevel.level}>
                                      {formatGoodLevel(goodLevel)}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell>
                              <NumberField
                                label="Price"
                                value={good.price}
                                min={0}
                                step={0.1}
                                onChange={(price) => patchConfig({ goods: updateArrayItem(config.goods, index, { price }) })}
                              />
                            </TableCell>
                            <TableCell>{good.level === 0 ? (goodBiomes.length ? goodBiomes.join(', ') : 'Unassigned') : 'Not a precursor'}</TableCell>
                            <TableCell>
                              <IconButton
                                color="error"
                                size="small"
                                disabled={config.goods.length <= 1}
                                onClick={() => deleteGood(good.id)}
                              >
                                <DeleteRoundedIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <Button
                    startIcon={<AddRoundedIcon />}
                    onClick={() => {
                      const goodType = config.goodTypes[0] ?? '';
                      patchConfig({
                        goods: [
                          ...config.goods,
                          { id: `good-item-${Date.now()}`, name: `Good ${config.goods.length + 1}`, goodType, level: 0, price: 1, biomeIds: [] },
                        ],
                      });
                    }}
                  >
                    Add good
                  </Button>
                </Stack>
              </Panel>
            </Stack>
  );
};
