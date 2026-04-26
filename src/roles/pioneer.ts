import { COLONY_SETTINGS } from '../config/settings';

export const rolePioneer: RoleHandler = {
    run(creep: Creep): void {
        const targetRoom = creep.memory.targetRoom;
        const homeRoom = creep.memory.homeRoom;
        if (!targetRoom) return;

        // Initialize dismantleWork if it doesn't exist to allow manual toggle
        if (creep.memory.dismantleWork === undefined) {
            creep.memory.dismantleWork = true;
        }
        if (creep.memory.dismantleExtensions === undefined) {
            creep.memory.dismantleExtensions = false;
        }

        // --- 0. BORDER SAFETY ---
        if (creep.pos.x === 0 || creep.pos.x === 49 || creep.pos.y === 0 || creep.pos.y === 49) {
            creep.moveTo(new RoomPosition(25, 25, creep.room.name));
            creep.say('🚧 Edge Fix');
            return;
        }

        // --- 1. STATE MACHINE ---
        // Toggle working state based on energy levels
        if (creep.memory.working && creep.store.getUsedCapacity() === 0) {
            creep.memory.working = false;
            delete creep.memory.targetId;
            creep.say('🔍 Refill');
        }
        if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
            delete creep.memory.targetId;
            creep.say('🏗️ Work');
        }

        // --- 2. LOGISTIC BRAIN: WHERE SHOULD I BE? ---
        
        // IF NOT WORKING: We need energy.
        if (!creep.memory.working) {
            // If we are in the Home Room, stay here and fill up before leaving
            // If we are already in the Target Room, we stay there to refill via dismantling/harvesting
            this.handleRefill(creep);
            return;
        }

        // IF WORKING: We have energy, now we need to be in the Target Room to spend it.
        if (creep.memory.working) {
            if (creep.room.name !== targetRoom) {
                creep.moveTo(new RoomPosition(25, 25, targetRoom), { 
                    visualizePathStyle: { stroke: '#ffffff' },
                    reusePath: 50 
                });
                creep.say('🛰️ Traveling');
                return; 
            }
            // If we are in the Target Room and working, run the colonize logic
            this.handleWork(creep, targetRoom);
        }
    },

    /**
     * Logic for gathering energy
     */
    handleRefill(creep: Creep): void {
        const targetRoom = creep.memory.targetRoom;
        const homeRoom = creep.memory.homeRoom;

        // If we are not in Home or Target room, we should probably be moving towards one of them
        // unless we found energy in the current room.
        if (creep.room.name !== homeRoom && creep.room.name !== targetRoom) {
            // Priority: Get to HomeRoom to refill if we are empty and in transit
            creep.moveTo(new RoomPosition(25, 25, homeRoom!), { visualizePathStyle: { stroke: '#ffaa00' } });
            creep.say('🛰️ To Home');
            return;
        }

        // --- TARGET FIXATION ---
        let target = Game.getObjectById(creep.memory.targetId as Id<any>);
        
        // Validate existing target
        if (target) {
            const isEmpty = ('store' in target) ? target.store.getUsedCapacity(RESOURCE_ENERGY) === 0 : 
                          ('amount' in target) ? target.amount === 0 : false;
            const isSource = ('energy' in target);
            if (isEmpty || (isSource && target.energy === 0)) {
                target = null;
                delete creep.memory.targetId;
            }
        }

        if (!target) {
            // --- PRIORITY 0: DISMANTLE PREVIOUS PLAYER EXTENSIONS (Manual Flag) ---
            if (creep.memory.dismantleExtensions && creep.room.name === targetRoom) {
                target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: (s) => s.structureType === STRUCTURE_EXTENSION && !((s as any).my)
                });
                if (target) {
                    creep.memory.targetId = target.id;
                }
            }

            // --- PRIORITY 1: DISMANTLE (Only if in Target Room and enabled) ---
            if (!target) {
                const dismantleTargetId = COLONY_SETTINGS.dismantleTargets[creep.room.name];
                if (creep.memory.dismantleWork !== false && creep.room.name === targetRoom && dismantleTargetId) {
                    const possibleTarget = Game.getObjectById(dismantleTargetId as Id<Structure>);
                    if (possibleTarget) {
                        target = possibleTarget;
                        creep.memory.targetId = target.id;
                    }
                }
            }

            // --- PRIORITY 2: DROPPED ENERGY / LOOT ---
            if (!target) {
                target = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
                    filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 50
                }) || creep.pos.findClosestByRange(FIND_TOMBSTONES, {
                    filter: t => t.store[RESOURCE_ENERGY] > 0
                }) || creep.pos.findClosestByRange(FIND_RUINS, {
                    filter: r => r.store.getUsedCapacity(RESOURCE_ENERGY) > 0
                });
                if (target) creep.memory.targetId = target.id;
            }

            // --- PRIORITY 3: STORAGE/CONTAINERS ---
            if (!target) {
                target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: (s) => (s.structureType === STRUCTURE_CONTAINER || 
                                (s.structureType === STRUCTURE_STORAGE && (s as StructureStorage).my)) &&
                                s.store.getUsedCapacity(RESOURCE_ENERGY) > 200
                });
                if (target) creep.memory.targetId = target.id;
            }

            // --- PRIORITY 4: HARVEST ---
            if (!target) {
                target = creep.pos.findClosestByRange(FIND_SOURCES_ACTIVE, {
                    filter: (s) => !COLONY_SETTINGS.ignoredSources.includes(s.id as any)
                });
                if (target) creep.memory.targetId = target.id;
            }
        }

        // --- EXECUTION ---
        if (target) {
            let result;
            if ('structureType' in target) {
                // It's a structure (Container/Storage/Dismantle target)
                if (target.structureType === STRUCTURE_CONTAINER || target.structureType === STRUCTURE_STORAGE) {
                    result = creep.withdraw(target, RESOURCE_ENERGY);
                } else if (target.structureType === STRUCTURE_SPAWN && (target as any).my) {
                    // SAFETY: Never dismantle my own spawn!
                    delete creep.memory.targetId;
                    return;
                } else {
                    result = creep.dismantle(target);
                }
            } else if ('amount' in target) {
                // It's dropped energy
                result = creep.pickup(target);
            } else if ('energy' in target) {
                // It's a source
                result = creep.harvest(target);
            } else if ('store' in target) {
                // Tombstone or Ruin
                result = creep.withdraw(target, RESOURCE_ENERGY);
            }

            if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' }, reusePath: 15 });
            }
        }
    },

    /**
     * Logic for spending energy in the target room
     */
    handleWork(creep: Creep, targetRoom: string): void {
        // --- TARGET FIXATION ---
        let target = Game.getObjectById(creep.memory.targetId as Id<any>);

        // Validate target
        if (target) {
            if (target.room && target.room.name !== targetRoom) {
                target = null;
                delete creep.memory.targetId;
            } else if ('store' in target && target.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                target = null;
                delete creep.memory.targetId;
            } else if ('progressTotal' in target && !Game.constructionSites[target.id]) {
                // Construction site finished or gone
                target = null;
                delete creep.memory.targetId;
            }
        }

        if (!target) {
            // A. Recharge Spawn/Extensions
            target = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
                filter: (s) => (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) &&
                                s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });

            // B. Emergency Upgrade
            if (!target) {
                const controller = creep.room.controller;
                if (controller && (controller.ticksToDowngrade < 5000 || !controller.my)) {
                    target = controller;
                }
            }

            // C. Construction
            if (!target) {
                target = creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES);
            }

            // D. Standard Upgrade
            if (!target) {
                target = creep.room.controller;
            }

            if (target) creep.memory.targetId = target.id;
        }

        // --- EXECUTION ---
        if (target) {
            let result: ScreepsReturnCode = ERR_INVALID_TARGET;
            
            if (target instanceof StructureController || target.structureType === STRUCTURE_CONTROLLER) {
                result = creep.upgradeController(target as StructureController);
            } else if (target instanceof ConstructionSite || (target as any).progressTotal !== undefined) {
                result = creep.build(target as ConstructionSite);
            } else if ('store' in target) {
                result = creep.transfer(target, RESOURCE_ENERGY);
            }

            if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' }, reusePath: 15 });
            } else if (result === ERR_INVALID_TARGET) {
                // If we somehow got a bad target (like a Source in Work mode), clear it
                delete creep.memory.targetId;
            }
        }
    }
};