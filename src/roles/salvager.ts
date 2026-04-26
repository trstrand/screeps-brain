export const roleSalvager: RoleHandler = {
    run(creep: Creep): void {
        // 1. STATE MACHINE
        if (creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = false;
            creep.say('📦 Storing');
        }
        if (!creep.memory.working && creep.store.getUsedCapacity() === 0) {
            creep.memory.working = true;
            creep.say('🔍 Salvage');
        }

        // 2. SALVAGE PHASE
        if (creep.memory.working) {
            const targetRoom = creep.memory.targetRoom || creep.memory.homeRoom;

            // Move to the designated target room if we aren't there
            if (targetRoom && creep.room.name !== targetRoom) {
                creep.moveTo(new RoomPosition(25, 25, targetRoom), { range: 10, visualizePathStyle: { stroke: '#ff0000' } });
                return;
            }

            // FIND TARGETS WITH PRIORITY
            // 1. Dropped Resources
            const dropped = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES);

            // 2. Tombstones
            const tombstone = !dropped ? creep.pos.findClosestByRange(FIND_TOMBSTONES, { filter: (t) => t.store.getUsedCapacity() > 0 }) : null;

            // 3. Ruins
            const ruin = (!dropped && !tombstone) ? creep.pos.findClosestByRange(FIND_RUINS, { filter: (r) => r.store.getUsedCapacity() > 0 }) : null;

            // 4. Hostile/Leftover Structures (Storage, Terminal, Factory, Containers)
            let hostileStore: AnyStoreStructure | null = null;
            if (!dropped && !tombstone && !ruin) {
                const hostileStructures = creep.room.find(FIND_STRUCTURES, {
                    filter: (s) => {
                        const type = s.structureType;
                        // Owned structures
                        if (type === STRUCTURE_STORAGE || type === STRUCTURE_TERMINAL || type === STRUCTURE_FACTORY) {
                            return !s.my && s.store.getUsedCapacity() > 0;
                        }
                        // Neutral structures (Containers) - Only loot if NOT in home room AND room is not owned
                        if (type === STRUCTURE_CONTAINER) {
                            const isMyRoom = creep.room.controller && creep.room.controller.my;
                            return !isMyRoom && creep.room.name !== creep.memory.homeRoom && s.store.getUsedCapacity() > 0;
                        }
                        return false;
                    }
                }) as AnyStoreStructure[];
                hostileStore = hostileStructures[0] || null;
            }

            const target = dropped || tombstone || ruin || hostileStore;

            if (target) {
                if (creep.pos.getRangeTo(target) > 1) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ff0000' }, reusePath: 5 });
                } else {
                    if (dropped && creep.pos.isNearTo(dropped)) {
                        creep.pickup(dropped);
                    }
                    else if ('store' in target) {
                        // Withdraw any resource found in the store
                        for (const res in (target as any).store) {
                            if ((target as any).store[res] > 0) {
                                creep.withdraw(target as AnyStoreStructure, res as ResourceConstant);
                                break;
                            }
                        }
                    }
                }
            } else {
                // Room is clean! If we have anything, go deposit it.
                if (creep.store.getUsedCapacity() > 0) {
                    creep.memory.working = false;
                } else {
                    // Nothing to do and empty.
                    const spawn = creep.pos.findClosestByRange(FIND_MY_SPAWNS);
                    if (spawn) {
                        if (spawn.recycleCreep(creep) === ERR_NOT_IN_RANGE) {
                            creep.moveTo(spawn);
                        }
                    } else {
                        creep.memory.recycle = true;
                    }
                }
            }
        }

        // 3. DEPOSIT PHASE
        else {
            // First, try to find a storage in the CURRENT room that belongs to me
            const currentStorage = creep.room.storage;

            if (currentStorage && currentStorage.my) {
                // We have a storage in this room! Deposit here.
                for (const res in creep.store) {
                    if (creep.store[res as ResourceConstant] > 0) {
                        if (creep.transfer(currentStorage, res as ResourceConstant) === ERR_NOT_IN_RANGE) {
                            creep.moveTo(currentStorage, { visualizePathStyle: { stroke: '#ffffff' } });
                        }
                        return;
                    }
                }
            } else {
                // No storage in this room, head back to Home Room
                const homeRoom = creep.memory.homeRoom;
                if (homeRoom && creep.room.name !== homeRoom) {
                    creep.moveTo(new RoomPosition(25, 25, homeRoom), { range: 10, visualizePathStyle: { stroke: '#ffffff' } });
                } else {
                    // We are in the home room but there is no storage structure?
                    creep.say('❓ No Store');
                }
            }
        }
    }
};