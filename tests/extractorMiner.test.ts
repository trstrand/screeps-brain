import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
    (globalThis as any).OK = 0;
    (globalThis as any).ERR_NOT_IN_RANGE = -9;
    (globalThis as any).FIND_MINERALS = 116;
    (globalThis as any).FIND_STRUCTURES = 101;
    (globalThis as any).STRUCTURE_EXTRACTOR = 'extractor';
    (globalThis as any).STRUCTURE_CONTAINER = 'container';
    (globalThis as any).RESOURCE_POWER = 'power';
    (globalThis as any).RESOURCE_OPS = 'ops';
    (globalThis as any).LOOK_STRUCTURES = 'look_structures';
});

import { roleExtractorMiner } from '../src/roles/extractorMiner';

describe('Role: ExtractorMiner', () => {
    let mockCreep: any;
    let mockMineral: any;
    
    beforeEach(() => {
        vi.clearAllMocks();
        mockMineral = {
            mineralAmount: 1000,
            pos: {
                lookFor: vi.fn().mockReturnValue([{ structureType: 'extractor', cooldown: 0 }]),
                findInRange: vi.fn().mockReturnValue([])
            }
        };

        mockCreep = {
            name: 'ext_miner_test',
            memory: { role: 'extractorMiner', working: false },
            room: { name: 'W1N1', find: vi.fn().mockReturnValue([mockMineral]), storage: null },
            store: { getFreeCapacity: vi.fn().mockReturnValue(50), getUsedCapacity: vi.fn().mockReturnValue(0) },
            pos: { findInRange: vi.fn().mockReturnValue([]), getRangeTo: vi.fn().mockReturnValue(5), isEqualTo: vi.fn().mockReturnValue(false) },
            say: vi.fn(),
            moveTo: vi.fn(),
            harvest: vi.fn().mockReturnValue((globalThis as any).ERR_NOT_IN_RANGE),
            transfer: vi.fn()
        };
    });

    it('should switch to mining mode when empty', () => {
        mockCreep.memory.working = false;
        mockCreep.store.getUsedCapacity.mockReturnValue(0);
        roleExtractorMiner.run(mockCreep);
        expect(mockCreep.memory.working).toBe(true);
    });

    it('should switch to delivery mode when full', () => {
        mockCreep.memory.working = true;
        mockCreep.store.getFreeCapacity.mockReturnValue(0);
        mockCreep.store.getUsedCapacity.mockReturnValue(50);
        roleExtractorMiner.run(mockCreep);
        expect(mockCreep.memory.working).toBe(false);
    });
});
