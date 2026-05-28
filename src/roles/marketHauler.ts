import { COLONY_SETTINGS } from '../config/settings';

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
                // Priority 0.5: Tower Delivery
                if (carrying === RESOURCE_ENERGY && creep.memory.deliveryTargetId) {
                    const tower = Game.getObjectById(creep.memory.deliveryTargetId) as StructureTower | null;
                    if (tower && tower.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                        if (creep.transfer(tower, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                            creep.moveTo(tower, { visualizePathStyle: { stroke: '#00ff00' } });
                        }
                        delivered = true;
                    } else {
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
                                creep.moveTo(terminal, { visualizePathStyle: { stroke: '#00ffff' } });
                            }
                            delivered = true;
                        }
                    }
                }

                // Priority 2: Storage (Default for minerals from extractors or canceled terminal transfers)
                if (!delivered && storage) {
                    if (creep.transfer(storage, carrying) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(storage, { visualizePathStyle: { stroke: '#ffffff' } });
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

            // Priority 1: Terminal Transfers (Storage -> Terminal)
            if (terminal && storage) {
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

            // Priority 2: Extractor Minerals
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

            // Priority 3: Tower Energy Hauling
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

            // RECYCLE CHECK: If no target found AND no work left to do
            if (!target && !needsMinerals) {
                // Double check if any transfers are still possible
                const hasPendingTransfers = terminal && storage && transfers.some(t => (terminal.store[t.resource] || 0) < t.amount && (storage.store[t.resource] || 0) > 0);

                if (!hasPendingTransfers) {
                    creep.say('✅ All Done');
                    creep.memory.recycle = true;
                    return;
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
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            } else {
                // Idle near storage
                if (storage) {
                    if (creep.pos.getRangeTo(storage) > 3) {
                        creep.moveTo(storage, { range: 3, visualizePathStyle: { stroke: '#555555' } });
                    } else {
                        creep.say('💤 Idle');
                    }
                }
            }
        }
    }
};
