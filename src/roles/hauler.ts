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
        // If we accidentally picked up minerals/junk, go dump them in storage immediately.
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
            delete creep.memory.deliveryTargetId;
            creep.say('🔄 Loading');
        }

        if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
            delete creep.memory.targetId;
            delete creep.memory.deliveryTargetId;
            creep.say('📦 Deposit');
        }

        // --- 2. DELIVERY PHASE ---
        if (creep.memory.working) {
            let target: any = null;
            if (creep.memory.deliveryTargetId) {
                target = Game.getObjectById(creep.memory.deliveryTargetId as Id<any>);
                
                // Drop fixation if target is full
                const isFull = target && target.store && target.store.getFreeCapacity(RESOURCE_ENERGY) === 0;
                
                // Drop fixation if we are targeting a TOWER but SPAWNS/EXTENSIONS need energy
                const targetIsTower = target && target.structureType === STRUCTURE_TOWER;
                const spawnsNeedEnergy = targetIsTower && this.roomSpawnsNeedEnergy(creep.room);

                if (!target || isFull || spawnsNeedEnergy) {
                    target = null;
                    delete creep.memory.deliveryTargetId;
                }
            }

            if (!target) {
                // --- LINK SHUTTLE LOGIC (Delivery) ---
                const storageLink = Game.getObjectById(creep.room.memory.storageLink as Id<StructureLink>);
                const controllerLink = Game.getObjectById(creep.room.memory.controllerLink as Id<StructureLink>);
                const sourceLink1 = Game.getObjectById(creep.room.memory.sourceLink1 as Id<StructureLink>);
                const sourceLink2 = Game.getObjectById(creep.room.memory.sourceLink2 as Id<StructureLink>);
                const hasSourceLink = !!sourceLink1 || !!sourceLink2;

                // If no source links, but we have storage/controller links, and base is full: Shuttle TO storageLink
                if (!hasSourceLink && storageLink && controllerLink && !this.roomNeedsEnergy(creep.room)) {
                    if (storageLink.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                        target = storageLink;
                        creep.memory.deliveryTargetId = target.id;
                    }
                }
            }

            if (!target) {
                // IF CARRYING ENERGY: Normal priority
                target = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
                    filter: (s) => (s.structureType === STRUCTURE_EXTENSION || s.structureType === STRUCTURE_SPAWN) &&
                        s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                });

                if (!target) {
                    target = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
                        filter: (s) => s.structureType === STRUCTURE_TOWER &&
                            s.store.getUsedCapacity(RESOURCE_ENERGY) < (s.store.getCapacity(RESOURCE_ENERGY) * 0.5)
                    });
                }

                if (!target) {
                    target = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
                        filter: (s) => s.structureType === STRUCTURE_TOWER && s.store.getFreeCapacity(RESOURCE_ENERGY) > 100
                    });
                }

                if (!target && creep.room.storage && creep.room.storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                    target = creep.room.storage;
                }
                
                if (target) creep.memory.deliveryTargetId = target.id;
            }

            if (!target) {
                const spawn = creep.room.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_SPAWN } })[0];
                if (spawn) {
                    if (creep.pos.getRangeTo(spawn) > 5) {
                        creep.moveTo(spawn, { range: 5, visualizePathStyle: { stroke: '#ffffff' } });
                    }
                    creep.say('💤 Idle (E)');
                }
            } else if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' }, reusePath: 10 });
            }
        }

        // --- 3. COLLECTION PHASE ---
        else {
            let target: any = null;

            // A. Target Fixation: Check memory
            if (creep.memory.targetId) {
                target = Game.getObjectById(creep.memory.targetId as Id<any>);
                // Validate: still exists and has energy
                const hasStore = target && 'store' in target && target.store.getUsedCapacity(RESOURCE_ENERGY) > 50;
                const hasAmount = target && 'amount' in target && target.amount > 50;
                if (!hasStore && !hasAmount) {
                    delete creep.memory.targetId;
                    target = null;
                }
            }

            // B. Check for local targets first to clear an area before leaving
            if (!target) {
                const localDropped = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, {
                    filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 0
                })[0];
                
                const localContainer = creep.pos.findInRange(FIND_STRUCTURES, 1, {
                    filter: s => s.structureType === STRUCTURE_CONTAINER && s.store.getUsedCapacity(RESOURCE_ENERGY) > 0
                })[0];
                
                const localTombstone = creep.pos.findInRange(FIND_TOMBSTONES, 1, {
                    filter: t => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0
                })[0];

                const localTerminal = creep.pos.findInRange(FIND_STRUCTURES, 1, {
                    filter: s => s.structureType === STRUCTURE_TERMINAL && !s.my && s.store.getUsedCapacity(RESOURCE_ENERGY) > 0
                })[0];

                if (localDropped) target = localDropped;
                else if (localTombstone) target = localTombstone;
                else if (localContainer) target = localContainer;
                else if (localTerminal) target = localTerminal;

                if (target) {
                    creep.memory.targetId = target.id;
                }
            }

            // C. If STILL no target, but we have some energy, go deliver it!
            // This prevents wandering to another source when partially full.
            if (!target && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                creep.memory.working = true;
                creep.say('📦 Deposit');
                return;
            }

            // D. Find New Target Globally
            if (!target) {
                // "Storage Sweep" Logic: If base is full and storage has room, be aggressive
                const storageHasSpace = creep.room.storage && creep.room.storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                const baseFull = !this.roomNeedsEnergy(creep.room);
                const shouldSweep = storageHasSpace && baseFull;

                if (creep.memory.idleTicks && creep.memory.idleTicks > 0 && !shouldSweep) {
                    creep.memory.idleTicks--;
                } else {
                    // Priority 1: Dropped energy near sources (Overflow)
                    const overflowEnergy = creep.room.find(FIND_DROPPED_RESOURCES, {
                        filter: r => r.resourceType === RESOURCE_ENERGY && 
                                     r.amount > 50 && 
                                     r.pos.findInRange(FIND_SOURCES, 2).length > 0
                    });

                    if (overflowEnergy.length > 0) {
                        target = creep.pos.findClosestByRange(overflowEnergy);
                    }

                    // Priority 2: Other candidates (Tombstones, regular dropped, containers > 150)
                    if (!target) {
                        const candidates = this.getCollectionCandidates(creep);
                        target = creep.pos.findClosestByRange(candidates);
                    }

                    // --- LINK SHUTTLE LOGIC (Collection) ---
                    const storageLink = Game.getObjectById(creep.room.memory.storageLink as Id<StructureLink>);
                    const controllerLink = Game.getObjectById(creep.room.memory.controllerLink as Id<StructureLink>);
                    const sourceLink1 = Game.getObjectById(creep.room.memory.sourceLink1 as Id<StructureLink>);
                    const sourceLink2 = Game.getObjectById(creep.room.memory.sourceLink2 as Id<StructureLink>);
                    const hasSourceLink = !!sourceLink1 || !!sourceLink2;

                    // Priority 2.5: Shuttle FROM storageLink TO storage if base is full and source links exist
                    if (!target && baseFull && hasSourceLink && storageLink && storageLink.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                        target = storageLink;
                    }

                    // Priority 3: Storage Fallback
                    if (!target && creep.room.storage && creep.room.storage.store[RESOURCE_ENERGY] > 0) {
                        const needsEnergy = !baseFull;
                        const needsLinkShuttle = baseFull && !hasSourceLink && controllerLink && storageLink && storageLink.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                        if (needsEnergy || needsLinkShuttle) target = creep.room.storage;
                    }

                    // Priority 4: Controller Container Emergency Fallback
                    // Only take from controller containers if Spawns/Extensions need energy and everything else is empty
                    if (!target && this.roomSpawnsNeedEnergy(creep.room)) {
                        target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                            filter: (s) => s.structureType === STRUCTURE_CONTAINER &&
                                s.store[RESOURCE_ENERGY] > 400 && 
                                (creep.room.controller && s.pos.inRangeTo(creep.room.controller, 4))
                        });
                        if (target) creep.say('🆘 Emerg');
                    }

                    if (target) {
                        creep.memory.targetId = target.id;
                    } else {
                        creep.memory.idleTicks = 5;
                    }
                }
            }

            if (target) {
                if (creep.pos.getRangeTo(target) > 1) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' }, reusePath: 10 });
                } else {
                    // --- MULTI-PICKUP LOGIC ---
                    
                    // A. Always check for dropped energy at our feet/nearby first
                    const droppedNearby = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, {
                        filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 0
                    })[0];

                    if (droppedNearby) {
                        creep.pickup(droppedNearby);
                    } else if ('store' in target) {
                        creep.withdraw(target, RESOURCE_ENERGY);
                    } else if ('amount' in target) {
                        creep.pickup(target);
                    }

                    // --- POST-INTERACTION: Move on if area is empty ---
                    // If we have some energy, and there is no more energy (>50) nearby, go deliver
                    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                        const moreNearby = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 5, {
                            filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 50
                        }).length > 0 || (
                            'store' in target && target.store[RESOURCE_ENERGY] > 50
                        );

                        if (!moreNearby) {
                            delete creep.memory.targetId;
                            creep.memory.working = true;
                            creep.say('📦 Enough');
                        }
                    }
                }
            } else {
                // IDLE
                const parkTarget = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: (s) => s.structureType === STRUCTURE_CONTAINER && s.pos.findInRange(FIND_SOURCES, 2).length > 0
                }) || creep.pos.findClosestByRange(FIND_SOURCES);

                if (parkTarget) {
                    if (creep.pos.getRangeTo(parkTarget) > 5) {
                        creep.moveTo(parkTarget, { range: 5, visualizePathStyle: { stroke: '#ffaa00' } });
                    }
                    creep.say('💤 Idle');
                }
            }
        }
    },

    /**
     * Helper to get all valid collection targets
     */
    getCollectionCandidates(creep: Creep): (Resource | Tombstone | StructureContainer | StructureTerminal)[] {
        return [
            ...creep.room.find(FIND_TOMBSTONES, { filter: t => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0 }),
            ...creep.room.find(FIND_DROPPED_RESOURCES, { filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 20 }),
            ...creep.room.find(FIND_STRUCTURES, {
                filter: (s) => s.structureType === STRUCTURE_CONTAINER &&
                    s.store.getUsedCapacity(RESOURCE_ENERGY) >= 150 &&
                    (!creep.room.controller || !s.pos.inRangeTo(creep.room.controller, 4))
            }) as StructureContainer[],
            ...creep.room.find(FIND_STRUCTURES, {
                filter: (s) => s.structureType === STRUCTURE_TERMINAL &&
                    !s.my && s.store.getUsedCapacity(RESOURCE_ENERGY) > 0
            }) as StructureTerminal[]
        ];
    },

    /**
     * Helper to check if room needs energy in spawns/extensions/towers
     */
    roomNeedsEnergy(room: Room): boolean {
        return room.find(FIND_MY_STRUCTURES, {
            filter: (s) => {
                if (s.structureType === STRUCTURE_EXTENSION || s.structureType === STRUCTURE_SPAWN) {
                    return s.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
                if (s.structureType === STRUCTURE_TOWER) {
                    return s.store.getUsedCapacity(RESOURCE_ENERGY) < (s.store.getCapacity(RESOURCE_ENERGY) * 0.5) ||
                           s.store.getFreeCapacity(RESOURCE_ENERGY) > 100;
                }
                return false;
            }
        }).length > 0;
    },

    /**
     * Specific check for Spawns and Extensions
     */
    roomSpawnsNeedEnergy(room: Room): boolean {
        return room.find(FIND_MY_STRUCTURES, {
            filter: (s) => (s.structureType === STRUCTURE_EXTENSION || s.structureType === STRUCTURE_SPAWN) &&
                           s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        }).length > 0;
    }
};