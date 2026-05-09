import { COLONY_SETTINGS } from '../config/settings';


export const roleUpgrader: RoleHandler = {
    run(creep: Creep): void {
        const controller = creep.room.controller;
        if (!controller) return;

        // 1. Identify Infrastructure
        const container = controller.pos.findInRange(FIND_STRUCTURES, 1, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        })[0] as StructureContainer | undefined;

        // Check memory for controllerLink, fallback to search
        let link = Game.getObjectById(creep.room.memory.controllerLink as Id<StructureLink>);
        if (!link) {
            link = controller.pos.findInRange(FIND_MY_STRUCTURES, 3, {
                filter: s => s.structureType === STRUCTURE_LINK
            })[0] as StructureLink | undefined;
        }

        // 2. Siphon Logic: Pull from Link (Priority) or Container every tick if we have space
        if (creep.store.getFreeCapacity() > 0) {
            if (link && link.store[RESOURCE_ENERGY] > 0 && creep.pos.getRangeTo(link) <= 1) {
                creep.withdraw(link, RESOURCE_ENERGY);
            } else if (container && container.store[RESOURCE_ENERGY] > 0 && creep.pos.getRangeTo(container) <= 1) {
                creep.withdraw(container, RESOURCE_ENERGY);
            }
        }

        // 3. State Management
        const hasLocalEnergy = (container && container.store[RESOURCE_ENERGY] > 0) || (link && link.store[RESOURCE_ENERGY] > 0);
        
        if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0 && !hasLocalEnergy) {
            creep.memory.working = false;
            creep.say('🔍 Fetch');
        }
        if (!creep.memory.working && (creep.store.getUsedCapacity() > 0 || hasLocalEnergy)) {
            creep.memory.working = true;
            creep.say('⚡ Upgrade');
        }

        // 4. Execution
        if (creep.memory.working) {
            // Position ourselves
            if (container) {
                // Stay on container
                if (!creep.pos.isEqualTo(container.pos)) {
                    creep.moveTo(container, { range: 0 });
                }
            } else if (link) {
                // If no container but link exists, stay in range 1 of link
                if (creep.pos.getRangeTo(link) > 1) {
                    creep.moveTo(link, { range: 1 });
                }
            }

            const result = creep.upgradeController(controller);
            if (result === ERR_NOT_IN_RANGE) {
                // Ensure we are in range of controller (priority if link/container positioning fails)
                creep.moveTo(controller, { range: 3 });
            }

            // Passive Repair
            if (container && container.hits < container.hitsMax * 0.8) {
                creep.repair(container);
            }
        } else {
            // Refill Phase: Go to the nearest non-controller container or storage
            let target = Game.getObjectById(creep.memory.targetId as Id<any>);
            
            if (!target || (target instanceof Structure && target.store.getUsedCapacity(RESOURCE_ENERGY) === 0)) {
                target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: (s) => (s.structureType === STRUCTURE_STORAGE || s.structureType === STRUCTURE_CONTAINER) &&
                                 s.id !== container?.id && s.id !== link?.id && s.store.getUsedCapacity(RESOURCE_ENERGY) > 0
                });
                if (target) creep.memory.targetId = target.id;
            }

            if (target) {
                if (creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { range: 1, visualizePathStyle: { stroke: '#ffaa00' } });
                }
            }
        }
    }
};