import { RoleRegistry } from '../roles';

export class CreepManager {
    static run() {
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            if (creep.spawning) continue;

            if (creep.memory.recycle) {
                if (creep.memory.role === 'marketHauler' && creep.store.getUsedCapacity() > 0 && creep.room.storage) {
                    const carrying = Object.keys(creep.store).find(res => creep.store[res as ResourceConstant] > 0) as ResourceConstant | undefined;
                    if (carrying) {
                        creep.say('📦 Empty');
                        if (creep.transfer(creep.room.storage, carrying) === ERR_NOT_IN_RANGE) {
                            creep.moveTo(creep.room.storage, { visualizePathStyle: { stroke: '#ffffff' } });
                        }
                        continue;
                    }
                }

                creep.say('♻️ recycle');
                const spawn = creep.pos.findClosestByRange(FIND_MY_SPAWNS);
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
