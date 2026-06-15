import { COLONY_SETTINGS } from '../config/settings';

/**
 * Sweeps up nearby dropped resources, tombstones, or ruins before moving.
 */
function moveWithSweeper(creep: Creep, target: RoomPosition | { pos: RoomPosition }, options?: any): number {
    if (creep.store.getFreeCapacity() > 0) {
        const vacDrop = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, { filter: (r: Resource) => r.amount > 0 })[0];
        if (vacDrop) {
            creep.pickup(vacDrop);
        } else {
            const vacTomb = creep.pos.findInRange(FIND_TOMBSTONES, 1, { filter: (t: Tombstone) => t.store.getUsedCapacity() > 0 })[0];
            if (vacTomb) {
                const resType = Object.keys(vacTomb.store).find(k => vacTomb.store[k as ResourceConstant] > 0) as ResourceConstant | undefined;
                if (resType) {
                    creep.withdraw(vacTomb, resType);
                }
            } else {
                const vacRuin = creep.pos.findInRange(FIND_RUINS, 1, { filter: (r: Ruin) => r.store.getUsedCapacity() > 0 })[0];
                if (vacRuin) {
                    const resType = Object.keys(vacRuin.store).find(k => vacRuin.store[k as ResourceConstant] > 0) as ResourceConstant | undefined;
                    if (resType) {
                        creep.withdraw(vacRuin, resType);
                    }
                }
            }
        }
    }
    return creep.moveTo(target, options);
}

export const roleMarketHauler: RoleHandler = {
    run(creep: Creep): void {
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

        // 1. STATE MACHINE (Aggressive Delivery for sparse items)
        if (creep.memory.working && creep.store.getUsedCapacity() === 0) {
            creep.memory.working = false;
            delete creep.memory.targetId;
            delete creep.memory.deliveryTargetId;
            creep.say('🔄 Fetch');
        }
        // Market haulers deal with low-volume/high-value items. Deliver as soon as we have anything.
        if (!creep.memory.working && creep.store.getUsedCapacity() > 0) {
            creep.memory.working = true;
            delete creep.memory.targetId;
            creep.say('📦 Drop');
        }

        // 2. DELIVERY PHASE
        if (creep.memory.working) {
            const terminal = creep.room.terminal;
            const storage = creep.room.storage;
            const transfers = (COLONY_SETTINGS.terminalTransfers && COLONY_SETTINGS.terminalTransfers[creep.room.name]) || [];

            let delivered = false;

            // What are we carrying?
            const carrying = Object.keys(creep.store).find(res => creep.store[res as ResourceConstant] > 0) as ResourceConstant | undefined;

            if (carrying) {
                // emptyTerminal Priority: Transfer everything directly to storage
                if (creep.memory.emptyTerminal && storage) {
                    if (creep.transfer(storage, carrying) === ERR_NOT_IN_RANGE) {
                        moveWithSweeper(creep, storage, { visualizePathStyle: { stroke: '#ffffff' } });
                    }
                    delivered = true;
                }

                // Priority 0.5: Tower Delivery
                if (!delivered && carrying === RESOURCE_ENERGY && creep.memory.deliveryTargetId) {
                    const tower = Game.getObjectById(creep.memory.deliveryTargetId) as StructureTower | null;
                    if (tower && tower.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                        if (creep.transfer(tower, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                            moveWithSweeper(creep, tower, { visualizePathStyle: { stroke: '#00ff00' } });
                        }
                        delivered = true;
                    } else {
                        delete creep.memory.deliveryTargetId;
                    }
                }

                // Priority 0.6: Power Spawn Delivery
                if (!delivered && (carrying === RESOURCE_ENERGY || carrying === RESOURCE_POWER)) {
                    let targetPS: StructurePowerSpawn | null = null;
                    if (creep.memory.deliveryTargetId) {
                        const ps = Game.getObjectById(creep.memory.deliveryTargetId) as Structure | null;
                        if (ps && ps.structureType === STRUCTURE_POWER_SPAWN) {
                            targetPS = ps as StructurePowerSpawn;
                        }
                    } else if (carrying === RESOURCE_POWER) {
                        targetPS = creep.room.find(FIND_MY_STRUCTURES, {
                            filter: s => s.structureType === STRUCTURE_POWER_SPAWN
                        })[0] as StructurePowerSpawn | undefined || null;
                    }

                    if (targetPS && targetPS.store.getFreeCapacity(carrying) > 0) {
                        if (creep.transfer(targetPS, carrying) === ERR_NOT_IN_RANGE) {
                            moveWithSweeper(creep, targetPS, { visualizePathStyle: { stroke: '#ff00ff' } });
                        }
                        delivered = true;
                    } else if (creep.memory.deliveryTargetId === (targetPS ? targetPS.id : '')) {
                        delete creep.memory.deliveryTargetId;
                    }
                }

                // Priority 1: Terminal (If it's on the transfer list and terminal isn't full of it)
                if (!delivered && terminal) {
                    const transferConfig = transfers.find(t => t.resource === carrying);
                    if (transferConfig) {
                        const currentInTerminal = terminal.store[carrying] || 0;
                        if (currentInTerminal < transferConfig.amount) {
                            if (creep.transfer(terminal, carrying) === ERR_NOT_IN_RANGE) {
                                moveWithSweeper(creep, terminal, { visualizePathStyle: { stroke: '#00ffff' } });
                            }
                            delivered = true;
                        }
                    }
                }

                // Priority 2: Storage (Default for minerals from extractors or canceled terminal transfers)
                if (!delivered && storage) {
                    if (creep.transfer(storage, carrying) === ERR_NOT_IN_RANGE) {
                        moveWithSweeper(creep, storage, { visualizePathStyle: { stroke: '#ffffff' } });
                    }
                }
            }
        }

        // 3. FETCH PHASE
        else {
            let target: any = null;
            let resourceToFetch: ResourceConstant = RESOURCE_ENERGY;

            const terminal = creep.room.terminal;
            const storage = creep.room.storage;
            const transfers = (COLONY_SETTINGS.terminalTransfers && COLONY_SETTINGS.terminalTransfers[creep.room.name]) || [];

            // If emptyTerminal is true, we ONLY fetch from terminal
            if (creep.memory.emptyTerminal) {
                if (terminal) {
                    const terminalResources = Object.keys(terminal.store) as ResourceConstant[];
                    const firstResource = terminalResources.find(res => terminal.store[res] > 0);
                    if (firstResource) {
                        target = terminal;
                        resourceToFetch = firstResource;
                    }
                }
            } else {
                // Priority 1: Reachable Dropped Resources or Energy on the Ground
                const dropped = creep.room.find(FIND_DROPPED_RESOURCES);
                if (dropped.length > 0) {
                    let remainingDrops = [...dropped];
                    while (remainingDrops.length > 0) {
                        const closest = creep.pos.findClosestByRange(remainingDrops);
                        if (!closest) break;

                        const path = creep.room.findPath(creep.pos, closest.pos, { ignoreCreeps: true, maxOps: 200 });
                        const isReachable = path.length > 0 && path[path.length - 1].x === closest.pos.x && path[path.length - 1].y === closest.pos.y;

                        if (isReachable || creep.pos.isNearTo(closest.pos)) {
                            target = closest;
                            resourceToFetch = closest.resourceType;
                            break;
                        } else {
                            const index = remainingDrops.indexOf(closest);
                            if (index > -1) remainingDrops.splice(index, 1);
                        }
                    }
                }

                // Priority 2: Terminal Transfers (Storage -> Terminal)
                if (!target && terminal && storage) {
                    for (const transfer of transfers) {
                        const currentInTerminal = terminal.store[transfer.resource] || 0;
                        if (currentInTerminal < transfer.amount) {
                            const amountInStorage = storage.store[transfer.resource] || 0;
                            if (amountInStorage > 0) {
                                target = storage;
                                resourceToFetch = transfer.resource;
                                break;
                            }
                        }
                    }
                }

                // Priority 3: Extractor Minerals
                const extractor = creep.room.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_EXTRACTOR } })[0];
                const mineral = creep.room.find(FIND_MINERALS)[0];
                const quota = COLONY_SETTINGS.mineralQuotas[creep.room.name];
                let needsMinerals = false;
                if (extractor && mineral && quota !== undefined && creep.room.storage) {
                    const currentStock = creep.room.storage.store.getUsedCapacity(mineral.mineralType);
                    if (currentStock < quota) needsMinerals = true;
                }

                if (!target && needsMinerals && extractor) {
                    // Check ground drops near extractor (minerals)
                    const drops = creep.room.find(FIND_DROPPED_RESOURCES, {
                        filter: r => r.resourceType !== RESOURCE_ENERGY && r.pos.inRangeTo(extractor, 1)
                    });

                    if (drops.length > 0) {
                        target = drops[0];
                    }

                    // Check container near extractor
                    if (!target) {
                        const container = extractor.pos.findInRange(FIND_STRUCTURES, 1, {
                            filter: s => s.structureType === STRUCTURE_CONTAINER
                        })[0] as StructureContainer;

                        if (container) {
                            const specialMineral = Object.keys(container.store).find(res => res !== RESOURCE_ENERGY) as ResourceConstant;
                            // Only fetch if > 250 to save CPU/trips
                            if (specialMineral && container.store[specialMineral] > 250) {
                                target = container;
                                resourceToFetch = specialMineral;
                            }
                        }
                    }
                }

                // Priority 4: Tower Energy Hauling
                if (!target && storage) {
                    const towers = creep.room.find(FIND_MY_STRUCTURES, {
                        filter: s => s.structureType === STRUCTURE_TOWER && s.store.getFreeCapacity(RESOURCE_ENERGY) > 200
                    }) as StructureTower[];

                    if (towers.length > 0 && storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                        const targetTower = towers.reduce((lowest, t) => t.store[RESOURCE_ENERGY] < lowest.store[RESOURCE_ENERGY] ? t : lowest, towers[0]);
                        target = storage;
                        resourceToFetch = RESOURCE_ENERGY;
                        creep.memory.deliveryTargetId = targetTower.id;
                    }
                }

                // Priority 4.5: Power Spawn Filling
                if (!target) {
                    const powerSpawn = creep.room.find(FIND_MY_STRUCTURES, {
                        filter: s => s.structureType === STRUCTURE_POWER_SPAWN
                    })[0] as StructurePowerSpawn | undefined;

                    if (powerSpawn) {
                        // Check Power first
                        if (powerSpawn.store.getFreeCapacity(RESOURCE_POWER) > 0) {
                            let source: StructureStorage | StructureTerminal | null = null;
                            if (storage && storage.store[RESOURCE_POWER] > 0) {
                                source = storage;
                            } else if (terminal && terminal.store[RESOURCE_POWER] > 0) {
                                source = terminal;
                            }
                            if (source) {
                                target = source;
                                resourceToFetch = RESOURCE_POWER;
                                creep.memory.deliveryTargetId = powerSpawn.id;
                            }
                        }
                        // Check Energy second
                        if (!target && powerSpawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                            let source: StructureStorage | StructureTerminal | null = null;
                            if (storage && storage.store[RESOURCE_ENERGY] > 0) {
                                source = storage;
                            } else if (terminal && terminal.store[RESOURCE_ENERGY] > 0) {
                                source = terminal;
                            }
                            if (source) {
                                target = source;
                                resourceToFetch = RESOURCE_ENERGY;
                                creep.memory.deliveryTargetId = powerSpawn.id;
                            }
                        }
                    }
                }
            }

            // RECYCLE CHECK: If no target found AND no work left to do (and emptyTerminal is not set)
            if (!target && !creep.memory.emptyTerminal) {
                const extractor = creep.room.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_EXTRACTOR } })[0];
                const mineral = creep.room.find(FIND_MINERALS)[0];
                const quota = COLONY_SETTINGS.mineralQuotas[creep.room.name];
                let needsMinerals = false;
                if (extractor && mineral && quota !== undefined && creep.room.storage) {
                    const currentStock = creep.room.storage.store.getUsedCapacity(mineral.mineralType);
                    if (currentStock < quota) needsMinerals = true;
                }

                // Check if Power Spawn needs filling
                let psNeedsFilling = false;
                const powerSpawn = creep.room.find(FIND_MY_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_POWER_SPAWN
                })[0] as StructurePowerSpawn | undefined;
                if (powerSpawn) {
                    const hasPowerAvailable = (storage && storage.store[RESOURCE_POWER] > 0) || (terminal && terminal.store[RESOURCE_POWER] > 0);
                    const hasEnergyAvailable = (storage && storage.store[RESOURCE_ENERGY] > 0) || (terminal && terminal.store[RESOURCE_ENERGY] > 0);
                    if (
                        (powerSpawn.store.getFreeCapacity(RESOURCE_POWER) > 0 && hasPowerAvailable) ||
                        (powerSpawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && hasEnergyAvailable)
                    ) {
                        psNeedsFilling = true;
                    }
                }

                if (!needsMinerals && !psNeedsFilling) {
                    // Double check if any transfers are still possible
                    const hasPendingTransfers = terminal && storage && transfers.some(t => (terminal.store[t.resource] || 0) < t.amount && (storage.store[t.resource] || 0) > 0);

                    if (!hasPendingTransfers) {
                        creep.say('✅ All Done');
                        creep.memory.recycle = true;
                        return;
                    }
                }
            }

            // Execute Fetch
            if (target) {
                creep.memory.targetId = target.id;
                if (creep.pos.isNearTo(target)) {
                    if ('amount' in target) {
                        creep.pickup(target);
                    } else {
                        creep.withdraw(target, resourceToFetch);
                    }
                } else {
                    moveWithSweeper(creep, target, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            } else {
                // Idle near storage
                if (storage) {
                    if (creep.pos.getRangeTo(storage) > 3) {
                        moveWithSweeper(creep, storage, { range: 3, visualizePathStyle: { stroke: '#555555' } });
                    } else {
                        creep.say('💤 Idle');
                    }
                }
            }
        }
    }
};
