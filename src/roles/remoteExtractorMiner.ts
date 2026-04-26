export const roleRemoteExtractorMiner: RoleHandler = {
    run(creep: Creep): void {
        const targetRoom = creep.memory.targetRoom;
        if (!targetRoom) {
            creep.say('❓ No Target');
            return;
        }

        // 1. Move to Target Room
        if (creep.room.name !== targetRoom) {
            creep.moveTo(new RoomPosition(25, 25, targetRoom), { range: 10, visualizePathStyle: { stroke: '#00ffff' } });
            creep.say('🚀 Traveling');
            return;
        }

        // 2. Find Mineral and Extractor
        const mineral = creep.room.find(FIND_MINERALS)[0];
        if (!mineral) {
            creep.say('❓ No Mineral');
            return;
        }

        const extractor = mineral.pos.lookFor(LOOK_STRUCTURES).find(s => s.structureType === STRUCTURE_EXTRACTOR) as StructureExtractor;
        
        if (!extractor) {
            creep.say('⚒️ No Extr');
            return;
        }

        // 3. Find nearby Container
        const container = mineral.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 1, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        })[0];

        // 4. Mining Logic
        if (container) {
            // Stand on container
            if (!creep.pos.isEqualTo(container.pos)) {
                creep.moveTo(container, { range: 0, visualizePathStyle: { stroke: '#00ffff' } });
            } else {
                if (extractor.cooldown === 0) {
                    creep.harvest(mineral);
                }
                // Repair container if needed
                if (container.hits < container.hitsMax * 0.8 && creep.store.getUsedCapacity() > 0) {
                    const mineralType = Object.keys(creep.store)[0] as ResourceConstant;
                    // Note: Repairing with minerals works in Screeps? No, you need ENERGY to repair.
                    // However, remote mineral miners usually don't have energy.
                    // We'll leave repair to a dedicated repairer or just let it decay/be rebuilt.
                }
            }
        } else {
            // No container? Harvest and drop
            if (extractor.cooldown === 0) {
                if (creep.harvest(mineral) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(mineral, { visualizePathStyle: { stroke: '#00ffff' } });
                }
            } else {
                if (!creep.pos.isNearTo(mineral)) {
                    creep.moveTo(mineral);
                }
            }
        }
    }
};
