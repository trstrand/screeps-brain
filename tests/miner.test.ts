import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
    (globalThis as any).OK = 0;
    (globalThis as any).ERR_NOT_IN_RANGE = -9;
    (globalThis as any).FIND_SOURCES = 112;
    (globalThis as any).FIND_STRUCTURES = 101;
    (globalThis as any).FIND_MY_STRUCTURES = 102;
    (globalThis as any).FIND_MY_SPAWNS = 1;
    (globalThis as any).STRUCTURE_CONTAINER = 'container';
    (globalThis as any).STRUCTURE_LINK = 'link';
    (globalThis as any).STRUCTURE_SPAWN = 'spawn';
    (globalThis as any).STRUCTURE_EXTENSION = 'extension';
    (globalThis as any).RESOURCE_ENERGY = 'energy';
    (globalThis as any).RESOURCE_POWER = 'power';
    (globalThis as any).RESOURCE_OPS = 'ops';
});

import { roleMiner } from '../src/roles/miner';
import { COLONY_SETTINGS } from '../src/config/settings';

// Mock RoomPosition class
class MockRoomPosition {
    constructor(public x: number, public y: number, public roomName: string) {}
    isEqualTo(other: any) { return this.x === other.x && this.y === other.y; }
    findInRange() { return []; }
    findClosestByRange() { return null; }
    getRangeTo() { return 1; }
}

(globalThis as any).RoomPosition = MockRoomPosition;

// Mock PathFinder
(globalThis as any).PathFinder = {
    search: vi.fn().mockReturnValue({ path: [] })
};

describe('Role: Miner', () => {
    let mockCreep: any;
    let mockSource: any;
    let mockRoom: any;
    
    beforeEach(() => {
        vi.clearAllMocks();
        
        COLONY_SETTINGS.debug = false;
        COLONY_SETTINGS.ignoredSources = [];

        mockSource = {
            id: 'source_1',
            pos: new MockRoomPosition(25, 25, 'W1N1')
        };
        mockSource.pos.findInRange = vi.fn().mockReturnValue([]);

        mockRoom = {
            name: 'W1N1',
            memory: { sourceIds: ['source_1'] },
            find: vi.fn().mockReturnValue([])
        };

        mockCreep = {
            name: 'miner_test',
            room: mockRoom,
            pos: new MockRoomPosition(10, 10, 'W1N1'),
            memory: { role: 'miner', homeRoom: 'W1N1', sourceIndex: 0, working: true },
            store: {
                getFreeCapacity: vi.fn().mockReturnValue(50),
                getUsedCapacity: vi.fn().mockReturnValue(0)
            },
            say: vi.fn(),
            moveTo: vi.fn(),
            moveByPath: vi.fn(),
            harvest: vi.fn().mockReturnValue((globalThis as any).ERR_NOT_IN_RANGE),
            transfer: vi.fn(),
            repair: vi.fn(),
            withdraw: vi.fn()
        };

        mockCreep.pos.findClosestByRange = vi.fn().mockImplementation((type) => {
            if (type === (globalThis as any).FIND_SOURCES) return mockSource;
            return null;
        });

        (globalThis as any).Game = {
            getObjectById: vi.fn().mockReturnValue(mockSource)
        };
    });

    it('should return to homeRoom if spawned/operating in the wrong room', () => {
        mockCreep.room.name = 'W2N1';
        roleMiner.run(mockCreep);
        
        expect(mockCreep.moveTo).toHaveBeenCalled();
        expect(mockCreep.say).toHaveBeenCalledWith('🏠 Homebound');
    });

    it('should move off the border edges', () => {
        mockCreep.pos.x = 0;
        roleMiner.run(mockCreep);
        
        expect(mockCreep.moveTo).toHaveBeenCalled();
        expect(mockCreep.say).toHaveBeenCalledWith('🚧 Edge Fix');
    });

    it('should move to active source and harvest if no container present', () => {
        roleMiner.run(mockCreep);
        
        expect(mockCreep.harvest).toHaveBeenCalledWith(mockSource);
        expect(mockCreep.moveTo).toHaveBeenCalledWith(mockSource, expect.any(Object));
    });

    it('should move exactly onto a container if one is present next to the source', () => {
        const mockContainer = {
            structureType: 'container',
            pos: new MockRoomPosition(26, 25, 'W1N1'),
            hits: 1000,
            hitsMax: 1000
        };
        
        mockSource.pos.findInRange.mockImplementation((type: number) => {
            if (type === (globalThis as any).FIND_STRUCTURES) return [mockContainer];
            return [];
        });

        roleMiner.run(mockCreep);
        
        // Creep is at 10,10 and container is at 26,25 -> not equal, so should moveTo container with range 0
        expect(mockCreep.moveTo).toHaveBeenCalledWith(mockContainer, expect.objectContaining({ range: 0 }));
    });

    it('should harvest while standing on the container', () => {
        const mockContainer = {
            structureType: 'container',
            pos: new MockRoomPosition(26, 25, 'W1N1'),
            hits: 1000,
            hitsMax: 1000
        };
        
        // Match creep pos to container pos
        mockCreep.pos = mockContainer.pos;

        mockSource.pos.findInRange.mockImplementation((type: number) => {
            if (type === (globalThis as any).FIND_STRUCTURES) return [mockContainer];
            return [];
        });

        roleMiner.run(mockCreep);
        
        expect(mockCreep.harvest).toHaveBeenCalledWith(mockSource);
    });
});
