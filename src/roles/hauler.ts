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

        // --- PRE-LOAD CACHE ---
        const allDrops = creep.room.find(FIND_DROPPED_RESOURCES);
        const allTombstones = creep.room.find(FIND_TOMBSTONES);
        const allContainers = creep.room.find(FIND_STRUCTURES, { filter: s => s.structureType === STRUCTURE_CONTAINER }) as StructureContainer[];
        const mySpawns = creep.room.find(FIND_MY_SPAWNS);

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
                    // --- VACUUM LOGIC (DELIVERY) ---
                    if (creep.store.getFreeCapacity() > 0) {
                        const vacDrop = creep.pos.findInRange(allDrops, 1, { filter: (r: Resource) => r.resourceType === RESOURCE_ENERGY && r.amount > 0 })[0];
                        const vacTomb = creep.pos.findInRange(allTombstones, 1, { filter: (t: Tombstone) => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0 })[0];
                        if (vacDrop) creep.pickup(vacDrop);
                        else if (vacTomb) creep.withdraw(vacTomb, RESOURCE_ENERGY);
                    }
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' }, reusePath: 5 });
                }
            } else {
                const parkTarget = creep.pos.findClosestByRange(mySpawns);
                if (parkTarget && creep.pos.getRangeTo(parkTarget) > 5) {
                    creep.moveTo(parkTarget, { range: 5, visualizePathStyle: { stroke: '#ffffff' } });
                }
                creep.say('💤 Idle');
            }
        }

        // --- 3. COLLECTION PHASE ---
        else {
            let target: any = null;

            const sourceIds = creep.room.memory.sourceIds || [];
            let activeSources = sourceIds.map(id => Game.getObjectById(id as Id<Source>)).filter(s => s !== null) as Source[];
            if (activeSources.length === 0) activeSources = creep.room.find(FIND_SOURCES);
            const isNearSource = (pos: RoomPosition) => activeSources.some(s => pos.inRangeTo(s, 2));

            if (creep.memory.targetId) {
                target = Game.getObjectById(creep.memory.targetId as Id<any>);

                // 1. Check if target still has energy
                const hasEnergy = target && (
                    ('store' in target && target.store.getUsedCapacity(RESOURCE_ENERGY) > 25) ||
                    ('amount' in target && target.amount > 0)
                );

                // 2. Check if a Priority 1 target appeared while we are chasing something else
                // (Only pre-empt if our current target is NOT already Priority 1)
                const p1Targets = [
                    ...allDrops.filter(r => r.resourceType === RESOURCE_ENERGY && r.amount >= 50 && mySpawns.some(s => r.pos.inRangeTo(s, 3))),
                    ...allTombstones.filter(t => t.store.getUsedCapacity(RESOURCE_ENERGY) >= 50 && t.creep.my && mySpawns.some(s => t.pos.inRangeTo(s, 3)))
                ];

                const currentTargetIsP1 = target && mySpawns.some(s => target.pos.inRangeTo(s, 3));
                const targetIsHub = target && (target.structureType === STRUCTURE_STORAGE || target.structureType === STRUCTURE_LINK);
                const shouldPreempt = p1Targets.length > 0 && !currentTargetIsP1 && !targetIsHub;

                if (!hasEnergy || shouldPreempt) {
                    target = null;
                    delete creep.memory.targetId;
                    creep.say('🔄 Reroute');
                }
            }

            if (!target) {
                // PROXIMITY OVERRIDE: If partially full, grab the nearest valid target to fill up quickly
                if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                    const proximityTargets: any[] = [];
                    const spawns = creep.room.find(FIND_MY_SPAWNS);

                    for (const spawn of spawns) {
                        proximityTargets.push(...allDrops.filter(r => r.resourceType === RESOURCE_ENERGY && r.amount >= 50 && r.pos.inRangeTo(spawn, 3)));
                        proximityTargets.push(...allTombstones.filter(t => t.store.getUsedCapacity(RESOURCE_ENERGY) >= 50 && t.creep.my && t.pos.inRangeTo(spawn, 3)));
                    }

                    proximityTargets.push(...allDrops.filter(r => r.resourceType === RESOURCE_ENERGY && r.amount > 50 && isNearSource(r.pos)));
                    proximityTargets.push(...allContainers.filter(s => s.store.getUsedCapacity(RESOURCE_ENERGY) > 150 && isNearSource(s.pos)));

                    if (creep.room.memory.storageLink) {
                        const storageLink = Game.getObjectById(creep.room.memory.storageLink as Id<StructureLink>);
                        const hasSourceLink = !!creep.room.memory.sourceLink1 || !!creep.room.memory.sourceLink2;
                        if (storageLink && hasSourceLink && storageLink.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                            proximityTargets.push(storageLink);
                        }
                    }

                    if (creep.room.memory.dismantleMiningTarget) {
                        const dismantleTarget = Game.getObjectById(creep.room.memory.dismantleMiningTarget as Id<Structure>);
                        if (dismantleTarget) {
                            proximityTargets.push(...allContainers.filter(s => s.store.getUsedCapacity(RESOURCE_ENERGY) >= 150 && s.pos.inRangeTo(dismantleTarget, 2)));
                        }
                    }

                    if (proximityTargets.length > 0) {
                        target = creep.pos.findClosestByRange(proximityTargets);
                    }
                }
            }

            // STRICT PRIORITIES: Used if empty, or if proximity override found nothing
            if (!target) {
                // Priority 0.5: Proactive Base Hub Check (Links)
                // If in the base area, handle Link siphoning/feeding before walking away
                if (creep.room.storage && creep.pos.inRangeTo(creep.room.storage, 5)) {
                    if (creep.room.memory.storageLink) {
                        const storageLink = Game.getObjectById(creep.room.memory.storageLink as Id<StructureLink>);
                        const hasSourceLink = !!creep.room.memory.sourceLink1 || !!creep.room.memory.sourceLink2;

                        if (storageLink) {
                            // A: Siphon (Link -> Storage)
                            if (hasSourceLink && storageLink.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                                target = storageLink;
                            }
                            // B: Feed (Storage -> Link)
                            else if (!hasSourceLink && creep.room.memory.controllerLink && storageLink.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                                if (this.shuttleCheck(creep.room) && creep.room.storage.store[RESOURCE_ENERGY] > 0) {
                                    target = creep.room.storage;
                                }
                            }
                        }
                    }
                }

                // Priority 1: Tombstones and dropped energy near Spawns
                const nearbyDrops: any[] = [];
                for (const spawn of mySpawns) {
                    nearbyDrops.push(...allDrops.filter(r => r.resourceType === RESOURCE_ENERGY && r.amount >= 50 && r.pos.inRangeTo(spawn, 3)));
                    nearbyDrops.push(...allTombstones.filter(t => t.store.getUsedCapacity(RESOURCE_ENERGY) >= 50 && t.creep.my && t.pos.inRangeTo(spawn, 3)));
                }
                if (nearbyDrops.length > 0) {
                    target = creep.pos.findClosestByRange(nearbyDrops);
                }

                // Priority 1.5: Hub Refill (Storage -> Spawns/Extensions)
                // If near storage and base needs energy, pull from storage now
                if (!target && creep.room.storage && creep.pos.inRangeTo(creep.room.storage, 5)) {
                    if (creep.room.storage.store[RESOURCE_ENERGY] > 0 && !this.shuttleCheck(creep.room)) {
                        target = creep.room.storage;
                    }
                }

                // Priority 2: Dropped energy near sources (Massive Overflow)
                if (!target) {
                    const drops = allDrops.filter(r => r.resourceType === RESOURCE_ENERGY && r.amount > 50 && isNearSource(r.pos));
                    if (drops.length > 0) {
                        target = creep.pos.findClosestByRange(drops);
                    }
                }

                // Priority 2.5: Containers near sources
                if (!target) {
                    const containers = allContainers.filter(s => s.store.getUsedCapacity(RESOURCE_ENERGY) > 150 && isNearSource(s.pos));
                    if (containers.length > 0) {
                        target = containers.sort((a, b) => b.store.getUsedCapacity(RESOURCE_ENERGY) - a.store.getUsedCapacity(RESOURCE_ENERGY))[0];
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

                // Priority 4: Dismantle Mining Containers
                if (!target && creep.room.memory.dismantleMiningTarget) {
                    const dismantleTarget = Game.getObjectById(creep.room.memory.dismantleMiningTarget as Id<Structure>);
                    if (dismantleTarget) {
                        const dismantleContainers = allContainers.filter(s => s.store.getUsedCapacity(RESOURCE_ENERGY) >= 150 && s.pos.inRangeTo(dismantleTarget, 2));
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
                    // --- VACUUM LOGIC (COLLECTION) ---
                    if (creep.store.getFreeCapacity() > 0) {
                        const vacDrop = creep.pos.findInRange(allDrops, 1, { filter: (r: Resource) => r.resourceType === RESOURCE_ENERGY && r.amount > 0 })[0];
                        const vacTomb = creep.pos.findInRange(allTombstones, 1, { filter: (t: Tombstone) => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0 })[0];
                        
                        if (vacDrop) {
                            creep.pickup(vacDrop);
                            if (creep.store.getUsedCapacity() + vacDrop.amount >= creep.store.getCapacity()) {
                                creep.memory.working = true;
                                delete creep.memory.targetId;
                                creep.say('📦 Full!');
                            }
                        } else if (vacTomb) {
                            creep.withdraw(vacTomb, RESOURCE_ENERGY);
                            if (creep.store.getUsedCapacity() + vacTomb.store.getUsedCapacity(RESOURCE_ENERGY) >= creep.store.getCapacity()) {
                                creep.memory.working = true;
                                delete creep.memory.targetId;
                                creep.say('📦 Full!');
                            }
                        }
                    }
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' }, reusePath: 10 });
                } else {
                    // Local area clear logic - using cached arrays for efficiency
                    const localDropped = creep.pos.findInRange(allDrops, 1, { filter: (r: Resource) => r.resourceType === RESOURCE_ENERGY && r.amount > 0 })[0];
                    const localTombstone = creep.pos.findInRange(allTombstones, 1, { filter: (t: Tombstone) => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0 })[0];
                    const localContainer = creep.pos.findInRange(allContainers, 1, { filter: (s: StructureContainer) => s.store.getUsedCapacity(RESOURCE_ENERGY) > 0 })[0];

                    let actionResult: number = ERR_NOT_IN_RANGE;

                    // PRIORITY: 
                    // 1. Large drops (prevent decay/loss)
                    // 2. Tombstones (urgent)
                    // 3. Substantial containers (fill up fast)
                    // 4. Any remaining drops
                    if (localDropped && localDropped.amount > 100) {
                        actionResult = creep.pickup(localDropped);
                    } else if (localTombstone) {
                        actionResult = creep.withdraw(localTombstone, RESOURCE_ENERGY);
                    } else if (localContainer && localContainer.store.getUsedCapacity(RESOURCE_ENERGY) > 100) {
                        actionResult = creep.withdraw(localContainer, RESOURCE_ENERGY);
                    } else if (localDropped) {
                        actionResult = creep.pickup(localDropped);
                    } else if ('store' in target) {
                        actionResult = creep.withdraw(target, RESOURCE_ENERGY);
                    } else if ('amount' in target) {
                        actionResult = creep.pickup(target);
                    }

                    if (actionResult === OK && !localDropped && !localTombstone) {
                        const targetStructure = target as Structure;
                        const targetResource = target as Resource;
                        const isMostlyFull = creep.store.getUsedCapacity(RESOURCE_ENERGY) >= creep.store.getCapacity() * 0.8;
                        const isSourceContainer = targetStructure.structureType === STRUCTURE_CONTAINER && isNearSource(targetStructure.pos);
                        const isStorage = targetStructure.structureType === STRUCTURE_STORAGE;
                        const isStorageLink = targetStructure.structureType === STRUCTURE_LINK && targetStructure.id === creep.room.memory.storageLink;
                        const isSourceDrop = targetResource.resourceType === RESOURCE_ENERGY && isNearSource(targetResource.pos);

                        if (isSourceContainer || isStorage || isStorageLink) {
                            const storeStructure = targetStructure as StructureContainer;
                            if (isMostlyFull || storeStructure.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
                                creep.memory.working = true;
                                delete creep.memory.targetId;
                            }
                        }

                        if (isSourceDrop) {
                            if (isMostlyFull) {
                                creep.memory.working = true;
                            }
                            delete creep.memory.targetId;
                        }
                    }
                }
            } else {
                const isMostlyFull = creep.store.getUsedCapacity(RESOURCE_ENERGY) >= creep.store.getCapacity() * 0.8;
                const hasMinEnergy = creep.store.getUsedCapacity(RESOURCE_ENERGY) >= 50;

                if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                    // Only deliver if mostly full, or if we have at least 50 energy and the room is in critical need
                    if (isMostlyFull || (hasMinEnergy && !this.shuttleCheck(creep.room))) {
                        creep.memory.working = true;
                        creep.say('📦 Deliver');
                    } else {
                        const parkTarget = creep.pos.findClosestByRange(mySpawns);
                        if (parkTarget && creep.pos.getRangeTo(parkTarget) > 5) {
                            creep.moveTo(parkTarget, { range: 5, visualizePathStyle: { stroke: '#ffaa00' } });
                        }
                        creep.say('💤 Idle');
                        creep.say('⌛ Waiting');
                    }
                }
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