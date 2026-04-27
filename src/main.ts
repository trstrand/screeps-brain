import { MemoryManager, RoomManager, CreepManager } from './managers';

// Traffic Management: Override move to push idle or blocking creeps out of the way
const originalMove = Creep.prototype.move;
Creep.prototype.move = function (this: Creep, target: any) {
    if (typeof target === 'number') {
        const direction = target as DirectionConstant;
        const dx = [0, 0, 1, 1, 1, 0, -1, -1, -1][direction];
        const dy = [0, -1, -1, 0, 1, 1, 1, 0, -1][direction];
        const targetX = this.pos.x + dx;
        const targetY = this.pos.y + dy;

        if (targetX >= 0 && targetX <= 49 && targetY >= 0 && targetY <= 49) {
            const targetPos = new RoomPosition(targetX, targetY, this.room.name);
            const creeps = targetPos.lookFor(LOOK_CREEPS);
            
            if (creeps.length > 0) {
                const otherCreep = creeps[0];
                if (otherCreep.my && otherCreep.fatigue === 0) {
                    const role = otherCreep.memory.role ? otherCreep.memory.role.toLowerCase() : '';
                    const isMiner = role.includes('miner');
                    const isUpgrader = role === 'upgrader';

                    if (!isMiner && !isUpgrader) {
                        const oppositeDirection = (((direction - 1) + 4) % 8 + 1) as DirectionConstant;
                        originalMove.call(otherCreep, oppositeDirection as any);
                    }
                }
            }
        }
    }
    return originalMove.call(this, target);
} as any;

export const loop = () => {
    MemoryManager.run();
    RoomManager.run();
    CreepManager.run();
};