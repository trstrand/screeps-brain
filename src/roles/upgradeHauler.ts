export const roleUpgradeHauler: RoleHandler = {
    run(creep: Creep): void {
        // --- PRE-LOAD CACHE ---
        const allDrops = creep.room.find(FIND_DROPPED_RESOURCES);
        const allTombstones = creep.room.find(FIND_TOMBSTONES);

        // 1. STATE MACHINE
        if (creep.memory.working && creep.store.getUsedCapacity() === 0) {
            creep.memory.working = false;
            delete creep.memory.targetId;
            creep.say('🔄 Loading');
        }
        if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
            delete creep.memory.targetId;
            creep.say('📦 Deliver');
        }

        // 2. DELIVERY PHASE
        if (creep.memory.working) {
            const mineralType = Object.keys(creep.store).find((r: string) => r !== RESOURCE_ENERGY) as ResourceConstant;

            // IF CARRYING MINERALS: Deliver to Storage
            if (mineralType) {
                const storage = creep.room.storage;
                if (storage) {
                    if (creep.transfer(storage, mineralType) === ERR_NOT_IN_RANGE) {
                        // --- VACUUM LOGIC ---
                        if (creep.store.getFreeCapacity() > 0) {
                            const vacDrop = creep.pos.findInRange(allDrops, 1, { filter: (r: Resource) => r.resourceType === RESOURCE_ENERGY && r.amount > 0 })[0];
                            const vacTomb = creep.pos.findInRange(allTombstones, 1, { filter: (t: Tombstone) => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0 })[0];
                            if (vacDrop) creep.pickup(vacDrop);
                            else if (vacTomb) creep.withdraw(vacTomb, RESOURCE_ENERGY);
                        }
                        creep.moveTo(storage, { visualizePathStyle: { stroke: '#ffffff' } });
                    }
                } else {
                    creep.say('❓ No Store');
                }
                return;
            }

            // IF CARRYING ENERGY: Deliver to Controller Containers (WAIT AND FILL)
            const controller = creep.room.controller;
            if (!controller) return;

            // Find the single container near the controller (range 1)
            const targetContainer = controller.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: (s) => s.structureType === STRUCTURE_CONTAINER
            })[0] as StructureContainer | undefined;

            if (targetContainer) {
                if (targetContainer.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                    if (creep.pos.isNearTo(targetContainer)) {
                        creep.transfer(targetContainer, RESOURCE_ENERGY);
                        creep.say('📥 Filling');
                    } else {
                        // --- VACUUM LOGIC ---
                        if (creep.store.getFreeCapacity() > 0) {
                            const vacDrop = creep.pos.findInRange(allDrops, 1, { filter: (r: Resource) => r.resourceType === RESOURCE_ENERGY && r.amount > 0 })[0];
                            const vacTomb = creep.pos.findInRange(allTombstones, 1, { filter: (t: Tombstone) => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0 })[0];
                            if (vacDrop) creep.pickup(vacDrop);
                            else if (vacTomb) creep.withdraw(vacTomb, RESOURCE_ENERGY);
                        }
                        creep.moveTo(targetContainer, { visualizePathStyle: { stroke: '#ffffff' }, reusePath: 5 });
                    }
                } else {
                    // Container is full, park next to it
                    if (creep.pos.isNearTo(targetContainer)) {
                        creep.say('⌛ Waiting');
                    } else {
                        creep.moveTo(targetContainer, { range: 1, visualizePathStyle: { stroke: '#ffffff' } });
                    }
                }
            } else {
                if (creep.pos.getRangeTo(controller) > 5) {
                    creep.moveTo(controller, { range: 5, visualizePathStyle: { stroke: '#ffffff' } });
                } else {
                    creep.say('⌛ No Cont');
                }
            }
        }

        // 3. FETCH PHASE (Commit to one resource type)
        else {
            let target: any = null;
            const hasEnergy = creep.store[RESOURCE_ENERGY] > 0;
            const hasMinerals = Object.keys(creep.store).some((r: string) => r !== RESOURCE_ENERGY && creep.store[r as ResourceConstant] > 0);

            // Target Fixation
            if (creep.memory.targetId) {
                target = Game.getObjectById(creep.memory.targetId as Id<any>);
                let isValidTarget = false;

                if (target) {
                    if ('store' in target) {
                        const targetEnergy = target.store[RESOURCE_ENERGY] || 0;
                        const hasAnyMinerals = Object.keys(target.store).some((r: string) => r !== RESOURCE_ENERGY && target.store[r as ResourceConstant] > 0);
                        isValidTarget = targetEnergy > 50 || hasAnyMinerals;
                    } else if ('amount' in target) {
                        if (target.resourceType === RESOURCE_ENERGY) {
                            isValidTarget = target.amount > 50;
                        } else {
                            isValidTarget = target.amount > 0;
                        }
                    }
                }

                if (!isValidTarget) {
                    delete creep.memory.targetId;
                    target = null;
                }
            }

            if (!target) {
                // Priority A: Minerals (Only if extractor and storage exist)
                if (!hasEnergy) {
                    const extractor = creep.room.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_EXTRACTOR } })[0];
                    const storage = creep.room.storage;

                    if (extractor && storage) {
                        const mineralCandidates: (Resource | StructureContainer | Tombstone | Ruin)[] = [
                            ...creep.room.find(FIND_DROPPED_RESOURCES, {
                                filter: (r: Resource) => r.resourceType !== RESOURCE_ENERGY &&
                                    r.pos.inRangeTo(extractor, 1)
                            }),
                            ...creep.room.find(FIND_STRUCTURES, {
                                filter: (s: StructureContainer) => s.structureType === STRUCTURE_CONTAINER &&
                                    s.pos.inRangeTo(extractor, 1) &&
                                    Object.keys(s.store).some((r: string) => r !== RESOURCE_ENERGY && s.store[r as ResourceConstant] > 0)
                            }) as StructureContainer[],
                            ...creep.room.find(FIND_TOMBSTONES, {
                                filter: (t: Tombstone) => t.pos.inRangeTo(extractor, 1) &&
                                    Object.keys(t.store).some((r: string) => r !== RESOURCE_ENERGY && t.store[r as ResourceConstant] > 0)
                            }),
                            ...creep.room.find(FIND_RUINS, {
                                filter: (r: Ruin) => r.pos.inRangeTo(extractor, 1) &&
                                    Object.keys(r.store).some((res: string) => res !== RESOURCE_ENERGY && r.store[res as ResourceConstant] > 0)
                            })
                        ];
                        target = creep.pos.findClosestByRange(mineralCandidates);
                    }
                }

                // Priority B: Energy (Only if not already carrying minerals)
                if (!target && !hasMinerals) {
                    const energySources = [
                        ...creep.room.find(FIND_DROPPED_RESOURCES, {
                            filter: (r: Resource) => r.resourceType === RESOURCE_ENERGY && r.amount > 50
                        }),
                        ...creep.room.find(FIND_TOMBSTONES, {
                            filter: (t: Tombstone) => t.store[RESOURCE_ENERGY] > 50
                        }),
                        ...creep.room.find(FIND_RUINS, {
                            filter: (r: Ruin) => r.store[RESOURCE_ENERGY] > 50
                        }),
                        ...creep.room.find(FIND_STRUCTURES, {
                            filter: (s) => {
                                // Storage is always a valid source if it has energy
                                if (s.structureType === STRUCTURE_STORAGE) {
                                    return s.store[RESOURCE_ENERGY] > 0;
                                }
                                // Containers are valid if they have energy and AREN'T the controller container
                                if (s.structureType === STRUCTURE_CONTAINER) {
                                    const isControllerContainer = creep.room.controller && s.pos.inRangeTo(creep.room.controller, 1);
                                    const isSourceContainer = s.pos.findInRange(FIND_SOURCES, 2).length > 0;

                                    return s.store[RESOURCE_ENERGY] > 100 && (isSourceContainer || !isControllerContainer);
                                }
                                return false;
                            }
                        }) as (StructureStorage | StructureContainer)[]
                    ];

                    target = creep.pos.findClosestByRange(energySources);
                }

                if (target) {
                    creep.memory.targetId = target.id;
                }
            }

            if (target) {
                if (creep.pos.isNearTo(target)) {
                    // 1. Priority: Pick up dropped energy at our feet or adjacent (overflow)
                    const droppedNearby = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, {
                        filter: (r: Resource) => r.resourceType === RESOURCE_ENERGY && r.amount > 0
                    })[0];

                    if (droppedNearby) {
                        creep.pickup(droppedNearby);
                    } else if ('store' in target) {
                        // 2. Withdraw from target structure
                        const extractor = creep.room.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_EXTRACTOR } })[0];
                        const storage = creep.room.storage;

                        // Only withdraw minerals if we have the infrastructure to handle them
                        const canHandleMinerals = extractor && storage;
                        const resourceToWithdraw = canHandleMinerals
                            ? (Object.keys(target.store).find((r: string) => target.store[r as ResourceConstant] > 0) as ResourceConstant || RESOURCE_ENERGY)
                            : RESOURCE_ENERGY;

                        creep.withdraw(target, resourceToWithdraw);
                    } else if ('amount' in target) {
                        // 3. Target was already a dropped resource
                        creep.pickup(target);
                    }

                    // 4. Post-Interaction: If we have energy and nothing else is nearby, go deliver
                    if (creep.store[RESOURCE_ENERGY] > 0) {
                        const hasMoreEnergyNearby = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 5, {
                            filter: (r: Resource) => r.resourceType === RESOURCE_ENERGY && r.amount > 50
                        }).length > 0 || (
                                'store' in target && target.store[RESOURCE_ENERGY] > 100
                            );

                        const isMostlyFull = creep.store.getUsedCapacity() >= creep.store.getCapacity() * 0.8;

                        if (!hasMoreEnergyNearby || isMostlyFull) {
                            creep.memory.working = true;
                            delete creep.memory.targetId;
                            creep.say('📦 Deliver');
                        }
                    }
                } else {
                    // If moving to storage, check for dropped energy within range 5 of storage first
                    if ('structureType' in target && target.structureType === STRUCTURE_STORAGE) {
                        const droppedNearStorage = target.pos.findInRange(FIND_DROPPED_RESOURCES, 5, {
                            filter: (r: Resource) => r.resourceType === RESOURCE_ENERGY && r.amount > 20
                        })[0];

                    if (droppedNearStorage) {
                        creep.moveTo(droppedNearStorage, { visualizePathStyle: { stroke: '#ffaa00' } });
                        return;
                    }
                }

                // --- VACUUM LOGIC (FETCH) ---
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
                }
            } else {
                // IF NO TARGET FOUND: If we have ANY resources, go deliver them
                if (creep.store.getUsedCapacity() > 0) {
                    creep.memory.working = true;
                    delete creep.memory.targetId;
                    creep.say('📦 Deliver');
                } else {
                    creep.say('🚫 No Work');
                }
            }
        }
    }
};