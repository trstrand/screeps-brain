import { roleDefender } from './defender';
import { roleMiner } from './miner';
import { roleDismantleMiner } from './dismantleMiner';
import { roleExtractorMiner } from './extractorMiner';
import { roleHauler } from './hauler';
import { roleUpgradeHauler } from './upgradeHauler';
import { roleUpgrader } from './upgrader';
import { roleBuilder } from './builder';
import { roleRepairer } from './repairer';
import { roleSalvager } from './salvager';
import { roleTransferHauler } from './transferHauler';
import { roleRemoteMiner } from './remoteMiner';
import { roleRemoteHauler } from './remoteHauler';
import { roleRemoteExtractorMiner } from './remoteExtractorMiner';
import { rolePioneer } from './pioneer';
import { roleExpedition } from './expedition';
import { roleVanguard } from './vanguard';
import { roleBreaker } from './breaker';
import { roleRemoteBuilder } from './remoteBuilder';
import { roleRemoteRepairer } from './remoteRepairer';
import { roleClaimer } from './claimer';

export const RoleRegistry: Record<string, RoleHandler> = {
    'defender': roleDefender,
    'miner': roleMiner,
    'dismantleMiner': roleDismantleMiner,
    'extractorMiner': roleExtractorMiner,
    'hauler': roleHauler,
    'upgradeHauler': roleUpgradeHauler,
    'upgrader': roleUpgrader,
    'builder': roleBuilder,
    'repairer': roleRepairer,
    'salvager': roleSalvager,
    'transferHauler': roleTransferHauler,
    'remoteMiner': roleRemoteMiner,
    'remoteHauler': roleRemoteHauler,
    'remoteExtractorMiner': roleRemoteExtractorMiner,
    'pioneer': rolePioneer,
    'expedition': roleExpedition,
    'vanguard': roleVanguard,
    'breaker': roleBreaker,
    'remoteBuilder': roleRemoteBuilder,
    'remoteRepairer': roleRemoteRepairer,
    'claimer': roleClaimer
};
