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
    (globalThis as any).STRUCTURE_TOWER = 'tower';
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
            pos: { findInRange: vi.fn().mockReturnValue([]), findClosestByRange: vi.fn().mockReturnValue(null), getRangeTo: vi.fn().mockReturnValue(5), isNearTo: vi.fn().mockReturnValue(false) },
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

    it('should target storage to fetch energy if a tower needs energy', () => {
        mockCreep.memory.working = false;
        mockCreep.store.getUsedCapacity.mockReturnValue(0);
        
        const mockTower = {
            id: 'tower1' as Id<any>,
            structureType: 'tower',
            store: {
                energy: 500,
                getFreeCapacity: vi.fn().mockReturnValue(500)
            }
        };
        
        const mockStorage = {
            id: 'storage1' as Id<any>,
            structureType: 'storage',
            store: {
                getUsedCapacity: vi.fn().mockReturnValue(50000)
            }
        };
        
        mockCreep.room.storage = mockStorage as any;
        mockCreep.room.find = vi.fn().mockImplementation((type, options) => {
            if (type === 102 /* FIND_MY_STRUCTURES */) {
                const structures = [mockTower];
                if (options && options.filter) {
                    if (typeof options.filter === 'function') {
                        return structures.filter(options.filter);
                    }
                    if (typeof options.filter === 'object') {
                        return structures.filter(s => Object.keys(options.filter).every(k => (s as any)[k] === options.filter[k]));
                    }
                }
                return structures;
            }
            return [];
        });

        roleMarketHauler.run(mockCreep);

        expect(mockCreep.memory.deliveryTargetId).toBe('tower1');
        expect(mockCreep.memory.targetId).toBe('storage1');
        expect(mockCreep.moveTo).toHaveBeenCalledWith(mockStorage, expect.any(Object));
    });

    it('should deliver energy to targeted tower if working and carrying energy', () => {
        mockCreep.memory.working = true;
        mockCreep.memory.deliveryTargetId = 'tower1' as Id<any>;
        mockCreep.store.getUsedCapacity.mockReturnValue(50);
        mockCreep.store.energy = 50;
        
        const mockTower = {
            id: 'tower1' as Id<any>,
            structureType: 'tower',
            store: {
                getFreeCapacity: vi.fn().mockReturnValue(500)
            }
        };
        
        // Mock Game.getObjectById
        (globalThis as any).Game.getObjectById = vi.fn().mockReturnValue(mockTower);
        mockCreep.transfer = vi.fn().mockReturnValue(OK);

        roleMarketHauler.run(mockCreep);

        expect(mockCreep.transfer).toHaveBeenCalledWith(mockTower, RESOURCE_ENERGY);
    });

    it('should recycle if no towers need energy and no other tasks', () => {
        mockCreep.memory.working = false;
        mockCreep.store.getUsedCapacity.mockReturnValue(0);
        
        mockCreep.room.find = vi.fn().mockReturnValue([]);

        roleMarketHauler.run(mockCreep);

        expect(mockCreep.memory.recycle).toBe(true);
    });
});
