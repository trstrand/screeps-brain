import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
    (globalThis as any).FIND_MY_STRUCTURES = 102;
    (globalThis as any).FIND_HOSTILE_CREEPS = 103;
    (globalThis as any).FIND_MY_CREEPS = 104;
    (globalThis as any).FIND_STRUCTURES = 101;
    (globalThis as any).STRUCTURE_TOWER = 'tower';
    (globalThis as any).STRUCTURE_ROAD = 'road';
    (globalThis as any).STRUCTURE_CONTAINER = 'container';
    (globalThis as any).STRUCTURE_WALL = 'wall';
    (globalThis as any).STRUCTURE_RAMPART = 'rampart';
    (globalThis as any).RESOURCE_ENERGY = 'energy';
    (globalThis as any).RESOURCE_POWER = 'power';
    (globalThis as any).RESOURCE_OPS = 'ops';
    (globalThis as any).HEAL = 'heal';
});

import { TowerManager } from '../src/managers/TowerManager';

describe('TowerManager', () => {
    let mockRoom: any;
    let mockTower: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockTower = {
            id: 'tower1',
            structureType: STRUCTURE_TOWER,
            store: {
                getUsedCapacity: vi.fn().mockReturnValue(1000),
                getCapacity: vi.fn().mockReturnValue(1000)
            },
            attack: vi.fn(),
            heal: vi.fn(),
            repair: vi.fn(),
            pos: {
                getRangeTo: vi.fn().mockReturnValue(5),
                findClosestByRange: vi.fn()
            }
        };

        mockRoom = {
            name: 'W1N1',
            memory: {},
            find: vi.fn().mockImplementation((type) => {
                if (type === FIND_MY_STRUCTURES) return [mockTower];
                return [];
            })
        };

        (globalThis as any).Game = {
            time: 100,
            getObjectById: vi.fn().mockReturnValue(null)
        };
    });

    it('should attack hostiles first, prioritizing healers', () => {
        const hostile1 = { id: 'h1', getActiveBodyparts: vi.fn().mockReturnValue(0) };
        const hostile2 = { id: 'h2', getActiveBodyparts: vi.fn().mockReturnValue(2) }; // 2 Heal parts
        
        mockRoom.find.mockImplementation((type: number) => {
            if (type === FIND_MY_STRUCTURES) return [mockTower];
            if (type === FIND_HOSTILE_CREEPS) return [hostile1, hostile2];
            return [];
        });

        TowerManager.run(mockRoom);
        
        expect(mockTower.attack).toHaveBeenCalledWith(hostile2);
        expect(mockTower.heal).not.toHaveBeenCalled();
        expect(mockTower.repair).not.toHaveBeenCalled();
    });

    it('should heal injured friendlies if no hostiles present', () => {
        const injuredFriendly = { id: 'f1', hits: 50, hitsMax: 100 };
        mockTower.pos.findClosestByRange.mockReturnValue(injuredFriendly);

        mockRoom.find.mockImplementation((type: number) => {
            if (type === FIND_MY_STRUCTURES) return [mockTower];
            if (type === FIND_MY_CREEPS) return [injuredFriendly]; // Injured friendly
            return [];
        });

        TowerManager.run(mockRoom);

        expect(mockTower.heal).toHaveBeenCalledWith(injuredFriendly);
        expect(mockTower.attack).not.toHaveBeenCalled();
    });
});
