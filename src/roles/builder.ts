import { COLONY_SETTINGS } from '../config.creeps';

/**
 * Builder Role - Optimized for CanMiner setups with Container Maintenance
 */
export const roleBuilder: RoleHandler = {
    run(creep: Creep): void {
        // --- 0. ROOM GUARD ---
        // If the builder drifted into a neighboring room, force it back home.
        const homeRoom = creep.memory.homeRoom;
        if (homeRoom && creep.room.name !== homeRoom) {
            creep.moveTo(new RoomPosition(25, 25, homeRoom), { 
                range: 5,
                visualizePathStyle: { stroke: '#ff0000', lineStyle: 'dashed' } 
            });
            creep.say('🏠 returning');
            return;
        }        // 1. State Machine: Toggle Working State
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
                    creep.moveTo(site, { visualizePathStyle: { stroke: '#ffffff' }, reusePath: 10 });
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
                    creep.moveTo(damagedContainer, { visualizePathStyle: { stroke: '#ff0000' } });
                }
                return;
            }

            // --- PRIORITY 3: Upgrade Controller ---
            if (creep.room.controller && creep.room.controller.my) {
                if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(creep.room.controller, { visualizePathStyle: { stroke: '#ffffff' }, reusePath: 10 });
                }
            }
            
        } else {
            // 3. Energy Retrieval Logic
            let target: any = null;

            // A. Target Fixation: Check memory
            if (creep.memory.targetId) {
                target = Game.getObjectById(creep.memory.targetId as Id<any>);
                const hasResources = target && (
                    ('store' in target && target.store.getUsedCapacity(RESOURCE_ENERGY) > 0) || 
                    ('amount' in target && target.amount > 0)
                );
                if (!hasResources) {
                    delete creep.memory.targetId;
                    target = null;
                }
            }

            if (!target) {
                // Priority 0: Immediate Energy (Structures/Loot within range 2)
                const immediateSource = creep.pos.findInRange(FIND_STRUCTURES, 2, {
                    filter: (s) => (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) &&
                                    s.store.getUsedCapacity(RESOURCE_ENERGY) > 100
                })[0] || creep.pos.findInRange(FIND_DROPPED_RESOURCES, 2, {
                    filter: (r) => r.resourceType === RESOURCE_ENERGY && r.amount > 50
                })[0];

                if (immediateSource) {
                    target = immediateSource;
                    creep.memory.targetId = target.id;
                }

                // Priority 1: Nearby Source (Local range 5) - Only if no immediate container
                if (!target) {
                    const nearbySource = creep.pos.findInRange(FIND_SOURCES_ACTIVE, 5, {
                        filter: (s) => !COLONY_SETTINGS.ignoredSources.includes(s.id as any)
                    })[0];
                    if (nearbySource) {
                        if (creep.harvest(nearbySource) === ERR_NOT_IN_RANGE) {
                            creep.moveTo(nearbySource, { visualizePathStyle: { stroke: '#ffaa00' } });
                        }
                        return;
                    }
                }

                // Priority 2: Structures & Loot (Path-aware) - Global search
                if (!target) {
                    const candidates: (StructureContainer | StructureStorage | Tombstone | Resource | Ruin)[] = [
                        ...creep.room.find(FIND_STRUCTURES, {
                            filter: (s) => (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) &&
                                            s.store.getUsedCapacity(RESOURCE_ENERGY) > 100
                        }) as (StructureContainer | StructureStorage)[],
                        ...creep.room.find(FIND_RUINS, { filter: r => r.store.getUsedCapacity(RESOURCE_ENERGY) > 0 }),
                        ...creep.room.find(FIND_TOMBSTONES, { filter: t => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0 }),
                        ...creep.room.find(FIND_DROPPED_RESOURCES, { filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 50 })
                    ];

                    target = creep.pos.findClosestByPath(candidates);
                    if (target) {
                        creep.memory.targetId = target.id;
                    }
                }
            }

            if (target) {
                const action = (target instanceof Resource) 
                    ? creep.pickup(target) 
                    : creep.withdraw(target, RESOURCE_ENERGY);
                
                if (action === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' }, reusePath: 10 });
                }
            } else {
                // FALLBACK: Harvest
                const sources = creep.room.find(FIND_SOURCES_ACTIVE);
                const source = creep.pos.findClosestByPath(sources, {
                    filter: (s) => !COLONY_SETTINGS.ignoredSources.includes(s.id as any)
                });
                
                if (source) {
                    if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
                    }
                }
            }
        }
    }
};