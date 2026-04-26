export const roleRemoteMiner: RoleHandler = {
    run(creep: Creep): void {
        const targetRoom = creep.memory.targetRoom;
        if (!targetRoom) {
            creep.say('❓ No Target');
            return;
        }

        // 1. Move to Target Room
        if (creep.room.name !== targetRoom) {
            creep.moveTo(new RoomPosition(25, 25, targetRoom), { range: 10, visualizePathStyle: { stroke: '#ffaa00' } });
            creep.say('🚀 Traveling');
            return;
        }

        // 2. Find Source
        // Use sourceIndex from memory to distinguish between multiple sources in the room
        const sources = creep.room.find(FIND_SOURCES);
        const sourceIndex = creep.memory.sourceIndex || 0;
        const source = sources[sourceIndex] || sources[0];

        if (!source) return;

        // 3. Find/Build Container
        const container = source.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 1, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        })[0];

        // 4. Mining Logic
        if (container) {
            // Stand on container for stationary mining
            if (!creep.pos.isEqualTo(container.pos)) {
                creep.moveTo(container, { range: 0, visualizePathStyle: { stroke: '#ffaa00' } });
            } else {
                creep.harvest(source);
                // If container needs repair, and we have energy (from mining)
                if (container.hits < container.hitsMax * 0.8 && creep.store[RESOURCE_ENERGY] > 0) {
                    creep.repair(container);
                }
            }
        } else {
            // No container? Harvest and check for construction site
            const site = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            })[0];

            if (site) {
                if (creep.store.getFreeCapacity() === 0) {
                    creep.build(site);
                    creep.say('🔨 Building');
                } else {
                    creep.harvest(source);
                }
                if (!creep.pos.isNearTo(site)) {
                    creep.moveTo(site);
                }
            } else {
                // Just harvest and drop on ground
                if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            }
        }
    }
};
