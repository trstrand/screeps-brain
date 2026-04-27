import { COLONY_SETTINGS } from '../config/settings';

export class TowerManager {
    static run(room: Room) {
        const towers = room.find<StructureTower>(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_TOWER && s.store.getUsedCapacity(RESOURCE_ENERGY) >= 10
        });

        if (towers.length === 0) return;

        // 1. ATTACK PHASE (Priority: Hostiles with Heal Parts)
        const hostiles = room.find(FIND_HOSTILE_CREEPS);
        if (hostiles.length > 0) {
            // Sort by heal parts: Multi-heal > One-heal > Others
            hostiles.sort((a, b) => {
                const aHeal = a.getActiveBodyparts(HEAL);
                const bHeal = b.getActiveBodyparts(HEAL);
                if (aHeal !== bHeal) return bHeal - aHeal; // More heal parts first
                return towers[0].pos.getRangeTo(a) - towers[0].pos.getRangeTo(b); // Then closest
            });

            const target = hostiles[0];
            if (target) {
                for (const tower of towers) {
                    tower.attack(target);
                }
                // If towers are attacking enemies, no need to run any further find/search code
                return;
            }
        }

        // 2. HEAL PHASE (Injured Friendlies)
        const injuredFriendlies = room.find(FIND_MY_CREEPS, { filter: c => c.hits < c.hitsMax });
        if (injuredFriendlies.length > 0) {
            const target = towers[0].pos.findClosestByRange(injuredFriendlies);
            if (target) {
                for (const tower of towers) {
                    tower.heal(target);
                }
                // If tower is healing friendly, no other search code is needed
                return;
            }
        }

        // 3. REPAIR PHASE (Requires Tower Energy > 50%)
        const repairTowers = towers.filter(t => t.store.getUsedCapacity(RESOURCE_ENERGY) > t.store.getCapacity(RESOURCE_ENERGY) * 0.5);
        if (repairTowers.length === 0) return;

        const wallMaxHits = (COLONY_SETTINGS.roomWallMaxHits && COLONY_SETTINGS.roomWallMaxHits[room.name]) || 1000;
        const rampartMaxHits = (COLONY_SETTINGS.roomRampartMaxHits && COLONY_SETTINGS.roomRampartMaxHits[room.name]) || 1000;

        // Shared repair target across all towers in the room
        let target = Game.getObjectById(room.memory.towerRepairTargetId as Id<Structure>);

        // Target Validation & "Search for others" logic
        if (target) {
            const isRoadCont = target.structureType === STRUCTURE_ROAD || target.structureType === STRUCTURE_CONTAINER;
            
            // "if target is repaired above 50%, search for other roads or containers below 25%"
            if (isRoadCont && target.hits > target.hitsMax * 0.5) {
                const hasCritical = room.find(FIND_STRUCTURES, {
                    filter: s => (s.structureType === STRUCTURE_ROAD || s.structureType === STRUCTURE_CONTAINER) && s.hits < s.hitsMax * 0.25
                }).length > 0;
                if (hasCritical) target = null;
            }

            // General completion check
            if (target && (
                target.hits >= target.hitsMax || 
                (target.structureType === STRUCTURE_WALL && target.hits >= wallMaxHits) ||
                (target.structureType === STRUCTURE_RAMPART && target.hits >= rampartMaxHits)
            )) {
                target = null;
            }
        }

        // Search logic (Throttle search but allow immediate search if no target exists)
        if (!target || Game.time % 20 === 0) {
            const allStructures = room.find(FIND_STRUCTURES);

            // A. Roads/Containers < 25% (Critical)
            const critical = allStructures.filter(s => 
                (s.structureType === STRUCTURE_ROAD || s.structureType === STRUCTURE_CONTAINER) && 
                s.hits < s.hitsMax * 0.25
            );
            if (critical.length > 0) target = repairTowers[0].pos.findClosestByRange(critical);

            // B. Walls/Ramparts < 100 hits
            if (!target) {
                const emergencyWalls = allStructures.filter(s => 
                    (s.structureType === STRUCTURE_WALL || s.structureType === STRUCTURE_RAMPART) && 
                    s.hits < 100
                );
                if (emergencyWalls.length > 0) target = repairTowers[0].pos.findClosestByRange(emergencyWalls);
            }

            // C. Roads/Containers < 90% (Maintenance)
            if (!target) {
                const maintenance = allStructures.filter(s => 
                    (s.structureType === STRUCTURE_ROAD || s.structureType === STRUCTURE_CONTAINER) && 
                    s.hits < s.hitsMax * 0.9
                );
                if (maintenance.length > 0) target = repairTowers[0].pos.findClosestByRange(maintenance);
            }

            // D. Ramparts < Settings Max
            if (!target) {
                const ramparts = allStructures.filter(s => s.structureType === STRUCTURE_RAMPART && s.hits < rampartMaxHits);
                if (ramparts.length > 0) target = repairTowers[0].pos.findClosestByRange(ramparts);
            }

            // E. Walls < Settings Max
            if (!target) {
                const walls = allStructures.filter(s => s.structureType === STRUCTURE_WALL && s.hits < wallMaxHits);
                if (walls.length > 0) target = repairTowers[0].pos.findClosestByRange(walls);
            }

            if (target) {
                room.memory.towerRepairTargetId = target.id;
            } else {
                delete room.memory.towerRepairTargetId;
            }
        }

        // Final Execution for Repair
        if (target) {
            for (const tower of repairTowers) {
                tower.repair(target);
            }
        }
    }
}
