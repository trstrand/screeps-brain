export class LinkManager {
    static run(room: Room) {
        // --- 1. Identify and Cache Roles ---
        if (Game.time % 100 === 0 || !room.memory.linkCheckDone) {
            const allLinks = room.find<StructureLink>(FIND_MY_STRUCTURES, {
                filter: (s) => s.structureType === STRUCTURE_LINK
            });

            delete room.memory.sourceLink1;
            delete room.memory.sourceLink2;
            delete room.memory.controllerLink;
            delete room.memory.storageLink;

            if (allLinks.length >= 2) {
                const controller = room.controller;
                const storage = room.storage;

                const controllerLink = controller ? controller.pos.findInRange(allLinks, 3)[0] : null;
                const storageLink = storage ? storage.pos.findInRange(allLinks, 3)[0] : null;

                if (controllerLink) room.memory.controllerLink = controllerLink.id;
                if (storageLink) room.memory.storageLink = storageLink.id;

                const sources = room.find(FIND_SOURCES);
                const sourceLinks = allLinks.filter(l => 
                    l.id !== controllerLink?.id && 
                    l.id !== storageLink?.id &&
                    sources.some(s => l.pos.inRangeTo(s, 2))
                );

                if (sourceLinks[0]) room.memory.sourceLink1 = sourceLinks[0].id;
                if (sourceLinks[1]) room.memory.sourceLink2 = sourceLinks[1].id;
            }
            room.memory.linkCheckDone = true;
        }

        const sourceLink1 = Game.getObjectById(room.memory.sourceLink1 as Id<StructureLink>);
        const sourceLink2 = Game.getObjectById(room.memory.sourceLink2 as Id<StructureLink>);
        const controllerLink = Game.getObjectById(room.memory.controllerLink as Id<StructureLink>);
        const storageLink = Game.getObjectById(room.memory.storageLink as Id<StructureLink>);

        // Rule 1: If there are no links in the room, or only one, return, nothing to do
        let activeLinks = 0;
        if (sourceLink1) activeLinks++;
        if (sourceLink2) activeLinks++;
        if (controllerLink) activeLinks++;
        if (storageLink) activeLinks++;

        if (activeLinks < 2) return;

        const hasSourceLink = !!sourceLink1 || !!sourceLink2;

        // --- 2. Transfer Logic ---

        // Rule 2: If link is near source, transmit energy to link near controller...
        // if it exists and if that link/controller < 75% full of energy, 
        // otherwise if a link near room.storage exists, send energy to link/room.storage if it is less than 100% full
        const processSourceLink = (sLink: StructureLink | null) => {
            if (!sLink || sLink.cooldown > 0 || sLink.store.getUsedCapacity(RESOURCE_ENERGY) === 0) return;

            if (controllerLink && controllerLink.store.getUsedCapacity(RESOURCE_ENERGY) < (controllerLink.store.getCapacity(RESOURCE_ENERGY) * 0.75)) {
                sLink.transferEnergy(controllerLink);
                return;
            }

            if (storageLink && storageLink.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                sLink.transferEnergy(storageLink);
                return;
            }
        };

        processSourceLink(sourceLink1);
        processSourceLink(sourceLink2);

        // Rule 3: If there are only links near the room.storage and room.controller, 
        // send energy from the link/room.storage to the link/room.controller if it is less than 75% full of energy
        if (!hasSourceLink && storageLink && controllerLink) {
            if (storageLink.cooldown === 0 && storageLink.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                if (controllerLink.store.getUsedCapacity(RESOURCE_ENERGY) < (controllerLink.store.getCapacity(RESOURCE_ENERGY) * 0.75)) {
                    storageLink.transferEnergy(controllerLink);
                }
            }
        }
    }
}
