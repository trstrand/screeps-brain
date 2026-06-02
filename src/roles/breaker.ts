import { COLONY_SETTINGS } from '../config/settings';

export const roleBreaker: RoleHandler = {
    run(creep: Creep): void {
        const targetRoom = creep.memory.targetRoom;
        const targetId = creep.memory.targetId;

        // 0. BORDER SAFETY
        if (creep.pos.x === 0 || creep.pos.x === 49 || creep.pos.y === 0 || creep.pos.y === 49) {
            creep.moveTo(new RoomPosition(25, 25, creep.room.name));
            return;
        }

        // 1. TRAVEL PHASE
        if (targetRoom && creep.room.name !== targetRoom) {
            creep.moveTo(new RoomPosition(25, 25, targetRoom), { 
                visualizePathStyle: { stroke: '#ff0000' },
                reusePath: 50
            });
            creep.say('🛰️ Travel');
            return;
        }

        // 2. TARGET VALIDATION & ENGAGEMENT
        let target = targetId ? Game.getObjectById(targetId as Id<any>) as Structure | null : null;

        // If specific target is gone, look for ANY nearby wall/rampart as a fallback
        if (!target) {
            target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: (s) => s.structureType === STRUCTURE_WALL || s.structureType === STRUCTURE_RAMPART
            });
        }

        if (target) {
            // Attempt to attack
            const result = creep.attack(target);
            if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { visualizePathStyle: { stroke: '#ff0000' } });
            }
            
            creep.say('🔨 Breaking', true);

            // 3. SELF-HEAL (Use HEAL parts while attacking)
            if (creep.hits < creep.hitsMax) {
                creep.heal(creep);
            }
        } else {
            creep.say('🏁 Done?');
            // Stand ready or wait for new ID
        }
    }
};
