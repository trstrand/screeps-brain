import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
    (globalThis as any).OK = 0;
    (globalThis as any).ERR_NOT_IN_RANGE = -9;
    (globalThis as any).RESOURCE_ENERGY = 'energy';
    (globalThis as any).FIND_MY_STRUCTURES = 102;
    (globalThis as any).FIND_DROPPED_RESOURCES = 106;
    (globalThis as any).FIND_TOMBSTONES = 119;
    (globalThis as any).FIND_MINERALS = 116;
    (globalThis as any).STRUCTURE_EXTRACTOR = 'extractor';
    (globalThis as any).RESOURCE_POWER = 'power';
    (globalThis as any).RESOURCE_OPS = 'ops';
});

import { roleMarketHauler } from '../src/roles/marketHauler';

describe('Role: MarketHauler', () => {
    let mockCreep: any;
    
    beforeEach(() => {
        vi.clearAllMocks();
        mockCreep = {
            name: 'market_hauler_test',
            memory: { role: 'marketHauler', working: false },
            room: { name: 'W1N1', terminal: null, storage: null, find: vi.fn().mockReturnValue([]) },
            store: { getFreeCapacity: vi.fn().mockReturnValue(50), getUsedCapacity: vi.fn().mockReturnValue(0), getCapacity: vi.fn().mockReturnValue(50) },
            pos: { findInRange: vi.fn().mockReturnValue([]), findClosestByRange: vi.fn().mockReturnValue(null), getRangeTo: vi.fn().mockReturnValue(5) },
            say: vi.fn(),
            moveTo: vi.fn()
        };
        (globalThis as any).Game = { getObjectById: vi.fn().mockReturnValue(null) };
    });

    it('should switch to deposit mode when full', () => {
        mockCreep.memory.working = false;
        mockCreep.store.getFreeCapacity.mockReturnValue(0);
        mockCreep.store.getUsedCapacity.mockReturnValue(50);
        roleMarketHauler.run(mockCreep);
        expect(mockCreep.memory.working).toBe(true);
    });

    it('should switch to collecting mode when empty', () => {
        mockCreep.memory.working = true;
        mockCreep.store.getFreeCapacity.mockReturnValue(50);
        mockCreep.store.getUsedCapacity.mockReturnValue(0);
        roleMarketHauler.run(mockCreep);
        expect(mockCreep.memory.working).toBe(false);
    });
});
