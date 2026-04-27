import { COLONY_SETTINGS } from '../config/settings';

export const roleExpedition: RoleHandler = {
    run(creep: Creep): void {
        const targetRoom = creep.memory.targetRoom;

        // --- 0. BORDER SAFETY ---
        if (creep.pos.x === 0 || creep.pos.x === 49 || creep.pos.y === 0 || creep.pos.y === 49) {
            creep.moveTo(new RoomPosition(25, 25, creep.room.name));
            creep.say('🚧 Edge Fix');
            return;
        }

        if (!creep.memory.working && creep.room.name === targetRoom) {
            creep.memory.working = true;
            creep.say('🚩 Arrived');
        }
        if (creep.memory.working && creep.room.name !== targetRoom) {
            creep.memory.working = false;
            creep.say('🗺️ Travel');
        }

        if (!targetRoom) {
            creep.say('❓ No Dest');
            return;
        }

        // --- 1. TRAVEL PHASE ---
        if (creep.room.name !== targetRoom) {
            creep.moveTo(new RoomPosition(25, 25, targetRoom), { 
                visualizePathStyle: { stroke: '#00ffff' },
                reusePath: 50
            });
            creep.say('🛰️ Traveling');
            return;
        }

        // --- 2. THE ACTION PHASE ---
        // This code ONLY runs once creep.room.name === targetRoom
        const controller = creep.room.controller;
        if (controller) {
            // Sign the controller
            if (!controller.sign || controller.sign.text !== "Future Territory") {
                creep.signController(controller, "Future Territory");
            }

            // A. ATTACK PHASE: If it's an enemy or reserved by an enemy
            const isEnemyOwned = controller.owner && !controller.my;
            const isEnemyReserved = controller.reservation && controller.reservation.username !== creep.owner.username;

            if (isEnemyOwned || isEnemyReserved) {
                const result = creep.attackController(controller);
                if (result === ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller, { visualizePathStyle: { stroke: '#ff0000' } });
                } else if (result !== OK) {
                    creep.say(`❌ Err ${result}`);
                } else {
                    creep.say('💥 Attack');
                }
                return;
            }

            // B. CLAIM/RESERVE PHASE: If the coast is clear
            const claimResult = creep.claimController(controller);
            if (claimResult === ERR_NOT_IN_RANGE) {
                creep.moveTo(controller, { visualizePathStyle: { stroke: '#00ffff' }, reusePath: 10 });
            } else if (claimResult === ERR_GCL_NOT_ENOUGH) {
                creep.reserveController(controller);
                creep.say('📑 Reserve');
            } else if (claimResult === OK) {
                creep.say('🎉 Claimed!');
            }
        }
    }
};