import { COLONY_SETTINGS } from '../config/settings';

export const roleRemoteRepairer: RoleHandler = {
    run(creep: Creep): void {
        const targetRoom = creep.memory.targetRoom;
        
        // 1. Move to Target Room
        if (targetRoom && creep.room.name !== targetRoom) {
            creep.moveTo(new RoomPosition(25, 25, targetRoom), { 
                range: 20,
                visualizePathStyle: { stroke: '#00ff00', lineStyle: 'dashed' } 
            });
            creep.say('🏃 remote');
            return;
        }

        // 2. State Machine: Toggle Working State
        if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = false;
            delete creep.memory.targetId;
            creep.say('🔄 loading');
        }
        if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
            delete creep.memory.targetId;
            creep.say('🔧 repair');
        }

        // 3. Logic Execution
        if (creep.memory.working) {
            // --- PRIORITY 1: Repair Roads and Containers ---
            let target = Game.getObjectById(creep.memory.targetId as Id<Structure>);

            if (!target || target.hits === target.hitsMax) {
                const damagedStructure = creep.room.find(FIND_STRUCTURES, {
                    filter: (s) => (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_ROAD) && 
                                    s.hits < s.hitsMax * 0.9
                });
                
                // Sort by hits to prioritize most damaged
                damagedStructure.sort((a, b) => a.hits - b.hits);
                target = damagedStructure[0];
                
                if (target) {
                    creep.memory.targetId = target.id;
                }
            }

            if (target) {
                if (creep.repair(target) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#00ff00' }, reusePath: 10 });
                }
            } else {
                // No repairs? Fallback to construction sites
                const site = creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES);
                if (site) {
                    if (creep.build(site) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(site, { visualizePathStyle: { stroke: '#ffffff' } });
                    }
                } else {
                    creep.say('💤 idle');
                }
            }
            
        } else {
            // 4. Energy Retrieval Logic
            let target: any = null;

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
                const candidates: (StructureContainer | StructureStorage | Tombstone | Resource | Ruin)[] = [
                    ...creep.room.find(FIND_STRUCTURES, {
                        filter: (s) => (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) &&
                                        s.store.getUsedCapacity(RESOURCE_ENERGY) > 100
                    }) as (StructureContainer | StructureStorage)[],
                    ...creep.room.find(FIND_RUINS, { filter: r => r.store.getUsedCapacity(RESOURCE_ENERGY) > 0 }),
                    ...creep.room.find(FIND_TOMBSTONES, { filter: t => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0 }),
                    ...creep.room.find(FIND_DROPPED_RESOURCES, { filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 50 })
                ];

                target = creep.pos.findClosestByRange(candidates);
                if (target) {
                    creep.memory.targetId = target.id;
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
                const source = creep.pos.findClosestByRange(FIND_SOURCES_ACTIVE, {
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
