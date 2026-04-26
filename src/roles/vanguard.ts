import { COLONY_SETTINGS } from '../config.creeps';

export const roleVanguard: RoleHandler = {
    run(creep: Creep): void {
        const targetRoom = creep.memory.targetRoom || COLONY_SETTINGS.defendRoom;

        if (!creep.memory.working && creep.memory.targetId) {
            creep.memory.working = true;
            creep.say('⚔️ Attack');
        }
        if (creep.memory.working && !creep.memory.targetId) {
            creep.memory.working = false;
            creep.say('🛡️ Guard');
        }

        // 1. TRAVEL PHASE
        if (targetRoom && creep.room.name !== targetRoom) {
            creep.moveTo(new RoomPosition(25, 25, targetRoom), { range: 5 });
            if (creep.hits < creep.hitsMax) creep.heal(creep);
            return;
        }

        // 2. SEARCH PHASE
        let target = Game.getObjectById(creep.memory.targetId as Id<Creep | Structure>);

        // Validate target
        if (!target || target.room?.name !== creep.room.name || (target instanceof Structure && target.hits === target.hitsMax)) {
            delete creep.memory.targetId;
            target = null;

            // Priority 1: Hostile Creeps
            const hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
            if (hostiles.length > 0) {
                target = creep.pos.findClosestByRange(hostiles);
            } 
            
            // Priority 2: Invader Cores (Major threats in remote rooms)
            if (!target) {
                const cores = creep.room.find(FIND_HOSTILE_STRUCTURES, {
                    filter: (s) => s.structureType === STRUCTURE_INVADER_CORE
                });
                if (cores.length > 0) {
                    target = creep.pos.findClosestByRange(cores);
                }
            }
            
            // Priority 3: Owned Hostile Structures (Spawns, Extensions, Towers, Ramparts)
            if (!target) {
                const hostileStructures = creep.room.find(FIND_HOSTILE_STRUCTURES, {
                    filter: (s) => {
                        if (s.structureType === STRUCTURE_CONTROLLER) return false;
                        if (s.structureType === STRUCTURE_INVADER_CORE) return false; // Already handled
                        if (s.structureType === STRUCTURE_RAMPART) return COLONY_SETTINGS.attackRamparts;
                        return true; 
                    }
                });
                target = creep.pos.findClosestByRange(hostileStructures);
            }

            // Priority 3: Neutral Walls (Walls must be found via FIND_STRUCTURES)
            if (!target && COLONY_SETTINGS.attackWalls) {
                const walls = creep.room.find(FIND_STRUCTURES, {
                    filter: (s) => s.structureType === STRUCTURE_WALL
                });
                target = creep.pos.findClosestByRange(walls);
            }
            
            if (target) creep.memory.targetId = target.id;
        }

        // 3. ENGAGEMENT & RECYCLE
        if (target) {
            creep.say('⚔️ Attack', true);
            if (creep.attack(target) === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { visualizePathStyle: { stroke: '#ff0000' }, reusePath: 10 });
            }
            // Heal while fighting
            if (creep.hits < creep.hitsMax) creep.heal(creep);
        } else {
            // 4. RECYCLE: No hostiles, no targeted structures left
            creep.say('♻️ Done');
            const spawn = creep.pos.findClosestByRange(FIND_MY_SPAWNS);
            if (spawn) {
                if (spawn.recycleCreep(creep) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(spawn, { visualizePathStyle: { stroke: '#ffffff' } });
                }
            } else {
                // If no spawn here, go home
                const homeRoom = creep.memory.homeRoom;
                if (homeRoom) {
                    creep.moveTo(new RoomPosition(25, 25, homeRoom), { range: 5 });
                }
            }
        }
    }
};