import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
    class Resource {}
    class Source {}
    (globalThis as any).Resource = Resource;
    (globalThis as any).Source = Source;
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
    (globalThis as any).FIND_SOURCES = 112;
    (globalThis as any).FIND_HOSTILE_STRUCTURES = 109;
    (globalThis as any).LOOK_CREEPS = 'creep';
    (globalThis as any).LOOK_STRUCTURES = 'structure';
    (globalThis as any).TERRAIN_MASK_WALL = 1;
    (globalThis as any).STRUCTURE_ROAD = 'road';
    (globalThis as any).STRUCTURE_RAMPART = 'rampart';
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

    it('should prioritize ruins and tombstones over dropped resource', () => {
        mockCreep.memory.working = false;
        mockCreep.store.getFreeCapacity.mockReturnValue(50);
        mockCreep.store.getUsedCapacity.mockReturnValue(0);
        mockCreep.store[RESOURCE_ENERGY] = 0;

        const mockRuin = { id: 'ruin_1', structureType: 'ruin', store: { getUsedCapacity: () => 100 }, pos: { x: 10, y: 10 } };
        const mockDropped = Object.assign(Object.create((globalThis as any).Resource.prototype), { id: 'dropped_1', resourceType: 'energy', amount: 100, pos: { x: 15, y: 15 } });

        mockCreep.room.find = vi.fn().mockImplementation((type) => {
            if (type === (globalThis as any).FIND_RUINS) return [mockRuin];
            if (type === (globalThis as any).FIND_DROPPED_RESOURCES) return [mockDropped];
            return [];
        });

        mockCreep.room.findPath = vi.fn().mockReturnValue([{ x: 10, y: 10 }]);
        mockCreep.pos.findClosestByRange = vi.fn().mockReturnValue(mockRuin);

        roleBuilder.run(mockCreep);

        expect(mockCreep.memory.targetId).toBe('ruin_1');
        expect(mockCreep.withdraw).toHaveBeenCalledWith(mockRuin, 'energy');
    });

    it('should prioritize dropped resource over storage', () => {
        mockCreep.memory.working = false;
        mockCreep.store.getFreeCapacity.mockReturnValue(50);
        mockCreep.store.getUsedCapacity.mockReturnValue(0);
        mockCreep.store[RESOURCE_ENERGY] = 0;

        const mockDropped = Object.assign(Object.create((globalThis as any).Resource.prototype), { id: 'dropped_1', resourceType: 'energy', amount: 100, pos: { x: 10, y: 10 } });
        const mockStorage = { id: 'storage_1', structureType: 'storage', store: { getUsedCapacity: () => 500 }, pos: { x: 20, y: 20 } };

        mockCreep.room.find = vi.fn().mockImplementation((type) => {
            if (type === (globalThis as any).FIND_DROPPED_RESOURCES) return [mockDropped];
            return [];
        });
        mockCreep.room.storage = mockStorage;

        mockCreep.room.findPath = vi.fn().mockReturnValue([{ x: 10, y: 10 }]);
        mockCreep.pos.findClosestByRange = vi.fn().mockReturnValue(mockDropped);

        roleBuilder.run(mockCreep);

        expect(mockCreep.memory.targetId).toBe('dropped_1');
        expect(mockCreep.pickup).toHaveBeenCalledWith(mockDropped);
    });

    it('should prioritize storage over containers near sources', () => {
        mockCreep.memory.working = false;
        mockCreep.store.getFreeCapacity.mockReturnValue(50);
        mockCreep.store.getUsedCapacity.mockReturnValue(0);
        mockCreep.store[RESOURCE_ENERGY] = 0;

        const mockStorage = { id: 'storage_1', structureType: 'storage', store: { getUsedCapacity: () => 500 }, pos: { x: 20, y: 20 } };
        const mockContainer = { id: 'container_1', structureType: 'container', store: { getUsedCapacity: () => 200 }, pos: { x: 30, y: 30 } };
        const mockSource = Object.assign(Object.create((globalThis as any).Source.prototype), { id: 'source_1', energy: 3000, pos: { x: 31, y: 31 } });

        mockCreep.room.find = vi.fn().mockImplementation((type) => {
            if (type === (globalThis as any).FIND_SOURCES) return [mockSource];
            if (type === (globalThis as any).FIND_STRUCTURES) return [mockContainer];
            return [];
        });
        mockCreep.room.storage = mockStorage;

        mockCreep.room.findPath = vi.fn().mockReturnValue([{ x: 20, y: 20 }]);
        mockCreep.pos.findClosestByRange = vi.fn().mockReturnValue(mockStorage);
        mockContainer.pos.inRangeTo = vi.fn().mockReturnValue(true);

        roleBuilder.run(mockCreep);

        expect(mockCreep.memory.targetId).toBe('storage_1');
        expect(mockCreep.withdraw).toHaveBeenCalledWith(mockStorage, 'energy');
    });

    it('should prioritize containers near sources over mining', () => {
        mockCreep.memory.working = false;
        mockCreep.store.getFreeCapacity.mockReturnValue(50);
        mockCreep.store.getUsedCapacity.mockReturnValue(0);
        mockCreep.store[RESOURCE_ENERGY] = 0;

        const mockContainer = { id: 'container_1', structureType: 'container', store: { getUsedCapacity: () => 200 }, pos: { x: 30, y: 30 } };
        const mockSource = Object.assign(Object.create((globalThis as any).Source.prototype), { id: 'source_1', energy: 3000, pos: { x: 31, y: 31 }, room: mockCreep.room });

        mockCreep.room.find = vi.fn().mockImplementation((type) => {
            if (type === (globalThis as any).FIND_SOURCES) return [mockSource];
            if (type === (globalThis as any).FIND_SOURCES_ACTIVE) return [mockSource];
            if (type === (globalThis as any).FIND_STRUCTURES) return [mockContainer];
            return [];
        });
        mockCreep.room.getTerrain = vi.fn().mockReturnValue({
            get: () => 0
        });
        mockCreep.room.lookForAt = vi.fn().mockReturnValue([]);

        mockCreep.room.findPath = vi.fn().mockReturnValue([{ x: 30, y: 30 }]);
        mockCreep.pos.findClosestByRange = vi.fn().mockImplementation((arr) => arr[0]);
        mockContainer.pos.inRangeTo = vi.fn().mockReturnValue(true);

        roleBuilder.run(mockCreep);

        expect(mockCreep.memory.targetId).toBe('container_1');
        expect(mockCreep.withdraw).toHaveBeenCalledWith(mockContainer, 'energy');
    });

    it('should sweep adjacent dropped resource/tombstone/ruin when moving', () => {
        mockCreep.memory.working = true;
        mockCreep.store.getFreeCapacity.mockReturnValue(50);
        mockCreep.store.getUsedCapacity.mockReturnValue(50);
        mockCreep.store[RESOURCE_ENERGY] = 50;

        const mockDropped = Object.assign(Object.create((globalThis as any).Resource.prototype), { id: 'dropped_1', resourceType: 'energy', amount: 10, pos: { x: 5, y: 5 } });
        
        mockCreep.pos.findInRange = vi.fn().mockImplementation((type, range) => {
            if (type === (globalThis as any).FIND_DROPPED_RESOURCES && range === 1) {
                return [mockDropped];
            }
            return [];
        });

        roleBuilder.run(mockCreep);

        expect(mockCreep.pickup).toHaveBeenCalledWith(mockDropped);
        expect(mockCreep.moveTo).toHaveBeenCalled();
    });

    it('should fallback to mining active source if there is a free mining spot', () => {
        mockCreep.memory.working = false;
        mockCreep.store.getFreeCapacity.mockReturnValue(50);
        mockCreep.store.getUsedCapacity.mockReturnValue(0);
        mockCreep.store[RESOURCE_ENERGY] = 0;

        const mockSource = Object.assign(Object.create((globalThis as any).Source.prototype), { id: 'source_1', energy: 3000, pos: { x: 30, y: 30 }, room: mockCreep.room });
        
        mockCreep.room.find = vi.fn().mockImplementation((type) => {
            if (type === (globalThis as any).FIND_SOURCES_ACTIVE) return [mockSource];
            return [];
        });
        mockCreep.room.getTerrain = vi.fn().mockReturnValue({
            get: () => 0 // All plain terrain
        });
        mockCreep.room.lookForAt = vi.fn().mockReturnValue([]); // No blocking creeps or structures
        mockCreep.pos.findClosestByRange = vi.fn().mockReturnValue(mockSource);

        roleBuilder.run(mockCreep);

        expect(mockCreep.memory.targetId).toBe('source_1');
        expect(mockCreep.harvest).toHaveBeenCalledWith(mockSource);
    });

    it('should not harvest source if there are no free mining spots around it', () => {
        mockCreep.memory.working = false;
        mockCreep.store.getFreeCapacity.mockReturnValue(50);
        mockCreep.store.getUsedCapacity.mockReturnValue(0);
        mockCreep.store[RESOURCE_ENERGY] = 0;

        const mockSource = Object.assign(Object.create((globalThis as any).Source.prototype), { id: 'source_1', energy: 3000, pos: { x: 30, y: 30 }, room: mockCreep.room });
        
        mockCreep.room.find = vi.fn().mockImplementation((type) => {
            if (type === (globalThis as any).FIND_SOURCES_ACTIVE) return [mockSource];
            return [];
        });
        mockCreep.room.getTerrain = vi.fn().mockReturnValue({
            get: () => 1 // All wall terrain (blocked)
        });
        mockCreep.pos.findClosestByRange = vi.fn().mockReturnValue(mockSource);

        roleBuilder.run(mockCreep);

        // Target should not be source_1 because there are no free mining spots
        expect(mockCreep.memory.targetId).toBeNull();
        expect(mockCreep.harvest).not.toHaveBeenCalled();
    });
});
