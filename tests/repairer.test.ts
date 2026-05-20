import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
    (globalThis as any).OK = 0;
    (globalThis as any).ERR_NOT_IN_RANGE = -9;
    (globalThis as any).FIND_STRUCTURES = 101;
    (globalThis as any).FIND_MY_STRUCTURES = 102;
    (globalThis as any).FIND_HOSTILE_STRUCTURES = 109;
    (globalThis as any).FIND_DROPPED_RESOURCES = 106;
    (globalThis as any).FIND_TOMBSTONES = 119;
    (globalThis as any).FIND_RUINS = 118;
    (globalThis as any).STRUCTURE_ROAD = 'road';
    (globalThis as any).STRUCTURE_CONTAINER = 'container';
    (globalThis as any).STRUCTURE_WALL = 'wall';
    (globalThis as any).STRUCTURE_RAMPART = 'rampart';
    (globalThis as any).STRUCTURE_STORAGE = 'storage';
    (globalThis as any).RESOURCE_ENERGY = 'energy';
    (globalThis as any).RESOURCE_POWER = 'power';
    (globalThis as any).RESOURCE_OPS = 'ops';
});

import { roleRepairer } from '../src/roles/repairer';

describe('Role: Repairer', () => {
    let mockCreep: any;
    let mockStructure: any;
    
    beforeEach(() => {
        vi.clearAllMocks();

        mockStructure = {
            id: 'struct_1',
            structureType: 'road',
            hits: 50,
            hitsMax: 100
        };

        mockCreep = {
            name: 'repairer_test',
            memory: { role: 'repairer', working: false, targetId: null },
            room: {
                name: 'W1N1',
                find: vi.fn().mockImplementation((type) => {
                    if (type === (globalThis as any).FIND_STRUCTURES) return [mockStructure];
                    return [];
                })
            },
            pos: {
                findClosestByRange: vi.fn().mockReturnValue(mockStructure),
                getRangeTo: vi.fn().mockReturnValue(5),
                findInRange: vi.fn().mockReturnValue([])
            },
            store: {
                getFreeCapacity: vi.fn().mockReturnValue(50),
                getUsedCapacity: vi.fn().mockReturnValue(0),
                [RESOURCE_ENERGY]: 0
            },
            say: vi.fn(),
            moveTo: vi.fn(),
            repair: vi.fn().mockReturnValue((globalThis as any).ERR_NOT_IN_RANGE),
            withdraw: vi.fn(),
            pickup: vi.fn(),
            harvest: vi.fn().mockReturnValue((globalThis as any).ERR_NOT_IN_RANGE)
        };

        (globalThis as any).Game = {
            getObjectById: vi.fn().mockReturnValue(null),
            time: 100
        };
    });

    it('should switch to repair mode when full', () => {
        mockCreep.memory.working = false;
        mockCreep.store.getFreeCapacity.mockReturnValue(0);
        mockCreep.store.getUsedCapacity.mockReturnValue(50);
        mockCreep.store[RESOURCE_ENERGY] = 50;

        roleRepairer.run(mockCreep);
        
        expect(mockCreep.memory.working).toBe(true);
        expect(mockCreep.say).toHaveBeenCalledWith('🔧 Repair');
    });

    it('should switch to fetch mode when empty', () => {
        mockCreep.memory.working = true;
        mockCreep.store.getUsedCapacity.mockReturnValue(0);
        mockCreep.store[RESOURCE_ENERGY] = 0;

        roleRepairer.run(mockCreep);
        
        expect(mockCreep.memory.working).toBe(false);
        expect(mockCreep.say).toHaveBeenCalledWith('🔍 Energy');
    });

    it('should repair target structure when working', () => {
        mockCreep.memory.working = true;
        mockCreep.store.getUsedCapacity.mockReturnValue(50);
        mockCreep.store[RESOURCE_ENERGY] = 50;
        
        // Simulating the target being loaded
        (globalThis as any).Game.getObjectById.mockReturnValue(mockStructure);
        mockCreep.memory.targetId = mockStructure.id;

        roleRepairer.run(mockCreep);
        
        expect(mockCreep.repair).toHaveBeenCalledWith(mockStructure);
        expect(mockCreep.moveTo).toHaveBeenCalledWith(mockStructure, expect.any(Object));
    });

    it('should recycle when ticks to live is below 30', () => {
        mockCreep.ticksToLive = 29;
        roleRepairer.run(mockCreep);
        expect(mockCreep.memory.recycle).toBe(true);
    });
});
