export const roleTransferHauler: RoleHandler = {
    run(creep: Creep): void {
        const sourceRoom = creep.memory.sourceRoom;
        const destRoom = creep.memory.destinationRoom;
        const resourceType = creep.memory.transferResource || RESOURCE_ENERGY;

        if (!sourceRoom || !destRoom) {
            creep.say('No Config');
            return;
        }

        // 0. LIFECYCLE MANAGEMENT
        if (!creep.memory.tripStartTick) {
            creep.memory.tripStartTick = Game.time;
        }

        // If we know how long a trip takes, check if we can survive another one
        if (creep.ticksToLive && creep.memory.fullTripTicks) {
            // If we are currently empty and in the home room, and we won't survive a full trip, recycle.
            if (!creep.memory.working && creep.room.name === destRoom && creep.ticksToLive < creep.memory.fullTripTicks) {
                creep.memory.recycle = true;
                creep.say('💀 Retire');
            }
        }

        // 1. STATE MACHINE
        // If we are "working" (delivering), we switch to "fetching" if empty
        if (creep.memory.working && creep.store.getUsedCapacity() === 0) {
            // Completion of a full trip
            if (creep.memory.tripStartTick) {
                const tripDuration = Game.time - creep.memory.tripStartTick;
                creep.memory.fullTripTicks = Math.max(creep.memory.fullTripTicks || 0, tripDuration);
            }

            creep.memory.working = false;
            creep.memory.tripStartTick = Game.time;
            creep.say('🔄 Fetch');
        }

        // If we are "fetching", we switch to "working" if we have the resource and:
        // - We are full
        // - OR we are in the source room and the storage is empty of that resource
        if (!creep.memory.working && creep.store.getUsedCapacity(resourceType) > 0) {
            const isFull = creep.store.getFreeCapacity() === 0;
            const inSourceRoom = creep.room.name === sourceRoom;
            let sourceEmpty = false;

            if (inSourceRoom && creep.room.storage) {
                if (creep.room.storage.store.getUsedCapacity(resourceType) === 0) {
                    sourceEmpty = true;
                }
            }

            if (isFull || (inSourceRoom && sourceEmpty)) {
                creep.memory.working = true;
                creep.say('🚚 Transfer');
            }
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
                    // Check for junk (anything that isn't the target resource)
                    const junkResource = (Object.keys(creep.store) as ResourceConstant[]).find(r => r !== resourceType);
                    if (junkResource && creep.store[junkResource] > 0) {
                        if (creep.transfer(storage, junkResource) === ERR_NOT_IN_RANGE) {
                            creep.moveTo(storage);
                        }
                        return;
                    }

                    if (storage.store.getUsedCapacity(resourceType) > 0) {
                        if (creep.withdraw(storage, resourceType) === ERR_NOT_IN_RANGE) {
                            creep.moveTo(storage, { visualizePathStyle: { stroke: '#ffaa00' } });
                        }
                    } else {
                        // If we have something, go deliver it, otherwise wait
                        if (creep.store.getUsedCapacity() > 0) {
                            creep.memory.working = true;
                        } else {
                            creep.say('⌛ Waiting');
                        }
                    }
                } else {
                    creep.say('❓ No Store');
                }
            }
        }
    }
};
