import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
    (globalThis as any).OK = 0;
    (globalThis as any).ERR_NOT_IN_RANGE = -9;
    (globalThis as any).RESOURCE_ENERGY = 'energy';
    (globalThis as any).FIND_STRUCTURES = 101;
    (globalThis as any).FIND_MY_STRUCTURES = 102;
    (globalThis as any).FIND_DROPPED_RESOURCES = 106;
    (globalThis as any).FIND_TOMBSTONES = 119;
    (globalThis as any).FIND_HOSTILE_STRUCTURES = 109;
    (globalThis as any).FIND_MY_SPAWNS = 1;
    (globalThis as any).STRUCTURE_CONTAINER = 'container';
});

import { roleUpgradeHauler } from '../src/roles/upgradeHauler';

describe('Role: UpgradeHauler', () => {
    let mockCreep: any;
    
    beforeEach(() => {
        vi.clearAllMocks();
        mockCreep = {
            name: 'upgrade_hauler_test',
            memory: { role: 'upgradeHauler', working: false },
            room: { name: 'W1N1', find: vi.fn().mockReturnValue([]) },
            pos: { getRangeTo: vi.fn().mockReturnValue(5), findInRange: vi.fn().mockReturnValue([]), findClosestByRange: vi.fn().mockReturnValue(null) },
            store: { getFreeCapacity: vi.fn().mockReturnValue(50), getUsedCapacity: vi.fn().mockReturnValue(0), getCapacity: vi.fn().mockReturnValue(50) },
            say: vi.fn(),
            moveTo: vi.fn()
        };
        (globalThis as any).Game = { getObjectById: vi.fn().mockReturnValue(null) };
    });

    it('should switch to deposit mode when full', () => {
        mockCreep.memory.working = false;
        mockCreep.store.getFreeCapacity.mockReturnValue(0);
        mockCreep.store.getUsedCapacity.mockReturnValue(50);
        roleUpgradeHauler.run(mockCreep);
        expect(mockCreep.memory.working).toBe(true);
    });

    it('should switch to collecting mode when empty', () => {
        mockCreep.memory.working = true;
        mockCreep.store.getFreeCapacity.mockReturnValue(50);
        mockCreep.store.getUsedCapacity.mockReturnValue(0);
        roleUpgradeHauler.run(mockCreep);
        expect(mockCreep.memory.working).toBe(false);
    });
});
