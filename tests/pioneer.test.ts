import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
    (globalThis as any).OK = 0;
    (globalThis as any).ERR_NOT_IN_RANGE = -9;
    (globalThis as any).FIND_SOURCES = 112;
    (globalThis as any).RESOURCE_ENERGY = 'energy';
    (globalThis as any).FIND_CONSTRUCTION_SITES = 111;
    (globalThis as any).FIND_MY_STRUCTURES = 102;
    (globalThis as any).FIND_RUINS = 118;
    (globalThis as any).FIND_DROPPED_RESOURCES = 106;
    (globalThis as any).FIND_TOMBSTONES = 119;
    (globalThis as any).FIND_STRUCTURES = 101;
    (globalThis as any).STRUCTURE_CONTAINER = 'container';
    (globalThis as any).STRUCTURE_STORAGE = 'storage';
    (globalThis as any).RESOURCE_POWER = 'power';
    (globalThis as any).RESOURCE_OPS = 'ops';
    (globalThis as any).FIND_SOURCES_ACTIVE = 113;
});

import { rolePioneer } from '../src/roles/pioneer';

class MockRoomPosition {
    constructor(public x: number, public y: number, public roomName: string) {}
    isEqualTo(other: any) { return this.x === other.x && this.y === other.y; }
    findInRange() { return []; }
    findClosestByRange() { return null; }
    getRangeTo() { return 1; }
    inRangeTo() { return false; }
}
(globalThis as any).RoomPosition = MockRoomPosition;

describe('Role: Pioneer', () => {
    let mockCreep: any;
    
    beforeEach(() => {
        vi.clearAllMocks();
        mockCreep = {
            name: 'pioneer_test',
            memory: { role: 'pioneer', working: false, targetRoom: 'W2N1' },
            room: { name: 'W1N1', find: vi.fn().mockReturnValue([]) },
            pos: new MockRoomPosition(25, 25, 'W1N1'),
            store: { getFreeCapacity: vi.fn().mockReturnValue(50), getUsedCapacity: vi.fn().mockReturnValue(0) },
            say: vi.fn(),
            moveTo: vi.fn()
        };
        (globalThis as any).Game = { getObjectById: vi.fn().mockReturnValue(null) };
    });

    it('should switch to working mode when full', () => {
        mockCreep.store.getFreeCapacity.mockReturnValue(0);
        rolePioneer.run(mockCreep);
        expect(mockCreep.memory.working).toBe(true);
    });

    it('should switch to fetch mode when empty', () => {
        mockCreep.memory.working = true;
        mockCreep.store.getUsedCapacity.mockReturnValue(0);
        rolePioneer.run(mockCreep);
        expect(mockCreep.memory.working).toBe(false);
    });
});
