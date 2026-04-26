import { MemoryManager, RoomManager, CreepManager } from './managers';

export const loop = () => {
    MemoryManager.run();
    RoomManager.run();
    CreepManager.run();
};