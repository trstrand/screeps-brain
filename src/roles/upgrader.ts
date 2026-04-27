import { COLONY_SETTINGS } from '../config/settings';

export const roleUpgrader: RoleHandler = {
    run(creep: Creep): void {
        // --- 1. DYNAMIC CONTAINER NEGOTIATION ---
        let upgradeContainer = Game.getObjectById(creep.memory.targetContainerId as Id<StructureContainer | StructureLink>);

        if (!upgradeContainer) {
            delete creep.memory.targetContainerId;
            if (creep.room.controller) {
                // Find containers close to the controller (range <= 3 for upgrading)
                // and explicitly exclude containers that are adjacent to sources (source containers)
                let containers = creep.room.find(FIND_STRUCTURES, {
                    filter: s => (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_LINK) &&
                        s.pos.getRangeTo(creep.room.controller!) <= 3 &&
                        s.pos.findInRange(FIND_SOURCES, 1).length === 0
                }) as (StructureContainer | StructureLink)[];

                // Sort to prefer links (especially with energy), then by distance
                containers.sort((a, b) => {
                    const aScore = a.structureType === STRUCTURE_LINK ? (a.store[RESOURCE_ENERGY] > 0 ? 2 : 1) : 0;
                    const bScore = b.structureType === STRUCTURE_LINK ? (b.store[RESOURCE_ENERGY] > 0 ? 2 : 1) : 0;
                    if (aScore !== bScore) return bScore - aScore;
                    return a.pos.getRangeTo(creep.room.controller!) - b.pos.getRangeTo(creep.room.controller!);
                });

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
            delete creep.memory.targetId;
            creep.say('🔍 Get Energy');
        }
        if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
            delete creep.memory.targetId;
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
                return;
            }

            // FALLBACKS (Target Fixation for Fallbacks)
            let target: any = null;
            if (creep.memory.targetId) {
                target = Game.getObjectById(creep.memory.targetId as Id<any>);
                const hasResources = target && (
                    ('store' in target && target.store.getUsedCapacity(RESOURCE_ENERGY) > 0) || 
                    ('amount' in target && target.amount > 0) ||
                    (target instanceof Source && target.energy > 0)
                );
                if (!hasResources) {
                    delete creep.memory.targetId;
                    target = null;
                }
            }

            if (!target) {
                // Fallback A: Loot
                const lootCandidates: (Resource | Tombstone)[] = [
                    ...creep.room.find(FIND_DROPPED_RESOURCES, { filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 50 }),
                    ...creep.room.find(FIND_TOMBSTONES, { filter: t => t.store[RESOURCE_ENERGY] > 0 })
                ];
                target = creep.pos.findClosestByRange(lootCandidates);

                // Fallback B: Other storage/containers
                if (!target) {
                    target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                        filter: s => (s.structureType === STRUCTURE_STORAGE || s.structureType === STRUCTURE_CONTAINER) &&
                            s.store[RESOURCE_ENERGY] > 0 && s.id !== upgradeContainer?.id
                    });
                }

                // Fallback C: Harvest active source
                if (!target) {
                    target = creep.pos.findClosestByRange(FIND_SOURCES_ACTIVE, {
                        filter: (s) => !COLONY_SETTINGS.ignoredSources.includes(s.id as any)
                    });
                }

                if (target) creep.memory.targetId = target.id;
            }

            if (target) {
                const action = ('amount' in target) ? creep.pickup(target) : (('store' in target) ? creep.withdraw(target, RESOURCE_ENERGY) : creep.harvest(target));
                if (action === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' }, reusePath: 10 });
                }
            }
        }
    }
};