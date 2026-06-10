import { COLONY_SETTINGS } from '../config/settings';

/**
 * Checks if a Source has at least one walkable tile around it that is not blocked by other creeps or structures.
 */
function hasFreeMiningSpot(source: Source, creep: Creep): boolean {
    const room = source.room;
    if (!room) return false;
    const terrain = room.getTerrain();
    
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const x = source.pos.x + dx;
            const y = source.pos.y + dy;
            
            if (x < 0 || x > 49 || y < 0 || y > 49) continue;
            
            if ((terrain.get(x, y) & TERRAIN_MASK_WALL) !== 0) {
                continue;
            }
            
            const creeps = room.lookForAt(LOOK_CREEPS, x, y);
            if (creeps.length > 0 && creeps[0].id !== creep.id) {
                continue;
            }
            
            const structures = room.lookForAt(LOOK_STRUCTURES, x, y);
            let isBlocked = false;
            for (const s of structures) {
                if (s.structureType !== STRUCTURE_ROAD && 
                    s.structureType !== STRUCTURE_CONTAINER && 
                    !(s.structureType === STRUCTURE_RAMPART && (s as StructureRampart).my)) {
                    isBlocked = true;
                    break;
                }
            }
            
            if (!isBlocked) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Finds the closest target in a list that has a valid path to it (ignoring creeps).
 */
function findClosestReachable<T extends RoomObject & { pos: RoomPosition }>(creep: Creep, targets: T[]): T | null {
    let remaining = [...targets];
    while (remaining.length > 0) {
        const closest = creep.pos.findClosestByRange(remaining);
        if (!closest) break;

        const path = creep.room.findPath(creep.pos, closest.pos, { ignoreCreeps: true, maxOps: 200 });
        const isReachable = path.length > 0 && path[path.length - 1].x === closest.pos.x && path[path.length - 1].y === closest.pos.y;
        
        if (isReachable || creep.pos.isNearTo(closest.pos)) {
            return closest;
        } else {
            const index = remaining.indexOf(closest);
            if (index > -1) remaining.splice(index, 1);
        }
    }
    return null;
}

/**
 * Sweeps up nearby energy (dropped resource, tombstone, or ruin) before moving.
 */
function moveWithSweeper(creep: Creep, target: RoomPosition | { pos: RoomPosition }, options?: any): number {
    if (creep.store.getFreeCapacity() > 0) {
        const vacDrop = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, { filter: (r: Resource) => r.resourceType === RESOURCE_ENERGY && r.amount > 0 })[0];
        if (vacDrop) {
            creep.pickup(vacDrop);
        } else {
            const vacTomb = creep.pos.findInRange(FIND_TOMBSTONES, 1, { filter: (t: Tombstone) => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0 })[0];
            if (vacTomb) {
                creep.withdraw(vacTomb, RESOURCE_ENERGY);
            } else {
                const vacRuin = creep.pos.findInRange(FIND_RUINS, 1, { filter: (r: Ruin) => r.store.getUsedCapacity(RESOURCE_ENERGY) > 0 })[0];
                if (vacRuin) {
                    creep.withdraw(vacRuin, RESOURCE_ENERGY);
                }
            }
        }
    }
    return creep.moveTo(target, options);
}

/**
 * Builder Role - Optimized for CanMiner setups with Container Maintenance
 */
export const roleBuilder: RoleHandler = {
    run(creep: Creep): void {
        // --- 0. ROOM GUARD ---
        // If the builder drifted into a neighboring room, force it back home.
        const homeRoom = creep.memory.homeRoom;
        if (homeRoom && creep.room.name !== homeRoom) {
            moveWithSweeper(creep, new RoomPosition(25, 25, homeRoom), {
                range: 5,
                visualizePathStyle: { stroke: '#ff0000', lineStyle: 'dashed' }
            });
            creep.say('🏠 returning');
            return;
        }

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
        // 1. State Machine: Toggle Working State
        if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = false;
            delete creep.memory.targetId;
            creep.say('🔄 loading');
        }
        if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
            delete creep.memory.targetId;
            creep.say('🚧 build');
        }

        // 2. Logic Execution
        if (creep.memory.working) {
            // --- PRIORITY 1: Construction Sites ---
            // Local construction sites only
            const site = creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES, {
                filter: (s) => s.pos.roomName === creep.room.name
            });

            if (site) {
                if (creep.build(site) === ERR_NOT_IN_RANGE) {
                    moveWithSweeper(creep, site, { visualizePathStyle: { stroke: '#ffffff' }, reusePath: 10 });
                }
                return;
            }

            // --- PRIORITY 2: Repair Containers ---
            const damagedContainer = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: (s) => s.structureType === STRUCTURE_CONTAINER &&
                    s.hits < s.hitsMax * 0.9 &&
                    s.pos.roomName === creep.room.name
            });
            if (damagedContainer) {
                if (creep.repair(damagedContainer) === ERR_NOT_IN_RANGE) {
                    moveWithSweeper(creep, damagedContainer, { visualizePathStyle: { stroke: '#ff0000' } });
                }
                return;
            }

            // --- PRIORITY 3: Upgrade Controller ---
            if (creep.room.controller && creep.room.controller.my) {
                if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                    moveWithSweeper(creep, creep.room.controller, { visualizePathStyle: { stroke: '#ffffff' }, reusePath: 10 });
                }
            }

        } else {
            // 3. Energy Retrieval Logic
            let target: any = null;

            // A. Target Fixation: Check memory
            if (creep.memory.targetId) {
                target = Game.getObjectById(creep.memory.targetId as Id<any>);
                let hasResources = false;
                if (target) {
                    if ('store' in target) {
                        hasResources = target.store.getUsedCapacity(RESOURCE_ENERGY) > 25;
                    } else if ('amount' in target) {
                        hasResources = target.amount > 0;
                    } else if (target instanceof Source) {
                        hasResources = target.energy > 0 && hasFreeMiningSpot(target, creep);
                    }
                }
                if (!hasResources) {
                    delete creep.memory.targetId;
                    target = null;
                }
            }

            if (!target) {
                // Priority 1: Scavenge from ruins or tombstones
                const ruinsAndTombstones = [
                    ...creep.room.find(FIND_TOMBSTONES, { filter: t => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0 }),
                    ...creep.room.find(FIND_RUINS, { filter: r => r.store.getUsedCapacity(RESOURCE_ENERGY) > 0 })
                ];
                target = findClosestReachable(creep, ruinsAndTombstones);
                if (target) {
                    creep.memory.targetId = target.id;
                }
            }

            if (!target) {
                // Priority 2: Any energy on the ground that there is a path to
                const droppedEnergy = creep.room.find(FIND_DROPPED_RESOURCES, {
                    filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 0
                });
                target = findClosestReachable(creep, droppedEnergy);
                if (target) {
                    creep.memory.targetId = target.id;
                }
            }

            if (!target) {
                // Priority 3: room.storage if there is energy in it, else room.terminal if it has energy
                const storage = creep.room.storage;
                if (storage && storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                    const path = creep.room.findPath(creep.pos, storage.pos, { ignoreCreeps: true, maxOps: 200 });
                    const isReachable = path.length > 0 && path[path.length - 1].x === storage.pos.x && path[path.length - 1].y === storage.pos.y;
                    if (isReachable || creep.pos.isNearTo(storage.pos)) {
                        target = storage;
                        creep.memory.targetId = target.id;
                    }
                } else {
                    const terminal = creep.room.terminal;
                    if (terminal && terminal.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                        const path = creep.room.findPath(creep.pos, terminal.pos, { ignoreCreeps: true, maxOps: 200 });
                        const isReachable = path.length > 0 && path[path.length - 1].x === terminal.pos.x && path[path.length - 1].y === terminal.pos.y;
                        if (isReachable || creep.pos.isNearTo(terminal.pos)) {
                            target = terminal;
                            creep.memory.targetId = target.id;
                        }
                    }
                }
            }

            if (!target) {
                // Priority 4: Containers near sources
                const sources = creep.room.find(FIND_SOURCES);
                const containers = creep.room.find(FIND_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_CONTAINER && s.store.getUsedCapacity(RESOURCE_ENERGY) > 25
                });
                const sourceContainers = containers.filter(c => 
                    sources.some(src => c.pos.inRangeTo(src, 2))
                );
                target = findClosestReachable(creep, sourceContainers);
                if (target) {
                    creep.memory.targetId = target.id;
                }
            }

            if (!target) {
                // Priority 5: Fallback to room.source (Only if it has active energy and free mining spots)
                const activeSources = creep.room.find(FIND_SOURCES_ACTIVE).filter(s => 
                    !COLONY_SETTINGS.ignoredSources.includes(s.id as any) &&
                    hasFreeMiningSpot(s, creep)
                );

                if (activeSources.length > 0) {
                    const closestSource = creep.pos.findClosestByRange(activeSources);
                    if (closestSource) {
                        target = closestSource;
                        creep.memory.targetId = target.id;
                    }
                }
            }

            if (target) {
                let action: number;
                if (target instanceof Resource) {
                    action = creep.pickup(target);
                } else if (target instanceof Source) {
                    action = creep.harvest(target);
                } else {
                    action = creep.withdraw(target, RESOURCE_ENERGY);
                }

                if (action === ERR_NOT_IN_RANGE) {
                    moveWithSweeper(creep, target, { visualizePathStyle: { stroke: '#ffaa00' }, reusePath: 10 });
                } else if (action === OK) {
                    if (creep.store.getUsedCapacity() >= creep.store.getCapacity() * 0.8) {
                        creep.memory.working = true;
                        delete creep.memory.targetId;
                        creep.say('🚧 Build');
                    }
                }
            } else {
                if (creep.memory.idleTicks && creep.memory.idleTicks > 0) {
                    creep.memory.idleTicks--;
                } else {
                    creep.memory.idleTicks = 5;
                    creep.say('💤 Idle');
                }
            }
        }
    }
};