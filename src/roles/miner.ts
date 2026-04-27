import { COLONY_SETTINGS } from '../config/settings';

export const roleMiner: RoleHandler = {
    run(creep: Creep): void {
        // --- 1. ENHANCED ROOM LOCK ---
        const homeRoom = creep.memory.homeRoom;
        if (homeRoom && creep.room.name !== homeRoom) {
            creep.moveTo(new RoomPosition(25, 25, homeRoom), { 
                visualizePathStyle: { stroke: '#ff0000' } 
            });
            creep.say('🏠 Homebound');
            return;
        }

        // --- 2. BORDER SAFETY ---
        if (creep.pos.x === 0 || creep.pos.x === 49 || creep.pos.y === 0 || creep.pos.y === 49) {
            creep.moveTo(new RoomPosition(25, 25, creep.room.name));
            creep.say('🚧 Edge Fix');
            return;
        }

        // --- 3. SOURCE IDENTIFICATION ---
        const sourceIds = creep.room.memory.sourceIds;
        if (!sourceIds || sourceIds.length === 0) return;

        const activeIndex = (creep.memory.sourceIndex !== undefined && creep.memory.sourceIndex < sourceIds.length) 
            ? creep.memory.sourceIndex 
            : 0;

        const sourceId = sourceIds[activeIndex];
        const source = Game.getObjectById(sourceId);

        let activeSource = source;
        if (COLONY_SETTINGS.debug) {
            console.log(`DEBUG: Miner ${creep.name} assigned index ${activeIndex} (ID: ${sourceId}). Current Active: ${activeSource ? activeSource.id : 'None'}`);
        }

        if (!activeSource || COLONY_SETTINGS.ignoredSources.includes(activeSource.id as any)) {
            activeSource = creep.pos.findClosestByPath(FIND_SOURCES, {
                filter: (s) => !COLONY_SETTINGS.ignoredSources.includes(s.id as any) && s.pos.roomName === creep.room.name
            });
            if (COLONY_SETTINGS.debug) {
                console.log(`DEBUG: Miner ${creep.name} falling back to closest source: ${activeSource ? activeSource.id : 'None'}`);
            }
        }

        if (!activeSource) return;

        // --- 4. CONTAINER & LINK CHECK ---
        const container = activeSource.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 1, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        })[0];
        const link = activeSource.pos.findInRange<StructureLink>(FIND_MY_STRUCTURES, 2, {
            filter: s => s.structureType === STRUCTURE_LINK
        })[0];

        // --- 5. STATIC CANISTER MINER (If Container Exists) ---
        if (container) {
            if (!creep.memory.working) {
                creep.memory.working = true;
                creep.say('⛏️ Mining');
            }

            if (!creep.pos.isEqualTo(container.pos)) {
                creep.moveTo(container, { 
                    visualizePathStyle: { stroke: '#ffaa00' },
                    range: 0 // Stand EXACTLY on the container
                });
            } else {
                // If link exists, try to fill it
                if (link && creep.store.getFreeCapacity(RESOURCE_ENERGY) < 10) {
                    creep.transfer(link, RESOURCE_ENERGY);
                }

                if (container.hits < container.hitsMax * 0.99) {
                    if (creep.store[RESOURCE_ENERGY] > 0) {
                        creep.repair(container);
                        creep.say('🔧 Repair');
                    } else if (container.store[RESOURCE_ENERGY] > 0) {
                        creep.withdraw(container, RESOURCE_ENERGY);
                    } else {
                        creep.harvest(activeSource);
                    }
                } else {
                    creep.harvest(activeSource);
                }
            }
            return; // We skip the traditional logic entirely
        }

        // --- 6. TRADITIONAL MINER (If No Container) ---
        if (creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = false;
            creep.say('📦 Full');
        }
        if (!creep.memory.working && creep.store.getUsedCapacity() === 0) {
            creep.memory.working = true;
            creep.say('⛏️ Mining');
        }

        if (creep.memory.working) {
            if (creep.harvest(activeSource) === ERR_NOT_IN_RANGE) {
                creep.moveTo(activeSource, { 
                    visualizePathStyle: { stroke: '#ffaa00' },
                    reusePath: 15,
                    maxOps: 4000 
                });
            }
        } else {
            const target = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
                filter: (s) => (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) &&
                               s.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
                               s.pos.roomName === creep.room.name
            });

            if (target) {
                if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
                }
            } else {
                const spawn = creep.room.find(FIND_MY_SPAWNS)[0];
                if (spawn) {
                    const range = creep.pos.getRangeTo(spawn);
                    if (range < 5) {
                        const path = PathFinder.search(creep.pos, { pos: spawn.pos, range: 5 }, { flee: true }).path;
                        creep.moveByPath(path);
                    } else if (range > 5) {
                        creep.moveTo(spawn, { range: 5 });
                    }
                }
            }
        }
    }
};