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

        // --- STUCK DETECTION ---
        if (creep.memory.targetId || (creep.memory as any).repairTargetId) {
            const lastPos = creep.memory.lastPos;
            if (lastPos && lastPos.x === creep.pos.x && lastPos.y === creep.pos.y && lastPos.roomName === creep.room.name) {
                creep.memory.stuckCount = (creep.memory.stuckCount || 0) + 1;
            } else {
                creep.memory.stuckCount = 0;
            }
            creep.memory.lastPos = { x: creep.pos.x, y: creep.pos.y, roomName: creep.room.name };

            if ((creep.memory.stuckCount || 0) > 5) {
                delete creep.memory.targetId;
                delete (creep.memory as any).repairTargetId;
                creep.memory.stuckCount = 0;
                creep.say('🔄 Stuck!');
            }
        } else {
            delete creep.memory.lastPos;
            creep.memory.stuckCount = 0;
        }

        // 2. Work Phase
        if (creep.memory.working) {
            // 2. LOGISTICS: Home Room Guard
            const homeRoom = creep.memory.homeRoom;
            if (homeRoom && creep.room.name !== homeRoom) {
                // --- VACUUM LOGIC ---
                if (creep.store.getFreeCapacity() > 0) {
                    const vacDrop = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, { filter: (r: Resource) => r.resourceType === RESOURCE_ENERGY && r.amount > 0 })[0];
                    const vacTomb = creep.pos.findInRange(FIND_TOMBSTONES, 1, { filter: (t: Tombstone) => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0 })[0];
                    if (vacDrop) creep.pickup(vacDrop);
                    else if (vacTomb) creep.withdraw(vacTomb, RESOURCE_ENERGY);
                }
                creep.moveTo(new RoomPosition(25, 25, homeRoom), { range: 5 });
                return;
            }

            // --- SETTINGS ---
            const wallMaxHits = (COLONY_SETTINGS.roomWallMaxHits && COLONY_SETTINGS.roomWallMaxHits[creep.room.name]) || 1000;
            const rampartMaxHits = (COLONY_SETTINGS.roomRampartMaxHits && COLONY_SETTINGS.roomRampartMaxHits[creep.room.name]) || 1000;

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
                    // --- VACUUM LOGIC ---
                    if (creep.store.getFreeCapacity() > 0) {
                        const vacDrop = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, { filter: (r: Resource) => r.resourceType === RESOURCE_ENERGY && r.amount > 0 })[0];
                        const vacTomb = creep.pos.findInRange(FIND_TOMBSTONES, 1, { filter: (t: Tombstone) => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0 })[0];
                        if (vacDrop) creep.pickup(vacDrop);
                        else if (vacTomb) creep.withdraw(vacTomb, RESOURCE_ENERGY);
                    }
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ff0000' }, reusePath: 10 });
                }
            } else {
                if (creep.room.controller) {
                    if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                        // --- VACUUM LOGIC ---
                        if (creep.store.getFreeCapacity() > 0) {
                            const vacDrop = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, { filter: (r: Resource) => r.resourceType === RESOURCE_ENERGY && r.amount > 0 })[0];
                            const vacTomb = creep.pos.findInRange(FIND_TOMBSTONES, 1, { filter: (t: Tombstone) => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0 })[0];
                            if (vacDrop) creep.pickup(vacDrop);
                            else if (vacTomb) creep.withdraw(vacTomb, RESOURCE_ENERGY);
                        }
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
                    ('store' in target && target.store.getUsedCapacity(RESOURCE_ENERGY) > 25) ||
                    ('amount' in target && target.amount > 0) ||
                    (target instanceof Source && target.energy > 0)
                );
                if (!hasResources) {
                    delete creep.memory.targetId;
                    target = null;
                }
            }

            if (!target) {
                // Priority 1: Loot (Tombstones, Ruins, Dropped) - Combined for closest
                const dropped = creep.room.find(FIND_DROPPED_RESOURCES, {
                    filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 20
                });
                const tombstones = creep.room.find(FIND_TOMBSTONES, {
                    filter: t => t.store[RESOURCE_ENERGY] > 0
                });
                const ruins = creep.room.find(FIND_RUINS, {
                    filter: r => r.store[RESOURCE_ENERGY] > 0
                });

                let lootTarget = null;
                let currentLoot = [...dropped, ...tombstones, ...ruins];
                
                while (currentLoot.length > 0) {
                    const closest = creep.pos.findClosestByRange(currentLoot);
                    if (!closest) break;
                    
                    const path = creep.room.findPath(creep.pos, closest.pos, { ignoreCreeps: true, maxOps: 200 });
                    const isReachable = path.length > 0 && path[path.length - 1].x === closest.pos.x && path[path.length - 1].y === closest.pos.y;
                    
                    if (isReachable || creep.pos.isNearTo(closest.pos)) {
                        lootTarget = closest;
                        break;
                    } else {
                        const index = currentLoot.indexOf(closest);
                        if (index > -1) currentLoot.splice(index, 1);
                    }
                }

                if (lootTarget) {
                    target = lootTarget;
                } else {
                    // Priority 2: Hostile Structures (Terminal then Storage)
                    const hostileTerminal = creep.room.find(FIND_HOSTILE_STRUCTURES, {
                        filter: (s) => s.structureType === STRUCTURE_TERMINAL && s.store[RESOURCE_ENERGY] > 0
                    })[0];
                    const hostileStorage = !hostileTerminal ? creep.room.find(FIND_HOSTILE_STRUCTURES, {
                        filter: (s) => s.structureType === STRUCTURE_STORAGE && s.store[RESOURCE_ENERGY] > 0
                    })[0] : null;

                    if (hostileTerminal) {
                        target = hostileTerminal;
                    } else if (hostileStorage) {
                        target = hostileStorage;
                    } else {
                        // Priority 3: Structured Energy (Containers/Storage)
                        const energySource = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                            filter: (s) => (s.structureType === STRUCTURE_CONTAINER || (s.structureType === STRUCTURE_STORAGE && (s as StructureStorage).my)) &&
                                s.store.getUsedCapacity(RESOURCE_ENERGY) > 25
                        });

                        if (energySource) {
                            target = energySource;
                        } else {
                            // Priority 4: Last Resort (Harvest)
                            target = creep.pos.findClosestByRange(FIND_SOURCES_ACTIVE);
                        }
                    }
                }

                if (target) creep.memory.targetId = target.id;
            }

            if (target) {
                const action = ('amount' in target) ? creep.pickup(target) : (('store' in target) ? creep.withdraw(target, RESOURCE_ENERGY) : creep.harvest(target));
                if (action === ERR_NOT_IN_RANGE) {
                    // --- VACUUM LOGIC ---
                    if (creep.store.getFreeCapacity() > 0) {
                        const vacDrop = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, { filter: (r: Resource) => r.resourceType === RESOURCE_ENERGY && r.amount > 0 })[0];
                        const vacTomb = creep.pos.findInRange(FIND_TOMBSTONES, 1, { filter: (t: Tombstone) => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0 })[0];
                        if (vacDrop) creep.pickup(vacDrop);
                        else if (vacTomb) creep.withdraw(vacTomb, RESOURCE_ENERGY);
                    }
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' }, reusePath: 10 });
                } else if (action === OK) {
                    if (creep.store.getUsedCapacity() >= creep.store.getCapacity() * 0.8) {
                        creep.memory.working = true;
                        delete creep.memory.targetId;
                        creep.say('🔧 Repair');
                    }
                }
            }
        }
    }
};