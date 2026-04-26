export const roleUpgradeHauler: RoleHandler = {
    run(creep: Creep): void {
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
            const mineralType = Object.keys(creep.store).find(r => r !== RESOURCE_ENERGY) as ResourceConstant;

            // IF CARRYING MINERALS: Deliver to Storage
            if (mineralType) {
                const storage = creep.room.storage;
                if (storage) {
                    if (creep.transfer(storage, mineralType) === ERR_NOT_IN_RANGE) {
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

            const targets = controller.pos.findInRange(FIND_STRUCTURES, 3, {
                filter: (s) => s.structureType === STRUCTURE_CONTAINER
            }) as StructureContainer[];

            if (targets.length > 0) {
                // Pick the emptiest one
                targets.sort((a, b) => a.store[RESOURCE_ENERGY] - b.store[RESOURCE_ENERGY]);
                const target = targets[0];

                if (creep.pos.isNearTo(target)) {
                    if (target.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                        creep.transfer(target, RESOURCE_ENERGY);
                    } else {
                        creep.say('⌛ Waiting');
                    }
                } else {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' }, reusePath: 10 });
                }
            } else {
                creep.say('⌛ No Cont');
                if (creep.pos.getRangeTo(controller) > 5) {
                    creep.moveTo(controller, { range: 5 });
                }
            }
        }

        // 3. FETCH PHASE (Commit to one resource type)
        else {
            let target: any = null;
            const hasEnergy = creep.store[RESOURCE_ENERGY] > 0;
            const hasMinerals = Object.keys(creep.store).some(r => r !== RESOURCE_ENERGY && creep.store[r as ResourceConstant] > 0);

            // Target Fixation
            if (creep.memory.targetId) {
                target = Game.getObjectById(creep.memory.targetId as Id<any>);
                const hasResources = target && (
                    ('store' in target && target.store.getUsedCapacity() > 0) || 
                    ('amount' in target && target.amount > 0)
                );
                if (!hasResources) {
                    delete creep.memory.targetId;
                    target = null;
                }
            }

            if (!target) {
                // Priority A: Minerals (Only if not already carrying energy)
                if (!hasEnergy) {
                    const mineralCandidates: (Resource | StructureContainer)[] = [
                        ...creep.room.find(FIND_DROPPED_RESOURCES, {
                            filter: r => r.resourceType !== RESOURCE_ENERGY && 
                                         r.pos.findInRange(FIND_MINERALS, 3).length > 0
                        }),
                        ...creep.room.find(FIND_STRUCTURES, {
                            filter: (s: StructureContainer) => s.structureType === STRUCTURE_CONTAINER &&
                                         s.store.getUsedCapacity() > 100 &&
                                         s.pos.findInRange(FIND_MINERALS, 3).length > 0
                        }) as StructureContainer[]
                    ];

                    target = creep.pos.findClosestByPath(mineralCandidates);
                }

                // Priority B: Energy (Only if not already carrying minerals)
                if (!target && !hasMinerals) {
                    const energySources = creep.room.find(FIND_STRUCTURES, {
                        filter: (s) => {
                            // Storage is always a valid source if it has energy
                            if (s.structureType === STRUCTURE_STORAGE) {
                                return s.store[RESOURCE_ENERGY] > 0;
                            }
                            // Containers are valid if they have energy and AREN'T the controller containers
                            if (s.structureType === STRUCTURE_CONTAINER) {
                                return s.store[RESOURCE_ENERGY] > 200 &&
                                       (creep.room.controller ? s.pos.getRangeTo(creep.room.controller) > 4 : true);
                            }
                            return false;
                        }
                    }) as (StructureStorage | StructureContainer)[];

                    target = creep.pos.findClosestByPath(energySources);
                }

                if (target) {
                    creep.memory.targetId = target.id;
                }
            }

            if (target) {
                if (creep.pos.isNearTo(target)) {
                    if ('amount' in target) {
                        creep.pickup(target);
                    } else {
                        const resourceToWithdraw = Object.keys(target.store).find(r => target.store[r as ResourceConstant] > 0) as ResourceConstant || RESOURCE_ENERGY;
                        creep.withdraw(target, resourceToWithdraw);
                    }
                } else {
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