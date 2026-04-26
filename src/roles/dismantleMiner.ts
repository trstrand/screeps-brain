import { COLONY_SETTINGS } from '../config.creeps';

export const roleDismantleMiner: RoleHandler = {
    run(creep: Creep): void {
        // ... (state machine lines 3-11)
        if (creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = false;
            creep.say('💤 Full');
        }
        if (!creep.memory.working && creep.store.getUsedCapacity() === 0) {
            creep.memory.working = true;
            creep.say('🔨 Mining');
        }

        // 1. Sync Config to Memory
        // Only sync from config if memory is empty, allowing for manual overrides
        if (!creep.memory.dismantleTarget) {
            const configTargetId = COLONY_SETTINGS.dismantleTargets[creep.room.name];
            if (configTargetId) {
                creep.memory.dismantleTarget = configTargetId as Id<any>;
            }
        }

        const dismantleTargetId = creep.memory.dismantleTarget;

        if (!dismantleTargetId) {
            creep.say('❓ No Target');
            return;
        }

        const target = Game.getObjectById(dismantleTargetId) as Structure | null;
        if (!target) {
            creep.memory.dismantleTarget = undefined;
            creep.say('✅ Done!');
            return;
        }

        // 2. Find the container standing next to the target
        // We look for a container within 1 range of the rampart
        const container = target.pos.findInRange(FIND_STRUCTURES, 1, {
            filter: (s: Structure): s is StructureContainer => s.structureType === STRUCTURE_CONTAINER
        })[0];

        if (container) {
            // 3. Position the creep ON TOP of the container
            if (!creep.pos.isEqualTo(container.pos)) {
                creep.moveTo(container, {
                    range: 0,
                    visualizePathStyle: { stroke: '#ff0000' }
                });
                creep.say('🚚 Moving');
            } else {
                // 4. Stand and Dismantle/Transfer

                // Repair container if it's below 95%
                if (container.hits < container.hitsMax * 0.95 && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                    creep.repair(container);
                    creep.say('🔧 Repair');
                } else {
                    // If we have energy, put it in the container
                    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                        creep.transfer(container, RESOURCE_ENERGY);
                    }

                    // If we have room in our store, keep dismantling
                    if (creep.store.getFreeCapacity() > 0) {
                        creep.dismantle(target);
                        creep.say('🔨 Mining');
                    } else {
                        creep.say('💤 Full');
                    }
                }
            }
        } else {
            // FALLBACK: If you haven't built the container yet, just stand next to it
            if (creep.dismantle(target) === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { range: 1 });
            }
            creep.say('🚧 No Can');
        }
    }
};