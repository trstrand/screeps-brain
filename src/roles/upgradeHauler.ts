export const roleUpgradeHauler: RoleHandler = {
    run(creep: Creep): void {
        // --- PRE-LOAD CACHE ---
        const allDrops = creep.room.find(FIND_DROPPED_RESOURCES);
        const allTombstones = creep.room.find(FIND_TOMBSTONES);

        // --- STUCK DETECTION ---
        if (creep.memory.targetId) {
            const lastPos = creep.memory.lastPos;
            if (lastPos && lastPos.x === creep.pos.x && lastPos.y === creep.pos.y && lastPos.roomName === creep.room.name) {
                creep.memory.stuckCount = (creep.memory.stuckCount || 0) + 1;
            } else {
                creep.memory.stuckCount = 0;
            }
            creep.memory.lastPos = { x: creep.pos.x, y: creep.pos.y, roomName: creep.room.name };

            if ((creep.memory.stuckCount || 0) > 5) {
                delete creep.memory.targetId;
                creep.memory.stuckCount = 0;
                creep.say('🔄 Stuck!');
            }
        } else {
            delete creep.memory.lastPos;
            creep.memory.stuckCount = 0;
        }

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
            // Throw away any junk minerals if somehow acquired previously
            const mineralType = Object.keys(creep.store).find((r: string) => r !== RESOURCE_ENERGY) as ResourceConstant;
            if (mineralType && creep.room.storage) {
                if (creep.transfer(creep.room.storage, mineralType) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(creep.room.storage);
                }
                return;
            }

            const controller = creep.room.controller;
            if (!controller) return;

            let target: any = null;

            // Target: Controller Container ONLY
            const targetContainer = controller.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: (s) => s.structureType === STRUCTURE_CONTAINER
            })[0] as StructureContainer | undefined;

            if (targetContainer && targetContainer.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                target = targetContainer;
            } else if (targetContainer) {
                // Park near it if full
                if (!creep.pos.isNearTo(targetContainer)) {
                    creep.moveTo(targetContainer, { range: 1, visualizePathStyle: { stroke: '#ffffff' } });
                    return;
                }
            }

            if (target) {
                if (creep.pos.isNearTo(target)) {
                    creep.transfer(target, RESOURCE_ENERGY);
                    creep.say('📥 Filling');
                } else {
                    // --- VACUUM LOGIC ---
                    if (creep.store.getFreeCapacity() > 0) {
                        const vacDrop = creep.pos.findInRange(allDrops, 1, { filter: (r: Resource) => r.resourceType === RESOURCE_ENERGY && r.amount > 0 })[0];
                        const vacTomb = creep.pos.findInRange(allTombstones, 1, { filter: (t: Tombstone) => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0 })[0];
                        if (vacDrop) creep.pickup(vacDrop);
                        else if (vacTomb) creep.withdraw(vacTomb, RESOURCE_ENERGY);
                    }
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' }, reusePath: 5 });
                }
            } else {
                if (creep.pos.getRangeTo(controller) > 5) {
                    creep.moveTo(controller, { range: 5, visualizePathStyle: { stroke: '#ffffff' } });
                } else {
                    creep.say('⌛ Waiting');
                }
            }
        }

        // 3. FETCH PHASE
        else {
            let target: any = null;

            // Target Fixation
            if (creep.memory.targetId) {
                target = Game.getObjectById(creep.memory.targetId as Id<any>);
                const hasEnergy = target && (
                    ('store' in target && target.store[RESOURCE_ENERGY] > 0) ||
                    ('amount' in target && target.amount > 0)
                );

                if (!hasEnergy) {
                    delete creep.memory.targetId;
                    target = null;
                }
            }

            if (!target) {
                // Priority 1: Hostile Terminal (Energy)
                const hostileTerminal = creep.room.find(FIND_HOSTILE_STRUCTURES, {
                    filter: (s) => s.structureType === STRUCTURE_TERMINAL && s.store[RESOURCE_ENERGY] > 0
                })[0];
                
                // Priority 2: Hostile Storage (Energy)
                const hostileStorage = !hostileTerminal ? creep.room.find(FIND_HOSTILE_STRUCTURES, {
                    filter: (s) => s.structureType === STRUCTURE_STORAGE && s.store[RESOURCE_ENERGY] > 0
                })[0] : null;

                if (hostileTerminal) {
                    target = hostileTerminal;
                } else if (hostileStorage) {
                    target = hostileStorage;
                } else {
                    // Priority 3: Energy near Spawns
                    const spawns = creep.room.find(FIND_MY_SPAWNS);
                    const nearbyLoot: any[] = [];
                    for (const spawn of spawns) {
                        nearbyLoot.push(...allDrops.filter(r => r.resourceType === RESOURCE_ENERGY && r.amount > 50 && r.pos.inRangeTo(spawn, 5)));
                        nearbyLoot.push(...allTombstones.filter(t => t.store[RESOURCE_ENERGY] > 50 && t.pos.inRangeTo(spawn, 5)));
                    }

                    if (nearbyLoot.length > 0) {
                        target = creep.pos.findClosestByRange(nearbyLoot);
                    }

                    // Priority 4: Room Storage
                    if (!target && creep.room.storage && creep.room.storage.store[RESOURCE_ENERGY] > 0) {
                        target = creep.room.storage;
                    }
                }

                if (target) {
                    creep.memory.targetId = target.id;
                }
            }

            if (target) {
                if (creep.pos.isNearTo(target)) {
                    // Pick up immediate drops first
                    const droppedNearby = creep.pos.findInRange(allDrops, 1, {
                        filter: (r: Resource) => r.resourceType === RESOURCE_ENERGY && r.amount > 0
                    })[0];

                    if (droppedNearby) {
                        creep.pickup(droppedNearby);
                    } else if ('store' in target) {
                        creep.withdraw(target, RESOURCE_ENERGY);
                    } else {
                        creep.pickup(target);
                    }

                    // Post-Interaction Delivery Check
                    if (creep.store[RESOURCE_ENERGY] >= creep.store.getCapacity() * 0.8) {
                        creep.memory.working = true;
                        delete creep.memory.targetId;
                        creep.say('📦 Deliver');
                    }
                } else {
                    // --- VACUUM LOGIC ---
                    if (creep.store.getFreeCapacity() > 0) {
                        const vacDrop = creep.pos.findInRange(allDrops, 1, { filter: (r: Resource) => r.resourceType === RESOURCE_ENERGY && r.amount > 0 })[0];
                        const vacTomb = creep.pos.findInRange(allTombstones, 1, { filter: (t: Tombstone) => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0 })[0];
                        
                        if (vacDrop) {
                            creep.pickup(vacDrop);
                            if (creep.store.getUsedCapacity() + vacDrop.amount >= creep.store.getCapacity()) {
                                creep.memory.working = true;
                                delete creep.memory.targetId;
                            }
                        } else if (vacTomb) {
                            creep.withdraw(vacTomb, RESOURCE_ENERGY);
                            if (creep.store.getUsedCapacity() + vacTomb.store.getUsedCapacity(RESOURCE_ENERGY) >= creep.store.getCapacity()) {
                                creep.memory.working = true;
                                delete creep.memory.targetId;
                            }
                        }
                    }
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' }, reusePath: 10 });
                }
            } else {
                // If we have ANY energy and no target, just go deliver
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