import { COLONY_SETTINGS } from '../config.creeps';

export class TowerManager {
    static run(room: Room) {
        const towers = room.find<StructureTower>(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_TOWER
        });

        if (towers.length === 0) return;

        // 1 & 2: Dynamic Threats & Injuries
        const hostiles = room.find(FIND_HOSTILE_CREEPS);
        const injuredCreeps = room.find(FIND_MY_CREEPS, { filter: c => c.hits < c.hitsMax });
        
        // Pre-fetch all structures to sort them into priority buckets efficiently
        const allStructures = room.find(FIND_STRUCTURES);

        // 3. Roads below 50%
        const criticalRoads = allStructures.filter(s => s.structureType === STRUCTURE_ROAD && s.hits < s.hitsMax * 0.5);
        
        // 4. Containers below 75%
        const containers = allStructures.filter(s => s.structureType === STRUCTURE_CONTAINER && s.hits < s.hitsMax * 0.75);

        // 5. Roads below 95%
        const normalRoads = allStructures.filter(s => s.structureType === STRUCTURE_ROAD && s.hits < s.hitsMax * 0.95);

        // 5.5. Core Base Structures (Spawns, Extensions, etc) below 100%
        // Ensures the base doesn't decay while respecting the user's explicit list
        const coreStructures = allStructures.filter(s => 
            s.structureType !== STRUCTURE_ROAD && 
            s.structureType !== STRUCTURE_CONTAINER && 
            s.structureType !== STRUCTURE_WALL && 
            s.structureType !== STRUCTURE_RAMPART && 
            s.hits < s.hitsMax
        );

        // 6. Walls and Ramparts up to COLONY_SETTINGS max
        const wallMaxHits = (COLONY_SETTINGS.roomWallMaxHits && COLONY_SETTINGS.roomWallMaxHits[room.name]) || COLONY_SETTINGS.wallMaxHits;
        const rampartMaxHits = (COLONY_SETTINGS.roomRampartMaxHits && COLONY_SETTINGS.roomRampartMaxHits[room.name]) || COLONY_SETTINGS.rampartMaxHits;

        const wallsAndRamparts = allStructures.filter(s => 
            (s.structureType === STRUCTURE_WALL && s.hits < wallMaxHits) ||
            (s.structureType === STRUCTURE_RAMPART && s.hits < rampartMaxHits)
        );

        for (const tower of towers) {
            // Priority 1: Hostiles
            if (hostiles.length > 0) {
                const target = tower.pos.findClosestByRange(hostiles);
                if (target) tower.attack(target);
            } 
            // Priority 2: Heal Creeps
            else if (injuredCreeps.length > 0) {
                const target = tower.pos.findClosestByRange(injuredCreeps);
                if (target) tower.heal(target);
            } 
            // Priorities 3-6: Repair (Requires Tower Energy > 50%)
            else if (tower.store.getUsedCapacity(RESOURCE_ENERGY) > tower.store.getCapacity(RESOURCE_ENERGY) * 0.5) {
                
                if (coreStructures.length > 0) {
                    // Priority 3: Core Infrastructure (Spawns, Extensions, etc)
                    const target = tower.pos.findClosestByRange(coreStructures);
                    if (target) tower.repair(target);
                } 
                else if (criticalRoads.length > 0) {
                    // Priority 4
                    const target = tower.pos.findClosestByRange(criticalRoads);
                    if (target) tower.repair(target);
                } 
                else if (containers.length > 0) {
                    // Priority 5
                    const target = tower.pos.findClosestByRange(containers);
                    if (target) tower.repair(target);
                } 
                else if (normalRoads.length > 0) {
                    // Priority 6
                    const target = tower.pos.findClosestByRange(normalRoads);
                    if (target) tower.repair(target);
                } 
                else if (wallsAndRamparts.length > 0) {
                    // Priority 7
                    // Always repair the absolute weakest wall/rampart first
                    wallsAndRamparts.sort((a, b) => a.hits - b.hits);
                    tower.repair(wallsAndRamparts[0]);
                }
            }
        }
    }
}
