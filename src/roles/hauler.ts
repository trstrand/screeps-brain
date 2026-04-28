import { COLONY_SETTINGS } from '../config/settings';


export const roleHauler: RoleHandler = {
    run(creep: Creep): void {
        // --- 0. ROOM LOCK & BORDER SAFETY ---
        const homeRoom = creep.memory.homeRoom;
        if (homeRoom && creep.room.name !== homeRoom) {
            creep.moveTo(new RoomPosition(25, 25, homeRoom), {
                visualizePathStyle: { stroke: '#ffffff' }
            });
            creep.say('🏠 Home');
            return;
        }

        if (creep.pos.x === 0 || creep.pos.x === 49 || creep.pos.y === 0 || creep.pos.y === 49) {
            creep.moveTo(new RoomPosition(25, 25, creep.room.name));
            creep.say('🚧 Edge Fix');
            return;
        }

        // --- 0. JUNK MANAGEMENT ---
        const junkResource = Object.keys(creep.store).find(r => r !== RESOURCE_ENERGY) as ResourceConstant | undefined;
        if (junkResource && creep.store[junkResource] > 0) {
            const storage = creep.room.storage;
            if (storage) {
                if (creep.transfer(storage, junkResource) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(storage, { visualizePathStyle: { stroke: '#ff0000' } });
                }
                creep.say('🗑️ Junk');
                return;
            }
        }

        // --- 1. STATE MACHINE ---
        if (creep.memory.working && creep.store.getUsedCapacity() === 0) {
            creep.memory.working = false;
            delete creep.memory.targetId;
            creep.say('🔄 Loading');
        }

        if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
            delete creep.memory.targetId;
            creep.say('📦 Deposit');
        }

        // --- 2. DELIVERY PHASE ---
        if (creep.memory.working) {
            let target: any = null;

            if (creep.memory.deliveryTargetId) {
                target = Game.getObjectById(creep.memory.deliveryTargetId as Id<any>);

                // Drop fixation if target is full
                const isFull = target && 'store' in target && target.store.getFreeCapacity(RESOURCE_ENERGY) === 0;

                // Drop fixation if we are targeting a secondary structure but SPAWNS/EXTENSIONS need energy
                const isSecondaryTarget = target && (target.structureType === STRUCTURE_TOWER || target.structureType === STRUCTURE_LINK || target.structureType === STRUCTURE_STORAGE);
                const spawnsNeedEnergy = isSecondaryTarget && this.roomSpawnsNeedEnergy(creep.room);

                if (!target || isFull || spawnsNeedEnergy) {
                    target = null;
                    delete creep.memory.deliveryTargetId;
                }
            }

            // 1. Spawns and Extensions
            if (!target && creep.room.energyAvailable < creep.room.energyCapacityAvailable) {
                target = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
                    filter: s => (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) &&
                        s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                });
            }

            // 2. Towers < 50%
            if (!target) {
                target = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_TOWER &&
                        s.store.getUsedCapacity(RESOURCE_ENERGY) < s.store.getCapacity(RESOURCE_ENERGY) * 0.5
                });
            }

            // 3. Link Logic
            if (!target && creep.room.memory.storageLink) {
                const storageLink = Game.getObjectById(creep.room.memory.storageLink as Id<StructureLink>);
                const hasSourceLink = !!creep.room.memory.sourceLink1 || !!creep.room.memory.sourceLink2;

                if (storageLink) {
                    if (hasSourceLink) {
                        if (storageLink.store.getUsedCapacity(RESOURCE_ENERGY) > storageLink.store.getCapacity(RESOURCE_ENERGY) * 0.1) {
                            if (creep.room.storage && creep.room.storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                                target = creep.room.storage;
                            }
                        }
                    } else if (creep.room.memory.controllerLink) {
                        if (storageLink.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                            target = storageLink;
                        }
                    }
                }
            }

            // 4. Fill towers to 100%
            if (!target) {
                target = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_TOWER &&
                        s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                });
            }

            // 5. Room Storage Fallback
            if (!target && creep.room.storage && creep.room.storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                target = creep.room.storage;
            }

            if (target) {
                creep.memory.deliveryTargetId = target.id;
                if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' }, reusePath: 5 });
                }
            } else {
                const parkTarget = creep.pos.findClosestByRange(FIND_MY_SPAWNS);
                if (parkTarget && creep.pos.getRangeTo(parkTarget) > 5) {
                    creep.moveTo(parkTarget, { range: 5, visualizePathStyle: { stroke: '#ffffff' } });
                }
                creep.say('💤 Idle');
            }
        }

        // --- 3. COLLECTION PHASE ---
        else {
            let target: any = null;

            // Cache heavy queries once per tick for the collection phase
            const allDrops = creep.room.find(FIND_DROPPED_RESOURCES);
            const allTombstones = creep.room.find(FIND_TOMBSTONES);
            
            const sourceIds = creep.room.memory.sourceIds || [];
            let activeSources = sourceIds.map(id => Game.getObjectById(id as Id<Source>)).filter(s => s !== null) as Source[];
            if (activeSources.length === 0) activeSources = creep.room.find(FIND_SOURCES);
            const isNearSource = (pos: RoomPosition) => activeSources.some(s => pos.inRangeTo(s, 2));

            if (creep.memory.targetId) {
                target = Game.getObjectById(creep.memory.targetId as Id<any>);
                const isValid = target && (('store' in target && target.store.getUsedCapacity(RESOURCE_ENERGY) > 0) || ('amount' in target && target.amount > 0));
                if (!isValid) {
                    target = null;
                    delete creep.memory.targetId;
                }
            }

            if (!target) {
                // Priority 1: Tombstones and dropped energy near Spawns
                const spawns = creep.room.find(FIND_MY_SPAWNS);
                const nearbyDrops: any[] = [];
                for (const spawn of spawns) {
                    nearbyDrops.push(...allDrops.filter(r => r.resourceType === RESOURCE_ENERGY && r.amount > 0 && r.pos.inRangeTo(spawn, 3)));
                    nearbyDrops.push(...allTombstones.filter(t => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0 && t.creep.my && t.pos.inRangeTo(spawn, 3)));
                }
                if (nearbyDrops.length > 0) {
                    target = creep.pos.findClosestByRange(nearbyDrops);
                }

                // Priority 2: Dropped energy near sources (Massive Overflow)
                if (!target) {
                    const drops = allDrops.filter(r => r.resourceType === RESOURCE_ENERGY && r.amount > 50 && isNearSource(r.pos));
                    if (drops.length > 0) {
                        target = creep.pos.findClosestByRange(drops);
                    }
                }

                // Priority 3: storageLink siphoning (Link -> Storage)
                if (!target && creep.room.memory.storageLink) {
                    const storageLink = Game.getObjectById(creep.room.memory.storageLink as Id<StructureLink>);
                    const hasSourceLink = !!creep.room.memory.sourceLink1 || !!creep.room.memory.sourceLink2;

                    if (storageLink && hasSourceLink && storageLink.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                        target = storageLink;
                    }
                }

                // Priority 4: Containers near sources
                if (!target) {
                    const containers = creep.room.find(FIND_STRUCTURES, {
                        filter: s => s.structureType === STRUCTURE_CONTAINER && s.store.getUsedCapacity(RESOURCE_ENERGY) > 0 && isNearSource(s.pos)
                    }) as StructureContainer[];
                    if (containers.length > 0) {
                        target = containers.sort((a, b) => b.store.getUsedCapacity(RESOURCE_ENERGY) - a.store.getUsedCapacity(RESOURCE_ENERGY))[0];
                    }
                }

                // Priority 4.5: Dismantle Mining Containers
                if (!target && creep.room.memory.dismantleMiningTarget) {
                    const dismantleTarget = Game.getObjectById(creep.room.memory.dismantleMiningTarget as Id<Structure>);
                    if (dismantleTarget) {
                        const dismantleContainers = creep.room.find(FIND_STRUCTURES, {
                            filter: s => s.structureType === STRUCTURE_CONTAINER && s.store.getUsedCapacity(RESOURCE_ENERGY) >= 150 && s.pos.inRangeTo(dismantleTarget, 2)
                        }) as StructureContainer[];
                        if (dismantleContainers.length > 0) {
                            target = dismantleContainers.sort((a, b) => b.store.getUsedCapacity(RESOURCE_ENERGY) - a.store.getUsedCapacity(RESOURCE_ENERGY))[0];
                        }
                    }
                }

                // Priority 5: General room.storage fallback
                // ONLY pull from storage if we actually have a destination that needs it (Spawns/Extensions/Towers)
                if (!target && creep.room.storage && creep.room.storage.store[RESOURCE_ENERGY] > 0) {
                    if (!this.shuttleCheck(creep.room)) {
                        target = creep.room.storage;
                    }
                }

                // Priority 5.5: Feed Link Network from Storage (Storage -> Link -> Controller)
                if (!target && creep.room.storage && creep.room.storage.store[RESOURCE_ENERGY] > 0 && creep.room.memory.storageLink) {
                    const storageLink = Game.getObjectById(creep.room.memory.storageLink as Id<StructureLink>);
                    const hasSourceLink = !!creep.room.memory.sourceLink1 || !!creep.room.memory.sourceLink2;
                    const linkNeedsEnergy = !hasSourceLink && creep.room.memory.controllerLink && storageLink && storageLink.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                    
                    if (linkNeedsEnergy) {
                        target = creep.room.storage;
                    }
                }

                // Priority 6: Other random tombstones map-wide (Only MY tombstones)
                if (!target) {
                    const otherTombstones = allTombstones.filter(t => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0 && t.creep.my);
                    if (otherTombstones.length > 0) {
                        target = creep.pos.findClosestByRange(otherTombstones);
                    }
                }

                if (target) {
                    creep.memory.targetId = target.id;
                }
            }

            if (target) {
                if (creep.pos.getRangeTo(target) > 1) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' }, reusePath: 10 });
                } else {
                    // Local area clear logic
                    const localDropped = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, { filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 0 })[0];
                    const localTombstone = creep.pos.findInRange(FIND_TOMBSTONES, 1, { filter: t => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0 })[0];

                    let actionResult: number = ERR_NOT_IN_RANGE;
                    if (localDropped) {
                        actionResult = creep.pickup(localDropped);
                    } else if (localTombstone) {
                        actionResult = creep.withdraw(localTombstone, RESOURCE_ENERGY);
                    } else if ('store' in target) {
                        actionResult = creep.withdraw(target, RESOURCE_ENERGY);
                    } else if ('amount' in target) {
                        actionResult = creep.pickup(target);
                    }

                    if (actionResult === OK && !localDropped && !localTombstone) {
                        const isSourceContainer = target.structureType === STRUCTURE_CONTAINER && isNearSource(target.pos);
                        const isStorage = target.structureType === STRUCTURE_STORAGE;
                        const isStorageLink = target.structureType === STRUCTURE_LINK && target.id === creep.room.memory.storageLink;
                        const isSourceDrop = target.resourceType === RESOURCE_ENERGY && isNearSource(target.pos);

                        if (isSourceContainer || isStorage || isStorageLink) {
                            creep.memory.working = true;
                            delete creep.memory.targetId;
                        }

                        if (isSourceDrop) {
                            delete creep.memory.targetId;
                        }
                    }
                }
            } else {
                const parkTarget = creep.pos.findClosestByRange(FIND_MY_SPAWNS);
                if (parkTarget && creep.pos.getRangeTo(parkTarget) > 5) {
                    creep.moveTo(parkTarget, { range: 5, visualizePathStyle: { stroke: '#ffaa00' } });
                }
                creep.say('💤 Idle');
            }
        }
    },

    /**
     * Helper to check if conditions are met to start link shuttling
     * Rule: Spawns/Extensions are full AND Towers are at least 50%
     */
    shuttleCheck(room: Room): boolean {
        if (room.energyAvailable < room.energyCapacityAvailable) return false;

        const towersLow = room.find(FIND_MY_STRUCTURES, {
            filter: (s) => s.structureType === STRUCTURE_TOWER &&
                s.store.getUsedCapacity(RESOURCE_ENERGY) < (s.store.getCapacity(RESOURCE_ENERGY) * 0.5)
        }).length > 0;

        return !towersLow;
    },

    /**
     * Specific check for Spawns and Extensions
     */
    roomSpawnsNeedEnergy(room: Room): boolean {
        return room.energyAvailable < room.energyCapacityAvailable;
    }
};