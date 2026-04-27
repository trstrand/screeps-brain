import { COLONY_SETTINGS } from '../config/settings';

export class TowerManager {
    static run(room: Room) {
        const towers = room.find<StructureTower>(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_TOWER
        });

        if (towers.length === 0) return;

        // 1 & 2: Dynamic Threats & Injuries
        const hostiles = room.find(FIND_HOSTILE_CREEPS);
        const injuredCreeps = room.find(FIND_MY_CREEPS, { filter: c => c.hits < c.hitsMax });
        
        // Lazy-loaded structures so we don't query FIND_STRUCTURES if we're just attacking/healing
        let structuresLoaded = false;
        let criticalRoads: Structure[] = [];
        let containers: Structure[] = [];
        let normalRoads: Structure[] = [];
        let coreStructures: Structure[] = [];
        let wallsAndRamparts: Structure[] = [];

        const wallMaxHits = (COLONY_SETTINGS.roomWallMaxHits && COLONY_SETTINGS.roomWallMaxHits[room.name]) || COLONY_SETTINGS.wallMaxHits;
        const rampartMaxHits = (COLONY_SETTINGS.roomRampartMaxHits && COLONY_SETTINGS.roomRampartMaxHits[room.name]) || COLONY_SETTINGS.rampartMaxHits;

        for (const tower of towers) {
            // A tower requires at least 10 energy to perform ANY action (attack, heal, repair)
            if (tower.store.getUsedCapacity(RESOURCE_ENERGY) < 10) continue;

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
                
                let target = Game.getObjectById(room.memory.towerRepairTargetId as Id<Structure>);

                // Determine if we need to search for a new target
                const needsNewTarget = !target || 
                                       target.hits >= target.hitsMax || 
                                       (target.structureType === STRUCTURE_WALL && target.hits >= wallMaxHits) ||
                                       (target.structureType === STRUCTURE_RAMPART && target.hits >= rampartMaxHits);

                if (needsNewTarget) {
                    target = null;
                    delete room.memory.towerRepairTargetId;

                    // Perform structure search (Throttle search execution but allow it when we have NO target)
                    if (Game.time % 10 === 0 || !target) {
                        if (!structuresLoaded) {
                            const allStructures = room.find(FIND_STRUCTURES);
                            
                            // 1. Emergency Defense (Walls/Ramparts < 1000 hits)
                            const emergencyWalls = allStructures.filter(s => 
                                (s.structureType === STRUCTURE_WALL || s.structureType === STRUCTURE_RAMPART) && 
                                s.hits < 1000
                            );

                            if (emergencyWalls.length > 0) {
                                emergencyWalls.sort((a, b) => a.hits - b.hits);
                                target = emergencyWalls[0];
                            } else {
                                // 2. Normal Maintenance
                                coreStructures = allStructures.filter(s => 
                                    s.structureType !== STRUCTURE_ROAD && 
                                    s.structureType !== STRUCTURE_CONTAINER && 
                                    s.structureType !== STRUCTURE_WALL && 
                                    s.structureType !== STRUCTURE_RAMPART && 
                                    s.hits < s.hitsMax
                                );
                                criticalRoads = allStructures.filter(s => s.structureType === STRUCTURE_ROAD && s.hits < s.hitsMax * 0.5);
                                containers = allStructures.filter(s => s.structureType === STRUCTURE_CONTAINER && s.hits < s.hitsMax * 0.75);
                                normalRoads = allStructures.filter(s => s.structureType === STRUCTURE_ROAD && s.hits < s.hitsMax * 0.95);
                                wallsAndRamparts = allStructures.filter(s => 
                                    (s.structureType === STRUCTURE_WALL && s.hits < wallMaxHits) ||
                                    (s.structureType === STRUCTURE_RAMPART && s.hits < rampartMaxHits)
                                );

                                if (coreStructures.length > 0) target = tower.pos.findClosestByRange(coreStructures);
                                else if (criticalRoads.length > 0) target = tower.pos.findClosestByRange(criticalRoads);
                                else if (containers.length > 0) target = tower.pos.findClosestByRange(containers);
                                else if (normalRoads.length > 0) target = tower.pos.findClosestByRange(normalRoads);
                                else if (wallsAndRamparts.length > 0) {
                                    wallsAndRamparts.sort((a, b) => a.hits - b.hits);
                                    target = wallsAndRamparts[0];
                                }
                            }
                            structuresLoaded = true;
                        }

                        if (target) {
                            room.memory.towerRepairTargetId = target.id;
                        }
                    }
                }

                if (target) {
                    tower.repair(target);
                }
            }
        }
    }
}
