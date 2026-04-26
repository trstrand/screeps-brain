import { COLONY_SETTINGS } from '../config.creeps';

export const roleExtractorMiner: RoleHandler = {
    run(creep: Creep): void {
        // 1. Room Check (Stay in home room)
        const homeRoom = creep.memory.homeRoom;
        if (homeRoom && creep.room.name !== homeRoom) {
            creep.moveTo(new RoomPosition(25, 25, homeRoom), { visualizePathStyle: { stroke: '#ff0000' } });
            return;
        }

        // 2. Find Mineral and Extractor
        const mineral = creep.room.find(FIND_MINERALS)[0];
        if (!mineral) {
            creep.say('❓ No Mineral');
            return;
        }

        // Check Quota
        const quota = COLONY_SETTINGS.mineralQuotas[creep.room.name];
        if (quota !== undefined && creep.room.storage) {
            const currentStock = creep.room.storage.store.getUsedCapacity(mineral.mineralType);
            if (currentStock >= quota) {
                creep.say('✅ Quota Done');
                creep.memory.recycle = true;
                return;
            }
        }

        // Look for extractor on the mineral position
        const extractor = mineral.pos.lookFor(LOOK_STRUCTURES).find(s => s.structureType === STRUCTURE_EXTRACTOR) as StructureExtractor;
        
        if (!extractor) {
            creep.say('⚒️ No Extr');
            return;
        }

        // 3. Find nearby Container (if any)
        const container = mineral.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 1, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        })[0];

        // 4. Mining Logic
        if (container) {
            // Static mining: Stand on the container
            if (!creep.pos.isEqualTo(container.pos)) {
                creep.moveTo(container, { range: 0, visualizePathStyle: { stroke: '#00ffff' } });
            } else {
                // --- REPAIR LOGIC ---
                // If container is damaged, try to repair it
                if (container.hits < container.hitsMax * 0.9) {
                    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                        creep.repair(container);
                        creep.say('🔧 Repair');
                        return;
                    } 
                    
                    // If no energy in store, try to pull some from the container if available
                    if (container.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                        // Make room if full of minerals
                        if (creep.store.getFreeCapacity() === 0) {
                            const mineralType = Object.keys(creep.store).find(r => r !== RESOURCE_ENERGY) as ResourceConstant;
                            if (mineralType) creep.transfer(container, mineralType);
                        }
                        creep.withdraw(container, RESOURCE_ENERGY);
                        return;
                    }
                }

                if (extractor.cooldown === 0) {
                    creep.harvest(mineral);
                }
                // If the container is full and creep is full, just wait
                if (container.store.getFreeCapacity() === 0 && creep.store.getFreeCapacity() === 0) {
                    creep.say('💤 Full');
                }
            }
        } else {
            // Traditional mining: Harvest until full, then deliver
            if (creep.memory.working && creep.store.getFreeCapacity() === 0) {
                creep.memory.working = false;
                creep.say('📦 Delivery');
            }
            if (!creep.memory.working && creep.store.getUsedCapacity() === 0) {
                creep.memory.working = true;
                creep.say('⛏️ Mining');
            }

            if (creep.memory.working) {
                if (extractor.cooldown === 0) {
                    const result = creep.harvest(mineral);
                    if (result === ERR_NOT_IN_RANGE) {
                        creep.moveTo(mineral, { visualizePathStyle: { stroke: '#00ffff' } });
                    }
                } else {
                    if (!creep.pos.isNearTo(mineral)) {
                        creep.moveTo(mineral);
                    }
                }
            } else {
                // Deposit in Storage (priority) or Terminal
                const target = creep.room.storage || creep.room.terminal;
                if (target) {
                    for (const resourceType in creep.store) {
                        if (creep.store[resourceType as ResourceConstant] > 0) {
                            if (creep.transfer(target, resourceType as ResourceConstant) === ERR_NOT_IN_RANGE) {
                                creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
                            }
                            break;
                        }
                    }
                } else {
                    creep.say('❓ No Store');
                }
            }
        }
    }
};
