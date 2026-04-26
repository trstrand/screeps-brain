export const roleHauler: RoleHandler = {
    run(creep: Creep): void {
        // 1. STATE MACHINE
        if (creep.memory.working && creep.store.getUsedCapacity() === 0) {
            creep.memory.working = false;
            creep.say('🔄 Scavenge');
        }

        if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
            creep.say('📦 Full');
        }

        // 2. DELIVERY PHASE
        if (creep.memory.working) {
            let target: any = null;

            // Priority 1: Spawns and Extensions (Critical for life)
            target = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
                filter: (s) => (s.structureType === STRUCTURE_EXTENSION || s.structureType === STRUCTURE_SPAWN) &&
                                s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });

            // Priority 2: Towers below 50% (Immediate Defense)
            if (!target) {
                target = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
                    filter: (s) => s.structureType === STRUCTURE_TOWER && 
                                   s.store.getUsedCapacity(RESOURCE_ENERGY) < (s.store.getCapacity(RESOURCE_ENERGY) * 0.5)
                });
            }

            // Priority 3: NEW & FIXED - Controller Containers (Must be filled before storage)
            if (!target && creep.room.controller) {
                const controllerContainers = creep.room.controller.pos.findInRange(FIND_STRUCTURES, 3, {
                    filter: (s) => s.structureType === STRUCTURE_CONTAINER && 
                                   s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                });
                // Sort by the one that has the most empty space to keep them balanced
                if (controllerContainers.length > 0) {
                    target = controllerContainers.sort((a: any, b: any) => 
                        a.store.getFreeCapacity(RESOURCE_ENERGY) - b.store.getFreeCapacity(RESOURCE_ENERGY)
                    )[0];
                }
            }

            // Priority 4: Towers up to 90% (Maintenance Defense)
            if (!target) {
                target = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
                    filter: (s) => s.structureType === STRUCTURE_TOWER && 
                                   s.store.getFreeCapacity(RESOURCE_ENERGY) > 100
                });
            }

            // Priority 5: Room Storage (The last resort)
            if (!target) {
                target = (creep.room.storage && creep.room.storage.store.getFreeCapacity() > 0) ? creep.room.storage : null;
            }

            if (target) {
                if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' }, reusePath: 10 });
                }
            } else {
                creep.say('⌛ No Space');
            }
        } 

        // 3. COLLECTION PHASE
        else {
            const dropped = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
                filter: (r) => r.resourceType === RESOURCE_ENERGY && r.amount > 20
            });
            const tombstone = creep.pos.findClosestByRange(FIND_TOMBSTONES, {
                filter: (t) => t.store[RESOURCE_ENERGY] > 0
            });
            const ruin = creep.pos.findClosestByRange(FIND_RUINS, {
                filter: (r) => r.store[RESOURCE_ENERGY] > 0
            });
            const sourceContainer = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: (s) => s.structureType === STRUCTURE_CONTAINER && 
                               s.pos.findInRange(FIND_SOURCES, 2).length > 0
            }) as StructureContainer;

            const target = dropped || tombstone || ruin || sourceContainer;

            if (target) {
                if (creep.pos.getRangeTo(target) > 1) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' }, reusePath: 10 });
                } else {
                    if (dropped && creep.pos.isNearTo(dropped)) creep.pickup(dropped);
                    if (tombstone && creep.pos.isNearTo(tombstone)) creep.withdraw(tombstone, RESOURCE_ENERGY);
                    if (ruin && creep.pos.isNearTo(ruin)) creep.withdraw(ruin, RESOURCE_ENERGY);
                    if (sourceContainer && creep.pos.isNearTo(sourceContainer)) creep.withdraw(sourceContainer, RESOURCE_ENERGY);

                    const containerEnergy = sourceContainer ? sourceContainer.store[RESOURCE_ENERGY] : 0;
                    const groundClear = (!dropped || dropped.amount < 20) && 
                                        (!tombstone || tombstone.store[RESOURCE_ENERGY] === 0) &&
                                        (!ruin || ruin.store[RESOURCE_ENERGY] === 0);

                    if (containerEnergy < 50 && groundClear && creep.store.getUsedCapacity() > 0) {
                        creep.memory.working = true;
                        creep.say('📦 Thats All');
                    }
                }
            } else if (creep.store.getUsedCapacity() > 0) {
                creep.memory.working = true;
            }
        }
    }
};