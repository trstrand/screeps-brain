export const roleRemoteHauler: RoleHandler = {
    run(creep: Creep): void {
        // 1. STATE MACHINE
        if (creep.memory.working && creep.store.getUsedCapacity() === 0) {
            creep.memory.working = false;
            creep.say('🔄 Fetch');
        }
        if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
            creep.say('🚚 Home');
        }

        // 1.5 ANTI-BORDER BOUNCE: Move off exit tiles immediately
        if (creep.pos.x === 0 || creep.pos.x === 49 || creep.pos.y === 0 || creep.pos.y === 49) {
            creep.moveTo(new RoomPosition(25, 25, creep.room.name), { visualizePathStyle: { stroke: '#ffaa00' } });
            return;
        }

        // 2. DELIVERY PHASE (Return to home room)
        if (creep.memory.working) {
            const homeRoom = creep.memory.homeRoom;
            if (homeRoom && creep.room.name !== homeRoom) {
                creep.moveTo(new RoomPosition(25, 25, homeRoom), { visualizePathStyle: { stroke: '#ffffff' } });
                return;
            } else {
                const storage = creep.room.storage;
                if (storage) {
                    // Transfer ALL resource types in the store
                    for (const resourceType in creep.store) {
                        if (creep.store[resourceType as ResourceConstant] > 0) {
                            if (creep.transfer(storage, resourceType as ResourceConstant) === ERR_NOT_IN_RANGE) {
                                creep.moveTo(storage, { visualizePathStyle: { stroke: '#ffffff' } });
                            }
                            return;
                        }
                    }
                } else {
                    creep.say('❓ No Store');
                }
            }
        } 
        
        // 3. COLLECTION PHASE (Go to remote room)
        else {
            const targetRoom = creep.memory.targetRoom;
            if (!targetRoom) return;

            if (creep.room.name !== targetRoom) {
                creep.moveTo(new RoomPosition(25, 25, targetRoom), { range: 10, visualizePathStyle: { stroke: '#ffaa00' } });
                return;
            } else {
                // Priority 1: Pick up ANY dropped resources (prevent decay)
                const dropped = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
                    filter: r => r.amount > 50
                });

                if (dropped) {
                    if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(dropped, { visualizePathStyle: { stroke: '#ffaa00' } });
                    }
                    return;
                }

                // Priority 2: Pull from Containers (Remote Miner's output)
                const container = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_CONTAINER && (s as StructureContainer).store.getUsedCapacity() > 100
                }) as StructureContainer | null;

                if (container) {
                    // Withdraw ANY resource type found in the container
                    for (const resourceType in container.store) {
                        if (container.store[resourceType as ResourceConstant] > 0) {
                            if (creep.withdraw(container, resourceType as ResourceConstant) === ERR_NOT_IN_RANGE) {
                                creep.moveTo(container, { visualizePathStyle: { stroke: '#ffaa00' } });
                            }
                            return;
                        }
                    }
                } else {
                    // If we have ANY energy and there's nothing left to pick up, go home
                    if (creep.store.getUsedCapacity() > 0) {
                        creep.memory.working = true;
                        creep.say('🚚 Home (Part)');
                    } else {
                        creep.say('⌛ Waiting');
                    }
                }
            }
        }
    }
};
