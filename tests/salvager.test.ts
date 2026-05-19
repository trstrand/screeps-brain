import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
    (globalThis as any).OK = 0;
    (globalThis as any).ERR_NOT_IN_RANGE = -9;
    (globalThis as any).FIND_RUINS = 118;
    (globalThis as any).FIND_DROPPED_RESOURCES = 106;
    (globalThis as any).FIND_TOMBSTONES = 119;
    (globalThis as any).FIND_STRUCTURES = 101;
    (globalThis as any).STRUCTURE_CONTAINER = 'container';
    (globalThis as any).STRUCTURE_STORAGE = 'storage';
    (globalThis as any).STRUCTURE_TERMINAL = 'terminal';
    (globalThis as any).FIND_HOSTILE_STRUCTURES = 109;
    (globalThis as any).FIND_MY_SPAWNS = 1;
    (globalThis as any).RESOURCE_ENERGY = 'energy';
});

import { roleSalvager } from '../src/roles/salvager';

describe('Role: Salvager', () => {
    let mockCreep: any;
    
    beforeEach(() => {
        vi.clearAllMocks();
        mockCreep = {
            name: 'salvager_test',
            memory: { role: 'salvager', working: false },
            room: { name: 'W1N1', find: vi.fn().mockReturnValue([]) },
            pos: { x: 25, y: 25, findClosestByRange: vi.fn().mockReturnValue(null), findInRange: vi.fn().mockReturnValue([]) },
            store: { getFreeCapacity: vi.fn().mockReturnValue(50), getUsedCapacity: vi.fn().mockReturnValue(0), getCapacity: vi.fn().mockReturnValue(50) },
            say: vi.fn(),
            moveTo: vi.fn()
        };
        (globalThis as any).Game = { getObjectById: vi.fn().mockReturnValue(null) };
    });

    it('should switch to delivery mode when full', () => {
        mockCreep.store.getFreeCapacity.mockReturnValue(0);
        mockCreep.store.getUsedCapacity.mockReturnValue(50);
        roleSalvager.run(mockCreep);
        expect(mockCreep.memory.working).toBe(false);
    });

    it('should switch to collecting mode when empty', () => {
        mockCreep.memory.working = false;
        mockCreep.store.getFreeCapacity.mockReturnValue(50);
        mockCreep.store.getUsedCapacity.mockReturnValue(0);
        roleSalvager.run(mockCreep);
        expect(mockCreep.memory.working).toBe(true);
    });
});
