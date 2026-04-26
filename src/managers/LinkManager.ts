import { COLONY_SETTINGS } from '../config/settings';

export class LinkManager {
    /**
     * Handles energy transfers between links in a room.
     * Priority: Source Link -> Controller Link -> Storage Link
     */
    static run(room: Room) {
        const allLinks = room.find<StructureLink>(FIND_MY_STRUCTURES, {
            filter: (s) => s.structureType === STRUCTURE_LINK
        });

        if (allLinks.length < 2) return;

        const controller = room.controller;
        const storage = room.storage;

        // 1. Identify Roles
        const controllerLink = controller ? controller.pos.findInRange(allLinks, 3)[0] : null;
        const storageLink = storage ? storage.pos.findInRange(allLinks, 3)[0] : null;

        const sources = room.find(FIND_SOURCES);
        const sourceLinks = allLinks.filter(l => 
            l.id !== controllerLink?.id && 
            l.id !== storageLink?.id &&
            sources.some(s => l.pos.inRangeTo(s, 2))
        );

        // 2. Transfer Logic (Source -> Controller -> Storage)
        for (const sourceLink of sourceLinks) {
            // Only transfer if we have energy and no cooldown
            if (sourceLink.store.getUsedCapacity(RESOURCE_ENERGY) > 0 && sourceLink.cooldown === 0) {
                
                // Priority 1: Controller Link (if it has space)
                if (controllerLink && controllerLink.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                    sourceLink.transferEnergy(controllerLink);
                } 
                // Priority 2: Storage Link (if controller link is full or missing)
                else if (storageLink && storageLink.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                    sourceLink.transferEnergy(storageLink);
                }
            }
        }

        // Optional/Future: Storage -> Controller link if source links aren't keeping up?
        // For now, sticking strictly to the requested Source -> Controller/Storage flow.
    }
}
