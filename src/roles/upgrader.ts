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
        let link: StructureLink | null | undefined = Game.getObjectById(creep.room.memory.controllerLink as Id<StructureLink>);
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
            // Position ourselves: 
            // - If we are on the container, stay there.
            // - If we aren't, move to range 1 of the container/link (or range 0 if it's empty).
            const onSpot = container && creep.pos.isEqualTo(container.pos);
            
            if (container && !onSpot) {
                // Try to get on the container, but don't get stuck if it's occupied
                const isOccupied = container.pos.lookFor(LOOK_CREEPS).length > 0;
                if (!isOccupied) {
                    creep.moveTo(container, { range: 0 });
                } else {
                    creep.moveTo(container, { range: 1 });
                }
            } else if (link && !onSpot) {
                creep.moveTo(link, { range: 1 });
            }

            const result = creep.upgradeController(controller);
            if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(controller, { range: 3 });
            }

            // Passive Repair
            if (container && creep.pos.isEqualTo(container.pos) && container.hits < container.hitsMax * 0.8) {
                creep.repair(container);
            }
        } else {
            // Refill Phase: Go to the nearest non-controller container or storage
            let target = Game.getObjectById(creep.memory.targetId as Id<StructureStorage | StructureContainer>);
            
            if (!target || target.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
                if (creep.room.storage && creep.room.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                    target = creep.room.storage;
                    creep.memory.targetId = target.id;
                }
            }

            if (target) {
                if (creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { range: 1, visualizePathStyle: { stroke: '#ffaa00' } });
                }
            }
        }
    }
};