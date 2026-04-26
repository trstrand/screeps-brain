import { roleDefender } from '../roles/defender';
import { roleMiner } from '../roles/miner';
import { roleDismantleMiner } from '../roles/dismantleMiner';
import { roleExtractorMiner } from '../roles/extractorMiner';
import { roleHauler } from '../roles/hauler';
import { roleUpgradeHauler } from '../roles/upgradeHauler';
import { roleUpgrader } from '../roles/upgrader';
import { roleBuilder } from '../roles/builder';
import { roleRepairer } from '../roles/repairer';
import { roleSalvager } from '../roles/salvager';
import { roleTransferHauler } from '../roles/transferHauler';
import { roleRemoteMiner } from '../roles/remoteMiner';
import { roleRemoteHauler } from '../roles/remoteHauler';
import { roleRemoteExtractorMiner } from '../roles/remoteExtractorMiner';
import { rolePioneer } from '../roles/pioneer';
import { roleExpedition } from '../roles/expedition';
import { roleVanguard } from '../roles/vanguard';
import { roleBreaker } from '../roles/breaker';
import { roleRemoteBuilder } from '../roles/remoteBuilder';
import { roleClaimer } from '../roles/claimer';

const RoleRegistry: Record<string, RoleHandler> = {
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
    'claimer': roleClaimer
};

export class CreepManager {
    static run() {
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            if (creep.spawning) continue;

            if (creep.memory.recycle) {
                creep.say('♻️ recycle');
                const spawn = creep.pos.findClosestByPath(FIND_MY_SPAWNS);
                if (spawn) {
                    if (spawn.recycleCreep(creep) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(spawn, { visualizePathStyle: { stroke: '#ff0000' } });
                    } else if (spawn.recycleCreep(creep) === OK) {
                        // eslint-disable-next-line no-console
                        console.log(`♻️ Creep ${creep.name} has been recycled.`);
                    }
                }
                continue;
            }
            
            const roleHandler = RoleRegistry[creep.memory.role];
            if (roleHandler) {
                roleHandler.run(creep);
            } else {
                // eslint-disable-next-line no-console
                console.log(`Unknown role: ${creep.memory.role} on creep ${creep.name}`);
            }
        }
    }
}
