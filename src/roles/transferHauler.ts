export const roleTransferHauler: RoleHandler = {
    run(creep: Creep): void {
        const sourceRoom = creep.memory.sourceRoom;
        const destRoom = creep.memory.destinationRoom;
        const resourceType = creep.memory.transferResource || RESOURCE_ENERGY;

        if (!sourceRoom || !destRoom) {
            creep.say('No Config');
            return;
        }

        // 1. STATE MACHINE
        // If we are "working" (delivering), we switch to "fetching" if empty
        if (creep.memory.working && creep.store.getUsedCapacity() === 0) {
            creep.memory.working = false;
            creep.say('🔄 Fetch');
        }
        // If we are "fetching", we switch to "working" if we have the resource and are full
        // OR if we have the resource and the source room storage is empty (so we don't just sit there)
        if (!creep.memory.working && creep.store.getUsedCapacity(resourceType) > 0 && 
            (creep.store.getFreeCapacity() === 0 || (creep.room.name === sourceRoom && creep.room.storage && creep.room.storage.store.getUsedCapacity(resourceType) === 0))) {
            creep.memory.working = true;
            creep.say('🚚 Transfer');
        }

        // 2. DELIVERY PHASE (Go to destination room)
        if (creep.memory.working) {
            if (creep.room.name !== destRoom) {
                creep.moveTo(new RoomPosition(25, 25, destRoom), { 
                    visualizePathStyle: { stroke: '#ffffff' },
                    reusePath: 50 
                });
            } else {
                const storage = creep.room.storage;
                if (storage) {
                    if (creep.transfer(storage, resourceType) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(storage, { visualizePathStyle: { stroke: '#ffffff' } });
                    }
                } else {
                    creep.say('❓ No Store');
                }
            }
        } 
        
        // 3. COLLECTION PHASE (Go to source room)
        else {
            if (creep.room.name !== sourceRoom) {
                creep.moveTo(new RoomPosition(25, 25, sourceRoom), { 
                    visualizePathStyle: { stroke: '#ffaa00' },
                    reusePath: 50 
                });
            } else {
                const storage = creep.room.storage;
                if (storage) {
                    // Check if we have any "junk" resources that aren't what we're supposed to be carrying
                    const wrongResource = Object.keys(creep.store).find(r => r !== resourceType) as ResourceConstant | undefined;
                    if (wrongResource && creep.store[wrongResource] > 0) {
                        if (creep.transfer(storage, wrongResource) === ERR_NOT_IN_RANGE) {
                            creep.moveTo(storage);
                        }
                        return;
                    }

                    if (storage.store.getUsedCapacity(resourceType) > 0) {
                        if (creep.withdraw(storage, resourceType) === ERR_NOT_IN_RANGE) {
                            creep.moveTo(storage, { visualizePathStyle: { stroke: '#ffaa00' } });
                        }
                    } else {
                        creep.say('⌛ Waiting');
                    }
                } else {
                    creep.say('❓ No Store');
                }
            }
        }
    }
};
