import { COLONY_SETTINGS } from '../config.creeps';

export const roleUpgrader: RoleHandler = {
    run(creep: Creep): void {
        // --- 1. DYNAMIC CONTAINER NEGOTIATION ---
        let upgradeContainer = Game.getObjectById(creep.memory.targetContainerId as Id<StructureContainer>);

        if (!upgradeContainer) {
            delete creep.memory.targetContainerId;
            if (creep.room.controller) {
                // Find containers close to the controller (range <= 3 for upgrading)
                // and explicitly exclude containers that are adjacent to sources (source containers)
                let containers = creep.room.find(FIND_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_CONTAINER &&
                        s.pos.getRangeTo(creep.room.controller!) <= 3 &&
                        s.pos.findInRange(FIND_SOURCES, 1).length === 0
                }) as StructureContainer[];

                // Sort by distance to controller to prefer the ones 'directly next' to it
                containers.sort((a, b) => a.pos.getRangeTo(creep.room.controller!) - b.pos.getRangeTo(creep.room.controller!));

                const otherUpgraders = Object.values(Game.creeps).filter(c =>
                    c.memory.role === creep.memory.role &&
                    c.id !== creep.id &&
                    c.memory.targetContainerId
                );
                const claimedIds = otherUpgraders.map(c => c.memory.targetContainerId);

                const availableContainer = containers.find(c => !claimedIds.includes(c.id));

                if (availableContainer) {
                    creep.memory.targetContainerId = availableContainer.id;
                    upgradeContainer = availableContainer;
                }
            }
        }

        // --- 2. STATE MAINTENANCE ---
        if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = false;
            creep.say('🔍 Get Energy');
        }
        if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
            creep.say('⚡ Upgrade');
        }

        const controller = creep.room.controller;
        if (!controller) return;

        // --- 3. WORK PHASE ---
        if (creep.memory.working) {
            if (upgradeContainer) {
                // Static Upgrader Logic
                if (!creep.pos.isEqualTo(upgradeContainer.pos)) {
                    creep.moveTo(upgradeContainer, { range: 0, visualizePathStyle: { stroke: '#ffffff' } });
                }

                if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller, { range: 3 });
                }

                // Auto-repair the container under feet
                const containerAtPos = creep.pos.lookFor(LOOK_STRUCTURES).find(
                    s => s.structureType === STRUCTURE_CONTAINER
                ) as StructureContainer | undefined;
                if (containerAtPos && containerAtPos.hits < containerAtPos.hitsMax * 0.99) {
                    creep.repair(containerAtPos);
                    creep.say('🔧 Repair');
                }
            } else {
                // Traditional Upgrader Logic
                if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller, {
                        visualizePathStyle: { stroke: '#ffffff' },
                        reusePath: 10
                    });
                }
            }
        }
        // --- 4. COLLECTION PHASE ---
        else {
            if (upgradeContainer && upgradeContainer.store[RESOURCE_ENERGY] > 0) {
                if (creep.withdraw(upgradeContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(upgradeContainer, { range: 0 });
                }
            } else {
                // FALLBACKS (Applies to both Traditional and empty-Container Static)

                // Fallback A: Loot (Path-aware)
                const lootCandidates: (Resource | Tombstone)[] = [
                    ...creep.room.find(FIND_DROPPED_RESOURCES, { filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 50 }),
                    ...creep.room.find(FIND_TOMBSTONES, { filter: t => t.store[RESOURCE_ENERGY] > 0 })
                ];
                
                const loot = creep.pos.findClosestByPath(lootCandidates);

                if (loot) {
                    const action = ('amount' in loot) ? creep.pickup(loot as Resource) : creep.withdraw(loot as Tombstone, RESOURCE_ENERGY);
                    if (action === ERR_NOT_IN_RANGE) {
                        creep.moveTo(loot, { visualizePathStyle: { stroke: '#ffaa00' } });
                    }
                }
                // Fallback B: Other storage/containers
                else {
                    const backup = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                        filter: s => (s.structureType === STRUCTURE_STORAGE || s.structureType === STRUCTURE_CONTAINER) &&
                            s.store[RESOURCE_ENERGY] > 0 && s.id !== upgradeContainer?.id
                    });

                    if (backup) {
                        if (creep.withdraw(backup, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                            creep.moveTo(backup, { visualizePathStyle: { stroke: '#ffaa00' } });
                        }
                    }
                    // Fallback C: Harvest active source
                    else {
                        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE, {
                            filter: (s) => !COLONY_SETTINGS.ignoredSources.includes(s.id as any)
                        });

                        if (source) {
                            if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                                creep.moveTo(source, {
                                    visualizePathStyle: { stroke: '#ffaa00' },
                                    maxOps: 4000,
                                    reusePath: 15
                                });
                            }
                        }
                    }
                }
            }
        }
    }
};