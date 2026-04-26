import { SpawnManager } from './SpawnManager';
import { TowerManager } from './TowerManager';
import { LinkManager } from './LinkManager';

export class RoomManager {
    static run() {
        for (const roomName in Game.rooms) {
            const room = Game.rooms[roomName];
            if (!room.controller || !room.controller.my) continue;
            
            // 1. SCANNING: Ensure sources are identified in memory
            const sources = room.find(FIND_SOURCES);
            if (!room.memory.sourceIds || room.memory.sourceIds.length !== sources.length) {
                room.memory.sourceIds = sources.map(s => s.id);
            }
 
            SpawnManager.run(room);
            TowerManager.run(room);
            LinkManager.run(room);
        }
    }
}
