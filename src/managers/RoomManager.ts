import { SpawnManager } from './SpawnManager';
import { TowerManager } from './TowerManager';
import { LinkManager } from './LinkManager';
import { COLONY_SETTINGS } from '../config/settings';

export class RoomManager {
    static run() {
        for (const roomName in Game.rooms) {
            const room = Game.rooms[roomName];
            if (!room.controller || !room.controller.my) continue;
            
            // 1. SCANNING: Ensure sources are identified in memory
            if (!room.memory.sourceIds || room.memory.sourceIds.length === 0) {
                const sources = room.find(FIND_SOURCES);
                room.memory.sourceIds = sources.map(s => s.id);
            }

            // 2. SYNC: Map dismantle targets into room memory for haulers and miners
            if (!room.memory.dismantleMiningTarget && COLONY_SETTINGS.dismantleTargets && COLONY_SETTINGS.dismantleTargets[roomName]) {
                room.memory.dismantleMiningTarget = COLONY_SETTINGS.dismantleTargets[roomName] as Id<Structure>;
            }
 
            SpawnManager.run(room);
            TowerManager.run(room);
            LinkManager.run(room);
        }
    }
}
