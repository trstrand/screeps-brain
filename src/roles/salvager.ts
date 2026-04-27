export const roleSalvager: RoleHandler = {
    run(creep: Creep): void {
        // 1. STATE MACHINE
        if (creep.ticksToLive && creep.ticksToLive < 100 && creep.memory.working) {
            creep.memory.working = false;
            creep.say('💀 EOL');
        }

        if (creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = false;
            creep.say('📦 Storing');
        }
        if (!creep.memory.working && creep.store.getUsedCapacity() === 0) {
            if (creep.ticksToLive && creep.ticksToLive < 100) {
                creep.memory.recycle = true;
                return;
            }
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

            // --- TARGET FIXATION ---
            let target = Game.getObjectById(creep.memory.targetId as Id<any>);
            if (target) {
                const hasResources = ('store' in target) ? target.store.getUsedCapacity() > 50 : 
                                   ('amount' in target) ? target.amount > 50 : false;
                if (!hasResources) {
                    delete creep.memory.targetId;
                    target = null;
                }
            }

            if (!target) {
                // FIND TARGETS WITH PRIORITY
                // 1. Dropped Resources
                const dropped = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
                    filter: (r) => r.amount > 50
                });

                // 2. Tombstones
                const tombstone = !dropped ? creep.pos.findClosestByRange(FIND_TOMBSTONES, { filter: (t) => t.store.getUsedCapacity() > 50 }) : null;

                // 3. Ruins
                const ruin = (!dropped && !tombstone) ? creep.pos.findClosestByRange(FIND_RUINS, { filter: (r) => r.store.getUsedCapacity() > 50 }) : null;

                // 4. Hostile/Leftover Structures
                let hostileStore: AnyStoreStructure | null = null;
                if (!dropped && !tombstone && !ruin) {
                    const hostileStructures = creep.room.find(FIND_STRUCTURES, {
                        filter: (s) => {
                            const type = s.structureType;
                            if (type === STRUCTURE_STORAGE || type === STRUCTURE_TERMINAL || type === STRUCTURE_FACTORY) {
                                return !s.my && s.store.getUsedCapacity() > 0;
                            }
                            if (type === STRUCTURE_CONTAINER) {
                                const isMyRoom = creep.room.controller && creep.room.controller.my;
                                return !isMyRoom && creep.room.name !== creep.memory.homeRoom && s.store.getUsedCapacity() > 0;
                            }
                            return false;
                        }
                    }) as AnyStoreStructure[];
                    hostileStore = hostileStructures[0] || null;
                }

                target = dropped || tombstone || ruin || hostileStore;
                if (target) creep.memory.targetId = target.id;
            }

            if (target) {
                if (creep.pos.getRangeTo(target) > 1) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ff0000' }, reusePath: 5 });
                } else {
                    // --- INTERACTION ---
                    // Priority: Dropped energy at feet first
                    const droppedNearby = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, {
                        filter: (r) => r.resourceType === RESOURCE_ENERGY && r.amount > 0
                    })[0];

                    if (droppedNearby) {
                        creep.pickup(droppedNearby);
                    } else if (target instanceof Resource) {
                        creep.pickup(target);
                    } else if ('store' in target) {
                        for (const res in (target as any).store) {
                            if ((target as any).store[res as ResourceConstant] > 0) {
                                creep.withdraw(target as AnyStoreStructure, res as ResourceConstant);
                                break;
                            }
                        }
                    }

                    // --- POST-INTERACTION: Move on if area is empty ---
                    if (creep.store.getUsedCapacity() > 0) {
                        const moreNearby = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 5, { filter: r => r.amount > 50 }).length > 0 ||
                                         ('store' in target && target.store.getUsedCapacity() > 50);
                        
                        if (!moreNearby) {
                            delete creep.memory.targetId;
                            // Re-evaluate or go deposit if no big targets nearby
                            const nextTarget = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, { filter: r => r.amount > 100 && creep.pos.getRangeTo(r) > 5 });
                            if (!nextTarget) {
                                creep.memory.working = false;
                                creep.say('📦 Enough');
                            }
                        }
                    }
                }
            } else {
                // Room is clean!
                if (creep.store.getUsedCapacity() > 0) {
                    creep.memory.working = false;
                } else {
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