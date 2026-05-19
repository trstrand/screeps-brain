import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
    (globalThis as any).OK = 0;
    (globalThis as any).ERR_NOT_IN_RANGE = -9;
    (globalThis as any).FIND_CONSTRUCTION_SITES = 111;
    (globalThis as any).FIND_STRUCTURES = 101;
    (globalThis as any).FIND_MY_STRUCTURES = 102;
    (globalThis as any).FIND_DROPPED_RESOURCES = 106;
    (globalThis as any).FIND_TOMBSTONES = 119;
    (globalThis as any).FIND_RUINS = 118;
    (globalThis as any).STRUCTURE_CONTAINER = 'container';
    (globalThis as any).STRUCTURE_STORAGE = 'storage';
    (globalThis as any).RESOURCE_ENERGY = 'energy';
    (globalThis as any).RESOURCE_POWER = 'power';
    (globalThis as any).RESOURCE_OPS = 'ops';
    (globalThis as any).FIND_SOURCES_ACTIVE = 113;
    (globalThis as any).FIND_HOSTILE_STRUCTURES = 109;
});

import { roleBuilder } from '../src/roles/builder';

describe('Role: Builder', () => {
    let mockCreep: any;
    let mockSite: any;
    
    beforeEach(() => {
        vi.clearAllMocks();

        mockSite = {
            id: 'site_1',
            structureType: 'extension',
            progress: 0,
            progressTotal: 100
        };

        mockCreep = {
            name: 'builder_test',
            memory: { role: 'builder', working: false, targetId: null },
            room: {
                name: 'W1N1',
                find: vi.fn().mockImplementation((type) => {
                    if (type === (globalThis as any).FIND_CONSTRUCTION_SITES) return [mockSite];
                    return [];
                })
            },
            pos: {
                findClosestByRange: vi.fn().mockReturnValue(mockSite),
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
            build: vi.fn().mockReturnValue((globalThis as any).ERR_NOT_IN_RANGE),
            withdraw: vi.fn(),
            pickup: vi.fn(),
            harvest: vi.fn().mockReturnValue((globalThis as any).ERR_NOT_IN_RANGE)
        };

        (globalThis as any).Game = {
            getObjectById: vi.fn().mockReturnValue(null),
            time: 100
        };
    });

    it('should switch to build mode when full', () => {
        mockCreep.memory.working = false;
        mockCreep.store.getFreeCapacity.mockReturnValue(0);
        mockCreep.store.getUsedCapacity.mockReturnValue(50);
        mockCreep.store[RESOURCE_ENERGY] = 50;

        roleBuilder.run(mockCreep);
        
        expect(mockCreep.memory.working).toBe(true);
        expect(mockCreep.say).toHaveBeenCalledWith('🚧 build');
    });

    it('should switch to fetch mode when empty', () => {
        mockCreep.memory.working = true;
        mockCreep.store.getUsedCapacity.mockReturnValue(0);
        mockCreep.store[RESOURCE_ENERGY] = 0;

        roleBuilder.run(mockCreep);
        
        expect(mockCreep.memory.working).toBe(false);
        expect(mockCreep.say).toHaveBeenCalledWith('🔄 loading');
    });

    it('should build construction site when working', () => {
        mockCreep.memory.working = true;
        mockCreep.store.getUsedCapacity.mockReturnValue(50);
        mockCreep.store[RESOURCE_ENERGY] = 50;
        
        roleBuilder.run(mockCreep);
        
        expect(mockCreep.build).toHaveBeenCalledWith(mockSite);
        expect(mockCreep.moveTo).toHaveBeenCalledWith(mockSite, expect.any(Object));
    });
});
