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

export const ConfigScreen = () => {
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
            <Panel
              title="JSON Config"
              icon={<ContentCopyRoundedIcon />}
              action={
                <Stack direction="row" spacing={1}>
                  <Button size="small" onClick={() => void loadConfigFromFile()}>
                    Load file
                  </Button>
                  <Button size="small" variant="contained" onClick={() => void saveConfigToFile()}>
                    Save file
                  </Button>
                  <Button size="small" startIcon={<ContentCopyRoundedIcon />} onClick={() => void copyConfig()}>
                    Copy
                  </Button>
                  <Button size="small" startIcon={<RestartAltRoundedIcon />} onClick={resetConfig}>
                    Reset
                  </Button>
                  <Button size="small" onClick={importConfigText}>
                    Apply JSON
                  </Button>
                </Stack>
              }
            >
              <Stack spacing={2}>
                {configError ? <Alert severity="error">{configError}</Alert> : null}
                {fileStatus ? <Alert severity="info">{fileStatus}</Alert> : null}
                <TextField
                  label="Config file path"
                  size="small"
                  value={configFilePathInput}
                  onChange={(event) => setConfigFilePathInput(event.target.value)}
                  fullWidth
                />
                <TextField
                  value={configText}
                  onChange={(event) => {
                    setConfigText(event.target.value);
                    setIsConfigTextDirty(true);
                  }}
                  multiline
                  minRows={24}
                  fullWidth
                  spellCheck={false}
                  inputProps={{ style: { fontFamily: 'Consolas, monospace', fontSize: 13 } }}
                />
              </Stack>
            </Panel>
  );
};
