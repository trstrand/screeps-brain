export const roleClaimer: RoleHandler = {
    run(creep: Creep): void {
        const targetRoom = creep.memory.targetRoom;

        // 1. Move to Target Room
        if (targetRoom && creep.room.name !== targetRoom) {
            creep.moveTo(new RoomPosition(25, 25, targetRoom), { 
                range: 20,
                visualizePathStyle: { stroke: '#cc00ff', lineStyle: 'dashed' } 
            });
            creep.say('🚩 claiming');
            return;
        }

        // 2. Claim Controller
        if (creep.room.controller) {
            if (!creep.room.controller.my) {
                const result = creep.claimController(creep.room.controller);
                if (result === ERR_NOT_IN_RANGE) {
                    creep.moveTo(creep.room.controller, { visualizePathStyle: { stroke: '#cc00ff' } });
                } else if (result === ERR_GCL_NOT_ENOUGH) {
                    // Fallback to reserving if GCL isn't high enough
                    const reserveResult = creep.reserveController(creep.room.controller);
                    if (reserveResult === ERR_NOT_IN_RANGE) {
                        creep.moveTo(creep.room.controller, { visualizePathStyle: { stroke: '#cc00ff' } });
                    }
                }
            } else {
                creep.say('👑 owned');
            }
        }
    }
};
