import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
    (globalThis as any).OK = 0;
    (globalThis as any).ERR_NOT_IN_RANGE = -9;
    (globalThis as any).FIND_DROPPED_RESOURCES = 106;
    (globalThis as any).FIND_MY_STRUCTURES = 102;
    (globalThis as any).FIND_STRUCTURES = 101;
    (globalThis as any).FIND_SOURCES = 112;
    (globalThis as any).FIND_MY_SPAWNS = 1;
    (globalThis as any).FIND_RUINS = 118;
    (globalThis as any).FIND_TOMBSTONES = 119;
    (globalThis as any).STRUCTURE_SPAWN = 'spawn';
    (globalThis as any).STRUCTURE_EXTENSION = 'extension';
    (globalThis as any).STRUCTURE_TOWER = 'tower';
    (globalThis as any).STRUCTURE_CONTAINER = 'container';
    (globalThis as any).STRUCTURE_STORAGE = 'storage';
    (globalThis as any).RESOURCE_ENERGY = 'energy';
    (globalThis as any).RESOURCE_POWER = 'power';
    (globalThis as any).RESOURCE_OPS = 'ops';
});

import { roleHauler } from '../src/roles/hauler';

describe('Role: Hauler', () => {
    let mockCreep: any;
    
    beforeEach(() => {
        vi.clearAllMocks();

        mockCreep = {
            name: 'hauler_test',
            memory: { role: 'hauler', working: false },
            room: {
                name: 'W1N1',
                memory: {},
                find: vi.fn().mockReturnValue([])
            },
            pos: {
                findClosestByRange: vi.fn().mockReturnValue(null),
                getRangeTo: vi.fn().mockReturnValue(5)
            },
            store: {
                getCapacity: vi.fn().mockReturnValue(50),
                getFreeCapacity: vi.fn().mockReturnValue(50),
                getUsedCapacity: vi.fn().mockReturnValue(0),
                [RESOURCE_ENERGY]: 0
            },
            say: vi.fn(),
            moveTo: vi.fn(),
            pickup: vi.fn().mockReturnValue((globalThis as any).ERR_NOT_IN_RANGE),
            transfer: vi.fn().mockReturnValue((globalThis as any).ERR_NOT_IN_RANGE),
            withdraw: vi.fn().mockReturnValue((globalThis as any).ERR_NOT_IN_RANGE)
        };

        (globalThis as any).Game = {
            getObjectById: vi.fn().mockReturnValue(null)
        };
    });

    it('should switch to deposit mode when full', () => {
        mockCreep.store.getFreeCapacity.mockReturnValue(0);
        mockCreep.store.getUsedCapacity.mockReturnValue(50);
        mockCreep.store[RESOURCE_ENERGY] = 50;
        roleHauler.run(mockCreep);
        
        expect(mockCreep.memory.working).toBe(true);
        expect(mockCreep.say).toHaveBeenCalledWith('📦 Deposit');
    });

    it('should switch to collecting mode when empty', () => {
        mockCreep.memory.working = true;
        mockCreep.store.getUsedCapacity.mockReturnValue(0);
        
        roleHauler.run(mockCreep);
        
        expect(mockCreep.memory.working).toBe(false);
        expect(mockCreep.say).toHaveBeenCalledWith('🔄 Loading');
    });

    // Hauler code is massive (25k bytes), so this is a simplified stub test suite.
    // Full coverage of hauler would require mocking of its entire decision tree.
});
