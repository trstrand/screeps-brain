import { COLONY_SETTINGS } from '../config/settings';
import { RoleHandler } from '../types';

export const roleUpgrader: RoleHandler = {
    run(creep: Creep): void {
        // --- 1. IDENTIFY INFRASTRUCTURE ---
        const controller = creep.room.controller;
        if (!controller) return;

        // Find the one container near the controller (range 1)
        const container = controller.pos.findInRange(FIND_STRUCTURES, 1, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        })[0] as StructureContainer | undefined;

        // Find the link near the controller (range 3)
        const link = controller.pos.findInRange(FIND_MY_STRUCTURES, 3, {
            filter: s => s.structureType === STRUCTURE_LINK
        })[0] as StructureLink | undefined;

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

        // --- 3. WORK PHASE ---
        if (creep.memory.working) {
            if (container) {
                // Static Upgrader Logic: Stand directly on the container
                if (!creep.pos.isEqualTo(container.pos)) {
                    creep.moveTo(container, { range: 0, visualizePathStyle: { stroke: '#ffffff' } });
                }

                if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller, { range: 3 });
                }

                // Repair container under feet if damaged
                if (container.hits < container.hitsMax * 0.99) {
                    creep.repair(container);
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
            if (container) {
                // Priority 1: Pull from the Link if it has energy
                if (link && link.store[RESOURCE_ENERGY] > 0) {
                    if (creep.withdraw(link, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(container, { range: 0 }); // Move to the container to pull from the link
                    }
                    return;
                }
                
                // Priority 2: Pull from the Container
                if (container.store[RESOURCE_ENERGY] > 0) {
                    if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(container, { range: 0 });
                    }
                    return;
                }
            }

            // --- FALLBACKS --- (If no container, or if container and link are both empty)
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

                // Fallback B: Other storage/containers (Not the controller container)
                if (!target) {
                    target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                        filter: s => (s.structureType === STRUCTURE_STORAGE || s.structureType === STRUCTURE_CONTAINER) &&
                            s.store[RESOURCE_ENERGY] > 0 && s.id !== container?.id
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