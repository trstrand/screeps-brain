export const roleDefender: RoleHandler = {
    run(creep: Creep): void {
        if (!creep.memory.working && creep.memory.targetId) {
            creep.memory.working = true;
            creep.say('⚔️ Engage');
        }
        if (creep.memory.working && !creep.memory.targetId) {
            creep.memory.working = false;
            creep.say('🛡️ Guard');
        }

        // 1. Stay in home room if no enemies are present
        const homeRoom = creep.memory.homeRoom;
        if (homeRoom && creep.room.name !== homeRoom && !creep.room.find(FIND_HOSTILE_CREEPS).length) {
            creep.moveTo(new RoomPosition(25, 25, homeRoom), { range: 5 });
            return;
        }

        // 2. Find Hostile Targets
        const attackHealer = creep.memory.attackHealer ?? false;
        let target = Game.getObjectById(creep.memory.targetId as Id<Creep>);

        // Re-evaluate target if:
        // - We don't have one
        // - It's in a different room
        // - It's dead
        // - OR attackHealer is on and a healer is now present
        let shouldReevaluate = !target || target.room.name !== creep.room.name;
        
        if (!shouldReevaluate && attackHealer && target && target.getActiveBodyparts(HEAL) <= 1) {
            const hasHealers = creep.room.find(FIND_HOSTILE_CREEPS, { 
                filter: h => h.getActiveBodyparts(HEAL) > 1 
            }).length > 0;
            if (hasHealers) shouldReevaluate = true;
        }

        if (shouldReevaluate) {
            const hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
            
            if (hostiles.length > 0) {
                if (attackHealer) {
                    // Priority Target Selection:
                    // 1. Healers (Multiple HEAL parts) - These negate our damage and must die first
                    const healers = hostiles.filter(h => h.getActiveBodyparts(HEAL) > 1);
                    
                    // 2. Armed Hostiles (ATTACK or RANGED_ATTACK)
                    const armedHostiles = hostiles.filter(h => 
                        h.getActiveBodyparts(ATTACK) > 0 || h.getActiveBodyparts(RANGED_ATTACK) > 0
                    );

                    if (healers.length > 0) {
                        target = creep.pos.findClosestByRange(healers);
                    } else if (armedHostiles.length > 0) {
                        target = creep.pos.findClosestByRange(armedHostiles);
                    } else {
                        target = creep.pos.findClosestByRange(hostiles);
                    }
                } else {
                    // Just find the closest hostile creep
                    target = creep.pos.findClosestByRange(hostiles);
                }

                if (target) creep.memory.targetId = target.id;
            }
        }

        // 3. Engagement & Idle Logic
        if (target) {
            // Reset idle timer when a target is found
            creep.memory.idleTicks = 0;

            creep.say('⚔️ ATTACK', true);
            const result = creep.attack(target);
            
            if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { 
                    visualizePathStyle: { stroke: '#ff0000', lineStyle: 'dashed' },
                    reusePath: 0 // Defenders need to react instantly to movement
                });
            }
        } else {
            // 4. Idle / Patrol Logic
            creep.say('🛡️ Guard');

            // Increment idle timer
            creep.memory.idleTicks = (creep.memory.idleTicks || 0) + 1;

            // Recycle if idle for too long (75 ticks)
            if (creep.memory.idleTicks >= 75) {
                creep.say('♻️ Recycle');
                creep.memory.recycle = true;
                return;
            }

            // Move to a central point or a rampart near the entrance
            const controller = creep.room.controller;
            if (controller && !creep.pos.inRangeTo(controller, 5)) {
                creep.moveTo(controller, { range: 5 });
            }
        }
    }
};