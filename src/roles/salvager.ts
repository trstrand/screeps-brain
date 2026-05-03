export const roleSalvager: RoleHandler = {
    run(creep: Creep): void {
        // 0. LIFECYCLE MANAGEMENT
        if (!creep.memory.tripStartTick) {
            creep.memory.tripStartTick = Game.time;
        }

        // 1. STATE MACHINE
        if (creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = false;
            creep.say('📦 Storing');
        }
        
        if (!creep.memory.working && creep.store.getUsedCapacity() === 0) {
            // Completion of a full trip
            if (creep.memory.tripStartTick) {
                const tripDuration = Game.time - creep.memory.tripStartTick;
                creep.memory.fullTripTicks = Math.max(creep.memory.fullTripTicks || 0, tripDuration);
            }

            // Lifecycle check: Can we survive another trip + 100 ticks for searching?
            if (creep.ticksToLive && creep.memory.fullTripTicks && creep.ticksToLive < creep.memory.fullTripTicks + 100) {
                creep.memory.recycle = true;
                creep.say('💀 Retire');
                return;
            }

            creep.memory.working = true;
            creep.memory.tripStartTick = Game.time;
            creep.say('🔍 Salvage');
        }

        const salvageContainers = creep.memory.salvageContainers ?? false;
        const salvageEnergy = creep.memory.salvageEnergy ?? false;

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
                const hasResources = ('store' in target) ? (
                    salvageEnergy ? target.store.getUsedCapacity() > 0 : (target.store.getUsedCapacity() - target.store.getUsedCapacity(RESOURCE_ENERGY) > 0)
                ) : ('amount' in target) ? target.amount > 0 : false;
                
                if (!hasResources) {
                    delete creep.memory.targetId;
                    target = null;
                }
            }

            if (!target) {
                // FIND TARGETS WITH NEW PRIORITY
                // 1. Dropped Resources, Tombstones, Ruins
                target = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
                    filter: (r: Resource) => {
                        const isNearSource = r.pos.findInRange(FIND_SOURCES, 2).length > 0;
                        return isNearSource ? r.amount > 400 : r.amount > 50;
                    }
                }) || creep.pos.findClosestByRange(FIND_TOMBSTONES, { 
                    filter: (t: Tombstone) => t.store.getUsedCapacity() > 100 
                }) || creep.pos.findClosestByRange(FIND_RUINS, { 
                    filter: (r: Ruin) => r.store.getUsedCapacity() > 100 
                });

                // 2. Containers (if enabled)
                if (!target && salvageContainers) {
                    const containers = creep.room.find(FIND_STRUCTURES, {
                        filter: (s) => s.structureType === STRUCTURE_CONTAINER && s.store.getUsedCapacity() > 0
                    }) as StructureContainer[];
                    
                    if (containers.length > 0) {
                        // Prioritize those NOT within 2 spaces of source or controller
                        const priorityContainers = containers.filter(c => {
                            const nearSource = c.pos.findInRange(FIND_SOURCES, 2).length > 0;
                            const nearController = creep.room.controller && c.pos.findInRange([creep.room.controller], 2).length > 0;
                            return !nearSource && !nearController;
                        });
                        
                        target = priorityContainers.length > 0 ? creep.pos.findClosestByRange(priorityContainers) : creep.pos.findClosestByRange(containers);
                    }
                }

                // 3. Enemy Structures (Terminal then Storage)
                if (!target) {
                    const findEnemyStore = (type: STRUCTURE_TERMINAL | STRUCTURE_STORAGE) => {
                        return creep.room.find(FIND_HOSTILE_STRUCTURES, {
                            filter: (s) => s.structureType === type && (
                                salvageEnergy ? s.store.getUsedCapacity() > 0 : (s.store.getUsedCapacity() - s.store.getUsedCapacity(RESOURCE_ENERGY) > 0)
                            )
                        })[0] as AnyStoreStructure;
                    };

                    target = findEnemyStore(STRUCTURE_TERMINAL) || findEnemyStore(STRUCTURE_STORAGE);
                }

                if (target) creep.memory.targetId = target.id;
            }

            if (target) {
                if (creep.pos.getRangeTo(target) > 1) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ff0000' }, reusePath: 5 });
                } else {
                    // --- INTERACTION ---
                    if (target instanceof Resource) {
                        creep.pickup(target);
                    } else if ('store' in target) {
                        // Resource Priority: Power -> Specials -> Energy (if allowed)
                        let resToWithdraw: ResourceConstant | undefined;
                        
                        if (target.store.getUsedCapacity(RESOURCE_POWER) > 0) {
                            resToWithdraw = RESOURCE_POWER;
                        } else {
                            const specials = Object.keys(target.store).filter(r => r !== RESOURCE_ENERGY && r !== RESOURCE_POWER && target.store[r as ResourceConstant] > 0) as ResourceConstant[];
                            if (specials.length > 0) {
                                resToWithdraw = specials[0];
                            } else if (salvageEnergy && target.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                                resToWithdraw = RESOURCE_ENERGY;
                            }
                        }

                        if (resToWithdraw) {
                            creep.withdraw(target as AnyStoreStructure, resToWithdraw);
                        } else {
                            // Target is actually empty of what we want
                            delete creep.memory.targetId;
                        }
                    }

                    // --- POST-INTERACTION: Move on if area is empty ---
                    if (creep.store.getUsedCapacity() > 0) {
                        const moreNearby = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 5, { 
                            filter: (r: Resource) => r.amount > 100
                        }).length > 0 || (
                            'store' in target && target.store.getUsedCapacity() > 100
                        );
                        
                        if (!moreNearby) {
                            delete creep.memory.targetId;
                            // Go deposit if no easy targets nearby
                            creep.memory.working = false;
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