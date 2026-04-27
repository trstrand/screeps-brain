import { COLONY_SETTINGS } from '../config/settings';

export const roleRepairer: RoleHandler = {
    run(creep: Creep): void {
        // 1. State Toggle
        if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = false;
            delete (creep.memory as any).repairTargetId; // Clear target when empty
            creep.say('🔍 Energy');
        }
        if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
            delete creep.memory.targetId;
            creep.say('🔧 Repair');
        }

        // 2. Work Phase
        if (creep.memory.working) {
            // 2. LOGISTICS: Home Room Guard
            const homeRoom = creep.memory.homeRoom;
            if (homeRoom && creep.room.name !== homeRoom) {
                creep.moveTo(new RoomPosition(25, 25, homeRoom), { range: 5 });
                return;
            }

            // --- SETTINGS ---
            const wallMaxHits = (COLONY_SETTINGS.roomWallMaxHits && COLONY_SETTINGS.roomWallMaxHits[creep.room.name]) || COLONY_SETTINGS.wallMaxHits;
            const rampartMaxHits = (COLONY_SETTINGS.roomRampartMaxHits && COLONY_SETTINGS.roomRampartMaxHits[creep.room.name]) || COLONY_SETTINGS.rampartMaxHits;

            // --- TARGET SELECTION ---
            let target = Game.getObjectById((creep.memory as any).repairTargetId as Id<Structure>);

            // If target is fully repaired or gone, find a new one
            if (!target || target.hits === target.hitsMax || 
               (target.structureType === STRUCTURE_WALL && target.hits >= wallMaxHits) ||
               (target.structureType === STRUCTURE_RAMPART && target.hits >= rampartMaxHits)) {
                
                delete (creep.memory as any).repairTargetId;
                target = null;

                if (creep.memory.idleTicks && creep.memory.idleTicks > 0) {
                    creep.memory.idleTicks--;
                } else {
                    // Priority 1: Emergency (Containers/Roads < 50%)
                    target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                        filter: (s) => (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_ROAD) && 
                                        s.hits < s.hitsMax * 0.5
                    });

                    // Priority 1.5: Core Infrastructure (Spawns, Extensions, Towers, etc)
                    if (!target) {
                        target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                            filter: (s) => (s.structureType !== STRUCTURE_ROAD && 
                                            s.structureType !== STRUCTURE_CONTAINER && 
                                            s.structureType !== STRUCTURE_WALL && 
                                            s.structureType !== STRUCTURE_RAMPART) && 
                                            s.hits < s.hitsMax
                        });
                    }

                    // Priority 2: Standard (Containers/Roads < 90%)
                    if (!target) {
                        target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                            filter: (s) => (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_ROAD) && 
                                            s.hits < s.hitsMax * 0.9
                        });
                    }

                    // Priority 3: Defenses (Walls/Ramparts)
                    if (!target) {
                        target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                            filter: (s) => (s.structureType === STRUCTURE_WALL && s.hits < wallMaxHits) ||
                                           (s.structureType === STRUCTURE_RAMPART && s.hits < rampartMaxHits)
                        });
                    }

                    if (target) {
                        (creep.memory as any).repairTargetId = target.id;
                    } else {
                        creep.memory.idleTicks = 10;
                    }
                }
            }

            // --- EXECUTION ---
            if (target) {
                if (creep.repair(target) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ff0000' }, reusePath: 10 });
                }
            } else {
                if (creep.room.controller) {
                    if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(creep.room.controller, { range: 3 });
                    }
                }
            }
        } 
        
        // 3. Refill Phase
        else {
            let target: any = null;

            // A. Target Fixation
            if (creep.memory.targetId) {
                target = Game.getObjectById(creep.memory.targetId as Id<any>);
                const hasResources = target && (
                    ('store' in target && target.store.getUsedCapacity(RESOURCE_ENERGY) > 0) || 
                    ('amount' in target && target.amount > 0) ||
                    (target instanceof Source && target.energy > 0)
                );
                if (!hasResources) {
                    delete creep.memory.targetId;
                    target = null;
                }
            }

            if (!target) {
                // Priority 1: Loot (Tombstones, Ruins, Dropped)
                const loot = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
                    filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 20
                }) || creep.pos.findClosestByRange(FIND_TOMBSTONES, {
                    filter: t => t.store[RESOURCE_ENERGY] > 0
                }) || creep.pos.findClosestByRange(FIND_RUINS, {
                    filter: r => r.store[RESOURCE_ENERGY] > 0
                });

                if (loot) {
                    target = loot;
                } else {
                    // Priority 2: Structured Energy (Containers/Storage)
                    const energySource = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                        filter: (s) => (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) &&
                                        s.store.getUsedCapacity(RESOURCE_ENERGY) > 0
                    });

                    if (energySource) {
                        target = energySource;
                    } else {
                        // Priority 3: Last Resort (Harvest)
                        target = creep.pos.findClosestByRange(FIND_SOURCES_ACTIVE);
                    }
                }

                if (target) creep.memory.targetId = target.id;
            }

            if (target) {
                const action = ('amount' in target) ? creep.pickup(target) : (('store' in target) ? creep.withdraw(target, RESOURCE_ENERGY) : creep.harvest(target));
                if (action === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' }, reusePath: 10 });
                }
            }
        }
    }
};