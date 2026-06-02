import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
    (globalThis as any).FIND_MY_STRUCTURES = 102;
    (globalThis as any).FIND_SOURCES = 112;
    (globalThis as any).STRUCTURE_LINK = 'link';
    (globalThis as any).RESOURCE_ENERGY = 'energy';
});

import { LinkManager } from '../src/managers/LinkManager';

describe('LinkManager', () => {
    let mockRoom: any;
    
    beforeEach(() => {
        vi.clearAllMocks();
        mockRoom = {
            memory: {},
            find: vi.fn().mockReturnValue([]),
            controller: null,
            storage: null
        };
        (globalThis as any).Game = {
            time: 101,
            getObjectById: vi.fn().mockReturnValue(null)
        };
    });

    it('should run without throwing if no links exist', () => {
        expect(() => LinkManager.run(mockRoom)).not.toThrow();
    });

    it('should transfer energy from source link to controller link', () => {
        const sourceLink = { id: 's1', cooldown: 0, store: { getUsedCapacity: () => 800, getCapacity: () => 800, [RESOURCE_ENERGY]: 800 }, transferEnergy: vi.fn() };
        const controllerLink = { id: 'c1', store: { getUsedCapacity: () => 0, getCapacity: () => 800, [RESOURCE_ENERGY]: 0 } };
        
        mockRoom.memory.sourceLink1 = 's1';
        mockRoom.memory.controllerLink = 'c1';
        mockRoom.memory.linkCheckDone = true; // skip scan
        
        (globalThis as any).Game.getObjectById.mockImplementation((id: string) => {
            if (id === 's1') return sourceLink;
            if (id === 'c1') return controllerLink;
            return null;
        });

        LinkManager.run(mockRoom);
        
        expect(sourceLink.transferEnergy).toHaveBeenCalledWith(controllerLink);
    });
});
